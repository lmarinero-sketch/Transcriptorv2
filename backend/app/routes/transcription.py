import logging
import asyncio
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, BackgroundTasks, Depends
from fastapi.security import HTTPAuthorizationCredentials

from app.services.transcription import (
    transcribe_audio,
    polish_transcription,
    create_job,
    get_job,
    update_job,
    cleanup_job,
)
from app.core.auth import security, verify_token, track_usage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["transcription"])

ALLOWED_EXTENSIONS = {"mp3", "wav", "m4a", "opus", "ogg", "flac", "webm", "mp4", "mpeg", "mpga", "wma", "aac"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB


async def _process_transcription(job_id: str, file_bytes: bytes, filename: str, polish: bool):
    """Background task for transcription + polishing."""
    try:
        # Step 1: Whisper API transcription
        update_job(job_id, status="transcribing", progress=0, step="Iniciando transcripción...")
        result = await transcribe_audio(file_bytes, filename, job_id)
        logger.info(f"Transcription done: {len(result['text'])} chars")

        # Step 2: Polish with GPT
        raw_text = result["text"]
        if polish and len(raw_text) > 50:
            update_job(job_id, status="polishing", progress=0, step="Puliendo transcripción con GPT...")
            polished = await polish_transcription(raw_text, job_id)
            result["text"] = polished
            result["raw_text"] = raw_text

        update_job(job_id, status="completed", progress=100, step="¡Transcripción lista! ✅", result=result)

    except Exception as e:
        import traceback
        logger.error(f"Transcription error: {str(e)}\n{traceback.format_exc()}")
        update_job(job_id, status="error", error=str(e), step=f"Error: {str(e)}")


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    polish: bool = Query(True, description="Polish transcription with GPT"),
    background_tasks: BackgroundTasks = None,
):
    ext = audio.filename.rsplit(".", 1)[-1].lower() if audio.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Formato no soportado: {ext}. Usa: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    file_bytes = await audio.read()
    size_mb = len(file_bytes) / 1024 / 1024

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(413, f"Archivo demasiado grande ({size_mb:.1f}MB). Máximo: 500MB")

    logger.info(f"Received audio: {audio.filename} ({size_mb:.1f}MB)")

    # Create a job and start processing in background
    job_id = create_job()

    # Start the background processing
    asyncio.create_task(
        _process_transcription(job_id, file_bytes, audio.filename or "audio.mp3", polish)
    )

    return {"success": True, "job_id": job_id, "message": "Transcripción iniciada"}


@router.get("/transcribe/status/{job_id}")
async def transcribe_status(job_id: str):
    """Poll this endpoint to get transcription progress."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job no encontrado")

    response = {
        "status": job["status"],
        "progress": job["progress"],
        "step": job["step"],
    }

    if job["status"] == "completed":
        response["data"] = job["result"]
        # Clean up after delivery
        cleanup_job(job_id)

    if job["status"] == "error":
        response["error"] = job["error"]
        cleanup_job(job_id)

    return response


@router.post("/transcribe-chunk")
async def transcribe_chunk(
    audio: UploadFile = File(...),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Fast transcription of small audio chunks using OpenAI Whisper API.
    Used for live real-time transcription while recording.
    Tracks ~15s of usage per chunk (matching the frontend recording loop interval)."""
    try:
        file_bytes = await audio.read()
        if len(file_bytes) < 1000:  # Too small, skip
            return {"text": ""}

        from openai import AsyncOpenAI
        from app.core.config import get_settings
        client = AsyncOpenAI(api_key=get_settings().openai_api_key)

        filename = audio.filename or "chunk.webm"
        result = await client.audio.transcriptions.create(
            file=(filename, file_bytes),
            model="whisper-1",
            language="es",
        )

        text = result.text.strip()

        # Track usage: each chunk represents ~15 seconds of recording
        if text and credentials:
            try:
                user = await verify_token(credentials.credentials)
                user_id = user["id"]
                # Get org_id for this user
                from supabase import create_client
                settings = get_settings()
                sb = create_client(settings.supabase_url, settings.supabase_service_key)
                membership = (
                    sb.table("org_members")
                    .select("org_id")
                    .eq("user_id", user_id)
                    .limit(1)
                    .execute()
                )
                if membership.data:
                    track_usage(membership.data[0]["org_id"], 15.0)  # 15s per chunk
                    logger.info(f"Tracked 15s chunk usage for user {user_id}")
            except Exception as track_err:
                logger.warning(f"Failed to track chunk usage: {track_err}")

        return {"text": text}
    except Exception as e:
        logger.warning(f"Chunk transcription error: {e}")
        return {"text": ""}

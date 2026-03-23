import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.security import HTTPAuthorizationCredentials

from app.schemas.models import MeetingCreate, AnalysisType
from app.services.storage import save_meeting, get_meetings, get_meeting, delete_meeting
from app.services.transcription import transcribe_audio, polish_transcription
from app.services.analysis import analyze_text
from app.services.presentation import generate_presentation
from app.core.auth import security, verify_token, track_usage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["meetings"])


@router.get("/meetings")
async def list_meetings():
    try:
        meetings = await get_meetings()
        return {"success": True, "data": meetings}
    except Exception as e:
        raise HTTPException(500, f"Error al obtener reuniones: {str(e)}")


@router.post("/meetings")
async def create_meeting(
    data: dict,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    try:
        saved = await save_meeting(data)

        # Track usage based on transcription length — only for uploaded files
        # Live recordings already track usage per 15s chunk in /transcribe-chunk
        source = data.get("source", "upload")
        transcription = data.get("transcription", "")
        if source != "live" and transcription and credentials:
            try:
                estimated_duration_seconds = max(30, (len(transcription) / 750) * 60)
                user = await verify_token(credentials.credentials)
                user_id = user["id"]
                from supabase import create_client
                from app.core.config import get_settings
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
                    track_usage(membership.data[0]["org_id"], estimated_duration_seconds)
                    logger.info(f"Tracked {estimated_duration_seconds:.0f}s usage for meeting save (user {user_id})")
            except Exception as track_err:
                logger.warning(f"Failed to track meeting usage: {track_err}")

        return {"success": True, "data": saved}
    except Exception as e:
        raise HTTPException(500, f"Error al guardar reunión: {str(e)}")


@router.get("/meetings/{meeting_id}")
async def get_meeting_detail(meeting_id: int):
    try:
        meeting = await get_meeting(meeting_id)
        if not meeting:
            raise HTTPException(404, "Reunión no encontrada")
        return {"success": True, "data": meeting}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error: {str(e)}")


@router.delete("/meetings/{meeting_id}")
async def remove_meeting(meeting_id: int):
    try:
        await delete_meeting(meeting_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(500, f"Error al eliminar: {str(e)}")


@router.post("/meetings/process")
async def process_meeting(
    audio: UploadFile = File(...),
    title: str = Form("Reunión sin título"),
    analysis_type: str = Form("resumen-general"),
    generate_slides: bool = Form(False),
):
    """Full pipeline: transcribe → analyze → optionally generate presentation → save."""
    try:
        # 1. Transcribe
        file_bytes = await audio.read()
        if len(file_bytes) > 500 * 1024 * 1024:
            raise HTTPException(413, "Archivo demasiado grande (máximo 500MB)")

        transcription_result = await transcribe_audio(file_bytes, audio.filename or "audio.mp3")
        raw_text = transcription_result["text"]
        # Polish with GPT
        transcription = await polish_transcription(raw_text) if len(raw_text) > 50 else raw_text

        # 2. Analyze
        analysis_result = await analyze_text(transcription, analysis_type)
        analysis = analysis_result["analysis"]

        # 3. Optionally generate presentation
        presentation_data = None
        if generate_slides:
            presentation_data = await generate_presentation(analysis)

        # 4. Save to database
        meeting_data = {
            "title": title,
            "transcription": transcription,
            "analysis": analysis,
            "analysis_type": analysis_type,
            "presentation_data": presentation_data,
        }
        saved = await save_meeting(meeting_data)

        return {
            "success": True,
            "data": {
                "meeting_id": saved.get("id"),
                "transcription": transcription,
                "analysis": analysis,
                "analysis_type": analysis_type,
                "presentation": presentation_data,
                "metadata": {
                    "estimated_tokens": analysis_result["estimated_tokens"],
                    "was_chunked": analysis_result["was_chunked"],
                    "duration_seconds": transcription_result.get("duration_seconds"),
                },
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error procesando reunión: {str(e)}")

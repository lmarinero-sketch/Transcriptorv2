import math
import os
import tempfile
import logging
import uuid
from typing import Optional

from openai import AsyncOpenAI
from pydub import AudioSegment

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# OpenAI Whisper API limit: 25MB per request
MAX_CHUNK_SIZE_MB = 24  # Leave 1MB margin


def _get_openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=get_settings().openai_api_key)


# ── Job progress tracking ────────────────────────────────
_jobs: dict[str, dict] = {}


def create_job() -> str:
    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {
        "status": "pending",
        "progress": 0,
        "step": "Iniciando...",
        "result": None,
        "error": None,
    }
    return job_id


def get_job(job_id: str) -> Optional[dict]:
    return _jobs.get(job_id)


def update_job(job_id: str, **kwargs):
    if job_id in _jobs:
        _jobs[job_id].update(kwargs)


def cleanup_job(job_id: str):
    _jobs.pop(job_id, None)


# ── Audio splitting for large files ──────────────────────
def _split_audio_file(file_bytes: bytes, filename: str) -> list[tuple[str, bytes]]:
    """Split audio into chunks under 25MB for OpenAI Whisper API.
    Returns list of (filename, bytes) tuples."""
    size_mb = len(file_bytes) / 1024 / 1024

    if size_mb <= MAX_CHUNK_SIZE_MB:
        return [(filename, file_bytes)]

    ext = filename.rsplit(".", 1)[-1].lower() if filename else "mp3"

    # Write to temp file for pydub to read
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        audio = AudioSegment.from_file(tmp_path)
        duration_ms = len(audio)

        # Calculate chunk duration based on bitrate
        # Estimate: if file is X MB for Y ms, each chunk should be MAX_CHUNK_SIZE_MB worth
        ms_per_mb = duration_ms / size_mb
        chunk_duration_ms = int(ms_per_mb * MAX_CHUNK_SIZE_MB * 0.9)  # 90% safety

        chunks: list[tuple[str, bytes]] = []
        start = 0
        chunk_idx = 0

        while start < duration_ms:
            end = min(start + chunk_duration_ms, duration_ms)
            segment = audio[start:end]

            # Export chunk to bytes
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as chunk_tmp:
                segment.export(chunk_tmp.name, format="mp3", bitrate="128k")
                chunk_bytes = open(chunk_tmp.name, "rb").read()
                os.unlink(chunk_tmp.name)

            chunks.append((f"chunk_{chunk_idx}.mp3", chunk_bytes))
            chunk_idx += 1
            start = end

        logger.info(f"Split {filename} ({size_mb:.1f}MB, {duration_ms/1000:.0f}s) into {len(chunks)} chunks")
        return chunks

    finally:
        os.unlink(tmp_path)


# ── Transcription via OpenAI Whisper API ─────────────────
async def transcribe_audio(file_bytes: bytes, filename: str, job_id: str = "") -> dict:
    """Transcribe audio using OpenAI Whisper API with progress tracking.
    Handles large files by splitting into chunks under 25MB."""
    client = _get_openai_client()
    size_mb = len(file_bytes) / 1024 / 1024
    logger.info(f"Transcribing {filename} ({size_mb:.1f}MB) with OpenAI Whisper API...")

    if job_id:
        update_job(job_id, status="transcribing", progress=0, step="Preparando audio...")

    # Split if necessary
    if job_id:
        update_job(job_id, step="Dividiendo audio en segmentos..." if size_mb > MAX_CHUNK_SIZE_MB else "Enviando a Whisper API...")

    chunks = _split_audio_file(file_bytes, filename)
    total_chunks = len(chunks)

    transcribed_parts: list[str] = []

    for i, (chunk_name, chunk_bytes) in enumerate(chunks):
        if job_id:
            pct = int((i / total_chunks) * 90)  # Reserve 10% for final assembly
            update_job(
                job_id,
                progress=pct,
                step=f"Transcribiendo con Whisper API... {pct}% ({i+1}/{total_chunks})",
            )

        logger.info(f"Transcribing chunk {i+1}/{total_chunks}: {chunk_name} ({len(chunk_bytes)/1024/1024:.1f}MB)")

        result = await client.audio.transcriptions.create(
            file=(chunk_name, chunk_bytes),
            model="whisper-1",
            language="es",
            response_format="verbose_json",
        )

        text = result.text.strip() if hasattr(result, 'text') else str(result).strip()
        if text:
            transcribed_parts.append(text)

    full_text = " ".join(transcribed_parts)

    # Estimate duration from verbose response if available
    duration = 0.0
    if hasattr(result, 'duration'):
        # For single chunk, use the duration directly
        # For multi-chunk, approximate from all chunks
        if total_chunks == 1:
            duration = result.duration
        else:
            # Rough estimate based on file size ratio
            duration = (size_mb / MAX_CHUNK_SIZE_MB) * (result.duration if hasattr(result, 'duration') else 0)

    logger.info(f"Transcription complete: {len(full_text)} chars, ~{duration:.0f}s")

    if job_id:
        update_job(job_id, progress=95, step="Transcripción completada ✅")

    return {
        "text": full_text,
        "duration_seconds": duration,
        "language": "es",
        "segments_count": total_chunks,
    }


# Keep backward-compatible alias
transcribe_audio_local = transcribe_audio


async def polish_transcription(raw_text: str, job_id: str = "") -> str:
    """Use GPT-4o-mini to clean up the raw Whisper transcription."""
    client = _get_openai_client()

    chunks = split_into_chunks(raw_text, max_tokens=10000)
    polished_parts: list[str] = []

    for i, chunk in enumerate(chunks):
        if job_id:
            pct = int((i / len(chunks)) * 100)
            update_job(job_id, step=f"Puliendo transcripción con GPT... {pct}% ({i+1}/{len(chunks)})")
        logger.info(f"Polishing chunk {i + 1}/{len(chunks)}...")
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Eres un editor profesional de transcripciones. Tu trabajo es limpiar y mejorar la legibilidad "
                        "de una transcripción automática SIN cambiar su significado ni contenido. Debes:\n\n"
                        "1. Corregir puntuación y ortografía\n"
                        "2. Separar en párrafos lógicos\n"
                        "3. Eliminar muletillas repetidas (eh, este, mmm) pero mantener el tono natural\n"
                        "4. Si detectas cambios de hablante, marca con '**Hablante X:**' al inicio\n"
                        "5. Mantener TODO el contenido original — no resumas ni omitas nada\n"
                        "6. Responde SOLO con la transcripción limpia, sin comentarios adicionales"
                    ),
                },
                {"role": "user", "content": f"Limpia esta transcripción:\n\n{chunk}"},
            ],
            temperature=0.3,
            max_tokens=4000,
        )
        polished_parts.append(completion.choices[0].message.content or chunk)

    if job_id:
        update_job(job_id, step="Transcripción pulida ✅")

    return "\n\n".join(polished_parts)


# ── Text utilities ───────────────────────────────────────
def estimate_tokens(text: str) -> int:
    return math.ceil(len(text) / 4)


def split_into_chunks(text: str, max_tokens: int = 6000) -> list[str]:
    if estimate_tokens(text) <= max_tokens:
        return [text]

    max_chars = max_tokens * 4
    paragraphs = text.split("\n\n")
    chunks: list[str] = []
    current = ""

    for p in paragraphs:
        candidate = f"{current}\n\n{p}" if current else p
        if len(candidate) > max_chars and current:
            chunks.append(current.strip())
            current = p
        else:
            current = candidate

    if current.strip():
        chunks.append(current.strip())

    final: list[str] = []
    for chunk in chunks:
        if len(chunk) > max_chars:
            sentences = chunk.replace(". ", ".\n").split("\n")
            sub = ""
            for s in sentences:
                if len(sub + s) > max_chars and sub:
                    final.append(sub.strip())
                    sub = s
                else:
                    sub = f"{sub} {s}" if sub else s
            if sub.strip():
                final.append(sub.strip())
        else:
            final.append(chunk)

    return final

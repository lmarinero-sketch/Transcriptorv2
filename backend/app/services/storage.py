"""
Local JSON-based storage fallback for meetings.
Uses a local JSON file when Supabase is unavailable or the table doesn't exist.
"""
import json
import os
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import get_settings

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data"
MEETINGS_FILE = DATA_DIR / "meetings.json"

_use_local = None  # Cached flag


def _ensure_data_dir():
    DATA_DIR.mkdir(exist_ok=True)
    if not MEETINGS_FILE.exists():
        MEETINGS_FILE.write_text("[]", encoding="utf-8")


def _check_supabase() -> bool:
    """Check if Supabase is reachable and the meetings table exists."""
    global _use_local
    if _use_local is not None:
        return not _use_local

    try:
        from supabase import create_client
        settings = get_settings()
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        client.table("meetings").select("id").limit(1).execute()
        _use_local = False
        logger.info("Supabase connected — using remote storage")
        return True
    except Exception as e:
        _use_local = True
        logger.warning(f"Supabase unavailable ({e}) — using local JSON storage")
        _ensure_data_dir()
        return False


def _read_local() -> list[dict]:
    _ensure_data_dir()
    try:
        return json.loads(MEETINGS_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def _write_local(meetings: list[dict]):
    _ensure_data_dir()
    MEETINGS_FILE.write_text(json.dumps(meetings, ensure_ascii=False, indent=2), encoding="utf-8")


def _next_id(meetings: list[dict]) -> int:
    if not meetings:
        return 1
    return max(m.get("id", 0) for m in meetings) + 1


# ── Public API ─────────────────────────────────────────────


async def save_meeting(data: dict) -> dict:
    if _check_supabase():
        from supabase import create_client
        settings = get_settings()
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        result = client.table("meetings").insert(data).execute()
        return result.data[0] if result.data else {}

    meetings = _read_local()
    meeting = {
        **data,
        "id": _next_id(meetings),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    meetings.insert(0, meeting)
    _write_local(meetings)
    logger.info(f"Meeting saved locally: id={meeting['id']}")
    return meeting


async def get_meetings(limit: int = 50) -> list[dict]:
    if _check_supabase():
        from supabase import create_client
        settings = get_settings()
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        result = (
            client.table("meetings")
            .select("id, title, analysis_type, created_at, transcription")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        meetings = []
        for m in result.data:
            meetings.append({
                "id": m["id"],
                "title": m["title"],
                "analysis_type": m["analysis_type"],
                "created_at": m["created_at"],
                "preview": m["transcription"][:150] + "..." if len(m.get("transcription", "")) > 150 else m.get("transcription", ""),
            })
        return meetings

    meetings = _read_local()[:limit]
    return [
        {
            "id": m["id"],
            "title": m.get("title", "Sin título"),
            "analysis_type": m.get("analysis_type", "resumen-general"),
            "created_at": m.get("created_at", ""),
            "preview": (m.get("transcription", "")[:150] + "...") if len(m.get("transcription", "")) > 150 else m.get("transcription", ""),
        }
        for m in meetings
    ]


async def get_meeting(meeting_id: int) -> dict | None:
    if _check_supabase():
        from supabase import create_client
        settings = get_settings()
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        result = (
            client.table("meetings")
            .select("*")
            .eq("id", meeting_id)
            .single()
            .execute()
        )
        return result.data

    meetings = _read_local()
    for m in meetings:
        if m.get("id") == meeting_id:
            return m
    return None


async def delete_meeting(meeting_id: int) -> bool:
    if _check_supabase():
        from supabase import create_client
        settings = get_settings()
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        client.table("meetings").delete().eq("id", meeting_id).execute()
        return True

    meetings = _read_local()
    meetings = [m for m in meetings if m.get("id") != meeting_id]
    _write_local(meetings)
    return True

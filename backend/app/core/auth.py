"""Authentication and usage tracking middleware."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

# Plan limits
PLAN_LIMITS = {
    "starter": 300,      # 5 hours
    "pro": 1500,         # 25 hours
    "enterprise": 5000,  # 83 hours
}


async def verify_token(token: str) -> dict:
    """Verify Supabase JWT and return user data."""
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {token}",
            },
            timeout=10,
        )
    if r.status_code != 200:
        raise HTTPException(401, "Token inválido o expirado")
    return r.json()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """Get current user from Bearer token. Returns None if no token."""
    if not credentials:
        return None
    return await verify_token(credentials.credentials)


async def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Require authentication. Raises 401 if not authenticated."""
    if not credentials:
        raise HTTPException(401, "Autenticación requerida")
    return await verify_token(credentials.credentials)


async def get_user_org(user: dict = Depends(require_auth)) -> dict:
    """Get the user's organization with usage data."""
    from supabase import create_client
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_key)

    user_id = user["id"]

    # Get org membership
    membership = (
        client.table("org_members")
        .select("org_id, role")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not membership.data:
        raise HTTPException(403, "No pertenecés a ninguna organización")

    org_id = membership.data[0]["org_id"]
    role = membership.data[0]["role"]

    # Get org details
    org = (
        client.table("organizations")
        .select("*")
        .eq("id", org_id)
        .single()
        .execute()
    )

    if not org.data:
        raise HTTPException(404, "Organización no encontrada")

    org_data = org.data

    # Auto-reset billing cycle if past 30 days
    cycle_start = datetime.fromisoformat(org_data["billing_cycle_start"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > cycle_start + timedelta(days=30):
        client.table("organizations").update({
            "audio_minutes_used": 0,
            "billing_cycle_start": datetime.now(timezone.utc).isoformat(),
        }).eq("id", org_id).execute()
        org_data["audio_minutes_used"] = 0
        org_data["billing_cycle_start"] = datetime.now(timezone.utc).isoformat()
        logger.info(f"Reset billing cycle for org {org_id}")

    return {
        **org_data,
        "user_id": user_id,
        "user_role": role,
    }


async def check_usage_limit(org: dict = Depends(get_user_org)) -> dict:
    """Check if the org has remaining audio minutes."""
    used = org["audio_minutes_used"]
    limit = org["audio_minutes_limit"]

    if used >= limit:
        raise HTTPException(429, {
            "error": "limit_exceeded",
            "message": f"Alcanzaste tu límite de {limit} minutos de audio. Actualiza tu plan para continuar.",
            "used": used,
            "limit": limit,
            "plan": org["plan"],
        })

    return org


def track_usage(org_id: str, duration_seconds: float):
    """Add used minutes to the organization's usage counter."""
    from supabase import create_client
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_key)

    minutes = duration_seconds / 60

    # Fetch current usage and increment
    org = client.table("organizations").select("audio_minutes_used").eq("id", org_id).single().execute()
    if org.data:
        new_used = (org.data["audio_minutes_used"] or 0) + minutes
        client.table("organizations").update({
            "audio_minutes_used": round(new_used, 2),
        }).eq("id", org_id).execute()
        logger.info(f"Tracked {minutes:.1f} min for org {org_id} (total: {new_used:.1f})")

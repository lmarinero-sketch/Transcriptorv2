"""Auth and usage routes."""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
import httpx

from app.core.config import get_settings
from app.core.auth import get_current_user, require_auth, get_user_org, verify_token, PLAN_LIMITS, security

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["auth"])


@router.post("/auth/login")
async def login(body: dict):
    """Login with email/password via Supabase Auth."""
    email = body.get("email", "")
    password = body.get("password", "")

    if not email or not password:
        raise HTTPException(400, "Email y contraseña son requeridos")

    settings = get_settings()
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{settings.supabase_url}/auth/v1/token?grant_type=password",
            headers={
                "apikey": settings.supabase_anon_key,
                "Content-Type": "application/json",
            },
            json={"email": email, "password": password},
            timeout=10,
        )

    if r.status_code != 200:
        raise HTTPException(401, "Credenciales incorrectas")

    data = r.json()
    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "user": {
            "id": data["user"]["id"],
            "email": data["user"]["email"],
            "name": data["user"].get("user_metadata", {}).get("name", ""),
        },
    }


@router.get("/auth/me")
async def get_me(user: dict = Depends(require_auth)):
    """Get current authenticated user info."""
    return {
        "id": user["id"],
        "email": user.get("email", ""),
        "name": user.get("user_metadata", {}).get("name", ""),
    }


@router.get("/usage")
async def get_usage(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Get current organization usage and limits."""
    # Default response for unauthenticated or unlinked users
    default_response = {
        "org_id": "",
        "org_name": "Free",
        "plan": "starter",
        "audio_minutes_used": 0,
        "audio_minutes_limit": 300,
        "audio_minutes_remaining": 300,
        "usage_percentage": 0,
        "billing_cycle_start": None,
        "plans": {
            "starter": {"limit": 300, "price": 19},
            "pro": {"limit": 1500, "price": 49},
            "enterprise": {"limit": 5000, "price": 99},
        },
    }

    if not credentials:
        return default_response

    try:
        user = await verify_token(credentials.credentials)
        org = await _get_user_org_safe(user["id"])
        if not org:
            return default_response

        return {
            "org_id": org["id"],
            "org_name": org["name"],
            "plan": org["plan"],
            "audio_minutes_used": round(org["audio_minutes_used"], 1),
            "audio_minutes_limit": org["audio_minutes_limit"],
            "audio_minutes_remaining": round(
                max(0, org["audio_minutes_limit"] - org["audio_minutes_used"]), 1
            ),
            "usage_percentage": round(
                min(100, (org["audio_minutes_used"] / org["audio_minutes_limit"]) * 100), 1
            ),
            "billing_cycle_start": org["billing_cycle_start"],
            "plans": {
                "starter": {"limit": 300, "price": 19},
                "pro": {"limit": 1500, "price": 49},
                "enterprise": {"limit": 5000, "price": 99},
            },
        }
    except Exception as e:
        logger.warning(f"Usage endpoint error: {e}")
        return default_response


async def _get_user_org_safe(user_id: str):
    """Get org data without raising exceptions."""
    try:
        from supabase import create_client
        settings = get_settings()
        client = create_client(settings.supabase_url, settings.supabase_service_key)

        membership = (
            client.table("org_members")
            .select("org_id")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not membership.data:
            return None

        org = (
            client.table("organizations")
            .select("*")
            .eq("id", membership.data[0]["org_id"])
            .single()
            .execute()
        )
        return org.data
    except Exception:
        return None

from fastapi import APIRouter, HTTPException

from app.schemas.models import PresentationRequest
from app.services.presentation import generate_presentation

router = APIRouter(prefix="/api/v1", tags=["presentations"])


@router.post("/generate-presentation")
async def create_presentation(request: PresentationRequest):
    try:
        result = await generate_presentation(request.text, request.template)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(500, f"Error al generar presentación: {str(e)}")

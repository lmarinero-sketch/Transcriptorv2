from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.schemas.models import AnalysisRequest
from app.services.analysis import analyze_text, generate_concept_map

router = APIRouter(prefix="/api/v1", tags=["analysis"])


@router.post("/analyze")
async def analyze(request: AnalysisRequest):
    try:
        result = await analyze_text(request.text, request.analysis_type.value)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(500, f"Error al analizar: {str(e)}")


class ConceptMapRequest(BaseModel):
    text: str = Field(..., min_length=10)


@router.post("/concept-map")
async def concept_map(request: ConceptMapRequest):
    try:
        result = await generate_concept_map(request.text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(500, f"Error al generar mapa conceptual: {str(e)}")

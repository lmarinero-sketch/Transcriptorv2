from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class AnalysisType(str, Enum):
    MINUTAS = "minutas"
    INTERVIEW = "entrevista-trabajo"
    CLIENT_MEETING = "reunion-cliente"
    GENERAL_SUMMARY = "resumen-general"


class TranscriptionResponse(BaseModel):
    text: str
    duration_seconds: float | None = None
    language: str = "es"


class AnalysisRequest(BaseModel):
    text: str = Field(..., min_length=10)
    analysis_type: AnalysisType = AnalysisType.GENERAL_SUMMARY


class AnalysisResponse(BaseModel):
    analysis: str
    analysis_type: AnalysisType
    estimated_tokens: int
    was_chunked: bool = False


class PresentationSlide(BaseModel):
    tipo: str
    titulo: str | None = None
    contenido: list[str] | str | None = None
    columna_izquierda: list[str] | None = None
    columna_derecha: list[str] | None = None
    items: list[dict] | None = None
    datos_grafico: dict | None = None


class PresentationRequest(BaseModel):
    text: str = Field(..., min_length=10)
    template: str = "standard"


class PresentationResponse(BaseModel):
    titulo_presentacion: str
    subtitulo: str | None = None
    slides: list[dict]


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    transcription: str
    analysis: str
    analysis_type: AnalysisType
    presentation_data: dict | None = None
    objectives: list[str] | None = None


class MeetingResponse(BaseModel):
    id: int
    title: str
    transcription: str
    analysis: str
    analysis_type: str
    presentation_data: dict | None = None
    objectives: list[str] | None = None
    created_at: str
    duration_seconds: float | None = None


class MeetingListItem(BaseModel):
    id: int
    title: str
    analysis_type: str
    created_at: str
    preview: str


class ProcessAudioResponse(BaseModel):
    transcription: str
    analysis: str
    analysis_type: str
    presentation: dict | None = None
    objectives: list[str] | None = None
    meeting_id: int | None = None
    metadata: dict

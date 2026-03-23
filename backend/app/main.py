from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routes import transcription, analysis, presentations, meetings, auth

settings = get_settings()

app = FastAPI(
    title="Sanatorio Argentino API",
    description="AI-powered meeting transcription, analysis & presentation engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(transcription.router)
app.include_router(analysis.router)
app.include_router(presentations.router)
app.include_router(meetings.router)


@app.get("/")
async def root():
    return {"service": "Sanatorio Argentino Transcriptor API", "version": "1.0.0", "status": "operational"}



@app.get("/api/v1/health")
async def health():
    return {"status": "healthy", "service": "growlabs-backend"}

"""Application entry point and API health check."""

import os
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.api.learning_paths import router as learning_paths_router
from app.api.topics import router as topics_router
from app.api.notes import router as notes_router


app = FastAPI(
    title="StudyForge API",
    description="A personal technical learning and interview-preparation platform.",
    version="0.1.0",
)
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(learning_paths_router)
app.include_router(topics_router)
app.include_router(notes_router)


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(request, exc):
    # Never send SQL, connection details, or credentials to the browser.
    return JSONResponse(status_code=503, content={"detail": "Database temporarily unavailable. Please try again."})


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
def health_check() -> HealthResponse:
    """Confirm the API is running; this does not check database connectivity."""
    return HealthResponse()

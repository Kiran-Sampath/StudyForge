"""Application entry point and API health check."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI(
    title="StudyForge API",
    description="A personal technical learning and interview-preparation platform.",
    version="0.1.0",
)


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
def health_check() -> HealthResponse:
    """Confirm the API is running; this does not check database connectivity."""
    return HealthResponse()

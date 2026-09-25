from fastapi.testclient import TestClient

from app.main import app


def test_health_check_returns_ok() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_workspace_api_requires_a_bearer_session() -> None:
    with TestClient(app) as unauthenticated:
        response = unauthenticated.get("/api/paths")
    assert response.status_code == 401

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.main import app
from app.models import LearningPath, Topic, Note, TopicStatus


def test_create_read_update_delete(client):
    response = client.post("/api/paths", json={"title": "  Python  ", "description": "  APIs  "})
    assert response.status_code == 201
    path = response.json()
    url = f"/api/paths/{path['id']}"
    assert response.headers["location"] == url
    assert path["title"] == "Python"
    assert path["description"] == "APIs"
    assert path["topic_count"] == path["completion_percentage"] == 0
    assert path["created_at"] and path["updated_at"]
    # Separate requests use separate sessions and must see committed data.
    assert client.get(url).json() == path
    assert client.get("/api/paths").json() == [path]
    updated = client.patch(url, json={"title": "FastAPI"}).json()
    assert updated["title"] == "FastAPI"
    assert updated["description"] == "APIs"
    assert updated["created_at"] == path["created_at"]
    assert client.patch(url, json={"description": None}).json()["description"] is None
    assert client.delete(url).status_code == 204
    assert client.get(url).status_code == 404
    assert client.get("/api/paths").json() == []


@pytest.mark.parametrize("body", [{}, {"title": ""}, {"title": " \t\n "}, {"title": None},
    {"title": "x" * 201}, {"title": 42}, {"title": "Valid", "description": "x" * 1001},
    {"title": "Valid", "unknown": True}])
def test_invalid_creation(client, body):
    assert client.post("/api/paths", json=body).status_code == 422
    assert client.get("/api/paths").json() == []


@pytest.mark.parametrize("body", [{}, {"title": None}, {"title": "  "}, {"title": "x" * 201}, {"unknown": True}])
def test_invalid_update_preserves_record(client, body):
    path = client.post("/api/paths", json={"title": "Original"}).json()
    assert client.patch(f"/api/paths/{path['id']}", json=body).status_code == 422
    assert client.get(f"/api/paths/{path['id']}").json()["title"] == "Original"


def test_missing_records_and_invalid_ids(client):
    for method in ("get", "patch", "delete"):
        kwargs = {"json": {"title": "Updated"}} if method == "patch" else {}
        response = getattr(client, method)("/api/paths/999999", **kwargs)
        assert response.status_code == 404
        assert response.json() == {"detail": "Learning path not found"}
    for value in ("0", "-1", "abc", "999999999999999999999"):
        assert client.get(f"/api/paths/{value}").status_code == 422


def test_aggregates_and_cascade_do_not_affect_other_paths(client, database):
    connection, _ = database
    path_id = client.post("/api/paths", json={"title": "Target"}).json()["id"]
    other_id = client.post("/api/paths", json={"title": "Keep"}).json()["id"]
    with Session(connection, join_transaction_mode="create_savepoint") as session:
        session.add_all([
            Topic(title="Done", learning_path_id=path_id, status=TopicStatus.COMPLETED),
            Topic(title="Active", learning_path_id=path_id, status=TopicStatus.IN_PROGRESS),
            Topic(title="Later", learning_path_id=path_id),
        ])
        target_topic = Topic(title="Another done", learning_path_id=path_id, status=TopicStatus.COMPLETED)
        other_topic = Topic(title="Preserve", learning_path_id=other_id)
        session.add_all([Note(title="Remove", topic=target_topic), Note(title="Keep", topic=other_topic)])
        session.commit()
    summary = client.get(f"/api/paths/{path_id}").json()
    assert summary["topic_count"] == 4
    assert summary["completed_topic_count"] == 2
    assert summary["in_progress_topic_count"] == 1
    assert summary["completion_percentage"] == 50
    assert client.get(f"/api/paths/{other_id}").json()["completion_percentage"] == 0
    assert client.delete(f"/api/paths/{path_id}").status_code == 204
    with Session(connection) as session:
        assert session.scalars(select(Topic.title)).all() == ["Preserve"]
        assert session.scalars(select(Note.title)).all() == ["Keep"]


def test_bounded_lists(client):
    first = client.post("/api/paths", json={"title": "First"}).json()
    second = client.post("/api/paths", json={"title": "Second"}).json()
    assert client.get("/api/paths?limit=1").json()[0]["id"] == second["id"]
    assert client.get("/api/paths?limit=1&offset=1").json()[0]["id"] == first["id"]
    for query in ("limit=0", "limit=101", "offset=-1"):
        assert client.get("/api/paths?" + query).status_code == 422


def test_database_errors_do_not_leak_details():
    def unavailable():
        raise SQLAlchemyError("sensitive connection details")

    app.dependency_overrides[get_db] = unavailable
    try:
        with TestClient(app) as client:
            response = client.get("/api/paths")
        assert response.status_code == 503
        assert response.json() == {"detail": "Database temporarily unavailable. Please try again."}
        assert "sensitive" not in response.text
    finally:
        app.dependency_overrides.clear()

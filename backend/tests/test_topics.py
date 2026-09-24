import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Note, Topic


def make_path(client, title="Learning path"):
    response = client.post("/api/paths", json={"title": title})
    assert response.status_code == 201
    return response.json()["id"]


def test_topic_workflow_order_status_and_progress(client):
    path_id = make_path(client)
    url = f"/api/paths/{path_id}/topics"
    first_response = client.post(url, json={"title": "  Core Java  ", "description": "  Basics  "})
    assert first_response.status_code == 201
    first = first_response.json()
    assert first_response.headers["location"] == f"/api/topics/{first['id']}"
    assert first["title"] == "Core Java"
    assert first["description"] == "Basics"
    assert first["status"] == "NOT_STARTED"
    assert first["position"] == 0
    assert first["created_at"] and first["updated_at"]
    second = client.post(url, json={"title": "Spring Boot"}).json()
    third = client.post(url, json={"title": "REST APIs"}).json()
    assert [item["position"] for item in (first, second, third)] == [0, 1, 2]
    assert [item["id"] for item in client.get(url).json()] == [first["id"], second["id"], third["id"]]
    assert client.get(f"/api/topics/{first['id']}").json() == first
    updated = client.patch(f"/api/topics/{second['id']}", json={"title": "Spring Framework", "status": "COMPLETED"}).json()
    assert updated["title"] == "Spring Framework"
    assert updated["description"] is None
    assert updated["status"] == "COMPLETED"
    assert updated["position"] == 1
    client.patch(f"/api/topics/{third['id']}", json={"status": "IN_PROGRESS"})
    summary = client.get(f"/api/paths/{path_id}").json()
    assert (summary["topic_count"], summary["completed_topic_count"],
            summary["in_progress_topic_count"], summary["completion_percentage"]) == (3, 1, 1, 33)
    assert client.patch(f"/api/topics/{first['id']}", json={"description": None}).status_code == 200
    assert client.delete(f"/api/topics/{first['id']}").status_code == 204
    assert client.get(f"/api/topics/{first['id']}").status_code == 404
    assert [item["position"] for item in client.get(url).json()] == [1, 2]
    appended = client.post(url, json={"title": "Testing"}).json()
    assert appended["position"] == 3


@pytest.mark.parametrize("body", [{}, {"title": ""}, {"title": "  "}, {"title": None},
    {"title": "x" * 201}, {"title": 123}, {"title": "Valid", "unknown": True},
    {"title": "Valid", "status": "COMPLETED"}])
def test_invalid_create(client, body):
    path_id = make_path(client)
    assert client.post(f"/api/paths/{path_id}/topics", json=body).status_code == 422
    assert client.get(f"/api/paths/{path_id}/topics").json() == []


@pytest.mark.parametrize("body", [{}, {"title": None}, {"title": " "},
    {"status": None}, {"status": "INVALID"}, {"position": 0},
    {"learning_path_id": 99}])
def test_invalid_update_preserves_topic(client, body):
    path_id = make_path(client)
    topic = client.post(f"/api/paths/{path_id}/topics", json={"title": "Original"}).json()
    assert client.patch(f"/api/topics/{topic['id']}", json=body).status_code == 422
    assert client.get(f"/api/topics/{topic['id']}").json() == topic


def test_missing_parent_and_topic(client):
    assert client.post("/api/paths/999999/topics", json={"title": "Orphan"}).status_code == 404
    assert client.get("/api/paths/999999/topics").status_code == 404
    path_id = make_path(client)
    for method in ("get", "patch", "delete"):
        body = {"json": {"title": "New"}} if method == "patch" else {}
        assert getattr(client, method)("/api/topics/999999", **body).status_code == 404
    for value in ("0", "-1", "abc", "999999999999999999"):
        assert client.get(f"/api/topics/{value}").status_code == 422
        assert client.get(f"/api/paths/{value}/topics").status_code == 422
    for query in ("limit=0", "limit=101", "offset=-1"):
        assert client.get(f"/api/paths/{path_id}/topics?{query}").status_code == 422


def test_topic_delete_cascades_notes_but_preserves_sibling(client, database):
    connection, _ = database
    path_id = make_path(client)
    url = f"/api/paths/{path_id}/topics"
    target = client.post(url, json={"title": "Target"}).json()
    sibling = client.post(url, json={"title": "Sibling"}).json()
    with Session(connection, join_transaction_mode="create_savepoint") as session:
        session.add_all([
            Note(title="Removed", topic_id=target["id"]),
            Note(title="Preserved", topic_id=sibling["id"]),
        ])
        session.commit()
    assert client.delete(f"/api/topics/{target['id']}").status_code == 204
    with Session(connection) as session:
        assert session.scalars(select(Note.title)).all() == ["Preserved"]
        assert session.scalars(select(Topic.title)).all() == ["Sibling"]


def test_topic_list_is_bounded_and_ordered(client):
    path_id = make_path(client)
    url = f"/api/paths/{path_id}/topics"
    for title in ("First", "Second", "Third"):
        assert client.post(url, json={"title": title}).status_code == 201
    assert [item["title"] for item in client.get(url + "?limit=2").json()] == ["First", "Second"]
    assert [item["title"] for item in client.get(url + "?limit=2&offset=2").json()] == ["Third"]

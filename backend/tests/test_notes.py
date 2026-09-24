import pytest


def topic_url(client):
    path = client.post('/api/paths', json={'title': 'Path'}).json()
    topic = client.post(f"/api/paths/{path['id']}/topics", json={'title': 'Topic'}).json()
    return path['id'], topic['id'], f"/api/topics/{topic['id']}/notes"


def test_note_lifecycle_and_cascade(client):
    path_id, topic_id, url = topic_url(client)
    response = client.post(url, json={'title': '  First  ', 'content': '# Hello'})
    assert response.status_code == 201
    note = response.json()
    assert response.headers['location'] == f"/api/notes/{note['id']}"
    assert note['title'] == 'First' and note['topic_id'] == topic_id
    assert note['created_at'] and note['updated_at']
    assert client.get(f"/api/notes/{note['id']}").json() == note
    second = client.post(url, json={'title': 'Second'}).json()
    assert second['content'] == ''
    assert [item['id'] for item in client.get(url).json()] == [second['id'], note['id']]
    assert [item['id'] for item in client.get(url + '?limit=1&offset=1').json()] == [note['id']]
    updated = client.patch(f"/api/notes/{note['id']}", json={'content': 'Changed'}).json()
    assert updated['content'] == 'Changed' and updated['title'] == 'First'
    assert client.delete(f"/api/notes/{note['id']}").status_code == 204
    assert client.get(f"/api/notes/{note['id']}").status_code == 404
    assert client.delete(f'/api/paths/{path_id}').status_code == 204
    assert client.get(f"/api/notes/{second['id']}").status_code == 404


@pytest.mark.parametrize('body', [{}, {'title': ''}, {'title': ' '}, {'title': None}, {'title': 'x' * 201}, {'title': 'Valid', 'content': None}, {'title': 'Valid', 'content': 'x' * 200001}, {'title': 'Valid', 'topic_id': 20}])
def test_invalid_note_create(client, body):
    _, _, url = topic_url(client)
    assert client.post(url, json=body).status_code == 422


@pytest.mark.parametrize('body', [{}, {'title': ''}, {'title': None}, {'content': None}, {'topic_id': 42}, {'content': 'x' * 200001}])
def test_invalid_note_update(client, body):
    _, _, url = topic_url(client)
    note = client.post(url, json={'title': 'Original'}).json()
    assert client.patch(f"/api/notes/{note['id']}", json=body).status_code == 422
    assert client.get(f"/api/notes/{note['id']}").json() == note


def test_missing_note_and_parent(client):
    assert client.get('/api/topics/999999/notes').status_code == 404
    assert client.post('/api/topics/999999/notes', json={'title': 'Orphan'}).status_code == 404
    for method in ('get', 'patch', 'delete'):
        kwargs = {'json': {'title': 'New'}} if method == 'patch' else {}
        assert getattr(client, method)('/api/notes/999999', **kwargs).status_code == 404
    _, _, url = topic_url(client)
    for query in ('limit=0', 'limit=101', 'offset=-1'):
        assert client.get(f'{url}?{query}').status_code == 422

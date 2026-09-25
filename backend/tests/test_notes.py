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
    assert note['format'] == 'markdown' and note['links'] == []
    assert note['key_takeaway'] is None and note['revisit_question'] is None and note['confidence'] is None
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


def test_plain_note_and_multiple_resource_links_persist(client):
    _, _, url = topic_url(client)
    resources = [
        {'label': '  Reference docs  ', 'url': 'https://example.com/guide'},
        {'label': 'Source code', 'url': 'https://github.com/example/repo'},
        {'label': 'Video', 'url': 'https://www.youtube.com/watch?v=abc'},
    ]
    response = client.post(url, json={'title': 'Resources', 'content': '**literal**', 'format': 'plain', 'links': resources})
    assert response.status_code == 201
    note = response.json()
    assert note['format'] == 'plain' and note['content'] == '**literal**'
    assert [link['label'] for link in note['links']] == ['Reference docs', 'Source code', 'Video']
    updated = client.patch(f"/api/notes/{note['id']}", json={'format': 'markdown', 'links': resources[:1]})
    assert updated.status_code == 200
    saved = client.get(f"/api/notes/{note['id']}").json()
    assert saved['format'] == 'markdown' and len(saved['links']) == 1
    assert saved['content'] == '**literal**'


def test_optional_learning_check_persists_and_can_be_cleared(client):
    _, _, url = topic_url(client)
    note = client.post(url, json={
        'title': 'Reflection',
        'key_takeaway': '  Requests should be idempotent.  ',
        'revisit_question': 'How do retries affect writes?',
        'confidence': 'NEED_MORE_PRACTICE',
    }).json()
    assert note['key_takeaway'] == 'Requests should be idempotent.'
    assert note['revisit_question'] == 'How do retries affect writes?'
    assert note['confidence'] == 'NEED_MORE_PRACTICE'
    cleared = client.patch(f"/api/notes/{note['id']}", json={
        'key_takeaway': None, 'revisit_question': '   ', 'confidence': None,
    })
    assert cleared.status_code == 200
    assert cleared.json()['key_takeaway'] is None
    assert cleared.json()['revisit_question'] is None
    assert cleared.json()['confidence'] is None


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


@pytest.mark.parametrize('patch', [
    {'format': 'html'}, {'format': None}, {'links': None},
    {'links': [{'url': 'javascript:alert(1)'}]},
    {'links': [{'url': 'file:///etc/passwd'}]},
    {'links': [{'url': 'https://example.com', 'label': 'x' * 121}]},
    {'links': [{'url': 'https://example.com', 'unexpected': True}]},
    {'links': [{'url': 'https://example.com'}] * 31},
    {'confidence': 'MASTERED'},
    {'key_takeaway': 'x' * 5001},
])
def test_invalid_format_or_resource_link_preserves_note(client, patch):
    _, _, url = topic_url(client)
    note = client.post(url, json={'title': 'Original'}).json()
    assert client.patch(f"/api/notes/{note['id']}", json=patch).status_code == 422
    assert client.get(f"/api/notes/{note['id']}").json() == note

"""Integration tests require an explicitly selected, disposable PostgreSQL DB."""
from io import StringIO
from pathlib import Path

from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models import LearningPath, Note, NoteImage, Topic, TopicStatus


def alembic_config():
    return Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))


def test_password_special_characters_are_preserved():
    settings = Settings(
        _env_file=None, db_host="localhost", db_user="test",
        db_password="p@ss:/%#word", db_name="studyforge_test",
    )
    assert settings.database_url.password == "p@ss:/%#word"
    assert "p@ss" not in str(settings.database_url)
    assert "p@ss" not in repr(settings)


def test_migration_compiles_without_database_credentials():
    config = alembic_config()
    config.output_buffer = StringIO()
    command.upgrade(config, "head", sql=True)
    sql = config.output_buffer.getvalue()
    assert "CREATE TABLE learning_paths" in sql
    assert "ON DELETE CASCADE" in sql
    assert "ENABLE ROW LEVEL SECURITY" in sql
    assert "CREATE TABLE note_images" in sql




def test_migration_round_trip_and_metadata(database):
    connection, config = database
    command.check(config)
    assert set(inspect(connection).get_table_names()) == {
        "learning_paths", "topics", "notes", "note_images", "alembic_version",
    }
    assert connection.execute(text(
        "SELECT count(*) FROM pg_class WHERE relname IN "
        "('learning_paths', 'topics', 'notes', 'note_images') AND relrowsecurity"
    )).scalar_one() == 4
    command.downgrade(config, "base")
    assert inspect(connection).get_table_names() == ["alembic_version"]
    command.upgrade(config, "head")
    command.check(config)


def test_defaults_ordering_and_database_cascades(database):
    connection, _ = database
    with Session(connection, join_transaction_mode="create_savepoint") as session:
        path = LearningPath(title="Java")
        later = Topic(title="Threads", position=1, learning_path=path)
        earlier = Topic(title="Basics", position=0, learning_path=path)
        note = Note(title="Lifecycle", content="# Threads", topic=later)
        session.add_all([path, later, earlier, note])
        session.flush()
        image = NoteImage(filename="diagram.png", content_type="image/png", size_bytes=12,
                          storage_path="user/note/image.png", note=note)
        session.add(image)
        session.flush()
        assert earlier.status == TopicStatus.NOT_STARTED
        assert path.created_at.tzinfo is not None
        session.expire(path, ["topics"])
        assert [topic.title for topic in path.topics] == ["Basics", "Threads"]
        # Raw SQL proves the database cascades without assistance from the ORM.
        session.execute(text("DELETE FROM topics WHERE id = :id"), {"id": later.id})
        assert session.scalar(select(Note.id)) is None
        assert session.scalar(select(NoteImage.id)) is None
        session.add(Note(title="Overview", topic=earlier))
        session.flush()
        session.execute(text("DELETE FROM learning_paths WHERE id = :id"), {"id": path.id})
        assert session.scalar(select(Topic.id)) is None
        assert session.scalar(select(Note.id)) is None


@pytest.mark.parametrize("statement", [
    "INSERT INTO learning_paths (title) VALUES ('   ')",
    "INSERT INTO topics (title, learning_path_id) VALUES ('Orphan', 999)",
    "INSERT INTO notes (title, topic_id) VALUES ('Orphan', 999)",
    "INSERT INTO topics (title, learning_path_id, status) VALUES ('Bad', 1, 'INVALID')",
    "INSERT INTO topics (title, learning_path_id, position) VALUES ('Bad', 1, -1)",
])
def test_database_rejects_invalid_records(database, statement):
    connection, _ = database
    connection.execute(text("INSERT INTO learning_paths (id, title) VALUES (1, 'Valid')"))
    with pytest.raises(IntegrityError):
        with connection.begin_nested():
            connection.execute(text(statement))

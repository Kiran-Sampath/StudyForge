import os
from pathlib import Path
from uuid import UUID

from alembic import command
from alembic.config import Config
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.main import app


def alembic_config():
    return Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))


@pytest.fixture
def database():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable PostgreSQL database")
    engine = create_engine(url)
    try:
        # PostgreSQL transactional DDL rolls back all test schema/data changes.
        with engine.connect() as connection:
            if inspect(connection).get_table_names():
                pytest.fail("Integration tests require an empty, dedicated database")
            connection.rollback()
            with connection.begin() as transaction:
                config = alembic_config()
                config.attributes["connection"] = connection
                command.upgrade(config, "head")
                yield connection, config
                transaction.rollback()
    finally:
        engine.dispose()


@pytest.fixture
def client(database):
    connection, _ = database

    def test_session():
        with Session(connection, join_transaction_mode="create_savepoint") as session:
            yield session

    app.dependency_overrides[get_db] = test_session
    app.dependency_overrides[get_current_user] = lambda: UUID("00000000-0000-0000-0000-000000000001")
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()

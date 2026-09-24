import os
from pathlib import Path

from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import create_engine, inspect


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

"""Run with python -m app.db.check after configuring .env and migrating."""
import sys

from sqlalchemy import inspect, text

from app.db.session import get_engine


def main() -> int:
    engine = None
    try:
        engine = get_engine()
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            tables = set(inspect(connection).get_table_names())
            required = {"learning_paths", "topics", "notes", "alembic_version"}
            if not required.issubset(tables):
                print("Database connected. Schema is incomplete; run alembic upgrade head.")
                return 1
            revision = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
            print(f"Database connected. Notebook tables found. Migration revision: {revision}")
        return 0
    except Exception as exc:
        # Connection exceptions may contain connection details. Never print them.
        print(f"Database check failed ({type(exc).__name__}). Check .env, network access, and migrations.")
        return 1
    finally:
        if engine is not None:
            engine.dispose()


if __name__ == "__main__":
    sys.exit(main())

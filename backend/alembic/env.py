from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import get_settings
from app.db.base import Base
from app import models  # noqa: F401 -- register model metadata


def include_name(name, type_, parent_names):
    # Autogeneration must never propose dropping Supabase or unrelated tables.
    if type_ == "table":
        return name in Base.metadata.tables
    return True


options = {
    "target_metadata": Base.metadata,
    "include_name": include_name,
    "compare_type": True,
}

if context.is_offline_mode():
    context.configure(
        dialect_name="postgresql", literal_binds=True,
        dialect_opts={"paramstyle": "named"}, **options,
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    supplied_connection = context.config.attributes.get("connection")
    if supplied_connection is not None:
        context.configure(connection=supplied_connection, **options)
        with context.begin_transaction():
            context.run_migrations()
    else:
        engine = create_engine(
            get_settings().database_url, poolclass=pool.NullPool, hide_parameters=True,
        )
        try:
            with engine.connect() as connection:
                context.configure(connection=connection, **options)
                with context.begin_transaction():
                    context.run_migrations()
        finally:
            engine.dispose()

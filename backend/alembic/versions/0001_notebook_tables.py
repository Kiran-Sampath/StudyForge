"""Create learning paths, topics, and notes.

Revision ID: 0001
Revises: none
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def timestamps():
    return (
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def upgrade() -> None:
    op.create_table(
        "learning_paths",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        *timestamps(),
        sa.CheckConstraint("length(trim(title)) > 0", name="title_not_blank"),
    )
    op.create_table(
        "topics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("learning_path_id", sa.Integer(), sa.ForeignKey("learning_paths.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.Enum("NOT_STARTED", "IN_PROGRESS", "COMPLETED", native_enum=False, create_constraint=True, name="topic_status"), nullable=False, server_default="NOT_STARTED"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        *timestamps(),
        sa.CheckConstraint("length(trim(title)) > 0", name="title_not_blank"),
        sa.CheckConstraint("position >= 0", name="position_nonnegative"),
    )
    op.create_index("ix_topics_learning_path_id", "topics", ["learning_path_id"])
    op.create_table(
        "notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("topic_id", sa.Integer(), sa.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        *timestamps(),
        sa.CheckConstraint("length(trim(title)) > 0", name="title_not_blank"),
    )
    op.create_index("ix_notes_topic_id", "notes", ["topic_id"])
    # No browser Data API access: all notebook operations go through FastAPI.
    for table in ("learning_paths", "topics", "notes"):
        op.execute(sa.text(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY'))


def downgrade() -> None:
    op.drop_table("notes")
    op.drop_table("topics")
    op.drop_table("learning_paths")

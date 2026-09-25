"""Add owner scope to learning paths.

Revision ID: 0004
Revises: 0003
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("learning_paths", sa.Column("owner_id", sa.Uuid(), nullable=True))
    op.create_index("ix_learning_paths_owner_id", "learning_paths", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_learning_paths_owner_id", table_name="learning_paths")
    op.drop_column("learning_paths", "owner_id")

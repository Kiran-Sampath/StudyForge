"""Add note format and saved resource links.

Revision ID: 0002
Revises: 0001
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notes", sa.Column("format", sa.String(16), nullable=False, server_default="markdown"))
    op.add_column("notes", sa.Column("links", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")))
    op.create_check_constraint("ck_notes_valid_format", "notes", "format IN ('markdown', 'plain')")


def downgrade() -> None:
    op.drop_constraint("ck_notes_valid_format", "notes", type_="check")
    op.drop_column("notes", "links")
    op.drop_column("notes", "format")

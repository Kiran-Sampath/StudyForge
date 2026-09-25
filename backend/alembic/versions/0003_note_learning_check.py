"""Add optional note learning check fields.

Revision ID: 0003
Revises: 0002
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notes", sa.Column("key_takeaway", sa.Text(), nullable=True))
    op.add_column("notes", sa.Column("revisit_question", sa.Text(), nullable=True))
    op.add_column("notes", sa.Column("confidence", sa.String(24), nullable=True))
    op.create_check_constraint(
        "ck_notes_valid_confidence",
        "notes",
        "confidence IS NULL OR confidence IN ('STILL_LEARNING', 'NEED_MORE_PRACTICE', 'CONFIDENT')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_notes_valid_confidence", "notes", type_="check")
    op.drop_column("notes", "confidence")
    op.drop_column("notes", "revisit_question")
    op.drop_column("notes", "key_takeaway")

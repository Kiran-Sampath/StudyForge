from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps

if TYPE_CHECKING:
    from app.models.topic import Topic


class Note(Timestamps, Base):
    __tablename__ = "notes"
    __table_args__ = (
        CheckConstraint("length(trim(title)) > 0", name="title_not_blank"),
        CheckConstraint("format IN ('markdown', 'plain')", name="valid_format"),
        CheckConstraint("confidence IS NULL OR confidence IN ('STILL_LEARNING', 'NEED_MORE_PRACTICE', 'CONFIDENT')", name="valid_confidence"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default="", server_default="")
    format: Mapped[str] = mapped_column(String(16), default="markdown", server_default="markdown")
    links: Mapped[list[dict]] = mapped_column(JSONB, default=list, server_default=text("'[]'::jsonb"))
    key_takeaway: Mapped[str | None] = mapped_column(Text)
    revisit_question: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[str | None] = mapped_column(String(24))
    topic: Mapped[Topic] = relationship(back_populates="notes")

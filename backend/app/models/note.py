from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps

if TYPE_CHECKING:
    from app.models.topic import Topic


class Note(Timestamps, Base):
    __tablename__ = "notes"
    __table_args__ = (CheckConstraint("length(trim(title)) > 0", name="title_not_blank"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default="", server_default="")
    topic: Mapped[Topic] = relationship(back_populates="notes")

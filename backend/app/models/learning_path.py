from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps

if TYPE_CHECKING:
    from app.models.topic import Topic


class LearningPath(Timestamps, Base):
    __tablename__ = "learning_paths"
    __table_args__ = (CheckConstraint("length(trim(title)) > 0", name="title_not_blank"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    topics: Mapped[list[Topic]] = relationship(
        back_populates="learning_path", cascade="all, delete-orphan",
        passive_deletes=True, order_by="(Topic.position, Topic.id)",
    )

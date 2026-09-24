from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Enum as SQLAlchemyEnum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps

if TYPE_CHECKING:
    from app.models.learning_path import LearningPath
    from app.models.note import Note


class TopicStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class Topic(Timestamps, Base):
    __tablename__ = "topics"
    __table_args__ = (
        CheckConstraint("length(trim(title)) > 0", name="title_not_blank"),
        CheckConstraint("position >= 0", name="position_nonnegative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    learning_path_id: Mapped[int] = mapped_column(
        ForeignKey("learning_paths.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[TopicStatus] = mapped_column(
        SQLAlchemyEnum(TopicStatus, native_enum=False, create_constraint=True,
                       validate_strings=True, name="topic_status"),
        default=TopicStatus.NOT_STARTED, server_default="NOT_STARTED",
    )
    position: Mapped[int] = mapped_column(default=0, server_default="0")
    learning_path: Mapped[LearningPath] = relationship(back_populates="topics")
    notes: Mapped[list[Note]] = relationship(
        back_populates="topic", cascade="all, delete-orphan", passive_deletes=True,
        order_by="Note.id",
    )

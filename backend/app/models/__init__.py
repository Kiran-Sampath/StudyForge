"""Import all models so Alembic can discover their metadata."""

from app.models.learning_path import LearningPath
from app.models.note import Note
from app.models.topic import Topic, TopicStatus

__all__ = ["LearningPath", "Topic", "TopicStatus", "Note"]

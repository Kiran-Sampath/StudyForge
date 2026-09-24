from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]


class LearningPathCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title
    description: Description | None = None


class LearningPathUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title | None = None
    description: Description | None = None

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("Title cannot be null")
        return self


class LearningPathResponse(BaseModel):
    id: int
    title: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    topic_count: int
    completed_topic_count: int
    in_progress_topic_count: int
    completion_percentage: int

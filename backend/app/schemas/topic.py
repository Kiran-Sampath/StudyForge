from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.topic import TopicStatus
from app.schemas.learning_path import Description, Title


class TopicCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title
    description: Description | None = None


class TopicUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title | None = None
    description: Description | None = None
    status: TopicStatus | None = None

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("Title cannot be null")
        if "status" in self.model_fields_set and self.status is None:
            raise ValueError("Status cannot be null")
        return self


class TopicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    learning_path_id: int
    title: str
    description: str | None
    status: TopicStatus
    position: int
    created_at: datetime
    updated_at: datetime

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

from app.schemas.learning_path import Title

Content = Annotated[str, StringConstraints(max_length=200000)]


class NoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title
    content: Content = ""


class NoteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title | None = None
    content: Content | None = None

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        for field in ("title", "content"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field.capitalize()} cannot be null")
        return self


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    topic_id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

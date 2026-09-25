from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, field_validator, model_validator

from app.schemas.learning_path import Title

Content = Annotated[str, StringConstraints(max_length=200000)]
NoteFormat = Literal["markdown", "plain"]


class NoteLink(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: str = Field(default="", max_length=120)
    url: HttpUrl

    @field_validator("label")
    @classmethod
    def trim_label(cls, value: str) -> str:
        return value.strip()


NoteLinks = Annotated[list[NoteLink], Field(max_length=30)]


class NoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title
    content: Content = ""
    format: NoteFormat = "markdown"
    links: NoteLinks = Field(default_factory=list)


class NoteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title | None = None
    content: Content | None = None
    format: NoteFormat | None = None
    links: NoteLinks | None = None

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        for field in ("title", "content", "format", "links"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field.capitalize()} cannot be null")
        return self


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    topic_id: int
    title: str
    content: str
    format: NoteFormat
    links: list[NoteLink]
    created_at: datetime
    updated_at: datetime

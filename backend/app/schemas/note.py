from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, field_validator, model_validator

from app.schemas.learning_path import Title

Content = Annotated[str, StringConstraints(max_length=200000)]
NoteFormat = Literal["markdown", "plain"]
ConfidenceLevel = Literal["STILL_LEARNING", "NEED_MORE_PRACTICE", "CONFIDENT"]
LearningCheckText = Annotated[str, StringConstraints(max_length=5000)]


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
    key_takeaway: LearningCheckText | None = None
    revisit_question: LearningCheckText | None = None
    confidence: ConfidenceLevel | None = None

    @field_validator("key_takeaway", "revisit_question")
    @classmethod
    def normalize_learning_check(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class NoteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title | None = None
    content: Content | None = None
    format: NoteFormat | None = None
    links: NoteLinks | None = None
    key_takeaway: LearningCheckText | None = None
    revisit_question: LearningCheckText | None = None
    confidence: ConfidenceLevel | None = None

    @field_validator("key_takeaway", "revisit_question")
    @classmethod
    def normalize_learning_check(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

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
    key_takeaway: str | None
    revisit_question: str | None
    confidence: ConfidenceLevel | None
    created_at: datetime
    updated_at: datetime


class NoteImageResponse(BaseModel):
    id: int
    note_id: int
    filename: str
    content_type: Literal["image/jpeg", "image/png", "image/webp"]
    size_bytes: int
    alt_text: str | None
    url: str

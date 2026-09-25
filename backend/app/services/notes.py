from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from uuid import UUID

from app.models import LearningPath, Note, Topic
from app.schemas.note import NoteCreate, NoteUpdate


def get_note(db: Session, note_id: int, owner_id: UUID) -> Note:
    note = db.scalar(select(Note).join(Note.topic).join(Topic.learning_path).where(Note.id == note_id, LearningPath.owner_id == owner_id))
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


def list_notes(db: Session, topic_id: int, owner_id: UUID, limit: int, offset: int) -> list[Note]:
    if db.scalar(select(Topic.id).join(Topic.learning_path).where(Topic.id == topic_id, LearningPath.owner_id == owner_id)) is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return list(db.scalars(
        select(Note).join(Note.topic).join(Topic.learning_path).where(Note.topic_id == topic_id, LearningPath.owner_id == owner_id)
        .order_by(Note.created_at.desc(), Note.id.desc()).limit(limit).offset(offset)
    ))


def create_note(db: Session, topic_id: int, data: NoteCreate, owner_id: UUID) -> Note:
    if db.scalar(select(Topic.id).join(Topic.learning_path).where(Topic.id == topic_id, LearningPath.owner_id == owner_id)) is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    note = Note(topic_id=topic_id, **data.model_dump(mode="json"))
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def update_note(db: Session, note_id: int, data: NoteUpdate, owner_id: UUID) -> Note:
    note = get_note(db, note_id, owner_id)
    for name, value in data.model_dump(exclude_unset=True, mode="json").items():
        setattr(note, name, value)
    db.commit()
    db.refresh(note)
    return note


def delete_note(db: Session, note_id: int, owner_id: UUID) -> None:
    note = get_note(db, note_id, owner_id)
    db.delete(note)
    db.commit()

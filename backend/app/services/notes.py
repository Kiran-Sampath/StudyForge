from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Note, Topic
from app.schemas.note import NoteCreate, NoteUpdate


def get_note(db: Session, note_id: int) -> Note:
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


def list_notes(db: Session, topic_id: int, limit: int, offset: int) -> list[Note]:
    if db.get(Topic, topic_id) is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return list(db.scalars(
        select(Note).where(Note.topic_id == topic_id)
        .order_by(Note.created_at.desc(), Note.id.desc()).limit(limit).offset(offset)
    ))


def create_note(db: Session, topic_id: int, data: NoteCreate) -> Note:
    if db.get(Topic, topic_id) is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    note = Note(topic_id=topic_id, **data.model_dump(mode="json"))
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def update_note(db: Session, note_id: int, data: NoteUpdate) -> Note:
    note = get_note(db, note_id)
    for name, value in data.model_dump(exclude_unset=True, mode="json").items():
        setattr(note, name, value)
    db.commit()
    db.refresh(note)
    return note


def delete_note(db: Session, note_id: int) -> None:
    note = get_note(db, note_id)
    db.delete(note)
    db.commit()

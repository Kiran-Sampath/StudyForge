from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import CurrentUser
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate
from app.services import notes

router = APIRouter(tags=["notes"])
Database = Annotated[Session, Depends(get_db)]
TopicId = Annotated[int, Path(ge=1, le=2147483647)]
NoteId = Annotated[int, Path(ge=1, le=2147483647)]


@router.post("/api/topics/{topic_id}/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(topic_id: TopicId, data: NoteCreate, user_id: CurrentUser, db: Database, response: Response):
    note = notes.create_note(db, topic_id, data, user_id)
    response.headers["Location"] = f"/api/notes/{note.id}"
    return note


@router.get("/api/topics/{topic_id}/notes", response_model=list[NoteResponse])
def list_notes(topic_id: TopicId, user_id: CurrentUser, db: Database,
               limit: Annotated[int, Query(ge=1, le=100)] = 100,
               offset: Annotated[int, Query(ge=0)] = 0):
    return notes.list_notes(db, topic_id, user_id, limit, offset)


@router.get("/api/notes/{note_id}", response_model=NoteResponse)
def get_note(note_id: NoteId, user_id: CurrentUser, db: Database):
    return notes.get_note(db, note_id, user_id)


@router.patch("/api/notes/{note_id}", response_model=NoteResponse)
def update_note(note_id: NoteId, data: NoteUpdate, user_id: CurrentUser, db: Database):
    return notes.update_note(db, note_id, data, user_id)


@router.delete("/api/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: NoteId, user_id: CurrentUser, db: Database):
    notes.delete_note(db, note_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import CurrentUser
from app.schemas.learning_path import LearningPathCreate, LearningPathResponse, LearningPathUpdate
from app.services import learning_paths

router = APIRouter(prefix="/api/paths", tags=["learning paths"])
Database = Annotated[Session, Depends(get_db)]
PathId = Annotated[int, Path(ge=1, le=2147483647)]


@router.get("", response_model=list[LearningPathResponse])
def list_paths(user_id: CurrentUser, db: Database, limit: Annotated[int, Query(ge=1, le=100)] = 100,
               offset: Annotated[int, Query(ge=0)] = 0):
    return learning_paths.list_paths(db, user_id, limit, offset)


@router.post("", response_model=LearningPathResponse, status_code=status.HTTP_201_CREATED)
def create_path(data: LearningPathCreate, user_id: CurrentUser, db: Database, response: Response):
    path = learning_paths.create_path(db, data, user_id)
    response.headers["Location"] = f"/api/paths/{path.id}"
    return path


@router.get("/{path_id}", response_model=LearningPathResponse)
def get_path(path_id: PathId, user_id: CurrentUser, db: Database):
    return learning_paths.get_path(db, path_id, user_id)


@router.patch("/{path_id}", response_model=LearningPathResponse)
def update_path(path_id: PathId, data: LearningPathUpdate, user_id: CurrentUser, db: Database):
    return learning_paths.update_path(db, path_id, data, user_id)


@router.delete("/{path_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_path(path_id: PathId, user_id: CurrentUser, db: Database):
    learning_paths.delete_path(db, path_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

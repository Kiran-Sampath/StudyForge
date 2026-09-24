from fastapi import HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import LearningPath, Topic, TopicStatus
from app.schemas.learning_path import LearningPathCreate, LearningPathResponse, LearningPathUpdate


def summary_query():
    return select(
        LearningPath,
        func.count(Topic.id).label("total"),
        func.count(case((Topic.status == TopicStatus.COMPLETED, Topic.id))).label("completed"),
        func.count(case((Topic.status == TopicStatus.IN_PROGRESS, Topic.id))).label("in_progress"),
    ).outerjoin(Topic).group_by(LearningPath.id)


def serialize(row) -> LearningPathResponse:
    path, total, completed, in_progress = row
    return LearningPathResponse(
        id=path.id, title=path.title, description=path.description,
        created_at=path.created_at, updated_at=path.updated_at,
        topic_count=total, completed_topic_count=completed,
        in_progress_topic_count=in_progress,
        completion_percentage=(completed * 100 + total // 2) // total if total else 0,
    )


def list_paths(db: Session, limit: int, offset: int):
    rows = db.execute(summary_query().order_by(LearningPath.created_at.desc(), LearningPath.id.desc()).limit(limit).offset(offset))
    return [serialize(row) for row in rows]


def get_path(db: Session, path_id: int):
    row = db.execute(summary_query().where(LearningPath.id == path_id)).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Learning path not found")
    return serialize(row)


def create_path(db: Session, data: LearningPathCreate):
    path = LearningPath(**data.model_dump())
    db.add(path)
    db.commit()
    return get_path(db, path.id)


def update_path(db: Session, path_id: int, data: LearningPathUpdate):
    path = db.get(LearningPath, path_id)
    if path is None:
        raise HTTPException(status_code=404, detail="Learning path not found")
    for name, value in data.model_dump(exclude_unset=True).items():
        setattr(path, name, value)
    db.commit()
    return get_path(db, path_id)


def delete_path(db: Session, path_id: int):
    path = db.get(LearningPath, path_id)
    if path is None:
        raise HTTPException(status_code=404, detail="Learning path not found")
    db.delete(path)
    db.commit()

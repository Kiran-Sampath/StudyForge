from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import LearningPath, Topic
from app.schemas.topic import TopicCreate, TopicUpdate


def get_topic(db: Session, topic_id: int) -> Topic:
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


def list_topics(db: Session, path_id: int, limit: int, offset: int) -> list[Topic]:
    if db.get(LearningPath, path_id) is None:
        raise HTTPException(status_code=404, detail="Learning path not found")
    return list(db.scalars(
        select(Topic).where(Topic.learning_path_id == path_id)
        .order_by(Topic.position, Topic.id).limit(limit).offset(offset)
    ))


def create_topic(db: Session, path_id: int, data: TopicCreate) -> Topic:
    # Lock the parent so two concurrent appends cannot calculate the same position.
    parent = db.scalar(select(LearningPath).where(LearningPath.id == path_id).with_for_update())
    if parent is None:
        raise HTTPException(status_code=404, detail="Learning path not found")
    position = db.scalar(
        select(func.max(Topic.position)).where(Topic.learning_path_id == path_id)
    )
    topic = Topic(
        learning_path_id=path_id, position=(position if position is not None else -1) + 1,
        **data.model_dump(),
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


def update_topic(db: Session, topic_id: int, data: TopicUpdate) -> Topic:
    topic = get_topic(db, topic_id)
    for name, value in data.model_dump(exclude_unset=True).items():
        setattr(topic, name, value)
    db.commit()
    db.refresh(topic)
    return topic


def delete_topic(db: Session, topic_id: int) -> None:
    topic = get_topic(db, topic_id)
    db.delete(topic)
    db.commit()

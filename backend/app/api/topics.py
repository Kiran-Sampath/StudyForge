from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.topic import TopicCreate, TopicResponse, TopicUpdate
from app.services import topics

router = APIRouter(tags=["topics"])
Database = Annotated[Session, Depends(get_db)]
PathId = Annotated[int, Path(ge=1, le=2147483647)]
TopicId = Annotated[int, Path(ge=1, le=2147483647)]


@router.post("/api/paths/{path_id}/topics", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(path_id: PathId, data: TopicCreate, db: Database, response: Response):
    topic = topics.create_topic(db, path_id, data)
    response.headers["Location"] = f"/api/topics/{topic.id}"
    return topic


@router.get("/api/paths/{path_id}/topics", response_model=list[TopicResponse])
def list_topics(path_id: PathId, db: Database,
                limit: Annotated[int, Query(ge=1, le=100)] = 100,
                offset: Annotated[int, Query(ge=0)] = 0):
    return topics.list_topics(db, path_id, limit, offset)


@router.get("/api/topics/{topic_id}", response_model=TopicResponse)
def get_topic(topic_id: TopicId, db: Database):
    return topics.get_topic(db, topic_id)


@router.patch("/api/topics/{topic_id}", response_model=TopicResponse)
def update_topic(topic_id: TopicId, data: TopicUpdate, db: Database):
    return topics.update_topic(db, topic_id, data)


@router.delete("/api/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(topic_id: TopicId, db: Database):
    topics.delete_topic(db, topic_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

import re
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import NoteImage
from app.schemas.note import NoteImageResponse
from app.services import notes, storage

MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGES_PER_NOTE = 10
ALLOWED_TYPES = {"image/jpeg": ("jpg", b"\xff\xd8\xff"), "image/png": ("png", b"\x89PNG\r\n\x1a\n"), "image/webp": ("webp", b"RIFF")}


def validate_image(data: bytes, content_type: str | None) -> str:
    if not data:
        raise HTTPException(status_code=400, detail="Choose a non-empty image")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Images must be 8 MB or smaller")
    spec = ALLOWED_TYPES.get(content_type or "")
    if spec is None:
        raise HTTPException(status_code=415, detail="Use a JPEG, PNG, or WebP image")
    if not data.startswith(spec[1]) or (content_type == "image/webp" and data[8:12] != b"WEBP"):
        raise HTTPException(status_code=415, detail="The selected file does not match its image type")
    return content_type or ""


def safe_filename(value: str | None) -> str:
    name = Path(value or "image").name
    name = re.sub(r"[\x00-\x1f\x7f]", "", name).strip()
    return (name[:255] or "image")


def _response(image: NoteImage) -> NoteImageResponse:
    return NoteImageResponse(
        id=image.id, note_id=image.note_id, filename=image.filename,
        content_type=image.content_type, size_bytes=image.size_bytes,
        alt_text=image.alt_text, url=storage.create_signed_url(image.storage_path),
    )


def list_images(db: Session, note_id: int, owner_id: UUID) -> list[NoteImageResponse]:
    notes.get_note(db, note_id, owner_id)
    images = db.scalars(select(NoteImage).where(NoteImage.note_id == note_id).order_by(NoteImage.created_at, NoteImage.id)).all()
    return [_response(image) for image in images]


def upload_image(db: Session, note_id: int, owner_id: UUID, file: UploadFile, alt_text: str | None) -> NoteImageResponse:
    notes.get_note(db, note_id, owner_id)
    current_count = db.scalar(select(func.count(NoteImage.id)).where(NoteImage.note_id == note_id)) or 0
    if current_count >= MAX_IMAGES_PER_NOTE:
        raise HTTPException(status_code=409, detail=f"A note can have up to {MAX_IMAGES_PER_NOTE} images")
    data = file.file.read(MAX_IMAGE_BYTES + 1)
    content_type = validate_image(data, file.content_type)
    filename = safe_filename(file.filename)
    extension = ALLOWED_TYPES[content_type][0]
    storage_path = f"{owner_id}/{note_id}/{uuid4().hex}.{extension}"
    storage.upload_object(storage_path, data, content_type)
    image = NoteImage(
        note_id=note_id, filename=filename, content_type=content_type,
        size_bytes=len(data), storage_path=storage_path,
        alt_text=(alt_text or "").strip()[:500] or None,
    )
    try:
        db.add(image)
        db.commit()
        db.refresh(image)
    except SQLAlchemyError as exc:
        db.rollback()
        try:
            storage.delete_object(storage_path)
        except HTTPException:
            pass
        raise HTTPException(status_code=503, detail="Could not save image details") from exc
    return _response(image)


def delete_image(db: Session, note_id: int, image_id: int, owner_id: UUID) -> None:
    notes.get_note(db, note_id, owner_id)
    image = db.scalar(select(NoteImage).where(NoteImage.note_id == note_id, NoteImage.id == image_id))
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    storage.delete_object(image.storage_path)
    db.delete(image)
    db.commit()

import pytest
from fastapi import HTTPException

from app.services.note_images import MAX_IMAGE_BYTES, safe_filename, validate_image


@pytest.mark.parametrize(("content_type", "data"), [
    ("image/jpeg", b"\xff\xd8\xffrest"),
    ("image/png", b"\x89PNG\r\n\x1a\nrest"),
    ("image/webp", b"RIFFxxxxWEBPrest"),
])
def test_valid_image_signatures(content_type, data):
    assert validate_image(data, content_type) == content_type


@pytest.mark.parametrize(("data", "content_type", "status"), [
    pytest.param(b"", "image/png", 400, id="empty"),
    pytest.param(b"not an image", "image/png", 415, id="bad-signature"),
    pytest.param(b"\xff\xd8\xffrest", "image/svg+xml", 415, id="unsupported-type"),
    pytest.param(None, "image/png", 413, id="too-large"),
])
def test_invalid_image_rejected(data, content_type, status):
    if data is None:
        data = b"\x89PNG\r\n\x1a\n" + b"x" * MAX_IMAGE_BYTES
    with pytest.raises(HTTPException) as error:
        validate_image(data, content_type)
    assert error.value.status_code == status


def test_filename_is_reduced_to_safe_basename():
    assert safe_filename("../../diagram\n.png") == "diagram.png"

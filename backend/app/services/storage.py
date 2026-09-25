from urllib.parse import quote

import httpx
from fastapi import HTTPException

from app.core.config import get_settings


def _config() -> tuple[str, str, str]:
    settings = get_settings()
    base = settings.supabase_url.rstrip("/")
    key = settings.supabase_service_role_key.get_secret_value()
    bucket = settings.supabase_storage_bucket.strip()
    if not base or not key or not bucket:
        raise HTTPException(status_code=503, detail="Image storage is not configured on the API")
    return base, key, bucket


def _headers(key: str) -> dict[str, str]:
    return {"apikey": key, "Authorization": f"Bearer {key}"}


def _raise_storage_error(response: httpx.Response) -> None:
    if not response.is_success:
        raise HTTPException(status_code=502, detail="Supabase image storage request failed")


def upload_object(path: str, data: bytes, content_type: str) -> None:
    base, key, bucket = _config()
    url = f"{base}/storage/v1/object/{quote(bucket, safe='')}/{quote(path, safe='/')}"
    try:
        with httpx.Client(timeout=20) as client:
            response = client.post(url, headers={**_headers(key), "Content-Type": content_type, "x-upsert": "false"}, content=data)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not reach image storage") from exc
    _raise_storage_error(response)


def delete_object(path: str) -> None:
    base, key, bucket = _config()
    try:
        with httpx.Client(timeout=20) as client:
            response = client.request(
                "DELETE", f"{base}/storage/v1/object/{quote(bucket, safe='')}",
                headers={**_headers(key), "Content-Type": "application/json"}, json={"prefixes": [path]},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not reach image storage") from exc
    _raise_storage_error(response)


def create_signed_url(path: str, expires_in: int = 3600) -> str:
    base, key, bucket = _config()
    url = f"{base}/storage/v1/object/sign/{quote(bucket, safe='')}/{quote(path, safe='/')}"
    try:
        with httpx.Client(timeout=15) as client:
            response = client.post(url, headers={**_headers(key), "Content-Type": "application/json"}, json={"expiresIn": expires_in})
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not reach image storage") from exc
    _raise_storage_error(response)
    signed_path = response.json().get("signedURL") or response.json().get("signedUrl")
    if not isinstance(signed_path, str):
        raise HTTPException(status_code=502, detail="Image storage returned an invalid link")
    if signed_path.startswith("http://") or signed_path.startswith("https://"):
        return signed_path
    return f"{base}/storage/v1{signed_path if signed_path.startswith('/') else '/' + signed_path}"

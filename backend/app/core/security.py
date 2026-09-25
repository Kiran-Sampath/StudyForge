from typing import Annotated
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> UUID:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to continue")

    settings = get_settings()
    base_url = settings.supabase_url.rstrip("/")
    anon_key = settings.supabase_anon_key.get_secret_value()
    if not base_url or not anon_key:
        raise HTTPException(status_code=503, detail="Authentication is not configured on the API")

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(
                f"{base_url}/auth/v1/user",
                headers={"apikey": anon_key, "Authorization": f"Bearer {credentials.credentials}"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Could not verify your session") from exc

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Your session has expired. Sign in again.")
    if response.status_code != 200:
        raise HTTPException(status_code=503, detail="Could not verify your session")
    try:
        return UUID(response.json()["id"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid user session") from exc


CurrentUser = Annotated[UUID, Depends(get_current_user)]

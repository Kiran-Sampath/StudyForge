from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    db_host: str = Field(min_length=1)
    db_port: int = Field(default=5432, ge=1, le=65535)
    db_name: str = "postgres"
    db_user: str = Field(min_length=1)
    db_password: SecretStr
    db_sslmode: Literal["disable", "require", "verify-ca", "verify-full"] = "require"

    @property
    def database_url(self) -> URL:
        # URL.create handles passwords containing @, %, /, and other URL characters.
        return URL.create(
            "postgresql+psycopg",
            username=self.db_user,
            password=self.db_password.get_secret_value(),
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
            query={"sslmode": self.db_sslmode, "connect_timeout": "10"},
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()

from pydantic_settings import BaseSettings
from celery import Celery


class Settings(BaseSettings):
    redis_url: str = "redis://redis:6379/0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

celery_app = Celery(
    "roof", broker=settings.redis_url, backend=settings.redis_url
)

celery_app.conf.update(
    broker_connection_retry_on_startup=True,
    task_acks_late=True,
)

@celery_app.task
def ping() -> str:
    return "pong"




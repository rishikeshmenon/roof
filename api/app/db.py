from typing import Generator
import time

from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine

from app.config import settings
from app.models import Base


engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def init_database(max_attempts: int = 20, delay_seconds: float = 1.0) -> None:
    attempt = 0
    last_error: Exception | None = None
    while attempt < max_attempts:
        try:
            with engine.begin() as connection:
                try:
                    connection.execute(text("SELECT 1"))
                except Exception:
                    pass
                try:
                    connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
                except Exception:
                    # Extension may not be allowed by default; continue
                    pass
            break
        except Exception as exc:  # pragma: no cover
            last_error = exc
            time.sleep(delay_seconds)
            attempt += 1

    if last_error and attempt >= max_attempts:
        # Give up but do not raise to keep API starting; endpoints may still fail until DB comes up
        return

    if settings.auto_create_tables:
        try:
            Base.metadata.create_all(bind=engine)
        except Exception:
            # Ignore auto-create errors in startup; health endpoint will still surface DB readiness
            pass
    # Ensure new columns exist for evolving schema
    try:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE listings ADD COLUMN IF NOT EXISTS attributes JSONB"))
    except Exception:
        pass


def get_db() -> Generator[Session, None, None]:
    session: Session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()



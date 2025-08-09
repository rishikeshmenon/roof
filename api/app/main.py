from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import threading

from app.db import get_db, init_database
from app.opensearch_client import get_opensearch_client, ensure_index
from app.routers import listings as listings_router
from app.db import SessionLocal
from app.seed import seed_if_empty


app = FastAPI(title="Roof API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _background_bootstrap() -> None:
    init_database()
    try:
        ensure_index(
            index_name="listings",
            mappings={
                "properties": {
                    "title": {"type": "text"},
                    "description": {"type": "text"},
                    "price_cents": {"type": "long"},
                    "bedrooms": {"type": "integer"},
                    "bathrooms": {"type": "float"},
                    "furnished": {"type": "boolean"},
                    "pets_allowed": {"type": "boolean"},
                    "lease_term": {"type": "keyword"},
                    "posted_at": {"type": "date"},
                    "location": {"type": "geo_point"},
                }
            },
        )
    except Exception:
        pass
    # seed
    try:
        with SessionLocal() as session:
            seed_if_empty(session)
    except Exception:
        pass


@app.on_event("startup")
def on_startup() -> None:
    threading.Thread(target=_background_bootstrap, daemon=True).start()


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    # Pings OpenSearch
    try:
        client = get_opensearch_client()
        client.info()
        search_ok = True
    except Exception:
        search_ok = False

    return {
        "status": "ok",
        "database": "ok",
        "opensearch": "ok" if search_ok else "error",
    }


app.include_router(listings_router.router, prefix="/api", tags=["listings"])



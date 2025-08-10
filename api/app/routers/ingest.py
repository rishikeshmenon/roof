from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.db import get_db
from app.models import RawPayload, Listing
from app.schemas import IngestRequest, IngestResponse
from app.tasks import process_raw_payload


router = APIRouter()


def naive_extract_from_marketplace(payload: IngestRequest) -> dict:
    # Placeholder for AI extraction. For now, return minimal fields.
    title = "Imported listing"
    price_cents = 100000
    bedrooms = None
    bathrooms = None
    return {
        "source": "marketplace",
        "source_id": payload.source_url,
        "title": title,
        "description": None,
        "price_cents": price_cents,
        "currency": "CAD",
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "furnished": None,
        "pets_allowed": None,
        "lease_term": None,
        "raw_address": None,
        "latitude": None,
        "longitude": None,
        "posted_at": datetime.utcnow(),
    }


@router.post("/ingest", response_model=IngestResponse)
def ingest(payload: IngestRequest, db: Session = Depends(get_db)) -> IngestResponse:
    raw = RawPayload(
        source=payload.source,
        url=payload.source_url,
        payload={
            "raw_html": payload.raw_html,
            "raw_json": payload.raw_json,
            "raw_text": payload.raw_text,
        },
    )
    db.add(raw)
    db.flush()
    process_raw_payload.delay(raw.id)
    db.commit()
    return IngestResponse(created_listing_id=None, status="queued")


@router.get("/ingest/raw/recent")
def recent_raw_payloads(limit: int = 5, db: Session = Depends(get_db)) -> list[dict]:
    rows = (
        db.query(RawPayload)
        .order_by(RawPayload.id.desc())
        .limit(max(1, min(limit, 50)))
        .all()
    )
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat(),
            "source": r.source,
            "url": r.url,
            "payload": r.payload,
        }
        for r in rows
    ]


@router.get("/ingest/raw/{payload_id}")
def get_raw_payload(payload_id: int, db: Session = Depends(get_db)) -> dict:
    r = db.get(RawPayload, payload_id)
    if not r:
        return {"error": "not_found"}
    return {
        "id": r.id,
        "created_at": r.created_at.isoformat(),
        "source": r.source,
        "url": r.url,
        "payload": r.payload,
    }



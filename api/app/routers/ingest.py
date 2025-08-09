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
        payload={"raw_html": payload.raw_html, "raw_json": payload.raw_json},
    )
    db.add(raw)
    db.flush()
    process_raw_payload.delay(raw.id)
    db.commit()
    return IngestResponse(created_listing_id=None, status="queued")



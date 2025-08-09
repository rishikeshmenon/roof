from datetime import datetime
import hashlib
from typing import Any, Dict

import httpx
from openai import OpenAI
from celery import Celery
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import RawPayload, Listing, ListingImage, Campus


celery_app = Celery(
    "roof-api",
    broker=settings.redis_url,
    backend=settings.redis_url,
)


def _normalize_price_cents(price: str | int | None) -> int | None:
    if price is None:
        return None
    if isinstance(price, int):
        return price
    digits = ''.join(ch for ch in price if ch.isdigit())
    if not digits:
        return None
    return int(digits) * 100 if len(digits) <= 5 else int(digits)


def _dedup_key(source: str, title: str | None, price_cents: int | None, first_image: str | None) -> str:
    base = f"{source}|{(title or '').strip().lower()}|{price_cents or ''}|{first_image or ''}"
    return hashlib.sha1(base.encode()).hexdigest()


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import radians, sin, cos, sqrt, atan2
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


def _nearest_campus(db: Session, lat: float, lng: float) -> tuple[str | None, float | None]:
    campuses = db.execute(select(Campus)).scalars().all()
    if not campuses:
        return None, None
    best_name, best_dist = None, None
    for c in campuses:
        d = _haversine_km(lat, lng, c.latitude, c.longitude)
        if best_dist is None or d < best_dist:
            best_name, best_dist = c.name, d
    return best_name, best_dist


def _geocode(address: str) -> tuple[float | None, float | None]:
    # Use Nominatim (for local dev). Respect usage policies in production.
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": address, "format": "json", "limit": 1}
        with httpx.Client(timeout=5.0, headers={"User-Agent": "roof-dev"}) as client:
            r = client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None, None


@celery_app.task
def process_raw_payload(payload_id: int) -> dict:
    with SessionLocal() as db:
        raw = db.get(RawPayload, payload_id)
        if not raw:
            return {"status": "not_found"}

        url = raw.url or ""
        title = "Imported listing"
        desc = None
        price_cents = _normalize_price_cents(None)
        images: list[str] = []
        address = None

        # Try AI extraction first if API key provided
        if settings.openai_api_key:
            try:
                client = OpenAI(api_key=settings.openai_api_key)
                pj = raw.payload or {}
                raw_json = pj.get("raw_json") if isinstance(pj, dict) else None
                raw_html = pj.get("raw_html") if isinstance(pj, dict) else None
                prompt = (
                    "Extract structured listing details as JSON with fields: "
                    "title, description, price (original string), currency (3-letter), bedrooms (int or null), "
                    "bathrooms (float or null), furnished (bool or null), pets_allowed (bool or null), "
                    "lease_term (string or null), address (string or null), images (array of URLs). "
                    "Do not include extraneous fields."
                )
                content = (
                    f"URL: {url}\n" +
                    (f"RAW_JSON: {raw_json}\n" if raw_json else "") +
                    (f"RAW_HTML (truncated): {str(raw_html)[:5000]}\n" if raw_html else "")
                )
                completion = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": content},
                    ],
                    temperature=0.1,
                )
                text = completion.choices[0].message.content or "{}"
                import json
                data = json.loads(text)
                title = data.get("title") or title
                desc = data.get("description") or desc
                price_cents = _normalize_price_cents(data.get("price")) or price_cents
                address = data.get("address") or address
                images = data.get("images") or images
            except Exception:
                # fallback to heuristics
                pass

        # Minimal heuristics from raw payload as fallback/augmentation
        pj = raw.payload or {}
        if isinstance(pj, dict):
            if pj.get("raw_json") and isinstance(pj["raw_json"], dict):
                j = pj["raw_json"]
                title = j.get("title") or title
                desc = j.get("description") or desc
                price_cents = _normalize_price_cents(j.get("price")) or price_cents
                images = j.get("images") or images
                address = j.get("address") or address

        lat, lng = (None, None)
        if address:
            lat, lng = _geocode(address)

        # Dedup by simple key
        first_image = images[0] if images else None
        key = _dedup_key("marketplace", title, price_cents, first_image)

        listing = Listing(
            source="marketplace",
            source_id=url,
            title=title,
            description=desc,
            price_cents=price_cents or 0,
            currency="CAD",
            raw_address=address,
            latitude=lat,
            longitude=lng,
            posted_at=datetime.utcnow(),
            dedup_key=key,
        )
        db.add(listing)
        db.flush()

        for idx, u in enumerate(images[:8]):
            db.add(ListingImage(listing_id=listing.id, url=u, order_index=idx))

        db.commit()

        # campus tagging (optional, read results only)
        campus_name, dist_km = (None, None)
        if lat is not None and lng is not None:
            campus_name, dist_km = _nearest_campus(db, lat, lng)

        return {"status": "ok", "listing_id": listing.id, "campus": campus_name, "distance_km": dist_km}



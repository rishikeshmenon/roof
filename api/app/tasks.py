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
        bedrooms_val = None
        bathrooms_val = None
        furnished_val = None
        pets_val = None
        lease_term_val = None
        if settings.openai_api_key:
            try:
                client = OpenAI(api_key=settings.openai_api_key)
                pj = raw.payload or {}
                raw_json = pj.get("raw_json") if isinstance(pj, dict) else None
                raw_html = pj.get("raw_html") if isinstance(pj, dict) else None
                raw_text = pj.get("raw_text") if isinstance(pj, dict) else None
                prompt = (
                    "You are a strict information extractor for rental listings. "
                    "Return ONLY compact JSON with keys: title, description, price, currency, bedrooms, bathrooms, "
                    "furnished, pets_allowed, lease_term, address, images. Rules: "
                    "- bedrooms: integer or null. bathrooms: float or null. "
                    "- furnished and pets_allowed: booleans or null. currency: 3-letter or null. "
                    "- images: array of absolute URLs. If unknown, set null."
                )
                content = (
                    f"URL: {url}\n" +
                    (f"RAW_JSON: {raw_json}\n" if raw_json else "") +
                    (f"RAW_TEXT (truncated): {str(raw_text)[:8000]}\n" if raw_text else "") +
                    (f"RAW_HTML (truncated): {str(raw_html)[:2000]}\n" if raw_html else "")
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
                # typed fields
                try:
                    b = data.get("bedrooms")
                    bedrooms_val = int(b) if b is not None else None
                except Exception:
                    bedrooms_val = None
                try:
                    ba = data.get("bathrooms")
                    bathrooms_val = float(ba) if ba is not None and str(ba) != "" else None
                except Exception:
                    bathrooms_val = None
                furnished_val = data.get("furnished") if isinstance(data.get("furnished"), bool) else None
                pets_val = data.get("pets_allowed") if isinstance(data.get("pets_allowed"), bool) else None
                lease_term_val = data.get("lease_term") if isinstance(data.get("lease_term"), str) else None
            except Exception:
                # fallback to heuristics
                pass

        # Minimal heuristics from raw payload as fallback/augmentation
        pj = raw.payload or {}
        if isinstance(pj, dict):
            if pj.get("raw_json") and isinstance(pj["raw_json"], dict):
                j = pj["raw_json"]
                title = j.get("title") or title
                # Prefer explicit description_text > meta description > fallback
                desc = j.get("description_text") or j.get("description_meta") or j.get("description") or desc
                price_cents = _normalize_price_cents(j.get("price")) or price_cents
                # Merge image candidates (DOM imgs + og:image)
                imgs = []
                for arr in (j.get("images") or [], j.get("images_meta") or []):
                    for u in arr:
                        if isinstance(u, str) and u.startswith("http") and u not in imgs:
                            imgs.append(u)
                if imgs:
                    images = imgs
                # Prefer explicit location_text if it looks like an address
                address = j.get("address") or j.get("location_text") or address
                # Capture canonical/original URL if present
                if j.get("canonical_url"):
                    url = j.get("canonical_url")

            # Heuristic typed field extraction from raw_text as a fallback
            rt = pj.get("raw_text") if isinstance(pj, dict) else None
            if isinstance(rt, str) and rt:
                import re
                # bedrooms: look for '2 bed', '2br', '2 bd', '2 bedrooms'
                if bedrooms_val is None:
                    m = re.search(r"(\d+)\s*(?:bedrooms?|beds?|br|bd)\b", rt, flags=re.IGNORECASE)
                    if m:
                        try:
                            bedrooms_val = int(m.group(1))
                        except Exception:
                            pass
                # bathrooms: '1.5 bath', '2 ba', '2 bathrooms'
                if bathrooms_val is None:
                    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:bath(?:rooms?)?|ba)\b", rt, flags=re.IGNORECASE)
                    if m:
                        try:
                            bathrooms_val = float(m.group(1))
                        except Exception:
                            pass
                # furnished/unfurnished
                if furnished_val is None:
                    if re.search(r"\bunfurnished\b", rt, flags=re.IGNORECASE):
                        furnished_val = False
                    elif re.search(r"\bfurnished\b", rt, flags=re.IGNORECASE):
                        furnished_val = True
                # pets allowed
                if pets_val is None:
                    if re.search(r"\b(no\s+pets|pets\s*not\s*allowed)\b", rt, flags=re.IGNORECASE):
                        pets_val = False
                    elif re.search(r"\b(pets\s*ok|pet\s*friendly|pets\s*allowed|cats\s*ok|dogs\s*ok)\b", rt, flags=re.IGNORECASE):
                        pets_val = True
                # lease term: try to pull '12 month', '1 year', 'month-to-month'
                if lease_term_val is None:
                    m = re.search(r"(\d+\s*(?:month|months|year|years)|month-?to-?month)", rt, flags=re.IGNORECASE)
                    if m:
                        lease_term_val = m.group(1)

        lat, lng = (None, None)
        if address:
            lat, lng = _geocode(address)

        # Dedup by simple key
        first_image = images[0] if images else None
        key = _dedup_key("marketplace", title, price_cents, first_image)

        # capture additional attributes blob for anything extra LLM extracts
        # Preserve additional extracted attributes if present
        extra_attrs = {}
        try:
            if settings.openai_api_key and 'data' in locals() and isinstance(data, dict):
                for k in ("unit_size", "utilities_included", "parking", "laundry", "floor", "building_type"):
                    if data.get(k) is not None:
                        extra_attrs[k] = data.get(k)
        except Exception:
            pass

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
            bedrooms=bedrooms_val,
            bathrooms=bathrooms_val,
            furnished=furnished_val,
            pets_allowed=pets_val,
            lease_term=lease_term_val,
            attributes=extra_attrs or None,
        )
        db.add(listing)
        db.flush()

        # Always attach the current images for this listing; clear old ones if reprocessing same source_id
        db.query(ListingImage).filter(ListingImage.listing_id == listing.id).delete()
        for idx, u in enumerate(images[:12]):
            db.add(ListingImage(listing_id=listing.id, url=u, order_index=idx))

        db.commit()

        # campus tagging (optional, read results only)
        campus_name, dist_km = (None, None)
        if lat is not None and lng is not None:
            campus_name, dist_km = _nearest_campus(db, lat, lng)

        return {"status": "ok", "listing_id": listing.id, "campus": campus_name, "distance_km": dist_km}



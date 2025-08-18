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
        ai_desc = None
        availability_val = None
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
                    "You are an expert rental listing analyzer. Analyze ALL the provided raw data comprehensively. "
                    "IMPORTANT: Use ALL available data sources (raw_text, raw_html, raw_json) to reconstruct complete information. "
                    "If description appears truncated (ends with '...', 'See more', etc.), use context from raw_text and raw_html to reconstruct the full description. "
                    "\n\nYou MUST return ONLY a valid JSON object (no other text) with these exact keys:\n"
                    "{\n"
                    "  \"title\": \"clean, descriptive title\",\n"
                    "  \"description\": \"original description from listing\",\n"
                    "  \"ai_description\": \"YOUR comprehensive analysis combining all available information about the rental unit, including features, location details, amenities, condition, and insights\",\n"
                    "  \"price\": \"1500\",\n"
                    "  \"currency\": \"CAD\",\n"
                    "  \"bedrooms\": 2,\n"
                    "  \"bathrooms\": 1.5,\n"
                    "  \"furnished\": true,\n"
                    "  \"pets_allowed\": false,\n"
                    "  \"lease_term\": \"12 months\",\n"
                    "  \"address\": \"full address or location\",\n"
                    "  \"availability\": \"availability information\",\n"
                    "  \"images\": [\"array\", \"of\", \"image\", \"URLs\"]\n"
                    "}\n\n"
                    "CRITICAL: Return ONLY the JSON object. No explanations, no markdown, no additional text."
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
                print(f"OpenAI Response: {text[:500]}...")
                
                # Try to extract JSON from the response
                import json
                import re
                
                # Look for JSON in the response
                json_match = re.search(r'\{.*\}', text, re.DOTALL)
                if json_match:
                    json_text = json_match.group(0)
                else:
                    json_text = text
                
                try:
                    data = json.loads(json_text)
                except json.JSONDecodeError:
                    print(f"Failed to parse JSON: {json_text[:200]}...")
                    data = {}
                # 1. TITLE: Use original extension title, fallback to AI if bad
                ai_title = data.get("title")
                
                # Check if extension title is good (not UI text)
                extension_title_is_good = (
                    title and 
                    len(title) > 5 and 
                    not any(word in title.lower() for word in ['notification', 'unread', 'facebook', 'marketplace', 'menu', 'message', 'imported'])
                )
                
                if extension_title_is_good:
                    # Use the original extension title
                    print(f"✅ Using extension title: {title}")
                elif ai_title and len(ai_title) > 10:
                    # Fallback to AI title if extension title is bad
                    title = ai_title
                    print(f"🤖 Using AI title (extension title was bad): {title}")
                else:
                    # Final fallback
                    title = "Property Listing"
                    print(f"⚠️ Using generic fallback title: {title}")
                
                # 2. DESCRIPTION: Use ORIGINAL extension description, not AI description
                original_desc = raw_json.get("description_text", "").strip()
                if original_desc and len(original_desc) > 20:
                    desc = original_desc  # Use the original Facebook description
                    print(f"✅ Using original description ({len(desc)} chars)")
                else:
                    # Fallback to current description if no original found
                    print(f"⚠️ No good original description, using current ({len(desc)} chars)")
                
                # 3. AI ANALYSIS: Keep as separate field
                ai_desc = data.get("ai_description")
                availability_val = data.get("availability")
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
            except Exception as e:
                # Log the error for debugging
                print(f"OpenAI API Error: {str(e)}")
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
                # Merge all image candidates (DOM imgs + og:image + background + all_images)
                imgs = []
                image_sources = [
                    j.get("images") or [],
                    j.get("images_meta") or [],
                    j.get("background_images") or [],
                    j.get("all_images") or []
                ]
                
                for arr in image_sources:
                    if isinstance(arr, list):
                        for u in arr:
                            if isinstance(u, str) and u.startswith("http") and u not in imgs:
                                # Clean up image URLs
                                clean_url = u.split('?')[0]  # Remove query params
                                if clean_url not in imgs and any(ext in clean_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                                    imgs.append(clean_url)
                
                if imgs:
                    images = imgs[:12]  # Limit to 12 images
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
            ai_description=ai_desc,
            price_cents=price_cents or 0,
            currency="CAD",
            raw_address=address,
            availability=availability_val,
            original_url=url,
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



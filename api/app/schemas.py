from datetime import datetime
from pydantic import BaseModel


class ListingBase(BaseModel):
    source: str
    source_id: str
    title: str
    description: str | None = None
    price_cents: int
    currency: str = "CAD"
    bedrooms: int | None = None
    bathrooms: float | None = None
    furnished: bool | None = None
    pets_allowed: bool | None = None
    lease_term: str | None = None
    raw_address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    posted_at: datetime | None = None


class ListingCreate(ListingBase):
    pass


class Listing(ListingBase):
    id: int
    collected_at: datetime
    status: str
    dedup_key: str | None = None
    spam_score: float | None = None
    attributes: dict | None = None

    class Config:
        from_attributes = True


class ListingImage(BaseModel):
    id: int
    url: str
    checksum: str | None = None
    width: int | None = None
    height: int | None = None
    order_index: int = 0

    class Config:
        from_attributes = True


class ListingDetail(Listing):
    images: list[ListingImage] = []


class IngestRequest(BaseModel):
    source_url: str
    source: str = "marketplace"
    raw_html: str | None = None
    raw_json: dict | None = None
    raw_text: str | None = None


class IngestResponse(BaseModel):
    created_listing_id: int | None = None
    status: str
    reason: str | None = None




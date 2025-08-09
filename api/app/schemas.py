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

    class Config:
        from_attributes = True




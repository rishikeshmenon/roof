from typing import Iterable, Sequence
from sqlalchemy.orm import Session
from sqlalchemy import select

from app import models
from app.schemas import ListingCreate


def create_listing(db: Session, data: ListingCreate) -> models.Listing:
    listing = models.Listing(**data.model_dict(exclude_none=True))
    db.add(listing)
    db.flush()
    return listing


def list_listings(
    db: Session,
    *,
    limit: int = 20,
    offset: int = 0,
    min_price: int | None = None,
    max_price: int | None = None,
    bedrooms: int | None = None,
    furnished: bool | None = None,
) -> Sequence[models.Listing]:
    stmt = select(models.Listing)
    if min_price is not None:
        stmt = stmt.where(models.Listing.price_cents >= min_price)
    if max_price is not None:
        stmt = stmt.where(models.Listing.price_cents <= max_price)
    if bedrooms is not None:
        stmt = stmt.where(models.Listing.bedrooms == bedrooms)
    if furnished is not None:
        stmt = stmt.where(models.Listing.furnished == furnished)
    stmt = stmt.order_by(models.Listing.collected_at.desc()).limit(limit).offset(offset)
    return db.execute(stmt).scalars().all()




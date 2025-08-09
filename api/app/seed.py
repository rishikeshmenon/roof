from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.models import Listing, ListingImage


def seed_if_empty(db: Session) -> None:
    count = db.query(func.count(Listing.id)).scalar() or 0
    if count and count > 0:
        return

    base_time = datetime.utcnow()
    sample = [
        Listing(
            source="seed",
            source_id=f"seed-{i}",
            title=f"Sunny {i}-bed near campus",
            description="Cozy place close to transit and shops.",
            price_cents=90000 + i * 5000,
            currency="CAD",
            bedrooms=i % 4,
            bathrooms=1.0 + (i % 2) * 0.5,
            furnished=bool(i % 2),
            pets_allowed=bool((i + 1) % 2),
            lease_term="12 months",
            raw_address="123 College St",
            latitude=43.6629 + i * 0.001,
            longitude=-79.3957 - i * 0.001,
            posted_at=base_time - timedelta(days=i),
        )
        for i in range(1, 16)
    ]
    db.add_all(sample)
    db.flush()
    # Attach a couple of images to first few listings
    for i, listing in enumerate(sample[:6], start=1):
        img1 = ListingImage(
            listing_id=listing.id,
            url=f"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=960&q=80&sig={i}",
            width=960,
            height=640,
            order_index=0,
        )
        img2 = ListingImage(
            listing_id=listing.id,
            url=f"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=960&q=80&sig={i+100}",
            width=960,
            height=640,
            order_index=1,
        )
        db.add_all([img1, img2])
    db.commit()



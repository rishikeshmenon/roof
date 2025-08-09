from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.models import Listing


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
    db.commit()



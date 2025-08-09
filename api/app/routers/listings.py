from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import Listing, ListingCreate, ListingDetail
from app import crud
from app.models import Listing as ListingModel


router = APIRouter()


@router.post("/listings", response_model=Listing)
def create_listing(payload: ListingCreate, db: Session = Depends(get_db)) -> Listing:
    listing = crud.create_listing(db, payload)
    return Listing.model_validate(listing)


@router.get("/listings", response_model=list[Listing])
def get_listings(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    min_price: int | None = Query(None, ge=0),
    max_price: int | None = Query(None, ge=0),
    bedrooms: int | None = Query(None, ge=0),
    furnished: bool | None = Query(None),
) -> list[Listing]:
    rows = crud.list_listings(
        db,
        limit=limit,
        offset=offset,
        min_price=min_price,
        max_price=max_price,
        bedrooms=bedrooms,
        furnished=furnished,
    )
    return [Listing.model_validate(r) for r in rows]


@router.get("/listings/{listing_id}", response_model=ListingDetail)
def get_listing(listing_id: int, db: Session = Depends(get_db)) -> ListingDetail:
    row = db.get(ListingModel, listing_id)
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")
    # Ensure images relationship is loaded
    _ = len(row.images)
    return ListingDetail.model_validate(row)




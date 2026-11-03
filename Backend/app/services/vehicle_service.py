"""Client vehicle registration."""
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data.vehicle_catalog import CATALOG
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate


def _in_catalog(data: VehicleCreate) -> bool:
    return data.model in CATALOG.get(data.category, {}).get(data.make, [])


def add_vehicle(db: Session, owner: User, data: VehicleCreate, commit: bool = True) -> Vehicle:
    existing = db.scalar(select(Vehicle).where(Vehicle.owner_id == owner.id,
                                               Vehicle.registration_number == data.registration_number))
    if existing and not existing.is_archived:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="This registration number is already on your account")
    if existing:  # previously removed: restore it with the details just entered
        existing.category, existing.make, existing.model = data.category, data.make, data.model
        existing.year, existing.is_custom, existing.is_archived = data.year, not _in_catalog(data), False
        db.commit() if commit else db.flush()
        db.refresh(existing)
        return existing
    vehicle = Vehicle(
        owner_id=owner.id, category=data.category, make=data.make, model=data.model,
        year=data.year, registration_number=data.registration_number,
        is_custom=not _in_catalog(data),
    )
    db.add(vehicle)
    if commit:
        db.commit()
        db.refresh(vehicle)
    else:
        db.flush()
    return vehicle


def list_vehicles(db: Session, owner: User) -> list[Vehicle]:
    return list(db.scalars(
        select(Vehicle).where(Vehicle.owner_id == owner.id, Vehicle.is_archived.is_(False))
        .order_by(Vehicle.id)
    ).all())


def get_owned_vehicle(db: Session, owner: User, vehicle_id: int) -> Vehicle:
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle or vehicle.owner_id != owner.id or vehicle.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle


def remove_vehicle(db: Session, owner: User, vehicle_id: int) -> None:
    """Remove a vehicle from the owner's list. Archived, not deleted, so claims keep it."""
    vehicle = get_owned_vehicle(db, owner, vehicle_id)
    vehicle.is_archived = True
    db.commit()

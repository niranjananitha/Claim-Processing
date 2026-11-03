"""Vehicle catalog (public) and the signed-in client's own vehicles."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.data.vehicle_catalog import CATALOG, CATEGORIES, OTHER
from app.database.connection import get_db
from app.dependencies.auth import require_role
from app.models.user import User
from app.schemas.vehicle import VehicleCreate, VehicleOut
from app.services import vehicle_service

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("/catalog")
def catalog():
    """Public so the sign-up page can use it before the user has an account."""
    return {
        "categories": [{"key": k, "label": v} for k, v in CATEGORIES.items()],
        "brands": CATALOG,
        "other_label": OTHER,
    }


@router.get("", response_model=list[VehicleOut])
def my_vehicles(user: User = Depends(require_role("client")), db: Session = Depends(get_db)):
    return vehicle_service.list_vehicles(db, user)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_vehicle(vehicle_id: int, user: User = Depends(require_role("client")),
                   db: Session = Depends(get_db)):
    vehicle_service.remove_vehicle(db, user, vehicle_id)


@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def add_vehicle(payload: VehicleCreate, user: User = Depends(require_role("client")),
                db: Session = Depends(get_db)):
    return vehicle_service.add_vehicle(db, user, payload)

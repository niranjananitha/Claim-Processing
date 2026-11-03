import datetime as dt

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utcnow
from app.database.base import Base

VEHICLE_CATEGORIES = ("two_wheeler", "four_wheeler", "cargo_truck")


class Vehicle(Base):
    """A vehicle owned by a client (policyholder)."""

    __tablename__ = "vehicles"
    __table_args__ = (
        UniqueConstraint("owner_id", "registration_number", name="uq_vehicle_owner_reg"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    make: Mapped[str] = mapped_column(String(60), nullable=False)
    model: Mapped[str] = mapped_column(String(60), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    registration_number: Mapped[str] = mapped_column(String(20), nullable=False)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # "Deleted" by the owner. Kept (not removed) because past claims reference it.
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    owner = relationship("User", back_populates="vehicles")

    @property
    def label(self) -> str:
        return f"{self.year} {self.make} {self.model} ({self.registration_number})"

import datetime as dt

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utcnow
from app.database.base import Base


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    claim_ref: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)

    policy_id: Mapped[int | None] = mapped_column(ForeignKey("policies.id"), nullable=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    assigned_agent_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )

    policy_holder: Mapped[str] = mapped_column(String(120), default="")
    incident_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    incident_time: Mapped[dt.time | None] = mapped_column(Time, nullable=True)
    filed_date: Mapped[dt.date] = mapped_column(Date, default=dt.date.today, nullable=False)
    incident_type: Mapped[str] = mapped_column(String(80), default="")
    collision_type: Mapped[str] = mapped_column(String(80), default="")
    severity: Mapped[str] = mapped_column(String(60), default="")
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), nullable=True)
    vehicle_category: Mapped[str] = mapped_column(String(20), default="")
    vehicle: Mapped[str] = mapped_column(String(120), default="")
    auto_make: Mapped[str] = mapped_column(String(60), default="")
    auto_model: Mapped[str] = mapped_column(String(60), default="")
    auto_year: Mapped[str] = mapped_column(String(8), default="")

    damage_estimate: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    vehicle_claim: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    injury_claim: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    property_claim: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    status: Mapped[str] = mapped_column(String(40), default="Submitted", index=True)
    status_note: Mapped[str] = mapped_column(String(1000), default="")

    incident_location: Mapped[str] = mapped_column(String(255), default="")
    incident_description: Mapped[str] = mapped_column(Text, default="")
    damaged_areas: Mapped[str] = mapped_column(String(500), default="")
    police_report_number: Mapped[str] = mapped_column(String(60), default="")
    police_report: Mapped[bool] = mapped_column(Boolean, default=False)
    authorities_contacted: Mapped[str] = mapped_column(String(40), default="None")
    witnesses: Mapped[int] = mapped_column(Integer, default=0)
    state: Mapped[str] = mapped_column(String(8), default="")
    city: Mapped[str] = mapped_column(String(80), default="")

    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    client = relationship("User", back_populates="claims", foreign_keys=[client_id])
    assigned_agent = relationship("User", foreign_keys=[assigned_agent_id])
    policy = relationship("Policy", back_populates="claims")
    vehicle_rel = relationship("Vehicle")

    @property
    def policy_number(self) -> str | None:
        return self.policy.policy_number if self.policy else None

    @property
    def assigned_agent_name(self) -> str | None:
        return self.assigned_agent.name if self.assigned_agent else None
    documents = relationship(
        "ClaimDocument", back_populates="claim", cascade="all, delete-orphan"
    )
    status_history = relationship(
        "ClaimStatusHistory",
        back_populates="claim",
        cascade="all, delete-orphan",
        order_by="ClaimStatusHistory.id",
    )
    predictions = relationship(
        "MLPrediction", back_populates="claim", cascade="all, delete-orphan"
    )

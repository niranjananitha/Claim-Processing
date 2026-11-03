import datetime as dt

from pydantic import BaseModel, ConfigDict


class ClaimCreate(BaseModel):
    policy_number: str | None = None
    incident_date: dt.date | None = None
    incident_type: str = ""
    collision_type: str = ""
    severity: str = ""
    vehicle: str = ""
    auto_make: str = ""
    auto_model: str = ""
    auto_year: str = ""
    damage_estimate: float = 0
    vehicle_claim: float = 0
    injury_claim: float = 0
    property_claim: float = 0
    police_report: bool = False
    authorities_contacted: str = "None"
    witnesses: int = 0
    state: str = ""
    city: str = ""


class StatusChange(BaseModel):
    to_status: str
    reason: str = ""


class ClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    claim_ref: str
    policy_id: int | None
    client_id: int
    assigned_agent_id: int | None
    policy_holder: str
    incident_date: dt.date | None
    filed_date: dt.date
    incident_type: str
    collision_type: str
    severity: str
    vehicle: str
    auto_make: str
    auto_model: str
    auto_year: str
    damage_estimate: float
    vehicle_claim: float
    injury_claim: float
    property_claim: float
    status: str
    status_note: str
    police_report: bool
    authorities_contacted: str
    witnesses: int
    state: str
    city: str


class StatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_status: str | None
    to_status: str
    actor_id: int | None
    reason: str
    created_at: dt.datetime

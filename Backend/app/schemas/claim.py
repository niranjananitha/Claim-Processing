import datetime as dt

from pydantic import BaseModel, ConfigDict, Field


class ClaimCreate(BaseModel):
    policy_number: str | None = None
    vehicle_id: int
    incident_date: dt.date | None = None
    incident_time: dt.time | None = None
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
    incident_location: str = Field(default="", max_length=255)
    incident_description: str = Field(default="", max_length=5000)
    damaged_areas: str = Field(default="", max_length=500)
    police_report_number: str = Field(default="", max_length=60)
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
    assigned_agent_name: str | None = None
    policy_number: str | None = None
    policy_holder: str
    incident_date: dt.date | None
    incident_time: dt.time | None = None
    filed_date: dt.date
    created_at: dt.datetime | None = None
    vehicle_id: int | None = None
    vehicle_category: str = ""
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
    incident_location: str = ""
    incident_description: str = ""
    damaged_areas: str = ""
    police_report_number: str = ""
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

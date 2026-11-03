from pydantic import BaseModel, Field


class VerifyBody(BaseModel):
    notes: str = ""
    damage_approved: float | None = None


class ReasonBody(BaseModel):
    reason: str = Field(min_length=1)


class DecisionBody(BaseModel):
    reason: str = Field(min_length=1)
    approved_amount: float | None = None

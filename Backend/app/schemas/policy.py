from pydantic import BaseModel, ConfigDict


class PolicyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    policy_number: str
    holder_id: int
    coverage: str
    deductible: float
    annual_premium: float
    state: str
    status: str

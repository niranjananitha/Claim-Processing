from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserOut
from app.schemas.vehicle import VehicleCreate


class RegisterRequest(BaseModel):
    # No role field on purpose: public registration always creates a client.
    name: str
    email: EmailStr
    password: str = Field(min_length=8)
    policy_number: str | None = None
    vehicle: VehicleCreate

    model_config = {"extra": "ignore"}  # ignore any stray "role" the client sends


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

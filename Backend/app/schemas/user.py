from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    title: str | None = None

    # Convenience fields the frontend expects; populated by the route layer.
    policy_number: str | None = None
    avatar_text: str | None = None


def build_user_out(user) -> "UserOut":
    """Build a UserOut from an ORM User, deriving avatar initials and policy number."""
    initials = "".join(p[0] for p in user.name.split()[:2]).upper() or "US"
    policy_number = user.policies[0].policy_number if getattr(user, "policies", None) else None
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        title=user.title,
        policy_number=policy_number,
        avatar_text=initials,
    )


class UserUpdate(BaseModel):
    name: str | None = None
    title: str | None = None


class StaffCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)
    role: str  # must be agent or manager

    @field_validator("role")
    @classmethod
    def _role_must_be_staff(cls, v: str) -> str:
        if v not in ("agent", "manager"):
            raise ValueError("role must be 'agent' or 'manager'")
        return v

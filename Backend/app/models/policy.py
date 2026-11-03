from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    policy_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    holder_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    coverage: Mapped[str] = mapped_column(String(120), default="Comprehensive")
    deductible: Mapped[float] = mapped_column(Numeric(12, 2), default=500)
    annual_premium: Mapped[float] = mapped_column(Numeric(12, 2), default=1200)
    state: Mapped[str] = mapped_column(String(8), default="")
    status: Mapped[str] = mapped_column(String(32), default="active")

    holder = relationship("User", back_populates="policies")
    claims = relationship("Claim", back_populates="policy")

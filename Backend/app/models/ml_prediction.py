import datetime as dt

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utcnow
from app.database.base import Base


class MLPrediction(Base):
    __tablename__ = "ml_predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id"), nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(40), nullable=False)  # xgboost | mobilenet
    model_version: Mapped[str] = mapped_column(String(40), default="")
    model_status: Mapped[str] = mapped_column(String(20), default="AVAILABLE")  # AVAILABLE | OFFLINE
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    label: Mapped[str | None] = mapped_column(String(60), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    explanation_json: Mapped[str] = mapped_column(Text, default="")
    imputed_features_json: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)

    claim = relationship("Claim", back_populates="predictions")

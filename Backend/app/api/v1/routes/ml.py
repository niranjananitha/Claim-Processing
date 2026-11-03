"""ML decision-support routes (advisory only)."""
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.dependencies.auth import require_role
from app.models.ml_prediction import MLPrediction
from app.models.user import User
from app.schemas.ml import MLRiskResult, PredictRequest
from app.services import claim_service, ml_service

router = APIRouter(prefix="/ml", tags=["ml"])


@router.post("/predict", response_model=MLRiskResult)
def predict(payload: PredictRequest, user: User = Depends(require_role("agent", "manager")),
            db: Session = Depends(get_db)):
    claim = claim_service.get_claim(db, user, payload.claim_id)  # access-checked
    return ml_service.predict_fraud(db, claim)


@router.get("/predictions/{prediction_id}")
def get_prediction(prediction_id: int,
                   user: User = Depends(require_role("agent", "manager")),
                   db: Session = Depends(get_db)):
    pred = db.get(MLPrediction, prediction_id)
    if not pred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")
    # Ensure the caller may see the underlying claim.
    claim_service.get_claim(db, user, pred.claim_id)
    return {
        "id": pred.id,
        "claim_id": pred.claim_id,
        "model": pred.model,
        "model_version": pred.model_version,
        "model_status": pred.model_status,
        "risk_score": pred.score,
        "risk_tier": pred.label,
        "confidence": pred.confidence,
        "contributing_factors": json.loads(pred.explanation_json or "[]"),
        "imputed_features": json.loads(pred.imputed_features_json or "[]"),
        "created_at": pred.created_at,
    }

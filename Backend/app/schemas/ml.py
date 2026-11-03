from pydantic import BaseModel


class ContributingFactor(BaseModel):
    feature: str
    description: str
    impact: str  # INCREASES_RISK | DECREASES_RISK
    shap_value: float


class MLRiskResult(BaseModel):
    claim_id: int
    risk_score: int  # 0-100
    risk_tier: str  # LOW | MEDIUM | HIGH
    model_version: str
    model_status: str  # AVAILABLE | OFFLINE
    contributing_factors: list[ContributingFactor]
    recommended_action: str
    imputed_features: list[str]
    review_flag: bool


class PredictRequest(BaseModel):
    claim_id: int

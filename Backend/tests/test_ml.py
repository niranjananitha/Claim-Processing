from app.services import ml_service
from tests.conftest import auth
from tests.test_claims import create_claim


def _claim_for(client, make_user):
    make_user("agent")
    _, ctoken = make_user("client")
    _, mtoken = make_user("manager")
    claim_id = create_claim(client, ctoken).json()["id"]
    return claim_id, ctoken, mtoken


def test_predict_fraud_on_seeded_claim_returns_score_and_tier(client, make_user):
    claim_id, _, mtoken = _claim_for(client, make_user)
    resp = client.post("/api/v1/ml/predict", json={"claim_id": claim_id}, headers=auth(mtoken))
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["model_status"] == "AVAILABLE"
    assert 0 <= data["risk_score"] <= 100
    assert data["risk_tier"] in ("LOW", "MEDIUM", "HIGH")
    assert isinstance(data["contributing_factors"], list)


def test_predict_reports_imputed_features_for_sparse_claim(client, make_user):
    claim_id, _, mtoken = _claim_for(client, make_user)
    data = client.post("/api/v1/ml/predict", json={"claim_id": claim_id},
                       headers=auth(mtoken)).json()
    # A sparse submitted claim cannot supply all 30 features; some must be imputed.
    assert len(data["imputed_features"]) > 0


def test_predict_never_changes_claim_status(client, make_user):
    claim_id, _, mtoken = _claim_for(client, make_user)
    before = client.get(f"/api/v1/claims/{claim_id}", headers=auth(mtoken)).json()["status"]
    client.post("/api/v1/ml/predict", json={"claim_id": claim_id}, headers=auth(mtoken))
    after = client.get(f"/api/v1/claims/{claim_id}", headers=auth(mtoken)).json()["status"]
    assert before == after == "Submitted"


def test_predict_offline_when_model_missing(client, make_user, monkeypatch):
    monkeypatch.setattr(ml_service, "_fraud_bundle", lambda: None)
    claim_id, _, mtoken = _claim_for(client, make_user)
    resp = client.post("/api/v1/ml/predict", json={"claim_id": claim_id}, headers=auth(mtoken))
    assert resp.status_code == 200
    assert resp.json()["model_status"] == "OFFLINE"


def test_image_classify_handles_unloadable_model_gracefully():
    # The shipped .keras file cannot be deserialized in this environment; must degrade.
    result = ml_service.classify_damage("model/vehicle_damage_classifier.keras")
    assert result["model_status"] == "OFFLINE"

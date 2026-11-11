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


def _make_image(tmp_path, color=(200, 30, 30)):
    from PIL import Image

    path = tmp_path / "car.jpg"
    Image.new("RGB", (320, 240), color).save(path)
    return str(path)


def test_image_classify_loads_shipped_mobilenet_model(tmp_path):
    result = ml_service.classify_damage(_make_image(tmp_path))
    assert result["model_status"] == "AVAILABLE", result
    assert result["label"] in ("damaged", "whole")
    assert 0.5 <= result["confidence"] <= 1.0
    assert 0.0 <= result["damage_probability"] <= 1.0


def test_image_classify_feeds_raw_pixels_because_model_rescales_internally(tmp_path, monkeypatch):
    # The saved model contains MobileNetV2's x/127.5 - 1 step; inputs must stay 0-255.
    seen = {}

    class StubModel:
        input_shape = (None, 224, 224, 3)

        def predict(self, arr, verbose=0):
            seen["max"] = float(arr.max())
            return [[0.9]]

    monkeypatch.setattr(ml_service, "_damage_model", lambda: StubModel())
    ml_service.classify_damage(_make_image(tmp_path, color=(255, 255, 255)))
    assert seen["max"] == 255.0


def test_image_classify_degrades_when_model_unavailable(tmp_path, monkeypatch):
    monkeypatch.setattr(ml_service, "_damage_model", lambda: None)
    result = ml_service.classify_damage(_make_image(tmp_path))
    assert result["model_status"] == "OFFLINE"


def test_image_classify_degrades_on_unreadable_image(tmp_path):
    bad = tmp_path / "not_an_image.jpg"
    bad.write_text("nope")
    assert ml_service.classify_damage(str(bad))["model_status"] == "OFFLINE"

"""Modular ML decision-support service.

Two independent models, never combined into a single verdict:
  * XGBoost tabular fraud-risk (primary). Missing claim features are imputed by the
    shipped preprocessing pipeline; we report which features were imputed.
  * MobileNetV2 vehicle-damage image classifier (keras 3.13). Degrades to
    model_status=OFFLINE if it cannot load; the fraud model is never blocked by this.

ML output is advisory only; nothing here changes a claim's status.
"""
import json
import logging

import numpy as np
import pandas as pd

from app.core.config import get_settings
from app.models.claim import Claim
from app.models.ml_prediction import MLPrediction

logger = logging.getLogger(__name__)

_FRAUD_VERSION = "xgboost-fraud-v1"
_cache: dict = {}


# --------------------------------------------------------------------------- loaders
def _fraud_bundle():
    """Return (model, pipeline, metadata, shap_explainer) or None if unavailable."""
    if "fraud" in _cache:
        return _cache["fraud"]
    bundle = None
    try:
        import joblib
        import shap
        import xgboost as xgb

        mdir = get_settings().model_dir
        meta = json.loads((mdir / "model_metadata.json").read_text())
        pipeline = joblib.load(mdir / "preprocessing_pipeline.joblib")
        model = xgb.XGBClassifier()
        model.load_model(str(mdir / "xgboost_fraud_model.json"))
        explainer = shap.TreeExplainer(model)
        bundle = (model, pipeline, meta, explainer)
    except Exception:
        bundle = None
    _cache["fraud"] = bundle
    return bundle


# ------------------------------------------------------------------------- features
def _derive_features(claim: Claim, meta: dict, pipeline) -> tuple[pd.DataFrame, list[str]]:
    feats = meta["feature_columns_before_preprocessing"]
    numeric = set(meta["numeric_features"])
    row: dict = {f: np.nan for f in feats}

    total = float(claim.damage_estimate or 0) or (
        float(claim.vehicle_claim or 0) + float(claim.injury_claim or 0)
        + float(claim.property_claim or 0)
    )
    supplied = {
        "incident_type": claim.incident_type or None,
        "collision_type": claim.collision_type or None,
        "incident_severity": claim.severity or None,
        "authorities_contacted": claim.authorities_contacted or None,
        "incident_state": claim.state or None,
        "incident_city": claim.city or None,
        "witnesses": claim.witnesses,
        "police_report_available": "YES" if claim.police_report else "NO",
        "total_claim_amount": total,
        "injury_claim": float(claim.injury_claim or 0),
        "property_claim": float(claim.property_claim or 0),
        "vehicle_claim": float(claim.vehicle_claim or 0),
        "auto_make": claim.auto_make or None,
        "auto_model": claim.auto_model or None,
        "auto_year": int(claim.auto_year) if str(claim.auto_year).isdigit() else np.nan,
    }
    if claim.incident_date:
        supplied["incident_month"] = claim.incident_date.month
        supplied["incident_dayofweek"] = claim.incident_date.weekday()

    for k, v in supplied.items():
        if k in row and v is not None and not (isinstance(v, float) and np.isnan(v)):
            row[k] = v

    # Which features did the claim NOT supply (and will therefore be imputed)?
    imputed = [
        f for f in feats
        if (isinstance(row[f], float) and np.isnan(row[f])) or row[f] is None
    ]
    df = pd.DataFrame([row], columns=feats)
    return df, imputed


def _factors(pipeline, explainer, X) -> list[dict]:
    names = list(pipeline.get_feature_names_out())
    sv = np.array(explainer.shap_values(X)).reshape(-1)
    order = np.argsort(-np.abs(sv))[:4]
    factors = []
    for i in order:
        raw = names[i]
        label = raw.split("__", 1)[-1].replace("_", " ")
        val = float(sv[i])
        factors.append({
            "feature": label,
            "description": f"Model attribution for '{label}'.",
            "impact": "INCREASES_RISK" if val > 0 else "DECREASES_RISK",
            "shap_value": round(val, 4),
        })
    return factors


# --------------------------------------------------------------------------- predict
def _offline_result(claim_id: int) -> dict:
    return {
        "claim_id": claim_id,
        "risk_score": 0,
        "risk_tier": "LOW",
        "model_version": _FRAUD_VERSION,
        "model_status": "OFFLINE",
        "contributing_factors": [],
        "recommended_action": "ML scoring unavailable; adjudicate using manual review only.",
        "imputed_features": [],
        "review_flag": False,
    }


def predict_fraud(db, claim: Claim) -> dict:
    bundle = _fraud_bundle()
    if bundle is None:
        result = _offline_result(claim.id)
        _persist(db, claim.id, result)
        return result

    model, pipeline, meta, explainer = bundle
    try:
        df, imputed = _derive_features(claim, meta, pipeline)
        X = pipeline.transform(df)
        proba = float(model.predict_proba(X)[0, 1])
        threshold = float(meta.get("review_threshold", 0.5))
        score = int(round(proba * 100))
        tier = "HIGH" if score > 70 else "MEDIUM" if score > 40 else "LOW"
        review_flag = proba >= threshold
        action = (
            "Flag for enhanced verification (SIU). Advisory only - human adjuster must decide."
            if review_flag else
            "No elevated fraud indicators. Proceed with standard human adjudication."
        )
        result = {
            "claim_id": claim.id,
            "risk_score": score,
            "risk_tier": tier,
            "model_version": _FRAUD_VERSION,
            "model_status": "AVAILABLE",
            "contributing_factors": _factors(pipeline, explainer, X),
            "recommended_action": action,
            "imputed_features": imputed,
            "review_flag": review_flag,
        }
    except Exception:
        result = _offline_result(claim.id)
    _persist(db, claim.id, result)
    return result


def _persist(db, claim_id: int, result: dict) -> None:
    db.add(MLPrediction(
        claim_id=claim_id,
        model="xgboost",
        model_version=result["model_version"],
        model_status=result["model_status"],
        score=result["risk_score"],
        label=result["risk_tier"],
        confidence=result["risk_score"] / 100.0,
        explanation_json=json.dumps(result["contributing_factors"]),
        imputed_features_json=json.dumps(result["imputed_features"]),
    ))
    db.commit()


# ----------------------------------------------------------------------------- image
# What the sigmoid output (class index 1) means. image_dataset_from_directory assigns
# class indices alphabetically by folder name, so this must match the training folders
# (e.g. "00-damage"/"01-whole" -> index 1 is "whole").
_SIGMOID_POSITIVE_LABEL = "damaged"


def _damage_model():
    """Load the MobileNetV2 classifier once. Returns None if it cannot be loaded.

    Requires the keras version the model was saved with (see requirements.txt): older
    keras rejects the `quantization_config` field that 3.13 writes into Dense layers.
    """
    if "damage" in _cache:
        return _cache["damage"]
    model = None
    try:
        import keras

        model = keras.models.load_model(
            str(get_settings().model_dir / "vehicle_damage_classifier.keras"), compile=False,
        )
    except Exception:
        logger.exception("Vehicle damage classifier could not be loaded")
    _cache["damage"] = model
    return model


def _offline_image(detail: str) -> dict:
    return {"model_status": "OFFLINE", "label": None, "confidence": None,
            "damage_probability": None, "detail": detail}


def classify_damage(image_path: str) -> dict:
    """Classify a vehicle image as damaged/whole. Advisory only; degrades to OFFLINE."""
    model = _damage_model()
    if model is None:
        return _offline_image("Image classifier unavailable (model could not be loaded).")
    try:
        from keras.utils import img_to_array, load_img

        img = load_img(image_path, target_size=model.input_shape[1:3], color_mode="rgb")
        # Raw 0-255 pixels: the model applies MobileNetV2's x/127.5 - 1 internally.
        arr = np.expand_dims(img_to_array(img), 0)
        p_positive = float(model.predict(arr, verbose=0)[0][0])
    except Exception:
        logger.exception("Vehicle damage classification failed for %s", image_path)
        return _offline_image("Image could not be classified.")

    p_damaged = p_positive if _SIGMOID_POSITIVE_LABEL == "damaged" else 1.0 - p_positive
    label = "damaged" if p_damaged >= 0.5 else "whole"
    return {
        "model_status": "AVAILABLE",
        "label": label,
        "confidence": round(max(p_damaged, 1.0 - p_damaged), 4),
        "damage_probability": round(p_damaged, 4),
    }

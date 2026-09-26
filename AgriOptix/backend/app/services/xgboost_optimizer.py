from pathlib import Path

import numpy as np
import xgboost as xgb


MODEL_PATH = (
    Path(__file__).resolve().parents[1]
    / "models"
    / "agrioptix_xgboost_demo.json"
)

FEATURE_NAMES = [
    "price_per_kg",
    "transport_per_kg",
    "expected_loss_per_kg",
    "quantity_kg",
    "demand_score",
    "shelf_life_days",
]

_MODEL = None


def _get_model():
    global _MODEL

    if _MODEL is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"XGBoost model not found: {MODEL_PATH}"
            )

        _MODEL = xgb.XGBRegressor()
        _MODEL.load_model(str(MODEL_PATH))

    return _MODEL


def predict_net_return(
    price_per_kg: float,
    transport_per_kg: float,
    expected_loss_per_kg: float,
    quantity_kg: float,
    demand_score: float,
    shelf_life_days: float,
) -> float:
    """Predict expected net realized return per kg using the demo model."""

    values = [
        price_per_kg,
        transport_per_kg,
        expected_loss_per_kg,
        quantity_kg,
        demand_score,
        shelf_life_days,
    ]

    if not all(np.isfinite(float(value)) for value in values):
        raise ValueError("XGBoost features must contain finite numeric values.")

    if quantity_kg <= 0:
        raise ValueError("quantity_kg must be greater than zero.")

    if not 0 <= demand_score <= 1:
        raise ValueError("demand_score must be between 0 and 1.")

    features = np.array([values], dtype=np.float32)

    prediction = _get_model().predict(features)[0]

    return round(float(prediction), 2)


def model_info() -> dict:
    """Return metadata about the currently loaded XGBoost model."""

    return {
        "model": "XGBoost",
        "type": "XGBRegressor",
        "training_mode": "DEMO/SYNTHETIC",
        "feature_names": FEATURE_NAMES,
        "model_path": str(MODEL_PATH),
    }

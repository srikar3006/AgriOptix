import numpy as np
import xgboost as xgb

# DEMO/SYNTHETIC TRAINING DATA
# Features:
# price_per_kg, transport_per_kg, expected_loss_per_kg,
# quantity_kg, demand_score, shelf_life_days

rng = np.random.default_rng(42)

n = 500

price = rng.uniform(15, 40, n)
transport = rng.uniform(1, 8, n)
loss = rng.uniform(0.2, 5, n)
quantity = rng.uniform(100, 2000, n)
demand = rng.uniform(0, 1, n)
shelf_life = rng.uniform(1, 10, n)

X = np.column_stack([
    price,
    transport,
    loss,
    quantity,
    demand,
    shelf_life,
])

# Demo target representing expected net return per kg.
# This is synthetic training logic, not real agricultural ground truth.
y = (
    price
    - transport
    - loss
    + (demand * 3)
    + (shelf_life * 0.2)
    + rng.normal(0, 0.5, n)
)

model = xgb.XGBRegressor(
    n_estimators=150,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.9,
    colsample_bytree=0.9,
    objective="reg:squarederror",
    random_state=42,
)

model.fit(X, y)

model.save_model("app/models/agrioptix_xgboost_demo.json")

print("XGBOOST DEMO MODEL TRAINED SUCCESSFULLY")
print("Model: app/models/agrioptix_xgboost_demo.json")
print("Training samples:", n)
print("Features:", 6)

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Reuse the existing project-level AI/ML and optimization modules instead of
# duplicating their logic here. These live at the project root (../../ml,
# ../../optimization relative to this file), so make them importable.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.quality.service import QualityService          # noqa: E402
from ml.perishability.service import PerishabilityService  # noqa: E402
from optimization.solver.engine import solve_demo       # noqa: E402

quality_service = QualityService()
perishability_service = PerishabilityService()

app = FastAPI(title="AgriOptix API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

DEMO_HARVEST = {
    "id": 1, "crop": "Tomato", "quantity_kg": 1550,
    "grade": "A", "confidence": 92, "shelf_life_days": 3.2,
    "urgency": "HIGH", "expected_value_loss": 1100
}

# In-memory farmer registry (demo persistence layer — mirrors the `harvests`/
# `buyers`/`orders` pattern already used for BUYERS/DEMO_HARVEST below and the
# tables defined in schema.sql; swap for real DB writes when one is wired up).
FARMERS: List[dict] = []

BUYERS = [
    {"id": 1, "name": "Buyer A", "price": 28, "distance_km": 120, "transport": 6, "loss": 2.5,
     "demand": "High", "quality": "A", "delivery": "Tomorrow 8:00 AM", "reliability": 94},
    {"id": 2, "name": "Buyer B", "price": 26, "distance_km": 65, "transport": 2.7, "loss": 0.7,
     "demand": "High", "quality": "A", "delivery": "Today 6:30 PM", "reliability": 98},
    {"id": 3, "name": "Buyer C", "price": 24, "distance_km": 42, "transport": 2.1, "loss": 0.9,
     "demand": "Medium", "quality": "B+", "delivery": "Today 5:00 PM", "reliability": 91},
]

class HarvestIn(BaseModel):
    crop: str = "Tomato"
    quantity_kg: float = Field(gt=0)
    harvest_time: Optional[str] = None
    latitude: float = 17.385
    longitude: float = 78.4867

class StatusIn(BaseModel):
    status: str

class FarmerIn(BaseModel):
    name: str
    mobile: str
    language: Optional[str] = None
    village: Optional[str] = None
    crops: Optional[str] = None

@app.get("/health")
def health():
    return {"api": "ok", "database": "demo", "ai": "demo", "optimization": "ok"}

@app.post("/api/farmers")
def create_farmer(data: FarmerIn):
    """Farmer onboarding save (Add Harvest step 2 in the reference flow)."""
    record = {"id": len(FARMERS) + 1, **data.model_dump()}
    FARMERS.append(record)
    return record

@app.post("/api/auth/register")
def register():
    return {"message": "Registration successful", "mode": "DEMO"}

@app.post("/api/auth/login")
def login():
    return {"access_token": "demo-token", "role": "farmer"}

@app.get("/api/harvests")
def harvests():
    return [DEMO_HARVEST]

@app.post("/api/harvests")
def create_harvest(data: HarvestIn):
    global DEMO_HARVEST
    DEMO_HARVEST = {
        **DEMO_HARVEST, "crop": data.crop, "quantity_kg": data.quantity_kg,
        "harvest_time": data.harvest_time
    }
    return DEMO_HARVEST

@app.post("/api/quality/analyze")
def quality():
    # Delegates to ml/quality/service.py (QualityService). Its demo
    # implementation is deterministic and clearly labelled; swap its body for
    # a real YOLO/EfficientNet/OpenCV call and this endpoint's contract
    # (and every screen that reads it) keeps working unchanged.
    result = quality_service.analyze()
    return {
        "crop_detected": DEMO_HARVEST["crop"],
        "grade": result["grade"], "confidence": result["confidence"],
        "quality_score": result["quality_score"], "visible_defects": "Low",
        "indicators": ["Good color", "Uniform appearance", "Low visible defect level"],
        "mode": result["mode"]
    }

@app.post("/api/perishability/predict")
def perishability():
    # Delegates to ml/perishability/service.py (PerishabilityService).
    result = perishability_service.predict(
        crop=DEMO_HARVEST["crop"], grade=DEMO_HARVEST.get("grade", "A"),
        harvest_time=DEMO_HARVEST.get("harvest_time")
    )
    return {
        "remaining_shelf_life_days": result["shelf_life_days"],
        "urgency": result["urgency"],
        "expected_value_loss": 1100,
        "decay_curve": [{"day": 0, "loss_per_kg": 0}, {"day": 1, "loss_per_kg": .8},
                        {"day": 2, "loss_per_kg": 2.1}, {"day": 3, "loss_per_kg": 4.8}],
        "mode": result["mode"]
    }

@app.get("/api/markets")
def markets():
    return BUYERS

@app.get("/api/buyers")
def buyers():
    return BUYERS

@app.post("/api/aggregation/cluster")
def aggregation():
    return {
        "farmers": [{"name": "Farmer 1", "quantity_kg": 450},
                    {"name": "Farmer 2", "quantity_kg": 300},
                    {"name": "Farmer 3", "quantity_kg": 500},
                    {"name": "Farmer 4", "quantity_kg": 300}],
        "total_kg": 1550, "aggregation_point": "Hyderabad North Aggregation Hub",
        "mode": "DEMO DATA"
    }

@app.post("/api/routes/calculate")
def route():
    return {"distance_km": 65, "travel_time_min": 105,
            "route": ["Farm", "Aggregation Point", "Buyer B"],
            "mode": "DEMO / OSM-compatible"}

@app.post("/api/optimization/run")
def optimize():
    # Selection now delegates to optimization/solver/engine.py (solve_demo),
    # the project's dedicated optimization module — the production hook noted
    # in that file (swap for OR-Tools/Pyomo MILP) is preserved unchanged.
    results = []
    for b in BUYERS:
        b = dict(b)
        b["net_per_kg"] = round(b["price"] - b["transport"] - b["loss"], 2)
        results.append(b)
    engine_pick = solve_demo(quantity_kg=DEMO_HARVEST["quantity_kg"])
    selected = next((b for b in results if b["name"] == engine_pick["name"]), max(results, key=lambda x: x["net_per_kg"]))
    qty = DEMO_HARVEST["quantity_kg"]
    gross = round(selected["price"] * qty, 2)
    transport = round(selected["transport"] * qty, 2)
    loss = round(selected["loss"] * qty, 2)
    handling = 700
    net = round(gross - transport - loss - handling, 2)
    return {
        "selected_buyer": selected["name"], "quantity_kg": qty,
        "vehicle": "2 × 1-ton vehicles", "route": "Farm → Aggregation Point → Buyer B",
        "delivery": "Today, 6:30 PM", "gross_sale": gross,
        "transport_cost": transport, "handling_cost": handling,
        "expected_value_loss": loss, "net_realized_return": net,
        "candidates": results,
        "why": ["Better quality-price fit", "Buyer demand matches quantity",
                "Lower transport cost", "Vehicle capacity feasible",
                "Delivery within shelf-life window", "Lower expected value loss"],
        "rejected_reason": "Buyer A has a higher quoted price, but its transport and perishability costs reduce net realization.",
        "objective": "Expected Net Realized Return"
    }

@app.get("/api/optimization/1")
def optimization():
    return optimize()

@app.post("/api/orders")
def create_order():
    return {"id": 1, "status": "PLANNED", "buyer": "Buyer B", "quantity_kg": DEMO_HARVEST["quantity_kg"]}

@app.patch("/api/orders/1/status")
def order_status(data: StatusIn):
    return {"id": 1, "status": data.status}

@app.post("/api/delivery/verify")
def verify():
    return {"verified": True, "received_quantity": DEMO_HARVEST["quantity_kg"], "status": "VERIFIED"}

@app.get("/api/settlements/1")
def settlement():
    return {"status": "COMPLETED", "sale_value": 40300, "logistics_cost": 4200,
            "handling_cost": 700, "net_settlement": 35400}

@app.post("/api/feedback")
def feedback():
    return {"saved": True, "message": "Prediction vs actual data stored for learning."}

@app.post("/api/voice/transcribe")
def transcribe():
    return {"text": "నా టమాటాలు అమ్మడానికి మంచి మార్కెట్ ఏది?", "mode": "DEMO"}

@app.post("/api/voice/respond")
def voice_respond():
    return {"response": "AgriOptix recommends Buyer B because the expected net realization is higher."}

@app.get("/api/operations/kpis")
def kpis():
    return {"active_harvest": 8, "active_orders": 12, "total_quantity": 18450,
            "vehicles_in_transit": 7, "expected_net": 486300,
            "logistics_per_kg": 3.4, "on_time_delivery": 96,
            "value_loss_avoided": 82400}

import sys
import hashlib
import secrets
import re
from pathlib import Path
from typing import Optional, List, Literal
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from app.database.database import get_db
from app.models import Driver
# ============================================================
# PROJECT PATH
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="AgriOptix API",
    version="1.1.0",
    description="AgriOptix Farm-to-Market Optimization Platform API",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DEMO DATA
# ============================================================

DEMO_HARVEST = {
    "id": 1,
    "crop": "Tomato",
    "quantity_kg": 1550,
    "grade": "A",
    "confidence": 92,
    "shelf_life_days": 3.2,
    "urgency": "HIGH",
    "expected_value_loss": 1100,
}


FARMERS: List[dict] = []
HARVESTS: List[dict] = []
NEXT_HARVEST_ID = 1

DRIVERS: List[dict] = []


BUYERS = [
    {
        "id": 1,
        "name": "Buyer A",
        "price": 28,
        "distance_km": 120,
        "transport": 6,
        "loss": 2.5,
        "demand": "High",
        "quality": "A",
        "delivery": "Tomorrow 8:00 AM",
        "reliability": 94,
    },
    {
        "id": 2,
        "name": "Buyer B",
        "price": 26,
        "distance_km": 65,
        "transport": 2.7,
        "loss": 0.7,
        "demand": "High",
        "quality": "A",
        "delivery": "Today 6:30 PM",
        "reliability": 98,
    },
    {
        "id": 3,
        "name": "Buyer C",
        "price": 24,
        "distance_km": 42,
        "transport": 2.1,
        "loss": 0.9,
        "demand": "Medium",
        "quality": "B+",
        "delivery": "Today 5:00 PM",
        "reliability": 91,
    },
]


# ============================================================
# SECURITY HELPERS
# ============================================================

PASSWORD_ITERATIONS = 120_000


def hash_password(password: str) -> tuple[str, str]:
    """
    Creates a salted PBKDF2-SHA256 password hash.

    Returns:
        password_hash, password_salt
    """

    salt = secrets.token_hex(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_ITERATIONS,
    ).hex()

    return password_hash, salt


def verify_password(
    password: str,
    password_hash: str,
    password_salt: str,
) -> bool:

    candidate_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        password_salt.encode("utf-8"),
        PASSWORD_ITERATIONS,
    ).hex()

    return secrets.compare_digest(
        candidate_hash,
        password_hash,
    )


def validate_password(password: str):
    if len(password) < 6:
        raise HTTPException(
            status_code=422,
            detail="Password must contain at least 6 characters.",
        )


# ============================================================
# NORMALIZATION HELPERS
# ============================================================

def normalize_mobile(value: str) -> str:
    return "".join(
        ch for ch in value
        if ch.isdigit()
    )[-10:]


def validate_mobile(value: str) -> str:

    mobile = normalize_mobile(value)

    if len(mobile) != 10:
        raise HTTPException(
            status_code=422,
            detail="Enter a valid 10-digit mobile number.",
        )

    return mobile


def normalize_vehicle_number(value: str) -> str:

    return re.sub(
        r"[^A-Za-z0-9]",
        "",
        value,
    ).upper()


# ============================================================
# SAFE DRIVER RESPONSE
# ============================================================

def safe_driver(driver: dict) -> dict:
    """
    Removes sensitive authentication fields
    before returning driver information to frontend.
    """

    return {
        key: value
        for key, value in driver.items()
        if key not in {
            "password_hash",
            "password_salt",
        }
    }


# ============================================================
# REQUEST MODELS
# ============================================================

class HarvestIn(BaseModel):
    crop: Optional[str] = None
    variety: Optional[str] = None
    quantity: Optional[float] = Field(default=None, gt=0)
    quantity_unit: Literal["kg", "quintal", "tonne"] = "kg"
    harvest_date: Optional[str] = None
    harvest_time: Optional[str] = None
    pickup_readiness: Optional[str] = None
    pickup_readiness_date: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    overall_quality: Optional[str] = None
    ripeness: Optional[str] = None
    visible_damage: Optional[str] = None
    size: Optional[str] = None
    freshness: Optional[str] = None
    estimated_shelf_life: Optional[str] = None
    photos: List[str] = []
    packaging_type: Optional[str] = None
    package_weight: Optional[float] = Field(default=None, gt=0)
    storage_condition: Optional[str] = None
    special_handling: Optional[str] = None
    special_handling_notes: Optional[str] = None
    pickup_date: Optional[str] = None
    pickup_time: Optional[str] = None
    loading_assistance: Optional[str] = None
    status: Literal["DRAFT", "PUBLISHED", "AVAILABLE"] = "PUBLISHED"


class StatusIn(BaseModel):
    status: str


class FarmerIn(BaseModel):
    name: str
    mobile: str
    language: Optional[str] = None
    village: Optional[str] = None
    crops: Optional[str] = None
    farm_size: Optional[str] = None
    land_type: Optional[str] = None
    production: Optional[str] = None
    password: Optional[str] = None


class LoginIn(BaseModel):
    identifier: str
    password: str


class DriverIn(BaseModel):
    fullName: str
    mobileNumber: str
    preferredLanguage: Optional[str] = "English"
    currentLocation: Optional[str] = None
    vehicleType: Optional[str] = None
    vehicleNumber: str
    drivingLicenseNumber: Optional[str] = None
    licenseExpiryDate: Optional[str] = None
    vehicleCapacity: Optional[str] = None
    experience: Optional[str] = None
    availability: Optional[str] = None
    preferredRoutes: Optional[str] = None
    password: str


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "api": "ok",
        "database": "demo",
        "ai": "demo",
        "optimization": "demo",
        "driver_auth": "enabled",
        "version": "1.1.0",
    }


# ============================================================
# FARMER
# ============================================================

@app.post("/api/farmers")
def create_farmer(data: FarmerIn):

    record = {
        "id": len(FARMERS) + 1,
        **data.model_dump(),
    }

    FARMERS.append(record)

    return record


@app.post("/api/auth/register")
def register(data: FarmerIn):

    mobile = validate_mobile(data.mobile)

    if len(data.password or "") < 8:
        raise HTTPException(
            status_code=422,
            detail="Password must contain at least 8 characters.",
        )

    if any(
        str(f.get("mobile", "")) == mobile
        for f in FARMERS
    ):
        raise HTTPException(
            status_code=409,
            detail="A farmer account with this mobile number already exists.",
        )

    password_hash, salt = hash_password(
        data.password
    )

    record = {
        "id": len(FARMERS) + 1,
        "name": data.name.strip(),
        "mobile": mobile,
        "language": data.language or "English",
        "village": data.village or "",
        "crops": data.crops or "",
        "farm_size": data.farm_size or "",
        "land_type": data.land_type or "",
        "production": data.production or "",
        "password_hash": password_hash,
        "password_salt": salt,
    }

    FARMERS.append(record)

    safe_farmer = {
        key: value
        for key, value in record.items()
        if key not in {
            "password_hash",
            "password_salt",
        }
    }

    return {
        "message": "Registration successful",
        "farmer": safe_farmer,
        "mode": "DEMO",
    }


@app.post("/api/auth/login")
def login(data: LoginIn):

    identifier = data.identifier.strip()

    mobile = (
        normalize_mobile(identifier)
        if any(
            ch.isdigit()
            for ch in identifier
        )
        else ""
    )

    farmer = next(
        (
            f
            for f in FARMERS
            if f.get("mobile") == mobile
            or f.get("email") == identifier.lower()
        ),
        None,
    )

    if not farmer:
        raise HTTPException(
            status_code=401,
            detail="Invalid mobile/email or password.",
        )

    if not verify_password(
        data.password,
        farmer["password_hash"],
        farmer["password_salt"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid mobile/email or password.",
        )

    safe_farmer = {
        key: value
        for key, value in farmer.items()
        if key not in {
            "password_hash",
            "password_salt",
        }
    }

    return {
        "access_token": f"demo-token-{farmer['id']}",
        "role": "farmer",
        "farmer": safe_farmer,
    }


# ============================================================
# DRIVER REGISTRATION
# ============================================================

# ============================================================
# DRIVER REGISTRATION - DATABASE
# ============================================================

@app.post("/api/drivers/register")
def register_driver(
    data: DriverIn,
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # BASIC VALIDATION
    # --------------------------------------------------------

    if not data.fullName.strip():
        raise HTTPException(
            status_code=422,
            detail="Full name is required.",
        )

    mobile = validate_mobile(data.mobileNumber)

    vehicle_number = normalize_vehicle_number(
        data.vehicleNumber
    )

    if not vehicle_number:
        raise HTTPException(
            status_code=422,
            detail="Vehicle number is required.",
        )

    validate_password(data.password)

    # --------------------------------------------------------
    # DUPLICATE MOBILE CHECK
    # --------------------------------------------------------

    existing_mobile = (
        db.query(Driver)
        .filter(Driver.mobile_number == mobile)
        .first()
    )

    if existing_mobile:
        raise HTTPException(
            status_code=409,
            detail=(
                "A driver account with this "
                "mobile number already exists."
            ),
        )

    # --------------------------------------------------------
    # DUPLICATE VEHICLE CHECK
    # --------------------------------------------------------

    existing_vehicle = (
        db.query(Driver)
        .filter(Driver.vehicle_number == vehicle_number)
        .first()
    )

    if existing_vehicle:
        raise HTTPException(
            status_code=409,
            detail="This vehicle number is already registered.",
        )

    # --------------------------------------------------------
    # HASH PASSWORD
    # --------------------------------------------------------

    password_hash, password_salt = hash_password(
        data.password
    )

    # --------------------------------------------------------
    # CREATE DATABASE DRIVER
    # --------------------------------------------------------

    driver = Driver(
        full_name=data.fullName.strip(),
        mobile_number=mobile,
        preferred_language=(
            data.preferredLanguage or "English"
        ),
        current_location=(
            data.currentLocation or ""
        ),
        vehicle_type=(
            data.vehicleType or ""
        ),
        vehicle_number=vehicle_number,
        driving_license_number=(
            data.drivingLicenseNumber or ""
        ),
        license_expiry_date=(
            data.licenseExpiryDate
            if data.licenseExpiryDate
            else None
        ),
        vehicle_capacity=(
            data.vehicleCapacity or ""
        ),
        experience=(
            data.experience or ""
        ),
        availability=(
            data.availability or ""
        ),
        preferred_routes=(
            data.preferredRoutes or ""
        ),
        password_hash=password_hash,
        password_salt=password_salt,
        status="ACTIVE",
    )

    db.add(driver)
    db.commit()
    db.refresh(driver)

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message": "Driver registration successful",
        "driver": {
            "id": driver.id,
            "fullName": driver.full_name,
            "mobileNumber": driver.mobile_number,
            "preferredLanguage": driver.preferred_language,
            "currentLocation": driver.current_location,
            "vehicleType": driver.vehicle_type,
            "vehicleNumber": driver.vehicle_number,
            "drivingLicenseNumber": driver.driving_license_number,
            "licenseExpiryDate": (
                driver.license_expiry_date.isoformat()
                if driver.license_expiry_date
                else ""
            ),
            "vehicleCapacity": driver.vehicle_capacity,
            "experience": driver.experience,
            "availability": driver.availability,
            "preferredRoutes": driver.preferred_routes,
            "status": driver.status,
            "mode": "DATABASE",
        },
    }
# ============================================================
# DRIVER LOGIN
# ============================================================

@app.post("/api/drivers/login")
def login_driver(data: LoginIn):

    mobile = validate_mobile(
        data.identifier
    )

    driver = next(
        (
            driver
            for driver in DRIVERS
            if driver.get("mobileNumber") == mobile
        ),
        None,
    )

    if not driver:
        raise HTTPException(
            status_code=401,
            detail="Driver account not found.",
        )

    if not verify_password(
        data.password,
        driver["password_hash"],
        driver["password_salt"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect password.",
        )

    return {
        "message": "Driver login successful",

        "driver": {
            "id": driver["id"],
            "fullName": driver["fullName"],
            "mobileNumber": driver["mobileNumber"],
            "vehicleNumber": driver["vehicleNumber"],
            "vehicleType": driver["vehicleType"],
            "preferredLanguage": driver[
                "preferredLanguage"
            ],
            "currentLocation": driver[
                "currentLocation"
            ],
            "status": driver["status"],
        },

        "access_token": (
            f"demo-driver-token-{driver['id']}"
        ),

        "token_type": "bearer",
    }


# ============================================================
# DRIVER LIST
# ============================================================

@app.get("/api/drivers")
def get_drivers():

    return [
        safe_driver(driver)
        for driver in DRIVERS
    ]


# ============================================================
# DRIVER PROFILE
# ============================================================

@app.get("/api/drivers/{driver_id}")
def get_driver(driver_id: int):

    driver = next(
        (
            driver
            for driver in DRIVERS
            if driver.get("id") == driver_id
        ),
        None,
    )

    if not driver:
        raise HTTPException(
            status_code=404,
            detail="Driver not found.",
        )

    return {
        "driver": safe_driver(driver)
    }


# ============================================================
# DRIVER DASHBOARD
# ============================================================

@app.get("/api/drivers/{driver_id}/dashboard")
def driver_dashboard(driver_id: int):

    driver = next(
        (
            driver
            for driver in DRIVERS
            if driver.get("id") == driver_id
        ),
        None,
    )

    if not driver:
        raise HTTPException(
            status_code=404,
            detail="Driver not found.",
        )

    return {
        "driver": safe_driver(driver),

        "stats": {
            "active_trips": 0,
            "completed_trips": 0,
            "total_distance_km": 0,
            "estimated_earnings": 0,
            "rating": 5.0,
        },

        "active_trip": None,

        "available_jobs": [
            {
                "id": 1,
                "pickup": "Ranga Reddy Farm",
                "destination": "Hyderabad Buyer B",
                "crop": "Tomato",
                "quantity_kg": 850,
                "distance_km": 65,
                "estimated_earnings": 3200,
                "priority": "HIGH",
            }
        ],

        "mode": "DEMO",
    }
# ============================================================
# HARVEST
# ============================================================

@app.get("/api/harvests")
def harvests():
    published = [h for h in HARVESTS if h.get("status") in {"PUBLISHED", "AVAILABLE"}]
    if published:
        return list(reversed(published))
    return [DEMO_HARVEST]


@app.post("/api/harvests")
def create_harvest(data: HarvestIn):
    global NEXT_HARVEST_ID, DEMO_HARVEST

    if data.status != "DRAFT":
        required = {
            "crop": data.crop,
            "quantity": data.quantity,
            "harvest_date": data.harvest_date,
            "harvest_time": data.harvest_time,
            "pickup_readiness": data.pickup_readiness,
            "location": data.location,
            "overall_quality": data.overall_quality,
            "ripeness": data.ripeness,
            "visible_damage": data.visible_damage,
            "size": data.size,
            "freshness": data.freshness,
            "estimated_shelf_life": data.estimated_shelf_life,
            "packaging_type": data.packaging_type,
            "storage_condition": data.storage_condition,
            "pickup_date": data.pickup_date,
            "pickup_time": data.pickup_time,
            "loading_assistance": data.loading_assistance,
        }

        missing = [
            name for name, value in required.items()
            if value is None or value == ""
        ]

        if missing:
            raise HTTPException(
                status_code=422,
                detail=f"Incomplete harvest record. Missing: {', '.join(missing)}"
            )

    quantity_kg = data.quantity or 0

    if data.quantity_unit == "quintal":
        quantity_kg = data.quantity * 100
    elif data.quantity_unit == "tonne":
        quantity_kg = data.quantity * 1000

    record = data.model_dump()

    record.update({
        "id": NEXT_HARVEST_ID,
        "quantity_kg": quantity_kg,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
    })

    HARVESTS.append(record)
    NEXT_HARVEST_ID += 1

    if record["status"] in {"PUBLISHED", "AVAILABLE"}:
        DEMO_HARVEST = {
            **DEMO_HARVEST,
            "id": record["id"],
            "crop": record["crop"],
            "quantity_kg": quantity_kg,
            "harvest_time": f'{record["harvest_date"]}T{record["harvest_time"]}',
            "harvest": record,
            "status": "AVAILABLE",
        }

    return record

# ============================================================
# QUALITY ANALYSIS - DEMO
# ============================================================

@app.post("/api/quality/analyze")
def quality():

    return {
        "crop_detected": DEMO_HARVEST["crop"],

        "grade": "A",

        "confidence": 92,

        "quality_score": 88,

        "visible_defects": "Low",

        "indicators": [
            "Good color",
            "Uniform appearance",
            "Low visible defect level",
        ],

        "mode": "DEMO",
    }


# ============================================================
# PERISHABILITY - DEMO
# ============================================================

@app.post("/api/perishability/predict")
def perishability():

    return {
        "remaining_shelf_life_days": 3.2,

        "urgency": "HIGH",

        "expected_value_loss": 1100,

        "decay_curve": [
            {
                "day": 0,
                "loss_per_kg": 0,
            },
            {
                "day": 1,
                "loss_per_kg": 0.8,
            },
            {
                "day": 2,
                "loss_per_kg": 2.1,
            },
            {
                "day": 3,
                "loss_per_kg": 4.8,
            },
        ],

        "mode": "DEMO",
    }


# ============================================================
# MARKETS / BUYERS
# ============================================================

@app.get("/api/markets")
def markets():

    return BUYERS


@app.get("/api/buyers")
def buyers():

    return BUYERS


# ============================================================
# AGGREGATION
# ============================================================

@app.post("/api/aggregation/cluster")
def aggregation():

    return {
        "farmers": [
            {
                "name": "Farmer 1",
                "quantity_kg": 450,
            },
            {
                "name": "Farmer 2",
                "quantity_kg": 300,
            },
            {
                "name": "Farmer 3",
                "quantity_kg": 500,
            },
            {
                "name": "Farmer 4",
                "quantity_kg": 300,
            },
        ],

        "total_kg": 1550,

        "aggregation_point": (
            "Hyderabad North Aggregation Hub"
        ),

        "mode": "DEMO DATA",
    }


# ============================================================
# ROUTE CALCULATION
# ============================================================

@app.post("/api/routes/calculate")
def route():

    return {
        "distance_km": 65,

        "travel_time_min": 105,

        "route": [
            "Farm",
            "Aggregation Point",
            "Buyer B",
        ],

        "mode": "DEMO / OSM-compatible",
    }


# ============================================================
# OPTIMIZATION
# ============================================================

@app.post("/api/optimization/run")
def optimize():

    results = []

    for buyer in BUYERS:

        candidate = dict(buyer)

        candidate["net_per_kg"] = round(
            candidate["price"]
            - candidate["transport"]
            - candidate["loss"],
            2,
        )

        results.append(candidate)

    selected = max(
        results,
        key=lambda x: x["net_per_kg"],
    )

    qty = DEMO_HARVEST["quantity_kg"]

    gross = round(
        selected["price"] * qty,
        2,
    )

    transport = round(
        selected["transport"] * qty,
        2,
    )

    loss = round(
        selected["loss"] * qty,
        2,
    )

    handling = 700

    net = round(
        gross
        - transport
        - loss
        - handling,
        2,
    )

    return {
        "selected_buyer": selected["name"],

        "quantity_kg": qty,

        "vehicle": "2 × 1-ton vehicles",

        "route": (
            "Farm → Aggregation Point → "
            + selected["name"]
        ),

        "delivery": selected["delivery"],

        "gross_sale": gross,

        "transport_cost": transport,

        "handling_cost": handling,

        "expected_value_loss": loss,

        "net_realized_return": net,

        "candidates": results,

        "why": [
            "Better quality-price fit",
            "Buyer demand matches quantity",
            "Lower transport cost",
            "Vehicle capacity feasible",
            "Delivery within shelf-life window",
            "Lower expected value loss",
        ],

        "rejected_reason": (
            "Buyer A has a higher quoted price, "
            "but its transport and perishability "
            "costs reduce net realization."
        ),

        "objective": (
            "Expected Net Realized Return"
        ),

        "mode": "DEMO",
    }


@app.get("/api/optimization/1")
def optimization():

    return optimize()


# ============================================================
# ORDERS
# ============================================================

@app.post("/api/orders")
def create_order():

    return {
        "id": 1,

        "status": "PLANNED",

        "buyer": "Buyer B",

        "quantity_kg": (
            DEMO_HARVEST["quantity_kg"]
        ),
    }


@app.patch("/api/orders/1/status")
def order_status(data: StatusIn):

    return {
        "id": 1,
        "status": data.status,
    }


# ============================================================
# DELIVERY
# ============================================================

@app.post("/api/delivery/verify")
def verify():

    return {
        "verified": True,

        "received_quantity": (
            DEMO_HARVEST["quantity_kg"]
        ),

        "status": "VERIFIED",
    }


# ============================================================
# SETTLEMENT
# ============================================================

@app.get("/api/settlements/1")
def settlement():

    return {
        "status": "COMPLETED",

        "sale_value": 40300,

        "logistics_cost": 4200,

        "handling_cost": 700,

        "net_settlement": 35400,
    }


# ============================================================
# FEEDBACK
# ============================================================

@app.post("/api/feedback")
def feedback():

    return {
        "saved": True,

        "message": (
            "Prediction vs actual data "
            "stored for learning."
        ),
    }


# ============================================================
# VOICE
# ============================================================

@app.post("/api/voice/transcribe")
def transcribe():

    return {
        "text": (
            "నా టమాటాలు అమ్మడానికి "
            "మంచి మార్కెట్ ఏది?"
        ),

        "mode": "DEMO",
    }


@app.post("/api/voice/respond")
def voice_respond():

    return {
        "response": (
            "AgriOptix recommends Buyer B "
            "because the expected net "
            "realization is higher."
        )
    }


# ============================================================
# OPERATIONS KPIs
# ============================================================

@app.get("/api/operations/kpis")
def kpis():

    return {
        "active_harvest": 8,

        "active_orders": 12,

        "total_quantity": 18450,

        "vehicles_in_transit": 7,

        "expected_net": 486300,

        "logistics_per_kg": 3.4,

        "on_time_delivery": 96,

        "value_loss_avoided": 82400,
    }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "name": "AgriOptix API",
        "version": "1.1.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }
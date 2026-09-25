import sys
import hashlib
import secrets
import re
import os
import json
import base64
import urllib.request
import urllib.error
import uuid
from pathlib import Path
from typing import Optional, List, Literal
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from psycopg import connect
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb



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

# Persistent storage uses the project's existing PostgreSQL/PostGIS configuration.
# No harvest or AI-quality records are kept in process memory.
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not configured. Set the existing AgriOptix PostgreSQL "
        "connection string in backend/.env or the process environment."
    )


FARMERS: List[dict] = []
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
# DATABASE HELPERS
# ============================================================

HARVEST_COLUMNS = (
    "id, crop, variety, quantity, quantity_unit, quantity_kg, harvest_date, "
    "harvest_time, pickup_readiness, pickup_readiness_date, location, latitude, "
    "longitude, overall_quality, ripeness, visible_damage, size, freshness, "
    "estimated_shelf_life, photos, packaging_type, package_weight, storage_condition, "
    "special_handling, special_handling_notes, pickup_date, pickup_time, "
    "loading_assistance, status, created_at, updated_at"
)


def db_connect():
    return connect(DATABASE_URL, row_factory=dict_row)


def _json_safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    try:
        from decimal import Decimal
        if isinstance(value, Decimal):
            return float(value)
    except ImportError:
        pass
    return value


def _serialize_harvest(row: dict, ai: Optional[dict] = None) -> dict:
    result = {key: _json_safe(value) for key, value in row.items()}
    if result.get("photos") is None:
        result["photos"] = []
    result["ai_quality_analysis"] = ai
    return result


def _fetch_harvest(harvest_id: int) -> Optional[dict]:
    with db_connect() as conn:
        row = conn.execute(
            f"SELECT {HARVEST_COLUMNS} FROM harvests WHERE id = %s",
            (harvest_id,),
        ).fetchone()
    return row


def _fetch_ai_quality(harvest_id: int) -> Optional[dict]:
    with db_connect() as conn:
        row = conn.execute(
            """
            SELECT crop_name, overall_quality, visible_damage, ripeness_maturity,
                   size, freshness_condition, estimated_shelf_life, confidence,
                   analyzed_at, image_references
            FROM ai_quality_analysis
            WHERE harvest_id = %s
            """,
            (harvest_id,),
        ).fetchone()
    if not row:
        return None
    result = {key: _json_safe(value) for key, value in row.items()}
    result["image_references"] = result.get("image_references") or []
    return result


def _ensure_database_schema() -> None:
    """Create the existing project tables if the configured database is empty."""
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    schema = schema_path.read_text(encoding="utf-8")
    with db_connect() as conn:
        conn.execute(schema)
        conn.commit()


@app.on_event("startup")
def startup_database() -> None:
    try:
        _ensure_database_schema()
    except Exception as exc:
        raise RuntimeError(
            "Unable to connect to the configured AgriOptix PostgreSQL database "
            "or initialize its existing schema. Check DATABASE_URL and ensure PostgreSQL is running."
        ) from exc


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

@app.post("/api/drivers/register")
def register_driver(data: DriverIn):

    # --------------------------------------------------------
    # BASIC VALIDATION
    # --------------------------------------------------------

    if not data.fullName.strip():
        raise HTTPException(
            status_code=422,
            detail="Full name is required.",
        )

    mobile = validate_mobile(
        data.mobileNumber
    )

    vehicle_number = normalize_vehicle_number(
        data.vehicleNumber
    )

    if not vehicle_number:
        raise HTTPException(
            status_code=422,
            detail="Vehicle number is required.",
        )

    validate_password(
        data.password
    )

    # --------------------------------------------------------
    # DUPLICATE MOBILE CHECK
    # --------------------------------------------------------

    if any(
        driver.get("mobileNumber") == mobile
        for driver in DRIVERS
    ):
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

    if any(
        driver.get("vehicleNumber") == vehicle_number
        for driver in DRIVERS
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "This vehicle number is already registered."
            ),
        )

    # --------------------------------------------------------
    # HASH DRIVER PASSWORD
    # --------------------------------------------------------

    password_hash, password_salt = hash_password(
        data.password
    )

    # --------------------------------------------------------
    # CREATE DRIVER
    # --------------------------------------------------------

    driver = {
        "id": len(DRIVERS) + 1,

        "fullName": data.fullName.strip(),

        "mobileNumber": mobile,

        "preferredLanguage": (
            data.preferredLanguage
            or "English"
        ),

        "currentLocation": (
            data.currentLocation
            or ""
        ),

        "vehicleType": (
            data.vehicleType
            or ""
        ),

        "vehicleNumber": vehicle_number,

        "drivingLicenseNumber": (
            data.drivingLicenseNumber
            or ""
        ),

        "licenseExpiryDate": (
            data.licenseExpiryDate
            or ""
        ),

        "vehicleCapacity": (
            data.vehicleCapacity
            or ""
        ),

        "experience": (
            data.experience
            or ""
        ),

        "availability": (
            data.availability
            or ""
        ),

        "preferredRoutes": (
            data.preferredRoutes
            or ""
        ),

        "password_hash": password_hash,

        "password_salt": password_salt,

        "status": "ACTIVE",

        "mode": "DEMO",
    }

    DRIVERS.append(driver)

    return {
        "message": "Driver registration successful",

        "driver": safe_driver(
            driver
        ),
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
    with db_connect() as conn:
        rows = conn.execute(
            f"SELECT {HARVEST_COLUMNS} FROM harvests "
            "WHERE status IN ('PUBLISHED', 'AVAILABLE') ORDER BY id DESC"
        ).fetchall()

    return [
        _serialize_harvest(row, _fetch_ai_quality(int(row["id"])))
        for row in rows
    ]


@app.get("/api/harvests/{harvest_id}")
def get_harvest(harvest_id: int):
    harvest = _fetch_harvest(harvest_id)
    if not harvest:
        raise HTTPException(status_code=404, detail="Harvest not found")

    return _serialize_harvest(
        harvest,
        _fetch_ai_quality(harvest_id),
    )


@app.post("/api/harvests")
def create_harvest(data: HarvestIn):
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
        missing = [name for name, value in required.items() if value is None or value == ""]
        if missing:
            raise HTTPException(
                status_code=422,
                detail=f"Incomplete harvest record. Missing: {', '.join(missing)}",
            )

    quantity_kg = data.quantity or 0
    if data.quantity_unit == "quintal":
        quantity_kg *= 100
    elif data.quantity_unit == "tonne":
        quantity_kg *= 1000

    with db_connect() as conn:
        row = conn.execute(
            """
            INSERT INTO harvests (
                crop, variety, quantity, quantity_unit, quantity_kg,
                harvest_date, harvest_time, pickup_readiness, pickup_readiness_date,
                location, latitude, longitude, overall_quality, ripeness,
                visible_damage, size, freshness, estimated_shelf_life, photos,
                packaging_type, package_weight, storage_condition, special_handling,
                special_handling_notes, pickup_date, pickup_time, loading_assistance,
                status, created_at, updated_at
            )
            VALUES (
                %(crop)s, %(variety)s, %(quantity)s, %(quantity_unit)s, %(quantity_kg)s,
                %(harvest_date)s, %(harvest_time)s, %(pickup_readiness)s, %(pickup_readiness_date)s,
                %(location)s, %(latitude)s, %(longitude)s, %(overall_quality)s, %(ripeness)s,
                %(visible_damage)s, %(size)s, %(freshness)s, %(estimated_shelf_life)s, %(photos)s,
                %(packaging_type)s, %(package_weight)s, %(storage_condition)s, %(special_handling)s,
                %(special_handling_notes)s, %(pickup_date)s, %(pickup_time)s, %(loading_assistance)s,
                %(status)s, now(), now()
            )
            RETURNING *
            """,
            {
                "crop": data.crop,
                "variety": data.variety,
                "quantity": data.quantity,
                "quantity_unit": data.quantity_unit,
                "quantity_kg": quantity_kg,
                "harvest_date": data.harvest_date,
                "harvest_time": data.harvest_time,
                "pickup_readiness": data.pickup_readiness,
                "pickup_readiness_date": data.pickup_readiness_date,
                "location": data.location,
                "latitude": data.latitude,
                "longitude": data.longitude,
                "overall_quality": data.overall_quality,
                "ripeness": data.ripeness,
                "visible_damage": data.visible_damage,
                "size": data.size,
                "freshness": data.freshness,
                "estimated_shelf_life": data.estimated_shelf_life,
                "photos": Jsonb(data.photos),
                "packaging_type": data.packaging_type,
                "package_weight": data.package_weight,
                "storage_condition": data.storage_condition,
                "special_handling": data.special_handling,
                "special_handling_notes": data.special_handling_notes,
                "pickup_date": data.pickup_date,
                "pickup_time": data.pickup_time,
                "loading_assistance": data.loading_assistance,
                "status": data.status,
            },
        ).fetchone()
        conn.commit()

    return _serialize_harvest(row)


# ============================================================
# REAL IMAGE-BASED QUALITY ANALYSIS
# ============================================================

QUALITY_FIELDS = [
    "crop_name",
    "overall_quality",
    "visible_damage",
    "ripeness_maturity",
    "size",
    "freshness_condition",
    "estimated_shelf_life",
]


def _normalise_quality_value(value: object) -> str:
    text = str(value or "").strip()
    if text.lower() in {
        "not determinable from image",
        "not determinable",
        "unavailable",
    }:
        return "Not determinable"
    return text


def _extract_json(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        cleaned = cleaned.rsplit("```", 1)[0].strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start:end + 1])
        raise


def _image_payload(image: str) -> tuple[str, bytes]:
    if not isinstance(image, str) or not image.startswith("data:image/"):
        raise ValueError("Each photo must be a base64 data URL produced by the camera.")

    try:
        header, encoded = image.split(",", 1)
        mime = header.split(";", 1)[0].replace("data:", "").lower()
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, base64.binascii.Error) as exc:
        raise ValueError("One of the captured photos is invalid.") from exc

    if mime not in {"image/jpeg", "image/png", "image/webp"}:
        raise ValueError("Unsupported image format. Use JPEG, PNG, or WebP.")
    if not raw:
        raise ValueError("One of the captured photos is empty.")
    if len(raw) > 12 * 1024 * 1024:
        raise ValueError("A captured photo is too large. Please retake it.")

    return mime, raw


def _analyze_with_openrouter(images: List[str], crop_hint: Optional[str], request_id: str) -> dict:
    """Analyze the actual camera photos with the existing vision provider."""
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured.")

    base_url = os.getenv(
        "OPENROUTER_BASE_URL",
        "https://openrouter.ai/api/v1",
    ).strip().rstrip("/")
    if not base_url:
        raise RuntimeError("OPENROUTER_BASE_URL is not configured.")
    if not base_url.endswith("/chat/completions"):
        base_url = f"{base_url}/chat/completions"

    model = os.getenv("OPENROUTER_VISION_MODEL", "google/gemini-2.5-flash").strip()
    if not model:
        raise RuntimeError("OPENROUTER_VISION_MODEL is not configured.")

    content = [{
        "type": "text",
        "text": (
            "You are analyzing real farmer-captured RGB photographs of fresh produce. "
            "Inspect EVERY supplied photograph and compare the views before answering. "
            "The photographs are the source of truth for visible characteristics. "
            "Do not return a canned, demo, generic, or placeholder answer. "
            "For each field, use the strongest visible evidence across all images. "
            "IMPORTANT: basic visible properties should normally be assessed when the produce "
            "is clearly visible. Do not say 'Not determinable from image' merely because an "
            "exact laboratory measurement is unavailable. Use that phrase only when the actual "
            "photographs do not provide enough visual evidence for that specific property. "
            "Assess: crop identity; overall visual quality; EXTERNAL/VISIBLE damage such as "
            "bruising, cuts, cracks, rot-like areas, mold-like growth, discoloration, insect "
            "damage when visually identifiable, deformation; visible ripeness/maturity using "
            "color, size, surface and other visual cues; approximate visible size/category only "
            "when the photos support it; and freshness/condition using visible cues such as "
            "firmness/appearance, shriveling, discoloration or decay. "
            "Do not claim internal damage is detected or ruled out by a normal RGB phone camera; "
            "internal damage is outside the scope of this assessment. "
            "Do NOT estimate shelf life from the pixels. Shelf life will be calculated separately "
            "from the structured quality observations plus real harvest/storage information. "
            "Therefore return the shelf-life field as exactly 'CALCULATE_FROM_QUALITY_AND_HARVEST' "
            "and do not invent a number in this vision step. "
            "Return ONLY one valid JSON object with exactly these fields: "
            "crop_name, overall_quality, visible_damage, ripeness_maturity, size, "
            "freshness_condition, estimated_shelf_life, confidence. "
            "confidence must be a number from 0 to 100. Do not wrap JSON in markdown. "
            f"Farmer crop hint (context only, do not blindly trust it): {crop_hint or 'unknown'}."
        ),
    }]

    hashes = []
    mime_sizes = []
    for image in images:
        mime, raw = _image_payload(image)
        digest = hashlib.sha256(raw).hexdigest()
        hashes.append(digest)
        mime_sizes.append(len(raw))
        content.append({
            "type": "image_url",
            "image_url": {"url": image},
        })

    print(
        f"[quality:{request_id}] provider=openrouter model={model} "
        f"images={len(images)} mime_sizes={mime_sizes} "
        f"unique_images={len(set(hashes))}"
    )

    body = json.dumps({
        "model": model,
        "max_tokens": 12000,
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a careful produce-quality vision analyst. "
                    "Base visible assessments on the supplied photographs. "
                    "Never substitute a default or demo result."
                ),
            },
            {"role": "user", "content": content},
        ],
    }).encode("utf-8")

    request = urllib.request.Request(
        base_url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AgriOptix",
        },
    )

    print(f"[quality:{request_id}] openrouter_request_started max_tokens=12000")
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        provider_body = exc.read().decode("utf-8", errors="replace")[:1200]
        print(
            f"[quality:{request_id}] openrouter_http_error "
            f"status={exc.code} body={provider_body}"
        )
        raise RuntimeError(f"AI provider returned HTTP {exc.code}.") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        print(
            f"[quality:{request_id}] openrouter_network_error "
            f"type={type(exc).__name__}"
        )
        raise RuntimeError("AI vision service request failed.") from exc

    print(f"[quality:{request_id}] openrouter_response_received")
    try:
        choice = payload["choices"][0]
        message = choice["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        print(f"[quality:{request_id}] invalid_provider_response")
        raise RuntimeError("AI provider returned an unexpected response.") from exc

    if isinstance(message, list):
        parts = []
        for part in message:
            if isinstance(part, dict):
                text = part.get("text")
                if text:
                    parts.append(str(text))
        message = "".join(parts)

    if not isinstance(message, str) or not message.strip():
        raise RuntimeError("AI provider returned an empty response.")

    result = _extract_json(message)
    print(f"[quality:{request_id}] response_parsed=true")
    return result


def _estimate_shelf_life_with_openrouter(
    quality: dict,
    harvest: dict,
    request_id: str,
) -> str:
    """Estimate a shelf-life RANGE from structured quality + real harvest data.

    This is deliberately a second structured reasoning step: the vision model does not
    infer shelf life directly from pixels. The estimate is based on the actual quality
    observations, storage condition and harvest timestamp supplied by the database.
    """
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured.")

    base_url = os.getenv(
        "OPENROUTER_BASE_URL",
        "https://openrouter.ai/api/v1",
    ).strip().rstrip("/")
    if not base_url:
        raise RuntimeError("OPENROUTER_BASE_URL is not configured.")
    if not base_url.endswith("/chat/completions"):
        base_url = f"{base_url}/chat/completions"

    model = os.getenv("OPENROUTER_VISION_MODEL", "google/gemini-2.5-flash").strip()
    if not model:
        raise RuntimeError("OPENROUTER_VISION_MODEL is not configured.")

    now = datetime.now(timezone.utc).isoformat()
    structured = {
        "crop_name": quality.get("crop_name"),
        "overall_quality": quality.get("overall_quality"),
        "visible_damage": quality.get("visible_damage"),
        "ripeness_maturity": quality.get("ripeness_maturity"),
        "size": quality.get("size"),
        "freshness_condition": quality.get("freshness_condition"),
        "storage_condition": harvest.get("storage_condition"),
        "harvest_date": harvest.get("harvest_date"),
        "harvest_time": harvest.get("harvest_time"),
        "quantity_kg": harvest.get("quantity_kg"),
        "market_price_per_kg": harvest.get("market_price_per_kg"),
        "current_time_utc": now,
    }

    prompt = (
        "Calculate an evidence-based ESTIMATED SHELF-LIFE RANGE for this specific harvest. "
        "This is NOT a visual-only task: do not infer shelf life from pixels and do not use "
        "a generic demo range. Use the structured quality observations produced from the actual "
        "photos, plus the real harvest/storage data below. Consider crop type, maturity, overall "
        "quality, visible external damage, freshness, storage condition, harvest date/time and "
        "elapsed time. Quantity and market price are context only and must not be used to invent "
        "a shelf-life number. If some quality field is unavailable, use the other reliable fields "
        "rather than fabricating the missing field. "
        "Return a practical RANGE, not a single number, such as 'X–Y days'. "
        "Use your agricultural/post-harvest knowledge to choose a defensible range for this exact "
        "combination of inputs. The result is an AI estimate, not a laboratory guarantee. "
        "If there is genuinely insufficient information to estimate a range, return exactly "
        "'Not determinable'. Return ONLY JSON: {\"estimated_shelf_life\": \"...\"}.\n\n"
        f"Structured inputs:\n{json.dumps(structured, ensure_ascii=False, default=str)}"
    )

    body = json.dumps({
        "model": model,
        "max_tokens": 500,
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an agricultural post-harvest reasoning assistant. "
                    "Use only the supplied structured observations and harvest metadata. "
                    "Never use a canned/default shelf-life value."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    }).encode("utf-8")

    request = urllib.request.Request(
        base_url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AgriOptix",
        },
    )

    print(f"[quality:{request_id}] shelf_life_calculation_started model={model}")
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        provider_body = exc.read().decode("utf-8", errors="replace")[:1200]
        print(
            f"[quality:{request_id}] shelf_life_provider_http_error "
            f"status={exc.code} body={provider_body}"
        )
        raise RuntimeError("Shelf-life calculation service failed.") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        print(
            f"[quality:{request_id}] shelf_life_provider_network_error "
            f"type={type(exc).__name__}"
        )
        raise RuntimeError("Shelf-life calculation service is unreachable.") from exc

    try:
        choice = payload["choices"][0]
        message = choice["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("Shelf-life calculation returned an unexpected response.") from exc

    if isinstance(message, list):
        parts = []
        for part in message:
            if isinstance(part, dict) and part.get("text"):
                parts.append(str(part["text"]))
        message = "".join(parts)

    if not isinstance(message, str) or not message.strip():
        raise RuntimeError("Shelf-life calculation returned an empty response.")

    parsed = _extract_json(message)
    shelf_life = str(parsed.get("estimated_shelf_life") or "").strip()
    if not shelf_life:
        raise RuntimeError("Shelf-life calculation returned no estimate.")

    print(f"[quality:{request_id}] shelf_life_calculation_completed value={shelf_life!r}")
    return shelf_life


# Backward-compatible internal name: the route calls this helper, but the
# implementation now uses OpenRouter rather than the exhausted OpenAI quota.
def _analyze_with_openai(images: List[str], crop_hint: Optional[str], request_id: str) -> dict:
    return _analyze_with_openrouter(images, crop_hint, request_id)


def _recover_harvest_from_workflow_snapshot(snapshot: object, images: List[str], request_id: str) -> dict:
    """Persist the current frontend workflow harvest when localStorage contains a stale/missing id.

    This is recovery for a real farmer workflow record, not demo data: the snapshot came from the
    current Add Harvest form and the resulting record is immediately read back from PostgreSQL.
    """
    if not isinstance(snapshot, dict):
        raise HTTPException(
            status_code=404,
            detail="Harvest record is no longer available. Please return to Add Harvest and save it again.",
        )

    payload = dict(snapshot)
    payload.pop("id", None)
    payload["photos"] = images or payload.get("photos") or []

    try:
        model = HarvestIn(**payload)
    except Exception as exc:
        raise HTTPException(
            status_code=409,
            detail="The selected harvest record is incomplete. Please return to Add Harvest and save it again.",
        ) from exc

    try:
        recovered = create_harvest(model)
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[quality:{request_id}] harvest_recovery_failed type={type(exc).__name__}")
        raise HTTPException(
            status_code=503,
            detail="Unable to restore the current harvest record. Please try again.",
        ) from exc

    recovered_id = recovered.get("id") if isinstance(recovered, dict) else None
    print(f"[quality:{request_id}] harvest_recovered_to_database={recovered_id}")
    if not isinstance(recovered_id, int):
        raise HTTPException(status_code=503, detail="Harvest was not saved correctly. Please try again.")

    fresh = _fetch_harvest(recovered_id)
    if not fresh:
        raise HTTPException(status_code=503, detail="Harvest was saved but could not be reloaded. Please try again.")
    return fresh


@app.post("/api/quality/analyze")
def quality_analyze(data: dict):
    request_id = uuid.uuid4().hex[:12]
    images = data.get("images") or []

    print(f"[quality:{request_id}] request_received images={len(images)}")

    if not 2 <= len(images) <= 4:
        raise HTTPException(
            status_code=422,
            detail="Capture 2–4 produce photos before starting AI analysis.",
        )

    harvest_id = data.get("harvest_id")
    harvest = _fetch_harvest(harvest_id) if isinstance(harvest_id, int) else None

    # The browser persists workflow state in localStorage. If it contains an id from an
    # older backend/database session, recover the CURRENT harvest snapshot into PostgreSQL
    # instead of returning a misleading 404 or using demo data.
    if not harvest:
        harvest = _recover_harvest_from_workflow_snapshot(
            data.get("harvest"),
            images,
            request_id,
        )
        harvest_id = harvest.get("id")

    try:
        image_hashes = []
        for image in images:
            _, raw = _image_payload(image)
            image_hashes.append(hashlib.sha256(raw).hexdigest())

        if len(set(image_hashes)) != len(image_hashes):
            raise ValueError("Duplicate photo content detected. Capture different views of the produce.")

        raw = _analyze_with_openai(
            images,
            data.get("crop") or harvest.get("crop"),
            request_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except (RuntimeError, KeyError, json.JSONDecodeError) as exc:
        print(f"[quality:{request_id}] analysis_failed type={type(exc).__name__}")
        raise HTTPException(
            status_code=503,
            detail="AI quality analysis failed. Please try again.",
        ) from exc

    if any(key not in raw for key in QUALITY_FIELDS):
        print(f"[quality:{request_id}] invalid_response_missing_fields")
        raise HTTPException(
            status_code=502,
            detail="AI quality analysis returned an invalid response. Please try again.",
        )

    try:
        confidence = float(raw.get("confidence"))
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=502,
            detail="AI quality analysis returned an invalid confidence value. Please try again.",
        ) from exc

    result = {
        key: _normalise_quality_value(raw[key])
        for key in QUALITY_FIELDS
    }

    # The vision step is intentionally forbidden from inventing shelf life.
    # Calculate the final range from the actual structured quality result and
    # the real harvest/storage record using the same configured AI provider.
    try:
        result["estimated_shelf_life"] = _estimate_shelf_life_with_openrouter(
            result,
            harvest,
            request_id,
        )
    except RuntimeError as exc:
        print(f"[quality:{request_id}] shelf_life_calculation_failed type={type(exc).__name__}")
        result["estimated_shelf_life"] = "Not determinable"

    result["confidence"] = max(0, min(100, confidence))
    result["analyzed_at"] = datetime.utcnow().isoformat() + "Z"
    result["request_id"] = request_id
    result["harvest_id"] = harvest_id
    result["disclaimer"] = "AI-generated visual assessment — not laboratory verified."

    with db_connect() as conn:
        conn.execute(
            """
            INSERT INTO ai_quality_analysis (
                harvest_id, crop_name, overall_quality, visible_damage,
                ripeness_maturity, size, freshness_condition,
                estimated_shelf_life, confidence, analyzed_at, image_references
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (harvest_id) DO UPDATE SET
                crop_name = EXCLUDED.crop_name,
                overall_quality = EXCLUDED.overall_quality,
                visible_damage = EXCLUDED.visible_damage,
                ripeness_maturity = EXCLUDED.ripeness_maturity,
                size = EXCLUDED.size,
                freshness_condition = EXCLUDED.freshness_condition,
                estimated_shelf_life = EXCLUDED.estimated_shelf_life,
                confidence = EXCLUDED.confidence,
                analyzed_at = EXCLUDED.analyzed_at,
                image_references = EXCLUDED.image_references
            """,
            (
                harvest_id,
                result["crop_name"],
                result["overall_quality"],
                result["visible_damage"],
                result["ripeness_maturity"],
                result["size"],
                result["freshness_condition"],
                result["estimated_shelf_life"],
                result["confidence"],
                result["analyzed_at"],
                Jsonb(data.get("images") or []),
            ),
        )
        conn.execute(
            "UPDATE harvests SET updated_at = now() WHERE id = %s",
            (harvest_id,),
        )
        conn.commit()

    print(f"[quality:{request_id}] saved_to_harvest={harvest_id}")
    return result


# ============================================================
# SHELF-LIFE / PERISHABILITY
# ============================================================


def _parse_shelf_life_range(value: object) -> tuple[Optional[float], Optional[float]]:
    """Parse the AI shelf-life text without turning a range into a fake fixed value."""
    if value is None:
        return None, None

    text = str(value).strip().lower()
    if not text or "not determinable" in text or "unavailable" in text:
        return None, None

    # Normalise common dash variants and decimal commas.
    text = text.replace("–", "-").replace("—", "-").replace(",", ".")

    import re as _re

    numbers = [float(n) for n in _re.findall(r"\d+(?:\.\d+)?", text)]
    if not numbers:
        return None, None

    # Convert common AI output units to days. The AI result itself is still
    # returned unchanged to the frontend.
    unit_factor = 1.0
    if "week" in text:
        unit_factor = 7.0
    elif "hour" in text:
        unit_factor = 1.0 / 24.0

    numbers = [number * unit_factor for number in numbers]

    if "less than" in text or text.startswith("<"):
        upper = numbers[0]
        return 0.0, upper

    if "+" in text or "more than" in text or text.startswith(">"):
        lower = numbers[0]
        return lower, lower

    if len(numbers) >= 2:
        low, high = numbers[0], numbers[1]
        if high < low:
            low, high = high, low
        return low, high

    return numbers[0], numbers[0]


def _harvest_ai_quality(harvest: Optional[dict]) -> Optional[dict]:
    if not harvest:
        return None
    harvest_id = harvest.get("id")
    if isinstance(harvest_id, int):
        return _fetch_ai_quality(harvest_id)
    return None


def _parse_harvest_datetime(
    harvest: dict,
    timezone_offset_minutes: Optional[int] = None,
) -> Optional[datetime]:
    """Parse the stored harvest date/time and attach the browser's local offset.

    Harvest date/time values in the existing workflow are stored without a timezone.
    When the browser supplies its offset, this keeps the backend calculation aligned
    with the same local harvest time shown by the farmer instead of treating it as UTC.
    """
    date_value = str(harvest.get("harvest_date") or "").strip()
    time_value = str(harvest.get("harvest_time") or "").strip()
    if not date_value or not time_value:
        return None

    candidates = [
        f"{date_value}T{time_value}",
        f"{date_value} {time_value}",
    ]
    for candidate in candidates:
        try:
            parsed = datetime.fromisoformat(candidate)
        except ValueError:
            continue

        if parsed.tzinfo is not None:
            return parsed

        if timezone_offset_minutes is not None:
            # JS getTimezoneOffset() is UTC - local, so the Python UTC offset is
            # its negative.
            local_tz = timezone(-timedelta(minutes=timezone_offset_minutes))
            return parsed.replace(tzinfo=local_tz)

        return parsed.replace(tzinfo=timezone.utc)

    return None


def _perishability_status(remaining: float, reference_life: float) -> str:
    if remaining <= 0:
        return "EXPIRED"
    ratio = remaining / max(reference_life, 0.0001)
    if ratio <= 0.25:
        return "HIGH"
    if ratio <= 0.60:
        return "MEDIUM"
    return "LOW"


def _perishability_message(status: str) -> str:
    messages = {
        "LOW": "Freshness is currently stable. Normal selling window available.",
        "MEDIUM": "Perishability is increasing. Consider selling within the recommended window.",
        "HIGH": "Selling sooner can help reduce expected value loss.",
        "EXPIRED": "Estimated shelf-life window has passed. Quality verification is recommended before sale.",
    }
    return messages[status]


def _market_price_per_kg(harvest: dict) -> Optional[float]:
    # The current harvest schema does not contain a market-price field.
    # Never substitute the project's demo buyer prices for a real harvest.
    value = harvest.get("market_price_per_kg")
    try:
        parsed = float(value) if value is not None else None
    except (TypeError, ValueError):
        parsed = None
    return parsed if parsed is not None and parsed > 0 else None


@app.post("/api/perishability/predict")
def perishability(data: dict):
    """Return a real shelf-life snapshot derived from the selected harvest + AI result."""
    harvest_id = data.get("harvest_id")

    timezone_offset_minutes: Optional[int] = None
    try:
        raw_offset = data.get("timezone_offset_minutes")
        if raw_offset is not None:
            timezone_offset_minutes = int(raw_offset)
            if not -840 <= timezone_offset_minutes <= 840:
                timezone_offset_minutes = None
    except (TypeError, ValueError):
        timezone_offset_minutes = None
    if not isinstance(harvest_id, int):
        raise HTTPException(status_code=422, detail="A valid harvest_id is required for shelf-life analysis.")

    harvest = _fetch_harvest(harvest_id)
    if not harvest:
        raise HTTPException(status_code=404, detail="Harvest not found for shelf-life analysis.")

    ai = _harvest_ai_quality(harvest)
    if not ai:
        raise HTTPException(status_code=409, detail="Complete AI Quality Analysis before using perishability.")

    shelf_text = ai.get("estimated_shelf_life")
    low_life, high_life = _parse_shelf_life_range(shelf_text)
    if low_life is None or high_life is None or high_life <= 0:
        raise HTTPException(status_code=409, detail="AI shelf-life estimate unavailable for this harvest.")

    harvested_at = _parse_harvest_datetime(
        harvest,
        timezone_offset_minutes=timezone_offset_minutes,
    )
    if harvested_at is None:
        raise HTTPException(status_code=409, detail="Harvest time unavailable")

    now = datetime.now(timezone.utc)
    if harvested_at.tzinfo is None:
        harvested_at = harvested_at.replace(tzinfo=timezone.utc)
    elapsed_days = max(0.0, (now - harvested_at.astimezone(timezone.utc)).total_seconds() / 86400.0)

    # For an AI range, the countdown uses its midpoint only as a transparent
    # derived estimate. The original AI range is returned unchanged.
    midpoint_life = (low_life + high_life) / 2.0
    remaining_low = max(0.0, low_life - elapsed_days)
    remaining_high = max(0.0, high_life - elapsed_days)
    remaining_mid = max(0.0, midpoint_life - elapsed_days)

    status = _perishability_status(remaining_mid, midpoint_life)

    quantity = harvest.get("quantity_kg")
    try:
        quantity_kg = float(quantity) if quantity is not None else None
    except (TypeError, ValueError):
        quantity_kg = None

    market_price = _market_price_per_kg(harvest)
    value_at_risk = None
    value_basis = None
    if quantity_kg is not None and quantity_kg > 0 and market_price is not None:
        market_value = quantity_kg * market_price
        deterioration_fraction = min(1.0, max(0.0, elapsed_days / high_life))
        value_at_risk = round(market_value * deterioration_fraction, 2)
        value_basis = "Estimated from harvest quantity, current buyer price data, and elapsed time within the AI shelf-life window."

    result = {
        "harvest_id": harvest.get("id"),
        "crop_name": ai.get("crop_name") or harvest.get("crop"),
        "overall_quality": ai.get("overall_quality"),
        "visible_damage": ai.get("visible_damage"),
        "ripeness_maturity": ai.get("ripeness_maturity"),
        "size": ai.get("size"),
        "freshness_condition": ai.get("freshness_condition"),
        "ai_confidence": ai.get("confidence"),
        "ai_estimated_shelf_life": str(shelf_text).strip(),
        "shelf_life_min_days": low_life,
        "shelf_life_max_days": high_life,
        "remaining_shelf_life_days": round(remaining_mid, 4),
        "remaining_shelf_life_min_days": round(remaining_low, 4),
        "remaining_shelf_life_max_days": round(remaining_high, 4),
        "elapsed_days": round(elapsed_days, 4),
        "harvested_at": harvested_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        "calculated_at": now.isoformat().replace("+00:00", "Z"),
        "status": status,
        "urgency": status,
        "recommendation": _perishability_message(status),
        "expected_value_loss": value_at_risk,
        "value_loss_basis": value_basis,
        "market_price_per_kg": market_price,
        "quantity_kg": quantity_kg,
        "storage_condition": harvest.get("storage_condition"),
        "mode": "LIVE_AI_DATA",
    }

    return result

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
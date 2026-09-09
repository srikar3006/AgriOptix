# AgriOptix
## AI-Powered Farm-to-Market Optimization & Execution Platform

This repository is an end-to-end hackathon prototype implementing the AgriOptix
closed loop: harvest → quality → perishability → market matching → aggregation
→ routing → optimization → execution → settlement → learning.

### Current prototype
- Next.js + TypeScript frontend
- FastAPI backend
- Deterministic demo intelligence interfaces
- Explainable perishability-aware realized-return optimization
- Farmer, market, execution, settlement and learning views
- Demo data and optimization test
- Docker Compose
- PostgreSQL/PostGIS-ready schema
- External service configuration through `.env`

**Important:** ML, routing and market values in DEMO MODE are simulated. They
are not claims of real-world model validation.

### Run locally

Backend:
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Docker
```bash
docker compose up --build
```

### Core optimization demonstration
Buyer A: 28 - 6 - 2.5 = 19.5/kg
Buyer B: 26 - 2.7 - 0.7 = 22.6/kg

Therefore Buyer B is selected even though Buyer A quotes more.

### API
- GET /health
- POST /api/auth/register
- POST /api/auth/login
- GET/POST /api/harvests
- POST /api/quality/analyze
- POST /api/perishability/predict
- GET /api/markets
- GET /api/buyers
- POST /api/aggregation/cluster
- POST /api/routes/calculate
- POST /api/optimization/run
- GET /api/optimization/1
- POST /api/orders
- PATCH /api/orders/1/status
- POST /api/delivery/verify
- GET /api/settlements/1
- POST /api/feedback
- POST /api/voice/transcribe
- POST /api/voice/respond
- GET /api/operations/kpis

### Production extension points
Replace the demo services with:
- YOLO/EfficientNet/OpenCV quality inference
- XGBoost/LightGBM perishability model
- PostGIS + DBSCAN/HDBSCAN aggregation
- OSRM/OpenStreetMap routing
- OR-Tools/Pyomo MILP solver
- Whisper/Bhashini/Indic TTS voice stack
- PostgreSQL persistence and JWT/RBAC

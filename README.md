# Weather-Aware Truck Routing Platform

A full-stack logistics and routing engine built with **React**, **Material UI**, **Django**, and **Django REST Framework**. The application evaluates weather hazards along alternative commercial trucking corridors, computes dynamic risk scores factoring in gross vehicle weight and checkpoint ETAs, and recommends optimal routes balancing travel time against severe meteorological risks.

---

## Key Features

- **Dynamic Route Generation:** Generates up to three distinct driving corridors between origin and destination using the OSRM routing engine, incorporating geometric offset detours if fewer alternatives exist.
- **Temporal Weather Sampling:** Calculates accurate checkpoint arrival times (ETAs) along each route based on cumulative mileage and travel speed, sampling hourly weather conditions specifically at the truck's scheduled passage.
- **Gross Vehicle Weight Risk Assessment:** Evaluates sustained wind speed, rainfall intensity, and snowfall rates against commercial truck safety limits, escalating risk levels for heavy loads prone to loss of control or overturning.
- **Deterministic Route Recommendation:** Implements a strict hierarchical decision engine to select the safest route (evaluating No Travel miles, Severe miles, High miles, distance-weighted average risk, and total transit time).
- **Interactive Map & Corridor Radar Heatmap:** Visualizes driving paths, color-coded checkpoint hazards, Google Maps-style route inspection tooltips, and a 0–48 hour forecast simulation slider.
- **Production-Ready Architecture:** Packaged for single-container cloud hosting with WhiteNoise, optional Redis caching, upstream rate-limit protection, and an automated unit test suite.

---

## Technical Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Material UI (MUI v6), Vite | Responsive dispatcher dashboard, dark theme design system |
| **Mapping** | Leaflet, React-Leaflet | Route geometry visualization, radar corridors, interactive markers |
| **Backend** | Python 3.12, Django 5, Django REST Framework | RESTful trip planning API, validation, routing & risk algorithms |
| **Caching** | Django Cache (LocMem / Redis) | Shared caching for geocoding (24h) and weather data (15 min) |
| **Deployment** | WhiteNoise, Gunicorn, Docker Compose | Single-service container deployment, static asset bundling |
| **Upstream APIs** | Nominatim, OSRM, Open-Meteo | Zero-key geocoding, road routing, and hourly atmospheric forecasts |

---

## Domain Risk & Decision Rules

### 1. Checkpoint Hazard Thresholds

Conditions at each checkpoint are classified into five discrete safety tiers. The overall checkpoint risk reflects the **worst condition** among sustained wind, rain, and snow.

| Risk Level | Sustained Wind Speed | Rain Precipitation Rate | Snowfall Rate |
| :--- | :--- | :--- | :--- |
| **Low (0)** | < 25 mph | < 0.10 in/hr | < 0.5 in/hr |
| **Moderate (1)** | 25 – 34 mph | 0.10 – 0.25 in/hr | 0.5 – 1.0 in/hr |
| **High (2)** | 35 – 44 mph | 0.25 – 0.50 in/hr | 1.0 – 2.0 in/hr |
| **Severe (3)** | 45 – 54 mph | 0.50 – 1.00 in/hr | 2.0 – 3.0 in/hr |
| **No Travel (4)** | $\ge$ 55 mph | > 1.00 in/hr | > 3.0 in/hr |

### 2. Vehicle Weight Escalation Rules

Crosswinds present critical rollover and jackknife hazards for commercial vehicles. The engine applies load-dependent overrides:

- **$\ge$ 55 mph Wind:** Classified as **No Travel** regardless of load weight.
- **45 – 54 mph Wind + Load > 30,000 lb:** Escalated to **No Travel (Level 4)**.
- **35 – 44 mph Wind + Load > 40,000 lb:** Escalated to **Severe (Level 3)**.

### 3. Route Recommendation Hierarchy

Routes are sorted deterministically using the following prioritization chain:

1. **Fewest No Travel miles:** Absolute priority to eliminate impassable corridors.
2. **Fewest Severe miles:** Minimizes exposure to critical safety hazards.
3. **Fewest High miles:** Breaks ties by minimizing moderate-to-severe hazard exposure.
4. **Lowest distance-weighted average risk:** Rewards consistently safer driving corridors.
5. **Shortest travel time:** Selects the fastest path when weather safety metrics tie.

---

## Getting Started

### Option 1: Docker Compose (Recommended)

Spins up the web service (Django + React served via Gunicorn) along with a dedicated Redis cache container:

```bash
docker compose up --build
```

Access the application in your browser at `http://localhost:8000`.

### Option 2: Local CLI Development

#### Prerequisites
- Python 3.11+
- Node.js 18+

#### 1. Backend Service
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver 8000
```
The REST API will be available at `http://localhost:8000/api/plan`.

#### 2. Frontend Application
```bash
cd frontend
npm install
npm run dev
```
The frontend development server runs on `http://localhost:5173` and proxies API requests to `:8000`.

---

## Automated Testing

The backend includes a comprehensive test suite covering risk boundary conditions, gross load overrides, recommendation tie-breaking, and serializer validation:

```bash
cd backend
python manage.py test routing
```

### Verified Test Cases
- Base meteorological cutoffs across sustained wind, rain, and snowfall rates.
- Load weight escalation thresholds (30,000 lb and 40,000 lb limits).
- Multi-factor worst-condition-wins logic.
- Strict 5-tier recommendation decision hierarchy.
- Input validation (rejection of zero/negative weights and departure dates exceeding the 72-hour forecast horizon).
- Spacing interval parameter defaults and validation.

---

## Production Deployment Architecture

The application is structured for cost-effective, zero-configuration cloud hosting:

- **Single-Service Delivery:** `frontend/dist` is compiled directly into static production assets and served by Django using WhiteNoise. No standalone Node.js runtime is required in production.
- **Cloud Blueprint:** A deployment configuration is provided in `render.yaml` for instantaneous deployment on Render or similar container-native platforms.
- **Caching Strategy:** Geocoded coordinate lookups are cached for 24 hours. Weather forecast blocks are batched in 50-location chunks and cached for 15 minutes to respect upstream rate limits.
- **Rate Limiting:** Django REST Framework applies an anonymous throttle of 30 requests per minute to safeguard public upstream APIs against abuse.

---

## Operational Considerations

1. **Upstream Rate Limits:** OpenStreetMap Nominatim enforces an operating limit of 1 request per second. The backend includes an automated in-process throttle and caching layer to maintain compliance.
2. **Forecast Window:** Open-Meteo high-resolution hourly forecast models operate reliably within a 72-hour window. The backend strictly validates departure times within this timeframe.
3. **Routing Network:** Public OSRM routing instances evaluate standard roadway speeds. Bridge height clearances and hazardous material restrictions should be verified against municipal transport standards.

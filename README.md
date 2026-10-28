# Weather-Aware Truck Routing (React + MUI, Django + DRF)

Enter origin, destination, departure time and load weight. The app builds 3 routes, samples weather at each checkpoint at the truck's ETA, scores risk, and recommends a route.

## Run locally
```
cd backend && pip install -r requirements.txt && python manage.py runserver   # API on :8000
cd frontend && npm install && npm run dev                                    # UI on :5173 (proxies /api)
python manage.py test routing   # from backend/: risk-rule and API tests
```
## Deploy (single service)
`frontend/dist` is committed, so Django serves the UI itself. On Render, create a Blueprint from `render.yaml`. After UI changes: `cd frontend && npm run build` and commit `dist`.

## Docker (with Redis cache)
`docker compose up --build` then open http://localhost:8000. Without `REDIS_URL` the app uses an in-process cache.

## Stack
React 18 + Material UI + Leaflet; Django 5 + Django REST Framework (serializer validation, 30 req/min anonymous throttle); Redis optional.

## How it works
- **APIs (no keys):** Nominatim (geocoding), OSRM (routing, `alternatives=3`; if fewer than 3 come back, detours through offset waypoints fill the gap), Open-Meteo (hourly wind, rain, snowfall).
- **Checkpoints:** every 10 / 25 / 50 miles (selectable) plus the destination. ETA = departure + route duration scaled by distance. Weather is read for the hour of the ETA.
- **Risk:** worst of wind, rain, snow per checkpoint (`routing/risk.py`). Load rules: 55+ mph is No Travel; 45-54 mph over 30,000 lb is No Travel; 35-44 mph over 40,000 lb is Severe. Wind cut points are lower-inclusive; rain/snow upper-inclusive (1.00 in/hr is Severe, above is No Travel).
- **Miles per level:** each checkpoint covers the miles halfway to its neighbours.
- **Recommendation:** strict hierarchy matching the assessment specification: (1) Fewest No Travel miles, (2) Fewest Severe miles, (3) Fewest High miles, (4) Lowest distance-weighted average risk, (5) Shortest travel time. The UI states which criterion decided it.
- **Heatmap:** blurred circles at every checkpoint, coloured by the risk at that spot N hours after departure (0-48 slider).

## Limits
OSRM's public server has no truck profile (no height/weight restrictions). Open-Meteo wind is 10 m sustained speed, not gusts. Departure must be within 72 h (forecast window). Free public APIs are rate-limited; weather is cached 15 minutes.

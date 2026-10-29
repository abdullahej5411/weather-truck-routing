"""Geocoding (Nominatim), routing (OSRM), weather (Open-Meteo) and route analysis."""
import datetime as dt
import math
import time
import urllib.parse

import requests
from django.core.cache import cache

from .risk import LEVELS, assess

UA = {"User-Agent": "spotter-weather-routing-assessment/1.0"}
EARTH_MI = 3958.8
_last_geocode = 0.0


def hav(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * EARTH_MI * math.asin(math.sqrt(h))


def geocode(q):
    global _last_geocode
    key = "geo:" + urllib.parse.quote(q.strip().lower())
    hit = cache.get(key)
    if hit:
        return hit
    time.sleep(max(0, 1.1 - (time.time() - _last_geocode)))  # Nominatim: max 1 req/s
    _last_geocode = time.time()
    last_exc = None
    for attempt in range(3):
        try:
            r = requests.get("https://nominatim.openstreetmap.org/search",
                             params={"q": q, "format": "json", "limit": 1}, headers=UA, timeout=10)
            r.raise_for_status()
            data = r.json()
            if not data:
                raise ValueError(f"Could not find a location for “{q}”. Try adding the state or country.")
            out = {"name": data[0]["display_name"], "lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}
            cache.set(key, out, 86400)
            return out
        except requests.RequestException as exc:
            last_exc = exc
            if attempt < 2:
                time.sleep(1.0 + attempt)
    raise requests.RequestException(f"Nominatim geocoding failed: {last_exc}") from last_exc


def _osrm(points, alternatives=False):
    """Call OSRM with up to 2 retries (public server is occasionally slow)."""
    coords = ";".join(f"{lon},{lat}" for lat, lon in points)
    url = f"https://router.project-osrm.org/route/v1/driving/{coords}"
    params = {"alternatives": "3" if alternatives else "false",
              "overview": "full", "geometries": "geojson"}
    last_exc = None
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, headers=UA, timeout=30)
            r.raise_for_status()
            data = r.json()
            if data.get("code") != "Ok":
                raise ValueError("No drivable route found between those locations.")
            return [{"coords": [(y, x) for x, y in rt["geometry"]["coordinates"]],
                     "miles": rt["distance"] / 1609.344, "hours": rt["duration"] / 3600}
                    for rt in data["routes"]]
        except requests.RequestException as exc:
            last_exc = exc
            if attempt < 2:
                time.sleep(2 ** attempt)  # 1s, 2s back-off
    raise requests.RequestException(f"OSRM routing failed after 3 attempts: {last_exc}") from last_exc


def get_routes(o, d):
    """Up to 3 distinct routes: OSRM alternatives first, then detours through offset waypoints."""
    a, b = (o["lat"], o["lon"]), (d["lat"], d["lon"])
    routes = _osrm([a, b], True)[:3]
    mx, my, dx, dy = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, b[0] - a[0], b[1] - a[1]
    for f in (0.15, -0.15, 0.3, -0.3):
        if len(routes) >= 3:
            break
        try:
            cand = _osrm([a, (mx - dy * f, my + dx * f), b])[0]
        except Exception:
            continue
        if all(abs(cand["miles"] - r["miles"]) / r["miles"] > 0.01 or
               abs(cand["hours"] - r["hours"]) / r["hours"] > 0.01 for r in routes):
            routes.append(cand)
    return routes


def sample(coords, total_mi, step):
    """Checkpoints at mile 0, step, 2*step ... and the destination."""
    cum = [0.0]
    for p, q in zip(coords, coords[1:]):
        cum.append(cum[-1] + hav(p, q))
    scale = (total_mi / cum[-1]) if cum[-1] else 1
    targets = [m for m in range(0, int(total_mi), step) if total_mi - m >= 1] + [total_mi]
    pts, j = [], 0
    for m in targets:
        t = m / scale
        while j < len(cum) - 2 and cum[j + 1] < t:
            j += 1
        seg = (cum[j + 1] - cum[j]) or 1e-9
        f = min(max((t - cum[j]) / seg, 0), 1)
        p, q = coords[j], coords[j + 1]
        pts.append({"mile": round(m, 1), "lat": p[0] + (q[0] - p[0]) * f, "lon": p[1] + (q[1] - p[1]) * f})
    return pts


def _k(lat, lon):
    return (round(lat, 2), round(lon, 2))


def fetch_weather(points):
    """Hourly wind (mph), rain and snowfall (in/hr) per location; batched and cached for 15 min.
    Retries on failure, then raises: the app never shows invented weather."""
    out, need = {}, []
    for lat, lon in points:
        k = _k(lat, lon)
        hit = cache.get("wx:%s,%s" % k)
        if hit:
            out[k] = hit
        elif k not in need and k not in out:
            need.append(k)

    for i in range(0, len(need), 30):
        chunk = need[i:i + 30]
        data, last_exc = None, None
        for attempt in range(3):
            try:
                r = requests.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={
                        "latitude": ",".join(str(c[0]) for c in chunk),
                        "longitude": ",".join(str(c[1]) for c in chunk),
                        "hourly": "wind_speed_10m,rain,snowfall",
                        "wind_speed_unit": "mph",
                        "precipitation_unit": "inch",
                        "forecast_days": 5,
                        "timezone": "UTC",
                    },
                    headers=UA,
                    timeout=15,
                )
                r.raise_for_status()
                data = r.json()
                break
            except requests.RequestException as exc:
                last_exc = exc
                if attempt < 2:
                    time.sleep(1.5 * (attempt + 1))
        if data is None:  # never substitute invented weather: fail with a clear error instead
            raise requests.RequestException(f"Open-Meteo weather request failed: {last_exc}") from last_exc
        for k, d in zip(chunk, data if isinstance(data, list) else [data]):
            h = d["hourly"]
            w = {
                "start": dt.datetime.fromisoformat(h["time"][0]).replace(tzinfo=dt.timezone.utc),
                "wind": [v or 0 for v in h["wind_speed_10m"]],
                "rain": [v or 0 for v in h["rain"]],
                "snow": [v or 0 for v in h["snowfall"]],
            }
            out[k] = w
            cache.set("wx:%s,%s" % k, w, 900)

    return out


def _at(w, t):
    i = int((t - w["start"]).total_seconds() // 3600)
    i = min(max(i, 0), len(w["wind"]) - 1)
    return w["wind"][i], w["rain"][i], w["snow"][i]


def analyse(i, r, wx, depart, weight):
    pts, ms, by = r["pts"], [p["mile"] for p in r["pts"]], [0.0] * 5
    for n, p in enumerate(pts):
        w = wx[_k(p["lat"], p["lon"])]
        eta = depart + dt.timedelta(hours=r["hours"] * p["mile"] / r["miles"])
        vals = _at(w, eta)
        p["level"], p["reasons"] = assess(*vals, weight)
        p["level_name"] = LEVELS[p["level"]]
        p["eta"] = eta.isoformat()
        p["wind"], p["rain"], p["snow"] = (round(v, 2) for v in vals)
        # Heatmap: conditions at this checkpoint 0..48 h after departure.
        fc_assessments = [assess(*_at(w, depart + dt.timedelta(hours=h)), weight) for h in range(49)]
        p["forecast"] = [a[0] for a in fc_assessments]
        p["forecast_weather"] = [[round(v, 2) for v in _at(w, depart + dt.timedelta(hours=h))] for h in range(49)]
        lo = (ms[n - 1] + ms[n]) / 2 if n else ms[0]  # each checkpoint owns the miles around it
        hi = (ms[n] + ms[n + 1]) / 2 if n < len(ms) - 1 else ms[n]
        p["segment_mi"] = round(hi - lo, 1)
        by[p["level"]] += hi - lo
    total = sum(by) or 1
    stride = max(1, len(r["coords"]) // 800)
    geom = r["coords"][::stride] + ([r["coords"][-1]] if (len(r["coords"]) - 1) % stride else [])
    summary = {"miles_by_level": {LEVELS[j]: round(by[j], 1) for j in range(5)},
               "no_travel_mi": by[4], "severe_mi": by[3], "high_mi": by[2],
               "avg_risk": round(sum(j * by[j] for j in range(5)) / total, 2)}
    return {"id": i, "label": f"Route {chr(65 + i)}", "distance_mi": round(r["miles"], 1),
            "duration_h": round(r["hours"], 2), "arrival": (depart + dt.timedelta(hours=r["hours"])).isoformat(),
            "geometry": [[round(a, 5), round(b, 5)] for a, b in geom], "checkpoints": pts,
            "summary": summary, "hours": r["hours"], "weight_lb": weight}


def rank_key(r):
    """Spec preference hierarchy:
    1. Fewest No Travel miles (critical safety block)
    2. Fewest Severe miles
    3. Fewest High miles
    4. Lowest average risk
    5. Shortest travel time
    """
    s = r["summary"]
    return (round(s["no_travel_mi"], 1), round(s["severe_mi"], 1), round(s["high_mi"], 1),
            round(s["avg_risk"], 2), round(r["hours"], 2))


CRITERIA = [("No Travel miles", "no_travel_mi", "mi"), ("Severe miles", "severe_mi", "mi"),
            ("High miles", "high_mi", "mi"), ("average risk", "avg_risk", "/4"), ("travel time", None, "h")]


def plan_trip(origin, destination, depart, weight, step=25):
    o, d = geocode(origin), geocode(destination)
    raw = get_routes(o, d)
    if step == "auto" or not step:
        longest = max((r["miles"] for r in raw), default=300)
        step = 50 if longest > 600 else (25 if longest > 200 else 10)
    for r in raw:
        r["pts"] = sample(r["coords"], r["miles"], step)
    wx = fetch_weather([(p["lat"], p["lon"]) for r in raw for p in r["pts"]])
    routes = [analyse(i, r, wx, depart, weight) for i, r in enumerate(raw)]
    ranked = sorted(routes, key=rank_key)
    for n, r in enumerate(ranked):
        r["rank"], r["recommended"] = n + 1, n == 0
    best, why = ranked[0], "Only one route was available."
    if len(ranked) > 1:
        a, b = rank_key(best), rank_key(ranked[1])
        why = "All routes tie on weather risk; the fastest was chosen."
        for idx, (name, field, unit) in enumerate(CRITERIA):
            if a[idx] != b[idx]:
                get = (lambda r: r["summary"][field]) if field else (lambda r: r["duration_h"])
                why = (f"Recommended for the lowest {name}: {get(best):.1f} {unit} "
                       f"vs {get(ranked[1]):.1f} {unit} on the next-best route.")
                break
    return {"origin": o, "destination": d, "departure": depart.isoformat(), "interval_mi": step,
            "weight_lb": weight, "routes": routes, "recommended_id": best["id"], "explanation": why,
            "notice": None if len(routes) == 3 else f"The routing API returned only {len(routes)} distinct route(s) for this trip."}

"""Weather risk rules (pure functions, no I/O).

Levels: 0 Low, 1 Moderate, 2 High, 3 Severe, 4 No Travel.
Boundary handling: wind uses lower-inclusive cut points (>=25, 35, 45, 55) because the
spec says ">=55 -> No Travel". Rain/snow use upper-inclusive cut points (e.g. 1.00 in/hr is
Severe, >1.00 is No Travel) because the spec says "Low < 0.10" and "No Travel > 1.00".
"""
LEVELS = ["Low", "Moderate", "High", "Severe", "No Travel"]


def wind_level(mph, weight_lb):
    """Returns (level, note). Applies the load rules on top of the base wind table."""
    level = (mph >= 25) + (mph >= 35) + (mph >= 45) + (mph >= 55)
    if 45 <= mph < 55 and weight_lb > 30000:
        return 4, " (load over 30,000 lb)"
    if 35 <= mph < 45 and weight_lb > 40000:
        return 3, " (load over 40,000 lb)"
    return level, ""


def rain_level(inch_hr):
    return (inch_hr >= 0.10) + (inch_hr > 0.25) + (inch_hr > 0.50) + (inch_hr > 1.00)


def snow_level(inch_hr):
    return (inch_hr >= 0.5) + (inch_hr > 1.0) + (inch_hr > 2.0) + (inch_hr > 3.0)


def assess(wind_mph, rain_in_hr, snow_in_hr, weight_lb):
    """Worst of wind/rain/snow. Returns (level, [human-readable reasons])."""
    wl, note = wind_level(wind_mph, weight_lb)
    parts = [
        ("Wind", wl, f"{wind_mph:.0f} mph{note}"),
        ("Rain", rain_level(rain_in_hr), f"{rain_in_hr:.2f} in/hr"),
        ("Snow", snow_level(snow_in_hr), f"{snow_in_hr:.2f} in/hr"),
    ]
    reasons = [f"{n} {txt}: {LEVELS[l]}" for n, l, txt in parts if l > 0]
    return max(l for _, l, _ in parts), reasons

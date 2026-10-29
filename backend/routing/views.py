import datetime as dt
import logging

import requests
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services import plan_trip

log = logging.getLogger(__name__)


class PlanSerializer(serializers.Serializer):
    origin = serializers.CharField(max_length=200)
    destination = serializers.CharField(max_length=200)
    departure = serializers.DateTimeField()
    weight_lb = serializers.FloatField(min_value=1, max_value=150000)
    interval_mi = serializers.CharField(required=False, default="25")

    def validate_departure(self, value):
        now = dt.datetime.now(dt.timezone.utc)
        if not now - dt.timedelta(hours=1) <= value <= now + dt.timedelta(hours=72):
            raise serializers.ValidationError("Must be within the next 72 hours (the weather forecast window).")
        return value

    def validate_interval_mi(self, value):
        s = str(value).strip().lower()
        if s in ("auto", ""):
            return "auto"
        try:
            val = int(s)
            if val in (10, 25, 50):
                return val
        except (ValueError, TypeError):
            pass
        raise serializers.ValidationError("Interval must be 10, 25, 50, or 'auto'.")


@api_view(["POST"])
def plan(request):
    s = PlanSerializer(data=request.data)
    if not s.is_valid():
        field, msgs = next(iter(s.errors.items()))
        return Response({"error": f"{field}: {msgs[0]}"}, status=400)
    d = s.validated_data
    try:
        return Response(plan_trip(d["origin"], d["destination"], d["departure"], d["weight_lb"], d["interval_mi"]))
    except ValueError as e:
        return Response({"error": str(e)}, status=400)
    except requests.RequestException as exc:
        log.error("External API error: %s", exc)
        msg = str(exc)
        hint = "routing" if "osrm" in msg.lower() or "router.project" in msg.lower() else \
               "geocoding" if "nominatim" in msg.lower() else \
               "weather" if "open-meteo" in msg.lower() else "routing or weather"
        return Response(
            {"error": f"The {hint} service is temporarily unavailable. Please wait a moment and try again."},
            status=502,
        )

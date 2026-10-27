import datetime as dt

import requests
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services import plan_trip


class PlanSerializer(serializers.Serializer):
    origin = serializers.CharField(max_length=200)
    destination = serializers.CharField(max_length=200)
    departure = serializers.DateTimeField()
    weight_lb = serializers.FloatField(min_value=1, max_value=150000)
    interval_mi = serializers.ChoiceField(choices=[10, 25, 50], default=25)

    def validate_departure(self, value):
        now = dt.datetime.now(dt.timezone.utc)
        if not now - dt.timedelta(hours=1) <= value <= now + dt.timedelta(hours=72):
            raise serializers.ValidationError("Must be within the next 72 hours (the weather forecast window).")
        return value


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
    except requests.RequestException:
        return Response({"error": "A routing or weather service is unavailable. Try again in a moment."}, status=502)

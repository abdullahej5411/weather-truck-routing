import datetime as dt
import unittest
from unittest import mock

import requests
from django.test import SimpleTestCase

from .risk import assess


class RiskRules(unittest.TestCase):
    def lvl(self, w=0, r=0, s=0, lb=20000):
        return assess(w, r, s, lb)[0]

    def test_thresholds(self):
        self.assertEqual([self.lvl(w=x) for x in (24.9, 25, 35, 45, 55)], [0, 1, 2, 3, 4])
        self.assertEqual([self.lvl(r=x) for x in (0.09, 0.10, 0.25, 0.26, 0.5, 1.0, 1.01)], [0, 1, 1, 2, 2, 3, 4])
        self.assertEqual([self.lvl(s=x) for x in (0.4, 0.5, 1.0, 2.0, 3.0, 3.1)], [0, 1, 1, 2, 3, 4])

    def test_load_rules(self):
        self.assertEqual(self.lvl(w=56, lb=1), 4)       # >=55 mph: any load
        self.assertEqual(self.lvl(w=50, lb=30000), 3)   # not over 30,000
        self.assertEqual(self.lvl(w=50, lb=30001), 4)
        self.assertEqual(self.lvl(w=40, lb=40000), 2)   # not over 40,000
        self.assertEqual(self.lvl(w=40, lb=40001), 3)
        self.assertEqual(self.lvl(w=30, lb=80000), 1)   # rules only apply at 35+ mph

    def test_worst_condition_wins(self):
        self.assertEqual(self.lvl(w=10, r=0.3, s=2.5), 3)


class RecommendationHierarchy(unittest.TestCase):
    def test_ranking_hierarchy(self):
        from .services import rank_key
        # Route 1: 0 severe, 10 high, avg 1.2, 5 hrs
        r1 = {"summary": {"no_travel_mi": 0, "severe_mi": 0, "high_mi": 10, "avg_risk": 1.2}, "hours": 5.0}
        # Route 2: 5 severe, 0 high, avg 1.0, 4 hrs (should lose to r1 because r1 has fewer severe miles)
        r2 = {"summary": {"no_travel_mi": 0, "severe_mi": 5, "high_mi": 0, "avg_risk": 1.0}, "hours": 4.0}
        self.assertLess(rank_key(r1), rank_key(r2))

        # Tie on severe miles (both 0), r3 has fewer high miles
        r3 = {"summary": {"no_travel_mi": 0, "severe_mi": 0, "high_mi": 2, "avg_risk": 1.5}, "hours": 6.0}
        self.assertLess(rank_key(r3), rank_key(r1))

        # Tie on severe and high miles, r4 has lower average risk
        r4 = {"summary": {"no_travel_mi": 0, "severe_mi": 0, "high_mi": 2, "avg_risk": 0.8}, "hours": 6.0}
        self.assertLess(rank_key(r4), rank_key(r3))

        # Tie on severe, high, and avg risk, r5 has shorter travel time
        r5 = {"summary": {"no_travel_mi": 0, "severe_mi": 0, "high_mi": 2, "avg_risk": 0.8}, "hours": 4.5}
        self.assertLess(rank_key(r5), rank_key(r4))


class PlanApi(SimpleTestCase):
    def post(self, **over):
        body = {"origin": "A", "destination": "B", "weight_lb": 40000,
                "departure": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=2)).isoformat(), **over}
        return self.client.post("/api/plan", body, content_type="application/json")

    def test_rejects_bad_weight(self):
        self.assertEqual(self.post(weight_lb=0).status_code, 400)

    def test_rejects_departure_outside_forecast_window(self):
        late = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=9)).isoformat()
        self.assertEqual(self.post(departure=late).status_code, 400)

    @mock.patch("routing.views.plan_trip", return_value={"ok": True})
    def test_valid_request_defaults_interval(self, m):
        self.assertEqual(self.post().status_code, 200)
        self.assertEqual(m.call_args[0][4], 25)

    @mock.patch("routing.views.plan_trip", return_value={"ok": True})
    def test_valid_request_auto_interval(self, m):
        self.assertEqual(self.post(interval_mi="auto").status_code, 200)
        self.assertEqual(m.call_args[0][4], "auto")


class WeatherUpstreamFailure(SimpleTestCase):
    @mock.patch("routing.services.time.sleep")
    @mock.patch("routing.services.requests.get", side_effect=requests.ConnectionError("down"))
    def test_raises_instead_of_inventing_weather(self, _get, _sleep):
        from django.core.cache import cache
        from .services import fetch_weather
        cache.clear()
        with self.assertRaises(requests.RequestException):
            fetch_weather([(41.12, -87.34)])


if __name__ == "__main__":
    unittest.main()

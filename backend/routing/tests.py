import datetime as dt
import unittest
from unittest import mock

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


if __name__ == "__main__":
    unittest.main()

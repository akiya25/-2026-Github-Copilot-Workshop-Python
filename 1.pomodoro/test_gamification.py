from __future__ import annotations

import importlib.util
import unittest
from datetime import date
from pathlib import Path

APP_PATH = Path(__file__).with_name("app.py")
spec = importlib.util.spec_from_file_location("pomodoro_app", APP_PATH)
app = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(app)


class GamificationLogicTest(unittest.TestCase):
    def test_calculate_level(self) -> None:
        self.assertEqual(app.calculate_level(0)["level"], 1)
        self.assertEqual(app.calculate_level(99)["level"], 1)
        self.assertEqual(app.calculate_level(100)["level"], 2)
        self.assertEqual(app.calculate_level(250)["progress_xp"], 50)

    def test_calculate_streak_break_after_gap(self) -> None:
        result = app.calculate_streak("2026-04-10", stored_streak=4, max_streak=5, today=date(2026, 4, 12))
        self.assertEqual(result["streak"], 0)
        self.assertEqual(result["max_streak"], 5)

    def test_update_streak_on_completion_consecutive_day(self) -> None:
        result = app.update_streak_on_completion(
            "2026-04-10", current_streak=2, max_streak=2, completed_on=date(2026, 4, 11)
        )
        self.assertEqual(result["streak"], 3)
        self.assertEqual(result["max_streak"], 3)
        self.assertEqual(result["last_completion"], "2026-04-11")


if __name__ == "__main__":
    unittest.main()

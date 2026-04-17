import sys
import unittest
from pathlib import Path


CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import app


class BuildHtmlTests(unittest.TestCase):
    def test_contains_motion_accessibility(self):
        html = app.build_html()
        self.assertIn("prefers-reduced-motion", html)

    def test_contains_required_visual_feedback_elements(self):
        html = app.build_html()
        self.assertIn("strokeDashoffset", html)
        self.assertIn("--color-calm", html)
        self.assertIn("--color-mid", html)
        self.assertIn("--color-danger", html)
        self.assertIn("mode-focus", html)


if __name__ == "__main__":
    unittest.main()

import sys
import unittest
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from app import build_html


class BuildHtmlTests(unittest.TestCase):
    def test_contains_motion_accessibility(self):
        html = build_html()
        self.assertIn("prefers-reduced-motion", html)
        self.assertIn("animation-duration: 0.001ms", html)
        self.assertIn("transition-duration: 0.001ms", html)
        self.assertIn(".focus-bg::after { animation: none; }", html)
        self.assertIn("const reduceMotion = window.matchMedia", html)

    def test_contains_visual_feedback_progress_animation(self):
        html = build_html()
        self.assertIn("strokeDashoffset", html)

    def test_contains_visual_feedback_color_stages(self):
        html = build_html()
        self.assertIn("--color-calm", html)
        self.assertIn("--color-steady", html)
        self.assertIn("--color-mid", html)
        self.assertIn("--color-danger", html)

    def test_contains_visual_feedback_background_effect(self):
        html = build_html()
        self.assertIn("mode-focus", html)

if __name__ == "__main__":
    unittest.main()

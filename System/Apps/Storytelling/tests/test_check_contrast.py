#!/usr/bin/env python3
"""
Unit tests for check_contrast.py (verify contrast compliance).
Tests: module imports, happy path (passing sample), and failure detection (TEST-7 gate).
"""

import unittest
from pathlib import Path
from tempfile import NamedTemporaryFile
import sys

# Add parent dirs to path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'verify'))

from check_contrast import (
    hex_to_rgb,
    rgb_to_luminance,
    contrast_ratio,
    hex_to_lch,
    parse_variables_css,
)


class TestContrast(unittest.TestCase):
    """Smoke tests for contrast calculation functions."""

    def test_hex_to_rgb_valid(self):
        """Parse hex color to RGB."""
        self.assertEqual(hex_to_rgb('#000000'), (0, 0, 0))
        self.assertEqual(hex_to_rgb('#ffffff'), (255, 255, 255))
        self.assertEqual(hex_to_rgb('#ff0000'), (255, 0, 0))

    def test_hex_to_rgb_invalid(self):
        """Reject invalid hex colors."""
        with self.assertRaises(ValueError):
            hex_to_rgb('#gggggg')
        with self.assertRaises(ValueError):
            hex_to_rgb('#fff')

    def test_rgb_to_luminance(self):
        """Calculate relative luminance per WCAG."""
        # Black should have near-zero luminance
        black_lum = rgb_to_luminance((0, 0, 0))
        self.assertLess(black_lum, 0.01)

        # White should have high luminance
        white_lum = rgb_to_luminance((255, 255, 255))
        self.assertGreater(white_lum, 0.99)

    def test_contrast_ratio_black_white(self):
        """Highest contrast: white on black."""
        black_lum = rgb_to_luminance((0, 0, 0))
        white_lum = rgb_to_luminance((255, 255, 255))
        ratio = contrast_ratio(black_lum, white_lum)
        self.assertGreater(ratio, 20)  # Should be ~21:1

    def test_contrast_ratio_same_colour(self):
        """Same colour has 1:1 contrast."""
        grey_lum = rgb_to_luminance((128, 128, 128))
        ratio = contrast_ratio(grey_lum, grey_lum)
        self.assertAlmostEqual(ratio, 1.0, places=1)

    def test_hex_to_lch_white_black(self):
        """Convert hex to LCH (lightness check for grayscale)."""
        white_l, _, _ = hex_to_lch('#ffffff')
        black_l, _, _ = hex_to_lch('#000000')
        self.assertGreater(white_l, black_l)
        self.assertGreater(white_l, 90)  # White should be > 90 L*
        self.assertLess(black_l, 10)  # Black should be < 10 L*


class TestParseVariables(unittest.TestCase):
    """Test CSS parsing."""

    def test_parse_valid_css(self):
        """Parse valid CSS custom properties."""
        with NamedTemporaryFile(mode='w', suffix='.css', delete=False) as f:
            f.write(""":root {
  --color-ink: #58585a;
  --g-heroes: #c6e9f2;
  --m-fast: 90ms;
}
""")
            f.flush()
            tokens = parse_variables_css(f.name)

        self.assertEqual(tokens['color-ink'], '#58585a')
        self.assertEqual(tokens['g-heroes'], '#c6e9f2')
        self.assertNotIn('m-fast', tokens)  # ms value, not colour

        Path(f.name).unlink()

    def test_parse_real_variables_css(self):
        """Parse the real variables.css file."""
        css_path = root / 'app' / 'css' / 'variables.css'
        if not css_path.exists():
            self.skipTest(f"{css_path} not found")

        tokens = parse_variables_css(str(css_path))

        # Should have ink and group tokens
        self.assertIn('color-ink', tokens)
        self.assertIn('g-structure', tokens)
        self.assertIn('g-heroes', tokens)
        self.assertIn('gray-structure', tokens)


class TestGateChecks(unittest.TestCase):
    """TEST-7: Gate test both ways (passing and failing paths)."""

    def test_sufficient_contrast_passes(self):
        """Text (ink) on light background: should pass 4.5:1."""
        ink = rgb_to_luminance(hex_to_rgb('#58585a'))  # Dark ink
        light_bg = rgb_to_luminance(hex_to_rgb('#ffffff'))  # White
        ratio = contrast_ratio(ink, light_bg)
        self.assertGreaterEqual(ratio, 4.5, f"Dark ink on white should pass: {ratio:.2f}:1")

    def test_insufficient_contrast_fails(self):
        """Text on very similar colour: should fail 4.5:1."""
        grey1 = rgb_to_luminance(hex_to_rgb('#777777'))
        grey2 = rgb_to_luminance(hex_to_rgb('#888888'))
        ratio = contrast_ratio(grey1, grey2)
        self.assertLess(ratio, 4.5, f"Similar greys should fail: {ratio:.2f}:1")

    def test_grayscale_touching_sufficient(self):
        """Grayscale tokens for touching groups: should differ by ≥10 L*."""
        # Sample two grays that should differ
        white_l, _, _ = hex_to_lch('#ffffff')
        grey_l, _, _ = hex_to_lch('#d0d0d0')
        diff = abs(white_l - grey_l)
        self.assertGreaterEqual(diff, 10, f"White and d0d0d0 differ by {diff:.1f} L*")

    def test_grayscale_touching_insufficient(self):
        """Grayscale tokens too similar: should fail ≥10 L*."""
        grey1_l, _, _ = hex_to_lch('#c0c0c0')
        grey2_l, _, _ = hex_to_lch('#c5c5c5')
        diff = abs(grey1_l - grey2_l)
        self.assertLess(diff, 10, f"Similar greys differ by {diff:.1f} L* (< 10)")


if __name__ == '__main__':
    unittest.main()

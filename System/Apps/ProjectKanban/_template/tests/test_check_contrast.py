"""Smoke tests for check_contrast.py (styleguide.spec.md AC-7, TEST-1/TEST-2).

Confirms the contrast math against the two ratios STYLE.md itself states by
hand (14.95:1, 11.80:1) — a passing test against a wrong formula proves
nothing (TEST-9), so this pins the script to numbers already independently
recorded in the spec, not merely to whatever the code currently outputs.
"""

from __future__ import annotations

import unittest

import check_contrast as cc


class TestContrastRatio(unittest.TestCase):
    def test_ink_on_bg_matches_style_md(self) -> None:
        # STYLE.md, "Ground and ink" table: `--ink` on `--bg`, 14.95:1.
        self.assertAlmostEqual(cc.contrast_ratio("#e6e6ee", "#11131a"), 14.95, places=2)

    def test_primary_button_matches_style_md(self) -> None:
        # STYLE.md, "The palette — Dusk": kind-3 amber at 11.80:1.
        self.assertAlmostEqual(cc.contrast_ratio("#11131a", "#ffc46b"), 11.80, places=2)

    def test_translucent_text_is_composited_over_its_ground_first(self) -> None:
        # A fully transparent "text" colour reads as the ground itself — ratio 1:1 —
        # proving the alpha path actually composites rather than ignoring alpha.
        self.assertAlmostEqual(cc.contrast_ratio("#11131a00", "#ffffff"), 1.0, places=2)


class TestParseTokens(unittest.TestCase):
    def test_reads_only_the_base_root_block_never_the_print_override(self) -> None:
        css = """
        :root { --bg: #11131a; --ink: #e6e6ee; }
        @media print { :root { --bg: #ffffff; --ink: #11131a; } }
        """
        tokens = cc.parse_tokens(css)
        self.assertEqual(tokens["--bg"], "#11131a")
        overrides = cc.parse_print_overrides(css)
        self.assertEqual(overrides["--bg"], "#ffffff")


class TestParsePaletteOverrides(unittest.TestCase):
    def test_finds_named_palette_blocks_and_ignores_the_media_query_block(self) -> None:
        css = """
        :root { --bg: #ffffff; --ink: #111111; }
        :root[data-palette="paper"] { --bg: #f7f3e8; }
        :root[data-palette="dark"] { --bg: #14171c; --ink: #e7e9ee; }
        @media (prefers-color-scheme: dark) {
          :root:not([data-palette="default"]):not([data-palette="paper"]) { --bg: #14171c; }
        }
        """
        overrides = cc.parse_palette_overrides(css)
        self.assertEqual(set(overrides.keys()), {"paper", "dark"})
        self.assertEqual(overrides["paper"]["--bg"], "#f7f3e8")
        self.assertEqual(overrides["dark"]["--bg"], "#14171c")
        self.assertEqual(overrides["dark"]["--ink"], "#e7e9ee")

    def test_a_palette_with_no_override_block_resolves_to_the_base_tokens_unchanged(self) -> None:
        base = {"--bg": "#ffffff", "--ink": "#111111"}
        resolved = cc.resolve_palette(base, {})
        self.assertEqual(resolved, base)

    def test_an_override_replaces_only_what_it_redefines(self) -> None:
        base = {"--bg": "#ffffff", "--ink": "#111111"}
        resolved = cc.resolve_palette(base, {"--bg": "#14171c"})
        self.assertEqual(resolved, {"--bg": "#14171c", "--ink": "#111111"})


class TestCheckPairsGate(unittest.TestCase):
    """TEST-7: the gate a failing pair trips is real — both a pass and a
    genuine failure must come back correctly, not just an absence of a crash."""

    def test_a_pair_below_the_floor_is_reported_as_failing(self) -> None:
        tokens = {"--low-contrast-text": "#222222", "--bg": "#111111"}
        rows = cc.check_pairs(tokens, [("--low-contrast-text", "--bg", 4.5, "synthetic failing pair")])
        (_, _, ratio, minimum, _) = rows[0]
        self.assertLess(ratio, minimum)

    def test_a_pair_at_or_above_the_floor_is_reported_as_passing(self) -> None:
        tokens = {"--ink": "#e6e6ee", "--bg": "#11131a"}
        rows = cc.check_pairs(tokens, [("--ink", "--bg", 4.5, "real passing pair")])
        (_, _, ratio, minimum, _) = rows[0]
        self.assertGreaterEqual(ratio, minimum)

    def test_an_undefined_token_raises_rather_than_silently_skipping(self) -> None:
        with self.assertRaises(cc.ContrastCheckError):
            cc.check_pairs({"--bg": "#11131a"}, [("--missing", "--bg", 4.5, "typo'd token name")])


class TestRealTokens(unittest.TestCase):
    """The actual deliverable: every pair this app really uses, read from the
    real tokens.css, passes the AC-7 floor today — screen and print alike."""

    def test_main_exits_zero_against_the_real_tokens_css(self) -> None:
        self.assertEqual(cc.main(), 0)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""
Tests for vcaa_check.py — NO NETWORK (TEST-4).

Every fetch-dependent path is exercised against a small hand-built fake
payload shaped like the real _next/data response (verified empirically
against the live VCAA site on 2026-08-30), never a mock library (SR-2).
"""
import sys
import unittest
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import vcaa_check  # noqa: E402


# ============================================================================
# Fake authoritative payload — three sub-strands: one band-shared "Overview",
# one band-shared whole-strand ("Concepts and Skills"), and TWO
# "Investigation" sub-strands (only one of which the fake paste will cover).
# ============================================================================


def make_fake_raw_json() -> dict:
    return {
        "pageProps": {
            "additionalContent": {
                "disciplineTitle": "History",
                "curriculum": {
                    "learningAreaTitle": "Humanities",
                    "pathways": [
                        {
                            "curriculum": [
                                {
                                    "id": "9-10",
                                    "contentDescriptionsContent": [
                                        {
                                            "title": "Historical Knowledge and Understanding",
                                            "subStrands": [
                                                {
                                                    "title": "Overview: Levels 9 and 10",
                                                    "contentDescriptions": [
                                                        {"code": "VC2HH10K01", "contentDescription": "overview text one"},
                                                        {"code": "VC2HH10K02", "contentDescription": "overview text two"},
                                                    ],
                                                },
                                                {
                                                    "title": "Investigation: Australians at war (1914-1945)",
                                                    "contentDescriptions": [
                                                        {"code": "VC2HH10K13", "contentDescription": "war text thirteen"},
                                                        {"code": "VC2HH10K14", "contentDescription": "war text fourteen"},
                                                        {"code": "VC2HH10K19", "contentDescription": "war text nineteen"},
                                                    ],
                                                },
                                                {
                                                    "title": "Investigation: Asia (1750-present)",
                                                    "contentDescriptions": [
                                                        {"code": "VC2HH10K24", "contentDescription": "asia text one"},
                                                        {"code": "VC2HH10K25", "contentDescription": "asia text two"},
                                                    ],
                                                },
                                            ],
                                        },
                                        {
                                            "title": "Historical Concepts and Skills",
                                            "subStrands": [
                                                {
                                                    "title": "Communicating",
                                                    "contentDescriptions": [
                                                        {"code": "VC2HH10S10", "contentDescription": "communicating text"},
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                }
                            ]
                        }
                    ],
                },
            }
        }
    }


SAMPLE_NEXT_DATA_HTML = """
<html><body>
<script id="__NEXT_DATA__" type="application/json">{"buildId": "abc123XYZ", "props": {}}</script>
</body></html>
"""

# The fake paste: covers the "Overview" sub-strand fully, the "Investigation:
# Australians at war" sub-strand with K19 missing and K14's text corrupted,
# the whole "Communicating" sub-strand, an unknown code, and a mangled
# heading ("war stuff") that should fuzzy-match "Investigation: Australians
# at war (1914-1945)". "Investigation: Asia" is untouched entirely.
FAKE_PASTE_TEXT = """
<<< PASTE BELOW THIS LINE >>>

overview text one VC2HH10K01
overview text two VC2HH10K02

Investigation Australians at war 1914-1945
war text thirteen VC2HH10K13
war text fourteen, mangled beyond recognition VC2HH10K14

communicating text VC2HH10S10

some made up thing VC2HH10Z99

<<< PASTE ABOVE THIS LINE >>>
"""


class BuildIdExtractionTests(unittest.TestCase):
    def test_extracts_build_id_from_next_data_blob(self):
        build_id = vcaa_check.extract_build_id(SAMPLE_NEXT_DATA_HTML)
        self.assertEqual(build_id, "abc123XYZ")

    def test_raises_when_script_tag_missing(self):
        with self.assertRaises(ValueError):
            vcaa_check.extract_build_id("<html><body>no next data here</body></html>")

    def test_raises_when_build_id_field_missing(self):
        html = '<script id="__NEXT_DATA__" type="application/json">{"props": {}}</script>'
        with self.assertRaises(ValueError):
            vcaa_check.extract_build_id(html)


class ParseAuthoritativeTests(unittest.TestCase):
    def setUp(self):
        self.parsed = vcaa_check.parse_authoritative(make_fake_raw_json(), "9-10")

    def test_band_shared_flags(self):
        flags = {
            sub["name"]: sub["band_shared"]
            for strand in self.parsed["strands"]
            for sub in strand["sub_strands"]
        }
        self.assertTrue(flags["Overview: Levels 9 and 10"])
        self.assertFalse(flags["Investigation: Australians at war (1914-1945)"])
        self.assertFalse(flags["Investigation: Asia (1750-present)"])
        self.assertTrue(flags["Communicating"])

    def test_unknown_band_raises(self):
        with self.assertRaises(KeyError):
            vcaa_check.parse_authoritative(make_fake_raw_json(), "not-a-real-band")


class ParsePasteTests(unittest.TestCase):
    def test_extracts_codes_and_text(self):
        block = vcaa_check.extract_paste_block(FAKE_PASTE_TEXT)
        parsed = vcaa_check.parse_paste(block)
        codes = {c["code"]: c["text"] for c in parsed["codes"]}
        self.assertEqual(codes["VC2HH10K01"], "overview text one")
        self.assertEqual(codes["VC2HH10K14"], "war text fourteen, mangled beyond recognition")
        self.assertIn("VC2HH10Z99", codes)

    def test_extracts_heading_candidates(self):
        block = vcaa_check.extract_paste_block(FAKE_PASTE_TEXT)
        parsed = vcaa_check.parse_paste(block)
        heading_texts = [h["text"] for h in parsed["headings"]]
        self.assertIn("Investigation Australians at war 1914-1945", heading_texts)


class TextDifferenceClassificationTests(unittest.TestCase):
    def test_identical_text(self):
        result = vcaa_check.classify_text_difference("same text", "same text")
        self.assertTrue(result["identical"])

    def test_trivial_difference_curly_quotes_and_dash(self):
        official = "students’ perspectives 1914–1945"
        paste = "students' perspectives 1914-1945"
        result = vcaa_check.classify_text_difference(official, paste)
        self.assertFalse(result["identical"])
        self.assertTrue(result["trivial"])

    def test_substantive_difference(self):
        result = vcaa_check.classify_text_difference(
            "war text fourteen", "war text fourteen, mangled beyond recognition"
        )
        self.assertFalse(result["identical"])
        self.assertFalse(result["trivial"])


class BuildReportTests(unittest.TestCase):
    def setUp(self):
        self.parsed = vcaa_check.parse_authoritative(make_fake_raw_json(), "9-10")
        block = vcaa_check.extract_paste_block(FAKE_PASTE_TEXT)
        self.paste_parsed = vcaa_check.parse_paste(block)
        self.report = vcaa_check.build_report(self.parsed, self.paste_parsed)

    def test_tier_a_gap_in_covered_sub_strand(self):
        war_gaps = [
            g for g in self.report["tier_a_gaps"]
            if g["sub_strand"] == "Investigation: Australians at war (1914-1945)"
        ]
        self.assertEqual(len(war_gaps), 1)
        missing = {c["code"] for c in war_gaps[0]["missing_codes"]}
        self.assertEqual(missing, {"VC2HH10K19"})

    def test_uncovered_sub_strand_is_tier_b_not_tier_a(self):
        tier_a_names = {g["sub_strand"] for g in self.report["tier_a_gaps"]}
        self.assertNotIn("Investigation: Asia (1750-present)", tier_a_names)
        tier_b_names = {e["sub_strand"] for e in self.report["tier_b_not_selected"]}
        self.assertIn("Investigation: Asia (1750-present)", tier_b_names)

    def test_tier_b_reports_count_not_codes(self):
        asia_entry = next(
            e for e in self.report["tier_b_not_selected"]
            if e["sub_strand"] == "Investigation: Asia (1750-present)"
        )
        self.assertEqual(asia_entry["code_count"], 2)
        self.assertNotIn("codes", asia_entry)

    def test_band_shared_sub_strands_never_in_tier_b(self):
        tier_b_names = {e["sub_strand"] for e in self.report["tier_b_not_selected"]}
        self.assertNotIn("Overview: Levels 9 and 10", tier_b_names)
        self.assertNotIn("Communicating", tier_b_names)

    def test_substantive_mismatch_detected(self):
        mismatch = next(m for m in self.report["text_mismatches"] if m["code"] == "VC2HH10K14")
        self.assertFalse(mismatch["trivial"])

    def test_structural_fuzzy_match(self):
        match = next(
            (s for s in self.report["structural"] if s["paste_heading"] == "Investigation Australians at war 1914-1945"), None
        )
        self.assertIsNotNone(match)
        self.assertEqual(
            match["closest_official"], "Investigation: Australians at war (1914-1945)"
        )

    def test_unknown_code_detected(self):
        self.assertIn("VC2HH10Z99", self.report["unknown_codes"])

    def test_completeness_figure_is_scoped_to_covered_sub_strands(self):
        scope = self.report["scope"]
        # Covered: Overview (2), Australians at war (3), Communicating (1) = 6 expected
        self.assertEqual(scope["expected_codes_for_unit_scope"], 6)
        # Present: K01, K02, K13, K14, S10 = 5 (K19 missing)
        self.assertEqual(scope["present_codes_for_unit_scope"], 5)


class NetworkFailureTests(unittest.TestCase):
    def test_main_exits_non_zero_on_unreachable_site(self, tmp_path=None):
        import tempfile

        def fail_fetch(*args, **kwargs):
            raise urllib.error.URLError("simulated network failure")

        original = vcaa_check.load_or_fetch_authoritative
        vcaa_check.load_or_fetch_authoritative = fail_fetch
        try:
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".md", delete=False
            ) as handle:
                handle.write(FAKE_PASTE_TEXT)
                paste_path = handle.name
            exit_code = vcaa_check.main([paste_path])
            self.assertNotEqual(exit_code, 0)
        finally:
            vcaa_check.load_or_fetch_authoritative = original
            Path(paste_path).unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()

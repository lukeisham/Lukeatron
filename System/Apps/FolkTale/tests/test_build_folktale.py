"""Smoke tests for build_folktale.py (TEST-1/TEST-2: stdlib unittest,
imports cleanly, happy path, one guard path)."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

BUILD_DIR = Path(__file__).resolve().parents[1] / "cartridge" / "build"
sys.path.insert(0, str(BUILD_DIR))

import build_folktale  # noqa: E402  (path insert must precede this import)


class SplitSourceTests(unittest.TestCase):
    def test_translator_and_year_parsed_from_free_text_source(self) -> None:
        translator, year = build_folktale.split_source("Vernon Jones translation (1912), Project Gutenberg")
        self.assertEqual(translator, "Vernon Jones translation")
        self.assertEqual(year, "1912")

    def test_missing_year_left_blank_not_guessed(self) -> None:
        translator, year = build_folktale.split_source("D. L. Ashliman Folktexts (traditional Nasreddin collection)")
        self.assertEqual(year, "")
        self.assertTrue(translator)


class ParseSeedTests(unittest.TestCase):
    def test_seed_file_parses_to_40_tales_across_10_categories(self) -> None:
        # 2026-08-13 (Luke's instruction): Turkey/Middle East (4 tales) removed,
        # replaced with Persia (Pre-Islamic) (3 tales); American Gothic (3) and
        # Australian Gothic (2) added. 36 - 4 + 3 + 3 + 2 = 40 tales, 10 categories.
        tales = build_folktale.parse_seed(build_folktale.SEED_PATH)
        self.assertEqual(len(tales), 40)
        categories = {t["category"] for t in tales}
        self.assertEqual(categories, set(build_folktale.CATEGORY_LABELS.keys()))
        self.assertNotIn("turkey-middle-east", categories)
        for tale in tales:
            self.assertLessEqual(tale["wordCount"], build_folktale.WORD_CAP)

    def test_over_cap_tale_is_rejected_loudly(self) -> None:
        over_cap_text = " ".join(["word"] * (build_folktale.WORD_CAP + 1))
        seed_text = "\n".join(
            [
                "### 1. Too Long",
                "",
                "**id:** test-001",
                "**title:** Too Long",
                "**culture/region:** Germany",
                "**tale_text:**",
                over_cap_text,
                "",
                "**setup_span:** \"word\"",
                "**twist_span:** \"word\"",
                "**result_span:** \"word\"",
                "**source:** Test source (2000)",
                "",
                "---",
                "",
            ]
        )
        with tempfile.TemporaryDirectory() as tmp:
            seed_path = Path(tmp) / "over-cap.md"
            seed_path.write_text(seed_text, encoding="utf-8")
            with self.assertRaises(build_folktale.SeedError):
                build_folktale.parse_seed(seed_path)


if __name__ == "__main__":
    unittest.main()

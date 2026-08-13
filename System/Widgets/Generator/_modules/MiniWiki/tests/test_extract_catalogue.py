#!/usr/bin/env python3
"""Tests for build/extract_catalogue.py. Stdlib unittest only (TEST-1).
Fixture text mirrors the real seed dialects (riddles.md's inline
**Text:**/**Source:** fields, folk-tales.md's multi-line **tale_text:**)
without depending on the actual seed files (TEST-4)."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "build"))

import extract_catalogue as ec  # noqa: E402


RIDDLE_FIXTURE = """# Riddle Seed Fixture

## Riddle Collection

### Anglo-Saxon Exeter Book

#### Riddle EX-001
**Text:** A moth ate words, a thief in the darkness.

**Answer:** Bookworm

**Clue:** This creature loves knowledge more than you do.

**Difficulty:** medium

**Tradition/Origin:** Anglo-Saxon Exeter Book, Riddle 47

**Source:** [Anglo-Saxon Riddles of the Exeter Book - Wikisource](https://en.wikisource.org/wiki/x)

**Licence/Public-Domain Note:** Public domain; translation by Paull Franklin Baum (1963)

---

## Answer-Checking Guidance

**Case insensitivity:** Convert all input to lowercase.

**Whitespace normalization:** Strip leading/trailing whitespace.
"""

TALE_FIXTURE = """# Folk-tale Seed Fixture

## AESOP'S FABLES (Ancient Greek, Public Domain)

### 1. The Fox and the Grapes

**id:** aesop-001
**title:** The Fox and the Grapes
**culture/region:** Ancient Greece
**tale_text:**
A hungry fox spotted a bunch of grapes hanging high on a trellis. He
gave up trying and remarked, "I thought those grapes were ripe."

**word_count:** 42
**source:** Vernon Jones translation (1912), Project Gutenberg
**licence_note:** Public Domain - Ancient Greek text, pre-1927 translation

---

## RESEARCH METHODOLOGY & SOURCES USED

This compilation draws from Project Gutenberg and other archives.
"""


class ExtractCatalogueTest(unittest.TestCase):
    def _write(self, text: str) -> Path:
        tmp = tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8")
        tmp.write(text)
        tmp.close()
        return Path(tmp.name)

    def test_extract_produces_a_flat_catalogue_entry_with_source_and_licence(self) -> None:
        path = self._write(RIDDLE_FIXTURE)
        articles = ec.extract(path)
        self.assertEqual(len(articles), 1)
        article = next(iter(articles.values()))
        for field in ("id", "title", "level", "role", "lead", "body_html", "parent", "children", "siblings"):
            self.assertIn(field, article)
        self.assertEqual(article["level"], 1)
        self.assertEqual(article["role"], "article")
        self.assertIsNone(article["parent"])
        self.assertEqual(article["children"], [])
        self.assertIn("Anglo-Saxon Riddles of the Exeter Book - Wikisource", article["source"])
        self.assertTrue(article["licence"].startswith("Public domain"))
        self.assertIn("moth ate words", article["body_html"])

    def test_non_entry_prose_sections_are_skipped(self) -> None:
        path = self._write(RIDDLE_FIXTURE)
        articles = ec.extract(path)
        titles = [a["title"] for a in articles.values()]
        self.assertNotIn("Case insensitivity", titles)
        self.assertEqual(len(articles), 1)

    def test_multiline_tale_text_field_and_explicit_id_title(self) -> None:
        path = self._write(TALE_FIXTURE)
        articles = ec.extract(path)
        self.assertIn("aesop-001", articles)
        article = articles["aesop-001"]
        self.assertEqual(article["title"], "The Fox and the Grapes")
        self.assertIn("hungry fox spotted", article["body_html"])
        self.assertEqual(article["source"], "Vernon Jones translation (1912), Project Gutenberg")
        self.assertTrue(article["licence"].startswith("Public Domain"))
        self.assertTrue(any(c.startswith("Culture/Region:") for c in article["characteristics"]))

    def test_answer_and_other_metadata_fold_into_characteristics(self) -> None:
        path = self._write(RIDDLE_FIXTURE)
        article = next(iter(ec.extract(path).values()))
        joined = " | ".join(article["characteristics"])
        self.assertIn("Answer: Bookworm", joined)
        self.assertIn("Difficulty: medium", joined)
        self.assertNotIn("Licence", joined)  # licence is its own field, not duplicated here

    def test_guard_zero_entries_raises_catalogue_error(self) -> None:
        path = self._write("# Just prose\n\nNo labelled fields anywhere in this file.\n")
        with self.assertRaises(ec.CatalogueError):
            ec.extract(path)


if __name__ == "__main__":
    unittest.main()

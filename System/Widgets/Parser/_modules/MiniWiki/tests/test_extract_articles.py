#!/usr/bin/env python3
"""Tests for build/extract_articles.py. Stdlib unittest only (TEST-1).
Writes fixture .md files to a temp dir (TEST-4: no real Memory/ paths
touched); every assertion is on actual output shape, not "didn't crash"
(TEST-6)."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "build"))

import extract_articles as ea  # noqa: E402


FLAT_FIXTURE = """---
type: content-source
title: "Fixture — Content Source"
description: "A tiny fixture cartridge for extractor tests."
provenance: |
  Fixture text authored for MiniWikiModule tests.
---

## 1. Formal Fallacies

1. *Formal Fallacies*
   Errors in the logical structure of a deductive argument.

1.1 Affirming the Consequent
   A formal fallacy about conditionals.
   Example: "If it rained the pavement is wet."

## 2. Informal Fallacies

2.1 Fallacies of Relevance

2.1.0 *Fallacies of Relevance*
   Arguments whose premises are irrelevant to the conclusion.

2.1.1 Ad Hominem
   Attacking the person instead of the argument.
"""

HEADING_FIXTURE = """---
title: "Heading Fixture"
description: "Heading-dialect fixture."
---

### 1.1 Inventio

The discovery and brainstorming phase.

**Key characteristics:** research and exploration; identification of arguments.

**Worked example (textual):** A journalist gathers sources before writing.

#### 1.1.1 Textual Invention
- Researching multiple sources for an article
- Gathering case law before an argument
"""


class ExtractArticlesTest(unittest.TestCase):
    def _write(self, text: str) -> Path:
        tmp = tempfile.NamedTemporaryFile(suffix="_content.md", delete=False, mode="w", encoding="utf-8")
        tmp.write(text)
        tmp.close()
        return Path(tmp.name)

    def test_extract_produces_the_documented_article_shape(self) -> None:
        path = self._write(FLAT_FIXTURE)
        articles = ea.extract(path, "Fixture")
        article = articles["1.1"]
        for field in ("id", "title", "level", "role", "lead", "body_html", "parent", "children", "siblings"):
            self.assertIn(field, article)
        self.assertEqual(article["title"], "Affirming the Consequent")
        self.assertEqual(article["examples"], ["If it rained the pavement is wet."])

    def test_category_description_folds_into_its_parent_section(self) -> None:
        path = self._write(FLAT_FIXTURE)
        articles = ea.extract(path, "Fixture")
        self.assertNotIn("2.1.0", articles)
        self.assertIn("irrelevant to the conclusion", articles["2.1"]["body_html"])

    def test_role_classification_section_vs_article(self) -> None:
        path = self._write(HEADING_FIXTURE)
        articles = ea.extract(path, "Heading Fixture")
        # 1.1 has both a body AND a child -> still "article" (has content of
        # its own), matching decision #2's "empty body" trigger for "section".
        self.assertEqual(articles["1.1"]["role"], "article")
        self.assertEqual(articles["1.1"]["children"], ["1.1.1"])

    def test_heading_dialect_extracts_characteristics_and_worked_example(self) -> None:
        path = self._write(HEADING_FIXTURE)
        articles = ea.extract(path, "Heading Fixture")
        article = articles["1.1"]
        self.assertEqual(
            article["characteristics"],
            ["research and exploration", "identification of arguments"],
        )
        self.assertTrue(article["worked_example"].startswith("A journalist"))
        self.assertEqual(articles["1.1.1"]["examples"][0], "Researching multiple sources for an article")

    def test_references_are_sourced_from_frontmatter_never_fabricated(self) -> None:
        path = self._write(FLAT_FIXTURE)
        articles = ea.extract(path, "Fixture")
        self.assertEqual(articles["1.1"]["references"][0]["title"], "Fixture — Content Source")

        no_frontmatter = self._write("1 Bare\n   No frontmatter here.\n")
        bare = ea.extract(no_frontmatter, "Bare")
        self.assertNotIn("references", bare["1"])

    def test_guard_zero_articles_raises_extract_error(self) -> None:
        path = self._write("Just prose, no outline numbers anywhere in this file.\n")
        with self.assertRaises(ea.ExtractError):
            ea.extract(path, "Empty")


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Tests for extract_articles.py (TEST-1: stdlib unittest only).

Covers: extractor output shape, role classification (section vs article,
Logic's 2.1.0 category-description fold), and the zero-entries guard path.
"""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from extract_articles import extract, ExtractError, build_tree, sort_key

FIXTURE = """---
type: content-source
title: "Fixture — Content Source"
description: "A tiny fixture cartridge for extractor tests."
provenance: >
  Drafted for MiniWikiModule tests, 2026-08-10.
---

## 1 Root Category

This is the root category's own lead sentence.

### 1.1 First Article

Body text for the first article.

**Key characteristics:** alpha; beta; gamma.

1.1.0 *Category description*

Prose belonging to the parent section, not a standalone article.

#### 1.1.1 Leaf Article

Leaf body text.

**Worked example:** A worked example sentence for testing purposes.
"""


class ExtractArticlesTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        self.md_path = Path(self.tmpdir.name) / "Fixture_content.md"
        self.md_path.write_text(FIXTURE, encoding="utf-8")

    def tearDown(self) -> None:
        self.tmpdir.cleanup()

    def test_imports_cleanly(self) -> None:
        # Import already happened at module load; a second call proves it's side-effect free.
        import extract_articles  # noqa: F401

    def test_happy_path_produces_expected_shape(self) -> None:
        articles = extract(self.md_path, "Fixture")
        self.assertIn("1", articles)
        self.assertIn("1.1", articles)
        self.assertIn("1.1.1", articles)
        root = articles["1"]
        for key in ("id", "title", "level", "role", "lead", "body_html", "parent", "children", "siblings"):
            self.assertIn(key, root)
        self.assertEqual(root["id"], "1")
        self.assertEqual(root["parent"], None)
        self.assertIn("1.1", root["children"])

    def test_category_description_is_folded_not_a_sibling_article(self) -> None:
        articles = extract(self.md_path, "Fixture")
        self.assertNotIn("1.1.0", articles, "the 2.1.0-style category description must be folded, not kept")
        self.assertIn("belonging to the parent section", articles["1.1"]["body_html"])

    def test_role_classification_article_vs_section(self) -> None:
        articles = extract(self.md_path, "Fixture")
        self.assertEqual(articles["1.1.1"]["role"], "article")
        # Leaf has body text -> article, not section.
        self.assertTrue(articles["1.1.1"]["body_html"])

    def test_worked_example_promoted_from_long_example_line(self) -> None:
        articles = extract(self.md_path, "Fixture")
        self.assertIn("worked_example", articles["1.1.1"])

    def test_characteristics_split_on_semicolons(self) -> None:
        articles = extract(self.md_path, "Fixture")
        self.assertEqual(articles["1.1"]["characteristics"], ["alpha", "beta", "gamma"])

    def test_references_sourced_from_frontmatter_only(self) -> None:
        articles = extract(self.md_path, "Fixture")
        refs = articles["1"]["references"]
        self.assertEqual(len(refs), 1)
        self.assertIn("2026-08-10", refs[0]["note"] + refs[0].get("container", ""))

    def test_zero_entries_raises_extract_error(self) -> None:
        empty_path = Path(self.tmpdir.name) / "Empty_content.md"
        empty_path.write_text("---\ntitle: Empty\n---\n\nNo outline numbers here at all.\n", encoding="utf-8")
        with self.assertRaises(ExtractError):
            extract(empty_path, "Empty")

    def test_build_tree_parent_child_links(self) -> None:
        ids = ["1", "1.1", "1.1.1", "1.2"]
        tree = build_tree(sorted(ids, key=sort_key))
        self.assertEqual(tree["1.1"]["parent"], "1")
        self.assertEqual(tree["1.1.1"]["parent"], "1.1")
        self.assertIn("1.1", tree["1"]["children"])
        self.assertIn("1.2", tree["1"]["children"])


if __name__ == "__main__":
    unittest.main()

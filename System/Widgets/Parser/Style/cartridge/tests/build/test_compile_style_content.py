#!/usr/bin/env python3
"""Smoke + gate tests for Style/cartridge/build/compile_style_content.py
(TEST-1/TEST-2/TEST-4/TEST-9).

unittest only (TEST-1). The duplicate-id and empty-file guard tests build
synthetic content under tempfile.TemporaryDirectory() (TEST-4) rather than
mutating the real Genres/Registers files. The happy-path test reads the
real 7 Style content files read-only — proving SR-4's claim that this
compiler reuses extract_articles.py's already-verified scanner against
these exact files, not a re-typed copy (TEST-9) — no writes occur to them.
"""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "build"))

import compile_style_content as csc  # noqa: E402

REAL_STYLE_DIR = Path(__file__).resolve().parents[3]


class TestCompileStyleContent(unittest.TestCase):
    def test_imports_cleanly(self):
        self.assertTrue(callable(csc.compile_style_content))

    def test_happy_path_against_the_real_style_content_files(self):
        content = csc.compile_style_content()
        # 5 genres (5+3, 3+2, 4+2, 3+2, 3+2 = 8+6+7+6+6) + 2 registers (10+20) = 63.
        self.assertEqual(len(content), 63)
        for cid in ("1.1", "8", "8.1", "2.1", "9", "6.1", "6.6", "7.1", "7.20"):
            self.assertIn(cid, content)
            self.assertIn("n", content[cid])
            self.assertTrue(content[cid]["n"], f"{cid} has an empty title")
        # sweep_id (frontmatter) lands in `l`, distinguishing genre/antithesis
        # pairs (same file, same `l`) from registers.
        self.assertEqual(content["1.1"]["l"], "clarity")
        self.assertEqual(content["8.1"]["l"], "clarity")
        self.assertEqual(content["6.1"]["l"], "academic-english")
        # No stray markdown artifacts (the 2026-08-11 fix this test guards
        # against regressing): no leaked "---" dividers, no swallowed "##"
        # sub-headers, no trailing nav-link text in any definition.
        for cid, entry in content.items():
            self.assertNotIn("---", entry["d"], f"{cid}: leaked '---' divider")
            self.assertNotIn("##", entry["d"], f"{cid}: leaked a sub-heading")
            self.assertNotIn("Back to", entry["d"], f"{cid}: leaked the nav-link footer")
        # Each Before/After pair becomes one combined "Before: X / After: Y"
        # string; §1.1 has one pair, §1.2 has two (interleaved with prose).
        self.assertEqual(len(content["1.1"]["e"]), 1)
        self.assertIn("Before:", content["1.1"]["e"][0])
        self.assertIn("After:", content["1.1"]["e"][0])
        self.assertEqual(len(content["1.2"]["e"]), 2)
        # An antithesis rule carries its single demonstrative example.
        self.assertEqual(len(content["8.1"]["e"]), 1)

    def test_duplicate_id_across_files_is_rejected_and_named(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            (tmp_path / "a.md").write_text(
                "---\nsweep_id: a\n---\n### 1.1 Title A\n\nBody A.\n", encoding="utf-8"
            )
            (tmp_path / "b.md").write_text(
                "---\nsweep_id: b\n---\n### 1.1 Title B\n\nBody B.\n", encoding="utf-8"
            )
            content: dict = {}
            csc.compile_file(tmp_path / "a.md", content)
            with self.assertRaises(csc.CompileError) as ctx:
                csc.compile_file(tmp_path / "b.md", content)
            self.assertIn("1.1", str(ctx.exception))

    def test_zero_entries_is_rejected_and_named(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            empty_md = tmp_path / "empty.md"
            empty_md.write_text("---\nsweep_id: empty\n---\nJust prose, no outline entries.\n", encoding="utf-8")
            with self.assertRaises(csc.CompileError) as ctx:
                csc.compile_file(empty_md, {})
            self.assertIn("empty.md", str(ctx.exception))

    def test_missing_content_file_is_rejected_and_named(self):
        missing = REAL_STYLE_DIR / "Genres" / "DoesNotExist.md"
        original = csc.CONTENT_FILES
        csc.CONTENT_FILES = [missing]
        try:
            with self.assertRaises(csc.CompileError) as ctx:
                csc.compile_style_content()
            self.assertIn("DoesNotExist.md", str(ctx.exception))
        finally:
            csc.CONTENT_FILES = original


if __name__ == "__main__":
    unittest.main()

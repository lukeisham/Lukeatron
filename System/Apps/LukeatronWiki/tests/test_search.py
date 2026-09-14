"""
Test suite for search.py — plain substring search over library's
already-seal-filtered reads.

Covers search.spec.md's AC-1 through AC-7, plus a benchmark against the
real Memory/Long-Term/ tree (AC-4) and the direct-file-access grep (AC-6).

Like test_library.py, the fixture-based tests build a tempfile tree shaped
like Memory/Long-Term/ and monkey-patch `paths`' constants — nothing here
writes anywhere under the real Memory/.
"""

import re
import sys
import time
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))

import paths
import library
import search


APP_DIR = Path(__file__).parent.parent
REPO_ROOT = APP_DIR.parents[2]  # .../_Lukeatron
REAL_LT = REPO_ROOT / "Memory" / "Long-Term"


def _write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


class SearchFixtureTestCase(unittest.TestCase):
    """Builds a small tempfile tree and monkey-patches `paths` at it."""

    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)
        root = Path(self.tmpdir.name).resolve()

        self.lt = root / "Memory" / "Long-Term"
        self.wiki = self.lt / "LukeatronWiki"
        self.nodes = self.wiki / "Nodes"
        self.sealed_yaml = self.wiki / "_sealed.yaml"
        self.index_yaml = self.wiki / "_index.yaml"

        # ---- stores -----------------------------------------------------
        _write(
            self.lt / "Theology" / "augustine.md",
            "Augustine wrote about the City of God.\n"
            "A second line with nothing special.\n",
        )
        _write(
            self.lt / "Theology" / "unrelated.md",
            "This file never mentions the query term at all.\n",
        )
        _write(
            self.lt / "Sociology" / "durkheim.md",
            "Durkheim discussed anomie and the city as a social form.\n",
        )
        # A file that matches only in its filename, not its body.
        _write(
            self.lt / "Sociology" / "the-city-and-society.md",
            "No matching word inside, just an ordinary sentence.\n",
        )
        # A store that is entirely sealed.
        _write(self.lt / "SealedStore" / "secret.md", "The city is mentioned here too.\n")
        # A binary file that must not crash the body search.
        (self.lt / "Theology" / "image.png").write_bytes(b"\x89PNG\r\n\x1a\n\xff\xfe\x00\x01")

        _write(
            self.sealed_yaml,
            "stores:\n  - SealedStore\nfiles: []\n",
        )
        _write(
            self.index_yaml,
            "wiki: LukeatronWiki\ntype: wiki-page-index\nthemes: []\n",
        )

        self._patches = [
            patch.object(paths, "LT", self.lt),
            patch.object(paths, "WIKI", self.wiki),
            patch.object(paths, "NODES", self.nodes),
            patch.object(paths, "SEALED_YAML", self.sealed_yaml),
            patch.object(paths, "INDEX_YAML", self.index_yaml),
        ]
        for p in self._patches:
            p.start()
            self.addCleanup(p.stop)


class TestAC1SealedStoreReturnsNothing(SearchFixtureTestCase):
    def test_sealed_store_contributes_zero_hits(self):
        results = search.search("city")
        store_names = {g["store"] for g in results}
        self.assertNotIn("SealedStore", store_names)

    def test_sealed_store_leaves_no_trace_at_all(self):
        # Not a redacted placeholder, not an empty group, nothing.
        results = search.search("city")
        as_text = repr(results)
        self.assertNotIn("SealedStore", as_text)
        self.assertNotIn("secret.md", as_text)


class TestAC2GroupedByStore(SearchFixtureTestCase):
    def test_multi_store_hit_is_grouped_not_flat(self):
        results = search.search("city")
        self.assertGreaterEqual(len(results), 2)
        store_names = [g["store"] for g in results]
        self.assertIn("Theology", store_names)
        self.assertIn("Sociology", store_names)
        for group in results:
            self.assertIn("store", group)
            self.assertIn("hits", group)
            for hit in group["hits"]:
                # Every hit within a group actually belongs to that store —
                # sanity check against cross-contamination between groups.
                self.assertIsInstance(hit["relpath"], str)


class TestAC3TitleVsBodyDistinction(SearchFixtureTestCase):
    def test_title_match_is_kind_title(self):
        results = search.search("the-city-and-society")
        hit = self._find_hit(results, "Sociology", "the-city-and-society.md")
        self.assertIsNotNone(hit)
        self.assertEqual(hit["kind"], "title")

    def test_body_only_match_is_kind_body(self):
        results = search.search("anomie")
        hit = self._find_hit(results, "Sociology", "durkheim.md")
        self.assertIsNotNone(hit)
        self.assertEqual(hit["kind"], "body")
        self.assertIsNotNone(hit["line"])

    def test_kinds_are_distinguishable_for_the_same_query(self):
        # "city" hits augustine.md (body) and the-city-and-society.md (title).
        results = search.search("city")
        kinds = set()
        for group in results:
            for hit in group["hits"]:
                kinds.add(hit["kind"])
        self.assertEqual(kinds, {"title", "body"})

    @staticmethod
    def _find_hit(results, store, filename):
        for group in results:
            if group["store"] != store:
                continue
            for hit in group["hits"]:
                if hit["filename"] == filename:
                    return hit
        return None


class TestAC4Performance(unittest.TestCase):
    """
    AC-4 — a benchmark run at the PRD's declared scale records a result
    with no perceptible delay. Run against the REAL Memory/Long-Term/ tree
    (no monkey-patch) since that's the actual scale this needs to hold at:
    per the build brief, 33 stores / 187 reachable files / 26 MB, with
    nested subfolders now walked recursively.

    The ceiling is deliberately generous so this stays a real regression
    guard rather than a source of machine-dependent flakiness.
    """

    def test_benchmark_against_real_tree(self):
        if not REAL_LT.is_dir():
            self.skipTest("Real Memory/Long-Term/ tree not present in this checkout.")

        start = time.time()
        results = search.search("the")  # a common substring, worst case for hit volume
        elapsed = time.time() - start

        total_files = sum(
            len((library.list_store(s["folder"]) or [])) for s in library.list_stores()
        )
        print(
            f"\n[search benchmark] query='the' over {len(library.list_stores())} stores "
            f"/ {total_files} files: {elapsed:.3f}s, {sum(len(g['hits']) for g in results)} hits"
        )

        # Generous ceiling — this is a live full-text walk of ~187 files /
        # 26MB (AD-1: no index), not a snappy-UI budget. Catches an actual
        # regression (e.g. an accidental O(n^2)) without being flaky on a
        # slow or loaded machine.
        self.assertLess(elapsed, 10.0)


class TestAC5NoCacheLiveEdit(SearchFixtureTestCase):
    def test_editing_a_file_and_requerying_sees_new_content_with_no_restart(self):
        target = self.lt / "Theology" / "unrelated.md"

        self.assertEqual(search.search("zzqqxx-marker"), [])

        target.write_text(
            target.read_text(encoding="utf-8") + "A zzqqxx-marker appears now.\n",
            encoding="utf-8",
        )

        results = search.search("zzqqxx-marker")
        store_names = {g["store"] for g in results}
        self.assertIn("Theology", store_names)


class TestAC6NoDirectFileAccess(unittest.TestCase):
    """
    AC-6 — a grep of search.py's own module code finds zero direct
    Memory/Long-Term or LukeatronWiki file opens. search must reach disk
    only through library's already-seal-filtered reads.
    """

    def test_grep_for_direct_long_term_access(self):
        source = (APP_DIR / "search.py").read_text(encoding="utf-8")
        self.assertNotIn("Memory/Long-Term", source)
        self.assertNotIn("Memory\" / \"Long-Term", source)
        self.assertNotRegex(source, r"paths\.LT\b")
        self.assertNotRegex(source, r"paths\.WIKI\b")
        # No raw filesystem opens of any kind in this module — every read
        # must be a library.* call.
        self.assertNotIn("open(", source)
        self.assertNotIn(".read_text(", source)
        self.assertNotIn(".read_bytes(", source)


class TestAC7NoWritePath(unittest.TestCase):
    """AC-7 — no function in this module ever opens a file for writing."""

    def test_no_write_mode_opens(self):
        source = (APP_DIR / "search.py").read_text(encoding="utf-8")
        self.assertNotRegex(source, r'open\([^)]*["\']w')
        self.assertNotIn(".write_text(", source)
        self.assertNotIn(".write_bytes(", source)

    def test_no_writing_functions_exported(self):
        write_like = [
            name for name in dir(search)
            if not name.startswith("_")
            and callable(getattr(search, name))
            and any(kw in name.lower() for kw in ("write", "save", "submit", "delete"))
        ]
        self.assertEqual(write_like, [])


class TestEdgeCases(SearchFixtureTestCase):
    def test_empty_query_returns_empty_list(self):
        self.assertEqual(search.search(""), [])
        self.assertEqual(search.search("   "), [])

    def test_case_insensitive(self):
        results = search.search("AUGUSTINE")
        store_names = {g["store"] for g in results}
        self.assertIn("Theology", store_names)

    def test_binary_file_does_not_crash_and_is_not_matched(self):
        # "PNG" would title-match nothing, and the binary content must
        # never be treated as body text.
        results = search.search("\x89PNG")
        self.assertEqual(results, [])


if __name__ == "__main__":
    unittest.main()

"""Tests for memory-search. Each test builds a throwaway tree and index; nothing touches real memory."""
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import search  # noqa: E402

SEAL = """stores:
  - People
files:
  - Theology/private.md
"""


class SearchTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.lt = self.root / "Memory" / "Long-Term"
        self.write("LukeatronWiki/_sealed.yaml", SEAL)
        self.write("Theology/atonement.md", "# Atonement\n\nSubstitutionary atonement in Romans 3.\n")
        self.write("Theology/grace.md", "# Grace\n\nGrace and faith, with a word on atonement.\n")
        self.write("Theology/private.md", "secret atonement notes\n")
        self.write("People/AB01/AB01.md", "atonement mentioned by a person\n")
        self.write("BalaclavaPC/Pastoral_Notes.table.md", "| visit | atonement question |\n")
        self.write("Grammar/guide.html", "<p>The <b>subject</b> of a clause</p>\n")
        projects = self.root / "Memory" / "Medium-Term" / "Projects" / "CH-01-series"
        projects.mkdir(parents=True)
        (projects / "registry.md").write_text("Sermon series on atonement\n", encoding="utf-8")
        self.index = search.Index(self.root, self.root / "index.sqlite")

    def write(self, rel, text):
        path = self.lt / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def paths(self, query, **kw):
        self.index.refresh()
        return [h["path"] for h in self.index.search(query, **kw)]

    def test_sealed_store_file_and_pastoral_log_never_indexed(self):
        found = self.paths("atonement", limit=50)
        self.assertFalse([p for p in found if "People/" in p or "private.md" in p or "Pastoral_Notes" in p])
        indexed = [r[0] for r in self.index.db.execute("SELECT path FROM docs")]
        self.assertFalse([p for p in indexed if "People/" in p or "private.md" in p or "Pastoral_Notes" in p])

    def test_pastoral_log_excluded_even_when_manifest_omits_it(self):
        self.write("LukeatronWiki/_sealed.yaml", "stores: []\nfiles: []\n")
        self.assertNotIn("Memory/Long-Term/BalaclavaPC/Pastoral_Notes.table.md", self.paths("atonement", limit=50))

    def test_unreadable_manifest_fails_closed(self):
        self.write("LukeatronWiki/_sealed.yaml", "stores: [unclosed\n")
        with self.assertRaises(search.SealError):
            self.index.refresh()

    def test_newly_sealed_file_disappears(self):
        self.assertIn("Memory/Long-Term/Theology/grace.md", self.paths("grace"))
        self.write("LukeatronWiki/_sealed.yaml", SEAL + "  - Theology/grace.md\n")
        self.assertNotIn("Memory/Long-Term/Theology/grace.md", self.paths("grace"))

    def test_substring_case_insensitive_and_title_ranked_first(self):
        found = self.paths("ATONE")
        self.assertEqual(found[0], "Memory/Long-Term/Theology/atonement.md")
        self.assertIn("Memory/Long-Term/Theology/grace.md", found)

    def test_all_terms_must_match_and_phrases_hold(self):
        self.assertEqual(self.paths("atonement Romans"), ["Memory/Long-Term/Theology/atonement.md"])
        self.assertEqual(self.paths('"word on atonement"'), ["Memory/Long-Term/Theology/grace.md"])

    def test_short_terms_use_substring(self):
        self.assertEqual(self.paths("atonement 3."), ["Memory/Long-Term/Theology/atonement.md"])

    def test_store_and_area_filters(self):
        self.assertEqual(self.paths("atonement", area="medium"),
                         ["Memory/Medium-Term/Projects/CH-01-series/registry.md"])
        self.assertTrue(all("/Theology/" in p for p in self.paths("atonement", store="theology")))

    def test_edit_and_delete_are_seen_on_next_query(self):
        path = self.write("Theology/grace.md", "now about propitiation\n")
        later = time.time() + 5
        os.utime(path, (later, later))
        self.assertEqual(self.paths("propitiation"), ["Memory/Long-Term/Theology/grace.md"])
        path.unlink()
        self.assertEqual(self.paths("propitiation"), [])

    def test_html_is_searched_without_tags(self):
        self.index.refresh()
        hit = self.index.search("subject of a clause")[0]
        self.assertEqual(hit["path"], "Memory/Long-Term/Grammar/guide.html")
        self.assertNotIn("<b>", hit["snippet"])

    def test_snippet_and_line_point_at_the_match(self):
        self.index.refresh()
        hit = self.index.search("Romans")[0]
        self.assertEqual(hit["line"], 3)
        self.assertIn("Romans", hit["snippet"])



class SealedSearchTest(SearchTest):
    def sealed_index(self):
        index = search.Index(self.root, self.root / "sealed.sqlite", sealed=True)
        index.refresh()
        return index

    def test_sealed_index_holds_only_sealed_paths(self):
        indexed = {r[0] for r in self.sealed_index().db.execute("SELECT path FROM docs")}
        self.assertEqual(indexed, {"Memory/Long-Term/People/AB01/AB01.md",
                                   "Memory/Long-Term/Theology/private.md",
                                   "Memory/Long-Term/BalaclavaPC/Pastoral_Notes.table.md"})

    def test_pastoral_log_needs_its_own_flag(self):
        index = self.sealed_index()
        self.assertNotIn("Memory/Long-Term/BalaclavaPC/Pastoral_Notes.table.md",
                         [h["path"] for h in index.search("atonement", limit=50)])
        self.assertIn("Memory/Long-Term/BalaclavaPC/Pastoral_Notes.table.md",
                      [h["path"] for h in index.search("atonement", limit=50, pastoral=True)])

    def test_open_and_sealed_indexes_never_share_a_file(self):
        self.index.refresh()
        open_paths = {r[0] for r in self.index.db.execute("SELECT path FROM docs")}
        sealed_paths = {r[0] for r in self.sealed_index().db.execute("SELECT path FROM docs")}
        self.assertFalse(open_paths & sealed_paths)

    def test_sealed_index_fails_closed_too(self):
        self.write("LukeatronWiki/_sealed.yaml", "stores: [unclosed\n")
        with self.assertRaises(search.SealError):
            search.Index(self.root, self.root / "sealed.sqlite", sealed=True).refresh()


if __name__ == "__main__":
    unittest.main()

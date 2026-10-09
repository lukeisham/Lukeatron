"""Tests for memory_index sync and lint. Each test builds a throwaway Long-Term tree."""
import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import memory_index  # noqa: E402

PREACHING = """store: Preaching
last_updated: 2026-01-01
contents:
  - path: "Sources.md"
    what: "Sources"
  - path: "Topical/Sermon forksaken.txt"
    what: "A sermon"
archived:
  - file: Gone.md
    moved_to: "Archive/Gone.md"
"""

PEOPLE = """store: People
people:
  - id: AB01
    name: Ann Bee
    file: AB01 Ann Bee/AB01 Ann Bee.md
"""


class IndexTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.lt = Path(tmp.name) / "Memory" / "Long-Term"
        self.write("Preaching/_index.yaml", PREACHING)
        self.write("Preaching/Sources.md", "# Sources\n\nList of sources.\n")
        self.write("Preaching/Topical/Sermon forksaken.txt", "My God, why have you forsaken me\n")
        self.write("People/_index.yaml", PEOPLE)
        self.write("People/AB01 Ann Bee/AB01 Ann Bee.md", "# Ann Bee\n")
        self.write("People/AB01 Ann Bee/support-plan.pdf", "pdf")
        original = memory_index.ROOT
        memory_index.ROOT = self.lt
        self.addCleanup(setattr, memory_index, "ROOT", original)

    def write(self, rel, text):
        path = self.lt / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def run_quiet(self, func):
        with contextlib.redirect_stdout(io.StringIO()) as out:
            result = func()
        return result, out.getvalue()

    def test_clean_tree_passes(self):
        problems, _ = self.run_quiet(memory_index.lint)
        self.assertEqual(problems, 0)

    def test_renamed_nested_file_is_stale_and_uncovered(self):
        old = self.lt / "Preaching/Topical/Sermon forksaken.txt"
        old.rename(old.with_name("Sermon forsaken.txt"))
        problems, out = self.run_quiet(memory_index.lint)
        self.assertGreater(problems, 0)
        self.assertIn("STALE", out)
        self.assertIn("UNCOVERED", out)
        self.run_quiet(memory_index.sync)
        text = (self.lt / "Preaching/_index.yaml").read_text()
        self.assertNotIn("forksaken", text)
        self.assertIn('"Topical/Sermon forsaken.txt"', text)
        self.assertEqual(self.run_quiet(memory_index.lint)[0], 0)

    def test_new_nested_file_is_added_with_its_nested_path(self):
        self.write("Preaching/Topical/Second sermon.txt", "Text\n")
        self.run_quiet(memory_index.sync)
        self.assertIn('"Topical/Second sermon.txt"', (self.lt / "Preaching/_index.yaml").read_text())

    def test_listed_folder_covers_everything_below_it(self):
        self.write("Preaching/_index.yaml", PREACHING.replace("contents:\n", "contents:\n  - folder: Series/\n"))
        self.write("Preaching/Series/one/deep.md", "x\n")
        problems, out = self.run_quiet(memory_index.lint)
        self.assertNotIn("Series", out)

    def test_history_entries_are_never_stale(self):
        _, out = self.run_quiet(memory_index.lint)
        self.assertNotIn("Gone.md", out)

    def test_person_folder_covers_its_extra_files_and_names_are_not_paths(self):
        _, out = self.run_quiet(memory_index.lint)
        self.assertNotIn("support-plan.pdf", out)
        self.assertNotIn("Ann Bee:", out)

    def test_sync_never_touches_valid_entries(self):
        before = (self.lt / "Preaching/_index.yaml").read_text()
        self.write("Preaching/New.md", "# New\n")
        self.run_quiet(memory_index.sync)
        after = (self.lt / "Preaching/_index.yaml").read_text()
        for line in before.splitlines()[2:]:
            self.assertIn(line, after)


if __name__ == "__main__":
    unittest.main()

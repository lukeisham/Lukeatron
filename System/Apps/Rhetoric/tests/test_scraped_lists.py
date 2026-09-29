"""Smoke tests for seed/scraped_lists.py, on a small sample and on the real recovered file."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from seed import scraped_lists as sl  # noqa: E402

SAMPLE = """# Title
## Alpha List
Source: https://example.org
(a note line that
spans two lines)

Top 2 figures: Anaphora, Metaphor

Full index (3): Anaphora, Metaphor, Zeugma

## Beta List
Source: https://example.org

Metaphor, Climax (Plot), Palindrome (definition truncated in source pull — verify on page)

## Triage note for x
- ignored
"""


class ScrapedListsTest(unittest.TestCase):
    def test_parses_sections_skipping_notes_top_subset_and_triage(self):
        lists = sl.parse_lists(SAMPLE)
        self.assertEqual(lists["Alpha List"], ["Anaphora", "Metaphor", "Zeugma"])
        self.assertEqual(lists["Beta List"], ["Metaphor", "Climax (Plot)", "Palindrome"])
        self.assertEqual(set(lists), {"Alpha List", "Beta List"})

    def test_counts_lists_naming_a_device_including_via_alias(self):
        lists = sl.parse_lists(SAMPLE)
        self.assertEqual(sl.count_lists_naming(["metaphor"], lists), 2)
        self.assertEqual(sl.count_lists_naming(["Zeugma"], lists), 1)
        self.assertEqual(sl.count_lists_naming(["Climax"], lists), 1)
        self.assertEqual(sl.count_lists_naming(["Nonesuch", "Anaphora"], lists), 1)

    def test_union_orders_most_named_first(self):
        rows = sl.union_with_counts(sl.parse_lists(SAMPLE))
        self.assertEqual(rows[0], {"name": "Metaphor", "lists_naming": 2})

    def test_real_file_gives_four_lists_and_shared_devices(self):
        path = next(Path(__file__).resolve().parents[4].glob("System/Sandbox/Rhetoric-seed/scraped-device-lists.md"), None)
        if path is None:
            self.skipTest("recovered file not present")
        lists = sl.read_lists(path)
        self.assertEqual(len(lists), 4)
        self.assertEqual(len(lists['American Rhetoric — Rhetorical Devices in Sound']), 40)
        self.assertEqual(sl.count_lists_naming(["Anaphora"], lists), 4)


if __name__ == "__main__":
    unittest.main()

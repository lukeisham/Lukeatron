"""The verse: NIV online and cached, BSB offline and labelled, nothing when both fail.

Mirrors: core/verse.py
"""

import unittest
from datetime import date
from pathlib import Path

from helpers import FIXTURES, HOME_DIR, temp_root
from core import verse

FEED = (FIXTURES / "feed_niv.json").read_bytes()
BSB = FIXTURES / "bsb_sample.txt"
DAY = date(2026, 9, 29)


class TestVerse(unittest.TestCase):
    def setUp(self):
        self._tmp = temp_root()
        self.root = Path(self._tmp.name)
        self.refs = self.root / "verses.txt"
        self.refs.write_text("# comment\nJOH 3:16\nPSA 23:1-2\n", encoding="utf-8")
        self.calls = 0

    def tearDown(self):
        self._tmp.cleanup()

    def fetch_ok(self):
        self.calls += 1
        return verse.parse_feed(FEED)

    def fetch_fail(self):
        self.calls += 1
        raise verse.VerseError("offline")

    def today(self, fetch, bsb=BSB):
        return verse.todays_verse(today=DAY, cache_file=self.root / "cache" / "verse.json",
                                  refs_file=self.refs, bsb_file=bsb, fetch=fetch)

    def test_feed_is_parsed_with_its_notice(self):
        niv = verse.parse_feed(FEED)
        self.assertEqual((niv.reference, niv.version, niv.label), ("1 Corinthians 2:14", "NIV", "NIV"))
        self.assertTrue(niv.text.startswith("The person without the Spirit"))
        self.assertIn("&version=NIV", niv.link)
        self.assertIn("Biblica", niv.notice)

    def test_second_call_the_same_day_uses_the_cache(self):
        self.today(self.fetch_ok)
        self.today(self.fetch_ok)
        self.assertEqual(self.calls, 1)

    def test_offline_gives_a_labelled_bsb_verse_and_is_not_cached(self):
        bsb = self.today(self.fetch_fail)
        self.assertEqual(bsb.version, "BSB")
        self.assertEqual(bsb.label, "Berean Standard Bible · offline")
        self.assertIsNone(bsb.link)
        self.assertFalse((self.root / "cache" / "verse.json").exists())
        self.assertEqual(self.today(self.fetch_ok).version, "NIV")

    def test_ranges_join_verses_in_order(self):
        ref = verse.parse_reference("PSA 23:1-2")
        self.assertEqual(ref.display(), "Psalm 23:1–2")
        self.assertEqual(verse.bsb_text(BSB, ref), "The LORD is my shepherd; I shall not want. He makes me lie down in green pastures; He leads me beside quiet waters.")

    def test_day_of_year_picks_the_line(self):
        picked = verse.offline_verse(self.refs, BSB, date(2026, 1, 2))
        self.assertEqual(picked.reference, "Psalm 23:1–2")

    def test_both_failing_gives_none(self):
        self.assertIsNone(self.today(self.fetch_fail, bsb=self.root / "missing.txt"))

    def test_malformed_feed_is_an_error_not_a_crash(self):
        for raw in (b"{}", b"not json", b'{"votd": {"content": "", "display_ref": ""}}'):
            with self.subTest(raw=raw), self.assertRaises(verse.VerseError):
                verse.parse_feed(raw)

    def test_every_shipped_reference_is_well_formed(self):
        refs = verse.load_references(HOME_DIR / "verses.txt")
        self.assertGreaterEqual(len(refs), 365)
        # Resolving each against the real BSB file is checked at build time against Memory/, not here (TEST-4).


if __name__ == "__main__":
    unittest.main()

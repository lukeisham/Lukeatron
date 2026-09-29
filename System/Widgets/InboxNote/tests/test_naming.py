"""Filenames per note-save FR-4 (AC-1, AC-2). Mirrors: inbox_note/naming.py

Run: python3 -m unittest discover -s tests
"""

import unittest
from datetime import datetime, timedelta, timezone

import helpers  # noqa: F401
from inbox_note.naming import note_stem, slug

NOW = datetime(2026, 9, 29, 14, 12, 5, tzinfo=timezone(timedelta(hours=10)))


class TestNaming(unittest.TestCase):
    def test_stem_from_first_five_words(self):
        self.assertEqual(note_stem("Call the printer about **Sunday** - order sheet", NOW),
                         "2026-09-29-1412-call-the-printer-about-sunday")

    def test_slug_cases(self):
        cases = {
            "https://example.com": "note",
            "Café réunion": "cafe-reunion",
            "[Agenda](https://x.y) for Tuesday": "agenda-for-tuesday",
            "🙂 🙂": "note",
            "a" * 50: "a" * 40,
            "alpha bravo charlie delta echoechoechoecho": "alpha-bravo-charlie-delta",
        }
        for text, expected in cases.items():
            with self.subTest(text=text):
                self.assertEqual(slug(text), expected)


if __name__ == "__main__":
    unittest.main()

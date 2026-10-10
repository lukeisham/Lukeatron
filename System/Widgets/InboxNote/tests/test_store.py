"""Validation and the create-only write.
Mirrors: inbox_note/store.py — always in a temp directory, never the real Inbox/ (TEST-4).
"""

import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

import helpers  # noqa: F401
from inbox_note import MAX_CHARS, NoteRejected, save_note

NOW = datetime(2026, 9, 29, 14, 12, 5, tzinfo=timezone(timedelta(hours=10)))
NOTE = "Call the printer about **Sunday**\r\n- order sheet  \n"


class TestStore(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.inbox = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_writes_front_matter_and_trimmed_note(self):
        name = save_note(self.inbox, NOTE, NOW)
        self.assertEqual(name, "2026-09-29-1412-call-the-printer-about-sunday.md")
        self.assertEqual((self.inbox / name).read_text(encoding="utf-8"),
                         "---\nsource: Home · InboxNote\ncaptured: 2026-09-29T14:12:05+10:00\n---\n\n"
                         "Call the printer about **Sunday**\n- order sheet\n")

    def test_clash_gets_suffix_and_first_file_is_untouched(self):
        first = save_note(self.inbox, NOTE, NOW)
        original = (self.inbox / first).read_bytes()
        names = [save_note(self.inbox, NOTE, NOW) for _ in range(2)]
        self.assertEqual(names, [first.replace(".md", "-2.md"), first.replace(".md", "-3.md")])
        self.assertEqual((self.inbox / first).read_bytes(), original)

    def test_limit_counts_code_points(self):
        save_note(self.inbox, "🙂" * MAX_CHARS, NOW)
        with self.assertRaises(NoteRejected) as caught:
            save_note(self.inbox, "x" * (MAX_CHARS + 1), NOW)
        self.assertEqual(caught.exception.reason, "too_long")
        self.assertEqual(len(list(self.inbox.iterdir())), 1)

    def test_rejects_empty_and_missing_inbox_without_writing(self):
        for text, inbox, reason in (("  \n ", self.inbox, "empty"), ("hi", self.inbox / "gone", "no_inbox")):
            with self.subTest(reason=reason), self.assertRaises(NoteRejected) as caught:
                save_note(inbox, text, NOW)
            self.assertEqual(caught.exception.reason, reason)
        self.assertEqual(list(self.inbox.iterdir()), [])
        self.assertFalse((self.inbox / "gone").exists())


if __name__ == "__main__":
    unittest.main()

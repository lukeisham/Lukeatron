"""quotes: tells a real quote from a constructed example, splits a quote from its source line, and
shapes the quotes items.py sends to the Index group."""
import sqlite3
import unittest
from pathlib import Path

import quotes

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()


class SplitQuoteTest(unittest.TestCase):
    def test_a_quote_splits_into_its_words_and_its_source_line(self):
        body = '"Ask not *what* your country can do for you" (Kennedy, inaugural address, 20 January 1961)'
        self.assertEqual(quotes.split_quote(body), ('"Ask not *what* your country can do for you"',
                                                    "Kennedy, inaugural address, 20 January 1961"))

    def test_a_note_inside_the_closing_parenthesis_stays_in_the_source_line(self):
        body = '"x" (Donne, "Death, be not proud" (Holy Sonnet X); spelling modernised)'
        self.assertEqual(quotes.split_quote(body)[1], 'Donne, "Death, be not proud" (Holy Sonnet X); spelling modernised')

    def test_a_body_with_no_closing_parenthesis_has_no_source(self):
        self.assertEqual(quotes.split_quote("He walked slowly"), ("He walked slowly", ""))


class QuotesTest(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.executescript(SCHEMA)
        self.conn.execute("INSERT INTO entries (name, definition) VALUES ('Metaphor', 'd')")
        self.conn.executemany("INSERT INTO examples (entry_id, body, attribution, quote_date) VALUES (1, ?, ?, ?)", [
            ("constructed (just a note)", "Unattributed", None),
            ('"All the world\'s a stage" (Shakespeare, *As You Like It*, 2.7)', "William Shakespeare", None),
            ('"Ask not" (Kennedy, 20 January 1961)', "John F. Kennedy", "1961-01-20"),
            ('"Hominem laudem?" (*Reference Handbook*, book 4, §28)', "Unattributed", None)])

    def test_only_real_quotes_are_listed_with_their_parts(self):
        found = quotes.quotes(self.conn)
        self.assertEqual([q["text"] for q in found], ['"All the world\'s a stage"', '"Ask not"', '"Hominem laudem?"'])
        self.assertEqual(found[1], {"id": 3, "entry_id": 1, "text": '"Ask not"', "source": "Kennedy, 20 January 1961",
                                    "author": "John F. Kennedy", "date": "1961-01-20"})

    def test_an_unattributed_quote_has_no_author_and_an_unknown_date_is_none(self):
        found = quotes.quotes(self.conn)
        self.assertIsNone(found[2]["author"])
        self.assertEqual(found[2]["source"], "*Reference Handbook*, book 4, §28")
        self.assertIsNone(found[0]["date"])


if __name__ == "__main__":
    unittest.main()

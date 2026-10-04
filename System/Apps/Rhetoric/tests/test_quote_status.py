"""quote_status: tells a real quote (credited, or citing a work) from a constructed example."""
import sqlite3
import unittest
from pathlib import Path

from quotes import is_real_quote
from seed import quote_status

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()


class IsRealQuoteTest(unittest.TestCase):
    def test_a_credit_makes_a_real_quote(self):
        self.assertTrue(is_real_quote("Cicero", "plain text"))

    def test_an_anonymous_work_is_recognised_by_its_citation(self):
        body = '"Hominem laudem?" (*Rhetorica ad Herennium*, book 4, §28: "Am I to praise?", English by Claude (AI))'
        self.assertTrue(is_real_quote("Unattributed", body))
        self.assertTrue(is_real_quote("Unattributed", '"x" (Matthew 6:11, KJV)'))
        self.assertTrue(is_real_quote("Unattributed", '"x" (Cicero, trans. Yonge)'))

    def test_a_constructed_example_is_not_a_real_quote(self):
        for body in ('"If we don\'t hang together, we\'ll all hang separately." (hang: cooperate / execute)',
                     '"Well begun is half done." (traditional saying)',
                     "He walked quite slowly to the store",
                     "Think of the children! (without relevant connection)"):
            self.assertFalse(is_real_quote("Unattributed", body), body)


class DevicesWithoutQuoteTest(unittest.TestCase):
    def test_lists_only_devices_with_no_real_quote(self):
        conn = sqlite3.connect(":memory:")
        conn.executescript(SCHEMA)
        for hierarchy, name in (("category", "C"), ("form", "F"), ("function", "U")):
            conn.execute("INSERT INTO nodes (hierarchy, name, definition) VALUES (?, ?, 'd')", (hierarchy, name))
        for name in ("Plain", "Credited", "Anonymous"):
            conn.execute("INSERT INTO devices (name, definition, form_node_id, function_node_id, popularity) "
                         "VALUES (?, 'd', 2, 3, 10)", (name,))
        conn.executemany("INSERT INTO examples (device_id, body, attribution) VALUES (?, ?, ?)", [
            (1, "constructed (just a note)", "Unattributed"),
            (2, "a quote", "Austen"),
            (3, '"x" (*Some Work*, 4.2)', "Unattributed")])
        self.assertEqual(quote_status.devices_without_quote(conn), ["Plain"])


if __name__ == "__main__":
    unittest.main()

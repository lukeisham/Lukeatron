"""load_devices: writes valid devices, holds back a device with a missing placement (and its
Flipside), sets popularity and the flipside link."""
import sqlite3
import unittest
from pathlib import Path

from seed import load_devices

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()


def make_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    for hierarchy, name in (("category", "Fallacy"), ("category", "Fallacy Flipside"),
                            ("form", "Argument Structure"), ("function", "Persuasion")):
        conn.execute("INSERT INTO nodes (hierarchy, name, definition) VALUES (?, ?, 'd')", (hierarchy, name))
    return conn


def device(name, **over):
    base = {"name": name, "definition": "d", "examples": ["e *ergo*"], "aliases": [], "flipside_of": None,
            "lists_naming": 2, "category": "Fallacy", "form": "Argument Structure", "function": "Persuasion"}
    return {**base, **over}


class LoadDevicesTest(unittest.TestCase):
    def setUp(self):
        self.conn = make_db()
        self.ids = {t: load_devices.node_ids(self.conn, t) for t in load_devices.TREES}

    def test_writes_devices_examples_popularity_and_flipside_link(self):
        devices = [device("Straw Man"), device("Fair Sketch", category="Fallacy Flipside",
                                               flipside_of="Straw Man", lists_naming=0)]
        ready, held = load_devices.split_devices(devices, self.ids)
        with self.conn:
            load_devices.write_devices(self.conn, ready, self.ids)
        self.assertEqual(held, [])
        self.assertEqual(self.conn.execute("SELECT popularity FROM devices WHERE name = 'Straw Man'").fetchone()[0], 50)
        link = self.conn.execute("SELECT f.name FROM devices d JOIN devices f ON f.id = d.flipside_of "
                                 "WHERE d.name = 'Fair Sketch'").fetchone()
        self.assertEqual(link, ("Straw Man",))
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM examples").fetchone()[0], 2)
        self.assertEqual(load_devices.wrong_hierarchy_links(self.conn), 0)

    def test_device_with_no_placement_is_held_and_takes_its_flipside_with_it(self):
        devices = [device("Reification", form=None),
                   device("Living Abstraction", category="Fallacy Flipside", flipside_of="Reification"),
                   device("Red Herring")]
        ready, held = load_devices.split_devices(devices, self.ids)
        self.assertEqual([d["name"] for d in ready], ["Red Herring"])
        self.assertEqual({name for name, _ in held}, {"Reification", "Living Abstraction"})

    def test_several_category_tags_are_written_and_each_must_exist(self):
        ready, held = load_devices.split_devices(
            [device("Straw Man", category=["Fallacy", "Fallacy Flipside"]),
             device("X", category=["Fallacy", "Nope"])], self.ids)
        self.assertEqual([d["name"] for d in ready], ["Straw Man"])
        self.assertIn("category", held[0][1])
        with self.conn:
            load_devices.write_devices(self.conn, ready, self.ids)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM device_categories").fetchone()[0], 2)

    def test_unknown_path_is_held(self):
        ready, held = load_devices.split_devices([device("X", function="Nope")], self.ids)
        self.assertEqual(ready, [])
        self.assertIn("function", held[0][1])


if __name__ == "__main__":
    unittest.main()

"""Discovering apps from folders, merging catalog.json, and the agent-facing text.

Mirrors: core/catalog.py
"""

import unittest

from helpers import FakePorts, make_tree, temp_root
from core import catalog


def records(up=()):
    with temp_root() as tmp:
        from pathlib import Path

        root = Path(tmp)
        apps = make_tree(root)
        cat = catalog.load_catalog(root / "catalog.json")
        return {r.name: r for r in catalog.build_records(apps, cat, probe_fn=FakePorts(set(up)))}


class TestCatalog(unittest.TestCase):
    def test_folders_decide_existence_and_phase(self):
        found = records()
        self.assertNotIn("Home", found)
        self.assertNotIn("_private", found)
        self.assertNotIn("Gone", found)  # catalog entry without a folder is ignored
        self.assertEqual((found["Draft"].state, found["Draft"].phase), ("build", "specs"))
        self.assertEqual((found["Early"].state, found["Early"].phase), ("build", "PRD"))

    def test_a_new_folder_appears_as_unsorted_without_code_changes(self):
        early = records()["Early"]
        self.assertEqual((early.context, early.open_url), ("Unsorted", None))
        loose = records()["Loose"]
        self.assertEqual((loose.state, loose.context, loose.open_url), ("none", "Unsorted", None))

    def test_states_follow_the_port_probe(self):
        self.assertEqual(records()["Wiki"].state, "stopped")
        self.assertEqual(records(up={18787})["Wiki"].state, "live")
        self.assertEqual(records()["Riddle"].state, "file")
        self.assertEqual(records()["Units"].state, "stopped")

    def test_titles_and_open_urls(self):
        found = records()
        self.assertEqual(found["Board"].title, "Dashboard")
        self.assertEqual(found["Wiki"].open_url, "/open/Wiki")

    def test_sorted_by_context_then_title(self):
        with temp_root() as tmp:
            from pathlib import Path

            root = Path(tmp)
            apps = make_tree(root)
            ordered = catalog.build_records(apps, catalog.load_catalog(root / "catalog.json"), probe_fn=FakePorts())
        contexts = [r.context for r in ordered]
        self.assertEqual(contexts, sorted(contexts, key=catalog.CONTEXT_ORDER.index))

    def test_record_shape_is_the_agent_contract(self):
        keys = set(records()["Wiki"].to_dict())
        self.assertEqual(keys, {"name", "title", "context", "blurb", "state", "phase", "port", "open_url"})

    def test_llms_text_lists_every_app(self):
        text = catalog.llms_text(list(records().values()))
        for name in ("Wiki", "Draft", "Loose"):
            self.assertIn(f"[{name}]", text)
        self.assertIn("X-Home-Key", text)


if __name__ == "__main__":
    unittest.main()

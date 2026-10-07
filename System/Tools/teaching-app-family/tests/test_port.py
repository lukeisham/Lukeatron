"""Carrying a change from one app to another: renaming, three-way merging, what is flagged, undo."""
import json
import unittest

import changes
import port
import sync
from helpers import FamilyTree


def change_of(tree: FamilyTree, app: str) -> dict:
    return {"id": "c1", "app": app, "status": "pending", "targets": None, "files": changes.changed_files(tree.family, app)}


class ForwardTest(unittest.TestCase):
    def setUp(self):
        self.tree = FamilyTree()
        members = self.tree.family.members
        self.grammar, self.logic, self.style = members["Grammar"], members["Logic"], members["Style"]

    def tearDown(self):
        self.tree.close()

    def test_the_apps_own_names_become_the_targets(self):
        text = "<title>Grammar</title> grammar.db grammar.toggles port 8802 and 88020"
        self.assertEqual(port.forward(text, self.grammar, self.logic), "<title>Logic</title> logic.db logic.toggles port 8803 and 88020")

    def test_a_word_that_is_also_code_is_left_alone(self):
        text = "el.style.width = 1; const style = 'x'; Style guide"
        self.assertEqual(port.forward(text, self.style, self.grammar), "el.style.width = 1; const style = 'x'; Grammar guide")

    def test_the_item_noun_is_not_renamed_but_is_flagged_when_it_arrives(self):
        before = "one\ntwo\n"
        after = "one\nSearch patterns…\nThe form is here\n"
        self.assertEqual(port.noun_lines(before, after, self.grammar, self.logic), ["Search patterns…"])
        self.assertEqual(port.noun_lines(before, after, self.grammar, self.grammar), [])


class PlanTest(unittest.TestCase):
    def setUp(self):
        self.tree = FamilyTree()

    def tearDown(self):
        self.tree.close()

    def plan_to(self, source: str, targets: list[str]) -> dict:
        return port.plan(self.tree.family, change_of(self.tree, source), targets)

    def test_an_edit_in_a_part_the_target_left_alone_merges_cleanly_and_takes_the_targets_names(self):
        self.tree.write("Grammar", "app/render.js", self.tree.read("Grammar", "app/render.js").replace("return 2;", "return 22;"))
        self.tree.write("Logic", "app/render.js", self.tree.read("Logic", "app/render.js").replace("return 1;", "return 11;"))  # the target's own, different edit
        [entry] = self.plan_to("Grammar", ["Logic"])["Logic"]
        self.assertEqual(entry["status"], "clean")
        self.assertIn("return 11;", entry["merged"])
        self.assertIn("return 22;", entry["merged"])
        self.assertIn("'Search forms…'", entry["merged"])  # the target's own wording survives

    def test_a_changed_line_that_speaks_of_the_source_noun_is_marked_for_review(self):
        self.tree.write("Grammar", "app/render.js", self.tree.read("Grammar", "app/render.js") + "const none = 'No patterns match.';\n")
        [entry] = self.plan_to("Grammar", ["Logic"])["Logic"]
        self.assertEqual((entry["status"], entry["lines"]), ("review", ["const none = 'No patterns match.';"]))

    def test_the_same_lines_changed_in_both_apps_is_a_conflict_and_writes_nothing(self):
        self.tree.write("Grammar", "app/render.js", self.tree.read("Grammar", "app/render.js").replace("return 1;", "return 100;"))
        self.tree.write("Logic", "app/render.js", self.tree.read("Logic", "app/render.js").replace("return 1;", "return 200;"))
        [entry] = self.plan_to("Grammar", ["Logic"])["Logic"]
        self.assertEqual((entry["status"], entry["merged"]), ("conflict", None))

    def test_a_new_file_is_added_to_a_target_that_lacks_it_and_conflicts_where_it_exists(self):
        self.tree.write("Grammar", "app/new.js", "const port = 8802;\n")
        self.tree.write("Logic", "app/other.js", "x\n")
        entries = self.plan_to("Grammar", ["Logic", "Style"])
        self.assertEqual([(e["path"], e["status"], e["merged"]) for e in entries["Logic"]], [("app/new.js", "added", "const port = 8803;\n")])
        self.tree.write("Style", "app/new.js", "mine\n")
        self.assertEqual(self.plan_to("Grammar", ["Style"])["Style"][0]["status"], "conflict")

    def test_a_file_that_exists_only_in_the_source_app_is_skipped(self):
        self.tree.write("Style", "app/grid.css", ".grid { gap: 2px; }\n")
        [entry] = self.plan_to("Style", ["Grammar"])["Grammar"]
        self.assertEqual((entry["status"], entry["merged"]), ("skipped", None))

    def test_a_deleted_file_is_reported_not_deleted(self):
        self.tree.path("Grammar", "server.py").unlink()
        [entry] = self.plan_to("Grammar", ["Logic"])["Logic"]
        self.assertEqual(entry["status"], "removed")

    def test_the_diverged_member_is_always_a_note_for_hand_work(self):
        self.tree.write("Grammar", "app/render.js", "changed\n")
        self.assertEqual([e["status"] for e in self.plan_to("Grammar", ["Rhetoric"])["Rhetoric"]], ["manual"])
        self.tree.write("Rhetoric", "app/render.js", "changed\n")
        self.assertEqual([e["status"] for e in self.plan_to("Rhetoric", ["Logic"])["Logic"]], ["manual"])

    def test_a_target_already_holding_the_change_is_skipped(self):
        self.tree.write("Grammar", "app/render.js", self.tree.read("Grammar", "app/render.js").replace("return 2;", "return 22;"))
        self.tree.write("Logic", "app/render.js", self.tree.read("Logic", "app/render.js").replace("return 2;", "return 22;"))
        self.assertEqual(self.plan_to("Grammar", ["Logic"])["Logic"][0]["status"], "skipped")


class ApplyTest(unittest.TestCase):
    def setUp(self):
        self.tree = FamilyTree()
        self.family = self.tree.family
        self.undo_dir = self.tree.root / "state" / "undo"

    def tearDown(self):
        self.tree.close()

    def edit_grammar(self) -> dict:
        self.tree.write("Grammar", "app/render.js", self.tree.read("Grammar", "app/render.js").replace("return 2;", "return 22;"))
        self.tree.write("Grammar", "app/new.js", "const port = 8802;\n")
        record = change_of(self.tree, "Grammar")
        changes.write_record(self.family, record)
        return record

    def test_apply_writes_what_merged_leaves_the_rest_and_undo_restores_it_all(self):
        record = self.edit_grammar()
        before = self.tree.read("Logic", "app/render.js")
        left = port.apply(self.family, "c1", port.plan(self.family, record, ["Logic"]), self.undo_dir)
        self.assertIn("return 22;", self.tree.read("Logic", "app/render.js"))
        self.assertEqual(self.tree.read("Logic", "app/new.js"), "const port = 8803;\n")
        self.assertTrue(all("merged" not in entry for entry in left["Logic"]))
        port.undo(self.family, "c1", self.undo_dir)
        self.assertEqual(self.tree.read("Logic", "app/render.js"), before)
        self.assertFalse(self.tree.path("Logic", "app/new.js").exists())

    def test_finish_makes_everything_the_new_baseline_so_nothing_looks_changed(self):
        record = self.edit_grammar()
        record["targets"] = ["Logic"]
        port.apply(self.family, "c1", port.plan(self.family, record, ["Logic"]), self.undo_dir)
        sync.finish(self.family, record)
        for app in ("Grammar", "Logic"):
            self.assertEqual(changes.changed_files(self.family, app), [], app)
        self.assertEqual(changes.read_record(self.family, "c1")["status"], "done")

    def test_deciding_none_closes_the_change_accepts_it_and_can_leave_a_standing_rule(self):
        record = self.edit_grammar()
        policy_path = self.tree.root / "policy.json"
        policy_path.write_text(json.dumps({"default": "ask", "rules": []}), encoding="utf-8")
        sync.decide(self.family, record, "none", "app/*", policy_path)
        self.assertEqual((record["status"], changes.changed_files(self.family, "Grammar")), ("dismissed", []))
        self.assertEqual(json.loads(policy_path.read_text())["rules"], [{"app": "Grammar", "files": "app/*", "propagate": "none"}])

    def test_deciding_some_records_those_targets_and_an_unknown_target_is_refused(self):
        record = self.edit_grammar()
        policy_path = self.tree.root / "policy.json"
        policy_path.write_text(json.dumps({"default": "ask", "rules": []}), encoding="utf-8")
        sync.decide(self.family, record, "Logic,Style", None, policy_path)
        self.assertEqual((record["status"], record["targets"]), ("decided", ["Logic", "Style"]))
        with self.assertRaises(ValueError):
            sync.decide(self.family, record, "Nowhere", None, policy_path)
        with self.assertRaises(ValueError):
            sync.decide(self.family, record, "Grammar", None, policy_path)  # not to itself


if __name__ == "__main__":
    unittest.main()

"""Noticing function changes against the baseline, and what the policy does with them."""
import unittest

import changes
import policy as policy_rules
from helpers import FamilyTree

ASK = {"default": "ask", "rules": []}


class ChangesTest(unittest.TestCase):
    def setUp(self):
        self.tree = FamilyTree()
        self.family = self.tree.family

    def tearDown(self):
        self.tree.close()

    def test_a_fresh_snapshot_has_nothing_changed_and_data_never_counts(self):
        self.assertEqual(changes.changed_files(self.family, "Grammar"), [])
        self.tree.write("Grammar", "grammar.db", "different data")
        self.tree.write("Grammar", "app-decisions.md", "more decisions")
        self.assertEqual(changes.changed_files(self.family, "Grammar"), [])

    def test_modified_added_and_removed_files_are_each_named(self):
        self.tree.write("Grammar", "app/render.js", "changed\n")
        self.tree.write("Grammar", "app/new.js", "new\n")
        self.tree.path("Grammar", "server.py").unlink()
        self.assertEqual(changes.changed_files(self.family, "Grammar"),
                         [{"path": "app/new.js", "kind": "added"}, {"path": "server.py", "kind": "removed"}, {"path": "app/render.js", "kind": "modified"}])

    def test_an_app_without_a_baseline_reports_nothing(self):
        self.assertEqual(changes.changed_files(self.family, "Research"), [])

    def test_detect_makes_one_record_per_changed_app_and_announces_it_once(self):
        self.tree.write("Grammar", "app/render.js", "changed\n")
        first = changes.detect(self.family, ASK)
        self.assertEqual([(r["app"], r["status"], [f["path"] for f in r["files"]]) for r in first], [("Grammar", "pending", ["app/render.js"])])
        first[0]["announced"] = True
        changes.write_record(self.family, first[0])
        self.assertEqual(changes.detect(self.family, ASK), [])  # still pending, not announced again
        self.assertEqual(len(changes.open_records(self.family)), 1)

    def test_a_further_edit_updates_the_same_record(self):
        self.tree.write("Grammar", "app/render.js", "one\n")
        first = changes.detect(self.family, ASK)[0]
        self.tree.write("Grammar", "server.py", "PORT = 1\n")
        changes.detect(self.family, ASK)
        records = changes.open_records(self.family)
        self.assertEqual((len(records), records[0]["id"], sorted(f["path"] for f in records[0]["files"])), (1, first["id"], ["app/render.js", "server.py"]))

    def test_a_change_to_app_only_files_is_dismissed_without_a_question(self):
        self.tree.write("Style", "app/grid.css", ".grid { gap: 1px; }\n")
        self.assertEqual(changes.detect(self.family, ASK), [])
        self.assertEqual(changes.open_records(self.family), [])
        self.assertEqual(changes.changed_files(self.family, "Style"), [])  # accepted into the baseline

    def test_a_remembered_rule_settles_a_change_without_asking(self):
        none_rules = {"default": "ask", "rules": [{"app": "*", "files": "tests/*", "propagate": "none"}]}
        self.tree.write("Logic", "tests/test_x.py", "x\n")
        self.assertEqual(changes.detect(self.family, none_rules), [])
        all_rules = {"default": "ask", "rules": [{"app": "Logic", "files": "app/*", "propagate": "all"}]}
        self.tree.write("Logic", "app/render.js", "y\n")
        [record] = changes.detect(self.family, all_rules)
        self.assertEqual((record["status"], sorted(record["targets"])), ("decided", ["Grammar", "Rhetoric", "Style"]))

    def test_mixed_rules_still_ask(self):
        rules = {"default": "ask", "rules": [{"app": "*", "files": "tests/*", "propagate": "none"}]}
        self.tree.write("Logic", "tests/test_x.py", "x\n")
        self.tree.write("Logic", "app/render.js", "y\n")
        self.assertEqual(len(changes.detect(self.family, rules)), 1)

    def test_an_app_being_written_to_by_a_propagation_is_not_a_new_change(self):
        changes.set_active(self.family, "id1", ["Grammar"])
        self.tree.write("Grammar", "app/render.js", "arrived\n")
        self.assertEqual(changes.detect(self.family, ASK), [])
        changes.set_active(self.family, None)
        self.assertEqual(len(changes.detect(self.family, ASK)), 1)

    def test_remember_puts_the_newest_rule_first(self):
        rules = {"default": "ask", "rules": []}
        path = self.tree.root / "policy.json"
        policy_rules.remember(rules, "Style", "app/*.css", "none", path)
        policy_rules.remember(rules, "Style", "app/*.css", "all", path)
        self.assertEqual(policy_rules.rule_for(rules, "Style", "app/list.css"), "all")
        self.assertEqual(policy_rules.rule_for(rules, "Logic", "app/list.css"), "ask")


if __name__ == "__main__":
    unittest.main()

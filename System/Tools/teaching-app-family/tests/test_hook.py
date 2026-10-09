"""The hooks: what marks an app, and what makes a turn's end hold for the propagation skill."""
import json
import unittest

import changes
import hook
from helpers import FamilyTree


class HookTest(unittest.TestCase):
    def setUp(self):
        self.tree = FamilyTree()
        self.family = self.tree.family

    def tearDown(self):
        self.tree.close()

    def edit_event(self, app: str, rel: str) -> dict:
        return {"tool_name": "Edit", "tool_input": {"file_path": str(self.tree.path(app, rel))}}

    def test_an_edit_to_a_function_file_marks_its_app_and_an_edit_to_data_or_elsewhere_marks_nothing(self):
        self.assertEqual(hook.apps_touched(self.family, self.edit_event("Grammar", "app/render.js")), {"Grammar"})
        self.assertEqual(hook.apps_touched(self.family, self.edit_event("Grammar", "grammar.db")), set())
        self.assertEqual(hook.apps_touched(self.family, {"tool_name": "Write", "tool_input": {"file_path": "/tmp/x.py"}}), set())
        self.assertEqual(hook.apps_touched(self.family, {"tool_name": "Read", "tool_input": {"file_path": str(self.tree.path("Grammar", "server.py"))}}), set())

    def test_a_shell_command_marks_every_member_app_it_names(self):
        command = f"cd {self.family.apps_dir}/Style && sed -i s/a/b/ app/x.js; cat System/Apps/Logic/server.py; ls System/Apps/Home"
        self.assertEqual(hook.apps_touched(self.family, {"tool_name": "Bash", "tool_input": {"command": command}}), {"Style", "Logic"})

    def test_mark_accumulates_apps_in_the_dirty_note(self):
        hook.mark(self.family, self.edit_event("Grammar", "app/render.js"))
        hook.mark(self.family, self.edit_event("Logic", "server.py"))
        self.assertEqual(json.loads((self.family.state_dir / "dirty.json").read_text()), ["Grammar", "Logic"])

    def test_a_turn_with_no_marked_app_ends_without_a_look(self):
        self.tree.write("Grammar", "app/render.js", "changed\n")  # changed, but nothing marked it
        self.assertIsNone(hook.stop(self.family, {}))

    def test_a_marked_app_with_a_real_change_holds_the_turn_once_naming_the_skill(self):
        self.tree.write("Grammar", "app/render.js", "changed\n")
        hook.mark(self.family, self.edit_event("Grammar", "app/render.js"))
        verdict = hook.stop(self.family, {})
        self.assertEqual(verdict["decision"], "block")
        self.assertIn("!AppPropagate", verdict["reason"])
        self.assertIn("Grammar", verdict["reason"])
        hook.mark(self.family, self.edit_event("Grammar", "app/render.js"))
        self.assertIsNone(hook.stop(self.family, {}))  # already announced
        self.assertEqual(len(changes.open_records(self.family)), 1)

    def test_a_marked_app_whose_edit_changed_nothing_ends_quietly(self):
        hook.mark(self.family, self.edit_event("Grammar", "app/render.js"))
        self.assertIsNone(hook.stop(self.family, {}))
        self.assertFalse((self.family.state_dir / "dirty.json").exists())

    def test_the_hold_never_repeats_inside_its_own_continuation(self):
        self.tree.write("Grammar", "app/render.js", "changed\n")
        hook.mark(self.family, self.edit_event("Grammar", "app/render.js"))
        self.assertIsNone(hook.stop(self.family, {"stop_hook_active": True}))


if __name__ == "__main__":
    unittest.main()

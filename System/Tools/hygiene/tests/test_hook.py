"""The hygiene hooks: what gets noted, when a turn is held, and what stays quiet."""
import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import hook  # noqa: E402

CATALOG = 'skills:\n  - name: "!Known"\n    path: "System/Skillbank/GeneralPurposeSkills/!Known/SKILL.md"\n'


class HygieneTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        for folder in ("System/Plans/New", "System/Plans/Completed", "Memory/Long-Term/Bible", "Outbox"):
            (self.root / folder).mkdir(parents=True)
        self.write("System/Skillbank/_index.yaml", CATALOG)
        self.write("System/Skillbank/GeneralPurposeSkills/!Known/SKILL.md", "x\n")
        self.synced = []
        self._real_sync = hook.sync_indexes
        hook.sync_indexes = lambda root: self.synced.append(root) or ["+ Bible/new.md"]

    def tearDown(self):
        hook.sync_indexes = self._real_sync
        self.tmp.cleanup()

    def write(self, rel, text="x\n"):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
        return path

    def edit(self, rel, session="s1"):
        hook.mark(self.root, {"session_id": session, "tool_name": "Write", "tool_input": {"file_path": str(self.root / rel)}})

    def bash(self, command, session="s1"):
        hook.mark(self.root, {"session_id": session, "tool_name": "Bash", "tool_input": {"command": command}})

    def stop(self, session="s1", **extra):
        return hook.stop(self.root, {"session_id": session, **extra})

    def test_paths_outside_the_watched_areas_note_nothing_and_the_turn_ends_quietly(self):
        self.edit("System/Apps/Home/x.py")
        hook.mark(self.root, {"session_id": "s1", "tool_name": "Read", "tool_input": {"file_path": str(self.root / "Outbox/a.md")}})
        self.edit("/tmp/elsewhere.md")
        self.assertIsNone(self.stop())

    def test_a_long_term_edit_syncs_the_indexes_and_reports_it(self):
        self.edit("Memory/Long-Term/Bible/new.md")
        self.write("System/Plans/New/p.md")
        verdict = self.stop()
        self.assertEqual(self.synced, [self.root])
        self.assertIn("Bible/new.md", verdict["systemMessage"])
        self.assertNotIn("decision", verdict)

    def test_a_shell_command_naming_long_term_syncs_but_never_asks_the_plan_question(self):
        self.bash("mv Memory/Long-Term/Bible/a.md Memory/Long-Term/Bible/b.md")
        verdict = self.stop()
        self.assertEqual(len(self.synced), 1)
        self.assertNotIn("decision", verdict)

    def test_major_looking_edits_with_no_plan_hold_the_turn_once_per_session(self):
        self.edit(".claude/CLAUDE.md")
        first = self.stop()
        self.assertEqual(first["decision"], "block")
        self.assertIn("!CreatePlan", first["reason"])
        self.edit("Outbox/draft.md")
        self.assertIsNone(self.stop())

    def test_a_plan_written_this_session_by_edit_or_on_disk_settles_the_question(self):
        self.edit("System/Plans/New/p.md")
        self.edit("Outbox/draft.md")
        self.assertIsNone(self.stop())
        self.edit("Outbox/draft.md", session="s2")
        self.write("System/Plans/Completed/q.md")
        self.assertIsNone(self.stop(session="s2"))

    def test_an_old_plan_does_not_count(self):
        old = self.write("System/Plans/New/old.md")
        os.utime(old, (time.time() - 86400, time.time() - 86400))
        self.edit("Outbox/draft.md")
        self.assertEqual(self.stop()["decision"], "block")

    def test_single_write_skills_and_logs_are_exempt_from_the_plan_question(self):
        self.edit("Memory/Long-Term/BalaclavaPC/Pastoral_Notes.table.md")
        self.edit("Memory/Long-Term/People/someone.md")
        self.edit("Memory/Long-Term/Logs/history.log")
        self.assertNotIn("decision", self.stop())
        self.edit("Memory/Long-Term/LukeatronWiki/Nodes/x.md", session="s2")
        self.edit("Memory/Long-Term/Bible/verbatim.md", session="s2")
        self.assertNotIn("decision", self.stop(session="s2"))

    def test_an_uncatalogued_skillbank_skill_holds_the_turn_once(self):
        self.write("System/Skillbank/Church/!New/SKILL.md")
        self.edit("System/Skillbank/Church/!New/SKILL.md")
        verdict = self.stop()
        self.assertEqual(verdict["decision"], "block")
        self.assertIn("!New/SKILL.md", verdict["reason"])
        self.edit("System/Skillbank/Church/!New/SKILL.md")
        self.assertIsNone(self.stop())

    def test_a_catalog_entry_with_no_skill_on_disk_is_named(self):
        self.write("System/Skillbank/_index.yaml", CATALOG + '  - name: "!Gone"\n    path: "System/Skillbank/Church/!Gone/SKILL.md"\n')
        self.edit("System/Skillbank/_index.yaml")
        self.assertIn("!Gone/SKILL.md", self.stop()["reason"])

    def test_a_turn_already_held_by_a_stop_hook_is_never_held_again(self):
        self.edit(".claude/skills/!Tone/SKILL.md")
        self.assertIsNone(self.stop(stop_hook_active=True))

    def test_each_turn_looks_only_at_its_own_new_paths(self):
        self.edit("Memory/Long-Term/Bible/new.md")
        self.write("System/Plans/New/p.md")
        self.stop()
        self.assertIsNone(self.stop())
        self.assertEqual(len(self.synced), 1)

    def test_main_fails_open_on_a_bad_event(self):
        logged = []
        real_log, real_stdin = hook._log, sys.stdin
        hook._log = lambda root, text: logged.append(text)
        try:
            sys.stdin = type("S", (), {"read": lambda self, *a: "not json"})()
            self.assertEqual(hook.main(["stop"]), 0)
        finally:
            hook._log, sys.stdin = real_log, real_stdin
        self.assertEqual(len(logged), 1)


if __name__ == "__main__":
    unittest.main()

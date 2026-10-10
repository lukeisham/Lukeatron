"""Tests for schedule.py. Nothing here reads or writes a real crontab."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import schedule as sched  # noqa: E402

SCHEDULE = {
    "macs": ["Mac mini", "Laptop"],
    "jobs": [
        {"script": "a.sh", "cron": "0 8 * * *", "runs_on": ["Mac mini"]},
        {"script": "b.sh", "cron": "10 21 * * 0", "runs_on": ["Mac mini", "Laptop"]},
    ],
}
OLD = '0 9 1 * *  /bin/zsh "$HOME/Library/CloudStorage/Dropbox/_Lukeatron/System/Tools/cron/improve.sh"'


class ScheduleTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dir = Path(self.tmp.name) / "_Lukeatron/System/Tools/cron"
        self.dir.mkdir(parents=True)
        for name in ("a.sh", "b.sh"):
            (self.dir / name).write_text("#!/bin/zsh\n")

    def test_each_mac_gets_only_its_jobs(self):
        self.assertEqual(len(sched.lines_for(SCHEDULE, "Mac mini", self.dir)), 2)
        self.assertEqual(len(sched.lines_for(SCHEDULE, "Laptop", self.dir)), 1)

    def test_install_keeps_other_lines_and_replaces_old_lukeatron_lines(self):
        current = f"MAILTO=\"\"\n5 * * * * /usr/bin/true\n{OLD}\n"
        merged = sched.merge(current, sched.lines_for(SCHEDULE, "Laptop", self.dir))
        self.assertIn("/usr/bin/true", merged)
        self.assertNotIn("improve.sh", merged)
        self.assertEqual(len(sched.installed(merged)), 1)

    def test_install_twice_gives_the_same_crontab(self):
        lines = sched.lines_for(SCHEDULE, "Mac mini", self.dir)
        once = sched.merge("5 * * * * /usr/bin/true\n", lines)
        self.assertEqual(sched.merge(once, lines), once)

    def test_no_jobs_removes_the_block(self):
        once = sched.merge("", sched.lines_for(SCHEDULE, "Mac mini", self.dir))
        self.assertEqual(sched.installed(sched.merge(once, [])), [])

    def test_problems_finds_missing_script_unknown_mac_and_orphan(self):
        bad = {"macs": ["Mac mini"], "jobs": [
            {"script": "a.sh", "cron": "0 8 * * *", "runs_on": ["Desk"]},
            {"script": "gone.sh", "cron": "0 8 * *", "runs_on": ["Mac mini"]},
        ]}
        text = " ".join(sched.problems(bad, self.dir))
        for expected in ("Desk", "gone.sh: no such script", "five fields", "b.sh: has no job"):
            self.assertIn(expected, text)

    def test_real_schedule_is_valid(self):
        self.assertEqual(sched.problems(sched.load()), [])


if __name__ == "__main__":
    unittest.main()

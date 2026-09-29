"""Starting apps: single-flight starts, the wait window, the path guard and the remote seam.

Mirrors: core/launcher.py
"""

import dataclasses
import unittest
from pathlib import Path

from helpers import SETTINGS, FakePorts, make_tree, temp_root
from core import launcher


class Clock:
    def __init__(self):
        self.t = 100.0

    def __call__(self):
        return self.t


class TestLauncher(unittest.TestCase):
    def setUp(self):
        self._tmp = temp_root()
        self.root = Path(self._tmp.name)
        self.apps = make_tree(self.root)
        self.ports = FakePorts()
        self.clock = Clock()
        self.spawned = []
        self.starter = launcher.Starter(
            self.apps, self.root / "logs", probe_fn=self.ports,
            spawn=lambda argv, cwd, log: self.spawned.append((argv, cwd)), clock=self.clock,
        )
        self.server = launcher.parse_launch({"kind": "server", "entry": "server.py", "port": 18789})

    def tearDown(self):
        self._tmp.cleanup()

    def test_a_running_app_is_ready_without_starting_anything(self):
        self.ports.up.add(18789)
        self.assertEqual(self.starter.open("Board", self.server), "ready")
        self.assertEqual(self.spawned, [])

    def test_two_quick_opens_start_one_process(self):
        self.assertEqual(self.starter.open("Board", self.server), "starting")
        self.assertEqual(self.starter.open("Board", self.server), "starting")
        self.assertEqual(len(self.spawned), 1)
        argv, cwd = self.spawned[0]
        self.assertEqual((Path(argv[1]).name, cwd), ("server.py", self.apps / "Board"))

    def test_status_goes_starting_then_live_or_failed(self):
        self.starter.open("Board", self.server)
        self.assertEqual(self.starter.status("Board", self.server), "starting")
        self.ports.up.add(18789)
        self.assertEqual(self.starter.status("Board", self.server), "live")
        self.ports.up.clear()
        self.starter.open("Board", self.server)
        self.clock.t += launcher.START_TIMEOUT_S
        self.assertEqual(self.starter.status("Board", self.server), "failed")

    def test_ensure_runs_the_apps_own_script(self):
        ensure = launcher.parse_launch({"kind": "ensure", "script": "ensure.sh", "port": 18787})
        self.starter.open("Wiki", ensure)
        self.assertEqual(self.spawned[0][0], ["/bin/bash", str(self.apps / "Wiki" / "ensure.sh")])

    def test_self_opening_runs_in_its_cwd(self):
        units = launcher.parse_launch({"kind": "self-opening", "entry": "serve.py", "cwd": "_template"})
        self.assertEqual(self.starter.open("Units", units), "opened")
        self.assertEqual(self.spawned[0][1], self.apps / "Units" / "_template")

    def test_file_apps_never_spawn(self):
        riddle = launcher.parse_launch({"kind": "file", "path": "Riddle.html"})
        self.assertEqual(self.starter.open("Riddle", riddle), "ready")
        self.assertEqual(launcher.target_url(SETTINGS, "Riddle", riddle), "/apps/Riddle/Riddle.html")

    def test_path_guard(self):
        base = self.apps / "Riddle"
        self.assertEqual(launcher.safe_child(base, "Riddle.html"), (base / "Riddle.html").resolve())
        for escape in ("../Board/README.md", "/etc/passwd", "", "."):
            with self.subTest(escape=escape):
                self.assertIsNone(launcher.safe_child(base, escape))
        (base / "link.html").symlink_to(self.apps / "Board" / "README.md")
        self.assertIsNone(launcher.safe_child(base, "link.html"))

    def test_remote_seam_refuses_until_built(self):
        remote = dataclasses.replace(SETTINGS, remote=True)
        with self.assertRaises(launcher.LaunchError):
            launcher.target_url(remote, "Board", self.server)

    def test_bad_catalog_entries_are_refused(self):
        for raw in ({"kind": "rocket"}, {"kind": "server", "port": 1}, {"kind": "file"}):
            with self.subTest(raw=raw), self.assertRaises(launcher.LaunchError):
                launcher.parse_launch(raw)


if __name__ == "__main__":
    unittest.main()

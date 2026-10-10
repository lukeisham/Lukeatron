"""Tests for gitsync. Each test builds a throwaway GitHub, Mac mini and laptop; nothing touches the real repository."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "gitsync.py"


def git(cwd, *args):
    return subprocess.run(["git", "-C", str(cwd), *args], capture_output=True, text=True, check=True).stdout


class GitsyncTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        base = Path(self.tmp.name)
        self.hub, self.mini, self.laptop, self.logs = base / "hub.git", base / "mini", base / "laptop", base / "logs"
        self.logs.mkdir()
        subprocess.run(["git", "init", "-q", "--bare", "-b", "main", str(self.hub)], check=True)
        subprocess.run(["git", "clone", "-q", str(self.hub), str(self.mini)], check=True, capture_output=True)
        for repo in (self.mini,):
            git(repo, "config", "user.email", "t@t"), git(repo, "config", "user.name", "t")
        self.write(self.mini, "a.txt", "one\n")
        self.commit(self.mini, "first")
        subprocess.run(["git", "clone", "-q", str(self.hub), str(self.laptop)], check=True, capture_output=True)
        git(self.laptop, "config", "user.email", "t@t"), git(self.laptop, "config", "user.name", "t")

    def write(self, repo, name, text):
        (repo / name).write_text(text)

    def commit(self, repo, message):
        git(repo, "add", "-A"), git(repo, "commit", "-q", "-m", message), git(repo, "push", "-q", "origin", "main")

    def dropbox(self):
        """Copy the Mac mini's working tree onto the laptop, as Dropbox does; git directories are not copied."""
        for path in self.mini.iterdir():
            if path.name != ".git":
                shutil.copy2(path, self.laptop / path.name)

    def run_sync(self, *args):
        env = {**os.environ, "GITSYNC_ROOT": str(self.laptop), "LUKEATRON_LOG_DIR": str(self.logs)}
        out = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True, env=env, check=True).stdout
        return json.loads(out) if out.strip() else None

    def test_up_to_date_says_nothing(self):
        self.assertIsNone(self.run_sync())

    def test_catches_up_once_dropbox_has_copied(self):
        self.write(self.mini, "a.txt", "two\n")
        self.commit(self.mini, "second")
        self.dropbox()
        self.assertIn("a.txt", git(self.laptop, "status", "--porcelain"))
        result = self.run_sync()
        self.assertIn("caught up 1 commit", result["systemMessage"])
        self.assertEqual(git(self.laptop, "status", "--porcelain"), "")
        self.assertEqual((self.laptop / "a.txt").read_text(), "two\n")

    def test_keeps_uncommitted_work(self):
        self.write(self.mini, "a.txt", "two\n")
        self.commit(self.mini, "second")
        self.dropbox()
        self.write(self.laptop, "b.txt", "work in progress\n")
        result = self.run_sync()
        self.assertIn("1 file(s) still uncommitted", result["systemMessage"])
        self.assertEqual((self.laptop / "b.txt").read_text(), "work in progress\n")

    def test_holds_while_dropbox_is_still_copying(self):
        self.write(self.mini, "a.txt", "two\n")
        self.commit(self.mini, "second")
        head = git(self.laptop, "rev-parse", "HEAD")
        result = self.run_sync()
        self.assertIn("Dropbox has not finished", result["systemMessage"])
        self.assertEqual(git(self.laptop, "rev-parse", "HEAD"), head)

    def test_untracked_and_ignored_file_does_not_hold(self):
        self.write(self.mini, "keep.txt", "local only\n")
        self.commit(self.mini, "second")
        self.dropbox()
        self.run_sync()
        git(self.mini, "rm", "-q", "--cached", "keep.txt")
        self.write(self.mini, ".gitignore", "keep.txt\n")
        self.commit(self.mini, "stop tracking keep.txt")
        self.dropbox()
        result = self.run_sync()
        self.assertIn("caught up 1 commit", result["systemMessage"])
        self.assertEqual((self.laptop / "keep.txt").read_text(), "local only\n")

    def test_holds_when_this_mac_has_unpushed_commits(self):
        self.write(self.mini, "a.txt", "two\n")
        self.commit(self.mini, "second")
        self.dropbox()
        self.write(self.laptop, "c.txt", "local\n")
        git(self.laptop, "add", "-A"), git(self.laptop, "commit", "-q", "-m", "local")
        head = git(self.laptop, "rev-parse", "HEAD")
        result = self.run_sync()
        self.assertIn("unpushed", result["systemMessage"])
        self.assertEqual(git(self.laptop, "rev-parse", "HEAD"), head)

    def test_dry_run_changes_nothing(self):
        self.write(self.mini, "a.txt", "two\n")
        self.commit(self.mini, "second")
        self.dropbox()
        head = git(self.laptop, "rev-parse", "HEAD")
        self.assertIn("would catch up", self.run_sync("--dry-run")["systemMessage"])
        self.assertEqual(git(self.laptop, "rev-parse", "HEAD"), head)

    def test_leaves_other_branches_alone(self):
        git(self.laptop, "checkout", "-q", "-b", "side")
        self.assertIn("not main", self.run_sync()["systemMessage"])


if __name__ == "__main__":
    unittest.main()

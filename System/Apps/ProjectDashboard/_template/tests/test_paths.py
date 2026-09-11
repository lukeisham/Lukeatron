"""Root discovery, and the guard that stops a TEST copy reading the real store.

Mirrors: paths.py
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import paths  # noqa: E402


class TestFindRoot(unittest.TestCase):
    @unittest.skipIf(
        (Path(paths.__file__).resolve().parent / paths.TEST_COPY_MARKER).exists(),
        "this copy is marked TEST, and the guard deliberately refuses any root "
        "outside it — including a temporary one. Covered in _template/.",
    )
    def test_finds_a_root_by_its_markers_not_by_counting_levels(self) -> None:
        """Regression: this used to be parents[3], which broke the moment the
        app moved one level deeper into _template/."""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "_Lukeatron"
            (root / ".Claude").mkdir(parents=True)
            (root / ".Claude" / "CLAUDE.md").write_text("x")
            (root / "Memory" / "Medium-Term").mkdir(parents=True)
            deep = root / "System" / "Apps" / "Thing" / "_template" / "a" / "b"
            deep.mkdir(parents=True)
            self.assertEqual(paths.find_lukeatron_root(deep), root.resolve())

    def test_raises_naming_what_it_tried_rather_than_guessing(self) -> None:
        """A wrong root reads an empty store and renders an empty board, which
        looks like 'no projects' rather than like a failure."""
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(RuntimeError) as cm:
                paths.find_lukeatron_root(Path(tmp))
            self.assertIn("could not find the Lukeatron root", str(cm.exception))


class TestTestCopyGuard(unittest.TestCase):
    """A TEST copy sits INSIDE the real tree, so walking up finds the real root
    and would serve real projects under a banner saying they are fabricated."""

    def _app(self, tmp: str, *, marker: bool) -> Path:
        app = Path(tmp) / "_test"
        app.mkdir(parents=True)
        if marker:
            (app / paths.TEST_COPY_MARKER).write_text("")
        return app

    def test_marked_copy_refuses_a_root_outside_itself(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            app = self._app(tmp, marker=True)
            with self.assertRaises(RuntimeError) as cm:
                paths._assert_not_the_real_store(Path(tmp), app_dir=app)
            self.assertIn("TEST copy", str(cm.exception))

    def test_marked_copy_accepts_its_own_fixture(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            app = self._app(tmp, marker=True)
            paths._assert_not_the_real_store(app / "fixtures" / "lukeatron_root", app_dir=app)

    def test_unmarked_copy_is_unaffected(self) -> None:
        """The template itself must still reach the real store."""
        with tempfile.TemporaryDirectory() as tmp:
            app = self._app(tmp, marker=False)
            paths._assert_not_the_real_store(Path(tmp), app_dir=app)


if __name__ == "__main__":
    unittest.main()

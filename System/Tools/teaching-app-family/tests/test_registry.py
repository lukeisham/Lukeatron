"""What counts as function, data, app-only, and which member a path belongs to."""
import unittest
from pathlib import Path

from helpers import FamilyTree, registry


class RegistryTest(unittest.TestCase):
    def setUp(self):
        self.tree = FamilyTree()
        self.family = self.tree.family

    def tearDown(self):
        self.tree.close()

    def test_code_is_function_and_content_is_data(self):
        for rel in ("server.py", "schema.sql", "app/state.js", "app/list.css", "app/index.html", "seed/db.py", "tests/test_items.py", "tests/fixture.mjs", "README.md", "Start Logic.command"):
            self.assertTrue(registry.is_function_file(self.family, rel), rel)
        for rel in ("grammar.db", "images/1-a.png", "app-decisions.md", "wishlist.md", "app/about.html", "app/favicon.svg", "__pycache__/x.pyc", "tests/__pycache__/x.pyc", "server.log", ".DS_Store"):
            self.assertFalse(registry.is_function_file(self.family, rel), rel)

    def test_only_style_files_are_app_only_and_only_for_style(self):
        self.assertTrue(registry.is_only_in(self.family, "Style", "app/grid.css"))
        self.assertFalse(registry.is_only_in(self.family, "Style", "app/render.js"))
        self.assertFalse(registry.is_only_in(self.family, "Grammar", "app/grid.css"))

    def test_function_files_lists_an_apps_code_and_not_its_data(self):
        self.assertEqual(registry.function_files(self.family, "Grammar"), ["app/render.js", "server.py"])
        self.assertEqual(registry.function_files(self.family, "Nowhere"), [])

    def test_a_path_is_traced_to_its_member_or_to_nothing(self):
        inside = self.family.apps_dir / "Logic" / "app" / "render.js"
        self.assertEqual(registry.locate(self.family, inside), ("Logic", "app/render.js"))
        self.assertIsNone(registry.locate(self.family, self.family.apps_dir / "Home" / "server.py"))
        self.assertIsNone(registry.locate(self.family, Path("/elsewhere/Logic/app/render.js")))
        self.assertIsNone(registry.locate(self.family, self.family.apps_dir / "Logic"))


if __name__ == "__main__":
    unittest.main()

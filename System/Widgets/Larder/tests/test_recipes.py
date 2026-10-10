"""Parsing, listing and reading recipes.
Mirrors: larder/recipes.py — always on a temp copy of tests/fixtures, never the real Recipes/ (TEST-4).
"""

import re
import shutil
import tempfile
import unittest
from pathlib import Path

import helpers  # noqa: F401
from larder import list_recipes, read_recipe
from larder.recipes import parse_recipe

FIXTURES = Path(__file__).resolve().parent / "fixtures"
LARDER_DIR = Path(__file__).resolve().parents[1] / "larder"
ONE_LINE = "**Ingredients:** a; b; c\n"
BULLETS = "**Ingredients:**\n- a\n* b\n1. c\n"
WRITE_CALLS = re.compile(
    r"""open\([^)]*["'](?=[rbt]*[wax+])[rbtwax+]+["']|\.(write_text|write_bytes|unlink|mkdir|rename|rmdir)\(""")


class TestRecipes(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self._tmp.name) / "Recipes"
        shutil.copytree(FIXTURES, self.dir)

    def tearDown(self):
        self._tmp.cleanup()

    def test_ac1_list_has_three_recipes_newest_first(self):
        records = list_recipes(self.dir)
        self.assertEqual([r["slug"] for r in records], ["carrot-soup", "curry", "bare-toast"])
        self.assertEqual(records[0]["based_on"], "curry")
        self.assertTrue(records[1]["has_svg"])
        self.assertFalse(records[0]["has_svg"])

    def test_ac2_one_line_and_bullets_give_same_ingredients(self):
        self.assertEqual(parse_recipe(ONE_LINE)["ingredients"], ["a", "b", "c"])
        self.assertEqual(parse_recipe(BULLETS)["ingredients"], ["a", "b", "c"])

    def test_ac3_bad_slugs_return_none(self):
        (self.dir.parent / "secret.md").write_text("# Secret\n", encoding="utf-8")
        for slug in ("../secret", "Curry", "", "no-such-recipe", "recipes"):
            self.assertIsNone(read_recipe(self.dir, slug), slug)

    def test_ac4_missing_fields_are_blank(self):
        record = read_recipe(self.dir, "bare-toast")
        self.assertEqual(record["title"], "Bare toast")
        self.assertEqual(record["saved"], "2026-09-01")
        self.assertEqual((record["ingredients"], record["equipment"], record["method"], record["notes"]),
                         ([], [], "", ""))
        self.assertEqual(parse_recipe("")["title"], "")

    def test_ac5_mode_follows_equipment(self):
        self.assertEqual(parse_recipe("---\nequipment: [Thermomix]\n---\n")["mode"], "thermomix")
        self.assertEqual(parse_recipe("---\nequipment: [oven]\n---\n")["mode"], "conventional")

    def test_ac6_broken_file_is_skipped(self):
        with self.assertLogs("larder", level="WARNING") as logged:
            slugs = [r["slug"] for r in list_recipes(self.dir)]
        self.assertNotIn("broken", slugs)
        self.assertEqual(len(slugs), 3)
        self.assertIn("broken.md", logged.output[0])
        self.assertIsNone(read_recipe(self.dir, "broken"))

    def test_read_recipe_returns_real_saved_recipe_with_svg(self):
        record = read_recipe(self.dir, "curry")
        self.assertEqual(record["title"], "Curry")
        self.assertEqual(record["mode"], "thermomix")
        self.assertEqual(len(record["ingredients"]), 7)
        self.assertEqual(record["ingredients"][0], "1 onion")
        self.assertTrue(record["method"].startswith("Roughly chop"))
        self.assertTrue(record["svg"].startswith("<svg"))
        self.assertTrue(record["has_svg"])

    def test_package_contains_no_write_call(self):
        sources = sorted(LARDER_DIR.glob("*.py"))
        self.assertTrue(sources)
        for source in sources:
            self.assertIsNone(WRITE_CALLS.search(source.read_text(encoding="utf-8")), source.name)


if __name__ == "__main__":
    unittest.main()

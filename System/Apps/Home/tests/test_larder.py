"""Larder's hooks in Home: the two read routes and their gate (TEST-7), the widget files and the
start-up check. Always the fake recipes make_home copies into a temp folder, never the real store
(TEST-4).

Mirrors: routes/larder.py, routes/page.py widget_file, core/selfcheck.py, server.py dispatch
"""

import json
import unittest

from test_server import GateTest, req
import server
from core import selfcheck

LIST = "/api/larder/recipes"
ONE = "/api/larder/recipe/"


class TestLarder(GateTest):
    def test_signed_in_lists_the_recipes_newest_first(self):
        response = self.get(LIST, cookie=self.cookie)
        self.assertEqual(response.status, 200)
        slugs = [item["slug"] for item in json.loads(response.body)["recipes"]]
        self.assertEqual(sorted(slugs), ["bare-toast", "carrot-soup", "curry"])
        self.assertNotIn("broken", slugs)

    def test_signed_in_reads_one_recipe_with_its_picture(self):
        response = self.get(ONE + "curry", cookie=self.cookie)
        self.assertEqual(response.status, 200)
        record = json.loads(response.body)
        self.assertEqual(record["title"], "Curry")
        self.assertTrue(record["svg"])

    def test_gate_blocks_signed_out_and_the_agent_key(self):
        for path in (LIST, ONE + "curry"):
            for label, kw in (("no session", {}), ("agent key only", {"key": self.home.agent_key})):
                with self.subTest(path=path, caller=label):
                    response = self.get(path, **kw)
                    self.assertEqual(response.status, 401)
                    self.assertNotIn(b"Curry", response.body)

    def test_unknown_or_unsafe_slugs_are_not_found(self):
        for slug in ("..%2Fsecret", "NOPE", ""):
            with self.subTest(slug=slug):
                self.assertEqual(self.get(ONE + slug, cookie=self.cookie).status, 404)

    def test_post_is_not_found_and_leaks_nothing(self):
        response = server.dispatch(self.home, req(LIST, "POST", body={}, cookie=self.cookie))
        self.assertEqual(response.status, 404)
        self.assertNotIn(b"curry", response.body)

    def test_widget_files_signed_in_only_and_confined(self):
        self.assertEqual(self.get("/widgets/Larder/search.js", cookie=self.cookie).status, 200)
        self.assertEqual(self.get("/widgets/Larder/search.js").status, 401)
        self.assertEqual(self.get("/widgets/Larder/../larder/recipes.py", cookie=self.cookie).status, 404)

    def test_unreadable_recipes_folder_is_a_clean_server_error(self):
        self.home.recipes_dir = self.home.recipes_dir / "gone"
        with self.assertLogs("home", "ERROR"):
            response = self.get(LIST, cookie=self.cookie)
        self.assertEqual(response.status, 500)

    def test_selfcheck_names_an_unreadable_recipes_folder(self):
        args = (self.home.apps_dir, self.home.bsb_file, self.home.creds.directory, self.home.inbox_dir)
        self.assertEqual(selfcheck.problems(*args, self.home.recipes_dir), [])
        missing = selfcheck.problems(*args, self.home.recipes_dir / "gone")
        self.assertTrue(any("gone" in problem and "Full Disk Access" in problem for problem in missing))

    def test_home_page_carries_the_larder_row(self):
        self.assertIn(b'data-panel="Larder"', self.get("/", cookie=self.cookie).body)


if __name__ == "__main__":
    unittest.main()

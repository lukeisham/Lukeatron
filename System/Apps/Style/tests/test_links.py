"""Link labels: a leaf in Labels whose name links to its own new section of the About page (labeltree.create_link,
aboutpage.py). Every test works on a throwaway database and a throwaway copy of app/about.html, never the real page."""
import json
import re
import shutil
import sqlite3
import sys
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tests"))
import aboutpage  # noqa: E402
import labels  # noqa: E402
import items  # noqa: E402
import server  # noqa: E402
from test_items import build_db  # noqa: E402

REAL_ABOUT = ROOT / "app" / "about.html"


def nodes(tree: list[dict]) -> list[dict]:
    return [n for n in tree if n["kind"] == "node"]


class LinkLabelTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "style.db"
        build_db(self.db_path)
        self.about = Path(self.tmp.name) / "about.html"
        shutil.copy(REAL_ABOUT, self.about)

    def tearDown(self):
        self.tmp.cleanup()

    def load(self):
        return items.load_labels(self.db_path)

    def test_a_link_is_a_leaf_node_carrying_its_section_id_and_ordinary_labels_carry_none(self):
        labels.create_label(self.db_path, "Clause", "d")
        labels.create_link(self.db_path, "On clauses", None, about_path=self.about)
        plain, link = nodes(self.load())
        self.assertIsNone(plain["about"])
        self.assertEqual((link["name"], link["about"], link["definition"], link["children"], link["tables"]),
                         ("On clauses", "link-on-clauses", "", [], []))

    def test_each_link_appends_its_own_section_and_a_contents_line(self):
        labels.create_link(self.db_path, "On clauses", about_path=self.about)
        page = self.about.read_text()
        self.assertEqual(page.count('<section id="link-on-clauses">'), 1)
        self.assertIn("<h2>On clauses</h2>", page)
        self.assertIn(aboutpage.PLACEHOLDER, page)
        contents = re.findall(r'<nav class="contents".*?</nav>', page, re.S)[0]
        self.assertEqual(re.findall(r'href="#([^"]+)"', contents)[-1], "link-on-clauses")
        self.assertLess(page.index('<section id="examples">'), page.index('<section id="link-on-clauses">'))
        self.assertLess(page.index('<section id="link-on-clauses">'), page.index("</main>"))

    def test_the_heading_is_escaped_and_loses_its_markup_marks(self):
        labels.create_link(self.db_path, "*Chiasmus* & <b>", about_path=self.about)
        page = self.about.read_text()
        self.assertIn("<h2>Chiasmus &amp; &lt;b&gt;</h2>", page)
        self.assertNotIn("<b>", page.split('id="link-chiasmus-b"')[1])

    def test_a_repeated_name_gets_a_numbered_section(self):
        for _ in range(3):
            labels.create_link(self.db_path, "Notes", about_path=self.about)
        self.assertEqual([n["about"] for n in nodes(self.load())], ["link-notes", "link-notes-2", "link-notes-3"])
        self.assertEqual(len(re.findall(r'<section id="link-notes', self.about.read_text())), 3)

    def test_a_link_cannot_hold_anything_and_a_label_cannot_be_put_under_it(self):
        labels.create_link(self.db_path, "A link", about_path=self.about)
        link_id = nodes(self.load())[0]["id"]
        labels.create_label(self.db_path, "Ordinary", "d")
        ordinary_id = nodes(self.load())[-1]["id"]
        for refused in (
            lambda: labels.create_label(self.db_path, "Child", "d", link_id),
            lambda: labels.create_link(self.db_path, "Child link", link_id, about_path=self.about),
            lambda: labels.add_placement(self.db_path, link_id, 1),
            lambda: labels.set_tables(self.db_path, link_id, []),
            lambda: labels.move_label(self.db_path, ordinary_id, 0, link_id),
        ):
            with self.assertRaises(labels.LabelError) as caught:
                refused()
            self.assertEqual(caught.exception.code, "bad_request")

    def test_a_link_can_be_moved_renamed_and_deleted_and_its_section_stays(self):
        labels.create_label(self.db_path, "Clause", "d")
        labels.create_link(self.db_path, "On clauses", about_path=self.about)
        clause, link = (n["id"] for n in nodes(self.load()))
        labels.move_label(self.db_path, link, 0)
        self.assertEqual([n["id"] for n in nodes(self.load())], [link, clause])
        labels.move_label(self.db_path, link, 0, clause)  # a link may sit under an ordinary label
        labels.edit_label(self.db_path, link, "Renamed", "an explanation that a link ignores")
        moved = nodes(nodes(self.load())[0]["children"])[0]
        self.assertEqual((moved["name"], moved["definition"], moved["about"]), ("Renamed", "", "link-on-clauses"))
        labels.delete_label(self.db_path, link)
        self.assertEqual(nodes(nodes(self.load())[0]["children"]), [])
        self.assertIn('<section id="link-on-clauses">', self.about.read_text())

    def test_a_link_past_the_depth_limit_is_refused_and_leaves_the_page_alone(self):
        parent = None
        for level in range(labels.MAX_DEPTH):
            labels.create_label(self.db_path, f"Level {level}", "d", parent)
            parent = max(n["id"] for n in self._flat(self.load()))
        before = self.about.read_text()
        with self.assertRaises(labels.LabelError) as caught:
            labels.create_link(self.db_path, "Too deep", parent, about_path=self.about)
        self.assertEqual(caught.exception.code, "bad_request")
        self.assertEqual(self.about.read_text(), before)

    def _flat(self, tree):
        for node in nodes(tree):
            yield node
            yield from self._flat(node["children"])

    def test_when_the_page_cannot_take_a_section_no_link_is_made(self):
        self.about.write_text("<html><body>no contents list, no main</body></html>")
        with self.assertRaises(ValueError):
            labels.create_link(self.db_path, "Orphan", about_path=self.about)
        self.assertEqual(nodes(self.load()), [])
        self.about.unlink()
        with self.assertRaises(OSError):
            labels.create_link(self.db_path, "Orphan", about_path=self.about)
        self.assertEqual(nodes(self.load()), [])

    def test_the_server_routes_make_links_return_the_tree_and_refuse_a_foreign_origin(self):
        httpd = server.create_httpd(port=0, db_path=self.db_path, about_path=self.about)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        try:
            base = f"http://127.0.0.1:{httpd.server_address[1]}"

            def post(path, body, headers=None):
                request = urllib.request.Request(base + path, json.dumps(body).encode(), {"Content-Type": "application/json", **(headers or {})}, method="POST")
                try:
                    with urllib.request.urlopen(request) as response:
                        return response.status, json.loads(response.read())
                except urllib.error.HTTPError as error:
                    with error:
                        return error.code, json.loads(error.read())

            status, body = post("/api/labels/links", {"name": "On clauses"})
            self.assertEqual((status, body["labels"][0]["about"]), (200, "link-on-clauses"))
            self.assertEqual(post("/api/labels/links", {"name": ""})[0], 400)
            self.assertEqual(post("/api/labels/links", {"name": "x", "parent_id": 1})[0], 400)  # under the link
            self.assertEqual(post("/api/labels/links", {"name": "x", "parent_id": 99})[0], 404)
            self.assertEqual(post("/api/labels/links", {"name": "x"}, {"Origin": "http://evil.example"})[0], 403)
            self.assertEqual(self.about.read_text().count('id="link-on-clauses"'), 1)
            self.assertEqual(REAL_ABOUT.read_text().count('id="link-'), 0)  # the real page is untouched
        finally:
            httpd.shutdown()
            httpd.server_close()


class AboutPageSlugTest(unittest.TestCase):
    def test_slugs_are_lowercase_hyphenated_ascii_and_never_empty(self):
        self.assertEqual(aboutpage.free_slug("Épée & *Sword*", set()), "link-epee-sword")
        self.assertEqual(aboutpage.free_slug("???", set()), "link")
        self.assertEqual(aboutpage.free_slug("???", {"link"}), "link-2")


if __name__ == "__main__":
    unittest.main()

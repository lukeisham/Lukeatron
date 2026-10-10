"""Smoke tests for app/about.html: it is served, it links the page that links it, its contents list reaches every section, and the structure aboutpage.py appends link-label sections to is in place."""
import re
import sys
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tests"))
import server  # noqa: E402
from test_items import build_db  # noqa: E402

ABOUT = (ROOT / "app" / "about.html").read_text()
INDEX = (ROOT / "app" / "index.html").read_text()


class AboutPageTest(unittest.TestCase):
    def test_external_links_open_in_a_new_tab(self):
        for link in re.findall(r'<a href="https://[^>]*>', ABOUT):
            self.assertIn('target="_blank"', link)
            self.assertIn("noopener", link)

    def test_one_h1_and_index_links_to_about(self):
        self.assertEqual(ABOUT.count("<h1 "), 1)
        self.assertIn('href="about.html"', INDEX)

    def test_contents_list_reaches_every_section_exactly_once(self):
        nav = re.findall(r'<nav class="contents".*?</nav>', ABOUT, re.S)[0]
        anchors = re.findall(r'href="#([^"]+)"', nav)
        self.assertEqual(anchors, ["groups", "types", "labels", "scores", "examples"])
        for anchor in anchors:
            self.assertEqual(ABOUT.count(f'<section id="{anchor}">'), 1)
        self.assertEqual(len(re.findall(r"<section id=", ABOUT)), len(anchors))

    def test_page_ends_with_main_after_the_last_section_so_a_link_section_can_be_appended(self):
        self.assertEqual(ABOUT.count("</main>"), 1)
        self.assertLess(ABOUT.rindex("</section>"), ABOUT.index("</main>"))
        self.assertIn("<ol>", re.findall(r'<nav class="contents".*?</nav>', ABOUT, re.S)[0])

    def test_server_serves_about_page(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "research.db"
            build_db(db_path)
            httpd = server.create_httpd(port=0, db_path=db_path)
            threading.Thread(target=httpd.serve_forever, daemon=True).start()
            try:
                url = f"http://127.0.0.1:{httpd.server_address[1]}/about.html"
                with urllib.request.urlopen(url) as response:
                    self.assertEqual(response.status, 200)
                    self.assertIn("text/html", response.headers["Content-Type"])
                    self.assertIn(b"Examples and real quotes", response.read())
            finally:
                httpd.shutdown()
                httpd.server_close()


if __name__ == "__main__":
    unittest.main()

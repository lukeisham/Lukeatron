"""Smoke tests for app/about.html: it is served, it links the page that links it, explains how descriptions, AI examples and real quotes are made and checked, and it cites the popularity source (Google Books Ngram) and every reference source used for AI confidence."""
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
from seed.popularity_pass import SOURCES  # noqa: E402
from test_items import build_db  # noqa: E402

ABOUT = (ROOT / "app" / "about.html").read_text()
INDEX = (ROOT / "app" / "index.html").read_text()
POPULARITY_SITES = {"https://books.google.com/ngrams"}


class AboutPageTest(unittest.TestCase):
    def test_every_popularity_source_url_is_linked(self):
        linked = set(re.findall(r'href="(https://[^"]+)"', ABOUT))
        wanted = {url for key, _, urls, _ in SOURCES if key != "wikipedia" for url in urls} | POPULARITY_SITES
        self.assertEqual(wanted - linked, set())

    def test_external_links_open_in_a_new_tab(self):
        links = re.findall(r'<a href="https://[^>]*>', ABOUT)
        self.assertTrue(links)
        for link in links:
            self.assertIn('target="_blank"', link)
            self.assertIn("noopener", link)

    def test_one_h1_and_index_links_to_about(self):
        self.assertEqual(ABOUT.count("<h1 "), 1)
        self.assertIn('href="about.html"', INDEX)

    def test_intro_links_reach_the_six_sections(self):
        targets = re.findall(r'<nav class="contents".*?</nav>', ABOUT, re.S)[0]
        anchors = re.findall(r'href="#([^"]+)"', targets)
        self.assertEqual(anchors, ["popularity", "confidence", "descriptions", "examples", "quotes", "methodology"])
        for anchor in anchors:
            self.assertEqual(ABOUT.count(f'<section id="{anchor}">'), 1)

    def test_descriptions_section_names_the_four_results_and_the_source_rules(self):
        section = ABOUT.split('<section id="descriptions">')[1].split("</section>")[0]
        for result in ("Agrees", "Narrower", "Broader", "Different sense"):
            self.assertIn(f'<th scope="row">{result}</th>', section)
        for phrase in ("written by the AI", "Wikipedia is used only to find", "Flipside", "never cites a source that was not read"):
            self.assertIn(phrase, section)

    def test_examples_and_quotes_sections_say_how_the_two_differ(self):
        examples = ABOUT.split('<section id="examples">')[1].split("</section>")[0]
        quotes = ABOUT.split('<section id="quotes">')[1].split("</section>")[0]
        for phrase in ("exactly one example that the AI wrote itself", "never credited to anyone", "set in italics"):
            self.assertIn(phrase, examples)
        for phrase in ("No quote is ever invented", "checked against the work itself", "How a quote is credited"):
            self.assertIn(phrase, quotes)

    def test_methodology_cites_both_articles(self):
        section = ABOUT.split('<section id="methodology">')[1]
        for url in ("https://compositionforum.com/issue/32/from-logic.php", "https://journals.sagepub.com/doi/10.3233/AAC-180037"):
            self.assertIn(f'href="{url}"', section)

    def test_server_serves_about_page(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "rhetoric.db"
            build_db(db_path)
            httpd = server.create_httpd(port=0, db_path=db_path)
            threading.Thread(target=httpd.serve_forever, daemon=True).start()
            try:
                url = f"http://127.0.0.1:{httpd.server_address[1]}/about.html"
                with urllib.request.urlopen(url) as response:
                    self.assertEqual(response.status, 200)
                    self.assertIn("text/html", response.headers["Content-Type"])
                    self.assertIn(b"Methodology", response.read())
            finally:
                httpd.shutdown()
                httpd.server_close()


if __name__ == "__main__":
    unittest.main()

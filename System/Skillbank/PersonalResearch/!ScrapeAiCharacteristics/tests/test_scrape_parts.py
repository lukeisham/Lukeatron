"""Fetching the article and the Simple English check. Mirrors: aichar_scrape/article.py, readability.py."""

import unittest

import helpers
from fakes import Scripted, unreachable
from aichar_scrape import readability
from aichar_scrape.article import ArticleError, fetch_article

wiki_reply = helpers.wiki_reply

EASY = "Some writers use big words. They pick the same few words again and again. Look for that."
HARD = ("Notwithstanding considerable methodological heterogeneity, contemporary investigations demonstrate "
        "that instantiations of stylistically marked vocabulary systematically proliferate throughout "
        "computationally generated documents, whereas comparable human compositions exhibit substantially "
        "greater lexical variability across comparable genres.")


class TestArticle(unittest.TestCase):
    def test_fetch_returns_title_revision_and_text_and_identifies_itself(self):
        send = Scripted(wiki_reply())
        article = fetch_article(send)
        self.assertEqual((article.title, article.revision), ("Wikipedia:Signs of AI writing", "1234567"))
        self.assertIn("delve", article.text)
        self.assertEqual(send.hosts, ["en.wikipedia.org"])
        self.assertIn("Lukeatron", send.requests[0].get_header("User-agent"))

    def test_missing_page_wrong_shape_empty_text_and_network_failure_are_refused(self):
        bad_replies = [b'{"query": {"pages": [{"title": "X", "missing": true}]}}', b"not json", b"{}",
                       b'{"query": {"pages": [{"title": "X", "extract": "", "revisions": [{"revid": 1}]}]}}',
                       unreachable()]
        for reply in bad_replies:
            with self.subTest(reply=reply), self.assertRaises(ArticleError):
                fetch_article(Scripted(reply))


class TestReadability(unittest.TestCase):
    def test_easy_text_passes(self):
        self.assertTrue(readability.is_simple(EASY))

    def test_hard_text_fails_with_reasons_a_rewrite_can_use(self):
        reasons = readability.problems(HARD)
        self.assertEqual(len(reasons), 3)
        self.assertTrue(any("under 15" in r for r in reasons))

    def test_empty_text_fails(self):
        self.assertEqual(readability.problems("  "), ["the text is empty"])


if __name__ == "__main__":
    unittest.main()

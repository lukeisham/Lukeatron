"""Fetching, calling Haiku, and the Simple English check. Mirrors: criteria/article.py, haiku.py, readability.py."""

import unittest

import helpers  # noqa: F401
from fakes import KEY, Scripted, haiku_reply, unreachable, wiki_reply
from criteria import readability
from criteria.article import ArticleError, fetch_article
from criteria.haiku import MODEL, HaikuError, ask, parse_json_reply

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


class TestHaiku(unittest.TestCase):
    def test_ask_sends_the_key_in_the_header_only_and_returns_the_text(self):
        send = Scripted(haiku_reply("hello"))
        self.assertEqual(ask("be brief", "hi", KEY, send=send), "hello")
        request = send.requests[0]
        self.assertEqual(request.get_header("X-api-key"), KEY)
        self.assertNotIn(KEY.encode(), request.data)
        body = send.body(0)
        self.assertEqual((body["model"], body["system"], body["messages"][0]["content"]), (MODEL, "be brief", "hi"))

    def test_cut_short_empty_non_json_and_failed_calls_are_refused(self):
        cut = b'{"stop_reason": "max_tokens", "content": [{"type": "text", "text": "{"}]}'
        empty = b'{"stop_reason": "end_turn", "content": []}'
        for reply in (cut, empty, b"not json", b'{"nothing": 1}', unreachable()):
            with self.subTest(reply=reply), self.assertRaises(HaikuError):
                ask("s", "u", KEY, send=Scripted(reply))

    def test_json_reply_may_be_fenced_but_must_be_valid(self):
        self.assertEqual(parse_json_reply('```json\n{"a": 1}\n```'), {"a": 1})
        self.assertEqual(parse_json_reply('[1, 2]'), [1, 2])
        with self.assertRaises(HaikuError):
            parse_json_reply("Sure! Here you go: {")


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

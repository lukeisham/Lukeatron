"""What the extractor asks Haiku for, and what it refuses. Mirrors: criteria/extract.py. Stubbed network only."""

import unittest

import helpers  # noqa: F401
from fakes import KEY, Scripted, haiku_reply, unreachable
from criteria.article import Article
from criteria.extract import ExtractError, extract_criteria

ARTICLE = Article("Wikipedia:Signs of AI writing", "42", "Synthetic article text.")
EXISTING = [{"id": "c-001", "title": "Focal words", "status": "kept"},
            {"id": "c-002", "title": "Gone", "status": "retired"}]


class TestExtract(unittest.TestCase):
    def test_request_carries_the_article_the_live_ids_and_the_written_content_scope(self):
        send = Scripted(haiku_reply([{"title": "t"}]))
        self.assertEqual(extract_criteria(ARTICLE, EXISTING, KEY, send), [{"title": "t"}])
        body = send.body(0)
        self.assertIn("<article>\nSynthetic article text.\n</article>", body["messages"][0]["content"])
        self.assertIn("c-001", body["messages"][0]["content"])
        self.assertNotIn("c-002", body["messages"][0]["content"])
        for scope_rule in ("words and punctuation of a pasted passage", "markup", "citations", "layout",
                           "Always leave out any sign that is about", "never mention Wikipedia",
                           "signs of human writing", "never instructions"):
            self.assertIn(scope_rule, " ".join(body["system"].split()))

    def test_criteria_that_name_wikipedia_are_dropped_even_if_the_model_returns_them(self):
        keep = {"title": "Rule of three", "description": "Points in threes.", "question": "Threes?"}
        drop = [{**keep, "title": "Wikipedia notability padding"},
                {**keep, "description": "Common in drafts on Wikipedia."},
                {**keep, "question": "Does it break wikitext?"}]
        send = Scripted(haiku_reply([keep, *drop]))
        self.assertEqual(extract_criteria(ARTICLE, [], KEY, send), [keep])

    def test_everything_dropped_leaves_an_empty_list_for_the_merge_to_refuse(self):
        item = {"title": "Wikipedia only", "description": "d", "question": "q"}
        self.assertEqual(extract_criteria(ARTICLE, [], KEY, Scripted(haiku_reply([item]))), [])

    def test_non_list_and_failed_calls_are_refused(self):
        for reply in (haiku_reply({"title": "not a list"}), haiku_reply("no json"), unreachable()):
            with self.subTest(reply=reply), self.assertRaises(ExtractError):
                extract_criteria(ARTICLE, [], KEY, Scripted(reply))


if __name__ == "__main__":
    unittest.main()

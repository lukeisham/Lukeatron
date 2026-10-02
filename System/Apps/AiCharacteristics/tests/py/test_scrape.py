"""The whole Scrape on a temp data folder, with a scripted network. Mirrors: criteria/scrape.py.
Fixture data only; a failed run must leave every saved file byte-for-byte as it was.
"""

import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

import helpers  # noqa: F401
from fakes import KEY, Scripted, haiku_reply, unreachable, wiki_reply
from criteria import ScrapeFailed, run_scrape

EASY = "Some writers use big words. They pick the same few words again and again."
HARD = ("Notwithstanding considerable methodological heterogeneity, contemporary investigations demonstrate "
        "that instantiations of stylistically marked vocabulary systematically proliferate throughout "
        "computationally generated documents, whereas comparable human compositions exhibit substantially "
        "greater lexical variability across comparable genres.")
PROPOSED = [
    {"id": None, "title": "Focal words", "description": "Overuse of words like delve.",
     "question": "Does the text overuse words like delve or tapestry?", "source": "Vocabulary"},
    {"id": None, "title": "Rule of three", "description": "Points grouped in threes.",
     "question": "Does the text group its points in threes?", "source": "Structure"},
    {"id": None, "title": "Constant hedging", "description": "Every claim is hedged.",
     "question": "Does the text hedge almost every claim?", "source": "Tone"},
]
PLAIN = {"c-001": EASY, "c-002": EASY, "c-003": EASY}
FIXED_CLOCK = lambda: datetime(2026, 10, 2, 9, 0, tzinfo=timezone.utc)  # noqa: E731


def first_run_replies():
    return [wiki_reply(), haiku_reply(PROPOSED), haiku_reply(PLAIN)]


class TestScrape(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.data = Path(self._tmp.name) / "data"

    def tearDown(self):
        self._tmp.cleanup()

    def scrape(self, *replies):
        send = Scripted(*replies)
        return run_scrape(self.data, KEY, send, FIXED_CLOCK), send

    def saved(self) -> dict:
        return json.loads((self.data / "criteria.json").read_text())

    def snapshot_files(self) -> dict[str, bytes]:
        return {str(p.relative_to(self.data)): p.read_bytes() for p in sorted(self.data.rglob("*")) if p.is_file()}

    def test_first_scrape_writes_criteria_snapshot_and_summary(self):
        summary, send = self.scrape(*first_run_replies())
        document = self.saved()
        self.assertEqual((document["article_revision"], document["scraped_at"]), ("1234567", "2026-10-02T09:00:00+00:00"))
        self.assertEqual(document["article_title"], "Wikipedia:Signs of AI writing")
        self.assertEqual([c["id"] for c in document["criteria"]], ["c-001", "c-002", "c-003"])
        self.assertEqual({c["plain"] for c in document["criteria"]}, {EASY})
        self.assertEqual(summary.new, ["c-001", "c-002", "c-003"])
        self.assertEqual((summary.total, summary.explainer_flags), (3, []))
        self.assertIn("delve", (self.data / "source" / "article.txt").read_text())
        self.assertFalse((self.data / "criteria.previous.json").exists())
        self.assertEqual(send.hosts, ["en.wikipedia.org", "api.anthropic.com", "api.anthropic.com"])

    def test_key_is_never_written_to_any_saved_file(self):
        self.scrape(*first_run_replies())
        self.assertFalse(any(KEY.encode() in body for body in self.snapshot_files().values()))

    def test_second_scrape_of_an_unchanged_article_changes_nothing_and_skips_the_explainer(self):
        self.scrape(*first_run_replies())
        first = self.saved()
        resend = [{**p, "id": f"c-{i:03d}"} for i, p in enumerate(PROPOSED, start=1)]
        summary, send = self.scrape(wiki_reply(), haiku_reply(resend))
        second = self.saved()
        self.assertEqual((summary.new, summary.changed, summary.retired), ([], [], []))
        self.assertEqual([{k: v for k, v in c.items() if k != "status"} for c in second["criteria"]],
                         [{k: v for k, v in c.items() if k != "status"} for c in first["criteria"]])
        self.assertEqual({c["status"] for c in second["criteria"]}, {"kept"})
        self.assertEqual(len(send.requests), 2)
        self.assertTrue((self.data / "criteria.previous.json").exists())

    def test_changed_criterion_alone_goes_back_to_the_explainer_and_keeps_its_id(self):
        self.scrape(*first_run_replies())
        reworded = [{**p, "id": f"c-{i:03d}"} for i, p in enumerate(PROPOSED, start=1)]
        reworded[1]["description"] = "Points are grouped in sets of three."
        summary, send = self.scrape(wiki_reply(), haiku_reply(reworded), haiku_reply({"c-002": "Look for lists of three."}))
        self.assertEqual(summary.changed, ["c-002"])
        self.assertEqual(json.loads(send.requests[2].data)["messages"][0]["content"].count('"id"'), 1)
        self.assertEqual(self.saved()["criteria"][1]["plain"], "Look for lists of three.")

    def test_over_hard_explainer_is_retried_once_with_reasons_then_accepted(self):
        _, send = self.scrape(wiki_reply(), haiku_reply(PROPOSED), haiku_reply({**PLAIN, "c-002": HARD}),
                              haiku_reply({"c-002": EASY}))
        retry = json.loads(json.loads(send.requests[3].data)["messages"][0]["content"])
        self.assertEqual([item["id"] for item in retry], ["c-002"])
        self.assertTrue(retry[0]["too_hard"]["problems"])
        self.assertEqual(self.saved()["criteria"][1]["plain"], EASY)

    def test_explainer_that_stays_too_hard_is_kept_but_flagged(self):
        summary, _ = self.scrape(wiki_reply(), haiku_reply(PROPOSED), haiku_reply({**PLAIN, "c-002": HARD}),
                                 haiku_reply({"c-002": HARD}))
        self.assertEqual(summary.explainer_flags, ["c-002"])
        self.assertEqual(self.saved()["criteria"][1]["plain"], HARD)

    def test_every_failure_leaves_saved_files_untouched(self):
        self.scrape(*first_run_replies())
        before = self.snapshot_files()
        failing_runs = {
            "network down": [unreachable()],
            "extract not json": [wiki_reply(), haiku_reply("Sure, here are the criteria:")],
            "extract empty": [wiki_reply(), haiku_reply([])],
            "extract malformed item": [wiki_reply(), haiku_reply([{"title": "No question"}])],
            "explainer wrong shape": [wiki_reply(), haiku_reply(PROPOSED + [{**PROPOSED[0], "title": "Extra sign"}]),
                                      haiku_reply(["not", "an", "object"])],
            "haiku unreachable": [wiki_reply(), unreachable()],
        }
        for name, replies in failing_runs.items():
            with self.subTest(name), self.assertRaises(ScrapeFailed):
                self.scrape(*replies)
            self.assertEqual(self.snapshot_files(), before, name)

    def test_unreadable_saved_file_stops_before_any_network_call(self):
        self.data.mkdir(parents=True)
        (self.data / "criteria.json").write_text("{ broken")
        send = Scripted()
        with self.assertRaises(ScrapeFailed):
            run_scrape(self.data, KEY, send, FIXED_CLOCK)
        self.assertEqual(send.requests, [])
        self.assertEqual((self.data / "criteria.json").read_text(), "{ broken")

    def test_missing_key_stops_before_any_network_call(self):
        send = Scripted()
        with self.assertRaises(ScrapeFailed):
            run_scrape(self.data, "  ", send, FIXED_CLOCK)
        self.assertEqual(send.requests, [])
        self.assertFalse(self.data.exists())


if __name__ == "__main__":
    unittest.main()

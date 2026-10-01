"""AiCharacteristics' routes in Home: the gate (TEST-7), the Scrape and Check replies, and what they write.
Always a temp apps tree from make_home and a scripted network — never the real data, key or internet (TEST-4).

Mirrors: routes/aichar.py, server.py dispatch
"""

import json
import unittest
from unittest import mock

from test_server import GateTest, req
import server
from core import selfcheck
from routes import aichar

SCRAPE, CHECK, CRITERIA = "/api/aichar/scrape", "/api/aichar/check", "/api/aichar/criteria"
KEY = "test-key-not-real"
PASTED = "PASTED-TEXT-MARKER the quick brown fox"
EASY = "Some writers use big words. They pick the same few words again and again."
WIKI = json.dumps({"query": {"pages": [{"title": "Wikipedia:Signs of AI writing", "extract": "Synthetic article text.",
                                         "revisions": [{"revid": 42}]}]}}).encode()
PROPOSED = [{"id": None, "title": "Focal words", "description": "Overuse of words like delve.",
             "question": "Does the text overuse words like delve?", "source": "Vocabulary"}]


def haiku(payload) -> bytes:
    text = payload if isinstance(payload, str) else json.dumps(payload)
    return json.dumps({"stop_reason": "end_turn", "content": [{"type": "text", "text": text}]}).encode()


class Network:
    def __init__(self, *replies):
        self.replies, self.requests = list(replies), []

    def __call__(self, request):
        self.requests.append(request)
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


class AicharTest(GateTest):
    def setUp(self):
        super().setUp()
        self.data = self.home.apps_dir / "AiCharacteristics" / "data"

    def use(self, *replies, key=KEY):
        self.network = Network(*replies)
        self.home.send = self.network
        if key:
            (self.home.creds.directory / "anthropic-key").write_text(key + "\n")

    def post(self, path, body=None, **kw):
        return server.dispatch(self.home, req(path, "POST", body={} if body is None else body, **kw))

    def scrape_once(self):
        self.use(WIKI, haiku(PROPOSED), haiku({"c-001": EASY}))
        self.assertEqual(self.post(SCRAPE, cookie=self.cookie).status, 200)


class TestGate(AicharTest):
    def test_gate_blocks_every_other_caller_on_both_post_routes(self):
        self.use(WIKI)
        cases = {
            "no session": ({}, 401),
            "agent key only": ({"key": self.home.agent_key}, 401),
            "foreign origin": ({"cookie": self.cookie, "origin": "http://evil.example"}, 403),
            "no origin": ({"cookie": self.cookie, "origin": None}, 403),
        }
        for path in (SCRAPE, CHECK):
            for label, (kw, status) in cases.items():
                with self.subTest(path=path, case=label):
                    self.assertEqual(self.post(path, {"text": "hello"}, **kw).status, status)
        self.assertEqual(self.network.requests, [])
        self.assertFalse(self.data.exists())

    def test_criteria_route_needs_a_session_or_the_agent_key(self):
        self.assertEqual(self.get(CRITERIA).status, 401)
        self.assertEqual(self.get(CRITERIA, cookie=self.cookie).status, 200)
        self.assertEqual(self.get(CRITERIA, key=self.home.agent_key).status, 200)

    def test_get_is_not_allowed_on_the_post_routes_and_post_not_on_criteria(self):
        self.assertEqual(self.get(SCRAPE, cookie=self.cookie).status, 404)
        self.assertEqual(self.post(CRITERIA, cookie=self.cookie).status, 404)


class TestScrape(AicharTest):
    def test_scrape_writes_the_data_folder_and_replies_with_a_summary(self):
        self.use(WIKI, haiku(PROPOSED), haiku({"c-001": EASY}))
        response = self.post(SCRAPE, cookie=self.cookie)
        self.assertEqual(response.status, 200)
        summary = json.loads(response.body)["summary"]
        self.assertEqual((summary["new"], summary["total"], summary["article_revision"]), (["c-001"], 1, "42"))
        self.assertEqual(sorted(p.name for p in self.data.iterdir()), ["criteria.json", "source"])
        served = json.loads(self.get(CRITERIA, cookie=self.cookie).body)
        self.assertEqual(served["criteria"][0]["plain"], EASY)

    def test_no_key_is_refused_before_any_network_call(self):
        self.use(WIKI, key=None)
        response = self.post(SCRAPE, cookie=self.cookie)
        self.assertEqual(response.status, 503)
        self.assertEqual((self.network.requests, self.data.exists()), ([], False))

    def test_failed_scrape_is_a_502_with_a_clean_message_and_writes_nothing(self):
        from criteria.transport import TransportError
        self.use(TransportError("could not reach en.wikipedia.org"))
        response = self.post(SCRAPE, cookie=self.cookie)
        self.assertEqual(response.status, 502)
        self.assertIn("could not fetch the article", json.loads(response.body)["message"])
        self.assertNotIn(KEY.encode(), response.body)
        self.assertFalse(self.data.exists())

    def test_second_scrape_while_one_runs_is_a_409(self):
        self.use(WIKI)
        self.assertTrue(aichar._scrape_running.acquire(blocking=False))
        try:
            self.assertEqual(self.post(SCRAPE, cookie=self.cookie).status, 409)
        finally:
            aichar._scrape_running.release()
        self.assertEqual(self.network.requests, [])

    def test_the_lock_is_released_after_a_failure(self):
        from criteria.transport import TransportError
        self.use(TransportError("down"), WIKI, haiku(PROPOSED), haiku({"c-001": EASY}))
        self.assertEqual(self.post(SCRAPE, cookie=self.cookie).status, 502)
        self.assertEqual(self.post(SCRAPE, cookie=self.cookie).status, 200)

    def test_criteria_route_before_any_scrape_is_empty_not_an_error(self):
        body = json.loads(self.get(CRITERIA, cookie=self.cookie).body)
        self.assertEqual((body["criteria"], body["scraped_at"]), ([], None))


class TestCheck(AicharTest):
    def test_check_returns_a_verdict_per_live_criterion_and_writes_nothing(self):
        self.scrape_once()
        before = sorted(str(p) for p in self.data.rglob("*"))
        self.use(haiku([{"id": "c-001", "answer": "yes", "confidence": 0.8}]))
        response = self.post(CHECK, {"text": PASTED}, cookie=self.cookie)
        self.assertEqual(response.status, 200)
        self.assertEqual(json.loads(response.body)["verdicts"], [{"id": "c-001", "answer": "yes", "confidence": 0.8}])
        self.assertEqual(sorted(str(p) for p in self.data.rglob("*")), before)

    def test_bad_text_is_refused_before_any_network_call(self):
        self.scrape_once()
        self.use(haiku([]))
        cases = {"not a string": (5, 400), "empty": ("   ", 400), "too long": ("word " * 701, 413)}
        for label, (text, status) in cases.items():
            with self.subTest(label):
                self.assertEqual(self.post(CHECK, {"text": text}, cookie=self.cookie).status, status)
        self.assertEqual(self.post(CHECK, [1, 2], cookie=self.cookie).status, 400)
        self.assertEqual(self.network.requests, [])

    def test_check_before_any_scrape_says_to_scrape_first(self):
        self.use(haiku([]))
        response = self.post(CHECK, {"text": PASTED}, cookie=self.cookie)
        self.assertEqual(response.status, 503)
        self.assertIn("Scrape", json.loads(response.body)["message"])
        self.assertEqual(self.network.requests, [])

    def test_no_key_is_a_503(self):
        self.scrape_once()
        (self.home.creds.directory / "anthropic-key").unlink()
        self.assertEqual(self.post(CHECK, {"text": PASTED}, cookie=self.cookie).status, 503)

    def test_unusable_judge_replies_are_a_502_and_the_pasted_text_is_never_logged(self):
        self.scrape_once()
        self.use(haiku("yes to everything"), haiku("still not json"))
        with self.assertLogs("home", level="WARNING") as logged:
            response = self.post(CHECK, {"text": PASTED}, cookie=self.cookie)
        self.assertEqual(response.status, 502)
        self.assertNotIn("PASTED-TEXT-MARKER", "\n".join(logged.output))
        self.assertNotIn(KEY, "\n".join(logged.output))
        self.assertNotIn(KEY.encode(), response.body)


class TestSelfcheck(AicharTest):
    def test_the_package_loads_and_a_missing_one_is_reported(self):
        args = (self.home.apps_dir, self.home.bsb_file, self.home.creds.directory, self.home.inbox_dir, self.home.recipes_dir)
        self.assertEqual(selfcheck.problems(*args), [])
        with mock.patch.object(aichar, "package_loads", return_value=False):
            self.assertTrue(any("AiCharacteristics is missing" in p for p in selfcheck.problems(*args)))

if __name__ == "__main__":
    unittest.main()

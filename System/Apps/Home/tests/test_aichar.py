"""AiCharacteristics' routes in Home: the gate (TEST-7), what each button asks the skills to do, and what comes
back. Always a temp apps tree from make_home and a fake `Home.claude` — never a real Claude run, the real data or
the internet (TEST-4).

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
PASTED = "PASTED-TEXT-MARKER the quick brown fox"
SAVED = {"scraped_at": "2026-10-02T10:00:00", "article_title": "T", "article_revision": "1", "criteria": [
    {"id": "c-001", "title": "Focal words", "description": "d", "question": "Overuse of delve?", "source": "s",
     "plain": "p", "status": "kept", "locked": False},
    {"id": "c-002", "title": "Old", "description": "d", "question": "Old sign?", "source": "s",
     "plain": "p", "status": "retired", "locked": False}]}
SUMMARY = {"total": 1, "new": ["c-001"], "changed": [], "retired": [], "flagged": [], "unchanged": False,
           "revision": "42", "report": "Built 1 criterion."}
VERDICTS = [{"id": "c-001", "answer": "yes", "confidence": 0.8}]


class FakeClaude:
    """Stands in for `claude -p`: answers in order, records every call, optionally runs a side effect."""

    def __init__(self, *replies, effect=None):
        self.replies, self.calls, self.effect = list(replies), [], effect

    def __call__(self, prompt, stdin, tools, seconds, turns):
        self.calls.append({"prompt": prompt, "stdin": stdin, "tools": tools, "seconds": seconds})
        if self.effect:
            self.effect()
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply if isinstance(reply, str) else json.dumps(reply)


class AicharTest(GateTest):
    def setUp(self):
        super().setUp()
        self.data = self.home.apps_dir / "AiCharacteristics" / "data"

    def use(self, *replies, **kw):
        self.claude = FakeClaude(*replies, **kw)
        self.home.claude = self.claude

    def save_criteria(self):
        self.data.mkdir(parents=True, exist_ok=True)
        (self.data / "criteria.json").write_text(json.dumps(SAVED))

    def post(self, path, body=None, **kw):
        return server.dispatch(self.home, req(path, "POST", body={} if body is None else body, **kw))


class TestGate(AicharTest):
    def test_gate_blocks_every_other_caller_on_both_post_routes(self):
        self.save_criteria()
        self.use()
        for path in (SCRAPE, CHECK):
            with self.subTest(path):
                self.assertEqual(self.post(path, {"text": PASTED}).status, 401)
                self.assertEqual(self.post(path, {"text": PASTED}, cookie=self.cookie, origin="https://evil.example").status, 403)
        self.assertEqual(self.claude.calls, [])

    def test_criteria_route_needs_a_session_or_the_agent_key(self):
        self.assertEqual(self.get(CRITERIA).status, 401)
        self.assertEqual(self.get(CRITERIA, cookie=self.cookie).status, 200)

    def test_get_is_not_allowed_on_the_post_routes_and_post_not_on_criteria(self):
        for path in (SCRAPE, CHECK):
            self.assertEqual(self.get(path, cookie=self.cookie).status, 404)
        self.assertEqual(self.post(CRITERIA, cookie=self.cookie).status, 404)

    def test_criteria_route_before_any_scrape_is_empty_not_an_error(self):
        body = json.loads(self.get(CRITERIA, cookie=self.cookie).body)
        self.assertEqual((body["criteria"], body["scraped_at"]), ([], None))


class TestScrape(AicharTest):
    def test_scrape_runs_the_skill_with_only_the_data_folder_writable_and_returns_the_summary(self):
        self.use(SUMMARY)
        response = self.post(SCRAPE, cookie=self.cookie)
        self.assertEqual(response.status, 200)
        self.assertEqual(json.loads(response.body)["summary"]["new"], ["c-001"])
        call = self.claude.calls[0]
        self.assertIn("!ScrapeAiCharacteristics/SKILL.md", call["prompt"])
        self.assertEqual(call["stdin"], "")
        self.assertIn(aichar.DATA_RULE, call["tools"])
        self.assertFalse([t for t in call["tools"] if t.startswith(("Edit", "WebFetch")) or t == "Write"])

    def test_a_json_code_fence_around_the_summary_is_tolerated(self):
        self.use("```json\n" + json.dumps(SUMMARY) + "\n```")
        self.assertEqual(self.post(SCRAPE, cookie=self.cookie).status, 200)

    def test_a_skill_error_or_a_failed_run_is_a_502_with_a_clean_message(self):
        for reply, message in (({"error": "Wikipedia has no such page."}, "Wikipedia has no such page."),
                               (aichar.ClaudeFailed("Claude Code is not signed in on this Mac"), "not signed in")):
            self.use(reply)
            with self.subTest(message), self.assertLogs("home", level="WARNING"):
                response = self.post(SCRAPE, cookie=self.cookie)
            self.assertEqual(response.status, 502)
            self.assertIn(message, json.loads(response.body)["message"])

    def test_a_reply_in_the_wrong_shape_is_a_502_not_a_blank_page(self):
        for reply in ("all done!", {"total": "many"}, {"total": 1, "new": "c-001", "changed": [], "retired": [], "flagged": []}):
            self.use(reply)
            with self.subTest(str(reply)[:20]), self.assertLogs("home", level="WARNING"):
                self.assertEqual(self.post(SCRAPE, cookie=self.cookie).status, 502)

    def test_second_scrape_while_one_runs_is_a_409_and_the_lock_is_released_after_a_failure(self):
        inner = {}

        def second():
            inner["status"] = self.post(SCRAPE, cookie=self.cookie).status

        self.use(SUMMARY, effect=second)
        self.assertEqual(self.post(SCRAPE, cookie=self.cookie).status, 200)
        self.assertEqual(inner["status"], 409)
        self.use(aichar.ClaudeFailed("x"))
        with self.assertLogs("home", level="WARNING"):
            self.assertEqual(self.post(SCRAPE, cookie=self.cookie).status, 502)
        self.use(SUMMARY)
        self.assertEqual(self.post(SCRAPE, cookie=self.cookie).status, 200)


class TestCheck(AicharTest):
    def test_check_sends_the_text_on_stdin_only_with_read_as_the_one_tool_and_returns_verdicts(self):
        self.save_criteria()
        self.use(VERDICTS)
        response = self.post(CHECK, {"text": PASTED}, cookie=self.cookie)
        self.assertEqual(response.status, 200)
        self.assertEqual(json.loads(response.body)["verdicts"], VERDICTS)
        call = self.claude.calls[0]
        self.assertEqual((call["stdin"], call["tools"]), (PASTED, ("Read",)))
        self.assertNotIn("PASTED-TEXT-MARKER", call["prompt"])
        self.assertIn("!CheckAiCharacteristics/SKILL.md", call["prompt"])

    def test_check_writes_nothing(self):
        self.save_criteria()
        before = (self.data / "criteria.json").read_text()
        self.use(VERDICTS)
        self.post(CHECK, {"text": PASTED}, cookie=self.cookie)
        self.assertEqual((self.data / "criteria.json").read_text(), before)
        self.assertEqual(sorted(p.name for p in self.data.iterdir()), ["criteria.json"])

    def test_bad_text_is_refused_before_any_run(self):
        self.save_criteria()
        self.use()
        for body, status in (({"text": ""}, 400), ({"text": "   "}, 400), ({"text": "word " * 701}, 413),
                             ({"text": 5}, 400), ({}, 400)):
            with self.subTest(str(body)[:20]):
                self.assertEqual(self.post(CHECK, body, cookie=self.cookie).status, status)
        self.assertEqual(self.claude.calls, [])

    def test_check_before_any_scrape_says_to_scrape_first(self):
        self.use()
        response = self.post(CHECK, {"text": PASTED}, cookie=self.cookie)
        self.assertEqual(response.status, 503)
        self.assertIn("Scrape", json.loads(response.body)["message"])
        self.assertEqual(self.claude.calls, [])

    def test_unusable_replies_are_a_502_and_the_pasted_text_is_never_logged(self):
        self.save_criteria()
        for reply in ("yes to everything", [{"id": "c-001", "answer": "maybe", "confidence": 1}], [],
                      aichar.ClaudeFailed("it took longer than 180 seconds, so it was stopped")):
            self.use(reply)
            with self.subTest(str(reply)[:20]), self.assertLogs("home", level="WARNING") as logged:
                response = self.post(CHECK, {"text": PASTED}, cookie=self.cookie)
            self.assertEqual(response.status, 502)
            self.assertNotIn("PASTED-TEXT-MARKER", "\n".join(logged.output))
            self.assertNotIn(b"PASTED-TEXT-MARKER", response.body)


class TestRunClaude(unittest.TestCase):
    """The real runner, with `subprocess.run` stubbed: how it builds the command and reads the reply."""

    def run_with(self, stdout, **kw):
        done = mock.Mock(stdout=stdout, returncode=0)
        with mock.patch.object(aichar, "_claude_binary", return_value="/bin/claude"), \
                mock.patch.object(aichar.subprocess, "run", return_value=done, **kw) as run:
            return aichar.run_claude("do it", "TEXT", ("Read",), 5, 3), run

    def test_command_and_stdin(self):
        result, run = self.run_with(json.dumps({"is_error": False, "result": "fine"}))
        self.assertEqual(result, "fine")
        command = run.call_args.args[0]
        self.assertEqual(command[:3], ["/bin/claude", "-p", "do it"])
        self.assertIn("dontAsk", command)
        self.assertEqual((run.call_args.kwargs["input"], run.call_args.kwargs["timeout"]), ("TEXT", 5))
        self.assertNotIn("TEXT", command)

    def test_failures_become_clean_messages(self):
        for stdout, text in ((json.dumps({"is_error": True, "result": "Failed to authenticate: OAuth session expired"}), "not signed in"),
                             (json.dumps({"is_error": True, "result": "boom"}), "stopped before"),
                             ("<html>", "cannot read")):
            with self.subTest(text), self.assertRaises(aichar.ClaudeFailed) as caught:
                self.run_with(stdout)
            self.assertIn(text, str(caught.exception))

    def test_timeout_and_missing_binary(self):
        with mock.patch.object(aichar, "_claude_binary", return_value="/bin/claude"), \
                mock.patch.object(aichar.subprocess, "run", side_effect=aichar.subprocess.TimeoutExpired("c", 5)):
            with self.assertRaises(aichar.ClaudeFailed):
                aichar.run_claude("p", "", (), 5, 1)
        with mock.patch.object(aichar, "_claude_binary", return_value=None), self.assertRaises(aichar.ClaudeFailed):
            aichar.run_claude("p", "", (), 5, 1)


class TestPageFiles(AicharTest):
    """A file-launch app whose page sits in a sub-folder is served with its own .html/.css/.js, and only those."""

    def setUp(self):
        super().setUp()
        catalog = json.loads(self.home.catalog_file.read_text())
        catalog["apps"]["Nested"] = {"context": "Teaching", "blurb": "A page in a sub-folder",
                                     "launch": {"kind": "file", "path": "web/index.html"}}
        self.home.catalog_file.write_text(json.dumps(catalog))
        app = self.home.apps_dir / "Nested"
        (app / "web" / "sub").mkdir(parents=True)
        (app / "README.md").write_text("# readme\n")
        for name, text in {"web/index.html": "<!doctype html>", "web/page.css": "body{}", "web/main.js": "export {}",
                           "web/sub/inner.js": "export {}", "web/notes.txt": "no", "web/data.json": "{}",
                           "secret.js": "no", "secret.css": "no"}.items():
            (app / name).write_text(text)

    def test_files_beside_the_launch_file_are_served_with_the_right_type(self):
        for name, content_type in {"index.html": "text/html", "page.css": "text/css", "main.js": "text/javascript",
                                   "sub/inner.js": "text/javascript"}.items():
            with self.subTest(name):
                response = self.get(f"/apps/Nested/web/{name}", cookie=self.cookie)
                self.assertEqual(response.status, 200)
                self.assertTrue(response.content_type.startswith(content_type))

    def test_everything_else_is_not_found(self):
        for path in ("/apps/Nested/web/notes.txt", "/apps/Nested/web/data.json", "/apps/Nested/web/missing.js",
                     "/apps/Nested/secret.js", "/apps/Nested/secret.css", "/apps/Nested/web/../secret.js",
                     "/apps/Nested/web/%2e%2e/secret.js", "/apps/Nested/web/", "/apps/Nested/README.md"):
            with self.subTest(path):
                self.assertEqual(self.get(path, cookie=self.cookie).status, 404)

    def test_files_need_a_session(self):
        self.assertEqual(self.get("/apps/Nested/web/main.js").status, 401)

    def test_an_app_launched_from_its_own_root_still_serves_only_the_launch_file(self):
        (self.home.apps_dir / "Riddle" / "extra.js").write_text("no")
        (self.home.apps_dir / "Riddle" / "extra.css").write_text("no")
        self.assertEqual(self.get("/apps/Riddle/Riddle.html", cookie=self.cookie).status, 200)
        for name in ("extra.js", "extra.css"):
            self.assertEqual(self.get(f"/apps/Riddle/{name}", cookie=self.cookie).status, 404)


class TestSelfcheck(AicharTest):
    def test_the_package_loads_and_a_missing_one_is_reported(self):
        args = (self.home.apps_dir, self.home.bsb_file, self.home.creds.directory, self.home.inbox_dir, self.home.recipes_dir)
        self.assertEqual(selfcheck.problems(*args), [])
        with mock.patch.object(aichar, "package_loads", return_value=False):
            self.assertTrue(any("AiCharacteristics is missing" in p for p in selfcheck.problems(*args)))

if __name__ == "__main__":
    unittest.main()

"""InboxNote's hooks in Home: the save route's gate (TEST-7), its replies, and the widget files.
Always a temp Inbox/ from make_home, never the real one (TEST-4).

Mirrors: routes/inbox_note.py, routes/page.py widget_file, server.py dispatch
"""

import json
import unittest

from test_server import GateTest, req
import server
from core import selfcheck

SAVE = "/api/inbox-note"


class TestInboxNote(GateTest):
    def post(self, body, **kw):
        return server.dispatch(self.home, req(SAVE, "POST", body=body, **kw))

    def inbox(self):
        return sorted(p.name for p in self.home.inbox_dir.iterdir())

    def test_signed_in_save_writes_one_file(self):
        response = self.post({"text": "Call the printer about **Sunday**"}, cookie=self.cookie)
        self.assertEqual(response.status, 201)
        name = json.loads(response.body)["file"]
        self.assertTrue(name.endswith("-call-the-printer-about-sunday.md"))
        self.assertEqual(self.inbox(), [name])

    def test_gate_blocks_every_other_caller(self):
        cases = {
            "no session": ({}, 401),
            "agent key only": ({"key": self.home.agent_key}, 401),
            "foreign origin": ({"cookie": self.cookie, "origin": "http://evil.example"}, 403),
            "no origin": ({"cookie": self.cookie, "origin": None}, 403),
        }
        for label, (kw, status) in cases.items():
            with self.subTest(label):
                self.assertEqual(self.post({"text": "hello"}, **kw).status, status)
        self.assertEqual(self.inbox(), [])

    def test_bad_notes_are_refused(self):
        self.assertEqual(self.post({"text": 5}, cookie=self.cookie).status, 400)
        self.assertEqual(self.post({"text": "   "}, cookie=self.cookie).status, 400)
        self.assertEqual(self.post({"text": "x" * 2001}, cookie=self.cookie).status, 413)
        self.assertEqual(self.inbox(), [])

    def test_unknown_post_is_not_found_and_static_is_not_postable(self):
        self.assertEqual(server.dispatch(self.home, req("/nope", "POST", body={}, cookie=self.cookie)).status, 404)
        self.assertEqual(server.dispatch(self.home, req("/static/home.js", "POST", body={})).status, 404)

    def test_widget_files_signed_in_only_and_confined(self):
        self.assertEqual(self.get("/widgets/InboxNote/inbox-note.js", cookie=self.cookie).status, 200)
        self.assertEqual(self.get("/widgets/InboxNote/inbox-note.js").status, 401)
        self.assertEqual(self.get("/widgets/InboxNote/../inbox_note/store.py", cookie=self.cookie).status, 404)
        self.assertEqual(self.get("/widgets/NewsFeed/x.js", cookie=self.cookie).status, 404)

    def test_selfcheck_needs_a_writable_inbox_and_leaves_it_empty(self):
        args = (self.home.apps_dir, self.home.bsb_file, self.home.creds.directory)
        recipes = self.home.recipes_dir
        self.assertEqual(selfcheck.problems(*args, self.home.inbox_dir, recipes), [])
        self.assertEqual(self.inbox(), [])
        missing = selfcheck.problems(*args, self.home.inbox_dir / "gone", recipes)
        self.assertTrue(any("Cannot write to" in problem and "gone" in problem for problem in missing))


if __name__ == "__main__":
    unittest.main()

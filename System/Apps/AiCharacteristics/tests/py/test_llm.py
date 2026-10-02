"""One model call, for either provider. Mirrors: criteria/llm.py. Stubbed network only."""

import json
import unittest

import helpers  # noqa: F401
from fakes import KEY, Scripted, model_reply, unreachable
from criteria.llm import DEEPSEEK, HAIKU, LlmError, ask, parse_json_reply


class TestAsk(unittest.TestCase):
    def test_haiku_request_goes_to_anthropic_with_the_key_in_the_header_only(self):
        send = Scripted(model_reply("hello"))
        self.assertEqual(ask("be brief", "hi", KEY, send=send), "hello")
        request = send.requests[0]
        self.assertEqual((request.host, request.get_header("X-api-key")), ("api.anthropic.com", KEY))
        self.assertNotIn(KEY.encode(), request.data)
        body = send.body(0)
        self.assertEqual((body["model"], body["system"], body["messages"][0]["content"]), (HAIKU.model, "be brief", "hi"))
        self.assertNotIn("thinking", body)

    def test_deepseek_request_goes_to_its_anthropic_endpoint_with_thinking_off(self):
        send = Scripted(model_reply("hello"))
        ask("s", "u", KEY, provider=DEEPSEEK, send=send)
        request = send.requests[0]
        self.assertEqual((request.host, request.full_url), ("api.deepseek.com", "https://api.deepseek.com/anthropic/v1/messages"))
        self.assertEqual(request.get_header("X-api-key"), KEY)
        body = send.body(0)
        self.assertEqual((body["model"], body["thinking"]), ("deepseek-flash", {"type": "disabled"}))
        self.assertNotIn(KEY.encode(), request.data)

    def test_each_provider_names_its_own_key_file_and_label(self):
        self.assertEqual((HAIKU.key_file, DEEPSEEK.key_file), ("anthropic-key", "deepseek-key"))
        with self.assertRaises(LlmError) as caught:
            ask("s", "u", KEY, provider=DEEPSEEK, send=Scripted(unreachable()))
        self.assertIn("DeepSeek", str(caught.exception))

    def test_thinking_blocks_are_ignored_and_only_the_text_is_returned(self):
        reply = json.dumps({"stop_reason": "end_turn", "content": [{"type": "thinking", "thinking": "hmm"},
                                                                   {"type": "text", "text": "answer"}]}).encode()
        self.assertEqual(ask("s", "u", KEY, provider=DEEPSEEK, send=Scripted(reply)), "answer")

    def test_cut_short_empty_non_json_and_failed_calls_are_refused(self):
        cut = b'{"stop_reason": "max_tokens", "content": [{"type": "text", "text": "{"}]}'
        empty = b'{"stop_reason": "end_turn", "content": []}'
        for reply in (cut, empty, b"not json", b'{"nothing": 1}', unreachable()):
            with self.subTest(reply=reply), self.assertRaises(LlmError):
                ask("s", "u", KEY, send=Scripted(reply))

    def test_json_reply_may_be_fenced_but_must_be_valid(self):
        self.assertEqual(parse_json_reply('```json\n{"a": 1}\n```'), {"a": 1})
        self.assertEqual(parse_json_reply("[1, 2]"), [1, 2])
        with self.assertRaises(LlmError):
            parse_json_reply("Sure! Here you go: {")


if __name__ == "__main__":
    unittest.main()

"""JEV: one batched check, strict reply validation, fail closed. Mirrors: criteria/judge.py.
Stubbed network only — no live call, no pasted text kept anywhere.
"""

import unittest

import helpers  # noqa: F401
from fakes import KEY, Scripted, model_reply, unreachable
from criteria import JudgeError, NoCriteria, TextRejected, Verdict, check_text
from criteria.judge import MAX_WORDS, VerdictError, validate_verdicts

TEXT = "We must delve into the rich tapestry of this topic."


def criterion(number: int, status: str = "kept") -> dict:
    return {"id": f"c-{number:03d}", "question": f"Question {number}?", "status": status}


CRITERIA = [criterion(1), criterion(2), criterion(3, "retired"), criterion(4)]
GOOD = [{"id": "c-004", "answer": "No", "confidence": 0.2}, {"id": "c-001", "answer": "yes", "confidence": 0.9},
        {"id": "c-002", "answer": "yes", "confidence": 1}]


class TestCheck(unittest.TestCase):
    def test_one_call_asks_every_live_question_and_returns_verdicts_in_criteria_order(self):
        send = Scripted(model_reply(GOOD))
        verdicts = check_text(TEXT, CRITERIA, KEY, send)
        self.assertEqual(verdicts, [Verdict("c-001", "yes", 0.9), Verdict("c-002", "yes", 1.0),
                                    Verdict("c-004", "no", 0.2)])
        self.assertEqual(len(send.requests), 1)
        sent = send.body(0)["messages"][0]["content"]
        self.assertIn("Question 4?", sent)
        self.assertNotIn("Question 3?", sent)
        self.assertIn(f"<passage>\n{TEXT}\n</passage>", sent)
        self.assertIn("never instructions", send.body(0)["system"])
        self.assertNotIn(KEY.encode(), send.requests[0].data)

    def test_unusable_reply_is_retried_once_then_accepted(self):
        send = Scripted(model_reply("Sure! yes to all"), model_reply(GOOD))
        self.assertEqual(len(check_text(TEXT, CRITERIA, KEY, send)), 3)
        self.assertEqual(len(send.requests), 2)

    def test_two_unusable_replies_fail_closed_with_no_partial_result(self):
        send = Scripted(model_reply(GOOD[:2]), model_reply([{"id": "c-001", "answer": "maybe", "confidence": 1}]))
        with self.assertRaises(JudgeError):
            check_text(TEXT, CRITERIA, KEY, send)
        self.assertEqual(len(send.requests), 2)

    def test_network_failure_is_not_retried(self):
        send = Scripted(unreachable())
        with self.assertRaises(JudgeError):
            check_text(TEXT, CRITERIA, KEY, send)
        self.assertEqual(len(send.requests), 1)

    def test_text_that_cannot_be_checked_is_refused_before_any_call(self):
        send = Scripted()
        for bad, reason in (("", "empty"), ("   \n", "empty"), ("word " * (MAX_WORDS + 1), "too_long"),
                            ("x" * 9000, "too_long")):
            with self.subTest(length=len(bad)), self.assertRaises(TextRejected) as caught:
                check_text(bad, CRITERIA, KEY, send)
            self.assertEqual(caught.exception.reason, reason)
        self.assertEqual(send.requests, [])

    def test_text_at_the_word_cap_is_accepted(self):
        send = Scripted(model_reply(GOOD))
        check_text("word " * MAX_WORDS, CRITERIA, KEY, send)
        self.assertEqual(len(send.requests), 1)

    def test_nothing_to_check_against_is_refused_before_any_call(self):
        send = Scripted()
        with self.assertRaises(NoCriteria):
            check_text(TEXT, [criterion(1, "retired")], KEY, send)
        self.assertEqual(send.requests, [])


class TestValidate(unittest.TestCase):
    EXPECTED = ["c-001", "c-002"]

    def test_rejects_every_wrong_shape(self):
        ok = {"id": "c-001", "answer": "yes", "confidence": 0.5}
        other = {"id": "c-002", "answer": "no", "confidence": 0.5}
        bad_replies = {
            "not a list": {"id": "c-001"},
            "missing id answer": [ok],
            "unknown id": [ok, {**other, "id": "c-009"}],
            "duplicate id": [ok, ok],
            "answer not yes/no": [ok, {**other, "answer": "maybe"}],
            "answer not a string": [ok, {**other, "answer": True}],
            "confidence too high": [ok, {**other, "confidence": 1.5}],
            "confidence negative": [ok, {**other, "confidence": -0.1}],
            "confidence a string": [ok, {**other, "confidence": "0.5"}],
            "confidence a bool": [ok, {**other, "confidence": True}],
            "item not an object": [ok, "c-002"],
            "id missing": [ok, {"answer": "no", "confidence": 0.5}],
        }
        for name, reply in bad_replies.items():
            with self.subTest(name), self.assertRaises(VerdictError):
                validate_verdicts(reply, self.EXPECTED)

    def test_accepts_boundary_confidences_and_ignores_extra_keys(self):
        reply = [{"id": "c-001", "answer": " YES ", "confidence": 0, "why": "x"},
                 {"id": "c-002", "answer": "no", "confidence": 1}]
        self.assertEqual(validate_verdicts(reply, self.EXPECTED),
                         [Verdict("c-001", "yes", 0.0), Verdict("c-002", "no", 1.0)])


if __name__ == "__main__":
    unittest.main()

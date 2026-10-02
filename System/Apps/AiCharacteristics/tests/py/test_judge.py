"""The Check's strict reading of the skill's reply, and the text limits. Mirrors: criteria/judge.py.
No model, no network: replies are fixed strings, and no pasted text is kept anywhere.
"""

import json
import unittest

import helpers  # noqa: F401
from criteria import JudgeError, NoCriteria, TextRejected, Verdict, parse_verdicts, require_checkable
from criteria.judge import MAX_WORDS, VerdictError, validate_verdicts


def criterion(number: int, status: str = "kept") -> dict:
    return {"id": f"c-{number:03d}", "question": f"Question {number}?", "status": status}


CRITERIA = [criterion(1), criterion(2), criterion(3, "retired"), criterion(4)]
GOOD = [{"id": "c-004", "answer": "No", "confidence": 0.2}, {"id": "c-001", "answer": "yes", "confidence": 0.9},
        {"id": "c-002", "answer": "yes", "confidence": 1}]


class TestParse(unittest.TestCase):
    def test_good_reply_gives_verdicts_in_criteria_order_skipping_retired(self):
        self.assertEqual(parse_verdicts(json.dumps(GOOD), CRITERIA),
                         [Verdict("c-001", "yes", 0.9), Verdict("c-002", "yes", 1.0), Verdict("c-004", "no", 0.2)])

    def test_a_code_fence_around_the_json_is_tolerated(self):
        self.assertEqual(len(parse_verdicts("```json\n" + json.dumps(GOOD) + "\n```", CRITERIA)), 3)

    def test_anything_that_is_not_the_exact_shape_fails_closed(self):
        bad = ["Sure! yes to all", json.dumps(GOOD[:2]), json.dumps({"error": "failed"}),
               json.dumps([{"id": "c-001", "answer": "maybe", "confidence": 1}]),
               json.dumps(GOOD + [{"id": "c-003", "answer": "yes", "confidence": 1}]), ""]
        for reply in bad:
            with self.subTest(reply=reply[:30]), self.assertRaises(JudgeError):
                parse_verdicts(reply, CRITERIA)

    def test_no_live_criteria_or_the_skills_own_no_criteria_error_says_scrape_first(self):
        with self.assertRaises(NoCriteria):
            parse_verdicts(json.dumps(GOOD), [criterion(1, "retired")])
        with self.assertRaises(NoCriteria):
            parse_verdicts('{"error": "no_criteria"}', CRITERIA)


class TestValidate(unittest.TestCase):
    def test_each_bad_item_is_refused(self):
        ids = ["c-001"]
        for item in ({"id": "c-009", "answer": "yes", "confidence": 1}, {"answer": "yes", "confidence": 1},
                     {"id": "c-001", "answer": "yes", "confidence": 1.5}, {"id": "c-001", "answer": "yes", "confidence": True},
                     {"id": "c-001", "answer": "yes"}, "x"):
            with self.subTest(item=item), self.assertRaises(VerdictError):
                validate_verdicts([item], ids)

    def test_duplicates_and_non_lists_are_refused(self):
        item = {"id": "c-001", "answer": "no", "confidence": 0}
        with self.assertRaises(VerdictError):
            validate_verdicts([item, item], ["c-001"])
        with self.assertRaises(VerdictError):
            validate_verdicts({"id": "c-001"}, ["c-001"])


class TestText(unittest.TestCase):
    def test_text_that_cannot_be_checked_is_refused(self):
        for bad, reason in (("", "empty"), ("   \n", "empty"), ("word " * (MAX_WORDS + 1), "too_long"),
                            ("x" * 9000, "too_long")):
            with self.subTest(length=len(bad)), self.assertRaises(TextRejected) as caught:
                require_checkable(bad)
            self.assertEqual(caught.exception.reason, reason)

    def test_text_at_the_limit_passes(self):
        require_checkable("word " * MAX_WORDS)


if __name__ == "__main__":
    unittest.main()

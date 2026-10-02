"""Merging a Scrape into the saved criteria list. Mirrors: aichar_scrape/merge.py.
Fixture data only — pure functions, no files, no network.
"""

import copy
import unittest

import helpers  # noqa: F401
from aichar_scrape import MergeError
from aichar_scrape.merge import CONTENT_FIELDS, merge_criteria


def proposed(title: str, **overrides: str) -> dict:
    item = {"title": title, "description": f"About {title}.", "question": f"Does the text show {title}?",
            "source": "Section 1"}
    item.update(overrides)
    return item


def saved(number: int, title: str, **overrides) -> dict:
    criterion = {"id": f"c-{number:03d}", "plain": f"Plain {title}.", "status": "kept", "locked": False,
                 **proposed(title)}
    criterion.update(overrides)
    return criterion


def content(criteria: list[dict]) -> list[dict]:
    return [{field: c[field] for field in ("id", "plain", "locked") + CONTENT_FIELDS} for c in criteria]


class TestMerge(unittest.TestCase):
    def test_first_scrape_makes_every_criterion_new(self):
        result = merge_criteria([], [proposed("Hedging"), proposed("Rule of three")])
        self.assertEqual([c["id"] for c in result.criteria], ["c-001", "c-002"])
        self.assertEqual({c["status"] for c in result.criteria}, {"new"})
        self.assertEqual(result.new, ["c-001", "c-002"])
        self.assertFalse(any(c["locked"] for c in result.criteria))
        self.assertEqual({c["plain"] for c in result.criteria}, {""})

    def test_scrape_twice_on_unchanged_article_changes_nothing(self):
        article = [proposed("Hedging"), proposed("Rule of three")]
        first = merge_criteria([], article)
        second = merge_criteria(first.criteria, article)
        self.assertEqual(content(second.criteria), content(first.criteria))
        self.assertEqual({c["status"] for c in second.criteria}, {"kept"})
        self.assertEqual((second.new, second.changed, second.retired), ([], [], []))

    def test_reworded_criterion_keeps_id_and_plain_and_is_flagged_changed(self):
        existing = [saved(1, "Hedging")]
        result = merge_criteria(existing, [proposed("Hedging", description="New wording.")])
        criterion = result.criteria[0]
        self.assertEqual((criterion["id"], criterion["status"]), ("c-001", "changed"))
        self.assertEqual(criterion["description"], "New wording.")
        self.assertEqual(criterion["plain"], "Plain Hedging.")
        self.assertEqual(result.changed, ["c-001"])

    def test_new_criterion_is_appended_and_never_reuses_a_retired_id(self):
        existing = [saved(1, "Hedging"), saved(2, "Old one", status="retired")]
        result = merge_criteria(existing, [proposed("Hedging"), proposed("Brand new")])
        self.assertEqual([c["id"] for c in result.criteria], ["c-001", "c-002", "c-003"])
        self.assertEqual(result.new, ["c-003"])

    def test_missing_criterion_is_retired_not_deleted_and_reported_once(self):
        existing = [saved(1, "Hedging"), saved(2, "Gone")]
        first = merge_criteria(existing, [proposed("Hedging")])
        self.assertEqual(first.retired, ["c-002"])
        self.assertEqual(len(first.criteria), 2)
        self.assertEqual(first.criteria[1]["status"], "retired")
        second = merge_criteria(first.criteria, [proposed("Hedging")])
        self.assertEqual(second.retired, [])
        self.assertEqual(second.criteria[1]["status"], "retired")

    def test_locked_criterion_is_neither_rewritten_nor_retired(self):
        existing = [saved(1, "Hedging", locked=True, description="Luke's wording."), saved(2, "Mine", locked=True)]
        result = merge_criteria(existing, [proposed("Hedging", description="Article wording."), proposed("Other")])
        self.assertEqual(result.criteria[0]["description"], "Luke's wording.")
        self.assertEqual(result.criteria[1]["status"], "kept")
        self.assertEqual((result.changed, result.retired), ([], []))

    def test_retired_criterion_that_returns_is_revived_as_changed(self):
        existing = [saved(1, "Hedging", status="retired")]
        result = merge_criteria(existing, [proposed("Hedging")])
        self.assertEqual(result.criteria[0]["status"], "changed")
        self.assertEqual(result.changed, ["c-001"])

    def test_slightly_different_title_still_matches_the_same_criterion(self):
        result = merge_criteria([saved(1, "Excessive use of em dashes")], [proposed("Excessive use of em-dashes")])
        self.assertEqual([c["id"] for c in result.criteria], ["c-001"])
        self.assertEqual(result.new, [])

    def test_proposed_id_matches_even_when_the_title_changed(self):
        result = merge_criteria([saved(1, "Hedging")], [proposed("Qualifiers", id="c-001")])
        self.assertEqual([c["id"] for c in result.criteria], ["c-001"])
        self.assertEqual(result.criteria[0]["title"], "Qualifiers")

    def test_two_proposals_for_one_criterion_do_not_both_claim_it(self):
        result = merge_criteria([saved(1, "Hedging")], [proposed("Hedging"), proposed("Hedging")])
        self.assertEqual([c["id"] for c in result.criteria], ["c-001", "c-002"])

    def test_inputs_are_not_mutated(self):
        existing, article = [saved(1, "Hedging")], [proposed("Hedging", description="Changed.")]
        before = copy.deepcopy((existing, article))
        merge_criteria(existing, article)
        self.assertEqual((existing, article), before)

    def test_empty_proposal_is_refused_rather_than_retiring_everything(self):
        with self.assertRaises(MergeError):
            merge_criteria([saved(1, "Hedging")], [])

    def test_malformed_proposals_are_refused(self):
        for bad in ("not an object", proposed("A", question=""), {"title": "A", "description": "d"}):
            with self.subTest(bad=bad), self.assertRaises(MergeError):
                merge_criteria([], [bad])

    def test_saved_criterion_missing_fields_is_refused(self):
        with self.assertRaises(MergeError):
            merge_criteria([{"id": "c-001"}], [proposed("A")])


if __name__ == "__main__":
    unittest.main()

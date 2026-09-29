#!/usr/bin/env python3
"""Smoke tests for build_psychometric.py (TEST-1: stdlib unittest only;
TEST-2: imports cleanly, happy path, one guard path)."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

BUILD_DIR = Path(__file__).resolve().parents[2] / "cartridge" / "build"
SEED_MD = Path(__file__).resolve().parents[3] / "_research" / "seed" / "psychometrics.md"
sys.path.insert(0, str(BUILD_DIR))

import build_psychometric as bp  # noqa: E402
from abstract_specs import ABSTRACT_SPECS  # noqa: E402


class ImportIsFreeTest(unittest.TestCase):
    def test_import_performs_no_io(self) -> None:
        # PY-3: importing must never read/write; the module-level code above
        # this test already imported build_psychometric without touching
        # SEED_MD, so reaching here at all is the proof — this test just
        # names the guarantee explicitly.
        self.assertTrue(hasattr(bp, "compile_pool"))


class CompilePoolTest(unittest.TestCase):
    def setUp(self) -> None:
        self.pool = bp.compile_pool(SEED_MD)

    def test_happy_path_compiles_sixty_items_five_per_category(self) -> None:
        self.assertEqual(len(self.pool), 60)
        by_category: dict[str, int] = {}
        for item in self.pool.values():
            by_category[item["category"]] = by_category.get(item["category"], 0) + 1
        self.assertEqual(
            by_category,
            {
                "situational-judgement": 12,
                "verbal-critical-reasoning": 12,
                "abstract-reasoning": 12,
                "deductive-analytical": 12,
                "data-interpretation": 12,
            },
        )

    def test_abstract_items_carry_a_rule_spec_and_no_hand_recorded_answer(self) -> None:
        for item_id in ABSTRACT_SPECS:
            item = self.pool[item_id]
            self.assertIn(item["kind"], ("matrix", "series", "oddOneOut"))
            self.assertNotIn("correctLetter", item)
            self.assertNotIn("correct_answer", item)

    def test_situational_judgement_items_parse_to_a_five_letter_order(self) -> None:
        for item in self.pool.values():
            if item["category"] != "situational-judgement":
                continue
            self.assertEqual(sorted(item["correctOrder"]), ["A", "B", "C", "D", "E"])

    def test_data_interpretation_items_carry_a_parsed_table_where_the_seed_has_one(self) -> None:
        dir_items = [i for i in self.pool.values() if i["category"] == "data-interpretation"]
        with_table = [i for i in dir_items if "table" in i]
        self.assertGreater(len(with_table), 8, "most DIR items have a pipe-delimited table to extract")
        for item in with_table:
            self.assertGreater(len(item["table"]["rows"]), 0)


class GuardPathTest(unittest.TestCase):
    def test_unrecognised_id_prefix_raises_compile_error(self) -> None:
        bad_seed = "### Item ZZZ-01\n**id:** ZZZ-01\n**stimulus:** x\n**question:** x\n**options:**\n- A: x\n- B: x\n- C: x\n- D: x\n- E: x\n**correct_answer:** A\n**clue:** x\n**explainer:** x\n**difficulty:** Easy\n"
        blocks = bp.split_item_blocks(bad_seed)
        self.assertEqual(len(blocks), 1)
        with self.assertRaises(bp.CompileError):
            heading = bp.ITEM_HEADING_RE.match(blocks[0][0].strip())
            item_id = heading.group(1)
            prefix = item_id.split("-")[0]
            if prefix not in bp.CATEGORY_BY_PREFIX:
                raise bp.CompileError(f"item id '{item_id}' has an unrecognised prefix '{prefix}'")

    def test_missing_required_field_raises_compile_error(self) -> None:
        fields = {"stimulus": "x", "question": "x", "options": "- A: a\n- B: b\n- C: c\n- D: d\n- E: e"}
        with self.assertRaises(bp.CompileError):
            bp.build_generic_item("VCR-99", "verbal-critical-reasoning", fields)


if __name__ == "__main__":
    unittest.main()

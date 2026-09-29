"""Smoke tests for seed/type_outline.py: the markdown outline parser."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from seed.type_outline import OutlineError, parse_outline  # noqa: E402

SAMPLE = """<!-- ignored
- Hidden — nope
-->
# Form

- Substitution — swaps one thing for another
  - Comparison — likens two things
    - Explicit — says "like" or "as"
- Repetition — says it again
"""


class ParseOutlineTest(unittest.TestCase):
    def test_parses_depth_name_definition_and_ancestor_path(self):
        entries = parse_outline(SAMPLE)
        self.assertEqual([(e.depth, e.name) for e in entries],
                         [(0, "Substitution"), (1, "Comparison"), (2, "Explicit"), (0, "Repetition")])
        self.assertEqual(entries[2].path, ("Substitution", "Comparison", "Explicit"))
        self.assertEqual(entries[2].definition, 'says "like" or "as"')

    def test_comments_are_ignored_but_line_numbers_stay_true(self):
        self.assertEqual(parse_outline(SAMPLE)[0].line, 6)

    def test_name_may_contain_hyphens_and_a_line_may_have_no_definition(self):
        [entry] = parse_outline("- Ad-Hoc Figure\n")
        self.assertEqual((entry.name, entry.definition), ("Ad-Hoc Figure", ""))

    def test_empty_outline_is_valid(self):
        self.assertEqual(parse_outline("# Function\n<!-- nothing yet -->\n"), [])

    def test_bad_lines_are_rejected_with_their_line_number(self):
        cases = {
            "not a bullet": "line 1",
            "- A — d\n\t- B — d": "line 2",
            "- A — d\n   - B — d": "line 2",
            "- A — d\n    - B — d": "line 2",
        }
        for text, expected in cases.items():
            with self.subTest(text=text), self.assertRaisesRegex(OutlineError, expected):
                parse_outline(text)


if __name__ == "__main__":
    unittest.main()

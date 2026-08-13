#!/usr/bin/env python3
"""Smoke tests for _shell/build/miniyaml.py (TEST-1/TEST-2, unittest only)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "build"))

import miniyaml  # noqa: E402  (import must follow sys.path fix-up)


class TestMiniYaml(unittest.TestCase):
    def test_imports_cleanly(self) -> None:
        # PY-3: import must not perform I/O. Reaching this line proves it.
        self.assertTrue(hasattr(miniyaml, "load"))
        self.assertTrue(hasattr(miniyaml, "load_file"))

    def test_happy_path_nested_mapping_and_lists(self) -> None:
        text = """
cartridge:
  name: "Grammar parser"
  id: Grammar
  version: "1.0.0"
parser:
  levels:
    - sentential
    - clausal
  cap: 100
  tentativeThreshold: 0.7
colours:
  palette:
    - name: teal
      h50: "#E1F5EE"
      h100: "#9FE1CB"
    - name: amber
      h50: "#FAEEDA"
      h100: "#FAC775"
tierB:
  enabled: false
"""
        result = miniyaml.load(text)
        self.assertEqual(result["cartridge"]["name"], "Grammar parser")
        self.assertEqual(result["cartridge"]["id"], "Grammar")
        self.assertEqual(result["parser"]["levels"], ["sentential", "clausal"])
        self.assertEqual(result["parser"]["cap"], 100)
        self.assertAlmostEqual(result["parser"]["tentativeThreshold"], 0.7)
        self.assertEqual(len(result["colours"]["palette"]), 2)
        self.assertEqual(result["colours"]["palette"][0]["name"], "teal")
        self.assertEqual(result["colours"]["palette"][1]["h50"], "#FAEEDA")
        self.assertIs(result["tierB"]["enabled"], False)

    def test_empty_input_returns_empty_dict(self) -> None:
        # Guard path: no exception, no crash — just nothing parsed.
        self.assertEqual(miniyaml.load(""), {})
        self.assertEqual(miniyaml.load("# only a comment\n---\n"), {})


if __name__ == "__main__":
    unittest.main()

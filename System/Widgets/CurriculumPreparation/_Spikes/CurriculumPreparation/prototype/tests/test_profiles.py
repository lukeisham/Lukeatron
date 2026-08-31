#!/usr/bin/env python3
"""Smoke + contract tests for profiles.py (TEST-2, TEST-9: imports the real
module, no reimplementation)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import profiles  # noqa: E402


class TestProfilesImport(unittest.TestCase):
    def test_imports_cleanly(self) -> None:
        self.assertIn("vic-f10-v2", profiles.PROFILES)
        self.assertIn("generic", profiles.PROFILES)


class TestGetProfile(unittest.TestCase):
    def test_happy_path_returns_known_profile(self) -> None:
        profile = profiles.get_profile("vic-f10-v2")
        self.assertEqual(profile["id"], "vic-f10-v2")
        self.assertIn("K", profile["strand_map"])
        self.assertIn("S", profile["strand_map"])

    def test_unknown_profile_raises(self) -> None:
        with self.assertRaises(KeyError):
            profiles.get_profile("does-not-exist")


class TestVicF10V2CodePattern(unittest.TestCase):
    def test_matches_fixture_style_code(self) -> None:
        profile = profiles.get_profile("vic-f10-v2")
        match = profile["code_pattern"].search(
            "causes and consequences of the Industrial Revolution VC2HH10K01"
        )
        self.assertIsNotNone(match)
        self.assertEqual(match.group("code"), "VC2HH10K01")
        self.assertEqual(match.group("letter"), "K")

    def test_generalises_beyond_hh10(self) -> None:
        """Per AD-10 the pattern must not be over-fit to HH10 — it should
        match other learning areas and levels too."""
        profile = profiles.get_profile("vic-f10-v2")
        match = profile["code_pattern"].search("some other outcome VC2MA08S03")
        self.assertIsNotNone(match)
        self.assertEqual(match.group("code"), "VC2MA08S03")
        self.assertEqual(match.group("letter"), "S")

    def test_does_not_match_codeless_line(self) -> None:
        profile = profiles.get_profile("vic-f10-v2")
        match = profile["code_pattern"].search("concepts and skills")
        self.assertIsNone(match)


class TestGenericProfile(unittest.TestCase):
    def test_has_no_code_pattern(self) -> None:
        profile = profiles.get_profile("generic")
        self.assertIsNone(profile["code_pattern"])

    def test_strand_map_is_empty(self) -> None:
        profile = profiles.get_profile("generic")
        self.assertEqual(profile["strand_map"], {})


if __name__ == "__main__":
    unittest.main()

"""Smoke tests for snapshot.py (TEST-1: unittest; TEST-2: three things per
module, not exhaustive coverage).

Every test here is in-memory only (TEST-4): no real store is read, and
nothing under Memory/ is touched. `build_snapshot_html`'s own board-fetch
path (`stores.load_board_sources` -> `model.build_board`) is exercised
indirectly by passing an already-built `model.Board` in (the same shape
`build_faces.py`'s joint driver hands it), reusing `test_brief.py`'s own
fixture builders (TEST-9: mirrors that file's fixtures rather than
duplicating them) so this file never needs its own registry/tracking fakes.
"""

from __future__ import annotations

import sys
import unittest
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import snapshot  # noqa: E402  (path must be set up first)

from test_brief import build_board, na, project_source  # noqa: E402

TODAY = date(2026, 9, 6)
BUILD_TIME = datetime(2026, 9, 6, 8, 30, 0)


def _sample_board():
    return build_board([project_source("ZZ-01", "Personal Research", [na(action="confirm something", kind="mine")])])


class TestImport(unittest.TestCase):
    def test_imports_cleanly(self) -> None:
        for name in ("build_snapshot_html", "bundle_monitor_js", "bundle_css", "find_external_references"):
            self.assertTrue(hasattr(snapshot, name), name)


class TestSelfScanFR7(unittest.TestCase):
    """FR-7: the self-scan fails the build on anything that looks like a
    network reference, with the one documented SVG-namespace exception."""

    def test_a_planted_external_reference_is_caught(self) -> None:
        findings = snapshot.find_external_references('<script src="https://example.com/x.js"></script>')
        self.assertIn("https://", findings)

    def test_the_svg_namespace_uri_is_not_flagged(self) -> None:
        findings = snapshot.find_external_references(f'<svg xmlns="{snapshot._ALLOWED_HTTP_LITERAL}"></svg>')
        self.assertEqual(findings, [])

    def test_a_real_build_carries_no_external_reference(self) -> None:
        html_text = snapshot.build_snapshot_html(today=TODAY, build_time=BUILD_TIME, board=_sample_board())
        self.assertEqual(snapshot.find_external_references(html_text), [])


class TestNeverBundlesUnblockAD1(unittest.TestCase):
    """AD-1: the snapshot is Monitor only — `unblock/`'s write client must
    never reach the bundle, since a frozen offline face can write nothing."""

    def test_no_unblock_module_is_a_bundle_source(self) -> None:
        for key in snapshot._REAL_MODULES:
            self.assertFalse(key.startswith("unblock/"), key)

    def test_bundle_makes_no_network_call_of_its_own(self) -> None:
        # board-client.js is replaced with the inlined-data shim (AD-1), so
        # the only network call any live module made — `fetch(...)` — must
        # not survive into the bundle at all. `/api/edit`/`/api/request`
        # appear only in source comments (monitor.js's own docstring), not
        # as a reachable call, which this checks directly rather than
        # grepping for the path strings themselves.
        bundle = snapshot.bundle_monitor_js()
        self.assertNotIn("fetch(", bundle)


class TestWikiDoorSubstitutionFR5(unittest.TestCase):
    """The wiki-door substitution's count-!=1 guard must actually raise the
    moment monitor.js's own wikiDoor line stops matching the pattern this
    module bundles against — a silent zero-substitutions would ship a live
    `http://localhost:8787` reference straight into an offline file (FR-7).
    Mirrors `_transform_module`'s own guard (snapshot.py), against a source
    text standing in for a monitor.js that has drifted from the pattern."""

    def test_a_source_line_that_no_longer_matches_fails_the_guard(self) -> None:
        body = "const wikiDoor = somethingElse();"
        _, count = snapshot._WIKI_DOOR_RE.subn(snapshot._WIKI_DOOR_REPLACEMENT, body)
        self.assertNotEqual(count, 1)

    def test_the_real_monitor_js_matches_exactly_once(self) -> None:
        real = (snapshot.MONITOR_DIR / "monitor.js").read_text(encoding="utf-8")
        _, count = snapshot._WIKI_DOOR_RE.subn(snapshot._WIKI_DOOR_REPLACEMENT, real)
        self.assertEqual(count, 1)


class TestUnblockDoorSubstitution(unittest.TestCase):
    """The parallel substitution for opened-stack.js's "take this to
    Unblock" button — a live-looking primary button that silently no-ops
    offline (FR-4/FR-5) is exactly the failure mode the wiki-door pattern
    above already guards against."""

    def test_the_real_file_transforms_with_no_button_and_no_write_event(self) -> None:
        body, _names = snapshot._transform_module(
            "monitor/opened-stack.js", snapshot.MONITOR_DIR / "opened-stack.js", {}
        )
        self.assertIn("unblockBtn = null", body)
        self.assertNotIn("projectdashboard:open-unblock\"", body)
        self.assertNotIn('class: "primary-button"', body)


class TestStampUsesBuildTimeNotClock(unittest.TestCase):
    """FR-10/AC-7: the stamp must name the caller's injected `build_time`,
    never a fresh `datetime.now()` read inside this module."""

    def test_stamp_names_the_injected_build_time(self) -> None:
        html_text = snapshot.build_snapshot_html(today=TODAY, build_time=BUILD_TIME, board=_sample_board())
        self.assertIn("2026-09-06 08:30", html_text)


if __name__ == "__main__":
    unittest.main()

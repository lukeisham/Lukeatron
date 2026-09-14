"""
Test suite for capture.py — the fixed quick-capture form's write path.

Covers capture.spec.md AC-1 through AC-10, plus the extra coverage this
project's build brief called for: determinism, the TEST-7 blocked/permitted
pair, atomicity under a simulated crash, and sequential-id collision safety.

capture.py is one of exactly two modules in this app permitted to write into
Memory/Long-Term/. Every test here builds a tempfile fixture tree shaped
like Memory/Long-Term/ + LukeatronWiki/ + System/Sandbox/, and monkey-patches
every `paths` constant capture.py (transitively, via library/seal) reads
through. No test in this file writes anywhere under the real Memory/.

Fixture pattern copied from test_library.py, including its documented
macOS gotcha: the temp root is `.resolve()`d before patching `paths.LT`,
because on macOS /var is itself a symlink to /private/var, and seal.py
resolves paths before comparing them to paths.LT. Leaving paths.LT
unresolved would make a resolved child path fail `relative_to()` checks
for reasons that have nothing to do with capture.py's own logic.
"""

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))

import paths
import seal
import library
import yamlio
import capture


def _write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


QUEUE_START = (
    "wiki: LukeatronWiki\n"
    "items:\n"
    "  - id: q-001\n"
    '    title: "Some queued thing"\n'
    "    kind: article\n"
    "    intent: read\n"
    "    status: queued\n"
    '    source: "Source A"\n'
    "    page: theology\n"
    "    added: 2026-01-01\n"
    '    notes: ""\n'
    "\n"
    "  - id: q-002\n"
    '    title: "Another queued thing"\n'
    "    kind: book\n"
    "    intent: watch\n"
    "    status: queued\n"
    '    source: "Source B"\n'
    "    page: theology\n"
    "    added: 2026-01-02\n"
    '    notes: ""\n'
)


class CaptureFixtureTestCase(unittest.TestCase):
    """
    Base class: builds a temp tree shaped like Memory/Long-Term/ +
    LukeatronWiki/, and monkey-patches every paths.* constant capture.py
    (and library/seal underneath it) reads through. Fresh fixture per test.
    """

    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)
        # See module docstring re: macOS /var -> /private/var symlink.
        root = Path(self.tmpdir.name).resolve()

        self.root = root
        self.lt = root / "Memory" / "Long-Term"
        self.wiki = self.lt / "LukeatronWiki"
        self.nodes = self.wiki / "Nodes"
        self.media = self.wiki / "_media"
        self.sealed_yaml = self.wiki / "_sealed.yaml"
        self.index_yaml = self.wiki / "_index.yaml"
        self.queue_yaml = self.wiki / "_queue.yaml"

        # ---- store files -----------------------------------------------
        self.theology_list = self.lt / "Theology" / "theology.list.md"
        _write(self.theology_list, "Theology list store content.\n")
        self.plain_md = self.lt / "Theology" / "plain.md"
        _write(self.plain_md, "Plain non-.list.md store content.\n")
        _write(self.lt / "Mixed" / "sealed_file.md", "Should never be read.\n")
        _write(self.lt / "SealedStore" / "secret.md", "Should never be read.\n")
        # a file genuinely outside Memory/Long-Term/, for the escape-ref case
        _write(self.root / "outside.md", "Outside the fence.\n")

        # ---- sealed manifest --------------------------------------------
        _write(
            self.sealed_yaml,
            "stores:\n  - SealedStore\n"
            "files:\n"
            "  - Mixed/sealed_file.md\n",
        )

        # ---- _index.yaml --------------------------------------------------
        _write(
            self.index_yaml,
            "wiki: LukeatronWiki\n"
            "type: wiki-page-index\n"
            "themes:\n"
            "  - name: \"Theology\"\n"
            "    folder: \"Memory/Long-Term/Theology\"\n"
            "    hub_slug: \"theology\"\n",
        )

        # ---- _queue.yaml ----------------------------------------------------
        _write(self.queue_yaml, QUEUE_START)

        # ---- nodes -----------------------------------------------------------
        # "theology": one unsealed .list.md ref -> AD-1's preferred pick.
        _write(
            self.nodes / "theology.md",
            '---\n'
            'slug: "theology"\n'
            'title: "Theology"\n'
            'type: theme\n'
            'longterm_refs:\n'
            '  - "Theology list :: Theology/theology.list.md"\n'
            '---\n\n'
            '# Theology\n',
        )
        # "plain-node": one unsealed ref, NOT .list.md -> the "else first
        # unsealed ref of any kind" branch of AD-1's pick logic.
        _write(
            self.nodes / "plain-node.md",
            '---\n'
            'slug: "plain-node"\n'
            'title: "Plain Node"\n'
            'type: theme\n'
            'longterm_refs:\n'
            '  - "Plain ref :: Theology/plain.md"\n'
            '---\n\n'
            '# Plain Node\n',
        )
        # "no-refs": exists, unsealed (empty refs list is not "sealed"), but
        # has literally nothing to append a note to.
        _write(
            self.nodes / "no-refs.md",
            '---\n'
            'slug: "no-refs"\n'
            'title: "No Refs"\n'
            'type: theme\n'
            'longterm_refs: []\n'
            '---\n\n'
            '# No Refs\n',
        )
        # "escape-node": its one ref is not sealed per seal.is_sealed() (it
        # doesn't match any manifest entry), but resolving it lands OUTSIDE
        # Memory/Long-Term/ entirely -> FR-8's structural check must catch
        # this independently of the seal check.
        _write(
            self.nodes / "escape-node.md",
            '---\n'
            'slug: "escape-node"\n'
            'title: "Escape Node"\n'
            'type: theme\n'
            'longterm_refs:\n'
            '  - "Escape ref :: ../../outside.md"\n'
            '---\n\n'
            '# Escape Node\n',
        )
        # "fully-sealed": its only ref is sealed -> the WHOLE node is
        # excluded from library.list_nodes(), i.e. structurally unselectable
        # from the page dropdown (AC-3's whole point).
        _write(
            self.nodes / "fully-sealed.md",
            '---\n'
            'slug: "fully-sealed"\n'
            'title: "Fully Sealed"\n'
            'type: theme\n'
            'longterm_refs:\n'
            '  - "Sealed ref :: Mixed/sealed_file.md"\n'
            '---\n\n'
            '# Fully Sealed\n',
        )

        # ---- apply the monkey-patch ---------------------------------------
        self._patches = [
            patch.object(paths, "LT", self.lt),
            patch.object(paths, "WIKI", self.wiki),
            patch.object(paths, "NODES", self.nodes),
            patch.object(paths, "SEALED_YAML", self.sealed_yaml),
            patch.object(paths, "INDEX_YAML", self.index_yaml),
            patch.object(paths, "QUEUE_YAML", self.queue_yaml),
            patch.object(paths, "MEDIA", self.media),
        ]
        for p in self._patches:
            p.start()
            self.addCleanup(p.stop)

    # ---- small helpers ----------------------------------------------------

    def _queue_items(self):
        data = yamlio.parse(self.queue_yaml.read_text(encoding="utf-8"))
        return data.get("items") or []


# ============================================================================
# AC-2 — invalid intent, zero writes
# ============================================================================


class TestAC2InvalidIntent(CaptureFixtureTestCase):
    def test_invalid_intent_rejected_zero_writes(self):
        before_queue = self.queue_yaml.read_bytes()
        before_store = self.theology_list.read_bytes()

        result = capture.capture_submit(
            title="T", kind="article", intent="devour", source="S",
            page="theology", note="a note",
        )

        self.assertFalse(result["ok"])
        self.assertIn("devour", result["error"])
        self.assertEqual(result["writes"], [])
        self.assertEqual(self.queue_yaml.read_bytes(), before_queue)
        self.assertEqual(self.theology_list.read_bytes(), before_store)

    def test_empty_intent_rejected(self):
        result = capture.capture_submit(
            title="T", kind="article", intent="", source="S", page="theology",
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["writes"], [])


# ============================================================================
# AC-3 — page dropdown cross-checked against seal.is_sealed()
# ============================================================================


class TestAC3DropdownNeverShowsSealedEntries(CaptureFixtureTestCase):
    def test_fully_sealed_node_absent_from_dropdown_source(self):
        slugs = {n["slug"] for n in library.list_nodes()}
        self.assertNotIn("fully-sealed", slugs)
        self.assertIn("theology", slugs)

    def test_no_dropdown_entry_is_wholly_sealed(self):
        # Cross-check: for every node the dropdown could show, it must not
        # be the case that ALL of its longterm_refs are sealed (that would
        # be a fully-sealed node improperly leaking through).
        for node in library.list_nodes():
            refs = node["longterm_refs"]
            if refs:
                self.assertFalse(
                    all(seal.is_sealed(r["relpath"]) for r in refs),
                    f"node {node['slug']!r} is fully sealed but appeared in list_nodes()",
                )

    def test_crafted_page_bypassing_dropdown_still_refused(self):
        # A crafted call naming the sealed slug directly (bypassing the
        # dropdown UI) must still be refused by capture_submit itself.
        before_store = (self.lt / "Mixed" / "sealed_file.md").read_bytes()
        result = capture.capture_submit(
            title="T", kind="article", intent="read", source="S",
            page="fully-sealed", note="sneaky note",
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["writes"], [])
        self.assertEqual((self.lt / "Mixed" / "sealed_file.md").read_bytes(), before_store)

    def test_unknown_page_refused(self):
        result = capture.capture_submit(
            title="T", kind="article", intent="read", source="S",
            page="no-such-slug",
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["writes"], [])


# ============================================================================
# AC-4 — no needs_absorb key, ever
# ============================================================================


class TestAC4NoNeedsAbsorbKey(CaptureFixtureTestCase):
    def test_new_row_has_no_needs_absorb_key(self):
        result = capture.capture_submit(
            title="T", kind="article", intent="read", source="S", page="theology",
        )
        self.assertTrue(result["ok"])
        raw = self.queue_yaml.read_text(encoding="utf-8")
        new_row_text = raw[raw.rindex("- id: q-003"):]
        self.assertNotIn("needs_absorb", new_row_text)

        items = self._queue_items()
        new_item = next(i for i in items if i["id"] == "q-003")
        self.assertNotIn("needs_absorb", new_item)


# ============================================================================
# AC-5 — verbatim, byte-for-byte note append, awkward content included
# ============================================================================


class TestAC5NoteAppendedVerbatim(CaptureFixtureTestCase):
    AWKWARD_NOTE = (
        'He said "hello there" — cost: $5 #not-a-comment\n'
        "\n"
        "a line with trailing whitespace   \n"
        "café ☕ non-ascii glyph"
    )

    def test_note_appears_byte_for_byte_under_dated_heading_p_luke_marked(self):
        orig_text = self.theology_list.read_text(encoding="utf-8")

        result = capture.capture_submit(
            title="T", kind="article", intent="write", source="S",
            page="theology", note=self.AWKWARD_NOTE,
        )
        self.assertTrue(result["ok"], result.get("error"))

        new_text = self.theology_list.read_text(encoding="utf-8")

        # Original content untouched (still present, nothing removed).
        self.assertIn(orig_text.strip("\n"), new_text)
        # The note is present with EVERY character intact — the whole
        # point of AC-5. No stripping, no reformatting.
        self.assertIn(self.AWKWARD_NOTE, new_text)
        # A dated heading, today's date.
        import datetime as dt
        today = dt.date.today().isoformat()
        self.assertIn(f"## {today}", new_text)
        # Marked as Luke's own words, not agent-generated (.p-luke, never .p-gen).
        self.assertIn("p-luke", new_text)
        self.assertNotIn("p-gen", new_text)

    def test_note_written_to_correct_target_file_only(self):
        # plain-node's ref is NOT .list.md; confirm capture picks IT (the
        # only unsealed ref) rather than silently writing nowhere.
        orig_text = self.plain_md.read_text(encoding="utf-8")
        result = capture.capture_submit(
            title="T", kind="article", intent="read", source="S",
            page="plain-node", note="a plain-node note",
        )
        self.assertTrue(result["ok"], result.get("error"))
        new_text = self.plain_md.read_text(encoding="utf-8")
        self.assertIn(orig_text.strip("\n"), new_text)
        self.assertIn("a plain-node note", new_text)

    def test_no_unsealed_store_file_to_write_note_to(self):
        result = capture.capture_submit(
            title="T", kind="article", intent="read", source="S",
            page="no-refs", note="orphan note",
        )
        self.assertFalse(result["ok"])
        self.assertIn("no unsealed store file", result["error"])
        self.assertEqual(result["writes"], [])
        # queue was never touched either (structural check runs before any write)
        self.assertEqual(len(self._queue_items()), 2)


# ============================================================================
# AC-6 — no note given, store file byte-identical
# ============================================================================


class TestAC6NoNoteStoreUntouched(CaptureFixtureTestCase):
    def test_store_byte_identical_when_no_note_given(self):
        before = self.theology_list.read_bytes()

        result = capture.capture_submit(
            title="T", kind="article", intent="read", source="S", page="theology",
        )
        self.assertTrue(result["ok"])

        after = self.theology_list.read_bytes()
        self.assertEqual(before, after)
        # Only the queue write happened.
        self.assertEqual(result["writes"], [paths.store_rel(self.queue_yaml)])


# ============================================================================
# AC-7 / AC-8 — the TEST-7 pair (blocked path / permitted path)
# ============================================================================


class TestAC7AC8Test7Pair(CaptureFixtureTestCase):
    def test_ac7_blocked_path_target_outside_permitted_files_zero_writes(self):
        """
        escape-node's ref resolves OUTSIDE Memory/Long-Term/ entirely. It is
        not caught by the seal check (it matches nothing in the manifest) —
        only FR-8's structural containment check catches it. Zero writes on
        both the queue and the escape target.
        """
        before_queue = self.queue_yaml.read_bytes()
        outside_path = self.root / "outside.md"
        before_outside = outside_path.read_bytes()

        result = capture.capture_submit(
            title="T", kind="article", intent="read", source="S",
            page="escape-node", note="should never land",
        )

        self.assertFalse(result["ok"])
        self.assertEqual(result["writes"], [])
        self.assertEqual(self.queue_yaml.read_bytes(), before_queue)
        self.assertEqual(outside_path.read_bytes(), before_outside)

    def test_ac8_permitted_path_both_writes_land(self):
        """A well-formed capture (valid intent, valid existing-node page,
        a note) succeeds and BOTH expected writes land."""
        result = capture.capture_submit(
            title="Good Title", kind="article", intent="watch",
            source="Good Source", page="theology", note="a permitted note",
        )
        self.assertTrue(result["ok"])
        self.assertIsNone(result["error"])
        self.assertEqual(
            set(result["writes"]),
            {paths.store_rel(self.queue_yaml), paths.store_rel(self.theology_list)},
        )
        self.assertEqual(len(self._queue_items()), 3)
        self.assertIn("a permitted note", self.theology_list.read_text(encoding="utf-8"))


# ============================================================================
# AC-9 — no agent call, no !Checkpoint call anywhere in the module
# ============================================================================


class TestAC9NoAgentOrCheckpointCall(unittest.TestCase):
    SUSPICIOUS_TOKENS = (
        "Checkpoint(", "!Checkpoint(", "call_agent", "invoke_agent",
        "Agent(", "openai", "anthropic", "subprocess", "os.system(",
        "os.popen(", "urllib.request", "http.client", "socket.",
    )

    def test_no_agent_or_checkpoint_invocation(self):
        source = (Path(__file__).parent.parent / "capture.py").read_text(encoding="utf-8")
        offenders = [tok for tok in self.SUSPICIOUS_TOKENS if tok in source]
        self.assertEqual(offenders, [], f"suspicious tokens found in capture.py: {offenders}")


# ============================================================================
# AC-10 — missing _queue.yaml self-heals to a minimal valid document
# ============================================================================


class TestAC10MissingQueueYamlSelfHeals(CaptureFixtureTestCase):
    def test_missing_queue_recreated_no_crash_reports_ok(self):
        """
        The part of AC-10 that DOES hold: capture_submit does not crash and
        reports ok=True when _queue.yaml is missing.
        """
        self.queue_yaml.unlink()
        self.assertFalse(self.queue_yaml.exists())

        result = capture.capture_submit(
            title="T", kind="article", intent="read", source="S", page="theology",
        )
        self.assertTrue(result["ok"], result.get("error"))
        self.assertTrue(self.queue_yaml.exists())

    def test_missing_queue_recreated_document_is_actually_valid_yaml(self):
        """
        AC-10 requirement: the self-healed queue file must be valid YAML,
        not malformed. The recreated document uses block-list syntax
        ("items:\n" with NO inline "[]") so the first appended row is a
        normal, valid nested list item. This test verifies the fix.
        """
        self.queue_yaml.unlink()

        result = capture.capture_submit(
            title="T", kind="article", intent="read", source="S", page="theology",
        )
        self.assertTrue(result["ok"], result.get("error"))

        data = yamlio.parse(self.queue_yaml.read_text(encoding="utf-8"))
        self.assertIsInstance(data.get("items"), list)
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["id"], "q-001")

    def test_missing_queue_recreated_has_correct_header_keys(self):
        """
        AC-10 / task requirement: the recreated minimal document should carry
        the same header keys as the real file: wiki, type, last_updated, count.
        """
        self.queue_yaml.unlink()

        result = capture.capture_submit(
            title="T", kind="article", intent="read", source="S", page="theology",
        )
        self.assertTrue(result["ok"], result.get("error"))

        data = yamlio.parse(self.queue_yaml.read_text(encoding="utf-8"))
        # Check that all header keys are present and have expected values.
        self.assertEqual(data.get("wiki"), "LukeatronWiki")
        self.assertEqual(data.get("type"), "read-watch-write-queue")
        self.assertIn("last_updated", data)
        self.assertIn("count", data)

    def test_missing_queue_count_correct_after_first_capture(self):
        """
        Task requirement: count must not go stale. After the first capture
        creates the queue file and appends one row, count should be 1.
        """
        self.queue_yaml.unlink()

        result = capture.capture_submit(
            title="T", kind="article", intent="read", source="S", page="theology",
        )
        self.assertTrue(result["ok"], result.get("error"))

        data = yamlio.parse(self.queue_yaml.read_text(encoding="utf-8"))
        self.assertEqual(data.get("count"), 1)

    def test_missing_queue_second_capture_appends_correctly_count_updates(self):
        """
        Task requirement: a second capture against a recreated queue file
        should append correctly, and count should be updated to 2.
        """
        self.queue_yaml.unlink()

        # First capture: creates the queue and appends q-001.
        result1 = capture.capture_submit(
            title="First", kind="article", intent="read", source="S", page="theology",
        )
        self.assertTrue(result1["ok"], result1.get("error"))

        # Second capture: appends q-002 to the recreated file.
        result2 = capture.capture_submit(
            title="Second", kind="book", intent="watch", source="S", page="theology",
        )
        self.assertTrue(result2["ok"], result2.get("error"))

        data = yamlio.parse(self.queue_yaml.read_text(encoding="utf-8"))
        items = data.get("items") or []
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["id"], "q-001")
        self.assertEqual(items[1]["id"], "q-002")
        self.assertEqual(data.get("count"), 2)

    def test_missing_queue_determinism_two_runs_from_same_missing_state(self):
        """
        AC-1 / determinism requirement: the same input against two separate
        missing-file starting states should produce byte-identical output.
        """
        def run_from_missing():
            self.queue_yaml.unlink()
            result = capture.capture_submit(
                title="Deterministic Title", kind="article", intent="read",
                source="Deterministic Source", page="theology", note=None,
            )
            self.assertTrue(result["ok"], result.get("error"))
            return self.queue_yaml.read_bytes()

        first_run_bytes = run_from_missing()
        second_run_bytes = run_from_missing()
        self.assertEqual(first_run_bytes, second_run_bytes)


# ============================================================================
# Determinism — AC-1
# ============================================================================


class TestAC1Determinism(CaptureFixtureTestCase):
    def test_same_input_same_starting_snapshot_byte_identical_output(self):
        starting_text = self.queue_yaml.read_text(encoding="utf-8")

        def run_once():
            _write(self.queue_yaml, starting_text)
            result = capture.capture_submit(
                title="Deterministic Title", kind="article", intent="read",
                source="Deterministic Source", page="theology", note=None,
            )
            self.assertTrue(result["ok"], result.get("error"))
            return self.queue_yaml.read_bytes()

        first_run_bytes = run_once()
        second_run_bytes = run_once()
        self.assertEqual(first_run_bytes, second_run_bytes)


# ============================================================================
# Atomicity — a crash mid-write must never leave a half-written file
# ============================================================================


class TestAtomicity(CaptureFixtureTestCase):
    def test_queue_write_failure_leaves_queue_unchanged(self):
        before = self.queue_yaml.read_bytes()
        with patch("capture.os.replace", side_effect=OSError("simulated disk failure")):
            result = capture.capture_submit(
                title="T", kind="article", intent="read", source="S", page="theology",
            )
        self.assertFalse(result["ok"])
        self.assertIn("failed to write _queue.yaml", result["error"])
        # Either unchanged, or fully written — never truncated/partial. Here
        # os.replace itself never runs, so the original file must be intact.
        self.assertEqual(self.queue_yaml.read_bytes(), before)
        # No stray .tmp files left behind in the wiki control-surface dir.
        leftovers = [p for p in self.wiki.glob(".*tmp*") if p.is_file()]
        self.assertEqual(leftovers, [])

    def test_note_write_failure_leaves_store_unchanged_but_queue_already_landed(self):
        # capture.py's documented atomicity decision: the two writes are NOT
        # one transaction. If (a) lands and (b) fails, the queue row stays,
        # the note write is reported as failed, and the store file itself
        # must never be left half-written.
        before_store = self.theology_list.read_bytes()

        # Patch os.replace so the FIRST call (queue write) succeeds and the
        # SECOND call (note write) fails.
        real_replace = capture.os.replace
        call_count = {"n": 0}

        def flaky_replace(src, dst):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return real_replace(src, dst)
            raise OSError("simulated disk failure on note write")

        with patch("capture.os.replace", side_effect=flaky_replace):
            result = capture.capture_submit(
                title="T", kind="article", intent="read", source="S",
                page="theology", note="this note should not land",
            )

        self.assertFalse(result["ok"])
        self.assertIn("note write failed", result["error"])
        # Queue write DID land per the documented decision.
        self.assertEqual(result["writes"], [paths.store_rel(self.queue_yaml)])
        self.assertEqual(len(self._queue_items()), 3)
        # Store file untouched — never partially written.
        self.assertEqual(self.theology_list.read_bytes(), before_store)


# ============================================================================
# Concurrent-id safety
# ============================================================================


class TestSequentialIdSafety(CaptureFixtureTestCase):
    def test_sequential_captures_produce_non_colliding_ids(self):
        r1 = capture.capture_submit(
            title="First", kind="article", intent="read", source="S", page="theology",
        )
        r2 = capture.capture_submit(
            title="Second", kind="article", intent="watch", source="S", page="theology",
        )
        self.assertTrue(r1["ok"])
        self.assertTrue(r2["ok"])

        ids = [item["id"] for item in self._queue_items()]
        self.assertEqual(len(ids), len(set(ids)), f"duplicate ids found: {ids}")
        self.assertEqual(sorted(ids), ["q-001", "q-002", "q-003", "q-004"])


if __name__ == "__main__":
    unittest.main()

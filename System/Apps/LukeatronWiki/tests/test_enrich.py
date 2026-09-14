"""
Test suite for enrich.py — the request -> draft -> accept file protocol
behind the PRD's generation gate (References / Supporting Quotes / See Also).

Covers enrich.spec.md AC-1 through AC-11, plus the extra coverage this
project's build brief called for: a full fixture-walk lifecycle test, the
double verified-stamp check (write_draft AND accept), FR-11/FR-12's
directory-creation and graceful-empty behaviour, the FR-10 route-table
cross-check against server.py, and atomicity under a simulated crash on
accept()'s store write — the most dangerous write in the app.

enrich.py is one of exactly two modules in this app permitted to write into
Memory/Long-Term/ (accept() only — request_enrich()/write_draft()/cancel()
write only to System/Sandbox/wiki-enrich/). Every test here builds a
tempfile fixture tree and monkey-patches every `paths` constant enrich.py
(transitively, via library/seal) reads through. No test in this file writes
anywhere under the real Memory/ or the real System/Sandbox/wiki-enrich/.

Fixture pattern copied from test_library.py, including its documented
macOS gotcha: the temp root is `.resolve()`d before patching `paths.LT`,
because on macOS /var is itself a symlink to /private/var, and seal.py
resolves paths before comparing them to paths.LT.
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
import enrich


APP_DIR = Path(__file__).parent.parent


def _write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


class EnrichFixtureTestCase(unittest.TestCase):
    """
    Base class: builds a temp tree shaped like Memory/Long-Term/ +
    LukeatronWiki/ + System/Sandbox/wiki-enrich/, and monkey-patches every
    paths.* constant enrich.py (and library/seal underneath it) reads
    through. Fresh fixture per test.

    Deliberately does NOT pre-create System/Sandbox/wiki-enrich/ or its
    _requests/ subfolder — FR-11/FR-12 require enrich.py to create them
    itself on write and degrade gracefully on read when absent.
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

        # System/Sandbox/wiki-enrich/ — NOT created here on purpose.
        self.enrich_dir = root / "System" / "Sandbox" / "wiki-enrich"
        self.req_dir = self.enrich_dir / "_requests"

        # ---- store files -----------------------------------------------
        self.theology_list = self.lt / "Theology" / "theology.list.md"
        _write(self.theology_list, "Theology list store content.\n")
        _write(self.lt / "Theology" / "plain.md", "Plain content.\n")
        _write(self.lt / "Mixed" / "sealed_file.md", "Should never be read.\n")
        _write(self.lt / "SealedStore" / "secret.md", "Should never be read.\n")

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
        _write(self.queue_yaml, "wiki: LukeatronWiki\nitems: []\n")

        # ---- nodes -----------------------------------------------------------
        # "theology": one unsealed .list.md ref -> the accept()/store target
        # used by every lifecycle test.
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
        # "plain-node": a second unsealed page, used for AC-1's isolated
        # double-click test so it never touches theology's own state.
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
        # "no-refs": exists, unsealed, but nothing to accept into.
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
        # "fully-sealed": its only ref is sealed -> excluded from
        # library.list_nodes() entirely -> every entry point must refuse it.
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
            patch.object(paths, "ENRICH_DIR", self.enrich_dir),
            patch.object(paths, "REQ_DIR", self.req_dir),
        ]
        for p in self._patches:
            p.start()
            self.addCleanup(p.stop)

    # ---- small helpers ----------------------------------------------------

    def _req_path(self, slug, slot):
        return self.req_dir / f"{slug}.{enrich.SLOT_IDS[slot]}.yaml"

    def _draft_path(self, slug, slot):
        return self.enrich_dir / f"{slug}.{enrich.SLOT_IDS[slot]}.md"


# ============================================================================
# Full lifecycle as a fixture walk — slot_state() asserted at every step.
# Three lifecycles, one per SLOTS entry, all on the same "theology" page so
# the shared store file's independence per-slot is exercised too.
# ============================================================================


class TestFullLifecycleWalk(EnrichFixtureTestCase):
    def test_empty_request_draft_accept_filled(self):
        slug, slot = "theology", "References"

        self.assertEqual(enrich.slot_state(slug, slot), "empty")

        r1 = enrich.request_enrich(slug, slot)
        self.assertTrue(r1["ok"])
        self.assertTrue(r1["created"])
        self.assertEqual(enrich.slot_state(slug, slot), "requested")

        r2 = enrich.write_draft(slug, slot, [{"text": "A reference.", "verified": "checked via WorldCat"}])
        self.assertTrue(r2["ok"], r2.get("error"))
        self.assertEqual(enrich.slot_state(slug, slot), "draft")

        r3 = enrich.accept(slug, slot)
        self.assertTrue(r3["ok"], r3.get("error"))
        self.assertEqual(enrich.slot_state(slug, slot), "filled")

        # AC-9: neither a request file nor a draft file survives accept().
        self.assertFalse(self._req_path(slug, slot).exists())
        self.assertFalse(self._draft_path(slug, slot).exists())

        store_text = self.theology_list.read_text(encoding="utf-8")
        self.assertIn('<!-- p-gen:start slot="References" -->', store_text)
        self.assertIn("A reference.", store_text)
        self.assertIn("checked via WorldCat", store_text)

    def test_empty_request_cancel_empty(self):
        slug, slot = "theology", "Supporting Quotes"

        self.assertEqual(enrich.slot_state(slug, slot), "empty")

        r1 = enrich.request_enrich(slug, slot)
        self.assertTrue(r1["ok"])
        self.assertEqual(enrich.slot_state(slug, slot), "requested")

        before_store = self.theology_list.read_bytes()
        r2 = enrich.cancel(slug, slot)
        self.assertTrue(r2["ok"], r2.get("error"))
        self.assertEqual(enrich.slot_state(slug, slot), "empty")
        self.assertFalse(self._req_path(slug, slot).exists())
        # store untouched
        self.assertEqual(self.theology_list.read_bytes(), before_store)

    def test_request_draft_cancel_empty(self):
        slug, slot = "theology", "See Also"

        enrich.request_enrich(slug, slot)
        self.assertEqual(enrich.slot_state(slug, slot), "requested")

        r = enrich.write_draft(slug, slot, [{"text": "[[some-page]]", "verified": "link resolves live"}])
        self.assertTrue(r["ok"], r.get("error"))
        self.assertEqual(enrich.slot_state(slug, slot), "draft")

        before_store = self.theology_list.read_bytes()
        r2 = enrich.cancel(slug, slot)
        self.assertTrue(r2["ok"], r2.get("error"))
        self.assertEqual(enrich.slot_state(slug, slot), "empty")
        self.assertFalse(self._req_path(slug, slot).exists())
        self.assertFalse(self._draft_path(slug, slot).exists())
        # store untouched — cancel() never touches the store.
        self.assertEqual(self.theology_list.read_bytes(), before_store)


# ============================================================================
# AC-1 — two clicks, one request file
# ============================================================================


class TestAC1DoubleClickOneFile(EnrichFixtureTestCase):
    def test_two_requests_same_slug_slot_leave_exactly_one_file(self):
        slug, slot = "plain-node", "References"

        r1 = enrich.request_enrich(slug, slot)
        r2 = enrich.request_enrich(slug, slot)

        self.assertTrue(r1["ok"] and r2["ok"])
        self.assertTrue(r1["created"])
        self.assertFalse(r2["created"])

        matching = list(self.req_dir.glob(f"{slug}.*.yaml"))
        self.assertEqual(len(matching), 1)


# ============================================================================
# AC-2 — list_pending() shape
# ============================================================================


class TestAC2ListPendingShape(EnrichFixtureTestCase):
    def test_list_pending_returns_slug_slot_page_when(self):
        enrich.request_enrich("theology", "References")
        enrich.request_enrich("plain-node", "See Also")

        pending = enrich.list_pending()
        self.assertEqual(len(pending), 2)
        for row in pending:
            self.assertIn("slug", row)
            self.assertIn("slot", row)
            self.assertIn("page", row)
            self.assertIn("requested_at", row)
        slugs = {row["slug"] for row in pending}
        self.assertEqual(slugs, {"theology", "plain-node"})


# ============================================================================
# AC-3 / AC-4 — the verified: stamp check runs TWICE: in write_draft() AND
# again in accept(). A draft with one unstamped item among several stamped
# ones is refused by BOTH.
# ============================================================================


class TestAC3AC4DoubleVerifiedStampCheck(EnrichFixtureTestCase):
    MIXED_CONTENT = [
        {"text": "Good item one", "verified": "checked via WorldCat"},
        {"text": "Bad item", "verified": "   "},  # whitespace-only: fails .strip()
        {"text": "Good item two", "verified": "checked via publisher catalogue"},
    ]

    def test_write_draft_refuses_when_any_item_unstamped(self):
        slug, slot = "theology", "References"
        result = enrich.write_draft(slug, slot, self.MIXED_CONTENT)

        self.assertFalse(result["ok"])
        self.assertIn("verified", result["error"])
        self.assertIsNone(result["path"])
        self.assertFalse(self._draft_path(slug, slot).exists())

    def test_accept_independently_refuses_a_crafted_draft_with_unstamped_item(self):
        """
        write_draft() would never let this draft exist — so to prove
        accept()'s OWN check (FR-8: belt-and-suspenders, not reliance on
        write_draft's check alone) actually runs, we write the draft file
        directly, bypassing write_draft() entirely, then call accept().
        """
        slug, slot = "theology", "References"
        enrich.request_enrich(slug, slot)

        raw = (
            "items:\n"
            '  - text: "Good item one"\n'
            '    verified: "checked via WorldCat"\n'
            '  - text: "Bad item"\n'
            '    verified: "   "\n'
        )
        _write(self._draft_path(slug, slot), raw)

        before_store = self.theology_list.read_bytes()
        result = enrich.accept(slug, slot)

        self.assertFalse(result["ok"])
        self.assertIn("verified", result["error"])
        self.assertEqual(result["writes"], [])
        self.assertEqual(self.theology_list.read_bytes(), before_store)
        # Nothing cleaned up on a refused accept — the draft/request are
        # left exactly as they were (no partial cleanup on a refusal).
        self.assertTrue(self._draft_path(slug, slot).exists())
        self.assertTrue(self._req_path(slug, slot).exists())


# ============================================================================
# AC-6 — slot name outside the fixed three, refused, zero writes
# ============================================================================


class TestAC6InvalidSlotRefused(EnrichFixtureTestCase):
    def test_invalid_slot_refused_zero_writes(self):
        result = enrich.request_enrich("theology", "Random Slot")
        self.assertFalse(result["ok"])
        self.assertFalse(result["created"])
        self.assertEqual(list(self.req_dir.glob("*")) if self.req_dir.is_dir() else [], [])

    def test_invalid_slot_refused_on_every_entry_point(self):
        for fn, args in (
            (enrich.write_draft, ("theology", "Random Slot", [])),
            (enrich.accept, ("theology", "Random Slot")),
            (enrich.cancel, ("theology", "Random Slot")),
        ):
            result = fn(*args)
            self.assertFalse(result["ok"], f"{fn.__name__} should refuse an invalid slot")
        # slot_state() has no {"ok": False, ...} shape to carry a refusal —
        # it returns a bare str — so an invalid slot must raise instead of
        # quietly reporting "empty" (indistinguishable from a genuinely
        # empty slot; this exact silent degradation is what let render.py's
        # slot-id/slot-name mismatch hide the whole generation gate).
        with self.assertRaises(ValueError):
            enrich.slot_state("theology", "Random Slot")


# ============================================================================
# AC-7 — a crafted call naming a sealed page is refused, zero writes
# ============================================================================


class TestAC7SealedPageRefused(EnrichFixtureTestCase):
    def test_sealed_page_refused_on_every_entry_point(self):
        slug = "fully-sealed"
        before_sealed_file = (self.lt / "Mixed" / "sealed_file.md").read_bytes()

        for fn, args in (
            (enrich.request_enrich, (slug, "References")),
            (enrich.write_draft, (slug, "References", [{"text": "x", "verified": "y"}])),
            (enrich.accept, (slug, "References")),
            (enrich.cancel, (slug, "References")),
        ):
            result = fn(*args)
            self.assertFalse(result["ok"], f"{fn.__name__} should refuse a sealed page")

        # Zero writes anywhere: no request/draft files, sealed file untouched.
        self.assertFalse(self.req_dir.is_dir() and any(self.req_dir.glob(f"{slug}.*")))
        self.assertFalse(self.enrich_dir.is_dir() and any(self.enrich_dir.glob(f"{slug}.*.md")))
        self.assertEqual((self.lt / "Mixed" / "sealed_file.md").read_bytes(), before_sealed_file)

    def test_no_unsealed_store_to_accept_into(self):
        # "no-refs" is unsealed (empty refs list is not sealed) but has
        # nothing to accept a draft INTO.
        slug, slot = "no-refs", "References"
        enrich.request_enrich(slug, slot)
        enrich.write_draft(slug, slot, [{"text": "x", "verified": "y"}])

        result = enrich.accept(slug, slot)
        self.assertFalse(result["ok"])
        self.assertIn("no unsealed store file", result["error"])
        self.assertEqual(result["writes"], [])


# ============================================================================
# AC-8 — no agent/LLM invocation anywhere in the module
# ============================================================================


class TestAC8NoAgentOrLLMInvocation(unittest.TestCase):
    SUSPICIOUS_TOKENS = (
        "call_agent", "invoke_agent", "Agent(", "openai", "anthropic",
        "subprocess", "os.system(", "os.popen(", "urllib.request",
        "http.client", "socket.", ".complete(", "chat.completions",
    )

    def test_no_agent_or_llm_invocation(self):
        source = (APP_DIR / "enrich.py").read_text(encoding="utf-8")
        offenders = [tok for tok in self.SUSPICIOUS_TOKENS if tok in source]
        self.assertEqual(offenders, [], f"suspicious tokens found in enrich.py: {offenders}")


# ============================================================================
# FR-11 — wiki-enrich/ and _requests/ are created ONLY on write, and only
# inside this temp fixture — never at the real path.
# ============================================================================


class TestFR11DirectoryCreatedOnWrite(EnrichFixtureTestCase):
    def test_directories_absent_before_first_write(self):
        self.assertFalse(self.enrich_dir.exists())
        self.assertFalse(self.req_dir.exists())

    def test_request_enrich_creates_requests_dir(self):
        self.assertFalse(self.req_dir.exists())
        result = enrich.request_enrich("theology", "References")
        self.assertTrue(result["ok"])
        self.assertTrue(self.req_dir.is_dir())
        self.assertTrue(self.enrich_dir.is_dir())

    def test_write_draft_creates_enrich_dir(self):
        self.assertFalse(self.enrich_dir.exists())
        result = enrich.write_draft(
            "theology", "References", [{"text": "x", "verified": "y"}]
        )
        self.assertTrue(result["ok"], result.get("error"))
        self.assertTrue(self.enrich_dir.is_dir())


# ============================================================================
# FR-12 — list_pending() returns [] (not an error) when _requests/ is absent
# ============================================================================


class TestFR12GracefulEmptyWhenAbsent(EnrichFixtureTestCase):
    def test_list_pending_empty_list_when_folder_absent(self):
        self.assertFalse(self.req_dir.exists())
        result = enrich.list_pending()
        self.assertEqual(result, [])

    def test_read_draft_none_when_absent(self):
        self.assertIsNone(enrich.read_draft("theology", "References"))

    def test_slot_state_empty_when_nothing_created_yet(self):
        self.assertEqual(enrich.slot_state("theology", "References"), "empty")


# ============================================================================
# FR-10 — list_pending()/write_draft() are agent-facing only, never reachable
# from an HTTP route. Cross-check server.py's route table.
# ============================================================================


class TestFR10NotReachableFromHTTPRoute(unittest.TestCase):
    def test_marked_agent_only_by_attribute(self):
        self.assertTrue(getattr(enrich.list_pending, "is_agent_only", False))
        self.assertTrue(getattr(enrich.write_draft, "is_agent_only", False))
        # Browser-facing entry points must NOT carry this marker.
        for fn in (enrich.request_enrich, enrich.accept, enrich.cancel, enrich.slot_state, enrich.read_draft):
            self.assertFalse(getattr(fn, "is_agent_only", False))

    def test_server_route_table_never_calls_them(self):
        server_source = (APP_DIR / "server.py").read_text(encoding="utf-8")
        self.assertNotIn("write_draft", server_source)
        self.assertNotIn("list_pending", server_source)
        # Confirm the routes server.py DOES dispatch to are the three
        # browser-facing ones only.
        self.assertIn("request_enrich", server_source)
        self.assertIn('"accept"', server_source)
        self.assertIn('"cancel"', server_source)


# ============================================================================
# Atomicity — accept() writes to a Long-Term store, the most dangerous write
# in the app. A crash mid-write must leave the store file unchanged or fully
# written, never truncated.
# ============================================================================


class TestAcceptAtomicity(EnrichFixtureTestCase):
    def test_crash_mid_store_write_leaves_store_unchanged(self):
        slug, slot = "theology", "References"
        enrich.request_enrich(slug, slot)
        enrich.write_draft(slug, slot, [{"text": "A reference.", "verified": "checked"}])

        before_store = self.theology_list.read_bytes()

        with patch("enrich.os.replace", side_effect=OSError("simulated disk failure")):
            result = enrich.accept(slug, slot)

        self.assertFalse(result["ok"])
        self.assertEqual(result["writes"], [])
        # Store file untouched — never a half-written .p-gen block.
        self.assertEqual(self.theology_list.read_bytes(), before_store)
        # Request/draft are NOT cleaned up on a failed store write — the
        # slot must stay recoverable as "draft", not silently reset.
        self.assertEqual(enrich.slot_state(slug, slot), "draft")

        # No stray temp files left in the store's own directory.
        leftovers = [p for p in self.theology_list.parent.glob(".*tmp*") if p.is_file()]
        self.assertEqual(leftovers, [])

    def test_cleanup_failure_after_successful_store_write_still_reports_ok(self):
        """
        Per accept()'s documented decision: if the store write lands but
        cleanup (deleting request/draft files) fails, "ok" stays True (the
        dangerous write succeeded) but "error" reports the cleanup failure.
        """
        slug, slot = "theology", "References"
        enrich.request_enrich(slug, slot)
        enrich.write_draft(slug, slot, [{"text": "A reference.", "verified": "checked"}])

        draft_path = self._draft_path(slug, slot)
        real_unlink = Path.unlink

        def flaky_unlink(self_path, *a, **kw):
            if self_path == draft_path:
                raise OSError("simulated cleanup failure")
            return real_unlink(self_path, *a, **kw)

        with patch("pathlib.Path.unlink", flaky_unlink):
            result = enrich.accept(slug, slot)

        self.assertTrue(result["ok"])
        self.assertIsNotNone(result["error"])
        self.assertIn("cleanup failed", result["error"])
        # The store write itself DID land despite the cleanup failure.
        self.assertIn('<!-- p-gen:start slot="References" -->', self.theology_list.read_text(encoding="utf-8"))
        # slot_state still reads "filled" — AD-2's store-check-wins priority
        # means the leftover draft file cannot pull it back to "draft".
        self.assertEqual(enrich.slot_state(slug, slot), "filled")


if __name__ == "__main__":
    unittest.main()

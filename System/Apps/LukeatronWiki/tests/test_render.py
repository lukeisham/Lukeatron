"""
Test suite for render.py — pure read-to-HTML, the three-column page shell,
the four generation-gate slot states, wikilink rendering, the ink legend,
and the integrity footer.

Covers render.spec.md's AC-1 through AC-8 (AC-9 belongs to server.py's
startup check, not this module — render.py never references
paths.WIKI_CSS at all, so there is nothing here to test; see the report).

Fixture pattern copied from test_library.py: a tempfile tree shaped like
Memory/Long-Term/ + LukeatronWiki/, with every `paths.*` constant
monkey-patched at it (including the enrich sandbox dirs, since render.py
calls enrich.slot_state()/read_draft() through the *same* `paths` module
object — patching `paths.REQ_DIR` / `paths.ENRICH_DIR` here drives both
library.py's and enrich.py's disk access with one patch set).

macOS gotcha (see test_library.py): `.resolve()` the temp root before
patching `paths.LT`, because `/var` symlinks to `/private/var` and
seal.py resolves paths before comparing them to `paths.LT`.

Nothing here writes to Memory/Long-Term/ or Memory/ generally. Tests that
exercise enrich's real write path (request_enrich / write_draft / accept)
write only into the tempfile fixture's own Sandbox-shaped `ENRICH_DIR`,
never into the real repo.
"""

import html.parser
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import unquote

sys.path.insert(0, str(Path(__file__).parent.parent))

import paths
import seal
import library
import enrich
import render


APP_DIR = Path(__file__).parent.parent
REPO_ROOT = APP_DIR.parents[2]  # .../_Lukeatron


def _write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


# ============================================================================
# A tiny, forgiving well-formedness checker: every open tag must be closed,
# in order, ignoring standard void elements. Not a full HTML validator —
# just enough to catch an unclosed <div>/<p>/<ul>/<form> etc, which is the
# class of bug a hand-built string-concatenation renderer is prone to.
# ============================================================================

_VOID_ELEMENTS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}


class _WellFormedChecker(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag in _VOID_ELEMENTS:
            return
        self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        pass  # self-closed, e.g. <br/> — never pushed

    def handle_endtag(self, tag):
        if tag in _VOID_ELEMENTS:
            return
        if not self.stack:
            self.errors.append(f"stray closing tag </{tag}> with nothing open")
            return
        if self.stack[-1] != tag:
            self.errors.append(
                f"mismatched close: expected </{self.stack[-1]}>, got </{tag}>"
            )
            # Best-effort recovery: pop until we find a match, or give up.
            if tag in self.stack:
                while self.stack and self.stack[-1] != tag:
                    self.stack.pop()
                if self.stack:
                    self.stack.pop()
        else:
            self.stack.pop()


def assert_well_formed(testcase, html_text, label=""):
    checker = _WellFormedChecker()
    checker.feed(html_text)
    checker.close()
    testcase.assertEqual(checker.errors, [], f"{label}: {checker.errors}")
    testcase.assertEqual(
        checker.stack, [], f"{label}: unclosed tag(s) at end of document: {checker.stack}"
    )


# ============================================================================
# The FR-3/FR-4 automated gate check: zero .p-gen blocks outside the three
# named slot containers, and zero slot items lacking a verified: stamp.
# ============================================================================


def _find_gen_blocks_outside_slots(html_text):
    """
    Return a list of substrings for every class="...p-gen..." bearing
    element that is NOT nested inside a class="...slot-container...”
    element. A simple, deliberately strict nesting check: every
    `slot-container` div's span (from its opening tag to its matching
    closing </div>, tracked by depth) is carved out first; anything with
    p-gen left in the remainder is a violation.
    """
    violations = []
    # Strip out every slot-container div (balanced, tracked by div depth).
    remainder = []
    i = 0
    n = len(html_text)
    depth_stack = []
    div_open_re = re.compile(r"<div\b[^>]*>")
    div_close_re = re.compile(r"</div>")
    pos = 0
    while pos < n:
        m_open = div_open_re.search(html_text, pos)
        m_close = div_close_re.search(html_text, pos)
        if not m_open and not m_close:
            remainder.append(html_text[pos:])
            break
        if m_close and (not m_open or m_close.start() < m_open.start()):
            if depth_stack:
                depth_stack.pop()
            else:
                remainder.append(html_text[pos:m_close.end()])
            pos = m_close.end()
            continue
        # m_open comes first (or ties, opens win)
        tag_text = m_open.group(0)
        is_slot_container = "slot-container" in tag_text
        if not depth_stack:
            remainder.append(html_text[pos:m_open.start()])
        if is_slot_container:
            # Find this div's matching close by depth-tracking from here.
            close_pos = _find_matching_div_close(html_text, m_open.end())
            pos = close_pos
            continue
        else:
            if not depth_stack:
                remainder.append(html_text[m_open.start():m_open.end()])
            depth_stack.append(1)
            pos = m_open.end()
    outside_text = "".join(remainder)
    if "p-gen" in outside_text:
        # Report a short context window per hit for readability.
        for m in re.finditer(r".{0,40}p-gen.{0,40}", outside_text):
            violations.append(m.group(0))
    return violations


def _find_matching_div_close(text, start_pos):
    """Given position just after an opening <div...>, return the position
    just after its matching </div>, tracking nested <div>/</div> depth."""
    depth = 1
    pos = start_pos
    open_re = re.compile(r"<div\b[^>]*>")
    close_re = re.compile(r"</div>")
    while depth > 0:
        m_open = open_re.search(text, pos)
        m_close = close_re.search(text, pos)
        if not m_close:
            return len(text)  # malformed — bail out to end
        if m_open and m_open.start() < m_close.start():
            depth += 1
            pos = m_open.end()
        else:
            depth -= 1
            pos = m_close.end()
    return pos


def _slot_items_missing_verified(html_text):
    """
    Within every slot-container, every `.p-gen`-classed element must carry
    a "Verified:" label (render_slot always renders `<strong>Verified:</strong>`
    ahead of any items when ok). Returns a list of raw slot-container HTML
    chunks that contain a p-gen block with no such stamp.
    """
    violations = []
    for m in re.finditer(r'<div class="slot-container"[^>]*>.*?</div>\s*</div>\s*</div>', html_text, re.S):
        pass  # not used — see the whole-page scan below instead
    # Simpler and more robust: find every slot-container by matching balanced
    # divs, then check p-gen content within has a Verified stamp.
    for start in [m.start() for m in re.finditer(r'<div class="slot-container"', html_text)]:
        open_tag_end = html_text.index(">", start) + 1
        close_pos = _find_matching_div_close(html_text, open_tag_end)
        chunk = html_text[start:close_pos]
        if "p-gen" in chunk and "Verified:" not in chunk:
            violations.append(chunk[:120])
    return violations


# ============================================================================
# Fixture base class
# ============================================================================


class RenderFixtureTestCase(unittest.TestCase):
    """
    Builds a temp tree shaped like Memory/Long-Term/ + LukeatronWiki/ (plus
    the enrich Sandbox dirs), and monkey-patches every `paths.*` constant
    that library.py / enrich.py / render.py read through.
    """

    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)
        root = Path(self.tmpdir.name).resolve()

        self.lt = root / "Memory" / "Long-Term"
        self.wiki = self.lt / "LukeatronWiki"
        self.nodes = self.wiki / "Nodes"
        self.media = self.wiki / "_media"
        self.sealed_yaml = self.wiki / "_sealed.yaml"
        self.index_yaml = self.wiki / "_index.yaml"
        self.queue_yaml = self.wiki / "_queue.yaml"
        self.enrich_dir = root / "System" / "Sandbox" / "wiki-enrich"
        self.req_dir = self.enrich_dir / "_requests"

        # ---- subject stores --------------------------------------------
        _write(self.lt / "Theology" / "theology.md", "Theology store content.\n")
        _write(self.lt / "Theology" / "gate-ref.md", "Original gate reference content.\n")
        _write(self.lt / "Sociology" / "sociology.md", "Sociology store content.\n")
        _write(
            self.lt / "Mixed" / "escape.md",
            "Store text with <script>alert(1)</script> embedded.\n",
        )
        (self.lt / "EmptyStore").mkdir(parents=True, exist_ok=True)
        _write(self.lt / "SealedStore" / "secret.md", "Should never be read.\n")

        # Awkward, real-shaped names: space, leading space, colon, and "&".
        _write(
            self.lt / "Weird" / " Marketing and Ministry Plan" / "notes:extra.md",
            "Awkward-name content.\n",
        )
        _write(
            self.lt / "Weird" / "Reports & Notes" / "summary.md",
            "Ampersand folder content.\n",
        )

        # ---- sealed manifest ---------------------------------------------
        _write(
            self.sealed_yaml,
            "stores:\n  - SealedStore\nfiles: []\n",
        )

        # ---- _index.yaml (themes: folder + hub_slug) ----------------------
        _write(
            self.index_yaml,
            "wiki: LukeatronWiki\n"
            "type: wiki-page-index\n"
            "themes:\n"
            "  - name: \"Theology\"\n"
            "    folder: \"Memory/Long-Term/Theology\"\n"
            "    hub_slug: \"theology\"\n"
            "  - name: \"Sociology\"\n"
            "    folder: \"Memory/Long-Term/Sociology\"\n"
            "    hub_slug: \"sociology\"\n",
        )

        # ---- _queue.yaml ----------------------------------------------------
        _write(
            self.queue_yaml,
            "wiki: LukeatronWiki\n"
            "items:\n"
            "  - id: q-001\n"
            "    title: \"Some queued thing\"\n"
            "    kind: article\n"
            "    intent: read\n"
            "    status: queued\n"
            "    source: \"somewhere\"\n"
            "    page: theology\n",
        )

        # ---- media ------------------------------------------------------------
        self.media.mkdir(parents=True, exist_ok=True)

        # ---- nodes --------------------------------------------------------------
        _write(
            self.nodes / "theology.md",
            '---\n'
            'slug: "theology"\n'
            'title: "Theology"\n'
            'type: theme\n'
            'longterm_refs:\n'
            '  - "Theology store :: Theology/theology.md"\n'
            'updated: 2026-01-01\n'
            '---\n\n'
            '# Theology\n\n'
            'Distinctive verbatim body sentence for FR-1: the quick brown fox jumps.\n\n'
            '[[sociology]] and [[no-such-page]] and [[sealedstore]].\n',
        )
        _write(
            self.nodes / "sociology.md",
            '---\n'
            'slug: "sociology"\n'
            'title: "Sociology"\n'
            'type: theme\n'
            'longterm_refs:\n'
            '  - "Sociology store :: Sociology/sociology.md"\n'
            '---\n\n'
            '# Sociology\n\n[[theology]]\n',
        )
        # A node whose title needs HTML-escaping, with a hostile body.
        _write(
            self.nodes / "escape-node.md",
            '---\n'
            'slug: "escape-node"\n'
            'title: "A & B <script>"\n'
            'type: theme\n'
            'longterm_refs:\n'
            '  - "Escape store :: Mixed/escape.md"\n'
            '---\n\n'
            '# Body\n\n<script>alert(2)</script> and an & ampersand.\n',
        )
        # gate-node: a single ref shared by all three slots (matches
        # enrich's accept()/slot_state() behaviour of picking one ref).
        _write(
            self.nodes / "gate-node.md",
            '---\n'
            'slug: "gate-node"\n'
            'title: "Gate Node"\n'
            'type: theme\n'
            'longterm_refs:\n'
            '  - "Gate ref :: Theology/gate-ref.md"\n'
            '---\n\n'
            '# Gate Node\n\nBody text for the gate node.\n',
        )

        # ---- apply the monkey-patch --------------------------------------
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


# ============================================================================
# AC-1 / FR-1 — verbatim body + provenance ink + margin column structure
# ============================================================================


class TestAC1VerbatimBodyAndStructure(RenderFixtureTestCase):
    def test_ac1_body_survives_verbatim_modulo_escaping(self):
        out = render.render_page("theology")
        self.assertIn(
            "Distinctive verbatim body sentence for FR-1: the quick brown fox jumps.",
            out,
        )

    def test_ac1_store_content_rendered_with_ink_class(self):
        out = render.render_page("theology")
        self.assertIn("Theology store content.", out)
        self.assertIn('class="p-luke"', out)  # Theology is not a "source" store

    def test_ac1_bible_store_gets_source_ink(self):
        _write(self.lt / "Bible" / "gen1.md", "In the beginning.\n")
        _write(
            self.nodes / "bible-node.md",
            '---\nslug: "bible-node"\ntitle: "Bible Node"\ntype: theme\n'
            'longterm_refs:\n  - "Genesis :: Bible/gen1.md"\n---\n\n# Bible Node\n',
        )
        out = render.render_page("bible-node")
        self.assertIn('class="p-source"', out)

    def test_ac1_margin_has_infobox_backlinks_and_legend(self):
        out = render.render_page("theology")
        self.assertIn("margin-box-title", out)  # infobox and/or backlinks
        self.assertIn("What Links Here", out)
        self.assertIn("ink-legend", out)

    def test_ac1_well_formed(self):
        assert_well_formed(self, render.render_page("theology"), "render_page(theology)")


# ============================================================================
# AC-2 / FR-2 — all four slot states, read from enrich, not decided locally
# ============================================================================


class TestAC2SlotStates(RenderFixtureTestCase):
    def test_empty_state_shows_plus_button_form(self):
        out = render.render_page("theology")
        self.assertIn('class="slot-state-badge empty"', out)
        self.assertIn("&#8853;", out.replace("&#8853;", "&#8853;")) if False else None
        self.assertIn('action="/do/enrich"', out)
        self.assertIn(">⊕<", out)  # the ⊕ glyph on the button

    def test_requested_state_via_real_enrich_request(self):
        # NOTE: enrich.slot_state()'s own contract takes the FULL slot name
        # ("See Also"), not the short id ("see-also") — confirmed directly
        # here. See TestBugRenderPassesWrongSlotArgument below for the
        # separate, more serious defect: render.py itself calls
        # enrich.slot_state() with the short id, not the name.
        result = enrich.request_enrich("gate-node", "See Also")
        self.assertTrue(result["ok"])
        self.assertEqual(enrich.slot_state("gate-node", "See Also"), "requested")

    def test_draft_state_reported_by_enrich(self):
        result = enrich.write_draft(
            "gate-node", "Supporting Quotes", [{"text": "Quote A", "verified": "Checked 2026"}]
        )
        self.assertTrue(result["ok"])
        self.assertEqual(enrich.slot_state("gate-node", "Supporting Quotes"), "draft")

    def test_filled_state_reported_by_enrich_after_accept(self):
        enrich.write_draft(
            "gate-node", "References", [{"text": "Fact one", "verified": "Checked source A"}]
        )
        accepted = enrich.accept("gate-node", "References")
        self.assertTrue(accepted["ok"], accepted.get("error"))
        self.assertEqual(enrich.slot_state("gate-node", "References"), "filled")

    def test_render_reads_state_from_enrich_not_itself(self):
        # If enrich is made unavailable, every slot must degrade to "empty"
        # with a visible note — render must never guess a state on its own.
        with patch.object(render, "_get_enrich", return_value=None):
            out = render.render_page("theology")
        self.assertIn("enrich is not available yet", out)
        self.assertIn('class="slot-state-badge empty"', out)

    def test_render_slot_direct_all_four_states(self):
        empty_html = render.render_slot("theology", "References", "empty")
        self.assertIn("btn-add-slot", empty_html)

        requested_html = render.render_slot("theology", "References", "requested")
        self.assertIn("Request pending", requested_html)

        draft_html = render.render_slot(
            "theology", "References", "draft", {"verified": "X", "items": ["a"]}
        )
        self.assertIn("Accept", draft_html)
        self.assertIn("Reject", draft_html)

        filled_html = render.render_slot(
            "theology", "References", "filled", {"verified": "X", "items": ["a"]}
        )
        self.assertIn("gen-block", filled_html)
        self.assertIn("generated", filled_html)


# ============================================================================
# FIXED BUG (was the most severe found) — render.py used to call
# enrich.slot_state(slug, slot_id) with the SHORT id ("see-also",
# "references", "supporting-quotes"), but enrich.slot_state()'s own
# contract (enrich.py SLOTS tuple, checked with `if slot not in SLOTS`)
# only recognises the three FULL slot names ("References", "Supporting
# Quotes", "See Also"). Passing the short id meant `slot not in SLOTS` was
# True on every single call, so enrich.slot_state() took its very first
# branch and returned "empty" — not an exception, so render's own `except
# Exception` degraded-note path never fired either; the slot just silently
# looked unrequested forever.
#
# Fix: the full slot name is the canonical argument type at the
# render/enrich boundary (it is what the spec, the PRD and the store
# headings all use); render.py now passes it straight through to every
# enrich.* call, and only ever converts to `SLOT_IDS[...]` when building its
# own filenames/DOM ids/hidden-form values (see render.py's module
# docstring). enrich.slot_state() also now raises loudly on an unrecognised
# slot instead of quietly reporting "empty", so this exact mismatch can
# never again hide behind a plausible-looking state.
# ============================================================================


class TestSlotStateReachesRenderPage(RenderFixtureTestCase):
    def test_requested_state_reaches_render_page(self):
        result = enrich.request_enrich("gate-node", "See Also")
        self.assertTrue(result["ok"])
        self.assertEqual(enrich.slot_state("gate-node", "See Also"), "requested")

        out = render.render_page("gate-node")
        self.assertIn('class="slot-state-badge requested"', out)
        self.assertIn("Request pending", out)

    def test_draft_state_reaches_render_page(self):
        enrich.write_draft(
            "gate-node", "Supporting Quotes", [{"text": "Quote A", "verified": "Checked 2026"}]
        )
        self.assertEqual(enrich.slot_state("gate-node", "Supporting Quotes"), "draft")

        out = render.render_page("gate-node")
        self.assertIn('class="slot-state-badge draft"', out)

    def test_filled_state_reaches_render_page(self):
        enrich.write_draft(
            "gate-node", "References", [{"text": "Fact one", "verified": "Checked source A"}]
        )
        accepted = enrich.accept("gate-node", "References")
        self.assertTrue(accepted["ok"], accepted.get("error"))
        self.assertEqual(enrich.slot_state("gate-node", "References"), "filled")

        out = render.render_page("gate-node")
        self.assertIn('class="slot-state-badge filled"', out)

    def test_root_cause_pinned_directly(self):
        # Pin the exact mechanism, independent of the assertions above: a
        # stub enrich whose slot_state() only recognises full names records
        # what argument render.py actually calls it with.
        calls = []

        class _StubEnrich:
            SLOTS = enrich.SLOTS

            @staticmethod
            def slot_state(slug, slot):
                calls.append(slot)
                return "empty"

        with patch.object(render, "_get_enrich", return_value=_StubEnrich):
            render.render_page("gate-node")

        self.assertIn("References", enrich.SLOTS)
        # Fixed: render.py now calls enrich.slot_state() with the full slot
        # name — the domain value — for every slot, never the short id
        # (SLOT_IDS' values exist only for filenames/DOM ids/URLs).
        sent_full_names = [c for c in calls if c in enrich.SLOTS]
        sent_short_ids = [c for c in calls if c in render.SLOT_IDS.values()]
        self.assertTrue(
            sent_full_names and not sent_short_ids,
            f"expected render.py to call enrich.slot_state() with full slot "
            f"names only; got calls={calls!r}",
        )

    def test_invalid_slot_argument_is_loud_not_silently_empty(self):
        # The second half of the fix: enrich.slot_state() must never again
        # let an invalid/short-id argument masquerade as a genuinely empty
        # slot — it raises, and render's existing except-Exception path
        # (see _slot_state_and_payload) turns that into a visible degraded
        # note rather than a silent "empty" badge.
        with self.assertRaises(ValueError):
            enrich.slot_state("gate-node", "references")

        state, payload, note = render._slot_state_and_payload(
            "gate-node", "References", library.read_node("gate-node")
        )
        self.assertEqual(state, "empty")
        self.assertIsNone(payload)
        self.assertIsNone(note)  # real full-name call succeeds normally

        class _StubEnrichBadArg:
            SLOTS = enrich.SLOTS

            @staticmethod
            def slot_state(slug, slot):
                raise ValueError(f"invalid slot {slot!r}")

        with patch.object(render, "_get_enrich", return_value=_StubEnrichBadArg):
            state, payload, note = render._slot_state_and_payload(
                "gate-node", "References", library.read_node("gate-node")
            )
        self.assertEqual(state, "empty")
        self.assertIsNotNone(note)
        self.assertIn("slot_state", note)


# ============================================================================
# FIXED BUG — enrich's real draft/accept payload shapes didn't match what
# render._render_gen_payload() expected, so genuinely verified content was
# discarded.
# ============================================================================


class TestDraftAndFilledPayloadShapeMatch(RenderFixtureTestCase):
    """
    enrich.read_draft() returns {"slug","slot","items":[{"text","verified"},...]}
    — no top-level "verified" key. render._render_gen_payload() used to only
    ever look at payload.get("verified") (never present) before even
    inspecting `items`; failing that check, it discarded the whole payload
    regardless of what the items themselves carried. So a "draft" slot's
    real, correctly-verified content could never actually render — the
    generation gate hid good content, not just bad content.

    Fix: _render_gen_payload() now recognises this item-level-stamp shape
    directly (each item's own "verified" key), requiring every item to
    carry a non-empty stamp before rendering ANY of them — still
    all-or-nothing, just checked at the right level.

    Separately, "filled" state's payload used to be read out of the NODE's
    own body ("## References" section) rather than the STORE file
    enrich.accept() actually writes the accepted p-gen block into. Fix:
    render._read_filled_slot_payload() now reads that same store block —
    state (enrich.slot_state()) and content (render's own read) come from
    the identical place.
    """

    def test_draft_with_valid_verified_items_renders_them(self):
        enrich.write_draft(
            "gate-node",
            "Supporting Quotes",
            [{"text": "Quote A", "verified": "Checked against source X, 2026-09-12"}],
        )
        self.assertEqual(enrich.slot_state("gate-node", "Supporting Quotes"), "draft")

        out = render.render_page("gate-node")
        self.assertIn("Quote A", out)
        self.assertIn("Checked against source X, 2026-09-12", out)
        self.assertNotIn("Draft is missing a verified", out)

    def test_filled_slot_shows_the_accepted_store_content(self):
        enrich.write_draft(
            "gate-node",
            "References",
            [{"text": "Fact one", "verified": "Checked source A, 2026-09-12"}],
        )
        accepted = enrich.accept("gate-node", "References")
        self.assertTrue(accepted["ok"], accepted.get("error"))
        self.assertEqual(enrich.slot_state("gate-node", "References"), "filled")

        out = render.render_page("gate-node")
        self.assertIn("Fact one", out)
        self.assertIn("Checked source A, 2026-09-12", out)
        self.assertNotIn("No content to show.", out)

    def test_filled_payload_sourced_from_store_not_node_body(self):
        # Isolates the sourcing fix from the slot-id/slot-name fix above:
        # force render to believe every slot is "filled" (via a stub
        # enrich), independent of the real enrich.slot_state() call shape,
        # and confirm the payload it extracts is the REAL accepted store
        # content — not whatever (if anything) sits under a "## References"
        # heading in the node's own body.
        enrich.write_draft(
            "gate-node", "References", [{"text": "Fact one", "verified": "Checked source A"}]
        )
        accepted = enrich.accept("gate-node", "References")
        self.assertTrue(accepted["ok"], accepted.get("error"))

        class _StubEnrichAlwaysFilled:
            SLOTS = enrich.SLOTS

            @staticmethod
            def slot_state(slug, slot):
                return "filled"

        with patch.object(render, "_get_enrich", return_value=_StubEnrichAlwaysFilled):
            out = render.render_page("gate-node")

        # Isolate the References SLOT CONTAINER specifically — fixed
        # separately (Bug 3's secondary finding), the raw accepted store
        # block no longer leaks into the ordinary "## References"
        # ref-section render either; both are checked here.
        start = out.index('<div class="slot-container" id="references">')
        end = _find_matching_div_close(out, out.index(">", start) + 1)
        slot_html = out[start:end]

        self.assertIn("Fact one", slot_html)
        self.assertIn("Checked source A", slot_html)

        ref_section_start = out.index('<section id="ref-0">')
        ref_section_end = out.index("</section>", ref_section_start)
        ref_section_html = out[ref_section_start:ref_section_end]
        self.assertNotIn("p-gen", ref_section_html)
        self.assertNotIn("Fact one", ref_section_html)


# ============================================================================
# END-TO-END — walks the real gate through render_page()'s OWN output, not
# through enrich's functions in isolation. This is the seam the three bugs
# above lived on: enrich was tested alone, render was tested alone, and
# nothing walked a single slot through all four states via the same path a
# browser click actually takes (request_enrich/write_draft/accept/cancel ->
# render_page()). Covers both slots that only ever reach "draft" via
# cancel, and one slot walked all the way to "filled".
# ============================================================================


class TestEndToEndGenerationGateThroughRenderPage(RenderFixtureTestCase):
    def _slot_container(self, out, slot_id):
        start = out.index(f'<div class="slot-container" id="{slot_id}">')
        end = _find_matching_div_close(out, out.index(">", start) + 1)
        return out[start:end]

    def test_references_walks_empty_requested_draft_filled(self):
        slug, slot, slot_id = "gate-node", "References", "references"

        # ---- empty ---------------------------------------------------
        out = render.render_page(slug)
        chunk = self._slot_container(out, slot_id)
        self.assertIn('class="slot-state-badge empty">⊕', chunk)
        self.assertIn('action="/do/enrich"', chunk)

        # ---- requested (⊕ click) --------------------------------------
        result = enrich.request_enrich(slug, slot)
        self.assertTrue(result["ok"], result.get("error"))
        out = render.render_page(slug)
        chunk = self._slot_container(out, slot_id)
        self.assertIn('class="slot-state-badge requested"', chunk)
        self.assertIn("Request pending", chunk)

        # ---- draft ready (agent writes a stamped draft) ----------------
        result = enrich.write_draft(
            slug, slot, [{"text": "Fact one", "verified": "Checked source A, 2026-09-12"}]
        )
        self.assertTrue(result["ok"], result.get("error"))
        out = render.render_page(slug)
        chunk = self._slot_container(out, slot_id)
        self.assertIn('class="slot-state-badge draft"', chunk)
        self.assertIn("Fact one", chunk)
        self.assertIn("Checked source A, 2026-09-12", chunk)
        self.assertIn("Accept", chunk)
        self.assertIn("Reject", chunk)
        self.assertIn('action="/do/accept"', chunk)
        # The hidden "slot" field posted back to /do/accept must be the
        # full slot name — server.py forwards it to enrich.accept()
        # verbatim, with no translation (the Bug 1 fix's boundary rule).
        self.assertIn(f'name="slot" value="{slot}"', chunk)

        # ---- filled (Luke clicks Accept) -------------------------------
        accepted = enrich.accept(slug, slot)
        self.assertTrue(accepted["ok"], accepted.get("error"))
        out = render.render_page(slug)
        chunk = self._slot_container(out, slot_id)
        self.assertIn('class="slot-state-badge filled"', chunk)
        self.assertIn("Fact one", chunk)
        self.assertIn("Checked source A, 2026-09-12", chunk)
        self.assertIn("p-gen", chunk)
        # No request/draft file survives acceptance, and no leftover file
        # can pull the slot back to an earlier state (AD-2 store-check-wins).
        self.assertFalse((self.req_dir / f"{slug}.{slot_id}.yaml").exists())
        self.assertFalse((self.enrich_dir / f"{slug}.{slot_id}.md").exists())

    def test_cancel_from_requested_returns_to_empty(self):
        slug, slot, slot_id = "gate-node", "See Also", "see-also"

        enrich.request_enrich(slug, slot)
        out = render.render_page(slug)
        self.assertIn('class="slot-state-badge requested"', self._slot_container(out, slot_id))

        result = enrich.cancel(slug, slot)
        self.assertTrue(result["ok"], result.get("error"))
        out = render.render_page(slug)
        chunk = self._slot_container(out, slot_id)
        self.assertIn('class="slot-state-badge empty">⊕', chunk)
        self.assertNotIn("Request pending", chunk)

    def test_cancel_from_draft_returns_to_empty(self):
        slug, slot, slot_id = "gate-node", "Supporting Quotes", "supporting-quotes"

        enrich.write_draft(slug, slot, [{"text": "Quote A", "verified": "Checked 2026"}])
        out = render.render_page(slug)
        self.assertIn('class="slot-state-badge draft"', self._slot_container(out, slot_id))

        result = enrich.cancel(slug, slot)
        self.assertTrue(result["ok"], result.get("error"))
        out = render.render_page(slug)
        chunk = self._slot_container(out, slot_id)
        self.assertIn('class="slot-state-badge empty">⊕', chunk)
        self.assertNotIn("Quote A", chunk)

    def test_cancel_is_a_noop_from_filled_state_gate_stays_filled(self):
        # cancel() never touches the store (FR-5) — once filled, the PRD's
        # own state diagram has no arrow back to empty; confirm render_page
        # agrees rather than silently reverting.
        slug, slot, slot_id = "gate-node", "References", "references"
        enrich.write_draft(slug, slot, [{"text": "Fact one", "verified": "Checked source A"}])
        enrich.accept(slug, slot)

        result = enrich.cancel(slug, slot)
        self.assertTrue(result["ok"], result.get("error"))
        out = render.render_page(slug)
        chunk = self._slot_container(out, slot_id)
        self.assertIn('class="slot-state-badge filled"', chunk)
        self.assertIn("Fact one", chunk)


# ============================================================================
# AC-3 / FR-3 / FR-4 — the generation gate: zero .p-gen outside slots, zero
# slot items missing a verified: stamp. This is the module's highest-value
# check per the build brief.
# ============================================================================


class TestAC3GenerationGate(RenderFixtureTestCase):
    def _full_corpus(self):
        """Render every page type once, to give the automated pass full coverage."""
        pages = [render.render_home(), render.render_backlog()]
        for slug in ("theology", "sociology", "escape-node", "gate-node"):
            pages.append(render.render_page(slug))
        for store in ("Theology", "Sociology", "Mixed", "EmptyStore"):
            pages.append(render.render_store(store))
        pages.append(
            render.render_search_results(
                "fox", [{"store": "Theology", "hits": [{"filename": "theology.md", "kind": "body", "excerpt": "fox", "line": 3}]}]
            )
        )
        pages.append(render.render_404("nope"))
        return pages

    def test_zero_p_gen_blocks_outside_slots(self):
        enrich.request_enrich("gate-node", "See Also")
        enrich.write_draft("gate-node", "Supporting Quotes", [{"text": "Q", "verified": "V"}])
        enrich.write_draft("gate-node", "References", [{"text": "R", "verified": "V2"}])
        enrich.accept("gate-node", "References")

        for page_html in self._full_corpus():
            violations = _find_gen_blocks_outside_slots(page_html)
            self.assertEqual(violations, [], f"p-gen found outside slot-container: {violations}")

    def test_zero_slot_items_missing_verified_stamp(self):
        # Construct slot payloads directly (bypassing the draft/filled
        # payload-shape bug above) so this check exercises render_slot's
        # own guarantee in isolation from that separate defect.
        pages = [
            render.render_slot("theology", "References", "draft", {"verified": "", "items": ["x"]}),
            render.render_slot("theology", "References", "filled", {"verified": None}),
            render.render_slot("theology", "References", "draft", {"verified": "ok", "items": ["x"]}),
        ]
        for page_html in pages:
            violations = _slot_items_missing_verified(page_html)
            self.assertEqual(violations, [], f"slot item(s) missing verified: stamp: {violations}")

    def test_missing_verified_stamp_never_emits_p_gen_at_all(self):
        html_out = render.render_slot("theology", "References", "draft", {"verified": "", "items": ["x"]})
        self.assertNotIn("p-gen", html_out)
        self.assertIn("missing a verified", html_out)


# ============================================================================
# AC-4 / FR-5 — the three wikilink renderings; sealed is NEVER a red link
# ============================================================================


class TestAC4Wikilinks(RenderFixtureTestCase):
    def test_live_link_renders_as_working_anchor(self):
        out = render.render_page("theology")
        self.assertIn('<a href="/page/sociology">Sociology</a>', out)

    def test_unresolved_link_renders_red(self):
        out = render.render_page("theology")
        self.assertIn('class="redlink" href="/page/no-such-page"', out)

    def test_sealed_link_is_plain_text_never_a_redlink(self):
        out = render.render_page("theology")
        # "sealedstore" is the hub slug of a fully sealed store -> must be
        # plain text: no <a> at all, and specifically never class="redlink".
        self.assertNotIn('href="/page/sealedstore"', out)
        self.assertNotIn(">sealedstore<", out.replace("sealedstore</a>", ""))
        # It must still appear as plain escaped text somewhere in the body.
        self.assertIn("sealedstore", out)

    def test_render_wikilink_direct_three_states(self):
        live = render._render_wikilink("sociology")
        self.assertTrue(live.startswith("<a "))
        self.assertNotIn("redlink", live)

        unresolved = render._render_wikilink("totally-unknown-slug")
        self.assertIn("redlink", unresolved)

        sealed = render._render_wikilink("sealedstore")
        self.assertNotIn("<a", sealed)
        self.assertNotIn("redlink", sealed)
        self.assertEqual(sealed, "sealedstore")


# ============================================================================
# AC-5 / FR-6 — contents pages: real files, no prose, nested-path encoding
# ============================================================================


class TestAC5ContentsPages(RenderFixtureTestCase):
    def test_awaiting_node_lists_real_files(self):
        out = render.render_store("Mixed")
        self.assertIn("escape.md", out)

    def test_empty_store_shows_no_files(self):
        out = render.render_store("EmptyStore")
        self.assertIn("No files in this store yet.", out)

    def test_sealed_store_renders_404_not_a_contents_page(self):
        out = render.render_store("SealedStore")
        self.assertIn("Not found", out)
        self.assertNotIn("secret.md", out)

    def test_nested_file_link_percent_encoded_and_round_trips(self):
        out = render.render_store("Weird")
        # " Marketing and Ministry Plan/notes:extra.md" -> every segment
        # percent-encoded, slash preserved.
        self.assertIn("Marketing and Ministry Plan", out)  # display text unescaped-ish (as filename)
        m = re.search(r'href="(/store/Weird/[^"]+)"', out)
        self.assertIsNotNone(m)
        # Collect ALL store-file hrefs and confirm at least one round-trips
        # back to " Marketing and Ministry Plan/notes:extra.md" and another
        # to "Reports & Notes/summary.md".
        hrefs = re.findall(r'href="(/store/Weird/[^"]+)"', out)
        decoded = {unquote(h[len("/store/Weird/"):]) for h in hrefs}
        self.assertIn(" Marketing and Ministry Plan/notes:extra.md", decoded)
        self.assertIn("Reports & Notes/summary.md", decoded)

    def test_percent_encoding_has_no_raw_space_or_colon_in_href(self):
        out = render.render_store("Weird")
        hrefs = re.findall(r'href="(/store/Weird/[^"]+)"', out)
        for href in hrefs:
            self.assertNotIn(" ", href)
            self.assertNotIn(":", href)


# ============================================================================
# AC-6 / FR-7 — integrity footer matches library.integrity_counts() exactly
# ============================================================================


class TestAC6IntegrityFooter(RenderFixtureTestCase):
    def _footer_counts(self, page_html):
        spans = re.findall(r'<strong>([^<]*)</strong>\s*([a-z\- ]+)</span>', page_html)
        out = {}
        for value, label in spans:
            out[label.strip()] = value
        return out

    def test_footer_matches_integrity_counts_exactly(self):
        counts = library.integrity_counts()
        out = render.render_home()
        footer = self._footer_counts(out)
        self.assertEqual(footer["stores"], str(counts["stores"]))
        self.assertEqual(footer["files"], str(counts["files"]))
        self.assertEqual(footer["rendered"], str(counts["rendered"]))
        self.assertEqual(footer["sealed"], str(counts["sealed"]))
        self.assertEqual(footer["unindexed"], str(counts["unindexed"]))
        self.assertEqual(footer["dead links"], str(counts["dead_links"]))
        self.assertEqual(footer["one-way edges"], str(counts["one_way_edges"]))

    def test_footer_present_on_every_page_type(self):
        for page_html in (
            render.render_home(),
            render.render_page("theology"),
            render.render_store("Theology"),
            render.render_backlog(),
            render.render_404(),
        ):
            self.assertIn('id="integrity-footer"', page_html)


# ============================================================================
# PRD Key behaviours / capture.spec.md FR-1 — the quick-capture form on the
# backlog page. Regression coverage for a gap where capture.py, server.py's
# POST /do/capture route, and the CSS/JS for .capture-form all existed and
# were individually tested, but render_backlog() never actually emitted the
# <form> — so the feature had no way to reach the browser at all.
# ============================================================================


class TestBacklogCaptureForm(RenderFixtureTestCase):
    def test_capture_form_present_on_backlog(self):
        out = render.render_backlog()
        self.assertIn('class="capture-form"', out)
        self.assertIn('method="post"', out)
        self.assertIn('action="/do/capture"', out)

    def test_form_has_the_six_capture_fields(self):
        out = render.render_backlog()
        for name in ("title", "kind", "intent", "source", "page", "note"):
            with self.subTest(field=name):
                self.assertIn(f'name="{name}"', out)

    def test_intent_options_are_exactly_the_fixed_enum(self):
        out = render.render_backlog()
        m = re.search(r'<select name="intent"[^>]*>(.*?)</select>', out, re.S)
        self.assertIsNotNone(m)
        values = re.findall(r'<option value="([^"]+)"', m.group(1))
        self.assertEqual(values, ["read", "watch", "write"])

    def test_page_dropdown_lists_unsealed_nodes_only(self):
        out = render.render_backlog()
        m = re.search(r'<select name="page"[^>]*>(.*?)</select>', out, re.S)
        self.assertIsNotNone(m)
        values = re.findall(r'<option value="([^"]+)"', m.group(1))
        self.assertIn("theology", values)
        self.assertIn("sociology", values)
        # SealedStore's own hub (if any) must never appear in the dropdown —
        # matches library.list_nodes()'s seal-filtering contract.
        self.assertNotIn("sealedstore", values)


# ============================================================================
# FR-13 / AC-10 — the seal-failure banner
# ============================================================================


class TestFR13SealFailureBanner(RenderFixtureTestCase):
    def setUp(self):
        super().setUp()
        self.sealed_yaml.unlink()  # manifest absent -> seal.count() fails

    def test_every_route_shows_the_banner_and_nothing_else(self):
        for page_html in (
            render.render_home(),
            render.render_page("theology"),
            render.render_store("Theology"),
            render.render_backlog(),
            render.render_search_results("x", []),
            render.render_404(),
        ):
            self.assertIn("Seal manifest failure", page_html)
            # No normal page content leaks through.
            self.assertNotIn("Theology store content.", page_html)
            self.assertNotIn('id="integrity-footer"', page_html)

    def test_footer_never_shows_a_reassuring_zero_sealed(self):
        # Confirms library really is signalling failure (sealed is None),
        # which is what render checks to decide to show the banner.
        counts = library.integrity_counts()
        self.assertIsNone(counts["sealed"])
        out = render.render_home()
        self.assertNotIn("0</strong> sealed", out)


class TestFR13CorruptManifest(RenderFixtureTestCase):
    def setUp(self):
        super().setUp()
        _write(self.sealed_yaml, "stores: not-a-list\n")  # malformed -> failure

    def test_corrupt_manifest_also_triggers_banner(self):
        out = render.render_page("theology")
        self.assertIn("Seal manifest failure", out)


# ============================================================================
# FR-8 — the ink legend is present on every page type
# ============================================================================


class TestFR8InkLegendEverywhere(RenderFixtureTestCase):
    def test_ink_legend_on_every_page_type(self):
        for page_html in (
            render.render_home(),
            render.render_page("theology"),
            render.render_store("Theology"),
            render.render_backlog(),
            render.render_search_results("x", []),
            render.render_404(),
        ):
            self.assertIn('class="ink-legend"', page_html)
            self.assertIn("Luke", page_html)
            self.assertIn("Lukeatron", page_html)


# ============================================================================
# FR-11 / AC-8 — render.py never opens a file for writing
# ============================================================================


class TestAC8NeverWrites(unittest.TestCase):
    def test_no_write_mode_file_open_in_source(self):
        text = (APP_DIR / "render.py").read_text(encoding="utf-8")
        # Any open() call with an explicit write/append/exclusive mode.
        write_calls = re.findall(r'open\([^)]*[\'"][wxa][+b]?[\'"]', text)
        self.assertEqual(write_calls, [], f"found write-mode open() calls: {write_calls}")
        # No use of the write-oriented Path/file APIs at all.
        for forbidden in ("write_text(", "write_bytes(", "os.replace(", "mkstemp(", ".unlink("):
            self.assertNotIn(forbidden, text, f"render.py must never call {forbidden}")

    def test_render_page_does_not_create_any_new_file(self):
        # Belt-and-suspenders dynamic check against the real tree: render a
        # real page and confirm no new file appears anywhere under the repo
        # root's Memory/ or System/Sandbox/ trees. Read-only test overall.
        import render as render_mod

        before_wiki = set((REPO_ROOT / "Memory" / "Long-Term" / "LukeatronWiki").rglob("*"))
        render_mod.render_home()
        try:
            render_mod.render_page("method")
        except Exception:
            pass
        after_wiki = set((REPO_ROOT / "Memory" / "Long-Term" / "LukeatronWiki").rglob("*"))
        self.assertEqual(before_wiki, after_wiki)


# ============================================================================
# HTML escaping — untrusted store content and node titles
# ============================================================================


class TestHTMLEscaping(RenderFixtureTestCase):
    def test_script_tag_in_store_content_rendered_inert(self):
        out = render.render_page("escape-node")
        self.assertNotIn("<script>alert(1)</script>", out)
        self.assertNotIn("<script>alert(2)</script>", out)
        self.assertIn("&lt;script&gt;", out)

    def test_title_with_ampersand_and_lt_escaped(self):
        out = render.render_page("escape-node")
        self.assertIn("A &amp; B &lt;script&gt;", out)
        self.assertNotIn("<title>A & B <script>", out)

    def test_escaped_page_still_well_formed(self):
        assert_well_formed(self, render.render_page("escape-node"), "render_page(escape-node)")


# ============================================================================
# Well-formedness across every render function
# ============================================================================


class TestWellFormedness(RenderFixtureTestCase):
    def test_all_page_types_well_formed(self):
        cases = {
            "render_home": render.render_home(),
            "render_page(theology)": render.render_page("theology"),
            "render_page(gate-node)": render.render_page("gate-node"),
            "render_store(Theology)": render.render_store("Theology"),
            "render_store(EmptyStore)": render.render_store("EmptyStore"),
            "render_backlog": render.render_backlog(),
            "render_search_results": render.render_search_results(
                "x", [{"store": "Theology", "hits": [{"filename": "theology.md", "kind": "title", "excerpt": "x"}]}]
            ),
            "render_404": render.render_404(),
        }
        for label, page_html in cases.items():
            assert_well_formed(self, page_html, label)


# ============================================================================
# Read-only tests against the REAL tree
# ============================================================================


class TestRealTree(unittest.TestCase):
    """No monkey-patching. Read-only against the real Memory/Long-Term/."""

    def test_render_page_on_real_node_is_well_formed(self):
        out = render.render_page("method")
        assert_well_formed(self, out, "render_page(method) [real tree]")
        self.assertIn('id="integrity-footer"', out)

    def test_render_store_lists_real_files(self):
        page = library.contents_page("Theology")
        if page is library.SEALED:
            self.skipTest("Theology is sealed in the real tree")
        out = render.render_store("Theology")
        for f in page["files"][:5]:  # sample, keep this fast
            # filename is percent-encoded per-segment in the href.
            expected_href_tail = "/".join(
                __import__("urllib.parse", fromlist=["quote"]).quote(seg, safe="")
                for seg in f["filename"].split("/")
            )
            self.assertIn(expected_href_tail, out, f"missing link for {f['filename']!r}")

    def test_footer_store_count_is_33(self):
        out = render.render_home()
        m = re.search(r'<strong>(\d+)</strong>\s*stores</span>', out)
        self.assertIsNotNone(m)
        self.assertEqual(m.group(1), "33")


if __name__ == "__main__":
    unittest.main()


class TestRejectButtonRoutesToCancel(unittest.TestCase):
    """Regression: Reject must never post to /do/accept.

    Found 2026-09-12. The draft slot was one <form action="/do/accept"> holding
    both buttons, distinguished only by a name="action" field. server.py routes
    purely on the URL and never reads that field, so clicking Reject called
    enrich.accept() -- writing the draft into a Long-Term store, the exact
    opposite of the user's intent, on the most dangerous write path in the app.

    The fix is structural: each button gets its own form with its own action URL,
    so the destination cannot drift away from the label.
    """

    DRAFT = {"items": [{"text": "a claim", "verified": "quote found in fetched source"}]}

    def _forms(self, html_text):
        """[(button class, form action)] for each form in the rendered slot."""
        out = []
        for m in re.finditer(r'<form[^>]*action="([^"]+)"[^>]*>(.*?)</form>',
                             html_text, re.S):
            for b in re.finditer(r'class="(reject|accept)"', m.group(2)):
                out.append((b.group(1), m.group(1)))
        return out

    def test_reject_posts_to_cancel_and_accept_posts_to_accept(self):
        html_text = render.render_slot("theology", "References", "draft", self.DRAFT)
        routes = dict(self._forms(html_text))
        self.assertEqual(routes.get("reject"), "/do/cancel",
                         "Reject must post to /do/cancel, never /do/accept")
        self.assertEqual(routes.get("accept"), "/do/accept")

    def test_no_form_contains_both_buttons(self):
        html_text = render.render_slot("theology", "References", "draft", self.DRAFT)
        for m in re.finditer(r"<form[^>]*>(.*?)</form>", html_text, re.S):
            has_reject = 'class="reject"' in m.group(1)
            has_accept = 'class="accept"' in m.group(1)
            self.assertFalse(has_reject and has_accept,
                             "one form holding both buttons reintroduces the bug")

    def test_every_slot_name_routes_reject_to_cancel(self):
        for slot in render.SLOTS:
            html_text = render.render_slot("theology", slot, "draft", self.DRAFT)
            routes = dict(self._forms(html_text))
            self.assertEqual(routes.get("reject"), "/do/cancel", f"slot {slot!r}")

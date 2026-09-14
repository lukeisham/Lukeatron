"""
render.py — pure read-to-HTML. Turns library's verbatim data into the
three-column page Luke looks at (nav rail / content / Tufte margin), the
generation-gate slots, the ink legend, and the integrity footer.

FR-11 / AC-8: this module NEVER opens a file for writing — every read goes
through `library` (the one module allowed to touch Long-Term / LukeatronWiki
on disk). render.py itself performs zero direct file I/O of any kind.

FR-1: body content is shown verbatim. This module emits headings, links and
structure only — it never summarises, paraphrases, or adds a lead-in
sentence over material it did not write itself.

Build-time decisions this module had to make that neither CONTRACT.md nor
render.spec.md pin down (see the build report for the full list):

  - render_slot's signature follows CONTRACT.md's
    `render_slot(slug, slot_name, state, payload)` — NOT render.spec.md's
    FR-2 draft signature `render_slot(store, slug, slot_name)`, which would
    have render decide the state itself. CONTRACT.md's own prose ("render
    calls enrich.slot_state(...); it never decides the state itself") and
    this build's task brief both confirm the state-is-passed-in shape, so
    that is what is implemented; the spec's own signature line is stale.
  - "filled" is the one slot state whose *content* render reads for itself
    rather than asking `enrich` for it — enrich's contract exposes no "read
    the accepted content" function. render.spec.md AD-2 / enrich.spec.md
    AC-9 both say state is decided by the `.p-gen` block in the node's
    STORE file (accept()'s one write target), so this module reads that
    same block, from that same file, for content — never the node's own
    body, which accept() never touches. State and content now come from
    the identical place (see `_read_filled_slot_payload`).
  - Slot-argument type at the enrich boundary: `enrich`'s public API takes
    the three full slot names (`SLOTS`) — that is the domain value the PRD,
    the spec and the store `## <Name>` headings all use. `SLOT_IDS`'s short
    ids exist only for this module's own filenames/DOM ids/CSS
    classes/hidden-form values on the wire back to `/do/*` (server.py
    forwards form fields to `enrich` verbatim, with no translation) — they
    must never be handed to an `enrich` function. Every call this module
    makes into `enrich` passes the full name; `SLOT_IDS[...]` is used only
    when building an `id=`/filename, never as a call argument. (Was
    previously the opposite and silently broke the whole generation gate —
    see the regression tests in tests/test_render.py.)
  - Provenance ink for embedded store content (`.p-luke` vs `.p-source`) is
    not carried by any field `library` returns. This module uses one small,
    explicit, overridable convention (`_provenance_class_for_store`):
    `Bible/` is someone else's words (`.p-source`); everything else is
    Luke's own Long-Term notes (`.p-luke`). Flagged in the build report as
    an open decision, not a spec requirement.
  - The per-file route implied by "links... resolve" in the URL-encoding
    requirement (`/store/<store>/<file>`) is not in CONTRACT.md's route
    table, which only lists `/store/<store>` (the contents page). This
    module emits links to that assumed route for contents-page files and
    search hits; `server.py` needs to add it or this needs reconciling.
"""

import html
import re
from urllib.parse import quote

try:
    from . import library, yamlio
except ImportError:  # pragma: no cover - direct execution / test harness
    import library
    import yamlio


# ============================================================================
# Contract constants
# ============================================================================

SLOTS = ("References", "Supporting Quotes", "See Also")
SLOT_IDS = {
    "References": "references",
    "Supporting Quotes": "supporting-quotes",
    "See Also": "see-also",
}

_BADGE_GLYPH = {"empty": "⊕", "requested": "⏳", "draft": "●", "filled": "✓"}

# Stores whose content is someone else's verbatim words rather than Luke's
# own notes (see module docstring — this is render's own convention, not
# data `library` carries).
_SOURCE_STORES = {"Bible"}

_WIKILINK_RE = re.compile(r"\[\[([a-zA-Z0-9_\-]+)\]\]")


# ============================================================================
# Small escaping / URL helpers
# ============================================================================


def _esc(value):
    """HTML-escape any value for safe embedding (FR: untrusted input in, safe HTML out)."""
    return html.escape("" if value is None else str(value), quote=True)


def _qseg(seg):
    """Percent-encode one path segment."""
    return quote(str(seg), safe="")


def _qpath(relpath):
    """Percent-encode a '/'-separated relative path, segment by segment, keeping the slashes."""
    return "/".join(_qseg(p) for p in str(relpath).split("/"))


# ============================================================================
# enrich.py — lazy, defensive import
# ============================================================================


def _get_enrich():
    """
    Lazily import enrich.py.

    enrich.py is being built concurrently by another agent. render must
    never assume it exists, never re-implement its request/draft/accept
    state machine, and never write to Sandbox itself. If enrich cannot be
    imported (or errors), every slot degrades to "empty" with a visible
    note — never a silent guess.
    """
    try:
        try:
            from . import enrich  # package-relative
        except ImportError:
            import enrich  # direct script execution / test harness
        return enrich
    except Exception:
        return None


def _slot_state_and_payload(slug, slot_name, node):
    """
    Resolve one slot's (state, payload, degraded_note).

    render never decides slot state (CONTRACT.md, "Slot states"): empty /
    requested / draft / filled all come straight from `enrich.slot_state()`,
    called with the FULL slot name — the canonical argument type `enrich`
    validates against `SLOTS` (see the module docstring's slot-argument
    note). `SLOT_IDS[slot_name]` is never passed to `enrich`; it names only
    this module's own files/DOM ids, never anything sent across the
    render/enrich boundary.

    Payload sourcing: "draft" content comes from `enrich.read_draft()`
    (also called with the full name). "Filled" content comes from
    `_read_filled_slot_payload()`, which reads the identical `.p-gen` block
    in the node's STORE file that `enrich.slot_state()` itself checked to
    report "filled" — state and content now share one source (Bug 3 fix).
    """
    enrich = _get_enrich()

    if enrich is None:
        return "empty", None, "enrich is not available yet — showing this slot as empty."

    try:
        state = enrich.slot_state(slug, slot_name)
    except Exception:
        return "empty", None, "enrich.slot_state() failed — showing this slot as empty."

    if state not in ("empty", "requested", "draft", "filled"):
        return "empty", None, f"enrich returned an unrecognised slot state ({state!r})."

    if state == "draft":
        try:
            payload = enrich.read_draft(slug, slot_name)
        except Exception:
            payload = None
        return "draft", payload, None

    if state == "filled":
        return "filled", _read_filled_slot_payload(node, slot_name), None

    return state, None, None


# ============================================================================
# Filled-slot content — read from the SAME store `.p-gen` block that
# enrich.slot_state() checks to report "filled" (Bug 3 fix). See the module
# docstring's build-time-decisions note.
# ============================================================================


def _extract_gen_block_text(store_text, slot_name):
    """
    Return the raw YAML-ish text delimited by
    `<!-- p-gen:start slot="<slot_name>" -->` ... `<!-- p-gen:end -->` in
    `store_text`, or None if that exact slot's block is not present. This is
    the identical marker convention `enrich._format_gen_block` writes and
    `enrich._store_has_gen_block` checks for — render.py deliberately reads
    the same literal delimiter rather than re-deriving it, so the two can
    never drift apart on what "filled" means.
    """
    if not store_text:
        return None
    start_marker = f'<!-- p-gen:start slot="{slot_name}" -->'
    end_marker = "<!-- p-gen:end -->"
    start = store_text.find(start_marker)
    if start == -1:
        return None
    start += len(start_marker)
    end = store_text.find(end_marker, start)
    if end == -1:
        return None
    return store_text[start:end]


def _read_filled_slot_payload(node, slot_name):
    """
    Scan the node's own unsealed store refs (the same files the ordinary
    ref-section render already reads via `library.read_store_file`) for the
    one that carries this slot's accepted `.p-gen` block, and return its
    items in the same `{"items": [{"text","verified"}, ...]}` shape
    `enrich.read_draft()` uses — one payload shape for both "draft" and
    "filled" states, so `_render_gen_payload` needs only one item-level code
    path (Bug 2 fix).

    Returns None if no ref carries this slot's block (e.g. a state/content
    race, or a malformed block) — `_render_gen_payload` treats None as "no
    content to show", never a crash.
    """
    if node is None:
        return None
    for ref in node.get("longterm_refs") or []:
        if ref.get("sealed"):
            continue
        relpath = ref.get("relpath") or ""
        if "/" not in relpath:
            continue
        store, filename = relpath.split("/", 1)
        content = library.read_store_file(store, filename)
        if content is library.SEALED or content is None or content.get("binary"):
            continue
        block_text = _extract_gen_block_text(content.get("text"), slot_name)
        if block_text is None:
            continue
        try:
            data = yamlio.parse(block_text)
        except Exception:
            continue
        raw_items = data.get("items") if isinstance(data, dict) else None
        items = []
        if isinstance(raw_items, list):
            for entry in raw_items:
                if isinstance(entry, dict) and entry.get("text") and entry.get("verified"):
                    items.append({"text": entry["text"], "verified": entry["verified"]})
        return {"slug": node.get("slug"), "slot": slot_name, "items": items}
    return None


# ============================================================================
# Node-body markdown — light, verbatim-preserving parsing
# ============================================================================


def _split_body_and_slots(body_text):
    """
    Split a node's raw body into (main_markdown, {slot_name: section_text}).

    The three slot heading names are reserved: a "## References" /
    "## Supporting Quotes" / "## See Also" line never flows into the
    generic body renderer — it is drawn exclusively by render_slot, so a
    `.p-gen` block can never end up outside a slot by construction (FR-3).
    """
    lines = (body_text or "").split("\n")
    main_lines = []
    current = None
    slot_lines = {name: [] for name in SLOTS}

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("## "):
            heading = stripped[3:].strip()
            if heading in SLOTS:
                current = heading
                continue
            current = None
            main_lines.append(line)
            continue
        if current is None:
            main_lines.append(line)
        else:
            slot_lines[current].append(line)

    slot_text = {name: "\n".join(ls).strip() for name, ls in slot_lines.items()}
    return "\n".join(main_lines), slot_text


def _render_wikilink(slug):
    """
    Render exactly one of the three renderings FR-5 allows for a [[slug]]
    wikilink — never a red link for a sealed target.
    """
    res = library.resolve_wikilink(slug)
    if res["state"] == "live":
        return f'<a href="/page/{_qseg(slug)}">{_esc(res["title"] or slug)}</a>'
    if res["state"] == "unresolved":
        return f'<a class="redlink" href="/page/{_qseg(slug)}">{_esc(slug)}</a>'
    # sealed — plain text, no link, no class at all (never a red link: a red
    # link would reveal the target exists and invite someone to create it).
    return _esc(slug)


def _inline(text):
    """Escape a line of node-body markdown, splicing in real wikilink anchors."""
    out = []
    pos = 0
    for m in _WIKILINK_RE.finditer(text):
        out.append(_esc(text[pos:m.start()]))
        out.append(_render_wikilink(m.group(1)))
        pos = m.end()
    out.append(_esc(text[pos:]))
    return "".join(out)


def _render_node_body(main_text):
    """
    Render a node's own connective markdown (headings, paragraphs, lists,
    wikilinks) as `.p-seam` structure — this is the wiki's own structural
    prose, not a verbatim quote of Luke's or a source's words.
    """
    lines = main_text.split("\n")
    parts = []
    para = []
    items = []

    def flush_para():
        if para:
            text = " ".join(s.strip() for s in para if s.strip())
            if text:
                parts.append(f'<p class="p-seam">{_inline(text)}</p>')
            para.clear()

    def flush_items():
        if items:
            lis = "".join(f"<li>{_inline(t)}</li>" for t in items)
            parts.append(f'<ul class="p-seam">{lis}</ul>')
            items.clear()

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("### "):
            flush_para(); flush_items()
            parts.append(f"<h3>{_inline(stripped[4:].strip())}</h3>")
        elif stripped.startswith("## "):
            flush_para(); flush_items()
            parts.append(f'<h2><span class="label">{_inline(stripped[3:].strip())}</span></h2>')
        elif stripped.startswith("# "):
            flush_para(); flush_items()
            parts.append(f"<h3>{_inline(stripped[2:].strip())}</h3>")
        elif stripped.startswith("- ") or stripped.startswith("* "):
            flush_para()
            items.append(stripped[2:].strip())
        elif stripped == "":
            flush_para(); flush_items()
        else:
            flush_items()
            para.append(stripped)
    flush_para()
    flush_items()
    return "".join(parts)


def _provenance_class_for_store(store):
    """See module docstring — render's own convention, absent a data field."""
    return "p-source" if store in _SOURCE_STORES else "p-luke"


_GEN_BLOCK_ANY_RE = re.compile(
    r'[ \t]*<!-- p-gen:start slot="[^"]*" -->.*?<!-- p-gen:end -->\n?',
    re.S,
)


def _strip_gen_blocks(text):
    """Remove every accepted `.p-gen` marker block from a store file's raw
    text before it goes through the generic verbatim-text renderer — see
    the call site's comment (Bug 3, secondary finding)."""
    if text is None:
        return text
    return _GEN_BLOCK_ANY_RE.sub("", text)


def _render_store_text(text, ink_class):
    """
    Render a store file's verbatim text: paragraph breaks preserved from
    blank lines, single line breaks preserved as <br>, every character
    escaped. No wording is touched, no interpretation of its content
    (wikilink syntax included) is performed — that would not be verbatim.
    """
    if text is None:
        return '<p class="p-seam">(file present but could not be decoded as text)</p>'
    paragraphs = re.split(r"\n\s*\n", text)
    parts = []
    for para in paragraphs:
        if not para.strip():
            continue
        escaped = _esc(para).replace("\n", "<br>")
        parts.append(f'<p class="{ink_class}">{escaped}</p>')
    if not parts:
        return '<p class="p-seam">(empty file)</p>'
    return "".join(parts)


# ============================================================================
# Generation-gate payload rendering (FR-3, FR-4, AC-3, AC-4)
# ============================================================================


def _parse_gen_text(text, verified):
    lines = text.split("\n")
    items = []
    body_bits = []
    for line in lines:
        s = line.strip()
        if not s:
            continue
        if verified is None and s.lower().startswith("verified:"):
            verified = s.split(":", 1)[1].strip()
            continue
        if s.startswith("- ") or s.startswith("* "):
            items.append(s[2:].strip())
        else:
            body_bits.append(s)
    return verified, items, " ".join(body_bits)


def _render_gen_payload(payload):
    """
    Render one slot's generated content. Returns (html, ok). ok is False —
    and html is discarded by the caller — whenever a `verified` stamp
    cannot be established for every item (FR-4 / AC-3): a `.p-gen` block is
    never emitted for an item lacking one, enforced here at the point of
    construction rather than left to hope.

    Two payload shapes are accepted:
      - enrich's real shape (Bug 2 fix) — a dict with "items": a list of
        {"text","verified"} dicts, EACH carrying its own stamp, no
        top-level "verified" key. This is exactly what `enrich.read_draft()`
        and this module's own `_read_filled_slot_payload()` return, so
        "draft" and "filled" share one code path here. ANY item missing a
        non-empty stamp refuses the WHOLE payload — the same all-or-nothing
        rule `enrich.write_draft()`/`accept()` already enforce at write
        time (FR-3/FR-8) — not a silent per-item drop.
      - the simple/legacy shape — a dict with one top-level "verified"
        stamp covering a list of plain-string "items" (or free text under
        "content"/"text"/"body", parsed by `_parse_gen_text`), or a bare
        string in that same free-text form. Kept for callers that hand
        `render_slot()` a payload directly (see tests/test_render.py's AC-3
        coverage, which exercises this shape on purpose, independent of
        enrich's real one).
    """
    if payload is None:
        return None, False

    if isinstance(payload, dict):
        raw_items = payload.get("items")
        if isinstance(raw_items, list) and raw_items and all(isinstance(i, dict) for i in raw_items):
            pairs = []
            for entry in raw_items:
                text = entry.get("text")
                verified = entry.get("verified")
                if not (isinstance(text, str) and text.strip()):
                    return None, False
                if not (isinstance(verified, str) and verified.strip()):
                    return None, False
                pairs.append((text, verified))
            lis = "".join(
                f'<li>{_esc(text)} <span class="gen-verified">&mdash; verified: {_esc(verified)}</span></li>'
                for text, verified in pairs
            )
            return f"<ul>{lis}</ul>", True

        verified = payload.get("verified")
        items = [str(i) for i in raw_items] if isinstance(raw_items, list) and raw_items else []
        extra_text = ""
        if not items:
            content = payload.get("content") or payload.get("text") or payload.get("body")
            if isinstance(content, str):
                verified, items, extra_text = _parse_gen_text(content, verified)
    elif isinstance(payload, str):
        verified, items, extra_text = _parse_gen_text(payload, None)
    else:
        return None, False

    if not verified:
        return None, False

    parts = [f"<p><strong>Verified:</strong> {_esc(verified)}</p>"]
    if items:
        lis = "".join(f"<li>{_esc(it)}</li>" for it in items)
        parts.append(f"<ul>{lis}</ul>")
    elif extra_text:
        parts.append(f"<p>{_esc(extra_text)}</p>")
    return "".join(parts), True


def _slot_badge(state):
    glyph = _BADGE_GLYPH.get(state, "?")
    css_state = state if state in _BADGE_GLYPH else "empty"
    return f'<span class="slot-state-badge {css_state}">{glyph}</span>'


def render_slot(slug, slot_name, state, payload=None):
    """
    Draw exactly one of the four generation-gate slot states. This function
    only draws the state it is given — it never decides the state (that is
    `enrich.slot_state()`'s job, called from `_slot_state_and_payload`).

    Every `.p-gen`-bearing element this module ever emits is emitted here,
    inside `.slot-container` — nowhere else in render.py uses that class,
    which is what makes FR-3 checkable rather than a promise.
    """
    if slot_name not in SLOTS:
        raise ValueError(f"Unknown slot: {slot_name!r}")
    slot_id = SLOT_IDS[slot_name]

    # Boundary rule (see the module docstring's slot-argument note):
    # server.py forwards this hidden "slot" field to enrich.* verbatim, with
    # no translation, so the value posted here MUST be the full slot name —
    # the same canonical type enrich.SLOTS validates against — never
    # `slot_id`. `slot_id` is used below only for this element's own DOM
    # `id=`, never put on the wire to `/do/*`.
    slot_value = _esc(slot_name)

    header = f'<div class="slot-header"><span>{_esc(slot_name)}</span>{_slot_badge(state)}</div>'

    if state == "empty":
        body = (
            '<div class="slot-empty">'
            '<form method="post" action="/do/enrich">'
            f'<input type="hidden" name="slug" value="{_esc(slug)}">'
            f'<input type="hidden" name="slot" value="{slot_value}">'
            f'<button type="submit" class="btn-add-slot" title="Request {_esc(slot_name.lower())}">⊕</button>'
            "</form></div>"
        )
    elif state == "requested":
        body = '<div class="slot-requested">Request pending&hellip; check back later.</div>'
    elif state == "draft":
        content_html, ok = _render_gen_payload(payload)
        if not ok:
            body = (
                '<div class="slot-requested">'
                "Draft is missing a verified: stamp and cannot be shown."
                "</div>"
            )
        else:
            # Two SEPARATE forms, each posting to its own route. Do NOT merge
            # these into one form with a name="action" field: server.py routes
            # purely on the URL and never reads such a field, so a shared form
            # made Reject post to /do/accept — i.e. rejecting a draft WROTE it
            # into Long-Term memory. The destination must live in the markup,
            # not in a field the server has to remember to inspect.
            hidden = (
                f'<input type="hidden" name="slug" value="{_esc(slug)}">'
                f'<input type="hidden" name="slot" value="{slot_value}">'
            )
            body = (
                '<div class="slot-draft">'
                f'<div class="slot-draft-content p-gen">{content_html}</div>'
                '<div class="slot-draft-actions">'
                '<form method="post" action="/do/cancel" class="slot-action-form">'
                f'{hidden}'
                '<button type="submit" class="reject">Reject</button>'
                "</form>"
                '<form method="post" action="/do/accept" class="slot-action-form">'
                f'{hidden}'
                '<button type="submit" class="accept">Accept</button>'
                "</form>"
                "</div></div>"
            )
    elif state == "filled":
        content_html, ok = _render_gen_payload(payload)
        if not ok:
            body = '<div class="slot-requested">No content to show.</div>'
        else:
            body = f'<div class="gen-block p-gen"><span class="gen-tag">generated</span>{content_html}</div>'
    else:
        body = '<div class="slot-requested">Slot state unavailable — treating as empty.</div>'

    return f'<div class="slot-container" id="{slot_id}">{header}{body}</div>'


# ============================================================================
# Page shell — topbar, rail, margin, footer
# ============================================================================


def _rail_html():
    stores = library.list_stores()
    store_items = "".join(
        f'<li><a href="/store/{_qseg(s["folder"])}">{_esc(s["name"])}</a> '
        f'<span class="rail-section-count">{s["file_count"]}</span></li>'
        for s in stores
    )
    hub_items = "".join(
        f'<li><a href="/page/{_qseg(s["hub_slug"])}">{_esc(s["name"])}</a></li>'
        for s in stores
        if s.get("hub_slug")
    )

    queue = library.read_queue()
    counts_by_intent = {"read": 0, "watch": 0, "write": 0}
    for it in queue.get("items", []):
        if isinstance(it, dict) and it.get("intent") in counts_by_intent:
            counts_by_intent[it["intent"]] += 1
    backlog_items = "".join(
        f'<li><a href="/backlog#{_esc(intent)}">{_esc(intent)}</a> '
        f'<span class="rail-section-count">{n}</span></li>'
        for intent, n in counts_by_intent.items()
    )

    return (
        '<div class="rail">'
        '<div class="rail-section" id="stores">'
        f'<div class="rail-section-title"><span>STORES <span class="rail-section-count">{len(stores)}</span></span></div>'
        f'<ul class="rail-items">{store_items}</ul>'
        "</div>"
        '<div class="rail-section" id="hubs">'
        '<div class="rail-section-title"><span>HUBS</span></div>'
        f'<ul class="rail-items">{hub_items}</ul>'
        "</div>"
        '<div class="rail-section" id="backlog-nav">'
        '<div class="rail-section-title"><span>BACKLOG</span></div>'
        f'<ul class="rail-items">{backlog_items}</ul>'
        "</div>"
        '<div class="rail-section" id="tools">'
        '<div class="rail-section-title"><span>&#9881; <a href="#integrity-footer">integrity</a></span></div>'
        "</div>"
        "</div>"
    )


_CAPTURE_INTENTS = ("read", "watch", "write")


def _capture_form_html():
    """
    The quick-capture form (PRD Key behaviours; capture.spec.md FR-1). A
    fixed form posting to POST /do/capture: title, kind (free text), intent
    (fixed read/watch/write), source, page (a dropdown of existing unsealed
    nodes — Luke makes the link, not an agent), and an optional note.
    capture.py refuses the write outright if `page` isn't a real node or
    `intent` isn't one of the three values; this form only offers valid
    choices, it doesn't itself validate (capture.py is the single source of
    truth — see module docstring).
    """
    nodes = library.list_nodes()
    page_options = "".join(
        f'<option value="{_esc(n["slug"])}">{_esc(n.get("title") or n["slug"])}</option>'
        for n in nodes
    )
    intent_options = "".join(
        f'<option value="{_esc(i)}">{_esc(i)}</option>' for i in _CAPTURE_INTENTS
    )
    return (
        '<form class="capture-form" method="post" action="/do/capture">'
        '<div class="capture-form-title">🌱 Quick-capture</div>'
        '<div class="capture-form-group">'
        '<label>Title<input type="text" name="title" required></label>'
        '<label>Kind<input type="text" name="kind" placeholder="book, article, video…" required></label>'
        "</div>"
        '<div class="capture-form-group">'
        f'<label>Intent<select name="intent" required><option value="" disabled selected>choose…</option>{intent_options}</select></label>'
        '<label>Source<input type="text" name="source" required></label>'
        "</div>"
        '<div class="capture-form-group full">'
        f'<label>Page<select name="page" required><option value="" disabled selected>choose a page…</option>{page_options}</select></label>'
        "</div>"
        '<div class="capture-form-group full">'
        '<label>Note (optional)<textarea name="note"></textarea></label>'
        "</div>"
        '<div class="capture-form-actions"><button type="submit">Capture</button></div>'
        "</form>"
    )


def _ink_legend_html():
    # Swatches use wiki-page.css's own .key-swatch classes (kl/ks/kg/ke) so the
    # legend's colours come from that stylesheet unmodified (FR-10) — app.css
    # must never define its own rules against the ink CSS variables directly
    # (CONTRACT.md house rule: no --edge-luke/--wash-luke/--edge-source/--edge-gen
    # in static/app.css).
    return (
        '<div class="ink-legend">'
        '<div class="ink-legend-title">Ink</div>'
        '<ul class="ink-legend-items">'
        '<li class="ink-legend-item"><div class="key-swatch kl"></div><span>Luke</span></li>'
        '<li class="ink-legend-item"><div class="key-swatch ks"></div><span>source</span></li>'
        '<li class="ink-legend-item"><div class="key-swatch kg"></div><span>Lukeatron</span></li>'
        '<li class="ink-legend-item"><div class="key-swatch ke"></div><span>seam</span></li>'
        "</ul></div>"
    )


def _infobox_html(node):
    rows = []
    if node.get("type"):
        rows.append(f'<tr><td style="font-weight:600;">kind</td><td>{_esc(node["type"])}</td></tr>')
    if node.get("status"):
        rows.append(f'<tr><td style="font-weight:600;">status</td><td>{_esc(node["status"])}</td></tr>')
    if node.get("updated"):
        rows.append(f'<tr><td style="font-weight:600;">updated</td><td>{_esc(node["updated"])}</td></tr>')
    thumb = ""
    if node.get("thumbnail"):
        thumb = f'<img src="/media/{_qseg(node["thumbnail"])}" alt="thumbnail">'
    table = f"<table>{''.join(rows)}</table>" if rows else ""
    return f'<div class="margin-box"><div class="margin-box-title">Info</div>{thumb}{table}</div>'


def _inlongterm_html(margin_refs):
    if not margin_refs:
        return ""
    items = "".join(f'<li><a href="#{_esc(aid)}">{_esc(label)}</a></li>' for aid, label in margin_refs)
    return f'<div class="margin-box"><div class="margin-box-title">In Long-Term</div><ul class="margin-items">{items}</ul></div>'


def _backlinks_html(slug):
    back = library.backlinks(slug)
    if not back:
        return ""
    items = "".join(
        f'<li><a href="/page/{_qseg(b["slug"])}">{_esc(b["title"])}</a></li>' for b in back
    )
    return f'<div class="margin-box"><div class="margin-box-title">What Links Here</div><ul class="margin-items">{items}</ul></div>'


def _integrity_footer_html(counts):
    def count_span(n, label):
        n_disp = "?" if n is None else n
        return f'<span class="count"><strong>{_esc(n_disp)}</strong> {_esc(label)}</span>'

    spans = "".join(
        count_span(counts.get(key), label)
        for key, label in (
            ("stores", "stores"),
            ("files", "files"),
            ("rendered", "rendered"),
            ("sealed", "sealed"),
            ("unindexed", "unindexed"),
            ("dead_links", "dead links"),
            ("one_way_edges", "one-way edges"),
        )
    )
    return (
        '<div style="padding:1.5rem;border-top:1px solid var(--rule);background:var(--paper-sunk);" id="integrity-footer">'
        f'<div class="integrity-footer">{spans}'
        '<span class="integrity-link"><a href="/backlog" title="Integrity report">&#9881; Report</a></span>'
        "</div></div>"
    )


def _page_shell(title, content_html, rail_html, margin_html, counts, search_q=""):
    stores_n = counts.get("stores") or 0
    return (
        "<!DOCTYPE html>\n"
        '<html lang="en">\n'
        "<head>\n"
        '<meta charset="UTF-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        f"<title>{_esc(title)} — LukeatronWiki</title>\n"
        '<link rel="stylesheet" href="/static/wiki-page.css">\n'
        '<link rel="stylesheet" href="/static/app.css">\n'
        "</head>\n"
        "<body>\n"
        '<div class="topbar">'
        '<div class="topbar-wordmark">LukeatronWiki</div>'
        '<form class="topbar-search" method="get" action="/search">'
        f'<input type="text" name="q" value="{_esc(search_q)}" placeholder="Search all {stores_n} stores...">'
        "</form>"
        '<div class="topbar-controls">'
        '<button class="btn-theme-toggle" type="button" title="Toggle theme">&#9680;</button>'
        '<button class="btn-print" type="button" title="Print">&#9033;</button>'
        "</div></div>\n"
        '<div class="shell">'
        f"{rail_html}"
        f'<div class="content">{content_html}</div>'
        f'<div class="margin">{margin_html}</div>'
        "</div>\n"
        f"{_integrity_footer_html(counts)}\n"
        '<script src="/static/app.js"></script>\n'
        "</body>\n"
        "</html>"
    )


def _seal_failure_page():
    """
    FR-13 / AC-10: the whole-app failure banner. Shown on every route when
    `seal`'s manifest is missing, unreadable, or malformed — no store
    content, no node body, no search results, no integrity counts (they
    would be lies), until the manifest is restored.
    """
    banner = (
        '<div style="margin:1.5rem;padding:1rem 1.25rem;border:2px solid #B85450;'
        "background:var(--paper-sunk);color:#B85450;"
        "font-family:&quot;IBM Plex Sans&quot;,system-ui,sans-serif;font-weight:600;\">"
        "&#9888; Seal manifest failure — <code>_sealed.yaml</code> is missing, unreadable, "
        "or malformed. Every store and file is being treated as sealed until this is fixed. "
        "No content is shown."
        "</div>"
    )
    return (
        "<!DOCTYPE html>\n"
        '<html lang="en">\n'
        "<head>\n"
        '<meta charset="UTF-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        "<title>Seal failure — LukeatronWiki</title>\n"
        '<link rel="stylesheet" href="/static/wiki-page.css">\n'
        '<link rel="stylesheet" href="/static/app.css">\n'
        "</head>\n"
        "<body>\n"
        '<div class="topbar"><div class="topbar-wordmark">LukeatronWiki</div></div>\n'
        '<div class="shell"><div class="content">'
        f"{banner}"
        "</div></div>\n"
        "</body>\n"
        "</html>"
    )


def _breadcrumb_for_node(node):
    for ref in node["longterm_refs"]:
        if not ref["sealed"] and "/" in ref["relpath"]:
            store = ref["relpath"].split("/", 1)[0]
            return f"{store} › {node['title']}"
    if node.get("type"):
        return f"{node['type']} › {node['title']}"
    return node["title"]


# ============================================================================
# Public API
# ============================================================================


def render_home():
    counts = library.integrity_counts()
    if counts.get("sealed") is None:
        return _seal_failure_page()

    stores = library.list_stores()
    tiles = "".join(
        f'<li><a href="/store/{_qseg(s["folder"])}">{_esc(s["name"])}</a> '
        f'<span class="rail-section-count">{s["file_count"]}</span></li>'
        for s in stores
    )
    content_html = (
        "<h1>LukeatronWiki</h1>"
        '<p class="p-seam">Browse a store, follow a hub, or search across every unsealed store.</p>'
        f'<ul class="margin-items">{tiles}</ul>'
    )
    return _page_shell("Home", content_html, _rail_html(), _ink_legend_html(), counts)


def render_page(slug):
    counts = library.integrity_counts()
    if counts.get("sealed") is None:
        return _seal_failure_page()

    # A directly-requested sealed target must behave exactly like it does
    # not exist — never confirm it by name, never distinguish from a plain 404.
    link_res = library.resolve_wikilink(slug)
    if link_res["state"] == "sealed":
        return render_404(f"No such page: {slug}")

    node = library.read_node(slug)
    if node is None:
        return render_404(f"No such page: {slug}")

    body_text = node.get("body") or ""
    main_text, _ = _split_body_and_slots(body_text)
    body_html = _render_node_body(main_text)

    ref_sections = []
    margin_refs = []
    for i, ref in enumerate(node["longterm_refs"]):
        if ref["sealed"]:
            continue  # never render, never even list a sealed pointer
        relpath = ref["relpath"]
        if "/" not in relpath:
            continue
        store, filename = relpath.split("/", 1)
        content = library.read_store_file(store, filename)
        if content is library.SEALED or content is None:
            continue
        anchor_id = f"ref-{i}"
        if content.get("binary"):
            text_html = f'<p class="p-seam">(binary file — not shown; suffix {_esc(content.get("suffix", ""))})</p>'
        else:
            ink = _provenance_class_for_store(store)
            # Bug 3, secondary finding: an accepted `.p-gen` block lives in
            # this same store file, so the ordinary verbatim-text render
            # would otherwise show it a second time here — HTML-escaped,
            # un-classed, right below the slot that already shows it
            # properly. Strip it before this generic render; the slot
            # container remains its one true home (FR-3).
            text_html = _render_store_text(_strip_gen_blocks(content.get("text")), ink)
        ref_sections.append(
            f'<section id="{anchor_id}"><h2><span class="label">{_esc(ref["label"])}</span></h2>{text_html}</section>'
        )
        margin_refs.append((anchor_id, ref["label"]))

    slot_parts = []
    for slot_name in SLOTS:
        state, payload, note = _slot_state_and_payload(slug, slot_name, node)
        piece = render_slot(slug, slot_name, state, payload)
        if note:
            piece = f'<p class="slot-degraded-note">{_esc(note)}</p>{piece}'
        slot_parts.append(piece)

    content_html = (
        f'<p class="eyebrow">{_esc(_breadcrumb_for_node(node))}</p>'
        f'<h1>{_esc(node["title"])}</h1>'
        f"{body_html}"
        f"{''.join(ref_sections)}"
        f"{''.join(slot_parts)}"
    )

    margin_html = (
        _infobox_html(node)
        + _inlongterm_html(margin_refs)
        + _backlinks_html(slug)
        + _ink_legend_html()
    )

    return _page_shell(node["title"], content_html, _rail_html(), margin_html, counts)


def render_store(store):
    counts = library.integrity_counts()
    if counts.get("sealed") is None:
        return _seal_failure_page()

    page = library.contents_page(store)
    if page is library.SEALED:
        return render_404("No such store.")

    rail_html = _rail_html()
    margin_html = _ink_legend_html()

    if page["state"] == "empty":
        content_html = f"<h1>{_esc(store)}</h1>" '<p class="p-seam">No files in this store yet.</p>'
    else:
        items = "".join(
            f'<li><a href="/store/{_qseg(store)}/{_qpath(f["filename"])}">{_esc(f["filename"])}</a> '
            f'<span class="rail-section-count">{_esc(f["suffix"])}</span></li>'
            for f in page["files"]
        )
        note = (
            ""
            if page["state"] == "has-node"
            else '<p class="p-seam">No wiki node yet for this store — here are its files.</p>'
        )
        content_html = f"<h1>{_esc(store)}</h1>{note}" f'<ul class="margin-items">{items}</ul>'

    return _page_shell(store, content_html, rail_html, margin_html, counts)


def render_backlog():
    counts = library.integrity_counts()
    if counts.get("sealed") is None:
        return _seal_failure_page()

    queue = library.read_queue()
    groups = {"read": [], "watch": [], "write": []}
    for it in queue.get("items", []):
        if isinstance(it, dict) and it.get("intent") in groups:
            groups[it["intent"]].append(it)

    sections = []
    for intent, rows in groups.items():
        if not rows:
            body = '<p class="p-seam">Nothing queued.</p>'
        else:
            lis = []
            for row in rows:
                title = _esc(row.get("title", ""))
                kind = _esc(row.get("kind", ""))
                source = _esc(row.get("source", ""))
                status = _esc(row.get("status", ""))
                page = row.get("page")
                page_link = f'<a href="/page/{_qseg(page)}">{_esc(page)}</a>' if page else ""
                lis.append(
                    f"<li><strong>{title}</strong> ({kind}) — {source} "
                    f'<span class="search-result-kind">{status}</span> {page_link}</li>'
                )
            body = f'<ul class="margin-items">{"".join(lis)}</ul>'
        sections.append(
            f'<section id="{_esc(intent)}"><h2><span class="label">{_esc(intent.capitalize())}</span></h2>{body}</section>'
        )

    content_html = "<h1>Backlog</h1>" + "".join(sections) + _capture_form_html()
    return _page_shell("Backlog", content_html, _rail_html(), _ink_legend_html(), counts)


def render_search_results(query, groups):
    counts = library.integrity_counts()
    if counts.get("sealed") is None:
        return _seal_failure_page()

    if not groups:
        body = '<p class="p-seam">No results.</p>'
    else:
        sections = []
        for g in groups:
            store = g.get("store", "")
            hit_items = []
            for h in g.get("hits", []):
                filename = h.get("filename", "")
                kind = h.get("kind", "body")
                css_kind = kind if kind in ("title", "body") else "body"
                excerpt = h.get("excerpt", "")
                line = h.get("line")
                href = f'/store/{_qseg(store)}/{_qpath(filename)}'
                if line not in (None, "") and str(line).lstrip("-").isdigit():
                    href += f"#L{line}"
                hit_items.append(
                    '<div class="search-result-item">'
                    f'<div class="search-result-title"><a href="{href}">{_esc(filename)}</a></div>'
                    f'<div class="search-result-excerpt">{_esc(excerpt)}</div>'
                    f'<div><span class="search-result-kind {css_kind}">{_esc(kind)} hit</span></div>'
                    "</div>"
                )
            sections.append(
                '<div class="search-result-group">'
                f'<div class="search-result-group-title">{_esc(store)}</div>'
                f'{"".join(hit_items)}'
                "</div>"
            )
        body = f'<div class="search-results">{"".join(sections)}</div>'

    content_html = f"<h1>Search: {_esc(query)}</h1>{body}"
    return _page_shell(
        f"Search: {query}", content_html, _rail_html(), _ink_legend_html(), counts, search_q=query
    )


def render_404(msg="Page not found."):
    counts = library.integrity_counts()
    if counts.get("sealed") is None:
        return _seal_failure_page()

    content_html = f"<h1>Not found</h1>" f'<p class="p-seam">{_esc(msg)}</p>'
    return _page_shell("Not found", content_html, _rail_html(), _ink_legend_html(), counts)

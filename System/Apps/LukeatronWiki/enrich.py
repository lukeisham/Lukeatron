"""
enrich.py — the request -> draft -> accept file protocol behind the PRD's
generation gate (References / Supporting Quotes / See Also).

One of exactly two modules in this app permitted to write into Memory/Long-Term/
(the other is capture.py). accept() is that one write path here, granted by
Luke 2026-09-11 (registry D13, Rule Exceptions row 3 against PY-12/API-5):
Luke's Accept click IS the !Checkpoint approval — no separate approval step
exists inside accept() itself. request_enrich()'s write (registry D6, row 2)
lands only in System/Sandbox/wiki-enrich/_requests/, outside Long-Term.

This module never calls an agent or an LLM (FR-7/AC-8). Two of its seven
functions are AGENT-FACING ONLY and must never be reached from an HTTP route
(FR-10) — see the clearly marked section below, each also carrying an
`is_agent_only = True` attribute so a grep or a test can check this
structurally rather than by convention alone:

    list_pending()   — discovery, called by an agent session
    write_draft()    — called BY an agent once it has verified content

Everything else (request_enrich, accept, cancel, slot_state, read_draft) is
safe to call from server.py's routes / render.py's reads.

File scheme (confirmed against enrich.spec.md AD-2 / render.spec.md OQ-1):
    request : System/Sandbox/wiki-enrich/_requests/<slug>.<slot_id>.yaml
    draft   : System/Sandbox/wiki-enrich/<slug>.<slot_id>.md

Raw-file marker convention (my own design decision — see the build report's
disagreements section: neither capture.spec.md, enrich.spec.md, nor
CONTRACT.md fixes the literal text syntax a `.p-gen` block uses inside a
plain-text store file; only the CSS class names are specified). Draft and
accepted content share one small, deterministic, yamlio-parseable shape:

    items:
      - text: "<verbatim item text>"
        verified: "<stamp naming what was checked, and how>"

wrapped, once accepted into a store file, in an HTML-comment delimiter that
is invisible in a plain markdown read and greppable by a checker or by
render.py:

    <!-- p-gen:start slot="References" -->
    items:
      - text: "..."
        verified: "..."
    <!-- p-gen:end -->
"""

import datetime as dt
import os
import tempfile
from pathlib import Path

try:
    from . import library, paths, seal, yamlio
except ImportError:  # pragma: no cover - fallback for direct/test execution
    import library
    import paths
    import seal
    import yamlio


SLOTS = ("References", "Supporting Quotes", "See Also")
SLOT_IDS = {
    "References": "references",
    "Supporting Quotes": "supporting-quotes",
    "See Also": "see-also",
}


# ============================================================================
# Browser-facing entry points — server.py's routes may call these.
# ============================================================================


def request_enrich(slug, slot):
    """
    The ⊕ click handler (FR-1). Writes one pending request file if none
    already exists for this slug+slot; otherwise a no-op (AC-1: two clicks,
    one file). Also a no-op if a draft (or the store) already holds this
    slot — clicking ⊕ again once past "requested" should not resurrect a
    second request file behind the scenes.

    Returns: {"ok": bool, "error": str|None, "path": str|None, "created": bool}
    """
    error = _validate_slot_and_page(slug, slot)
    if error:
        return {"ok": False, "error": error, "path": None, "created": False}

    slot_id = SLOT_IDS[slot]
    req_path = paths.REQ_DIR / f"{slug}.{slot_id}.yaml"
    draft_path = paths.ENRICH_DIR / f"{slug}.{slot_id}.md"

    if req_path.exists() or draft_path.exists():
        return {"ok": True, "error": None, "path": str(req_path), "created": False}

    content = (
        "status: pending\n"
        f"slug: {yamlio.dump_scalar(slug)}\n"
        f"slot: {yamlio.dump_scalar(slot)}\n"
        "requested_by: luke\n"
        f"requested_at: {dt.datetime.now().isoformat(timespec='seconds')}\n"
    )
    try:
        _atomic_write(req_path, content)
    except OSError as exc:
        return {"ok": False, "error": f"failed to write request: {exc}", "path": None, "created": False}

    return {"ok": True, "error": None, "path": str(req_path), "created": True}


def accept(slug, slot):
    """
    The Accept-click handler (FR-4). Writes the current draft's content into
    the slot's store file as a `.p-gen` block with its `verified:` stamps
    intact, then deletes both the request and draft files for this slug+slot.

    FR-8: re-checks the verified-stamp requirement on the way into the
    store, independent of write_draft()'s own check on the way in.

    Atomicity decision: the store write itself is the dangerous one (a
    Long-Term file), so it alone goes through temp-file + os.replace — it is
    never partially written. Cleanup (deleting the request/draft files) runs
    only after that write has landed; if cleanup then fails, the store write
    is NOT undone (undoing a committed Long-Term write is worse than a
    leftover scratch file) and "ok" stays True since the write itself
    succeeded, but "error" reports the cleanup failure so it isn't silently
    lost. slot_state()'s store-check-wins priority (AD-2) means a leftover
    file can never pull the slot back to "requested"/"draft" after this.

    Returns: {"ok": bool, "error": str|None, "writes": [relpath, ...]}
    """
    error = _validate_slot_and_page(slug, slot)
    if error:
        return {"ok": False, "error": error, "writes": []}

    node = _find_unsealed_node(slug)
    slot_id = SLOT_IDS[slot]
    req_path = paths.REQ_DIR / f"{slug}.{slot_id}.yaml"
    draft_path = paths.ENRICH_DIR / f"{slug}.{slot_id}.md"

    draft = read_draft(slug, slot)
    if draft is None or not draft["items"]:
        return {"ok": False, "error": "no draft to accept", "writes": []}

    items = _validate_items(draft["items"])
    if items is None:
        return {
            "ok": False,
            "error": "draft contains an item without a non-empty verified: stamp — refusing to accept",
            "writes": [],
        }

    ref = _pick_store_ref(node)
    if ref is None:
        return {"ok": False, "error": f"page {slug!r} has no unsealed store file to accept into", "writes": []}

    target_abs = _resolve_permitted_target(ref["relpath"])
    if target_abs is None:
        return {
            "ok": False,
            "error": "accept target does not resolve to a safe, unsealed path under Memory/Long-Term/",
            "writes": [],
        }

    try:
        orig_text = target_abs.read_text(encoding="utf-8")
    except OSError as exc:
        return {"ok": False, "error": f"failed to read store file: {exc}", "writes": []}

    block = _format_gen_block(slot, items)
    new_text = orig_text.rstrip("\n") + "\n\n" + block

    try:
        _atomic_write(target_abs, new_text)
    except OSError as exc:
        return {"ok": False, "error": f"failed to write store file: {exc}", "writes": []}

    writes = [paths.store_rel(target_abs)]

    cleanup_errors = []
    for p in (req_path, draft_path):
        try:
            if p.exists():
                p.unlink()
        except OSError as exc:
            cleanup_errors.append(f"{p.name}: {exc}")

    if cleanup_errors:
        return {
            "ok": True,
            "error": "store write succeeded but cleanup failed: " + "; ".join(cleanup_errors),
            "writes": writes,
        }
    return {"ok": True, "error": None, "writes": writes}


def cancel(slug, slot):
    """
    Withdraw (from "requested") and reject (from "draft ready") are the same
    call (FR-5/AD-1): delete whatever request/draft files exist for this
    slug+slot. Never touches the store.

    Returns: {"ok": bool, "error": str|None, "removed": [str, ...]}
    """
    error = _validate_slot_and_page(slug, slot)
    if error:
        return {"ok": False, "error": error, "removed": []}

    slot_id = SLOT_IDS[slot]
    req_path = paths.REQ_DIR / f"{slug}.{slot_id}.yaml"
    draft_path = paths.ENRICH_DIR / f"{slug}.{slot_id}.md"

    removed = []
    for p in (req_path, draft_path):
        try:
            if p.exists():
                p.unlink()
                removed.append(str(p))
        except OSError as exc:
            return {"ok": False, "error": f"failed to remove {p.name}: {exc}", "removed": removed}

    return {"ok": True, "error": None, "removed": removed}


def slot_state(slug, slot):
    """
    empty | requested | draft | filled — priority per render.spec.md AD-2:
    a `.p-gen` block already in the store WINS over any leftover request or
    draft file, else draft file present -> "draft", else request file
    present -> "requested", else "empty". render.py calls this; it never
    decides the state itself (CONTRACT.md).

    `slot` MUST be one of the three full names in `SLOTS` — the domain
    value every other entry point in this module also requires (FR-6). This
    is the one function in the module whose return type is a bare `str`
    with no `{"ok": False, "error": ...}` shape to carry a refusal, so an
    invalid slot here used to return "empty" — indistinguishable from a
    genuinely empty slot, and the exact defect that made the whole
    generation gate invisible through render.py (a caller that accidentally
    passed the short id, e.g. "references", silently saw "empty" forever
    instead of an error pointing at the mismatch). Raising here instead
    makes that class of bug loud: render.py's own call site already wraps
    `slot_state()` in a try/except that turns any exception into a visible
    "showing this slot as empty" note, so this is surfaced, not swallowed.
    """
    if slot not in SLOTS:
        raise ValueError(f"invalid slot {slot!r}: must be one of {SLOTS} (full names, not slot ids)")
    node = _find_unsealed_node(slug)
    if node is None:
        return "empty"

    if _store_has_gen_block(node, slot):
        return "filled"

    slot_id = SLOT_IDS[slot]
    if (paths.ENRICH_DIR / f"{slug}.{slot_id}.md").is_file():
        return "draft"
    if (paths.REQ_DIR / f"{slug}.{slot_id}.yaml").is_file():
        return "requested"
    return "empty"


def read_draft(slug, slot):
    """
    Read back a pending draft file.

    Returns:
        None — invalid slot, sealed/missing page, or no draft file
        {"slug","slot","items":[{"text","verified"}, ...]}
    """
    if slot not in SLOTS:
        return None
    if _find_unsealed_node(slug) is None:
        return None

    slot_id = SLOT_IDS[slot]
    draft_path = paths.ENRICH_DIR / f"{slug}.{slot_id}.md"
    if not draft_path.is_file():
        return None

    try:
        text = draft_path.read_text(encoding="utf-8")
    except OSError:
        return None

    data = yamlio.parse(text)
    raw_items = data.get("items") if isinstance(data, dict) else None
    items = []
    if isinstance(raw_items, list):
        for entry in raw_items:
            if isinstance(entry, dict) and entry.get("text") and entry.get("verified"):
                items.append({"text": entry["text"], "verified": entry["verified"]})

    return {"slug": slug, "slot": slot, "items": items}


# ============================================================================
# Agent-facing entry points ONLY — FR-10: never called from an HTTP route.
# server.py's route table (built against CONTRACT.md) correctly omits both.
# ============================================================================


def list_pending():
    """
    Every pending request's slug/slot/page/when (FR-2). Returns [] — never
    raises — when System/Sandbox/wiki-enrich/_requests/ doesn't exist yet
    (FR-12/AC-11): "no folder" and "folder exists but empty" both mean
    "nothing pending".
    """
    if not paths.REQ_DIR.is_dir():
        return []

    out = []
    for child in sorted(paths.REQ_DIR.iterdir(), key=lambda p: p.name.lower()):
        if not child.is_file() or child.suffix != ".yaml":
            continue
        try:
            text = child.read_text(encoding="utf-8")
        except OSError:
            continue
        data = yamlio.parse(text)
        if not isinstance(data, dict):
            continue
        slug = data.get("slug")
        slot = data.get("slot")
        out.append({
            "slug": slug,
            "slot": slot,
            "page": slug,
            "requested_at": data.get("requested_at"),
        })
    return out


list_pending.is_agent_only = True


def write_draft(slug, slot, content):
    """
    Called BY an agent session once it has produced verified content — never
    the reverse (FR-7). Refuses to write (zero bytes) if any item in
    `content` lacks a non-empty `verified` stamp (FR-3/AC-3).

    `content`: list of {"text": str, "verified": str} — see module docstring
    for why this shape was chosen over raw markdown text.

    Returns: {"ok": bool, "error": str|None, "path": str|None}
    """
    error = _validate_slot_and_page(slug, slot)
    if error:
        return {"ok": False, "error": error, "path": None}

    items = _validate_items(content)
    if items is None:
        return {
            "ok": False,
            "error": "every item must carry a non-empty verified: stamp — refusing to write",
            "path": None,
        }

    slot_id = SLOT_IDS[slot]
    draft_path = paths.ENRICH_DIR / f"{slug}.{slot_id}.md"
    text = _serialize_items(items)

    try:
        _atomic_write(draft_path, text)
    except OSError as exc:
        return {"ok": False, "error": f"failed to write draft: {exc}", "path": None}

    return {"ok": True, "error": None, "path": str(draft_path)}


write_draft.is_agent_only = True


# ============================================================================
# Internal helpers
# ============================================================================


def _find_unsealed_node(slug):
    """FR-9: every entry point validates the page against library's
    seal-filtered node list — the same discipline capture.py's FR-9 uses."""
    for node in library.list_nodes():
        if node.get("slug") == slug:
            return node
    return None


def _validate_slot_and_page(slug, slot):
    """Returns an error string, or None if slot+page are both valid."""
    if slot not in SLOTS:
        return f"invalid slot {slot!r}: must be one of {SLOTS}"
    if _find_unsealed_node(slug) is None:
        return f"page not found (or sealed): {slug!r}"
    return None


def _validate_items(content):
    """
    FR-3/FR-8: every item must be a dict with non-empty "text" and
    "verified" strings. Returns a clean list, or None if content is not a
    list or ANY item fails the check (belt-and-suspenders: the same
    function backs both write_draft's and accept's stamp check).
    """
    if not isinstance(content, list):
        return None
    items = []
    for entry in content:
        if not isinstance(entry, dict):
            return None
        text = entry.get("text")
        verified = entry.get("verified")
        if not isinstance(text, str) or not text.strip():
            return None
        if not isinstance(verified, str) or not verified.strip():
            return None
        items.append({"text": text, "verified": verified})
    return items


def _serialize_items(items):
    if not items:
        return "items: []\n"
    lines = ["items:"]
    for item in items:
        lines.append(f"  - text: {yamlio.dump_scalar(item['text'])}")
        lines.append(f"    verified: {yamlio.dump_scalar(item['verified'])}")
    return "\n".join(lines) + "\n"


def _format_gen_block(slot, items):
    """The `.p-gen` block written into a store file on accept() — see the
    module docstring's Raw-file marker convention note."""
    lines = [f'<!-- p-gen:start slot="{slot}" -->']
    lines.append("items:" if items else "items: []")
    for item in items:
        lines.append(f"  - text: {yamlio.dump_scalar(item['text'])}")
        lines.append(f"    verified: {yamlio.dump_scalar(item['verified'])}")
    lines.append("<!-- p-gen:end -->")
    return "\n".join(lines) + "\n"


def _store_has_gen_block(node, slot):
    ref = _pick_store_ref(node)
    if ref is None:
        return False
    abs_path = _resolve_permitted_target(ref["relpath"])
    if abs_path is None:
        return False
    try:
        text = abs_path.read_text(encoding="utf-8")
    except OSError:
        return False
    return f'<!-- p-gen:start slot="{slot}" -->' in text


def _pick_store_ref(node):
    """Same AD-1-style target choice as capture.py's _pick_note_ref: the
    node's first unsealed `.list.md` ref, else its first unsealed ref."""
    refs = node.get("longterm_refs") or []
    unsealed = [r for r in refs if not r.get("sealed")]
    if not unsealed:
        return None
    for ref in unsealed:
        if str(ref.get("relpath", "")).endswith(".list.md"):
            return ref
    return unsealed[0]


def _resolve_permitted_target(relpath):
    """FR-9: independent, defense-in-depth containment + seal re-check on
    the resolved absolute path — mirrors capture.py's own helper."""
    if not relpath:
        return None
    lt_resolved = paths.LT.resolve()
    candidate = (paths.LT / relpath).resolve()
    try:
        candidate.relative_to(lt_resolved)
    except ValueError:
        return None
    if not candidate.is_file():
        return None
    if seal.is_sealed(paths.store_rel(candidate)):
        return None
    return candidate


def _atomic_write(path: Path, text: str):
    """Write text to path via temp-file + os.replace — never a half file.
    Creates parent directories as needed (FR-11: this module owns and
    creates its own Sandbox working directories, unlike _sealed.yaml)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=str(path.parent), prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        os.replace(tmp_name, str(path))
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise

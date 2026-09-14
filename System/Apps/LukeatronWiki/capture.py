"""
capture.py — the fixed quick-capture form's write path.

One of exactly two modules in this app permitted to write into Memory/Long-Term/
(the other is enrich.py's accept()). Granted by Luke 2026-09-11 (registry D5,
Rule Exceptions row 1 against PY-12/API-5): the click IS the approval — no
agent call, no !Checkpoint call anywhere in this module (FR-7/AC-9).

capture_submit() performs AT MOST TWO writes, in this fixed order:
  (a) append one row to _queue.yaml, from a fixed template (FR-1a);
  (b) if `note` is given, append it byte-for-byte to the chosen page's first
      unsealed store list file, under a dated heading marked `.p-luke`
      (FR-1b, AD-1).

Both writes go through an atomic write-to-temp-then-replace so a crash or a
disk error can never leave a store file half-written (spec "Atomicity").

Atomicity decision (documented, per the build brief): the two writes are NOT
one transaction. If (a) lands and (b) then fails for any reason, the queue
row is kept — rolling it back would itself be a second, riskier Long-Term
write, and an orphaned "queued" row is harmless and human-recoverable,
whereas rolling back is not obviously safer. The failure is reported, never
swallowed: the returned dict's "ok" is False, "error" names what failed, and
"writes" lists exactly what actually landed on disk. When the note's target
can't be resolved at all (FR-8's structural check), the WHOLE submission is
refused before either write executes — no half-done state is possible for
that failure mode.
"""

import datetime as dt
import os
import re
import tempfile
from pathlib import Path

try:
    from . import library, paths, seal, yamlio
except ImportError:  # pragma: no cover - fallback for direct/test execution
    import library
    import paths
    import seal
    import yamlio


_VALID_INTENTS = ("read", "watch", "write")


# ============================================================================
# Public API
# ============================================================================


def capture_submit(title, kind, intent, source, page, note=None):
    """
    The quick-capture form's one entry point.

    Args:
        title, kind, source: free text, written verbatim into the queue row.
        intent: must be "read", "watch", or "write" (FR-2/AC-2).
        page: a node slug from library.list_nodes() — the dropdown's only
              source (FR-3/FR-9/AC-3). Never guessed, never created.
        note: optional. If given, appended byte-for-byte to page's store
              file (FR-6/AC-5).

    Returns:
        {"ok": bool, "error": str|None, "writes": [relpath, ...]}
    """
    if intent not in _VALID_INTENTS:
        return {
            "ok": False,
            "error": f"invalid intent {intent!r}: must be one of {_VALID_INTENTS}",
            "writes": [],
        }

    node = _find_page_node(page)
    if node is None:
        return {
            "ok": False,
            "error": f"page not found (or sealed): {page!r} — must be an existing, unsealed node",
            "writes": [],
        }

    # FR-8: structural target validation, resolved and checked BEFORE any
    # write executes — not caught after a write fails. Only two targets are
    # ever permitted: QUEUE_YAML, and page's own resolved, unsealed store
    # file (only when a note is given at all).
    note_target_abs = None
    if note:
        ref = _pick_note_ref(node)
        if ref is None:
            return {
                "ok": False,
                "error": f"page {page!r} has no unsealed store file to write the note to",
                "writes": [],
            }
        note_target_abs = _resolve_permitted_target(ref["relpath"])
        if note_target_abs is None:
            return {
                "ok": False,
                "error": "note target does not resolve to a safe, unsealed path under Memory/Long-Term/",
                "writes": [],
            }

    # ---- Load queue state (FR-10: graceful create on true absence only) ----
    today = dt.date.today().isoformat()
    if paths.QUEUE_YAML.exists():
        try:
            raw_queue_text = paths.QUEUE_YAML.read_text(encoding="utf-8")
        except OSError as exc:
            return {"ok": False, "error": f"_queue.yaml could not be read: {exc}", "writes": []}
        data = yamlio.parse(raw_queue_text)
        items = data.get("items") if isinstance(data, dict) else None
        if not isinstance(items, list):
            # A malformed, hand-edited file is a different failure mode than
            # "missing" — FR-10 only asks us to self-heal true absence.
            # Refusing here (rather than clobbering an existing file's
            # content) fails closed per CLAUDE.md's Failure Handling ladder.
            return {
                "ok": False,
                "error": "_queue.yaml exists but has no top-level items: list — refusing to guess",
                "writes": [],
            }
    else:
        # FR-10: create a minimal, valid document with proper structure.
        # The recreated document includes all header keys from the real file
        # to be consistent with its expected shape. The items: list is
        # formatted as a block list (not inline "[]") so the first appended
        # row is a normal, valid nested list item.
        raw_queue_text = (
            "wiki: LukeatronWiki\n"
            "type: read-watch-write-queue\n"
            f"last_updated: {today}\n"
            "count: 0\n"
            "\n"
            "items:\n"
        )
        items = []

    new_id = _next_queue_id(items)
    row_text = (
        "\n"
        f"  - id: {new_id}\n"
        f"    title: {_quote(title)}\n"
        f"    kind: {kind}\n"
        f"    intent: {intent}\n"
        f"    status: queued\n"
        f"    source: {_quote(source)}\n"
        f"    page: {page}\n"
        f"    added: {today}\n"
        '    notes: ""\n'
    )
    new_queue_text = raw_queue_text.rstrip("\n") + "\n" + row_text

    # Update the count field to reflect the new item count (FR-1, AC-1 determinism).
    # The count must stay accurate so the file remains consistent.
    new_count = len(items) + 1
    new_queue_text = re.sub(
        r"^count: \d+$",
        f"count: {new_count}",
        new_queue_text,
        count=1,
        flags=re.MULTILINE,
    )

    writes = []
    try:
        _atomic_write(paths.QUEUE_YAML, new_queue_text)
    except OSError as exc:
        return {"ok": False, "error": f"failed to write _queue.yaml: {exc}", "writes": []}
    writes.append(paths.store_rel(paths.QUEUE_YAML))

    if note:
        try:
            orig_store_text = note_target_abs.read_text(encoding="utf-8")
        except OSError as exc:
            return {
                "ok": False,
                "error": f"queue row written, but the note's store file could not be read: {exc}",
                "writes": writes,
            }
        block = (
            f"\n## {today}\n"
            "<!-- p-luke:start -->\n"
            f"{note}\n"
            "<!-- p-luke:end -->\n"
        )
        new_store_text = orig_store_text.rstrip("\n") + "\n" + block.lstrip("\n")
        try:
            _atomic_write(note_target_abs, new_store_text)
        except OSError as exc:
            return {
                "ok": False,
                "error": f"queue row written, but the note write failed: {exc}",
                "writes": writes,
            }
        writes.append(paths.store_rel(note_target_abs))

    return {"ok": True, "error": None, "writes": writes}


# ============================================================================
# Internal helpers
# ============================================================================


def _find_page_node(page):
    """FR-3/FR-9: the page dropdown's only source is library.list_nodes()."""
    for node in library.list_nodes():
        if node.get("slug") == page:
            return node
    return None


def _pick_note_ref(node):
    """
    AD-1 target choice: the node's FIRST unsealed `.list.md` longterm_ref,
    else its first unsealed ref of any kind. None if no unsealed ref exists.
    """
    refs = node.get("longterm_refs") or []
    unsealed = [r for r in refs if not r.get("sealed")]
    if not unsealed:
        return None
    for ref in unsealed:
        if str(ref.get("relpath", "")).endswith(".list.md"):
            return ref
    return unsealed[0]


def _resolve_permitted_target(relpath):
    """
    FR-8/FR-9: resolve a longterm_ref's relpath to an absolute path, refusing
    anything that doesn't land, contained, inside Memory/Long-Term/, as an
    existing unsealed file. This is a second, independent check — capture
    never trusts a single layer (here: the caller's already-seal-filtered
    node) to be the only thing standing between a request and Long-Term.
    """
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


def _next_queue_id(items):
    """FR-5: the next free q-NNN, computed from the current queue state."""
    import re

    max_n = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        match = re.match(r"^q-(\d+)$", str(item.get("id", "")))
        if match:
            max_n = max(max_n, int(match.group(1)))
    return f"q-{max_n + 1:03d}"


def _quote(value):
    """Fixed-template double-quoting, matching _queue.yaml's existing style."""
    s = "" if value is None else str(value)
    escaped = s.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def _atomic_write(path: Path, text: str):
    """Write text to path via temp-file + os.replace — never a half file."""
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

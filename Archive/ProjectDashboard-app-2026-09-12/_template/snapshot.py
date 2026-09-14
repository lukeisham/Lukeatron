"""Build the offline snapshot — one self-contained `.html` (the snapshot spec).

Runs the same `stores -> model` pass every face runs, then inlines the board object and
the entire Monitor front end (never `unblock` — AD-1) into one file with no external
reference of any kind (FR-1). This is the one place that turns `app/monitor` +
`app/shared` from a set of ES modules served over HTTP into a single script a browser can
run from `file://`, so AC-1 holds even where module-script loading is itself blocked by
CORS under `file://`.

Nothing here derives anything. `_bundle_monitor_js` is a mechanical source transform —
strip `import`/`export`, wrap each file in an IIFE, concatenate in dependency order — not
a second renderer. `stores` and `model` are read fresh from disk and handed to the exact
same front end the live server ships; that identity is the whole point of the SR-6
exception (documentation spec D-1), and it is why nothing in this file may re-derive a
value `model.build_board` already returned.

Two call sites want the same `today`/`build_time` so the snapshot and the brief (`brief.py`,
not yet built — B-9) are never of different ages (FR-10, AC-7): `build_snapshot_html`
takes both as parameters rather than reading the clock itself, so a future joint driver can
compute one pair of values and pass them to both faces. `main()` below is this file's own
standalone entry point, reading the clock once, for use until that driver exists.
"""

from __future__ import annotations

import argparse
import json
import os
import paths
import posixpath
import re
import sys
from datetime import date, datetime
from pathlib import Path

import model
import stores
from server import _prepare_payload  # SR-4: the one place board->JSON shaping happens

# snapshot.py sits three levels under _Lukeatron, same depth as server.py, whether this
# project lives at System/Sandbox/ProjectDashboard/ (today) or System/Apps/ProjectDashboard/
# (documentation spec D-9, after Phase 4) — PY-5: anchored to this file, never the cwd.
def lukeatron_root() -> Path:
    """The Lukeatron root, resolved on demand.

    A function, not a module-level constant: resolving it touches the filesystem,
    and PY-3 requires import to be free of side effects. It also has to be — a
    TEST copy raises from `find_lukeatron_root` by design, so resolving at import
    made this module unimportable there.
    """
    return paths.find_lukeatron_root()
APP_DIR = Path(__file__).resolve().parent / "app"
SHARED_DIR = APP_DIR / "shared"
MONITOR_DIR = APP_DIR / "monitor"

# OQ-1 in the spec is still open — this is its own stated default, not a decision made here.
def default_output() -> Path:
    """Where the snapshot is written when the caller names no path. Lazy for the
    same reason as `lukeatron_root` above."""
    return lukeatron_root() / "Outbox" / "board-snapshot.html"


# ---------------------------------------------------------------------------
# The JS bundle (AD-1: monitor modules only, never unblock's). Every module
# listed here is read and transformed byte-for-byte from app/ — no line of
# rendering logic is retyped (see module docstring).
# ---------------------------------------------------------------------------

_REAL_MODULES: dict[str, Path] = {
    "shared/dom.js": SHARED_DIR / "dom.js",
    "shared/format.js": SHARED_DIR / "format.js",
    "monitor/geometry.js": MONITOR_DIR / "geometry.js",
    "monitor/lattice.js": MONITOR_DIR / "lattice.js",
    "monitor/colour.js": MONITOR_DIR / "colour.js",
    "monitor/cube-defs.js": MONITOR_DIR / "cube-defs.js",
    "monitor/occlusion.js": MONITOR_DIR / "occlusion.js",
    "monitor/board-view.js": MONITOR_DIR / "board-view.js",
    "monitor/list-view.js": MONITOR_DIR / "list-view.js",
    "monitor/week-view.js": MONITOR_DIR / "week-view.js",
    "monitor/opened-stack.js": MONITOR_DIR / "opened-stack.js",
    "monitor/ticker.js": MONITOR_DIR / "ticker.js",
    "monitor/monitor.js": MONITOR_DIR / "monitor.js",
}

# The one substitution this module makes (FR-2's "the same front end reads live" holds for
# everything except this seam): `shared/board-client.js` centralises the live face's single
# `fetch("/api/board.json")` call (JS-5) precisely so an offline consumer can swap it — this
# is that swap, not a second implementation of anything `board-client.js` itself does. FR-1
# forbids `fetch(` in the output, so the real file is never read; this replaces it, same
# export name and shape (an async function returning the board), reading the object this
# build already inlined instead of the network.
_BOARD_CLIENT_KEY = "shared/board-client.js"
_BOARD_CLIENT_SHIM = (
    "async function fetchBoard() {\n"
    "  return window.__SNAPSHOT_BOARD__;\n"
    "}\n"
    "module.fetchBoard = fetchBoard;"
)

_IMPORT_RE = re.compile(r'^import\s*\{\s*(?P<names>[^}]*)\}\s*from\s*"(?P<spec>[^"]+)"\s*;?\s*$', re.MULTILINE)
_EXPORT_RE = re.compile(r"^export\s+(?:(async)\s+)?(function|const|class)\s+([A-Za-z0-9_$]+)", re.MULTILINE)

# FR-5: the wiki door is absent offline — it would be dead away from the laptop, and it is
# also a literal `http://` reference that FR-7's self-scan must never let through. monitor.js
# hardcodes it unconditionally with no toggle (it is a live-only door, and rightly so — the
# live front end has no other reason to know about faces); this narrow, asserted substitution
# is snapshot.py's own bundling step, not an edit to the module on disk that B-6 shipped.
_WIKI_DOOR_RE = re.compile(r'^\s*const wikiDoor = el\("a".*?\);\s*$', re.MULTILINE)
_WIKI_DOOR_REPLACEMENT = "  const wikiDoor = null; // FR-5: absent offline (snapshot.py)"

# FR-4/FR-5: the snapshot is a frozen, read-only face — "take this to Unblock" is a
# door to the one module this bundle never includes (`unblock/` is absent from
# _REAL_MODULES above), so left unsubstituted it would be a live-looking button
# that silently does nothing when clicked offline. Same treatment as the wiki
# door: a narrow, asserted substitution in this bundling step, not an edit to the
# module opened-stack.js ships live.
_UNBLOCK_DOOR_RE = re.compile(r'const unblockBtn = el\(.*?"take this to Unblock"\s*\);', re.DOTALL)
_UNBLOCK_DOOR_REPLACEMENT = (
    'const unblockBtn = null; // FR-4/FR-5: absent offline (snapshot.py) — no write door in a frozen face'
)

# The one XML namespace URI in the bundle (`shared/dom.js`, SVG-2) — not a network reference,
# and the sole documented exception to the "no http://" self-scan below.
_ALLOWED_HTTP_LITERAL = "http://www.w3.org/2000/svg"


def _mangle(key: str) -> str:
    return "MOD_" + re.sub(r"[^A-Za-z0-9_]", "_", key)


def _resolve_spec(current_key: str, spec: str) -> str:
    base = posixpath.dirname(current_key)
    return posixpath.normpath(posixpath.join(base, spec))


def _rewrite_imports(key: str, text: str, deps: set[str]) -> str:
    def repl(m: re.Match[str]) -> str:
        target = _resolve_spec(key, m.group("spec"))
        deps.add(target)
        return f"const {{ {m.group('names').strip()} }} = {_mangle(target)};"

    return _IMPORT_RE.sub(repl, text)


def _strip_exports(text: str) -> tuple[str, list[str]]:
    names: list[str] = []

    def repl(m: re.Match[str]) -> str:
        names.append(m.group(3))
        return f"async {m.group(2)} {m.group(3)}" if m.group(1) else f"{m.group(2)} {m.group(3)}"

    return _EXPORT_RE.sub(repl, text), names


def _transform_module(key: str, path: Path, deps: dict[str, set[str]]) -> tuple[str, list[str]]:
    """Returns (body, exported_names) for one real module: imports rewritten to
    reference already-defined sibling IIFEs, `export` keywords stripped. Raises if
    anything that looks like an unhandled `import`/`export` survives the transform
    (PY-6: fail loud rather than ship broken JS the next time a source file's style
    drifts from what this bundler was written against)."""
    raw = path.read_text(encoding="utf-8")
    own_deps: set[str] = set()
    rewritten = _rewrite_imports(key, raw, own_deps)
    deps[key] = own_deps
    body, export_names = _strip_exports(rewritten)

    if key == "monitor/monitor.js":
        body, count = _WIKI_DOOR_RE.subn(_WIKI_DOOR_REPLACEMENT, body)
        if count != 1:
            raise RuntimeError(
                f"snapshot.py: expected exactly one wiki-door line in monitor.js, found {count} "
                "— FR-5's substitution no longer matches; update _WIKI_DOOR_RE"
            )

    if key == "monitor/opened-stack.js":
        body, count = _UNBLOCK_DOOR_RE.subn(_UNBLOCK_DOOR_REPLACEMENT, body)
        if count != 1:
            raise RuntimeError(
                f"snapshot.py: expected exactly one unblock-door button in opened-stack.js, found "
                f"{count} — FR-4/FR-5's substitution no longer matches; update _UNBLOCK_DOOR_RE"
            )

    if re.search(r"^\s*import\s", body, re.MULTILINE):
        raise RuntimeError(f"snapshot.py: unhandled `import` survived transforming {key}")
    if re.search(r"\bexport\b", body):
        raise RuntimeError(f"snapshot.py: unhandled `export` survived transforming {key}")
    return body, export_names


def _topological_order(deps: dict[str, set[str]]) -> list[str]:
    order: list[str] = []
    visited: set[str] = set()
    in_progress: set[str] = set()

    def visit(node: str) -> None:
        if node in visited:
            return
        if node in in_progress:
            raise RuntimeError(f"snapshot.py: import cycle detected at {node!r}")
        in_progress.add(node)
        for dep in sorted(deps.get(node, ())):
            visit(dep)
        in_progress.discard(node)
        visited.add(node)
        order.append(node)

    for node in sorted(deps):
        visit(node)
    return order


def _wrap_module(key: str, body: str, export_names: list[str]) -> str:
    exports = "\n".join(f"  module.{name} = {name};" for name in export_names)
    parts = ["  const module = {};", body]
    if exports:
        parts.append(exports)
    parts.append("  return module;")
    inner = "\n".join(parts)
    return f"const {_mangle(key)} = (function () {{\n{inner}\n}})();"


def bundle_monitor_js() -> str:
    """Concatenates `app/shared` + `app/monitor` into one script, dependency-first,
    with `board-client.js` swapped for the inlined-data shim (see module docstring)
    and the wiki door removed (FR-5). No rendering logic is written here — every
    module's body is the real file's own text, transformed only at the import/export
    seam."""
    deps: dict[str, set[str]] = {_BOARD_CLIENT_KEY: set()}
    bodies: dict[str, str] = {_BOARD_CLIENT_KEY: _BOARD_CLIENT_SHIM}
    exports: dict[str, list[str]] = {_BOARD_CLIENT_KEY: []}

    for key, path in _REAL_MODULES.items():
        bodies[key], exports[key] = _transform_module(key, path, deps)

    order = _topological_order(deps)
    return "\n".join(_wrap_module(key, bodies[key], exports[key]) for key in order)


# ---------------------------------------------------------------------------
# CSS (AD-1: monitor's own stylesheets + tokens.css only, never unblock's two)
# ---------------------------------------------------------------------------

# monitor.css split by component (CSS-1) — every file index.html loads for
# Monitor, in the same order, so a rule added to any one of them reaches the
# snapshot too rather than only the live face.
_MONITOR_CSS_FILES = (
    "monitor.css",
    "board-view.css",
    "list-view.css",
    "week-view.css",
    "ticker.css",
    "opened-stack.css",
)


def bundle_css() -> str:
    tokens = (SHARED_DIR / "tokens.css").read_text(encoding="utf-8")
    monitor = "\n\n".join((MONITOR_DIR / name).read_text(encoding="utf-8") for name in _MONITOR_CSS_FILES)
    # FR-3's stamp banner: styled with existing tokens only (no colour literal —
    # documentation spec's "colours live in exactly one file" binds here too).
    stamp = (
        "#snapshot-stamp {\n"
        "  background: var(--panel);\n"
        "  color: var(--ink);\n"
        "  border-bottom: 1px solid var(--line);\n"
        "  padding: var(--space-2) var(--space-4);\n"
        "  font-family: var(--font-body);\n"
        "  font-size: var(--font-size-body);\n"
        "  text-align: center;\n"
        "}\n"
        "@media print {\n"
        "  #snapshot-stamp { display: none; }\n"
        "}"
    )
    return f"{tokens}\n\n{monitor}\n\n{stamp}"


# ---------------------------------------------------------------------------
# The board object (FR-2) — same call every face makes (model.build_board),
# shaped through the exact function server.py's live /api/board.json uses,
# so the inlined JSON is the same shape server.py would have sent (SR-4).
# ---------------------------------------------------------------------------


def _board_json_from_board(board: model.Board) -> str:
    payload = _prepare_payload(board)
    text = json.dumps(payload)
    # This text is about to sit inside a <script> element — JSON allows a literal
    # "</script" inside a string value (a task action naming it, say), which HTML
    # would read as closing the tag early. Guarded here, not in `_prepare_payload`,
    # since this is an HTML-embedding concern, not a JSON-shaping one.
    return text.replace("</script", "<\\/script")


def _board_json(*, today: date) -> str:
    sources = stores.load_board_sources(lukeatron_root())
    board = model.build_board(sources, today=today)
    return _board_json_from_board(board)


# ---------------------------------------------------------------------------
# The self-scan (FR-7) — fails the build non-zero if anything that looks like
# a network reference reaches the output, with one documented exception: the
# SVG namespace URI (SVG-2), which browsers never fetch.
# ---------------------------------------------------------------------------


def find_external_references(html_text: str) -> list[str]:
    findings: list[str] = []
    scrubbed = html_text.replace(_ALLOWED_HTTP_LITERAL, "")
    for token in ("http://", "https://"):
        if token in scrubbed:
            findings.append(token)
    if "fetch(" in html_text:
        findings.append("fetch(")
    return findings


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------

_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Project Dashboard — Snapshot</title>
  <style>
{css}
  </style>
</head>
<body>
  <div id="snapshot-stamp" role="note">{stamp_text}</div>
  <main id="monitor-root" aria-label="Monitor"></main>
  <script type="application/json" id="board-data">{board_json}</script>
  <script>
window.__SNAPSHOT_BOARD__ = JSON.parse(document.getElementById("board-data").textContent);
{bundle}
  </script>
</body>
</html>
"""


def build_snapshot_html(*, today: date, build_time: datetime, board: model.Board | None = None) -> str:
    """The one function `build_faces.py` (FR-10's joint driver) and this file's
    own `main()` both call — `today` and `build_time` come from the caller so
    the snapshot and the brief can share one clock reading (AC-7). `board`
    lets a caller that already ran `stores.load_board_sources` ->
    `model.build_board` (the joint driver) hand the same object in rather than
    this function reading the store a second time; `main()` below leaves it
    unset, so it still derives its own board when run standalone."""
    stamp_text = f"SNAPSHOT — as at {build_time.strftime('%Y-%m-%d %H:%M')} — read-only, no network"
    html_text = _TEMPLATE.format(
        css=bundle_css(),
        stamp_text=stamp_text,
        board_json=_board_json_from_board(board) if board is not None else _board_json(today=today),
        bundle=bundle_monitor_js(),
    )
    findings = find_external_references(html_text)
    if findings:
        raise RuntimeError(f"snapshot.py: external reference(s) found in output: {findings} (FR-7)")
    return html_text


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--out", type=Path, default=default_output(),
        help=f"output .html path (default: {default_output()})",
    )
    args = parser.parse_args()

    build_time = datetime.now()
    try:
        html_text = build_snapshot_html(today=build_time.date(), build_time=build_time)
    except Exception as exc:  # noqa: BLE001 — PY-6: report and exit non-zero, never a silent skip
        print(f"snapshot.py: build failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(html_text, encoding="utf-8")
    print(f"snapshot.py: wrote {args.out} ({len(html_text):,} bytes, as at {build_time.isoformat()})")


if __name__ == "__main__":
    main()

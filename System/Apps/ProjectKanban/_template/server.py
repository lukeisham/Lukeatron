"""Thin HTTP routing for ProjectKanban. See server.spec.md for the architecture.

Q11 settled that the browser draws the board, so this module moves data and
owns no rules (documentation.spec.md §1's `model -> server` row): a handler
parses input, calls exactly one data function, and shapes the response. No
derivation happens here — that is `model.py`'s job; `writes.py` is the only
module that mutates anything, and this is its only caller (FR-9).

The sibling interfaces this module routes to:

    paths.find_lukeatron_root()                                        -> Path
    stores.load_board_sources(lukeatron_root)                          -> BoardSources
    model.build_board(sources.projects, *, today)                      -> Board
    writes.set_cell(root, *, project_id, row, column, value, mtime)    -> EditResult
    writes.append_note(root, *, project_id, section, text, mtime)      -> NoteResult

`model` and `writes` are imported inside the handlers that need them, not at
module level, so importing this module stays free of side effects (PY-3) and
a missing sibling module fails inside the one request that needed it, not at
startup.
"""

from __future__ import annotations

import dataclasses
import json
import mimetypes
import socketserver
import sys
import urllib.parse
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

import paths

APP_DIR = Path(__file__).resolve().parent / "app"

HOST = "127.0.0.1"  # AD server.spec.md FR-2: never 0.0.0.0
PORT = 8789  # 8787 is the wiki viewer. Takes over :8789 from the retired ProjectDashboard.
MAX_BODY_BYTES = 65536  # SR-3: no unbounded read of a request body

# FR-5: the field names a caller may name on an edit, and which of writes.py's
# functions each routes to. "status"/"due"/"owner"/"kind" are one cell on an
# existing Next Actions row (writes.set_cell); "note" appends a line to
# notes.md (writes.append_note). Fixed here, not derived from writes.py, so a
# rename over there is a loud ValueError here, never a silent drift (SR-4's
# "grep before copying" cousin: it is the single place the request shape is
# spelled out for `board`/`controls`/`project` to read).
_CELL_FIELDS = ("status", "due", "owner", "kind")
_NOTE_FIELD = "note"
_EDIT_FIELDS = _CELL_FIELDS + (_NOTE_FIELD,)


# ---------------------------------------------------------------------------
# Error registry (FR-6, API-3) — every failure response names one of these
# codes. D-14/SR-9: the server sends a code, never a sentence; the browser
# is where the words for Luke get written. `field` is the one allowed extra
# — it names which request field was bad, so the caller can act on it, and is
# itself just a field name, not a composed sentence.
# ---------------------------------------------------------------------------

ERROR_STATUS: dict[str, int] = {
    "bad_request": 400,
    "fence_violation": 403,
    "forbidden": 403,
    "project_not_found": 404,
    "row_not_found": 404,
    "not_found": 404,
    "method_not_allowed": 405,
    "stale_mtime": 409,
    "linked_row": 409,
    "table_corruption": 422,
    "internal": 500,
}


def send_error(handler: BaseHTTPRequestHandler, code: str, *, field: str | None = None) -> None:
    """The one place a failure response is built (API-3)."""
    status = ERROR_STATUS[code]
    body: dict[str, Any] = {"error": code}
    if field is not None:
        body["field"] = field
    _send_json(handler, status, body)


def _log_failure(handler: BaseHTTPRequestHandler, exc: Exception) -> None:
    """API-6/FR-8: the cause is logged server-side with method and path; the
    client only ever sees a registry error via send_error, never this."""
    print(f"[server] {handler.command} {handler.path} failed: {exc}", file=sys.stderr)


# ---------------------------------------------------------------------------
# JSON shaping (FR-4) — every field on Board/ProjectView/TaskView/Guessable
# reaches the client verbatim by walking dataclasses generically rather than
# hand-listing fields, so a field added to `model.py` reaches the browser
# for free instead of silently vanishing at this seam.
# ---------------------------------------------------------------------------


def _prepare_payload(value: Any) -> Any:
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        return _prepare_payload(dataclasses.asdict(value))
    if isinstance(value, dict):
        return {k: _prepare_payload(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_prepare_payload(v) for v in value]
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    return value


def _send_json(handler: BaseHTTPRequestHandler, status: int, payload: Any) -> None:
    body = json.dumps(_prepare_payload(payload)).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _read_json_body(handler: BaseHTTPRequestHandler) -> tuple[dict[str, Any], str | None]:
    """Parse the request body as a JSON object. Returns (body, None) on
    success, or ({}, field_name) naming what was wrong so the caller can
    build a 400 without re-parsing (API-4)."""
    try:
        length = int(handler.headers.get("Content-Length", 0) or 0)
    except ValueError:
        return {}, "content-length"
    if length > MAX_BODY_BYTES:
        return {}, "content-length"
    raw = handler.rfile.read(length) if length else b""
    try:
        parsed = json.loads(raw or b"{}")
    except json.JSONDecodeError:
        return {}, "body"
    if not isinstance(parsed, dict):
        return {}, "body"
    return parsed, None


# ---------------------------------------------------------------------------
# GET /api/board.json (FR-4, FR-7, AD-1) — one clock reading per call, no
# cache: two sequential GETs always run stores -> model fresh, so a file
# changed in between is reflected on the very next request.
# ---------------------------------------------------------------------------


def _handle_board(handler: BaseHTTPRequestHandler) -> None:
    try:
        import model  # deferred: see module docstring

        import stores

        today = date.today()  # AD-1: the one clock reading for this whole build
        sources = stores.load_board_sources(paths.find_lukeatron_root())
        board = model.build_board(sources.projects, today=today)
    except Exception as exc:  # noqa: BLE001 — API-6: one boundary catch, never a raw
        # traceback or a dropped connection reaches the client.
        _log_failure(handler, exc)
        return send_error(handler, "internal")
    _send_json(handler, 200, board)


# ---------------------------------------------------------------------------
# GET /api/board-changed.json (wishlist #5) — deliberately NOT a call to
# stores.load_board_sources/model.build_board: this is the stat-only check
# (stores.latest_registry_mtime) a client can poll every few seconds without
# paying for a full registry parse on every tick. auto-refresh.js is the
# only caller (server.spec.md's own "one handler, one data function" rule
# still holds — this just calls a cheaper data function than /api/board.json).
# ---------------------------------------------------------------------------


def _handle_board_changed(handler: BaseHTTPRequestHandler) -> None:
    try:
        import stores

        latest_mtime = stores.latest_registry_mtime(paths.find_lukeatron_root())
    except Exception as exc:  # noqa: BLE001 — API-6: same one boundary catch as _handle_board.
        _log_failure(handler, exc)
        return send_error(handler, "internal")
    _send_json(handler, 200, {"latest_mtime": latest_mtime})


# ---------------------------------------------------------------------------
# POST /api/edit (FR-5, FR-6) — validated here (API-4) before `writes` is
# ever imported or called; the mtime/fence/re-parse/record guards themselves
# live in writes.py (writes.spec.md), never duplicated here.
# ---------------------------------------------------------------------------


def _validate_edit_body(body: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    """Returns (parsed, None) on success, or (None, field_name) naming the
    first invalid field. `parsed` carries only what each field needs, so the
    handler below never re-inspects the raw body."""
    project_id = body.get("project_id")
    if not isinstance(project_id, str) or not project_id:
        return None, "project_id"

    mtime = body.get("mtime")
    if not isinstance(mtime, (int, float)) or isinstance(mtime, bool):
        return None, "mtime"

    field = body.get("field")
    if field not in _EDIT_FIELDS:
        return None, "field"

    if field in _CELL_FIELDS:
        row = body.get("row")
        if not isinstance(row, (str, int)) or isinstance(row, bool) or row == "":
            return None, "row"
        value = body.get("value")
        if not isinstance(value, str):
            return None, "value"
        return {"project_id": project_id, "mtime": mtime, "field": field, "row": row, "value": value}, None

    if field == _NOTE_FIELD:
        text = body.get("value")
        if not isinstance(text, str) or not text.strip():
            return None, "value"
        section = body.get("section", "scraps")  # D-9's default; the interface layer's job (writes.py docstring)
        if not isinstance(section, str) or not section:
            return None, "section"
        return {"project_id": project_id, "mtime": mtime, "field": field, "text": text, "section": section}, None

    return None, "field"


def _handle_edit(handler: BaseHTTPRequestHandler) -> None:
    body, bad_field = _read_json_body(handler)
    if bad_field is not None:
        return send_error(handler, "bad_request", field=bad_field)

    parsed, bad_field = _validate_edit_body(body)
    if parsed is None:
        return send_error(handler, "bad_request", field=bad_field)

    try:
        import writes  # deferred: see module docstring — validated above first
    except ImportError as exc:
        _log_failure(handler, exc)
        return send_error(handler, "internal")

    root = paths.find_lukeatron_root()
    field = parsed["field"]
    try:
        if field in _CELL_FIELDS:
            result = writes.set_cell(
                root, project_id=parsed["project_id"], row=parsed["row"],
                column=field, value=parsed["value"], mtime=parsed["mtime"],
            )
        else:
            result = writes.append_note(
                root, project_id=parsed["project_id"], section=parsed["section"],
                text=parsed["text"], mtime=parsed["mtime"],
            )
    except writes.StaleMtimeError as exc:
        _log_failure(handler, exc)
        return send_error(handler, "stale_mtime")
    except writes.LinkedRowError as exc:
        _log_failure(handler, exc)
        return send_error(handler, "linked_row")
    except writes.FenceError as exc:
        _log_failure(handler, exc)
        return send_error(handler, "fence_violation")
    except writes.ProjectNotFoundError as exc:
        _log_failure(handler, exc)
        return send_error(handler, "project_not_found")
    except writes.RowNotFoundError as exc:
        _log_failure(handler, exc)
        return send_error(handler, "row_not_found")
    except writes.TableCorruptionError as exc:
        _log_failure(handler, exc)
        return send_error(handler, "table_corruption")
    except (writes.WritesError, ValueError) as exc:  # noqa: BLE001 — API-6: a value writes.py
        # itself rejected (e.g. a cell value containing '|') is a bad request,
        # not a server fault.
        _log_failure(handler, exc)
        return send_error(handler, "bad_request", field="value")
    except Exception as exc:  # noqa: BLE001 — API-6
        _log_failure(handler, exc)
        return send_error(handler, "internal")

    _send_json(handler, 200, result)


# ---------------------------------------------------------------------------
# Static serving (FR-3) — the front end (GET /, and every file under app/).
# Fenced to APP_DIR on the resolved path: resolve, then compare; never
# prefix-match the string, or a relative path or symlink walks around it.
# ---------------------------------------------------------------------------

_MIME_FALLBACK = "application/octet-stream"


def _resolve_within_app_dir(url_path: str) -> Path | None:
    """The resolved path a request names, or None if it escapes APP_DIR
    entirely (fence check only — existence is a separate question)."""
    target = (APP_DIR / (url_path.lstrip("/") or "index.html")).resolve()
    app_dir_resolved = APP_DIR.resolve()
    if target != app_dir_resolved and app_dir_resolved not in target.parents:
        return None
    return target


def _static_target(url_path: str) -> Path | None:
    """A servable file under APP_DIR for `url_path`, or None if it escapes
    the fence or names something that isn't an existing file."""
    target = _resolve_within_app_dir(url_path)
    return target if target is not None and target.is_file() else None


def _serve_static(handler: BaseHTTPRequestHandler, url_path: str) -> None:
    resolved = _resolve_within_app_dir(url_path)
    if resolved is None:
        return send_error(handler, "forbidden")
    if not resolved.is_file():
        return send_error(handler, "not_found")
    content_type, _ = mimetypes.guess_type(str(resolved))
    body = resolved.read_bytes()
    handler.send_response(200)
    handler.send_header("Content-Type", content_type or _MIME_FALLBACK)
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


# ---------------------------------------------------------------------------
# Route table. Literal API routes are checked before the static-file
# catch-all (API-7) so a request for a known API path is never accidentally
# shadowed by a same-named file under app/.
# ---------------------------------------------------------------------------

_WRITE_ONLY_PATHS = ("/api/edit",)


class Handler(BaseHTTPRequestHandler):
    server_version = "ProjectKanban/1"

    def do_GET(self) -> None:  # noqa: N802 — stdlib method name
        path = urllib.parse.urlsplit(self.path).path
        if path in _WRITE_ONLY_PATHS:  # a GET to a write-only path is refused, nothing runs
            return send_error(self, "method_not_allowed")
        if path == "/api/board.json":
            return _handle_board(self)
        if path == "/api/board-changed.json":
            return _handle_board_changed(self)
        return _serve_static(self, "index.html" if path == "/" else path)

    def do_POST(self) -> None:  # noqa: N802 — stdlib method name
        path = urllib.parse.urlsplit(self.path).path
        if path == "/api/edit":
            return _handle_edit(self)
        if path in ("/api/board.json", "/api/board-changed.json", "/") or _static_target(path) is not None:
            return send_error(self, "method_not_allowed")
        return send_error(self, "not_found")

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002 — stdlib signature
        pass  # FR-8's logging is _log_failure; a healthy request logs nothing extra


# ---------------------------------------------------------------------------
# Binding and startup (FR-2, FR-8). Unlike ProjectDashboard's server, this
# one never bumps to a different port on a bind failure: FR-8 asks for a
# loud, non-zero-exit failure instead, since a silently different port is
# exactly the "launcher appears to do nothing" risk server.spec.md §6 names.
# ---------------------------------------------------------------------------


def create_httpd(host: str = HOST, port: int = PORT) -> socketserver.TCPServer:
    """Bind `host:port` — 127.0.0.1 only, never 0.0.0.0 (FR-2, AC-3)."""
    return socketserver.TCPServer((host, port), Handler)


def run(port: int = PORT) -> None:
    """Callable entry point. A launcher `.command` script calls this after
    opening the browser to it (AC-5); also directly runnable for local
    development."""
    try:
        httpd = create_httpd(port=port)
    except OSError as exc:
        print(f"[server] could not bind {HOST}:{port} — {exc}", file=sys.stderr)
        sys.exit(1)
    print(f"ProjectKanban -> http://{HOST}:{httpd.server_address[1]}")
    print("Ctrl-C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")


if __name__ == "__main__":
    run()

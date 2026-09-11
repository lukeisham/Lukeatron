"""Thin HTTP routing for Project Dashboard. See README.md for the architecture.

Parses a request, calls exactly one data function, shapes the response. No
derivation and no store-format parsing happens here — that is `stores.py` and
`model.py`'s job; `writes.py` is the only module that mutates anything.

SR-6 (the one granted rule exception, see README.md) is why this module serves
JSON and static files rather than building HTML as Python strings the way the
sibling `System/Tools/*/serve.py` viewers do: one vanilla-ES-module front end
renders both the live face and the offline snapshot, so the two are identical
by construction. Writing HTML here would mean writing the renderer twice.

The sibling interfaces this module routes to:

    stores.load_board_sources(lukeatron_root)                      -> BoardSources
    model.build_board(sources, *, today)                           -> Board
    writes.set_cell(root, *, project_id, row, column, value, mtime) -> EditResult
    writes.hand_over(root, *, project_id, row, recipient, mtime)    -> HandOverResult
    writes.append_request(root, *, source, text)                    -> RequestResult
    writes.StaleMtimeError, writes.FenceError

`model` and `writes` are imported inside the handlers that need them, not at
module level. This keeps `server.py` importable with no side effects (PY-3) and
keeps the thin-router boundary honest: this module depends on a sibling only at
the point it actually routes to it.
"""

from __future__ import annotations

import dataclasses
import json
import mimetypes
import os
import paths
import socketserver
import sys
import urllib.parse
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

import stores


def lukeatron_root() -> Path:
    """The Lukeatron root, resolved on demand.

    A function, not a module-level constant: resolving it touches the filesystem,
    and PY-3 requires import to be free of side effects. It also has to be — a
    TEST copy raises from `find_lukeatron_root` by design, so resolving at import
    made this module unimportable there.
    """
    return paths.find_lukeatron_root()


APP_DIR = Path(__file__).resolve().parent / "app"

DEFAULT_PORT = 8789  # OQ-1: leaves :8788 to the old dashboard, :8787 to the wiki viewer
PORT_BUMP_ATTEMPTS = 10
MAX_BODY_BYTES = 65536  # SR-3: no unbounded read of a request body

_EDIT_COLUMNS = ("status", "state", "kind")  # writes.spec.md §2: the only cells this app may set


# ---------------------------------------------------------------------------
# Error registry (FR-3, API-3) — every failure response names one of these,
# and none of them ever carries an exception message or a traceback (FR-8,
# API-6, PY-6): the message is fixed, and the only per-request detail is
# `field`, which names what was wrong so the caller can act on it (AC-3).
# ---------------------------------------------------------------------------

ERRORS: dict[str, tuple[int, str]] = {
    "bad_request": (400, "The request could not be understood."),
    "forbidden": (403, "That path is outside what this server may touch."),
    "not_found": (404, "Nothing is served at that path."),
    "method_not_allowed": (405, "This path does not accept that method."),
    "conflict": (409, "The file changed since it was last read."),
    "internal": (500, "Something went wrong handling the request."),
}


def send_error(handler: BaseHTTPRequestHandler, code: str, *, field: str | None = None) -> None:
    """The one place a failure response is built (FR-3, API-3)."""
    status, message = ERRORS[code]
    body: dict[str, Any] = {"error": code, "message": message}
    if field is not None:
        body["field"] = field
    _send_json(handler, status, body)


def _log_failure(handler: BaseHTTPRequestHandler, exc: Exception) -> None:
    """FR-8: the cause is logged server-side with method and path; the
    client only ever sees a registry error via send_error, never this."""
    print(f"[server] {handler.command} {handler.path} failed: {exc}", file=sys.stderr)


# ---------------------------------------------------------------------------
# JSON shaping — turn whatever stores/model/writes returned into JSON-safe
# data (FR-10). Runs regardless of whether a sibling module returns
# dataclasses (like stores.Field), plain dicts, or a mix of both, so this
# module never needs to know the board object's exact shape to serve it.
#
# String leaves are passed through unescaped: this is a JSON transport, not
# HTML, and every consumer under app/ inserts text via textContent, never
# innerHTML (HTML-6, JS-6) — so the front end already escapes for free at
# the point it reaches the DOM. HTML-escaping here would only teach every
# reader a double-escaped "&amp;" for a literal "&" in a real title.
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
        # stores.SkipReport carries a real Path (FR-7's "one bad project,
        # named" — board.skipped reaches every face), which json.dumps
        # cannot serialize on its own.
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
    build a 400 without re-parsing (AC-3, API-4)."""
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
# GET /api/board.json (FR-1) — stores -> model, read fresh every request.
# No mtime-keyed cache yet: the risk this spec names (Risks table) is real
# but unmeasurable until model.py exists to time against: adding a cache
# now would be optimising before measuring (SR-3's own rule, "measure
# before optimising further" per this spec's Plan step 6).
# ---------------------------------------------------------------------------


def _handle_board(handler: BaseHTTPRequestHandler) -> None:
    try:
        import model  # deferred: see module docstring

        sources = stores.load_board_sources(lukeatron_root())
        board = model.build_board(sources, today=date.today())
    except Exception as exc:  # noqa: BLE001 — API-6: one boundary catch, never a raw
        # traceback or a dropped connection reaches the client, including a
        # missing model.py (ImportError, a subclass of Exception) before B-3 lands.
        _log_failure(handler, exc)
        return send_error(handler, "internal")
    _send_json(handler, 200, board)


# ---------------------------------------------------------------------------
# POST /api/edit — a narrow write: one Next Actions cell (Status, State or
# Kind), or a hand-over (Kind 4 -> 1 plus its recipient, writes FR-6), never
# a whole-file rewrite. Validated here (API-4); the mtime guard and the
# actual mutation are writes.py's job (FR-2, FR-4 of server.spec.md).
# ---------------------------------------------------------------------------


def _handle_edit(handler: BaseHTTPRequestHandler) -> None:
    body, bad_field = _read_json_body(handler)
    if bad_field is not None:
        return send_error(handler, "bad_request", field=bad_field)

    project_id = body.get("project_id")
    mtime = body.get("mtime")
    action = body.get("action")
    row = body.get("row")

    if not isinstance(project_id, str) or not project_id:
        return send_error(handler, "bad_request", field="project_id")
    if not isinstance(mtime, (int, float)) or isinstance(mtime, bool):
        return send_error(handler, "bad_request", field="mtime")
    if action not in ("set_cell", "hand_over"):
        return send_error(handler, "bad_request", field="action")
    if not isinstance(row, (str, int)) or isinstance(row, bool) or row == "":
        return send_error(handler, "bad_request", field="row")

    if action == "set_cell":
        column = body.get("column")
        value = body.get("value")
        if column not in _EDIT_COLUMNS:
            return send_error(handler, "bad_request", field="column")
        if not isinstance(value, str) or value == "":
            return send_error(handler, "bad_request", field="value")
    else:
        recipient = body.get("recipient")
        if not isinstance(recipient, str) or not recipient:
            return send_error(handler, "bad_request", field="recipient")

    # FR-4 of server.spec.md: validated above, before any of this reaches
    # writes.py. Imported here (not at module level) so validation runs,
    # and is testable, without writes.py needing to exist yet (see module
    # docstring) — and because a request that fails validation should never
    # even import the module that would otherwise mutate something. Its own
    # try/except keeps a missing writes.py from crashing the except clauses
    # below, which reference writes.* exception types that must exist by
    # the time those clauses are evaluated.
    try:
        import writes
    except ImportError as exc:
        _log_failure(handler, exc)
        return send_error(handler, "internal")

    try:
        if action == "set_cell":
            result = writes.set_cell(
                lukeatron_root(), project_id=project_id, row=row,
                column=column, value=value, mtime=mtime,
            )
        else:
            result = writes.hand_over(
                lukeatron_root(), project_id=project_id, row=row,
                recipient=recipient, mtime=mtime,
            )
    except writes.StaleMtimeError as exc:
        _log_failure(handler, exc)
        return send_error(handler, "conflict")
    except writes.FenceError as exc:
        _log_failure(handler, exc)
        return send_error(handler, "forbidden")
    except Exception as exc:  # noqa: BLE001 — API-6
        _log_failure(handler, exc)
        return send_error(handler, "internal")

    _send_json(handler, 200, result)


# ---------------------------------------------------------------------------
# POST /api/request — append one row to Projects/_requests.yaml: "ask an
# agent" from an opened project, or the depot's "dispatch" (documentation
# spec's cross-boundary table: source, what is wanted, timestamp — the
# timestamp is writes.py's to stamp, not the caller's to supply).
# ---------------------------------------------------------------------------


def _handle_request(handler: BaseHTTPRequestHandler) -> None:
    body, bad_field = _read_json_body(handler)
    if bad_field is not None:
        return send_error(handler, "bad_request", field=bad_field)

    source = body.get("source")
    text = body.get("text")
    if not isinstance(source, str) or not source:
        return send_error(handler, "bad_request", field="source")
    if not isinstance(text, str) or not text:
        return send_error(handler, "bad_request", field="text")

    try:
        import writes  # deferred: see module docstring — validated above first
        result = writes.append_request(lukeatron_root(), source=source, text=text)
    except Exception as exc:  # noqa: BLE001 — API-6, including writes.py not existing yet
        _log_failure(handler, exc)
        return send_error(handler, "internal")

    _send_json(handler, 200, result)


# ---------------------------------------------------------------------------
# Static serving — the front end (GET /, and every file under app/). Fenced
# to APP_DIR on the resolved path, mirroring writes.spec.md AD-2's own rule
# for its Memory/Medium-Term/ fence: resolve, then compare; never
# prefix-match the string, or a relative path or symlink walks around it.
# ---------------------------------------------------------------------------

_MIME_FALLBACK = "application/octet-stream"


def _static_target(url_path: str) -> Path | None:
    """Resolve a request path to a file under APP_DIR, or None if it
    escapes that fence or names something that isn't a file."""
    target = (APP_DIR / (url_path.lstrip("/") or "index.html")).resolve()
    try:
        target.relative_to(APP_DIR.resolve())
    except ValueError:
        return None
    return target if target.is_file() else None


def _serve_static(handler: BaseHTTPRequestHandler, url_path: str) -> None:
    target = (APP_DIR / (url_path.lstrip("/") or "index.html")).resolve()
    try:
        target.relative_to(APP_DIR.resolve())
    except ValueError:
        return send_error(handler, "forbidden")
    if not target.is_file():
        return send_error(handler, "not_found")
    content_type, _ = mimetypes.guess_type(str(target))
    body = target.read_bytes()
    handler.send_response(200)
    handler.send_header("Content-Type", content_type or _MIME_FALLBACK)
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


# ---------------------------------------------------------------------------
# Route table. Literal routes are checked before the static-file catch-all
# (API-7) so a request for a known API path is never accidentally served
# (or shadowed) as a file lookup under app/.
# ---------------------------------------------------------------------------

_WRITE_PATHS = ("/api/edit", "/api/request")


class Handler(BaseHTTPRequestHandler):
    server_version = "ProjectDashboard/1"

    def do_GET(self) -> None:  # noqa: N802 — stdlib method name
        path = urllib.parse.urlsplit(self.path).path
        if path in _WRITE_PATHS:  # AC-2: a GET to any write path is refused, nothing runs
            return send_error(self, "method_not_allowed")
        if path == "/api/board.json":
            return _handle_board(self)
        return _serve_static(self, "index.html" if path == "/" else path)

    def do_POST(self) -> None:  # noqa: N802 — stdlib method name
        path = urllib.parse.urlsplit(self.path).path
        if path == "/api/edit":
            return _handle_edit(self)
        if path == "/api/request":
            return _handle_request(self)
        if path == "/api/board.json" or path == "/" or _static_target(path) is not None:
            return send_error(self, "method_not_allowed")
        return send_error(self, "not_found")

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002 — stdlib signature
        pass  # FR-8's logging is _log_failure; a healthy request logs nothing extra


# ---------------------------------------------------------------------------
# Binding and port selection (FR-6). Entry-point concerns proper — argv,
# environment, launching a browser — belong to serve.py (documentation spec
# AD-2); this is the bind-with-auto-bump behaviour FR-6 itself asks for,
# exposed as one function serve.py can call once it exists.
# ---------------------------------------------------------------------------


def create_httpd(port: int) -> socketserver.TCPServer:
    """Bind 127.0.0.1 only (AC-5), bumping the port when it's busy."""
    last_error: OSError | None = None
    for candidate in range(port, port + PORT_BUMP_ATTEMPTS):
        try:
            return socketserver.TCPServer(("127.0.0.1", candidate), Handler)
        except OSError as exc:
            last_error = exc
    raise OSError(
        f"no free port in {port}..{port + PORT_BUMP_ATTEMPTS - 1}"
    ) from last_error


def run(port: int | None = None) -> None:
    """Callable entry point. `serve.py` calls this after its own argv/env
    handling; also directly runnable for local development."""
    chosen = port if port is not None else int(os.environ.get("PROJECT_DASHBOARD_PORT", DEFAULT_PORT))
    httpd = create_httpd(chosen)
    bound_port = httpd.server_address[1]
    print(f"Project Dashboard -> http://127.0.0.1:{bound_port}")
    print("Ctrl-C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")


if __name__ == "__main__":
    run()

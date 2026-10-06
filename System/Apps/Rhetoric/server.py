"""Thin HTTP routing for Rhetoric: static files from app/, one read-only JSON endpoint, and the
Topical Type and Grammar label write routes. Data assembly lives in items.py and every write in
topical.py or grammar.py; this module only parses the request, calls them, and shapes the response
(API-1). Writes are limited to /api/topical/... and /api/grammar/... (granted exceptions to
PY-12/API-5, app-decisions.md); every other write verb is refused."""

from __future__ import annotations

import json
import mimetypes
import re
import socketserver
import sqlite3
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any, Callable

import grammar
import items
import labeltables
import topical

ROOT = Path(__file__).resolve().parent
APP_DIR = ROOT / "app"
DB_PATH = ROOT / "rhetoric.db"

HOST = "127.0.0.1"  # never 0.0.0.0
PORT = 8794  # 8787 wiki, 8789 dashboard, 8793 Storytelling

ERROR_STATUS: dict[str, int] = {
    "bad_request": 400,
    "forbidden": 403,
    "not_found": 404,
    "method_not_allowed": 405,
    "conflict": 409,
    "db_unavailable": 503,
    "internal": 500,
}

_MIME_FALLBACK = "application/octet-stream"

MAX_BODY_BYTES = 1024
MAX_TABLES_BODY_BYTES = 600_000  # one label's tables, every grid full to its limits (labeltables.MAX_*), at up to 3 bytes a character
MAX_TYPE_NAME_LENGTH = 80
MAX_DEFINITION_LENGTH = 300
MAX_INDEX = 100_000
MAX_ID = 999_999_999

# Every write route: (method, path pattern, data function, body reader). The
# data function gets the path's ids, then whatever the body reader returns; a reader returns None for a
# bad body (400). A change answers with its group's fresh tree (WRITE_FAMILIES). All patterns
# are dynamic and anchored, so none can shadow another (API-7); ids are capped so a huge number cannot
# overflow SQLite.
Route = tuple[str, re.Pattern[str], Callable[..., None], Callable[[BaseHTTPRequestHandler], list[Any] | None]]
TOPICAL_ROUTES: list[Route] = [
    ("POST", re.compile(r"^/api/topical/types$"), topical.create_type,
     lambda h: _body_fields(h, [("name", _as_name, True), ("parent_id", _as_id, False)])),
    ("PUT", re.compile(r"^/api/topical/types/(\d{1,9})$"), topical.rename_type, lambda h: _body_fields(h, [("name", _as_name, True)])),
    ("DELETE", re.compile(r"^/api/topical/types/(\d{1,9})$"), topical.delete_type, lambda h: []),
    ("PUT", re.compile(r"^/api/topical/types/(\d{1,9})/position$"), topical.move_type,
     lambda h: _body_fields(h, [("index", _as_index, True), ("parent_id", _as_parent, False)])),
    ("PUT", re.compile(r"^/api/topical/types/(\d{1,9})/devices/(\d{1,9})$"), topical.add_placement, lambda h: _body_fields(h, [("index", _as_index, False)])),
    ("DELETE", re.compile(r"^/api/topical/types/(\d{1,9})/devices/(\d{1,9})$"), topical.remove_placement, lambda h: []),
    ("PUT", re.compile(r"^/api/topical/types/(\d{1,9})/tables$"), topical.set_tables,
     lambda h: _body_fields(h, [("tables", _as_tables, True)], MAX_TABLES_BODY_BYTES)),
]
GRAMMAR_ROUTES: list[Route] = [
    ("POST", re.compile(r"^/api/grammar/labels$"), grammar.create_label,
     lambda h: _body_fields(h, [("name", _as_name, True), ("definition", _as_definition, True), ("parent_id", _as_id, False)])),
    ("PUT", re.compile(r"^/api/grammar/labels/(\d{1,9})$"), grammar.edit_label,
     lambda h: _body_fields(h, [("name", _as_name, True), ("definition", _as_definition, True)])),
    ("DELETE", re.compile(r"^/api/grammar/labels/(\d{1,9})$"), grammar.delete_label, lambda h: []),
    ("PUT", re.compile(r"^/api/grammar/labels/(\d{1,9})/position$"), grammar.move_label,
     lambda h: _body_fields(h, [("index", _as_index, True), ("parent_id", _as_parent, False)])),
    ("PUT", re.compile(r"^/api/grammar/labels/(\d{1,9})/devices/(\d{1,9})$"), grammar.add_placement, lambda h: _body_fields(h, [("index", _as_index, False)])),
    ("DELETE", re.compile(r"^/api/grammar/labels/(\d{1,9})/devices/(\d{1,9})$"), grammar.remove_placement, lambda h: []),
    ("PUT", re.compile(r"^/api/grammar/labels/(\d{1,9})/tables$"), grammar.set_tables,
     lambda h: _body_fields(h, [("tables", _as_tables, True)], MAX_TABLES_BODY_BYTES)),
]
# Each write family: its URL prefix, its routes, the loader for the tree a change answers with, and the answer's key.
WRITE_FAMILIES = [
    ("/api/topical/", TOPICAL_ROUTES, items.load_topical, "topical"),
    ("/api/grammar/", GRAMMAR_ROUTES, items.load_grammar, "grammar"),
]


def send_json(handler: BaseHTTPRequestHandler, status: int, payload: Any) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def send_error(handler: BaseHTTPRequestHandler, code: str) -> None:
    """The one place a failure response is built (API-3): a code, never a sentence or traceback."""
    send_json(handler, ERROR_STATUS[code], {"error": code})


def _log_failure(handler: BaseHTTPRequestHandler, exc: Exception) -> None:
    print(f"[server] {handler.command} {handler.path} failed: {exc!r}", file=sys.stderr)


def _handle_items(handler: BaseHTTPRequestHandler) -> None:
    try:
        payload = items.load_items(handler.server.db_path)  # type: ignore[attr-defined]
    except sqlite3.OperationalError as exc:  # missing/unreadable/corrupt file or schema
        _log_failure(handler, exc)
        return send_error(handler, "db_unavailable")
    except Exception as exc:  # noqa: BLE001 — API-6: log, then a registry error
        _log_failure(handler, exc)
        return send_error(handler, "internal")
    send_json(handler, 200, payload)


def _is_local_request(handler: BaseHTTPRequestHandler) -> bool:
    """The write gate (API-5, TEST-7). The server has no login, so a write must provably come from
    the app's own page: the Host header (defeats DNS rebinding) and any Origin must both be this
    server's own address, which a page on another site cannot forge."""
    port = handler.server.server_address[1]
    host = handler.headers.get("Host", "")
    if host not in (f"127.0.0.1:{port}", f"localhost:{port}"):
        return False
    return handler.headers.get("Origin") in (None, f"http://{host}")


def _as_name(value: Any) -> str | None:
    if not isinstance(value, str) or not 0 < len(value.strip()) <= MAX_TYPE_NAME_LENGTH:
        return None
    return value.strip()


def _as_definition(value: Any) -> str | None:
    if not isinstance(value, str) or not 0 < len(value.strip()) <= MAX_DEFINITION_LENGTH:
        return None
    return value.strip()


def _as_tables(value: Any) -> list[dict[str, Any]] | None:
    """A label's whole list of tables, in canonical form; an empty list (every table removed) is valid."""
    return labeltables.clean(value)


def _as_index(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= MAX_INDEX:
        return None
    return value


def _as_id(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= MAX_ID:
        return None
    return value


def _as_parent(value: Any) -> int | None:
    """A new parent for a move: a Type or label id, or 0 for the top level."""
    if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= MAX_ID:
        return None
    return value


def _body_fields(
    handler: BaseHTTPRequestHandler, fields: list[tuple[str, Callable[[Any], Any], bool]], max_bytes: int = MAX_BODY_BYTES
) -> list[Any] | None:
    """The converted value of each `(field, convert, required)` in the JSON body, in order, or None when the
    body is not a small JSON object whose fields pass (API-4). An optional field that is missing or null gives
    None in its place; one that is present but fails `convert` is a bad body. With every field optional, an
    empty body is fine."""
    try:
        length = int(handler.headers.get("Content-Length") or 0)
    except ValueError:
        return None
    if length == 0 and not any(required for _, _, required in fields):
        return [None] * len(fields)
    try:
        if handler.headers.get_content_type() != "application/json" or not 0 < length <= max_bytes:
            return None
        body = json.loads(handler.rfile.read(length))
    except (ValueError, UnicodeDecodeError):
        return None
    if not isinstance(body, dict):
        return None
    values = []
    for field, convert, required in fields:
        raw = body.get(field)
        if raw is None and not required:
            values.append(None)
            continue
        value = convert(raw)
        if value is None:  # an empty list is a real value, so only None is a failure
            return None
        values.append(value)
    return values


def _apply_change(handler: BaseHTTPRequestHandler, path: str, routes: list[Route], load: Callable[..., Any], key: str) -> None:
    """Runs the one change the route names; the response is the fresh tree for that group."""
    db_path = handler.server.db_path  # type: ignore[attr-defined]
    for method, pattern, change, read_body in routes:
        match = pattern.match(path)
        if method != handler.command or not match:
            continue
        body_arguments = read_body(handler)
        if body_arguments is None:
            return send_error(handler, "bad_request")
        change(db_path, *(int(group) for group in match.groups()), *body_arguments)
        return send_json(handler, 200, {key: load(db_path)})
    send_error(handler, "not_found")


def _handle_write(handler: BaseHTTPRequestHandler) -> None:
    path = urllib.parse.urlsplit(handler.path).path
    family = next((f for f in WRITE_FAMILIES if path.startswith(f[0])), None)
    if family is None:
        return send_error(handler, "method_not_allowed")  # every write outside Topical and Grammar stays refused
    if not _is_local_request(handler):
        return send_error(handler, "forbidden")
    try:
        _apply_change(handler, path, *family[1:])
    except (topical.TopicalError, grammar.GrammarError) as exc:
        send_error(handler, exc.code)
    except sqlite3.OperationalError as exc:  # missing/locked/unwritable database
        _log_failure(handler, exc)
        send_error(handler, "db_unavailable")
    except Exception as exc:  # noqa: BLE001 — API-6: log, then a registry error
        _log_failure(handler, exc)
        send_error(handler, "internal")


def _resolve_within_app_dir(url_path: str) -> Path | None:
    """Resolved target, or None if it escapes APP_DIR. Resolve then compare — never
    prefix-match the string, or `..` and symlinks walk around the fence."""
    target = (APP_DIR / (url_path.lstrip("/") or "index.html")).resolve()
    app_dir = APP_DIR.resolve()
    if target != app_dir and app_dir not in target.parents:
        return None
    return target


def _serve_static(handler: BaseHTTPRequestHandler, url_path: str) -> None:
    try:
        resolved = _resolve_within_app_dir(urllib.parse.unquote(url_path))
        if resolved is None:
            return send_error(handler, "forbidden")
        if not resolved.is_file():
            return send_error(handler, "not_found")
        content_type, _ = mimetypes.guess_type(str(resolved))
        body = resolved.read_bytes()
    except OSError as exc:
        _log_failure(handler, exc)
        return send_error(handler, "internal")
    handler.send_response(200)
    handler.send_header("Content-Type", content_type or _MIME_FALLBACK)
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class Handler(BaseHTTPRequestHandler):
    server_version = "Rhetoric/1"

    def do_GET(self) -> None:  # noqa: N802 — stdlib method name
        path = urllib.parse.urlsplit(self.path).path
        # The API route is checked before the static catch-all so a file under app/ can never shadow it.
        if path == "/api/items":
            return _handle_items(self)
        return _serve_static(self, path)

    def _refuse_write(self) -> None:
        send_error(self, "method_not_allowed")

    do_POST = do_PUT = do_DELETE = _handle_write  # noqa: N815
    do_PATCH = _refuse_write  # noqa: N815

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002 — stdlib signature
        pass  # failures are logged by _log_failure; healthy requests stay silent


class Server(socketserver.TCPServer):
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], db_path: Path) -> None:
        self.db_path = db_path
        super().__init__(address, Handler)


def create_httpd(host: str = HOST, port: int = PORT, db_path: Path = DB_PATH) -> Server:
    return Server((host, port), db_path)


def run(port: int = PORT) -> None:
    """A port collision exits non-zero rather than rebinding elsewhere, so a launcher never
    silently opens the wrong instance."""
    try:
        httpd = create_httpd(port=port)
    except OSError as exc:
        print(f"[server] could not bind {HOST}:{port} — {exc}", file=sys.stderr)
        sys.exit(1)
    with httpd:
        print(f"Rhetoric -> http://{HOST}:{httpd.server_address[1]}")
        print("Ctrl-C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped.")


if __name__ == "__main__":
    run()

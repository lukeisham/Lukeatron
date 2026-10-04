"""Thin HTTP routing for Rhetoric: static files from app/, one read-only JSON endpoint, and the
Topical Type write routes. Data assembly lives in items.py and every write in topical.py; this
module only parses the request, calls them, and shapes the response (API-1). Writes are limited to
/api/topical/... (a granted exception to PY-12/API-5, app-decisions.md); every other write verb is refused."""

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

import items
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
MAX_TYPE_NAME_LENGTH = 80
MAX_INDEX = 100_000

# Every write route: (method, path pattern, data function, body reader). The data function gets
# the path's ids, then whatever the body reader returns; a reader returns None for a bad body (400).
# All patterns are dynamic and anchored, so none can shadow another (API-7); ids are capped so a
# huge number cannot overflow SQLite.
TOPICAL_ROUTES: list[tuple[str, re.Pattern[str], Callable[..., None], Callable[[BaseHTTPRequestHandler], list[Any] | None]]] = [
    ("POST", re.compile(r"^/api/topical/types$"), topical.create_type, lambda h: _body_field(h, "name", _as_name)),
    ("PUT", re.compile(r"^/api/topical/types/(\d{1,9})$"), topical.rename_type, lambda h: _body_field(h, "name", _as_name)),
    ("DELETE", re.compile(r"^/api/topical/types/(\d{1,9})$"), topical.delete_type, lambda h: []),
    ("PUT", re.compile(r"^/api/topical/types/(\d{1,9})/position$"), topical.move_type, lambda h: _body_field(h, "index", _as_index)),
    ("PUT", re.compile(r"^/api/topical/types/(\d{1,9})/devices/(\d{1,9})$"), topical.add_placement, lambda h: _body_field(h, "index", _as_index, required=False)),
    ("DELETE", re.compile(r"^/api/topical/types/(\d{1,9})/devices/(\d{1,9})$"), topical.remove_placement, lambda h: []),
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


def _as_index(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= MAX_INDEX:
        return None
    return value


def _body_field(
    handler: BaseHTTPRequestHandler, field: str, convert: Callable[[Any], Any], required: bool = True
) -> list[Any] | None:
    """`[converted value of the JSON body's `field`]`, or None when the body is not a small JSON
    object whose field passes `convert` (API-4). With `required` off, an empty body gives `[None]`."""
    try:
        length = int(handler.headers.get("Content-Length") or 0)
    except ValueError:
        return None
    if length == 0 and not required:
        return [None]
    try:
        if handler.headers.get_content_type() != "application/json" or not 0 < length <= MAX_BODY_BYTES:
            return None
        body = json.loads(handler.rfile.read(length))
    except (ValueError, UnicodeDecodeError):
        return None
    value = convert(body.get(field)) if isinstance(body, dict) else None
    return None if value is None else [value]


def _apply_topical_change(handler: BaseHTTPRequestHandler, path: str) -> None:
    """Runs the one change the route names; the response is the fresh Topical tree."""
    db_path = handler.server.db_path  # type: ignore[attr-defined]
    for method, pattern, change, read_body in TOPICAL_ROUTES:
        match = pattern.match(path)
        if method != handler.command or not match:
            continue
        body_arguments = read_body(handler)
        if body_arguments is None:
            return send_error(handler, "bad_request")
        change(db_path, *(int(group) for group in match.groups()), *body_arguments)
        return send_json(handler, 200, {"topical": items.load_topical(db_path)})
    send_error(handler, "not_found")


def _handle_topical_write(handler: BaseHTTPRequestHandler) -> None:
    path = urllib.parse.urlsplit(handler.path).path
    if not path.startswith("/api/topical/"):
        return send_error(handler, "method_not_allowed")  # every write outside Topical stays refused
    if not _is_local_request(handler):
        return send_error(handler, "forbidden")
    try:
        _apply_topical_change(handler, path)
    except topical.TopicalError as exc:
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

    do_POST = do_PUT = do_DELETE = _handle_topical_write  # noqa: N815
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

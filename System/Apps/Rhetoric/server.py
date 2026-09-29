"""Thin HTTP routing for Rhetoric: static files from app/ and one read-only JSON endpoint.
See _build/specs/server.spec.md. Data assembly lives in items.py; this module only parses the
request, calls it, and shapes the response (API-1)."""

from __future__ import annotations

import json
import mimetypes
import socketserver
import sqlite3
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

import items

ROOT = Path(__file__).resolve().parent
APP_DIR = ROOT / "app"
DB_PATH = ROOT / "rhetoric.db"

HOST = "127.0.0.1"  # never 0.0.0.0
PORT = 8794  # 8787 wiki, 8789 dashboard, 8793 Storytelling

ERROR_STATUS: dict[str, int] = {
    "forbidden": 403,
    "not_found": 404,
    "method_not_allowed": 405,
    "db_unavailable": 503,
    "internal": 500,
}

_MIME_FALLBACK = "application/octet-stream"


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
        send_error(self, "method_not_allowed")  # the app never writes (PY-12)

    do_POST = do_PUT = do_PATCH = do_DELETE = _refuse_write  # noqa: N815

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

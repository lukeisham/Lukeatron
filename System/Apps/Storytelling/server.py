"""Static HTTP server for Storytelling. Serves files from app/ on 127.0.0.1 only.

GET and HEAD only; no routes, no writes, no directory listing. Rejects path
traversal (../, encoded ../, absolute paths, symlinks out of app/) with 404/403.
Correct MIME types for .js (text/javascript), .css, .html, .svg, .json, .png.
Cache-Control: no-store on every response.

Importable for tests: make_server(port, directory) binds on localhost:port
(port can be 0 in tests), raising OSError if the port is in use.
"""

from __future__ import annotations

import mimetypes
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

APP_DIR = Path(__file__).resolve().parent / "app"
HOST = "127.0.0.1"  # Never 0.0.0.0; must remain fixed as a constant.
PORT = 8793


_MIME_TYPES = {
    ".js": "text/javascript",
    ".css": "text/css",
    ".html": "text/html; charset=utf-8",
    ".svg": "image/svg+xml",
    ".json": "application/json",
    ".png": "image/png",
}


def _resolve_within_app_dir(url_path: str, app_dir: Path) -> Path | None:
    """Return the resolved path if it is within app_dir, or None if it escapes.

    Resolves symlinks and relative paths, then checks if the result remains
    within the app directory. Fenced to app_dir only — existence is separate.
    """
    try:
        target = (app_dir / (url_path.lstrip("/") or "index.html")).resolve()
    except (ValueError, OSError, RuntimeError):
        # An embedded NUL byte or a symlink loop: refuse rather than crash the handler.
        return None
    app_dir_resolved = app_dir.resolve()

    # Check: is target exactly app_dir or is app_dir in target's parents?
    if target == app_dir_resolved:
        return target
    try:
        target.relative_to(app_dir_resolved)
        return target
    except ValueError:
        # target is not under app_dir_resolved
        return None


def _guess_mime_type(file_path: Path) -> str:
    """Return MIME type for a file, using our overrides for correct JS type."""
    suffix = file_path.suffix.lower()
    if suffix in _MIME_TYPES:
        return _MIME_TYPES[suffix]
    guessed, _ = mimetypes.guess_type(str(file_path))
    return guessed or "application/octet-stream"


def _make_handler_class(app_dir: Path) -> type[BaseHTTPRequestHandler]:
    """Create a handler class bound to a specific app_dir.

    This factory allows tests to bind different directories without global state.
    """

    class Handler(BaseHTTPRequestHandler):
        """Minimal GET/HEAD-only handler that serves static files from app/."""

        server_version = "Storytelling/1"

        def do_GET(self) -> None:  # noqa: N802 — stdlib method name
            """Handle GET request: serve the file or return an error."""
            self._serve(allow_body=True)

        def do_HEAD(self) -> None:  # noqa: N802 — stdlib method name
            """Handle HEAD request: same as GET but send headers only."""
            self._serve(allow_body=False)

        def _serve(self, allow_body: bool) -> None:
            """Core serving logic for GET/HEAD."""
            # Extract path, stripping query string and fragment.
            raw_path = self.path.split("?", 1)[0].split("#", 1)[0]

            # Decode URL-encoded characters (once) to catch encoded traversal attempts.
            path = urllib.parse.unquote(raw_path)

            # Resolve within fence.
            resolved = _resolve_within_app_dir(path, app_dir)
            if resolved is None:
                self._send_error(403)
                return

            # Check file exists and is a file (not a directory).
            if not resolved.is_file():
                self._send_error(404)
                return

            # Read and send.
            try:
                body = resolved.read_bytes()
            except (OSError, IOError):
                self._send_error(404)
                return

            content_type = _guess_mime_type(resolved)
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if allow_body:
                self.wfile.write(body)

        def _send_error(self, status: int) -> None:
            """Send an error response with no body."""
            self.send_response(status)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", "0")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()

        def _refuse_write(self) -> None:
            """Every method that could change something is refused: this server is read-only."""
            self.send_response(405)
            self.send_header("Allow", "GET, HEAD")
            self.send_header("Content-Length", "0")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()

        do_POST = do_PUT = do_DELETE = do_PATCH = _refuse_write  # noqa: N815 — stdlib method names
        # Any other method (OPTIONS, TRACE, ...) gets the stdlib's 501, which is also a refusal.

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A002 — stdlib signature
            """Suppress default logging; a healthy request logs nothing."""
            pass

    return Handler


def make_server(port: int = PORT, directory: Path | str | None = None) -> ThreadingHTTPServer:
    """Create and return a bound server on 127.0.0.1:port (never any other address).

    It is threaded so that a browser's idle speculative connection cannot stall the
    page's real requests.

    Args:
        port: Port number. Use 0 in tests for automatic assignment.
        directory: App directory (defaults to APP_DIR).

    Returns:
        A bound ThreadingHTTPServer (a socketserver.TCPServer) instance.

    Raises:
        OSError: If the port is already in use or binding fails.
    """
    if directory is None:
        app_dir = APP_DIR
    else:
        app_dir = Path(directory)

    handler_class = _make_handler_class(app_dir)
    httpd = ThreadingHTTPServer((HOST, port), handler_class)
    httpd.daemon_threads = True
    return httpd


def run(port: int = PORT) -> None:
    """Bind and serve forever on the given port.

    Prints the bound address and listens for Ctrl-C.
    Exits non-zero if binding fails.
    """
    try:
        httpd = make_server(port=port)
    except OSError as exc:
        print(f"[server] could not bind {HOST}:{port} — {exc}", file=sys.stderr)
        sys.exit(1)

    bound_port = httpd.server_address[1]
    print(f"Storytelling -> http://{HOST}:{bound_port}")
    print("Ctrl-C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")


if __name__ == "__main__":
    run()

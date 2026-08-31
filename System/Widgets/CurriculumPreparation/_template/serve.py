#!/usr/bin/env python3
"""
Bundle Server — Serves one unit bundle over localhost
======================================================
Owns all filesystem I/O for a single curriculum unit bundle. Serves the app,
persists unit.json atomically, and manages image files. Hard-scoped to the
bundle root so path traversal attacks are impossible (AD-13b).

Binds to 127.0.0.1 only on first free port from 8800–8899, opening a browser
at the URL. All errors returned as JSON via a shared send_error() registry.

Run:   python3 serve.py         (auto-opens http://127.0.0.1:<port>)
Stop:  Ctrl-C

Files created/managed:
- app/index.html               (served at GET /)
- unit.json                    (read/write via GET/PUT /api/unit)
- images/<id>.<ext>            (POST/GET/DELETE via /api/images/<id>)
- serve.log                    (stdout + file, both bound)
"""
import http.server
import socketserver
import hashlib
import json
import logging
import sys
import os
import tempfile
import webbrowser
import mimetypes
from pathlib import Path
from typing import Callable

# ============================================================================
# Module-level constants (no I/O at module level per PY-3)
# ============================================================================

# serve.py lives in the bundle root (generated per-bundle via !NewUnit)
BUNDLE_ROOT = Path(__file__).resolve().parent

# Port range: 8800–8899 (above existing viewers on 8787/8788)
PORT_RANGE_START = 8800
PORT_RANGE_END = 8900

# Error registry (API-3, API-6): one shared send_error() with codes
ERROR_CODES = {
    "SCOPE_VIOLATION": ("Path is outside bundle root", 403),
    "FILE_NOT_FOUND": ("File not found", 404),
    "INVALID_JSON": ("Invalid JSON in request", 400),
    "WRITE_ERROR": ("Failed to write file", 500),
    "READ_ERROR": ("Failed to read file", 500),
    "MISSING_BUNDLE_DATA": ("Bundle is missing required data", 400),
}

# Logger (initialized in main only, per PY-3)
_logger: logging.Logger | None = None


def _get_logger() -> logging.Logger:
    """Get or initialize logger (lazy init, PY-3)."""
    global _logger
    if _logger is None:
        LOG_PATH = BUNDLE_ROOT / "serve.log"
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s — %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
            handlers=[
                logging.FileHandler(LOG_PATH, encoding="utf-8"),
                logging.StreamHandler(),
            ]
        )
        _logger = logging.getLogger(__name__)
    return _logger


# ============================================================================
# Helper functions (API-1: thin routing, work behind named functions)
# ============================================================================

def find_free_port() -> int:
    """Find first free port in range 8800–8899, raise if all taken."""
    for port in range(PORT_RANGE_START, PORT_RANGE_END):
        try:
            sock = socketserver.TCPServer(("127.0.0.1", port), type(None))
            sock.server_close()
            return port
        except (OSError, RuntimeError):
            continue
    raise RuntimeError(f"No free ports in range {PORT_RANGE_START}–{PORT_RANGE_END - 1}")


def scope_guard(requested_path: str, root: Path) -> Path:
    """Resolve a path and verify it stays inside root.

    Raises on path traversal or out-of-bounds. Uses resolve() + is_relative_to()
    (AD-BS-2) so symlinks and .. attacks collapse before comparison.
    """
    try:
        target = (root / requested_path).resolve()
    except (ValueError, RuntimeError) as e:
        raise ValueError(f"SCOPE_VIOLATION: {e}") from e

    try:
        target.relative_to(root.resolve())
    except ValueError:
        raise ValueError("SCOPE_VIOLATION: Path escapes bundle root")

    return target


def send_error(handler: http.server.BaseHTTPRequestHandler,
               code: str, extra_detail: str | None = None) -> None:
    """Send a JSON error response via registry (API-3, API-6).

    handler: the BaseHTTPRequestHandler instance
    code: key from ERROR_CODES registry
    extra_detail: optional context appended to message
    """
    if code not in ERROR_CODES:
        code = "WRITE_ERROR"
    message, status = ERROR_CODES[code]
    if extra_detail:
        message = f"{message}: {extra_detail}"

    response = json.dumps({"error": message, "code": code}).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(response)))
    handler.end_headers()
    handler.wfile.write(response)

    try:
        logger = _get_logger()
        logger.info(f"{status} {code}: {message}")
    except Exception:
        pass


def check_bundle_root(root: Path) -> None:
    """Verify bundle is valid: unit.json and app/ exist. Raise if not (PY-6)."""
    if not (root / "unit.json").exists():
        raise RuntimeError(f"unit.json not found in {root}")
    if not (root / "app").is_dir():
        raise RuntimeError(f"app/ directory not found in {root}")


# ============================================================================
# HTTP Handler (API-1: thin routes, call named work functions)
# ============================================================================

class BundleHandler(http.server.BaseHTTPRequestHandler):
    """Handle GET/PUT/POST/DELETE for app, unit.json, and images."""

    def log_message(self, format: str, *args: object) -> None:
        """Suppress default logging; we use logger instead."""
        pass

    def _send_json(self, status: int, obj: dict) -> None:
        """Send JSON response with status."""
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path, mime_type: str | None = None) -> None:
        """Send a file response."""
        if not path.exists():
            send_error(self, "FILE_NOT_FOUND")
            return

        if mime_type is None:
            mime_type, _ = mimetypes.guess_type(str(path))
            if mime_type is None:
                mime_type = "application/octet-stream"

        try:
            data = path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            try:
                logger = _get_logger()
                logger.info(f"200 GET {path.relative_to(BUNDLE_ROOT)}")
            except Exception:
                pass
        except OSError as e:
            send_error(self, "READ_ERROR", str(e))

    def _send_placeholder_image(self) -> None:
        """Send 1×1 transparent PNG placeholder for missing images."""
        # 1×1 transparent PNG (base64 decoded)
        png_bytes = bytes.fromhex(
            "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49"
            "44415408d76360000000020001e21bbc330000000049454e44ae426082"
        )
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(png_bytes)))
        self.end_headers()
        self.wfile.write(png_bytes)
        try:
            logger = _get_logger()
            logger.info(f"200 GET (placeholder image)")
        except Exception:
            pass

    def do_GET(self) -> None:
        """Handle GET requests."""
        path = self.path.split("?")[0]

        # GET / — serve app/index.html
        if path == "/":
            try:
                target = scope_guard("app/index.html", BUNDLE_ROOT)
                if not target.exists():
                    send_error(self, "FILE_NOT_FOUND", "app/index.html")
                    return
                self._send_file(target, "text/html")
            except ValueError as e:
                send_error(self, str(e).split(":")[0])
            return

        # GET /api/unit — read unit.json
        if path == "/api/unit":
            try:
                target = scope_guard("unit.json", BUNDLE_ROOT)
                data = target.read_text(encoding="utf-8")
                obj = json.loads(data)
                # Content-Length must count UTF-8 bytes, not characters (BUG-1):
                # a curly apostrophe or en-dash is 1 character but 3 bytes, so
                # len(data) undercounts and the client truncates the response
                # mid-string on any unit whose curriculum text has one.
                body = data.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                try:
                    logger = _get_logger()
                    logger.info(f"200 GET /api/unit")
                except Exception:
                    pass
            except ValueError as e:
                send_error(self, str(e).split(":")[0])
            except (OSError, json.JSONDecodeError) as e:
                send_error(self, "READ_ERROR", str(e))
            return

        # GET /api/images/<id> — read image or placeholder
        if path.startswith("/api/images/"):
            image_id = path[len("/api/images/"):]
            if not image_id or "/" in image_id:
                send_error(self, "FILE_NOT_FOUND")
                return
            try:
                # Try to find the image file. Image naming is image-<id>.<ext>,
                # but we don't know the extension, so list images/ and match.
                images_dir = BUNDLE_ROOT / "images"
                if not images_dir.exists():
                    images_dir.mkdir(parents=True, exist_ok=True)

                found = None
                for img in images_dir.iterdir():
                    if img.name.startswith(f"{image_id}."):
                        found = img
                        break

                if found:
                    self._send_file(found)
                else:
                    # Missing image — send placeholder
                    self._send_placeholder_image()
            except ValueError as e:
                send_error(self, str(e).split(":")[0])
            except OSError as e:
                send_error(self, "READ_ERROR", str(e))
            return

        # GET /static/* — serve static assets from app/
        if path.startswith("/"):
            try:
                # Serve from app/ for any other path
                target = scope_guard(f"app{path}", BUNDLE_ROOT)
                if target.exists() and target.is_file():
                    self._send_file(target)
                else:
                    send_error(self, "FILE_NOT_FOUND")
            except ValueError as e:
                send_error(self, str(e).split(":")[0])
            return

        send_error(self, "FILE_NOT_FOUND")

    def do_PUT(self) -> None:
        """Handle PUT requests."""
        path = self.path.split("?")[0]

        # PUT /api/unit — write unit.json atomically
        if path == "/api/unit":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)

                # Validate JSON
                try:
                    json.loads(body.decode("utf-8"))
                except json.JSONDecodeError as e:
                    send_error(self, "INVALID_JSON", str(e))
                    return

                # Scope guard
                target = scope_guard("unit.json", BUNDLE_ROOT)

                # Atomic write: temp file + os.replace (AD-BS-3)
                tmp_path = None
                try:
                    with tempfile.NamedTemporaryFile(
                        dir=BUNDLE_ROOT,
                        delete=False,
                        suffix=".json"
                    ) as tmp:
                        tmp.write(body)
                        tmp_path = Path(tmp.name)

                    os.replace(str(tmp_path), str(target))
                    self._send_json(200, {"status": "ok"})
                    try:
                        logger = _get_logger()
                        logger.info(f"200 PUT /api/unit ({len(body)} bytes)")
                    except Exception:
                        pass
                except OSError as e:
                    if tmp_path and tmp_path.exists():
                        tmp_path.unlink()
                    send_error(self, "WRITE_ERROR", str(e))
            except ValueError as e:
                send_error(self, str(e).split(":")[0])
            except Exception as e:
                send_error(self, "WRITE_ERROR", str(e))
            return

        # All other PUT paths: 405
        self.send_response(405)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(b'{"error": "Method not allowed"}')
        try:
            logger = _get_logger()
            logger.info(f"405 PUT {path}")
        except Exception:
            pass

    def do_POST(self) -> None:
        """Handle POST requests."""
        path = self.path.split("?")[0]

        # POST /api/images — store image file
        if path == "/api/images":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)

                if not body:
                    send_error(self, "MISSING_BUNDLE_DATA", "empty file")
                    return

                # Generate collision-free filename: use first 8 bytes of hex digest
                digest = hashlib.sha256(body).hexdigest()[:8]

                # Guess extension from Content-Type or magic bytes
                ext = ".png"  # default
                content_type = self.headers.get("Content-Type", "")
                if "jpeg" in content_type or "jpg" in content_type:
                    ext = ".jpg"
                elif "gif" in content_type:
                    ext = ".gif"
                elif "webp" in content_type:
                    ext = ".webp"

                # Detect magic bytes if no Content-Type
                if content_type == "" or content_type == "application/octet-stream":
                    if body.startswith(b"\x89PNG"):
                        ext = ".png"
                    elif body.startswith(b"\xff\xd8\xff"):
                        ext = ".jpg"
                    elif body.startswith(b"GIF8"):
                        ext = ".gif"
                    elif body.startswith(b"RIFF") and b"WEBP" in body[:12]:
                        ext = ".webp"

                filename = f"{digest}{ext}"

                # Scope guard and write
                target = scope_guard(f"images/{filename}", BUNDLE_ROOT)

                try:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(body)
                    self._send_json(201, {"id": digest, "filename": filename})
                    try:
                        logger = _get_logger()
                        logger.info(f"201 POST /api/images ({filename}, {len(body)} bytes)")
                    except Exception:
                        pass
                except OSError as e:
                    send_error(self, "WRITE_ERROR", str(e))
            except ValueError as e:
                send_error(self, str(e).split(":")[0])
            except Exception as e:
                send_error(self, "WRITE_ERROR", str(e))
            return

        # All other POST paths: 405
        self.send_response(405)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(b'{"error": "Method not allowed"}')
        try:
            logger = _get_logger()
            logger.info(f"405 POST {path}")
        except Exception:
            pass

    def do_DELETE(self) -> None:
        """Handle DELETE requests."""
        path = self.path.split("?")[0]

        # DELETE /api/images/<id> — delete image file
        if path.startswith("/api/images/"):
            image_id = path[len("/api/images/"):]
            if not image_id or "/" in image_id:
                send_error(self, "FILE_NOT_FOUND")
                return
            try:
                # Find and delete the image
                images_dir = BUNDLE_ROOT / "images"
                if not images_dir.exists():
                    send_error(self, "FILE_NOT_FOUND")
                    return

                found = None
                for img in images_dir.iterdir():
                    if img.name.startswith(f"{image_id}."):
                        found = img
                        break

                if not found:
                    send_error(self, "FILE_NOT_FOUND")
                    return

                try:
                    found.unlink()
                    self._send_json(200, {"status": "ok"})
                    try:
                        logger = _get_logger()
                        logger.info(f"200 DELETE /api/images/{image_id}")
                    except Exception:
                        pass
                except OSError as e:
                    send_error(self, "WRITE_ERROR", str(e))
            except ValueError as e:
                send_error(self, str(e).split(":")[0])
            except Exception as e:
                send_error(self, "WRITE_ERROR", str(e))
            return

        # All other DELETE paths: 405
        self.send_response(405)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(b'{"error": "Method not allowed"}')
        try:
            logger = _get_logger()
            logger.info(f"405 DELETE {path}")
        except Exception:
            pass


# ============================================================================
# Entry point (PY-3: real work behind if __name__ == "__main__":)
# ============================================================================

if __name__ == "__main__":
    # Initialize logger (PY-3: only in main)
    logger = _get_logger()

    # Check bundle is valid before starting
    try:
        check_bundle_root(BUNDLE_ROOT)
    except RuntimeError as e:
        print(f"✗ {e}", file=sys.stderr)
        sys.exit(1)

    # Find free port
    try:
        port = find_free_port()
    except RuntimeError as e:
        print(f"✗ {e}", file=sys.stderr)
        sys.exit(1)

    # Start server (FR-BS-1: 127.0.0.1 only)
    try:
        server = socketserver.TCPServer(("127.0.0.1", port), BundleHandler)
        print(f"✓ Bundle server running on http://127.0.0.1:{port}")
        logger.info(f"Bundle server started on 127.0.0.1:{port}")

        # Open browser
        webbrowser.open(f"http://127.0.0.1:{port}/")

        # Serve forever (Ctrl-C to stop, OQ-BS-2)
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutdown via Ctrl-C")
        sys.exit(0)
    except Exception as e:
        print(f"✗ {e}", file=sys.stderr)
        logger.error(f"Server error: {e}")
        sys.exit(1)

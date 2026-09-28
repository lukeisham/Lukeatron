"""Test the static server (distribution FR-X1, documentation D-2).

TEST-7 gates, each with a blocked path and a permitted path:
(a) serves files from app/  (b) refuses traversal  (c) refuses every write method
(d) binds to 127.0.0.1 only.

Only loopback on port 0 is used. No sleeps: make_server has already bound and is
listening when it returns, so a connection made straight away is simply queued.
"""

from __future__ import annotations

import http.client
import inspect
import socket
import sys
import threading
import unittest
import urllib.error
import urllib.request
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import server  # noqa: E402 — needs the sys.path line above


@contextmanager
def serving(app_dir: Path) -> Iterator[tuple[str, int]]:
    """Run a real server over app_dir on a free loopback port; always shut it down."""
    httpd = server.make_server(port=0, directory=app_dir)
    host, port = httpd.server_address[:2]
    thread = threading.Thread(target=httpd.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
    thread.start()
    try:
        yield host, port
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join()


def request(host: str, port: int, method: str, path: str, body: bytes | None = None) -> tuple[int, dict[str, str], bytes]:
    """One raw request (http.client sends the path exactly as given, unlike urllib)."""
    connection = http.client.HTTPConnection(host, port, timeout=5)
    try:
        connection.request(method, path, body=body)
        response = connection.getresponse()
        return response.status, dict(response.getheaders()), response.read()
    finally:
        connection.close()


class AppDirectoryCase(unittest.TestCase):
    """A temporary app/ folder holding one file of each served type, inside a parent that holds a secret."""

    def setUp(self) -> None:
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.app_dir = self.root / "app"
        (self.app_dir / "subdir").mkdir(parents=True)
        (self.app_dir / "index.html").write_text("<h1>Home</h1>")
        (self.app_dir / "test.js").write_text("console.log('test');")
        (self.app_dir / "test.css").write_text("body { color: red; }")
        (self.app_dir / "test.json").write_text('{"key": "value"}')
        (self.app_dir / "test.svg").write_text("<svg></svg>")
        (self.app_dir / "test.png").write_bytes(b"\x89PNG\r\n\x1a\n")
        (self.app_dir / "subdir" / "nested.html").write_text("<h1>Nested</h1>")
        (self.root / "secret.txt").write_text("secret")


class TestServerImports(unittest.TestCase):
    """PY-3: importing the module does nothing but define things."""

    def test_imports_cleanly(self) -> None:
        self.assertTrue(callable(server.make_server))
        self.assertTrue(callable(server.run))

    def test_fixed_port_is_not_the_lukeatron_ones(self) -> None:
        self.assertEqual(server.PORT, 8793)
        self.assertNotIn(server.PORT, (8787, 8789, 8791))


class TestStaticServing(AppDirectoryCase):
    """Gate (a), permitted path."""

    def test_root_serves_index_html(self) -> None:
        with serving(self.app_dir) as (host, port):
            status, headers, body = request(host, port, "GET", "/")
        self.assertEqual(status, 200)
        self.assertIn("text/html", headers["Content-Type"])
        self.assertEqual(body, b"<h1>Home</h1>")
        self.assertEqual(headers["Cache-Control"], "no-store")

    def test_nested_file_and_query_string(self) -> None:
        with serving(self.app_dir) as (host, port):
            status, _, body = request(host, port, "GET", "/subdir/nested.html?v=2#frag")
        self.assertEqual((status, body), (200, b"<h1>Nested</h1>"))

    def test_mime_types(self) -> None:
        expected = {
            "/test.js": "text/javascript",
            "/test.css": "text/css",
            "/test.json": "application/json",
            "/test.svg": "image/svg+xml",
            "/test.png": "image/png",
        }
        with serving(self.app_dir) as (host, port):
            for path, mime in expected.items():
                with self.subTest(path=path):
                    status, headers, _ = request(host, port, "GET", path)
                    self.assertEqual(status, 200)
                    self.assertEqual(headers["Content-Type"], mime)
                    self.assertEqual(headers["Cache-Control"], "no-store")

    def test_head_returns_headers_only(self) -> None:
        with serving(self.app_dir) as (host, port):
            status, headers, body = request(host, port, "HEAD", "/")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Content-Length"], str(len(b"<h1>Home</h1>")))
        self.assertEqual(body, b"")

    def test_missing_file_and_directory_are_404_with_no_listing(self) -> None:
        with serving(self.app_dir) as (host, port):
            for path in ("/nonexistent.html", "/subdir", "/subdir/"):
                with self.subTest(path=path):
                    status, _, body = request(host, port, "GET", path)
                    self.assertEqual(status, 404)
                    self.assertEqual(body, b"")

    def test_an_idle_connection_does_not_block_the_next_request(self) -> None:
        """Browsers open speculative connections that send nothing; a one-at-a-time server would hang on them."""
        with serving(self.app_dir) as (host, port):
            with socket.create_connection((host, port), timeout=5):
                status, _, _ = request(host, port, "GET", "/")
        self.assertEqual(status, 200)


class TestTraversalRefusal(AppDirectoryCase):
    """Gate (b), blocked path: nothing outside app/ is ever served."""

    def test_traversal_forms_are_refused(self) -> None:
        forms = [
            "/../secret.txt",
            "/%2e%2e/secret.txt",
            "/%2E%2E/secret.txt",
            "/subdir/../../secret.txt",
            "/subdir/%2e%2e/%2e%2e/secret.txt",
            "/..%2fsecret.txt",
            "/%2e%2e%2fsecret.txt",
            "/index.html%00.png",
        ]
        with serving(self.app_dir) as (host, port):
            for path in forms:
                with self.subTest(path=path):
                    status, _, body = request(host, port, "GET", path)
                    self.assertIn(status, (403, 404))
                    self.assertNotIn(b"secret", body)

    def test_double_encoded_dots_are_a_plain_missing_file(self) -> None:
        """Decoding happens once, so %252e%252e is a literal name, not a parent directory."""
        with serving(self.app_dir) as (host, port):
            status, _, _ = request(host, port, "GET", "/%252e%252e/secret.txt")
        self.assertEqual(status, 404)

    def test_absolute_paths_stay_inside_app(self) -> None:
        with serving(self.app_dir) as (host, port):
            for path in ("/etc/passwd", "//etc/passwd", f"/{self.root}/secret.txt"):
                with self.subTest(path=path):
                    status, _, _ = request(host, port, "GET", path)
                    self.assertEqual(status, 404)

    def test_symlink_out_of_app_is_refused(self) -> None:
        (self.app_dir / "escape.txt").symlink_to(self.root / "secret.txt")
        with serving(self.app_dir) as (host, port):
            status, _, body = request(host, port, "GET", "/escape.txt")
        self.assertEqual(status, 403)
        self.assertNotIn(b"secret", body)

    def test_symlink_inside_app_is_allowed(self) -> None:
        (self.app_dir / "alias.html").symlink_to(self.app_dir / "index.html")
        with serving(self.app_dir) as (host, port):
            status, _, body = request(host, port, "GET", "/alias.html")
        self.assertEqual((status, body), (200, b"<h1>Home</h1>"))

    def test_a_refused_request_does_not_stop_the_server(self) -> None:
        with serving(self.app_dir) as (host, port):
            request(host, port, "GET", "/index.html%00.png")
            status, _, _ = request(host, port, "GET", "/")
        self.assertEqual(status, 200)


class TestReadOnly(AppDirectoryCase):
    """Gate (c): every method that could write is refused, and nothing on disk changes."""

    def test_write_methods_are_405_and_change_nothing(self) -> None:
        before = (self.app_dir / "index.html").read_bytes()
        with serving(self.app_dir) as (host, port):
            for method in ("POST", "PUT", "DELETE", "PATCH"):
                with self.subTest(method=method):
                    status, headers, _ = request(host, port, method, "/index.html", body=b"overwritten")
                    self.assertEqual(status, 405)
                    self.assertEqual(headers["Allow"], "GET, HEAD")
                    self.assertFalse((self.app_dir / "new.html").exists())
        self.assertEqual((self.app_dir / "index.html").read_bytes(), before)

    def test_other_methods_are_not_served(self) -> None:
        with serving(self.app_dir) as (host, port):
            for method in ("OPTIONS", "TRACE"):
                with self.subTest(method=method):
                    status, _, _ = request(host, port, method, "/")
                    self.assertGreaterEqual(status, 400)

    def test_no_write_calls_in_the_source(self) -> None:
        source = inspect.getsource(server)
        for forbidden in ("write_text", "write_bytes", "os.remove", "unlink(", "'wb'", '"wb"', "open("):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)


class TestBinding(AppDirectoryCase):
    """Gate (d): loopback only, and a busy port is an error, not a silent second listener."""

    def test_binds_to_127_0_0_1_only(self) -> None:
        with serving(self.app_dir) as (host, port):
            self.assertEqual(host, "127.0.0.1")
            self.assertGreater(port, 0)
            status, _, _ = request(host, port, "GET", "/")
        self.assertEqual(status, 200)
        self.assertEqual(server.HOST, "127.0.0.1")

    def test_make_server_offers_no_way_to_choose_another_address(self) -> None:
        self.assertEqual(list(inspect.signature(server.make_server).parameters), ["port", "directory"])

    def test_port_in_use_raises_oserror(self) -> None:
        with serving(self.app_dir) as (_, port):
            with self.assertRaises(OSError):
                server.make_server(port=port, directory=self.app_dir)


if __name__ == "__main__":
    unittest.main()

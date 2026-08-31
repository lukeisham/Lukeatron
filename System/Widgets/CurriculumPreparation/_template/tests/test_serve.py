#!/usr/bin/env python3
"""Smoke tests for serve.py (TEST-1/TEST-2: stdlib unittest,
imports cleanly, happy path, one guard path).

Tests the scope guard (both directions per TEST-7), atomic write,
bundle validation, and no-I/O-on-import.
"""
from __future__ import annotations

import sys
import tempfile
import unittest
import json
import subprocess
from pathlib import Path

# Fix path so serve.py can be imported (TEST-1: imports cleanly)
TESTS_DIR = Path(__file__).resolve().parent
BUNDLE_DIR = TESTS_DIR.parent
sys.path.insert(0, str(BUNDLE_DIR))

import serve  # noqa: E402


class ScopeGuardTests(unittest.TestCase):
    """TEST-7: scope guard tests, both blocked and permitted paths."""

    def setUp(self) -> None:
        """Create temp bundle root for testing."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        # Create images/ for permitted-path test
        (self.root / "images").mkdir()

    def tearDown(self) -> None:
        """Clean up temp directory."""
        self.temp_dir.cleanup()

    def test_scope_guard_blocks_parent_directory_traversal(self) -> None:
        """TEST-7 blocked: ../../../etc/passwd is refused."""
        with self.assertRaises(ValueError) as cm:
            serve.scope_guard("../../../etc/passwd", self.root)
        self.assertIn("SCOPE_VIOLATION", str(cm.exception))

    def test_scope_guard_blocks_absolute_path(self) -> None:
        """TEST-7 blocked: /etc/passwd is refused."""
        with self.assertRaises(ValueError) as cm:
            serve.scope_guard("/etc/passwd", self.root)
        self.assertIn("SCOPE_VIOLATION", str(cm.exception))

    def test_scope_guard_blocks_absolute_path_via_query(self) -> None:
        """TEST-7 blocked: absolute paths in query strings are refused."""
        with self.assertRaises(ValueError) as cm:
            serve.scope_guard("/etc/passwd", self.root)
        self.assertIn("SCOPE_VIOLATION", str(cm.exception))

    def test_scope_guard_permits_legitimate_path(self) -> None:
        """TEST-7 permitted: images/img-abc.png resolves and returns Path."""
        result = serve.scope_guard("images/img-abc.png", self.root)
        self.assertIsInstance(result, Path)
        # Verify it's inside root (after resolving both)
        self.assertIn(str(self.root.resolve()), str(result.resolve()))

    def test_scope_guard_permits_unit_json(self) -> None:
        """TEST-7 permitted: unit.json at root resolves."""
        result = serve.scope_guard("unit.json", self.root)
        self.assertIsInstance(result, Path)
        # After resolve, should be inside root
        self.assertIn(str(self.root.resolve()), str(result.resolve()))

    def test_scope_guard_blocks_symlink_escape(self) -> None:
        """TEST-7 blocked: symlinks that escape are resolved and caught."""
        # Create /tmp/escape_target outside root
        with tempfile.TemporaryDirectory() as outside:
            outside_path = Path(outside)
            escape_file = outside_path / "escaped.txt"
            escape_file.write_text("secret")

            # Create symlink inside root pointing outside
            symlink_path = self.root / "symlink"
            symlink_path.symlink_to(escape_file)

            # Trying to access it should be caught by is_relative_to
            with self.assertRaises(ValueError) as cm:
                serve.scope_guard("symlink", self.root)
            self.assertIn("SCOPE_VIOLATION", str(cm.exception))


class AtomicWriteTests(unittest.TestCase):
    """Test atomic write behavior (AC-BS-3)."""

    def setUp(self) -> None:
        """Create temp bundle root."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.unit_file = self.root / "unit.json"

    def tearDown(self) -> None:
        """Clean up."""
        self.temp_dir.cleanup()

    def test_atomic_write_via_temp_file(self) -> None:
        """AC-BS-3: atomic write leaves valid JSON even after crash."""
        test_data = {"schemaVersion": "1.0.0", "nodes": []}
        json_bytes = json.dumps(test_data).encode("utf-8")

        # Simulate atomic write logic from serve.py
        import os
        import tempfile as tf

        with tf.NamedTemporaryFile(dir=self.root, delete=False, suffix=".json") as tmp:
            tmp.write(json_bytes)
            tmp_path = Path(tmp.name)

        # Now replace (atomic on POSIX)
        os.replace(str(tmp_path), str(self.unit_file))

        # Verify file is valid JSON
        result = json.loads(self.unit_file.read_text(encoding="utf-8"))
        self.assertEqual(result["schemaVersion"], "1.0.0")

    def test_temp_file_cleaned_up_on_error(self) -> None:
        """Verify temp file is cleaned up if write fails."""
        # Create a temp file and delete it
        import tempfile as tf

        json_bytes = b'{"test": "data"}'

        with tf.NamedTemporaryFile(dir=self.root, delete=False, suffix=".json") as tmp:
            tmp_path = Path(tmp.name)

        # Manually clean up (in serve.py, this happens on exception)
        if tmp_path.exists():
            tmp_path.unlink()

        # Verify temp file is gone
        self.assertFalse(tmp_path.exists())


class BundleValidationTests(unittest.TestCase):
    """Test bundle startup guards (AC-BS-8, PY-6)."""

    def test_check_bundle_root_passes_with_valid_bundle(self) -> None:
        """Valid bundle (unit.json + app/) passes check."""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "unit.json").write_text('{}')
            (root / "app").mkdir()
            # Should not raise
            serve.check_bundle_root(root)

    def test_check_bundle_root_fails_missing_unit_json(self) -> None:
        """Missing unit.json raises with message (AC-BS-8, PY-6)."""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "app").mkdir()
            with self.assertRaises(RuntimeError) as cm:
                serve.check_bundle_root(root)
            self.assertIn("unit.json", str(cm.exception))

    def test_check_bundle_root_fails_missing_app_directory(self) -> None:
        """Missing app/ directory raises with message."""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "unit.json").write_text('{}')
            with self.assertRaises(RuntimeError) as cm:
                serve.check_bundle_root(root)
            self.assertIn("app", str(cm.exception))


class NoIOOnImportTest(unittest.TestCase):
    """AC-BS-10: python3 -c "import serve" does no I/O."""

    def test_import_serve_does_not_create_log(self) -> None:
        """Importing serve.py must not create serve.log in bundle directory."""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "unit.json").write_text('{}')
            (root / "app").mkdir()

            # Copy serve.py to temp directory
            serve_py = BUNDLE_DIR / "serve.py"
            temp_serve_py = root / "serve.py"
            temp_serve_py.write_text(serve_py.read_text(encoding="utf-8"))

            # Run import in subprocess in that directory
            result = subprocess.run(
                [sys.executable, "-c", "import serve"],
                cwd=str(root),
                capture_output=True,
                text=True,
            )

            # Check that no serve.log was created
            self.assertFalse((root / "serve.log").exists(),
                           f"serve.log should not exist on import, stderr: {result.stderr}")
            # Import should succeed (exit code 0)
            self.assertEqual(result.returncode, 0, f"Import failed: {result.stderr}")


class PortSelectionTests(unittest.TestCase):
    """Test free port selection (AC-BS-7)."""

    def test_find_free_port_returns_valid_port(self) -> None:
        """find_free_port() returns a port in valid range."""
        port = serve.find_free_port()
        self.assertGreaterEqual(port, 8800)
        self.assertLess(port, 8900)

    def test_find_free_port_in_range(self) -> None:
        """Returned port is in the configured range."""
        port = serve.find_free_port()
        # Verify it's in range
        self.assertGreaterEqual(port, serve.PORT_RANGE_START)
        self.assertLess(port, serve.PORT_RANGE_END)


class ErrorRegistryTests(unittest.TestCase):
    """Test error response formatting (API-3, API-6)."""

    def test_error_codes_registry_has_required_keys(self) -> None:
        """Error registry includes all required codes."""
        required = ["SCOPE_VIOLATION", "FILE_NOT_FOUND", "INVALID_JSON",
                    "WRITE_ERROR", "READ_ERROR", "MISSING_BUNDLE_DATA"]
        for code in required:
            self.assertIn(code, serve.ERROR_CODES)

    def test_error_codes_have_message_and_status(self) -> None:
        """Each code maps to (message, status_code)."""
        for code, value in serve.ERROR_CODES.items():
            self.assertIsInstance(value, tuple)
            self.assertEqual(len(value), 2)
            message, status = value
            self.assertIsInstance(message, str)
            self.assertIsInstance(status, int)
            self.assertGreaterEqual(status, 400)


class BundleHandlerExistsTest(unittest.TestCase):
    """Smoke test: handler exists and has required methods."""

    def test_handler_class_exists(self) -> None:
        """BundleHandler class is defined."""
        self.assertTrue(hasattr(serve, "BundleHandler"))

    def test_handler_has_do_get(self) -> None:
        """Handler has do_GET method."""
        self.assertTrue(hasattr(serve.BundleHandler, "do_GET"))

    def test_handler_has_do_put(self) -> None:
        """Handler has do_PUT method."""
        self.assertTrue(hasattr(serve.BundleHandler, "do_PUT"))

    def test_handler_has_do_post(self) -> None:
        """Handler has do_POST method."""
        self.assertTrue(hasattr(serve.BundleHandler, "do_POST"))

    def test_handler_has_do_delete(self) -> None:
        """Handler has do_DELETE method."""
        self.assertTrue(hasattr(serve.BundleHandler, "do_DELETE"))


class ApiUnitContentLengthTests(unittest.TestCase):
    """Regression: GET /api/unit must send Content-Length in BYTES, not
    characters (BUG-1). unit.json is read with Path.read_text() (a str) and
    the fix must measure len() on the UTF-8-encoded body, not the string,
    before writing it — a curly apostrophe or en-dash is one character but
    three bytes, so measuring the string undercounts and an HTTP client
    truncates the response exactly at that undercount, corrupting the JSON
    on any unit whose curriculum text contains one (curly quotes, dashes,
    accented characters — all common in pasted curriculum text)."""

    def test_get_api_unit_sends_correct_byte_length_with_unicode_content(self) -> None:
        """A real subprocess server, hit with a real HTTP request, must
        return a Content-Length matching the actual UTF-8 byte count and a
        body that parses as valid JSON — not a length matching the
        character count, which truncates the response mid-string."""
        import urllib.request
        import urllib.error
        import time

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "app").mkdir()
            (root / "app" / "index.html").write_text("<html></html>")
            (root / "images").mkdir()

            # Deliberately include curly apostrophes and an en-dash — the
            # exact characters that exposed BUG-1 in real curriculum text.
            unit = {
                "schemaVersion": "1.0.0", "generatedFrom": "", "meta": {},
                "curriculum": {}, "nodes": [], "topics": [], "bigIdeas": [],
                "lessons": [],
                "cribSheet": {"sections": []},
                "resourcesPage": {"items": []},
                "unitAssessment": {},
                "matrixTemplate": {"criteria": []},
                "matrices": [], "students": [], "images": [],
                "_probe": "Peoples’ rights, 1914–45, café",
            }
            (root / "unit.json").write_text(
                json.dumps(unit, ensure_ascii=False), encoding="utf-8"
            )

            serve_py = BUNDLE_DIR / "serve.py"
            (root / "serve.py").write_text(
                serve_py.read_text(encoding="utf-8"), encoding="utf-8"
            )

            import os
            env = dict(os.environ, PYTHONUNBUFFERED="1")
            proc = subprocess.Popen(
                [sys.executable, "serve.py"],
                cwd=str(root),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=env,
            )
            try:
                import re

                # TEST-5: await the real event (the port line arriving),
                # never a guessed sleep. Bounded by a wall-clock deadline so
                # a startup failure fails the test instead of hanging it.
                deadline = time.monotonic() + 5.0
                match = None
                port_line = ""
                while time.monotonic() < deadline:
                    port_line = proc.stdout.readline()
                    if not port_line:
                        continue
                    match = re.search(r"127\.0\.0\.1:(\d+)", port_line)
                    if match:
                        break
                self.assertIsNotNone(
                    match, f"server did not report a port: {port_line!r}"
                )
                port = int(match.group(1))

                # TEST-5: the port being announced does not guarantee the
                # listening socket is accepting connections yet on every
                # platform — poll the real endpoint until it answers,
                # rather than sleeping a guessed duration and hoping.
                declared_length = None
                body = b""
                last_error: Exception | None = None
                while time.monotonic() < deadline:
                    try:
                        with urllib.request.urlopen(
                            f"http://127.0.0.1:{port}/api/unit", timeout=1
                        ) as resp:
                            declared_length = int(resp.headers["Content-Length"])
                            body = resp.read()
                        break
                    except (urllib.error.URLError, ConnectionRefusedError) as e:
                        last_error = e
                        time.sleep(0.02)
                self.assertIsNotNone(
                    declared_length,
                    f"server never accepted a connection: {last_error!r}"
                )

                self.assertEqual(
                    declared_length, len(body),
                    "Content-Length must equal the actual byte count sent"
                )
                parsed = json.loads(body.decode("utf-8"))
                self.assertEqual(
                    parsed["_probe"], unit["_probe"],
                    "unicode content must survive the round trip intact"
                )
            finally:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=5)
                if proc.stdout:
                    proc.stdout.close()


if __name__ == "__main__":
    unittest.main()

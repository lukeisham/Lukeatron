"""seed/add_image.py: what a thumbnail must be, and what filing one writes."""
import sqlite3
import struct
import sys
import tempfile
import unittest
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from seed import add_image  # noqa: E402

SCHEMA = (ROOT / "schema.sql").read_text()


def png(width: int, height: int, noise: int = 0) -> bytes:
    """A real, valid PNG of one grey colour (plus `noise` bytes of incompressible filler when a test needs a heavy file)."""
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    rows = b"".join(b"\x00" + b"\x80" * width for _ in range(height))
    filler = chunk(b"tEXt", b"k\x00" + bytes((i * 7919) % 251 for i in range(noise))) if noise else b""
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0))
            + filler + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b""))


class AddImageTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.images = self.dir / "images"
        self.conn = sqlite3.connect(":memory:")
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.conn.executescript(SCHEMA)
        self.conn.execute("INSERT INTO entries (name, definition) VALUES ('Leading', 'd')")

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()

    def source(self, name: str = "Before Shot.PNG", data: bytes | None = None) -> Path:
        path = self.dir / name
        path.write_bytes(png(120, 80) if data is None else data)
        return path

    def test_a_small_png_is_copied_in_under_a_safe_name_and_its_row_records_its_size(self):
        name = add_image.add_image(self.conn, self.images, 1, self.source(), "issue", "  Cramped leading ")
        self.assertEqual(name, "1-before-shot.png")
        self.assertEqual((self.images / name).read_bytes(), self.source().read_bytes())
        self.assertEqual(self.conn.execute("SELECT entry_id, file, role, caption, width, height, position FROM entry_images").fetchall(),
                         [(1, name, "issue", "Cramped leading", 120, 80, 0)])

    def test_images_go_last_among_the_entrys_and_a_taken_name_is_numbered(self):
        first = add_image.add_image(self.conn, self.images, 1, self.source(), "issue")
        second = add_image.add_image(self.conn, self.images, 1, self.source(), "fix")
        self.assertEqual((first, second), ("1-before-shot.png", "1-before-shot-2.png"))
        self.assertEqual(self.conn.execute("SELECT role, position FROM entry_images ORDER BY id").fetchall(), [("issue", 0), ("fix", 1)])

    def test_a_refused_file_writes_nothing(self):
        cases = [
            (self.source("a.png", b"not a png at all, just text padded out to length"), "issue", "not a PNG"),
            (self.source("b.png", png(481, 10)), "issue", "larger than 480 pixels"),
            (self.source("c.png", png(10, 10, noise=add_image.MAX_BYTES)), "fix", "larger than"),
            (self.source("d.png"), "before", "role must be"),
        ]
        for source, role, message in cases:
            with self.assertRaises(add_image.ImageError, msg=message) as caught:
                add_image.add_image(self.conn, self.images, 1, source, role)
            self.assertIn(message, str(caught.exception))
        with self.assertRaises(add_image.ImageError):
            add_image.add_image(self.conn, self.images, 99, self.source(), "issue")  # no such entry
        with self.assertRaises(add_image.ImageError):
            add_image.add_image(self.conn, self.images, 1, self.source(), "issue", "x" * 201)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM entry_images").fetchone()[0], 0)
        self.assertEqual(list(self.images.glob("*")) if self.images.exists() else [], [])

    def test_png_size_reads_the_header_only(self):
        self.assertEqual(add_image.png_size(png(33, 7)), (33, 7))
        with self.assertRaises(add_image.ImageError):
            add_image.png_size(b"\x89PNG\r\n\x1a\n" + b"\x00" * 4)


if __name__ == "__main__":
    unittest.main()

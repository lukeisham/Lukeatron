"""Files one thumbnail under an entry: validates the PNG, copies it into images/ and adds its `entry_images` row, so the
app (which only reads them) can show it in the Grid group and under the entry.

    python3 -m seed.add_image <entry id> <file.png> --role issue|fix [--caption "..."] [--resize]

A thumbnail must be a real PNG, at most MAX_EDGE pixels on its longer side and MAX_BYTES on disk, so the Grid stays light.
`--resize` first shrinks a larger image with macOS `sips` (the only tool used; nothing is installed)."""

from __future__ import annotations

import argparse
import re
import shutil
import sqlite3
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

from seed import db as seed_db

IMAGES_DIR = seed_db.APP_DIR / "images"
MAX_EDGE = 480  # pixels; mirrors the CHECKs on `entry_images.width` and `.height`
MAX_BYTES = 150_000
MAX_CAPTION = 200
ROLES = ("issue", "fix")
_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class ImageError(Exception):
    """A file or request refused, with a sentence for the person running the script."""


def png_size(data: bytes) -> tuple[int, int]:
    """(width, height) from a PNG's header, or ImageError when `data` is not a PNG."""
    if len(data) < 24 or data[:8] != _SIGNATURE or data[12:16] != b"IHDR":
        raise ImageError("not a PNG file")
    return struct.unpack(">II", data[16:24])


def check_thumbnail(data: bytes) -> tuple[int, int]:
    """The thumbnail's size when it is light enough, else ImageError saying what to shrink."""
    width, height = png_size(data)
    if max(width, height) > MAX_EDGE:
        raise ImageError(f"{width}x{height} is larger than {MAX_EDGE} pixels on its longer side")
    if len(data) > MAX_BYTES:
        raise ImageError(f"{len(data) // 1000} KB is larger than {MAX_BYTES // 1000} KB")
    return width, height


def shrunk(source: Path) -> bytes:
    """The image scaled to MAX_EDGE with `sips`, as PNG bytes."""
    if shutil.which("sips") is None:
        raise ImageError("--resize needs macOS sips; shrink the image yourself")
    with tempfile.TemporaryDirectory() as tmp:
        target = Path(tmp) / "thumb.png"
        subprocess.run(["sips", "-Z", str(MAX_EDGE), "-s", "format", "png", str(source), "--out", str(target)],
                       check=True, capture_output=True)
        return target.read_bytes()


def file_name(entry_id: int, source: Path, images_dir: Path) -> str:
    """`<entry id>-<source name in safe lowercase>.png`, numbered when that name is taken."""
    stem = re.sub(r"[^a-z0-9]+", "-", source.stem.lower()).strip("-") or "image"
    name, count = f"{entry_id}-{stem}.png", 1
    while (images_dir / name).exists():
        count += 1
        name = f"{entry_id}-{stem}-{count}.png"
    return name


def add_image(conn: sqlite3.Connection, images_dir: Path, entry_id: int, source: Path, role: str,
              caption: str = "", resize: bool = False) -> str:
    """Copies the thumbnail into `images_dir` and adds its row last among the entry's images; returns the stored file name.
    Nothing is written when any check fails. The caller commits."""
    if role not in ROLES:
        raise ImageError(f"role must be one of {', '.join(ROLES)}")
    if len(caption.strip()) > MAX_CAPTION:
        raise ImageError(f"the caption is longer than {MAX_CAPTION} characters")
    if conn.execute("SELECT 1 FROM entries WHERE id = ?", (entry_id,)).fetchone() is None:
        raise ImageError(f"there is no entry {entry_id}")
    data = source.read_bytes()
    if resize and max(png_size(data)) > MAX_EDGE:
        data = shrunk(source)
    width, height = check_thumbnail(data)
    name = file_name(entry_id, source, images_dir)
    conn.execute(
        "INSERT INTO entry_images (entry_id, file, role, caption, width, height, position) VALUES "
        "(?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM entry_images WHERE entry_id = ?))",
        (entry_id, name, role, caption.strip(), width, height, entry_id),
    )
    images_dir.mkdir(exist_ok=True)
    (images_dir / name).write_bytes(data)
    return name


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="File a thumbnail under an entry.")
    parser.add_argument("entry_id", type=int)
    parser.add_argument("file", type=Path)
    parser.add_argument("--role", required=True, choices=ROLES)
    parser.add_argument("--caption", default="")
    parser.add_argument("--resize", action="store_true", help="shrink a larger image with sips first")
    args = parser.parse_args(argv)
    conn = seed_db.open_database()
    try:
        with conn:
            name = add_image(conn, IMAGES_DIR, args.entry_id, args.file, args.role, args.caption, args.resize)
    except (ImageError, OSError, sqlite3.Error) as exc:
        print(f"Not added: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()
    print(f"Added images/{name}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

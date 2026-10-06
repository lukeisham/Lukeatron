#!/usr/bin/env python3
"""Build the complete shareable bundle: dist/Storytelling-<version>-bundle.zip.

One zip, unzips to one folder, everything a recipient needs and nothing of Luke's working files:
  READ ME FIRST.txt        how to open it, credit and licence
  Storytelling.html        the whole app in one file (double-click; no Python)          <- built here by build_share
  Start Storytelling.command, server.py, app/   the runnable source copy (macOS, needs python3)
  data/                    elements.json, library.json (exported from app/data/*.js) and added-sources.json
  favicons/                favicon.svg, favicon-32.png, apple-touch-icon.png (the same icons the pages already carry)
Left out on purpose: tests/, verify/, reference/ (13 MB of working images), share/, app-decisions.md, wishlist.md,
StyleGuide.md, __pycache__, older dist files.

Usage:  python3 share/build_bundle.py [--dist DIR]
Needs node (already required by the app's test suite) for the JSON data export.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "share"))

import build_share  # noqa: E402  (path set above)

FAVICONS = ("favicon.svg", "favicon-32.png", "apple-touch-icon.png")
SKIP_NAMES = {".DS_Store", "__pycache__"}
FIXED_TIME = (2026, 1, 1, 0, 0, 0)  # same bytes for the same content

READ_ME = """STORYTELLING {version}
================

An offline reference app: Luke's revised edition of TV Tropes's "Periodic Table of Storytelling"
on one interactive diagram, plus a story map where you build your own story outlines from it.

OPEN IT (easiest, any computer)
  1. Unzip this folder somewhere you can find it (Desktop, Documents).
  2. Double-click  Storytelling.html.  It opens in your normal browser (Safari or Chrome).
  No internet, no install, nothing is sent anywhere.

YOUR STORIES
  Stories you save stay in that browser on that computer only. Opening the file in a different
  browser starts empty. To keep or pass on a story, use Copy and paste the text somewhere.

THE OTHER WAY IN (Mac with python3; optional)
  Double-click  Start Storytelling.command  -- it starts a small local server (this computer only)
  and opens the app in your browser. Close the window to stop it. If macOS objects to an
  unidentified developer, right-click the file, choose Open, then Open again.

WHAT IS IN THIS FOLDER
  Storytelling.html   the whole app in one file
  app/                the same app as separate files (used by the launcher)
  server.py           the local server the launcher runs
  data/               the content as plain JSON: elements.json (217 elements), library.json (12 story
                      maps), added-sources.json (where the 36 added elements' links and numbers came from)
  favicons/           the app's icons

CREDIT AND LICENCE
  Descriptions and examples are adapted from TV Tropes (tvtropes.org), licensed CC BY-NC-SA 3.0
  (https://creativecommons.org/licenses/by-nc-sa/3.0/). Share it for personal, non-commercial use
  only, keep this credit, and share any changes on the same terms. Not affiliated with TV Tropes.
  The poster it revises is by ComputerSherpa, via TV Tropes.
"""

EXPORT_JS = """
import { ELEMENTS, GROUPS, CATEGORIES, ROGUE } from "%(app)s/data/elements.js";
import { LIBRARY } from "%(app)s/data/library.js";
import { writeFileSync } from "node:fs";
writeFileSync(%(elements)s, JSON.stringify({ groups: GROUPS, categories: CATEGORIES, rogue: ROGUE, elements: ELEMENTS }, null, 1) + "\\n");
writeFileSync(%(library)s, JSON.stringify(LIBRARY, null, 1) + "\\n");
"""


def export_data(app_dir: Path, out_dir: Path) -> None:
    """Write elements.json and library.json from the app's own JS modules (single source of truth)."""
    script = EXPORT_JS % {
        "app": json.dumps(app_dir.resolve().as_uri())[1:-1],
        "elements": json.dumps(str(out_dir / "elements.json")),
        "library": json.dumps(str(out_dir / "library.json")),
    }
    result = subprocess.run(["node", "--input-type=module", "-e", script], capture_output=True, text=True)
    if result.returncode != 0:
        raise SystemExit(f"error: data export failed (is node installed?)\n{result.stderr}")


def _files_under(folder: Path) -> list[Path]:
    return sorted(p for p in folder.rglob("*") if p.is_file() and not (set(p.parts) & SKIP_NAMES) and p.name != ".DS_Store")


def collect(root: Path, app_dir: Path, single_file: Path, data_dir: Path, version: str) -> list[tuple[str, bytes, int]]:
    """(archive name, bytes, unix mode) for every file in the bundle, in a fixed order."""
    top = f"Storytelling-{version}"
    entries: list[tuple[str, bytes, int]] = [
        (f"{top}/READ ME FIRST.txt", READ_ME.format(version=version).encode("utf-8"), 0o644),
        (f"{top}/Storytelling.html", single_file.read_bytes(), 0o644),
        (f"{top}/Start Storytelling.command", (root / "Start Storytelling.command").read_bytes(), 0o755),
        (f"{top}/server.py", (root / "server.py").read_bytes(), 0o644),
    ]
    for path in _files_under(app_dir):
        entries.append((f"{top}/app/{path.relative_to(app_dir).as_posix()}", path.read_bytes(), 0o644))
    for path in sorted(data_dir.glob("*.json")):
        entries.append((f"{top}/data/{path.name}", path.read_bytes(), 0o644))
    entries.append((f"{top}/data/added-sources.json", (root / "reference" / "work" / "added-sources.json").read_bytes(), 0o644))
    for name in FAVICONS:
        entries.append((f"{top}/favicons/{name}", (app_dir / name).read_bytes(), 0o644))
    return entries


def build_bundle(root: Path, dist_dir: Path) -> Path:
    app_dir = root / "app"
    with TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        result = build_share.build(app_dir, dist_dir)  # also refreshes dist/Storytelling*.html
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        export_data(app_dir, data_dir)
        entries = collect(root, app_dir, result.outputs[1], data_dir, result.version)
        dist_dir.mkdir(parents=True, exist_ok=True)
        target = dist_dir / f"Storytelling-{result.version}-bundle.zip"
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, payload, mode in entries:
                info = zipfile.ZipInfo(name, FIXED_TIME)
                info.external_attr = (0o100000 | mode) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, payload)
    return target


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build the complete Storytelling share bundle (zip).")
    parser.add_argument("--dist", type=Path, default=PROJECT_ROOT / "dist")
    args = parser.parse_args(argv)
    try:
        target = build_bundle(PROJECT_ROOT, args.dist)
    except build_share.BundleRefused as refused:
        for issue in refused.issues:
            print(f"error: {issue}", file=sys.stderr)
        print("refused: the single-file build failed; no bundle written", file=sys.stderr)
        return 1
    with zipfile.ZipFile(target) as archive:
        count = len(archive.namelist())
    print(f"wrote {target} ({target.stat().st_size} bytes, {count} files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

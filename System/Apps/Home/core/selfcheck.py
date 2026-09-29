"""The start-up check: can Home read and write what it must? Built first because macOS may block a
launchd-started Python from ~/Library/CloudStorage/ — the build's named early risk. Each problem
comes back as one plain sentence naming the path and the likely fix."""

from __future__ import annotations

import os
import sys
from pathlib import Path

MIN_PYTHON = (3, 10)
FIX = ("macOS may be blocking Python from the Dropbox folder: System Settings → Privacy & Security → "
       "Full Disk Access → add {python}")


def problems(apps_dir: Path, bsb_file: Path, credentials_dir: Path, inbox_dir: Path, recipes_dir: Path) -> list[str]:
    found: list[str] = []
    fix = FIX.format(python=sys.executable)
    if sys.version_info < MIN_PYTHON:
        found.append(f"Python {sys.version.split()[0]} is too old; Home needs 3.10 or newer ({sys.executable}).")
    try:
        next(iter(apps_dir.iterdir()), None)
    except OSError as exc:
        found.append(f"Cannot read {apps_dir} ({exc.strerror}). {fix}.")
    try:
        next(iter(recipes_dir.iterdir()), None)
    except OSError as exc:
        found.append(f"Cannot read {recipes_dir} ({exc.strerror}). {fix}.")
    try:
        with bsb_file.open(encoding="utf-8") as handle:
            handle.readline()
    except OSError as exc:
        found.append(f"Cannot read {bsb_file} ({exc.strerror}). {fix}.")
    try:
        credentials_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        probe = credentials_dir / f".write-check-{os.getpid()}"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
    except OSError as exc:
        found.append(f"Cannot write to {credentials_dir} ({exc.strerror}). {fix}.")
    try:
        probe = inbox_dir / f".write-check-{os.getpid()}"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
    except OSError as exc:
        found.append(f"Cannot write to {inbox_dir} ({exc.strerror}). {fix}.")
    from routes import inbox_note, larder  # here, not at the top: routes import core, not the other way round

    if not inbox_note.widget_loads():
        found.append(f"InboxNote is missing or broken at {inbox_note.WIDGET_DIR}.")
    if not larder.widget_loads():
        found.append(f"Larder is missing or broken at {larder.WIDGET_DIR}.")
    return found

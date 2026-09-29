"""Validate a note and write it to `Inbox/` as a new file — never touching an existing one.

Home's `routes/inbox_note.py` is the only caller; it maps `NoteRejected.reason` to its error codes,
so a new reason needs a mapping there too.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from inbox_note.naming import note_stem

MAX_CHARS = 2000
MAX_SUFFIX = 99
SOURCE = "Home · InboxNote"


class NoteRejected(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def _clean(text: str) -> str:
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not cleaned:
        raise NoteRejected("empty")
    if len(cleaned) > MAX_CHARS:
        raise NoteRejected("too_long")
    return cleaned


def _content(note: str, now: datetime) -> str:
    return f"---\nsource: {SOURCE}\ncaptured: {now.isoformat(timespec='seconds')}\n---\n\n{note}\n"


def save_note(inbox_dir: Path, text: str, now: datetime) -> str:
    """Write the note as a new file in `inbox_dir` and return its name.

    Mode "x" makes creation exclusive, so a clash (even between two racing saves) moves on to the
    next numbered suffix instead of overwriting.
    """
    note = _clean(text)
    if not inbox_dir.is_dir():
        raise NoteRejected("no_inbox")
    stem = note_stem(note, now)
    content = _content(note, now)
    for number in range(1, MAX_SUFFIX + 1):
        name = f"{stem}.md" if number == 1 else f"{stem}-{number}.md"
        try:
            with (inbox_dir / name).open("x", encoding="utf-8", newline="\n") as handle:
                handle.write(content)
        except FileExistsError:
            continue
        return name
    raise NoteRejected("name_clash")

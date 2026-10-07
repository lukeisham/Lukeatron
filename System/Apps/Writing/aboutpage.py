"""The one place the app edits app/about.html: each link label (labeltree.create_link) gets its own empty section
appended there, plus a line in the page's contents list, for Luke to write in. A granted exception (app-decisions.md);
only ever called with the path server.py holds, so a test points it at a copy.

A section is `<section id="link-<slug>">` with an `<h2>` and a placeholder line; app/about.js picks it up (Print and Copy
picker) with no change, and CSS counters number it after the sections already there. Nothing here ever removes or rewrites a
section: deleting or renaming a link label leaves its section, which may by then hold writing."""

from __future__ import annotations

import html
import os
import re
import tempfile
import unicodedata
from pathlib import Path

ABOUT_PATH = Path(__file__).resolve().parent / "app" / "about.html"
PLACEHOLDER = "Not yet written."
_CONTENTS_END = re.compile(r'(<nav class="contents".*?)(\s*</ol>)', re.S)


def plain(name: str) -> str:
    """The name without its `*italic*` and `_bold_` markers, as a heading shows it."""
    return re.sub(r"[*_]", "", name)


def free_slug(name: str, taken: set[str]) -> str:
    """`link-<name in lowercase words joined by hyphens>`, with `-2`, `-3` ... added until no id in `taken` has it."""
    folded = unicodedata.normalize("NFKD", plain(name)).encode("ascii", "ignore").decode()
    words = re.sub(r"[^a-z0-9]+", "-", folded.lower()).strip("-")
    base = f"link-{words}" if words else "link"
    slug, count = base, 1
    while slug in taken:
        count += 1
        slug = f"{base}-{count}"
    return slug


def ids_in(about_path: Path) -> set[str]:
    """Every id the page already uses, so a new section never takes one."""
    return set(re.findall(r'\bid="([^"]+)"', about_path.read_text(encoding="utf-8")))


def add_section(about_path: Path, slug: str, title: str) -> None:
    """Appends the empty section before `</main>` and its link to the contents list. Raises ValueError, leaving the
    file as it was, when the page no longer has the contents list or `</main>` to anchor on."""
    text = about_path.read_text(encoding="utf-8")
    heading = html.escape(plain(title))
    contents = _CONTENTS_END.search(text)
    end = text.rfind("</main>")
    if contents is None or end == -1 or f'id="{slug}"' in text:
        raise ValueError(f"{about_path.name} cannot take a new section {slug!r}")
    item = f'\n        <li><a href="#{slug}">{heading}</a></li>'
    section = f'  <section id="{slug}">\n    <h2>{heading}</h2>\n    <p>{PLACEHOLDER}</p>\n  </section>\n'
    # The later anchor goes in first so the earlier offset stays valid.
    text = text[:end] + section + text[end:]
    text = text[:contents.end(1)] + item + text[contents.end(1):]
    _write_whole(about_path, text)


def _write_whole(path: Path, text: str) -> None:
    """Write beside the file then rename over it, so a failure never leaves a half-written page."""
    handle, temporary = tempfile.mkstemp(dir=path.parent, prefix=".about-", suffix=".tmp")
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            stream.write(text)
        os.replace(temporary, path)
    except BaseException:
        Path(temporary).unlink(missing_ok=True)
        raise

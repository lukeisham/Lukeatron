"""The HTML screens: the home page (with the app list rendered in), sign-in, the holding screen,
and Home's own static files."""

from __future__ import annotations

from html import escape

from core.catalog import AppRecord
from core.home import Home
from core.launcher import safe_child
from core.web import Request, Response, error, html_response

GLYPHS = {"live": "●", "file": "●", "stopped": "○", "none": "○", "build": "◌"}
STATE_WORDS = {"live": "running", "file": "ready", "stopped": "starts on open", "none": "no launcher yet", "build": "in build"}
CONTENT_TYPES = {".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml"}


def _row(index: int, record: AppRecord) -> str:
    attr = lambda value: escape(value or "", quote=True)  # noqa: E731
    tag = record.phase if record.state == "build" else record.context
    choosable = record.open_url is not None
    name = (
        f'<a class="name" href="{attr(record.open_url)}" target="_blank" rel="noopener" tabindex="-1">{escape(record.title)}</a>'
        if choosable else f'<span class="name">{escape(record.title)}</span>'
    )
    disabled = "" if choosable else ' aria-disabled="true"'
    return (
        f'<li id="app-{index}" role="option" aria-selected="false" class="row {attr(record.state)}"{disabled}'
        f' data-app="{attr(record.name)}" data-title="{attr(record.title)}" data-context="{attr(record.context)}"'
        f' data-state="{attr(record.state)}" data-phase="{attr(record.phase)}" data-blurb="{attr(record.blurb)}"'
        f' data-open-url="{attr(record.open_url)}">'
        f'<span class="glyph" aria-hidden="true">{GLYPHS[record.state]}</span>{name}'
        f'<span class="tag">{escape(tag or "")}</span>'
        f'<span class="blurb">{escape(record.blurb)}</span>'
        f'<span class="state-word">{STATE_WORDS[record.state]}</span></li>'
    )


def render_rows(records: list[AppRecord]) -> str:
    return "\n".join(_row(index, record) for index, record in enumerate(records))


def index(home: Home, request: Request) -> Response:
    template = (home.static_dir / "index.html").read_text(encoding="utf-8")
    return html_response(template.replace("{{APP_ROWS}}", render_rows(home.records())))


def signin(home: Home, request: Request) -> Response:
    first_run = not home.creds.passkeys()
    template = (home.static_dir / "signin.html").read_text(encoding="utf-8")
    return html_response(template.replace("{{MODE}}", "create" if first_run else "signin"), status=200)


def holding(home: Home, name: str, mode: str, status: int = 200) -> Response:
    """mode: starting (poll until up) · opened (it opens its own tab) · building · unknown (no link)."""
    template = (home.static_dir / "holding.html").read_text(encoding="utf-8")
    text = (
        template.replace("{{NAME}}", escape(name, quote=True))
        .replace("{{TITLE}}", escape(home.title_for(name)))
        .replace("{{MODE}}", mode)
    )
    return html_response(text, status)


# Widgets Home hosts; only their web/ folder is ever served (InboxNote home-hooks FR-2).
HOSTED_WIDGETS = ("InboxNote",)


def widget_file(home: Home, request: Request, name: str, relative: str) -> Response:
    if name not in HOSTED_WIDGETS:
        return error("not_found")
    target = safe_child(home.widgets_dir / name / "web", relative)
    if target is None or target.suffix not in CONTENT_TYPES:
        return error("not_found")
    response = Response(200, target.read_bytes(), CONTENT_TYPES[target.suffix])
    response.headers.append(("Cache-Control", "no-cache"))
    return response


def static(home: Home, request: Request, relative: str) -> Response:
    target = safe_child(home.static_dir, relative)
    if target is None or target.suffix not in CONTENT_TYPES:
        return error("not_found")
    response = Response(200, target.read_bytes(), CONTENT_TYPES[target.suffix])
    response.headers.append(("Cache-Control", "no-cache"))
    return response

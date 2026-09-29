"""/api/verse — today's verse, or {"text": null} when there is none (the page then hides it)."""

from __future__ import annotations

from core.home import Home
from core.web import Request, Response, json_response


def api_verse(home: Home, request: Request) -> Response:
    verse = home.todays_verse()
    return json_response(verse.to_dict() if verse else {"text": None})

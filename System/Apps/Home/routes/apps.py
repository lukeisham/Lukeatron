"""The agent surface's app data: /apps.json and /llms.txt."""

from __future__ import annotations

from datetime import datetime

from core import catalog
from core.home import Home
from core.web import Request, Response, json_response, text_response


def apps_json(home: Home, request: Request) -> Response:
    generated = datetime.now().astimezone().isoformat(timespec="seconds")
    return json_response(catalog.apps_json(home.records(), generated))


def llms_txt(home: Home, request: Request) -> Response:
    return text_response(catalog.llms_text(home.records()))

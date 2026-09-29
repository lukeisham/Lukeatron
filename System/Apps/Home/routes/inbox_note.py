"""POST /api/inbox-note — InboxNote's save, the one route in Home that writes (API-5 exception,
granted for this route alone; see System/Widgets/InboxNote/app-decisions.md).

Home owns the HTTP gate and the status codes; the widget's `inbox_note` package owns the note —
its limit, its filename and the create-only write. The package is loaded from the widget's own
folder, and selfcheck calls `widget_loads` so a missing widget stops Home at start-up.
"""

from __future__ import annotations

import importlib
import logging
import sys
from datetime import datetime
from pathlib import Path
from types import ModuleType

from core.home import Home
from core.web import Request, Response, error, json_response

log = logging.getLogger("home")

WIDGET_DIR = Path(__file__).resolve().parents[3] / "Widgets" / "InboxNote"
REJECTION_CODES = {"empty": "bad_request", "too_long": "too_large", "no_inbox": "unavailable", "name_clash": "server_error"}


def _widget() -> ModuleType:
    if str(WIDGET_DIR) not in sys.path:
        sys.path.insert(0, str(WIDGET_DIR))
    return importlib.import_module("inbox_note")


def widget_loads() -> bool:
    try:
        _widget()
    except ImportError:
        return False
    return True


def save(home: Home, request: Request) -> Response:
    if request.header("origin") not in home.settings.origins:
        return error("forbidden")
    if not home.signed_in(request):
        return error("unauthorised")
    body = request.json()
    text = body.get("text") if isinstance(body, dict) else None
    if not isinstance(text, str):
        return json_response({"error": "bad_request", "message": "text must be a string", "field": "text"}, 400)
    widget = _widget()
    try:
        name = widget.save_note(home.inbox_dir, text, datetime.now().astimezone())
    except widget.NoteRejected as rejected:
        return error(REJECTION_CODES[rejected.reason])
    except OSError:
        log.exception("inbox note write failed on %s %s", request.method, request.path)
        return error("server_error")
    return json_response({"file": name}, 201)

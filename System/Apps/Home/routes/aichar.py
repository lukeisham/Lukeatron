"""AiCharacteristics' routes: GET /api/aichar/criteria, POST /api/aichar/scrape, POST /api/aichar/check.

Home owns the HTTP gate and the status codes; the app's `criteria` package owns the Scrape, the merge and
the JEV judge. Scrape is the one route here that writes (API-5 / PY-12 exception, recorded in Home's
app-decisions.md): signed-in only, Origin-checked, and only inside AiCharacteristics' `data/` folder.
The pasted text is never logged. The package is loaded from the app's own folder, and selfcheck calls
`package_loads` so a missing app stops Home at start-up.
"""

from __future__ import annotations

import importlib
import json
import logging
import sys
import threading
from dataclasses import asdict
from pathlib import Path
from types import ModuleType

from core.home import Home
from core.web import ERROR_STATUS, Request, Response, error, json_response

log = logging.getLogger("home")

PACKAGE_DIR = Path(__file__).resolve().parents[2] / "AiCharacteristics"
APP_NAME = "AiCharacteristics"
SCRAPE_SECONDS = 150
CHECK_SECONDS = 90
NO_KEY = {"error": "unavailable", "message": "no Haiku key is set up"}
TEXT_REJECTION_CODES = {"empty": "bad_request", "too_long": "too_large"}

_scrape_running = threading.Lock()


def _package() -> ModuleType:
    if str(PACKAGE_DIR) not in sys.path:
        sys.path.insert(0, str(PACKAGE_DIR))
    return importlib.import_module("criteria")


def _transport() -> ModuleType:
    _package()
    return importlib.import_module("criteria.transport")


def package_loads() -> bool:
    try:
        _package()
    except ImportError:
        return False
    return True


def _data_dir(home: Home) -> Path:
    return home.apps_dir / APP_NAME / "data"


def _send_within(home: Home, seconds: float):
    transport = _transport()
    return transport.with_deadline(home.send or transport.send_request, seconds)


def _gate(home: Home, request: Request) -> Response | None:
    if request.header("origin") not in home.settings.origins:
        return error("forbidden")
    if not home.signed_in(request):
        return error("unauthorised")
    return None


def criteria_json(home: Home, request: Request) -> Response:
    path = _data_dir(home) / "criteria.json"
    if not path.is_file():
        return json_response({"scraped_at": None, "article_revision": None, "criteria": []})
    try:
        return json_response(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        log.exception("criteria read failed on %s %s", request.method, request.path)
        return error("server_error")


def scrape(home: Home, request: Request) -> Response:
    refused = _gate(home, request)
    if refused:
        return refused
    key = home.creds.anthropic_key()
    if not key:
        return json_response(NO_KEY, 503)
    package = _package()
    if not _scrape_running.acquire(blocking=False):
        return json_response({"error": "conflict", "message": "a Scrape is already running"}, ERROR_STATUS["conflict"])
    try:
        summary = package.run_scrape(_data_dir(home), key, _send_within(home, SCRAPE_SECONDS))
    except package.ScrapeFailed as failed:
        log.warning("scrape failed: %s", failed)
        return json_response({"error": "upstream_failed", "message": str(failed)}, 502)
    finally:
        _scrape_running.release()
    return json_response({"summary": asdict(summary)})


def check(home: Home, request: Request) -> Response:
    refused = _gate(home, request)
    if refused:
        return refused
    body = request.json()
    text = body.get("text") if isinstance(body, dict) else None
    if not isinstance(text, str):
        return json_response({"error": "bad_request", "message": "text must be a string", "field": "text"}, 400)
    key = home.creds.anthropic_key()
    if not key:
        return json_response(NO_KEY, 503)
    package = _package()
    try:
        criteria = package.load_criteria(_data_dir(home))
        verdicts = package.check_text(text, criteria, key, _send_within(home, CHECK_SECONDS))
    except package.TextRejected as rejected:
        code = TEXT_REJECTION_CODES[rejected.reason]
        return json_response({"error": code, "message": str(rejected), "field": "text"}, ERROR_STATUS[code])
    except (package.NoCriteria, package.ScrapeFailed) as unavailable:
        return json_response({"error": "unavailable", "message": str(unavailable)}, 503)
    except package.JudgeError as failed:
        log.warning("check failed: %s", failed)
        return json_response({"error": "upstream_failed", "message": str(failed)}, 502)
    return json_response({"verdicts": [asdict(verdict) for verdict in verdicts]})

"""GET /api/larder/recipes and /api/larder/recipe/<slug> — Larder's read routes.

Home owns the HTTP gate and the status codes; the widget's `larder` package owns the recipes —
their parsing, ordering and the slug rule. Both routes check the session themselves, so the agent
key (which the dispatch gate lets through to data routes) never opens a recipe. The package is
loaded from the widget's own folder, and selfcheck calls `widget_loads` so a missing widget stops
Home at start-up.
"""

from __future__ import annotations

import importlib
import logging
import sys
from pathlib import Path
from types import ModuleType

from core.home import Home
from core.web import Request, Response, error, json_response

log = logging.getLogger("home")

WIDGET_DIR = Path(__file__).resolve().parents[3] / "Widgets" / "Larder"


def _widget() -> ModuleType:
    if str(WIDGET_DIR) not in sys.path:
        sys.path.insert(0, str(WIDGET_DIR))
    return importlib.import_module("larder")


def widget_loads() -> bool:
    try:
        _widget()
    except ImportError:
        return False
    return True


def recipes(home: Home, request: Request) -> Response:
    if not home.signed_in(request):
        return error("unauthorised")
    try:
        found = _widget().list_recipes(home.recipes_dir)
    except OSError:
        log.exception("recipe list failed on %s %s", request.method, request.path)
        return error("server_error")
    return json_response({"recipes": found})


def recipe(home: Home, request: Request, slug: str) -> Response:
    if not home.signed_in(request):
        return error("unauthorised")
    try:
        found = _widget().read_recipe(home.recipes_dir, slug)
    except OSError:
        log.exception("recipe read failed on %s %s", request.method, request.path)
        return error("server_error")
    return error("not_found") if found is None else json_response(found)

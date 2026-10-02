"""/open/<app>, /api/status/<app> and /apps/<app>/<file> — every way into another app."""

from __future__ import annotations

from pathlib import PurePosixPath

from core import launcher
from core.home import Home
from core.web import Request, Response, error, json_response, redirect
from routes import page

FILE_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
}


def open_app(home: Home, request: Request, name: str) -> Response:
    launch = home.launch_for(name)
    if launch is None:
        folder = home.apps_dir / name
        in_build = folder.is_dir() and (folder / "_build").is_dir() and not (folder / "README.md").is_file()
        return page.holding(home, name, "building" if in_build else "unknown", status=404)
    outcome = home.starter.open(name, launch)
    if outcome == "ready":
        return redirect(launcher.target_url(home.settings, name, launch))
    return page.holding(home, name, "opened" if outcome == "opened" else "starting")


def status(home: Home, request: Request, name: str) -> Response:
    launch = home.launch_for(name)
    if launch is None:
        return error("not_found")
    state = home.starter.status(name, launch)
    payload = {"state": state, "target": launcher.target_url(home.settings, name, launch)}
    if state == "failed":
        payload["log"] = launcher.log_tail(home.starter.log_file(name))
    return json_response(payload)


def serve_file(home: Home, request: Request, name: str, relative: str) -> Response:
    """The launch file, plus — when it sits in a sub-folder — the .html/.css/.js beside it, nothing else."""
    launch = home.launch_for(name)
    if launch is None or launch.kind != "file":
        return error("not_found")
    folder = home.apps_dir / name
    web_dir = PurePosixPath(launch.path).parent
    if relative == launch.path:
        target = launcher.safe_child(folder, relative)
    elif web_dir != PurePosixPath(".") and relative.startswith(f"{web_dir}/"):
        target = launcher.safe_child(folder / web_dir, relative[len(f"{web_dir}/"):])
    else:
        return error("not_found")
    if target is None or target.suffix not in FILE_TYPES:
        return error("not_found")
    return Response(200, target.read_bytes(), FILE_TYPES[target.suffix], [("Cache-Control", "no-cache")])

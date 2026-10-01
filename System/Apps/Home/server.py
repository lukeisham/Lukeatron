"""Home's HTTP server: bind 127.0.0.1:8780, run the start-up self-check, dispatch to routes/.

Routes are thin (API-1); this module only turns sockets into core.web.Request values, applies the
gate (a session cookie or the agent key) and turns Responses back into bytes. Order matters:
static paths before dynamic ones (API-7), and /auth/* plus Home's own static files are the only
things reachable before signing in.

Run: python3 server.py   (launchd runs exactly this; see install-launchd.sh)
"""

from __future__ import annotations

import logging
import sys
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Callable

sys.path.insert(0, str(Path(__file__).resolve().parent))

from core import paths, selfcheck  # noqa: E402
from core.credstore import CredStore  # noqa: E402
from core.home import Home  # noqa: E402
from core.settings import load_settings  # noqa: E402
from core.web import BadRequest, Request, Response, error, redirect  # noqa: E402
from routes import aichar, apps, auth, inbox_note, larder, open as open_routes, page, verse  # noqa: E402

log = logging.getLogger("home")

HOST = "127.0.0.1"  # never 0.0.0.0 — remote access, when built, arrives through Tailscale, not a wider bind
MAX_BODY_BYTES = 65536

PUBLIC_POSTS: dict[str, Callable[[Home, Request], Response]] = {
    "/auth/register/options": auth.register_options,
    "/auth/register/verify": auth.register_verify,
    "/auth/login/options": auth.login_options,
    "/auth/login/verify": auth.login_verify,
    "/auth/signout": auth.signout,
}
# POSTs that need a signed-in person (not the agent key); each route checks Origin itself.
SIGNED_IN_POSTS: dict[str, Callable[[Home, Request], Response]] = {
    "/api/inbox-note": inbox_note.save,
    "/api/aichar/scrape": aichar.scrape,
    "/api/aichar/check": aichar.check,
}
DATA_GETS: dict[str, Callable[[Home, Request], Response]] = {
    "/apps.json": apps.apps_json,
    "/llms.txt": apps.llms_txt,
    "/api/verse": verse.api_verse,
    "/api/aichar/criteria": aichar.criteria_json,
    "/api/larder/recipes": larder.recipes,  # the agent key reaches this table, so the route re-checks the session
}


def _split(path: str, prefix: str) -> list[str]:
    return [urllib.parse.unquote(part) for part in path[len(prefix):].split("/", 1)]


def dispatch(home: Home, request: Request) -> Response:
    path, method = request.path, request.method
    host = (request.header("host") or "").split(":")[0]
    if host == "127.0.0.1":
        # A passkey belongs to a name, never a bare IP, so the page must be on localhost.
        return redirect(f"http://localhost:{home.settings.port}{path}", 301)

    if method == "POST":
        # Signed-in POSTs run their own Origin-then-session gate, so the agent key never qualifies.
        handler = PUBLIC_POSTS.get(path) or SIGNED_IN_POSTS.get(path)
        return handler(home, request) if handler else error("not_found")
    if method not in ("GET", "HEAD"):
        return error("method_not_allowed")

    if path.startswith("/static/"):
        return page.static(home, request, path[len("/static/"):])
    if path == "/favicon.ico":
        return error("not_found")

    human = home.signed_in(request)
    agent = home.is_agent(request)
    if not (human or agent):
        return page.signin(home, request) if path == "/" else error("unauthorised")

    if path == "/":
        return page.index(home, request)
    if path in DATA_GETS:
        return DATA_GETS[path](home, request)
    if path.startswith("/api/status/"):
        return open_routes.status(home, request, _split(path, "/api/status/")[0])
    if path.startswith("/api/larder/recipe/"):  # after DATA_GETS: "/api/larder/recipes" has no trailing slash, so no clash
        return larder.recipe(home, request, _split(path, "/api/larder/recipe/")[0])
    if path.startswith("/open/"):
        return open_routes.open_app(home, request, _split(path, "/open/")[0])
    if path.startswith("/widgets/"):
        parts = _split(path, "/widgets/")
        return page.widget_file(home, request, parts[0], parts[1] if len(parts) > 1 else "")
    if path.startswith("/apps/"):
        parts = _split(path, "/apps/")
        return open_routes.serve_file(home, request, parts[0], parts[1] if len(parts) > 1 else "")
    return error("not_found")


def make_handler(home: Home) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        server_version = "Home/1"

        def log_message(self, format: str, *args: object) -> None:  # noqa: A002 — stdlib signature
            pass  # replaced by the one-line-per-request log in _handle

        def _handle(self) -> None:
            started = time.monotonic()
            parsed = urllib.parse.urlsplit(self.path)
            length = int(self.headers.get("Content-Length") or 0)
            if length > MAX_BODY_BYTES:
                response = error("too_large")
            else:
                request = Request(
                    method=self.command,
                    path=parsed.path,
                    query=dict(urllib.parse.parse_qsl(parsed.query)),
                    headers={name.lower(): value for name, value in self.headers.items()},
                    body=self.rfile.read(length) if length else b"",
                    client=self.client_address[0],
                )
                try:
                    response = dispatch(home, request)
                except BadRequest:
                    response = error("bad_request")
                except Exception:  # noqa: BLE001 — API-6: log it, answer cleanly, keep serving
                    log.exception("unhandled error on %s %s", self.command, parsed.path)
                    response = error("server_error")
            self.send_response(response.status)
            self.send_header("Content-Type", response.content_type)
            self.send_header("Content-Length", str(len(response.body)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "same-origin")
            for name, value in response.headers:
                self.send_header(name, value)
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(response.body)
            log.info("%s %s %d %dms", self.command, parsed.path, response.status, (time.monotonic() - started) * 1000)

        do_GET = do_POST = do_HEAD = _handle

    return Handler


def build_home(root: Path, *, credentials_dir: Path | None = None, cache_dir: Path | None = None,
               inbox_dir: Path | None = None, recipes_dir: Path | None = None) -> Home:
    """The overrides exist for tests/verify_server.py, which must never touch the real secrets."""
    return Home(
        settings=load_settings(paths.SETTINGS_FILE),
        apps_dir=paths.apps_dir(root),
        catalog_file=paths.CATALOG_FILE,
        bsb_file=paths.bsb_file(root),
        verses_file=paths.VERSES_FILE,
        cache_dir=cache_dir or paths.CACHE_DIR,
        static_dir=paths.STATIC_DIR,
        creds=CredStore(credentials_dir or paths.credentials_dir(root)),
        widgets_dir=paths.widgets_dir(root),
        inbox_dir=inbox_dir or paths.inbox_dir(root),
        recipes_dir=recipes_dir or paths.recipes_dir(root),
    )


def main() -> int:
    logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    try:
        root = paths.find_root()
    except paths.RootNotFound as exc:
        log.error("%s", exc)
        return 1
    found = selfcheck.problems(paths.apps_dir(root), paths.bsb_file(root), paths.credentials_dir(root),
                              paths.inbox_dir(root), paths.recipes_dir(root))
    for problem in found:
        log.error("self-check: %s", problem)
    if found:
        return 1
    log.info("self-check passed (Python %s at %s)", sys.version.split()[0], sys.executable)

    home = build_home(root)
    if home.settings.remote:
        log.error("settings.json has remote: true, but remote mode is not built yet")
        return 1
    try:
        server = ThreadingHTTPServer((HOST, home.settings.port), make_handler(home))
    except OSError as exc:
        log.error("cannot bind %s:%d — %s", HOST, home.settings.port, exc)
        return 1
    server.daemon_threads = True
    log.info("Home is live at http://localhost:%d", home.settings.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("stopped")
    return 0


if __name__ == "__main__":
    sys.exit(main())

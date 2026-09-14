"""
server.py — the thin stdlib HTTP dispatcher for LukeatronWiki.

Binds 127.0.0.1 only (FR-1), stdlib only (FR-2: `http.server`, `urllib`,
`mimetypes`, `pathlib` — nothing else), single-threaded `HTTPServer` (AD-1 —
no lock needed for capture/enrich's writes because there is never a second
request in flight). Every handler dispatches to `seal` / `library` /
`render` / `search` / `capture` / `enrich`; it holds no business logic and
opens no Long-Term store or wiki control-surface file itself (FR-3) — the
one exception being `static/` assets and the wiki page stylesheet template,
which live outside that tree entirely and are served as raw bytes.

`render.py`, `capture.py`, `enrich.py` are owned by other agents building in
parallel and may not exist yet, or may raise on import while mid-write.
Every import of them is defensive (try/except at module scope, not just
ImportError) so this module always starts even when a sibling is missing or
broken — the affected routes then serve a clear, non-crashing error page
instead of dying at import or mid-request.
"""

import mimetypes
import sys
import traceback
from html import escape as _esc
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, unquote, urlsplit

try:
    from . import paths, seal, library, search as search
except ImportError:
    # Fallback for direct execution (`python3 server.py`, exactly how
    # ensure-wiki.sh and the double-click launcher both invoke this file) —
    # mirrors the dual-import pattern every other module in this app uses.
    import paths
    import seal
    import library
    import search


# ============================================================================
# Defensive imports of sibling modules still being built elsewhere.
# ============================================================================
render = None
capture = None
enrich = None
_import_errors = {}

for _name in ("render", "capture", "enrich"):
    try:
        _mod = __import__(_name)
        globals()[_name] = _mod
    except Exception as _e:  # noqa: BLE001 — deliberately broad: FR-3's
        # "Failure handling" requires surviving a raise at import time too,
        # not just a missing file.
        _import_errors[_name] = _e


def _unavailable_html(module_name, action_desc):
    err = _import_errors.get(module_name)
    detail = f"<p><code>{_esc(str(err))}</code></p>" if err else ""
    return (
        "<html><body>"
        "<h1>LukeatronWiki — temporarily unavailable</h1>"
        f"<p>{_esc(action_desc)} needs <code>{_esc(module_name)}.py</code>, "
        "which is not available right now (still being built, or it failed "
        "to import).</p>"
        f"{detail}"
        "</body></html>"
    )


def _error_html(heading, detail=None):
    body = f"<p>{_esc(str(detail))}</p>" if detail is not None else ""
    return f"<html><body><h1>{_esc(heading)}</h1>{body}</body></html>"


# ============================================================================
# Route-layer path safety — a SECOND, independent refusal of traversal
# attempts, on top of (never instead of) library's own post-resolve
# containment check. Store/page/media/static names in this app routinely
# contain spaces, "&", colons, and even a leading space
# ("BalaclavaPC/ Marketing and Ministry Plan/") — all of that is fine here;
# only the traversal *shape* is rejected.
# ============================================================================


def _is_safe_segment(value):
    """A single path segment: non-empty, no '/', no '\\', not '.' or '..'."""
    if not value:
        return False
    if "/" in value or "\\" in value:
        return False
    if value in (".", ".."):
        return False
    return True


def _is_safe_relpath(value):
    """A (possibly nested) relative path: reject any escape-shaped segment."""
    if not value:
        return False
    if "\\" in value:
        return False
    if value.startswith("/"):
        return False
    for part in value.split("/"):
        if part in ("", ".", ".."):
            return False
    return True


# ============================================================================
# HTTP handler
# ============================================================================

_DO_ROUTES = {"/do/capture", "/do/enrich", "/do/accept", "/do/cancel"}


class Handler(BaseHTTPRequestHandler):
    server_version = "LukeatronWiki/1.0"
    protocol_version = "HTTP/1.1"

    # ---- quiet, no-network logging -----------------------------------
    # BaseHTTPRequestHandler.address_string() calls socket.getfqdn(), which
    # can trigger a resolver lookup. This is a purely local tool bound to
    # 127.0.0.1 (FR-1) that must make zero outbound network calls of any
    # kind (FR-10) — overriding this avoids even an incidental one when a
    # request is merely logged.
    def address_string(self):
        return self.client_address[0]

    def log_message(self, fmt, *args):  # keep default stderr logging, just quiet-ish
        sys.stderr.write("[SERVER] %s - %s\n" % (self.address_string(), fmt % args))

    # ---- small response helpers ----------------------------------------

    def _send_bytes(self, status, data, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_html(self, status, html):
        self._send_bytes(status, html.encode("utf-8"), "text/html; charset=utf-8")

    def _redirect_back(self):
        referer = self.headers.get("Referer") or "/"
        self.send_response(303)
        self.send_header("Location", referer)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _method_not_allowed(self):
        body = b"405 Method Not Allowed"
        self.send_response(405)
        self.send_header("Allow", "POST")
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _not_found(self, msg="Not found."):
        if render is not None:
            try:
                self._send_html(404, render.render_404(msg))
                return
            except Exception:
                traceback.print_exc(file=sys.stderr)
        self._send_html(404, _error_html("404 Not Found", msg))

    def _render_or_error(self, fn_name, *args):
        """Call render.<fn_name>(*args); serve a clear error page instead of
        crashing if render is unavailable or the call itself raises."""
        if render is None:
            self._send_html(503, _unavailable_html("render", "This page"))
            return
        try:
            fn = getattr(render, fn_name)
            html = fn(*args)
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            self._send_html(500, _error_html("This page hit an internal error.", e))
            return
        self._send_html(200, html)

    # ---- GET -------------------------------------------------------------

    def do_GET(self):
        try:
            self._handle_get()
        except Exception as e:  # never a raw stack trace to the client
            traceback.print_exc(file=sys.stderr)
            try:
                self._send_html(500, _error_html("Internal server error.", e))
            except Exception:
                pass

    def _handle_get(self):
        parsed = urlsplit(self.path)
        path = unquote(parsed.path)

        if path in _DO_ROUTES:
            self._method_not_allowed()
            return

        if path == "/" or path == "":
            self._render_or_error("render_home")
            return

        if path.startswith("/page/"):
            slug = path[len("/page/"):]
            if not _is_safe_segment(slug):
                self._not_found("Not found.")
                return
            self._render_or_error("render_page", slug)
            return

        if path.startswith("/store/"):
            store = path[len("/store/"):]
            if not _is_safe_segment(store):
                self._not_found("Not found.")
                return
            self._render_or_error("render_store", store)
            return

        if path == "/backlog":
            self._render_or_error("render_backlog")
            return

        if path == "/search":
            self._handle_search(parsed.query)
            return

        if path.startswith("/media/"):
            self._handle_media(path[len("/media/"):])
            return

        if path.startswith("/static/"):
            self._handle_static(path[len("/static/"):])
            return

        self._not_found("Not found.")

    def _handle_search(self, raw_query):
        qs = parse_qs(raw_query, keep_blank_values=True)
        q = qs.get("q", [""])[0]

        try:
            groups = search.search(q)
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            self._send_html(500, _error_html("Search hit an internal error.", e))
            return

        self._render_or_error("render_search_results", q, groups)

    def _handle_media(self, name):
        # Refusal #1 (route layer) — before this even reaches `library`.
        if not _is_safe_relpath(name):
            self._not_found("Not found.")
            return
        # Refusal #2 — library.media_bytes()'s own post-resolve containment
        # check (the one that actually matters for symlink escapes).
        result = library.media_bytes(name)
        if result is None:
            self._not_found("Not found.")
            return
        data, mimetype = result
        self._send_bytes(200, data, mimetype)

    def _handle_static(self, rel):
        # Refusal #1 (route layer).
        if not _is_safe_relpath(rel):
            self._not_found("Not found.")
            return

        if rel == "wiki-page.css":
            css_path = paths.WIKI_CSS
            if not css_path.is_file():
                self._not_found("Not found.")
                return
            self._send_bytes(200, css_path.read_bytes(), "text/css; charset=utf-8")
            return

        static_dir = paths.STATIC.resolve()
        candidate = (paths.STATIC / rel).resolve()
        # Refusal #2 — post-resolve containment, same discipline library.py
        # applies to every other untrusted-name entry point.
        try:
            candidate.relative_to(static_dir)
        except ValueError:
            self._not_found("Not found.")
            return
        if not candidate.is_file():
            self._not_found("Not found.")
            return

        mimetype, _ = mimetypes.guess_type(candidate.name)
        self._send_bytes(200, candidate.read_bytes(), mimetype or "application/octet-stream")

    # ---- POST --------------------------------------------------------

    def do_POST(self):
        try:
            self._handle_post()
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            try:
                self._send_html(500, _error_html("Internal server error.", e))
            except Exception:
                pass

    def _read_form(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        body = self.rfile.read(length) if length > 0 else b""
        text = body.decode("utf-8", errors="replace")
        parsed = parse_qs(text, keep_blank_values=True)
        return {k: v[0] for k, v in parsed.items()}

    def _handle_post(self):
        parsed = urlsplit(self.path)
        path = unquote(parsed.path)

        # Always drain the request body up front, whatever the route turns
        # out to be (including a 404/503 short-circuit below) — leaving
        # unread bytes on an HTTP/1.1 keep-alive connection corrupts the
        # NEXT request read off the same socket (it gets misparsed as a
        # bogus request line built from the leftover body bytes).
        fields = self._read_form()

        if path == "/do/capture":
            self._do_capture(fields)
        elif path == "/do/enrich":
            self._do_enrich(fields)
        elif path == "/do/accept":
            self._do_accept(fields)
        elif path == "/do/cancel":
            self._do_cancel(fields)
        else:
            self._not_found("Not found.")

    def _do_capture(self, fields):
        if capture is None:
            self._send_html(503, _unavailable_html("capture", "Quick-capture"))
            return
        try:
            capture.capture_submit(
                title=fields.get("title", ""),
                kind=fields.get("kind", ""),
                intent=fields.get("intent", ""),
                source=fields.get("source", ""),
                page=fields.get("page", ""),
                note=fields.get("note") or None,
            )
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            self._send_html(500, _error_html("Quick-capture hit an internal error.", e))
            return
        self._redirect_back()

    def _enrich_action(self, action_name, human_label, fields):
        if enrich is None:
            self._send_html(503, _unavailable_html("enrich", human_label))
            return
        try:
            fn = getattr(enrich, action_name)
            fn(fields.get("slug", ""), fields.get("slot", ""))
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            self._send_html(500, _error_html(f"{human_label} hit an internal error.", e))
            return
        self._redirect_back()

    def _do_enrich(self, fields):
        self._enrich_action("request_enrich", "Requesting an enrichment", fields)

    def _do_accept(self, fields):
        self._enrich_action("accept", "Accepting a draft", fields)

    def _do_cancel(self, fields):
        self._enrich_action("cancel", "Cancelling a request/draft", fields)


# ============================================================================
# Startup
# ============================================================================


def _startup_seal_log():
    """
    FR-11: log the seal state at startup, before the socket accepts its
    first request — in addition to (not instead of) seal's own per-request
    re-parse. A missing/corrupt manifest must be visible in the server's own
    boot output immediately, not only on the first page load.
    """
    manifest = seal.load()
    if manifest.get("_failure"):
        print(
            "[SERVER] CRITICAL: _sealed.yaml is missing, empty, or malformed at "
            "startup — treating EVERY store and file as sealed until it is "
            "restored.",
            file=sys.stderr,
        )
    else:
        n_stores = len(manifest["stores"])
        n_files = len(manifest["files"])
        print(
            f"[SERVER] seal manifest OK at startup: {n_stores} stores sealed, "
            f"{n_files} files sealed ({n_stores + n_files} total)."
        )


def build_server(port=None):
    """
    Log the startup seal state and bind the socket. Returns the bound
    `HTTPServer`, or `None` if the port is already taken (FR-4: idempotent
    start — `ensure-wiki.sh` probes first, but a race window remains, and
    this must not crash ugly if raced).

    `port=None` uses `paths.PORT` (env `LUKEATRONWIKI_PORT`, default 8787);
    tests pass `port=0` for an OS-assigned ephemeral port so a running
    instance on 8787 is never disturbed.
    """
    _startup_seal_log()
    bind_port = paths.PORT if port is None else port
    try:
        return HTTPServer(("127.0.0.1", bind_port), Handler)
    except OSError:
        return None


def main():
    httpd = build_server()
    if httpd is None:
        print(
            f"[SERVER] port {paths.PORT} is already in use — assuming another "
            "instance is live, exiting cleanly (idempotent start).",
            file=sys.stderr,
        )
        sys.exit(0)

    print(f"[SERVER] LukeatronWiki serving on http://127.0.0.1:{httpd.server_address[1]}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()

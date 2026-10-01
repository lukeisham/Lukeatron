"""Request and Response as plain values, so routes are testable without a socket, plus the error
registry (API-3): every failure a route returns names one of these codes."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from http.cookies import CookieError, SimpleCookie
from typing import Any

ERROR_STATUS: dict[str, int] = {
    "bad_request": 400,
    "unauthorised": 401,
    "forbidden": 403,
    "not_found": 404,
    "method_not_allowed": 405,
    "conflict": 409,
    "too_large": 413,
    "server_error": 500,
    "upstream_failed": 502,
    "unavailable": 503,
}

ERROR_TEXT: dict[str, str] = {
    "unauthorised": "sign in or send X-Home-Key",
}


@dataclass
class Request:
    method: str
    path: str
    query: dict[str, str]
    headers: dict[str, str]  # lower-cased names
    body: bytes = b""
    client: str = "127.0.0.1"

    def header(self, name: str) -> str | None:
        return self.headers.get(name.lower())

    def cookie(self, name: str) -> str | None:
        raw = self.header("cookie")
        if not raw:
            return None
        jar: SimpleCookie = SimpleCookie()
        try:
            jar.load(raw)
        except CookieError:
            return None
        morsel = jar.get(name)
        return morsel.value if morsel else None

    def json(self) -> Any:
        try:
            return json.loads(self.body or b"null")
        except ValueError as exc:
            raise BadRequest("body is not JSON") from exc


@dataclass
class Response:
    status: int = 200
    body: bytes = b""
    content_type: str = "text/plain; charset=utf-8"
    headers: list[tuple[str, str]] = field(default_factory=list)


class BadRequest(Exception):
    pass


def json_response(payload: Any, status: int = 200, headers: list[tuple[str, str]] | None = None) -> Response:
    return Response(status, json.dumps(payload).encode(), "application/json; charset=utf-8", headers or [])


def html_response(text: str, status: int = 200) -> Response:
    return Response(status, text.encode(), "text/html; charset=utf-8")


def text_response(text: str, status: int = 200) -> Response:
    return Response(status, text.encode(), "text/plain; charset=utf-8")


def redirect(location: str, status: int = 302) -> Response:
    return Response(status, b"", headers=[("Location", location)])


def error(code: str) -> Response:
    return json_response({"error": code, "message": ERROR_TEXT.get(code, code.replace("_", " "))}, ERROR_STATUS[code])

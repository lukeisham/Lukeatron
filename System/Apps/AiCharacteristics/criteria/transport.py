"""The one place a request leaves this package, so tests can swap it for a fake.

Every caller takes `send` as a parameter defaulting to `send_request`.
"""

from __future__ import annotations

import time
import urllib.error
import urllib.request
from collections.abc import Callable

REQUEST_TIMEOUT_SECONDS = 60
MAX_RESPONSE_BYTES = 4 * 1024 * 1024

Send = Callable[[urllib.request.Request], bytes]


class TransportError(RuntimeError):
    """The request failed or came back unusable. The message never carries headers or the key."""


def send_request(request: urllib.request.Request) -> bytes:
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
    except urllib.error.HTTPError as error:
        raise TransportError(f"{request.host} answered HTTP {error.code}") from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise TransportError(f"could not reach {request.host}") from error
    if len(body) > MAX_RESPONSE_BYTES:
        raise TransportError(f"{request.host} sent more than {MAX_RESPONSE_BYTES} bytes")
    return body


def with_deadline(send: Send, seconds: float, clock: Callable[[], float] = time.monotonic) -> Send:
    """Refuse to start a request once `seconds` have passed since this call.

    A request already under way still ends by its own timeout, so the total can overrun by one request.
    """
    started = clock()

    def send_before_deadline(request: urllib.request.Request) -> bytes:
        if clock() - started > seconds:
            raise TransportError("ran out of time")
        return send(request)

    return send_before_deadline

"""A scripted stand-in for `send`: it answers requests in the order given and records every one."""

import json
import urllib.request

from criteria.transport import TransportError

KEY = "test-key-not-real"


def model_reply(payload) -> bytes:
    text = payload if isinstance(payload, str) else json.dumps(payload)
    return json.dumps({"stop_reason": "end_turn", "content": [{"type": "text", "text": text}]}).encode()


class Scripted:
    def __init__(self, *replies):
        self.replies = list(replies)
        self.requests: list[urllib.request.Request] = []

    def __call__(self, request: urllib.request.Request) -> bytes:
        self.requests.append(request)
        if not self.replies:
            raise AssertionError(f"unexpected extra request to {request.full_url}")
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply

    @property
    def hosts(self) -> list[str]:
        return [request.host for request in self.requests]

    def body(self, index: int) -> dict:
        return json.loads(self.requests[index].data)


def unreachable() -> TransportError:
    return TransportError("could not reach example")

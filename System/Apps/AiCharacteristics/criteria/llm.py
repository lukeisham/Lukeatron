"""One call to a cheap model, shared by the Scrape skill (extract, explain) and the JEV judge.

Both providers speak the Anthropic Messages format, so one request shape serves both. The key is passed in by
the caller and travels only in the request header; it is never logged.
"""

from __future__ import annotations

import json
import re
import urllib.request
from dataclasses import dataclass, field
from typing import Any

from criteria.transport import Send, TransportError, send_request

API_VERSION = "2023-06-01"
DEFAULT_MAX_TOKENS = 4096

_FENCE = re.compile(r"^```(?:json)?\s*(.*?)\s*```$", re.DOTALL)


@dataclass(frozen=True)
class Provider:
    label: str
    url: str
    model: str
    key_file: str  # the file in System/Credentials/Home/ that holds this provider's key
    extra: dict[str, Any] = field(default_factory=dict)


HAIKU = Provider("Haiku", "https://api.anthropic.com/v1/messages", "claude-haiku-4-5-20251001", "anthropic-key")
# Thinking is on by default at DeepSeek and would spend the reply budget on reasoning these plain jobs do not need.
DEEPSEEK = Provider("DeepSeek", "https://api.deepseek.com/anthropic/v1/messages", "deepseek-flash", "deepseek-key",
                    {"thinking": {"type": "disabled"}})


class LlmError(RuntimeError):
    """The call failed, was cut short, or did not return what was asked for."""


def ask(system: str, user: str, key: str, *, provider: Provider = HAIKU, max_tokens: int = DEFAULT_MAX_TOKENS,
        send: Send = send_request) -> str:
    payload = {"model": provider.model, "max_tokens": max_tokens, "temperature": 0, "system": system,
               "messages": [{"role": "user", "content": user}], **provider.extra}
    request = urllib.request.Request(
        provider.url, data=json.dumps(payload).encode("utf-8"), method="POST",
        headers={"content-type": "application/json", "x-api-key": key, "anthropic-version": API_VERSION})
    try:
        reply = json.loads(send(request))
    except TransportError as error:
        raise LlmError(f"the {provider.label} call failed: {error}") from error
    except json.JSONDecodeError as error:
        raise LlmError(f"the {provider.label} reply was not JSON") from error
    return _reply_text(reply, provider)


def ask_json(system: str, user: str, key: str, *, provider: Provider = HAIKU, max_tokens: int = DEFAULT_MAX_TOKENS,
             send: Send = send_request) -> Any:
    return parse_json_reply(ask(system, user, key, provider=provider, max_tokens=max_tokens, send=send), provider)


def parse_json_reply(text: str, provider: Provider = HAIKU) -> Any:
    stripped = text.strip()
    fenced = _FENCE.match(stripped)
    try:
        return json.loads(fenced.group(1) if fenced else stripped)
    except json.JSONDecodeError as error:
        raise LlmError(f"{provider.label}'s answer was not valid JSON") from error


def _reply_text(reply: Any, provider: Provider) -> str:
    if not isinstance(reply, dict) or not isinstance(reply.get("content"), list):
        raise LlmError(f"the {provider.label} reply had no content")
    if reply.get("stop_reason") == "max_tokens":
        raise LlmError(f"{provider.label}'s answer was cut short")
    text = "".join(block.get("text", "") for block in reply["content"] if block.get("type") == "text")
    if not text.strip():
        raise LlmError(f"{provider.label}'s answer was empty")
    return text

"""AiCharacteristics' routes: GET /api/aichar/criteria, POST /api/aichar/scrape, POST /api/aichar/check.

Both buttons run a Skillbank skill with headless Claude Code (`claude -p`), on Luke's own Claude sign-in, so
there is no API key anywhere: Scrape runs `!ScrapeAiCharacteristics`, Check runs `!CheckAiCharacteristics`.
Home owns the HTTP gate, the status codes, the time limits and what each run may touch; the skills own the
work. Scrape is the one route here that writes (API-5 / PY-12 exception, recorded in Home's app-decisions.md):
signed-in only, Origin-checked, and the run may write only AiCharacteristics' `data/` folder. Check writes
nothing. Replies from both skills are untrusted until validated here. The pasted text goes to the run's stdin,
never into a command line or a log. Tests pass `Home.claude`, a fake of `run_claude`.
"""

from __future__ import annotations

import importlib
import json
import logging
import os
import shutil
import subprocess
import sys
import threading
from dataclasses import asdict
from pathlib import Path
from types import ModuleType

from core.home import Home
from core.web import ERROR_STATUS, Request, Response, error, json_response

log = logging.getLogger("home")

LUKEATRON = Path(__file__).resolve().parents[3]
PACKAGE_DIR = Path(__file__).resolve().parents[2] / "AiCharacteristics"
SKILL_DIR = LUKEATRON / "Skillbank" / "PersonalResearch"
APP_NAME = "AiCharacteristics"
DATA_RULE = "Write(System/Apps/AiCharacteristics/data/**)"
SCRAPE_SECONDS = 600
CHECK_SECONDS = 180
SCRAPE_TOOLS = ("Read", "Bash(curl:*)", "Bash(cp:*)", "Bash(mkdir:*)", DATA_RULE)
CHECK_TOOLS = ("Read",)
TEXT_REJECTION_CODES = {"empty": "bad_request", "too_long": "too_large"}
SCRAPE_KEYS = ("new", "changed", "retired", "flagged")

_scrape_running = threading.Lock()
_check_running = threading.Lock()


class ClaudeFailed(RuntimeError):
    """The headless run did not finish; the message is safe to show Luke."""


def _package() -> ModuleType:
    if str(PACKAGE_DIR) not in sys.path:
        sys.path.insert(0, str(PACKAGE_DIR))
    return importlib.import_module("criteria")


def package_loads() -> bool:
    try:
        _package()
    except ImportError:
        return False
    return all((SKILL_DIR / name / "skill.md").is_file()
               for name in ("!ScrapeAiCharacteristics", "!CheckAiCharacteristics"))


def _claude_binary() -> str | None:
    return shutil.which("claude") or next(
        (str(path) for path in (Path.home() / ".local" / "bin" / "claude", Path("/opt/homebrew/bin/claude"),
                                Path("/usr/local/bin/claude")) if path.is_file()), None)


def run_claude(prompt: str, stdin: str, tools: tuple[str, ...], seconds: float, turns: int) -> str:
    """Run one headless Claude Code session from the Lukeatron root and return its final reply text."""
    binary = _claude_binary()
    if binary is None:
        raise ClaudeFailed("Claude Code is not installed on this Mac, so this cannot run")
    command = [binary, "-p", prompt, "--output-format", "json", "--permission-mode", "dontAsk",
               "--max-turns", str(turns), "--no-session-persistence", "--allowedTools", ",".join(tools)]
    try:
        done = subprocess.run(command, input=stdin, capture_output=True, text=True, timeout=seconds,
                              cwd=LUKEATRON, env={**os.environ, "HOME": str(Path.home())}, check=False)
    except subprocess.TimeoutExpired as late:
        raise ClaudeFailed(f"it took longer than {int(seconds)} seconds, so it was stopped") from late
    except OSError as failed:
        raise ClaudeFailed(f"Claude Code could not be started: {failed.strerror or failed}") from failed
    try:
        reply = json.loads(done.stdout)
    except ValueError as unreadable:
        raise ClaudeFailed("Claude Code gave a reply this page cannot read") from unreadable
    if not isinstance(reply, dict) or reply.get("is_error") or not isinstance(reply.get("result"), str):
        message = str(reply.get("result", "")) if isinstance(reply, dict) else ""
        if "authenticate" in message or "OAuth" in message or "login" in message.lower():
            raise ClaudeFailed("Claude Code is not signed in on this Mac; run claude in Terminal and sign in once")
        raise ClaudeFailed("Claude Code stopped before it finished")
    return reply["result"]


def _claude(home: Home):
    return home.claude or run_claude


def _data_dir(home: Home) -> Path:
    return home.apps_dir / APP_NAME / "data"


def _gate(home: Home, request: Request) -> Response | None:
    if request.header("origin") not in home.settings.origins:
        return error("forbidden")
    if not home.signed_in(request):
        return error("unauthorised")
    return None


def _json_object(text: str) -> dict | list | None:
    body = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(body)
    except ValueError:
        return None


def criteria_json(home: Home, request: Request) -> Response:
    path = _data_dir(home) / "criteria.json"
    if not path.is_file():
        return json_response({"scraped_at": None, "article_title": None, "article_revision": None, "criteria": []})
    try:
        return json_response(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        log.exception("criteria read failed on %s %s", request.method, request.path)
        return error("server_error")


def _scrape_summary(reply: dict) -> dict | None:
    """The skill's reply, if it has the shape the page reads; anything else is not trusted."""
    if not isinstance(reply.get("total"), int) or isinstance(reply.get("total"), bool):
        return None
    if not all(isinstance(reply.get(key), list) and all(isinstance(i, str) for i in reply[key]) for key in SCRAPE_KEYS):
        return None
    summary = {"total": reply["total"], **{key: reply[key] for key in SCRAPE_KEYS}}
    summary["unchanged"] = reply.get("unchanged") is True
    summary["report"] = reply["report"] if isinstance(reply.get("report"), str) else ""
    return summary


def scrape(home: Home, request: Request) -> Response:
    refused = _gate(home, request)
    if refused:
        return refused
    if not _scrape_running.acquire(blocking=False):
        return json_response({"error": "conflict", "message": "a Scrape is already running"}, ERROR_STATUS["conflict"])
    prompt = ("Read System/Skillbank/PersonalResearch/!ScrapeAiCharacteristics/skill.md and follow it exactly. "
              "Reply with its final JSON object only.")
    try:
        text = _claude(home)(prompt, "", SCRAPE_TOOLS, SCRAPE_SECONDS, 40)
    except ClaudeFailed as failed:
        log.warning("scrape failed: %s", failed)
        return json_response({"error": "upstream_failed", "message": str(failed)}, 502)
    finally:
        _scrape_running.release()
    reply = _json_object(text)
    if isinstance(reply, dict) and isinstance(reply.get("error"), str):
        log.warning("scrape stopped: %s", reply["error"])
        return json_response({"error": "upstream_failed", "message": reply["error"]}, 502)
    summary = _scrape_summary(reply) if isinstance(reply, dict) else None
    if summary is None:
        log.warning("scrape reply was not in the expected shape")
        return json_response({"error": "upstream_failed", "message": "the Scrape did not report back in a form this page "
                              "can read; the saved criteria may still have changed, so reload the page"}, 502)
    return json_response({"summary": summary})


def check(home: Home, request: Request) -> Response:
    refused = _gate(home, request)
    if refused:
        return refused
    body = request.json()
    text = body.get("text") if isinstance(body, dict) else None
    if not isinstance(text, str):
        return json_response({"error": "bad_request", "message": "text must be a string", "field": "text"}, 400)
    package = _package()
    try:
        package.require_checkable(text)
        criteria = package.load_criteria(_data_dir(home))
        if not any(c.get("status") != "retired" for c in criteria):
            raise package.NoCriteria("there are no criteria to check against; run a Scrape first")
    except package.TextRejected as rejected:
        code = TEXT_REJECTION_CODES[rejected.reason]
        return json_response({"error": code, "message": str(rejected), "field": "text"}, ERROR_STATUS[code])
    except (package.NoCriteria, package.StoreError) as unavailable:
        return json_response({"error": "unavailable", "message": str(unavailable)}, 503)
    if not _check_running.acquire(blocking=False):
        return json_response({"error": "conflict", "message": "a Check is already running"}, ERROR_STATUS["conflict"])
    prompt = ("Read System/Skillbank/PersonalResearch/!CheckAiCharacteristics/skill.md and follow it exactly. "
              "The passage to check is the input text that follows this instruction. Reply with its JSON only.")
    try:
        reply = _claude(home)(prompt, text, CHECK_TOOLS, CHECK_SECONDS, 8)
        verdicts = package.parse_verdicts(reply, criteria)
    except ClaudeFailed as failed:
        log.warning("check failed: %s", failed)
        return json_response({"error": "upstream_failed", "message": str(failed)}, 502)
    except package.NoCriteria as unavailable:
        return json_response({"error": "unavailable", "message": str(unavailable)}, 503)
    except package.JudgeError as failed:
        log.warning("check failed: %s", failed)
        return json_response({"error": "upstream_failed", "message": str(failed)}, 502)
    finally:
        _check_running.release()
    return json_response({"verdicts": [asdict(verdict) for verdict in verdicts]})

"""Starting apps and pointing the browser at them — the single place /open/<app> resolves.

The command run for an app always comes from catalog.json, never from the request. Processes are
started detached (their own session, no stdin) so they outlive Home. Their output goes to Home's
own cache/launch-<name>.log, never into the other app's folder: Home writes nothing there.

`target_url` is the remote seam. Today it points at the app's own loopback port; when remote mode
is built, it is the one function that changes to point through Home instead.
"""

from __future__ import annotations

import logging
import subprocess
import sys
import threading
import time
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from core.settings import Settings

log = logging.getLogger("home.launcher")

START_TIMEOUT_S = 8.0
KINDS = ("ensure", "server", "file", "self-opening")


class LaunchError(Exception):
    pass


@dataclass(frozen=True)
class Launch:
    kind: str
    port: int | None = None
    script: str | None = None
    entry: str | None = None
    path: str | None = None
    cwd: str | None = None


def parse_launch(raw: dict[str, Any]) -> Launch:
    kind = raw.get("kind")
    if kind not in KINDS:
        raise LaunchError(f"unknown launch kind {kind!r}")
    launch = Launch(
        kind=kind,
        port=int(raw["port"]) if "port" in raw else None,
        script=raw.get("script"),
        entry=raw.get("entry"),
        path=raw.get("path"),
        cwd=raw.get("cwd"),
    )
    required = {"ensure": ("script", "port"), "server": ("entry", "port"), "file": ("path",), "self-opening": ("entry",)}
    missing = [field for field in required[kind] if getattr(launch, field) is None]
    if missing:
        raise LaunchError(f"{kind} launch needs {', '.join(missing)}")
    return launch


def target_url(settings: Settings, name: str, launch: Launch) -> str:
    if settings.remote:
        raise LaunchError("remote mode is not built yet")
    if launch.kind == "file":
        return f"/apps/{name}/{launch.path}"
    return f"http://127.0.0.1:{launch.port}/"


def safe_child(base: Path, relative: str) -> Path | None:
    """The file under `base` that `relative` names, or None if it would escape `base` (.., symlinks)."""
    base = base.resolve()
    candidate = (base / relative).resolve()
    if candidate != base and base in candidate.parents and candidate.is_file():
        return candidate
    return None


def _spawn(argv: list[str], cwd: Path, log_file: Path) -> None:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    with log_file.open("ab") as out:
        subprocess.Popen(
            argv,
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            stdout=out,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )


def log_tail(log_file: Path, lines: int = 20) -> list[str]:
    try:
        with log_file.open(encoding="utf-8", errors="replace") as handle:
            return [line.rstrip("\n") for line in deque(handle, maxlen=lines)]
    except OSError:
        return []


class Starter:
    """Single-flight starts: a second /open while an app is starting joins the first start."""

    def __init__(
        self,
        apps_dir: Path,
        log_dir: Path,
        *,
        probe_fn: Callable[[int], bool],
        spawn: Callable[[list[str], Path, Path], None] = _spawn,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.apps_dir = apps_dir
        self.log_dir = log_dir
        self._probe = probe_fn
        self._spawn = spawn
        self._clock = clock
        self._started: dict[str, float] = {}
        self._lock = threading.Lock()

    def log_file(self, name: str) -> Path:
        return self.log_dir / f"launch-{name}.log"

    def _argv(self, app_dir: Path, launch: Launch) -> tuple[list[str], Path]:
        if launch.kind == "ensure":
            return ["/bin/bash", str(app_dir / launch.script)], app_dir
        cwd = app_dir / launch.cwd if launch.cwd else app_dir
        return [sys.executable, str(cwd / launch.entry)], cwd

    def open(self, name: str, launch: Launch) -> str:
        """Returns "ready" (go now), "starting" (show the holding screen) or "opened" (it opens its own tab)."""
        if launch.kind == "file":
            return "ready"
        if launch.kind != "self-opening" and self._probe(launch.port):
            return "ready"
        with self._lock:
            started = self._started.get(name)
            if started is not None and self._clock() - started < START_TIMEOUT_S:
                return "opened" if launch.kind == "self-opening" else "starting"
            self._started[name] = self._clock()
        argv, cwd = self._argv(self.apps_dir / name, launch)
        log.info("starting %s: %s", name, " ".join(argv))
        self._spawn(argv, cwd, self.log_file(name))
        return "opened" if launch.kind == "self-opening" else "starting"

    def status(self, name: str, launch: Launch) -> str:
        """live · starting · failed — polled by the holding screen."""
        if launch.kind == "file" or (launch.port is not None and self._probe(launch.port)):
            with self._lock:
                self._started.pop(name, None)
            return "live"
        with self._lock:
            started = self._started.get(name)
        if started is None or self._clock() - started >= START_TIMEOUT_S:
            return "failed"
        return "starting"

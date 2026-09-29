"""Every app Home knows about: which exist, how far built, what for, and whether each is up.

Existence and build phase come from the folders in System/Apps/ (no list is kept of which apps
exist); context, blurb and launch method come from Home's own catalog.json. The records built
here are the one shape the page, apps.json, llms.txt and the launcher all consume.
"""

from __future__ import annotations

import json
import logging
import socket
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Callable

log = logging.getLogger("home.catalog")

CONTEXT_ORDER = ("Church", "Teaching", "Personal Research", "Personal Productivity", "Lukeatron", "Unsorted")
UNSORTED = "Unsorted"
SELF_NAME = "Home"
PROBE_TIMEOUT_S = 0.15


@dataclass(frozen=True)
class Folder:
    name: str
    built: bool
    phase: str | None


@dataclass(frozen=True)
class AppRecord:
    name: str  # the folder name — the stable id used in /open/<name>
    title: str  # what Luke sees; the folder name unless catalog.json gives a display title
    context: str
    blurb: str
    state: str  # live · stopped · file · none · build
    phase: str | None
    port: int | None
    open_url: str | None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def read_phase(folder: Path) -> str:
    """Mirrors !AppDevelopment STEP 1's reading of _build/ — if that layout changes, so must this."""
    build_dir = folder / "_build"
    if (build_dir / "build.md").is_file():
        return "build"
    specs = build_dir / "specs"
    if specs.is_dir() and any(specs.iterdir()):
        return "specs"
    return "PRD"


def scan_apps(apps_dir: Path) -> list[Folder]:
    folders: list[Folder] = []
    for entry in sorted(apps_dir.iterdir(), key=lambda p: p.name.lower()):
        if not entry.is_dir() or entry.name.startswith(("_", ".")) or entry.name == SELF_NAME:
            continue
        if (entry / "README.md").is_file():
            folders.append(Folder(entry.name, built=True, phase=None))
        elif (entry / "_build").is_dir():
            folders.append(Folder(entry.name, built=False, phase=read_phase(entry)))
    return folders


def load_catalog(path: Path) -> dict[str, dict[str, Any]]:
    with path.open(encoding="utf-8") as handle:
        raw = json.load(handle)
    return raw["apps"]


def probe(port: int, timeout: float = PROBE_TIMEOUT_S) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout):
            return True
    except OSError:
        return False


def launch_port(launch: dict[str, Any] | None) -> int | None:
    if not launch or "port" not in launch:
        return None
    return int(launch["port"])


def _state(folder: Folder, launch: dict[str, Any] | None, is_up: bool | None) -> str:
    if not folder.built:
        return "build"
    if not launch:
        return "none"
    if launch["kind"] == "file":
        return "file"
    if launch["kind"] == "self-opening":
        return "stopped"  # its port is its own choice, so every open starts it afresh
    return "live" if is_up else "stopped"


def _sort_key(record: AppRecord) -> tuple[int, str]:
    return (CONTEXT_ORDER.index(record.context), record.title.lower())


def build_records(
    apps_dir: Path,
    catalog: dict[str, dict[str, Any]],
    *,
    probe_fn: Callable[[int], bool] = probe,
) -> list[AppRecord]:
    folders = scan_apps(apps_dir)
    present = {folder.name for folder in folders}
    for missing in sorted(set(catalog) - present):
        log.info("catalog entry %s has no folder in %s; ignored", missing, apps_dir)

    ports = {
        folder.name: port
        for folder in folders
        if folder.built and (port := launch_port(catalog.get(folder.name, {}).get("launch"))) is not None
    }
    with ThreadPoolExecutor(max_workers=max(1, len(ports))) as pool:
        up = dict(zip(ports, pool.map(probe_fn, ports.values())))

    records = []
    for folder in folders:
        entry = catalog.get(folder.name, {})
        launch = entry.get("launch") if folder.built else None
        context = entry.get("context", UNSORTED)
        if context not in CONTEXT_ORDER:
            log.info("catalog entry %s has unknown context %r; shown as Unsorted", folder.name, context)
            context = UNSORTED
        state = _state(folder, launch, up.get(folder.name))
        records.append(
            AppRecord(
                name=folder.name,
                title=entry.get("title", folder.name),
                context=context,
                blurb=entry.get("blurb", ""),
                state=state,
                phase=folder.phase,
                port=launch_port(launch),
                open_url=f"/open/{folder.name}" if state not in ("build", "none") else None,
            )
        )
    return sorted(records, key=_sort_key)


def apps_json(records: list[AppRecord], generated: str) -> dict[str, Any]:
    return {"generated": generated, "apps": [record.to_dict() for record in records]}


def llms_text(records: list[AppRecord]) -> str:
    lines = [
        "# Home — Lukeatron's front door",
        "",
        "Home lists every Lukeatron app and starts any of them. It runs on each Mac at",
        "http://localhost:8780 and answers agents that send the header",
        "`X-Home-Key: <key>`, where the key is the contents of",
        "System/Credentials/Home/agent-key.",
        "",
        "## Endpoints",
        "- GET /apps.json — every app: name, title, context, blurb, state, phase, port, open_url",
        "- GET /open/<name> — start the app if needed, then redirect to it",
        "- GET /api/status/<name> — {state, target} while an app is starting",
        "- GET /api/verse — today's verse: NIV online, Berean Standard Bible offline",
        "",
        "## States",
        "- live — running; open_url redirects straight to it",
        "- stopped — not running; open_url starts it first",
        "- file — a single-file app Home serves itself; always ready",
        "- none — built, but Home has no launch entry for it yet",
        "- build — still being built (phase: PRD, specs or build); no link",
        "",
        "## Apps",
    ]
    for record in records:
        phase = f" ({record.phase})" if record.phase else ""
        lines.append(f"- {record.title} [{record.name}] — {record.context} — {record.state}{phase} — {record.blurb}")
    return "\n".join(lines) + "\n"

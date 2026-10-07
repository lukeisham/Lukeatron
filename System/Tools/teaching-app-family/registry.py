"""What the Teaching App family is: its member apps, which of their files are function (code the apps share) rather than
data (content that belongs to one app), and where the tool keeps its working state. Everything else in this folder asks
this module; nothing else reads family.json."""

from __future__ import annotations

import fnmatch
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

TOOL_DIR = Path(__file__).resolve().parent
LUKEATRON = TOOL_DIR.parents[2]
MERGE = "merge"  # a member whose files are ported by three-way merge
MANUAL = "manual"  # a member whose code has diverged: changes are reported, never merged


@dataclass(frozen=True)
class Member:
    name: str
    db: str
    port: int
    item: str
    items: str
    mode: str


@dataclass(frozen=True)
class Family:
    root: Path
    apps_dir: Path
    state_dir: Path
    members: dict[str, Member]
    function_globs: tuple[str, ...]
    data_globs: tuple[str, ...]
    only: dict[str, tuple[str, ...]]


def load_family(config: Path = TOOL_DIR / "family.json", root: Path = LUKEATRON, state_dir: Path | None = None) -> Family:
    raw = json.loads(config.read_text(encoding="utf-8"))
    members = {name: Member(name=name, **fields) for name, fields in raw["members"].items()}
    return Family(
        root=root,
        apps_dir=root / raw["apps_dir"],
        state_dir=state_dir or TOOL_DIR / "state",
        members=members,
        function_globs=tuple(raw["function_globs"]),
        data_globs=tuple(raw["data_globs"]),
        only={app: tuple(globs) for app, globs in raw["only"].items()},
    )


def is_function_file(family: Family, rel: str) -> bool:
    """Whether a path inside an app (posix, relative to the app's folder) is code the family shares."""
    if any(fnmatch.fnmatch(rel, pattern) for pattern in family.data_globs):
        return False
    return any(fnmatch.fnmatch(rel, pattern) for pattern in family.function_globs)


def is_only_in(family: Family, app: str, rel: str) -> bool:
    """Whether this function file exists in `app` alone, so it is never carried to another member."""
    return any(fnmatch.fnmatch(rel, pattern) for pattern in family.only.get(app, ()))


def siblings(family: Family, app: str) -> list[str]:
    """The other members that exist on disk: where a change to `app` can go."""
    return [name for name in family.members if name != app and (family.apps_dir / name).is_dir()]


def function_files(family: Family, app: str) -> list[str]:
    folder = family.apps_dir / app
    if not folder.is_dir():
        return []
    found = (path.relative_to(folder).as_posix() for path in folder.rglob("*") if path.is_file())
    return sorted(rel for rel in found if is_function_file(family, rel))


def locate(family: Family, path: Path) -> tuple[str, str] | None:
    """`(app, path inside the app)` when `path` is inside a member's folder, else None."""
    try:
        inside = path.resolve().relative_to(family.apps_dir.resolve())
    except ValueError:
        return None
    if len(inside.parts) < 2 or inside.parts[0] not in family.members:
        return None
    return inside.parts[0], Path(*inside.parts[1:]).as_posix()


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.sha1(stream.read()).hexdigest()


def baseline_path(family: Family, app: str, rel: str) -> Path:
    return family.state_dir / "baseline" / app / rel

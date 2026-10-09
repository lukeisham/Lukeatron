"""Where Home finds everything it reads, anchored on this file — never the working directory.

launchd starts Home with an arbitrary working directory, and the Dropbox path differs between the
MacBook and the Mac mini, so every path is derived from `__file__` or from the Lukeatron root
found by walking up to its markers. `LUKEATRON_ROOT` in the environment wins, which is how the
tests point Home at a fixture tree.
"""

from __future__ import annotations

import os
from pathlib import Path

HOME_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = HOME_DIR / "static"
CACHE_DIR = HOME_DIR / "cache"
SETTINGS_FILE = HOME_DIR / "settings.json"
CATALOG_FILE = HOME_DIR / "catalog.json"
VERSES_FILE = HOME_DIR / "verses.txt"
LOG_FILE = HOME_DIR / "serve.log"

# Both must be present: the same pair Project Dashboard's paths.py uses to recognise the root.
ROOT_MARKERS = (Path(".claude") / "CLAUDE.md", Path("Memory") / "Medium-Term")


class RootNotFound(RuntimeError):
    pass


def find_root(start: Path = HOME_DIR) -> Path:
    override = os.environ.get("LUKEATRON_ROOT")
    if override:
        return Path(override).resolve()
    for candidate in (start, *start.parents):
        if all((candidate / marker).exists() for marker in ROOT_MARKERS):
            return candidate
    raise RootNotFound(f"no Lukeatron root above {start} (looked for {', '.join(map(str, ROOT_MARKERS))})")


def apps_dir(root: Path) -> Path:
    return root / "System" / "Apps"


def widgets_dir(root: Path) -> Path:
    return root / "System" / "Widgets"


def inbox_dir(root: Path) -> Path:
    return root / "Inbox"


def recipes_dir(root: Path) -> Path:
    return root / "Memory" / "Long-Term" / "Recipes"


def credentials_dir(root: Path) -> Path:
    return root / "System" / "Credentials" / "Home"


def bsb_file(root: Path) -> Path:
    return root / "Memory" / "Long-Term" / "Bible" / "engbsb_vpl" / "engbsb_vpl.txt"

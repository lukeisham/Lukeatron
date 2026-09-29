"""Shared test scaffolding: a fixture Apps/ tree and a Home wired to it, with no network, no real
ports and no real secrets (TEST-4)."""

from __future__ import annotations

import json
import sys
import tempfile
from datetime import date
from pathlib import Path

HOME_DIR = Path(__file__).resolve().parents[1]
FIXTURES = Path(__file__).resolve().parent / "fixtures"
sys.path.insert(0, str(HOME_DIR))

from core.credstore import CredStore  # noqa: E402
from core.home import Home  # noqa: E402
from core.settings import Settings  # noqa: E402
from core.verse import Verse, VerseError  # noqa: E402

SETTINGS = Settings(port=8780, rp_id="localhost", origins=("http://localhost:8780",), remote=False)

CATALOG = {
    "apps": {
        "Wiki": {"context": "Lukeatron", "blurb": "The wiki", "launch": {"kind": "ensure", "script": "ensure.sh", "port": 18787}},
        "Board": {"title": "Dashboard", "context": "Lukeatron", "blurb": "Projects", "launch": {"kind": "server", "entry": "server.py", "port": 18789}},
        "Riddle": {"context": "Teaching", "blurb": "A riddle <b>with</b> a clue", "launch": {"kind": "file", "path": "Riddle.html"}},
        "Units": {"context": "Teaching", "blurb": "Unit prep", "launch": {"kind": "self-opening", "entry": "serve.py", "cwd": "_template"}},
        "Draft": {"context": "Personal Research", "blurb": "Being built"},
        "Gone": {"context": "Church", "blurb": "Folder deleted"},
    }
}


def make_tree(root: Path) -> Path:
    apps = root / "System" / "Apps"
    for name in ("Wiki", "Board", "Riddle", "Units", "Loose"):
        (apps / name).mkdir(parents=True)
        (apps / name / "README.md").write_text("# readme\n")
    (apps / "Riddle" / "Riddle.html").write_text("<!doctype html><title>Riddle</title>")
    (apps / "Riddle" / "secret.txt").write_text("not served")
    (apps / "Draft" / "_build" / "specs").mkdir(parents=True)
    (apps / "Draft" / "_build" / "specs" / "a.spec.md").write_text("spec")
    (apps / "Early" / "_build").mkdir(parents=True)
    (apps / "_private").mkdir()
    (apps / "Home").mkdir()
    (apps / "Home" / "README.md").write_text("self")
    (root / "catalog.json").write_text(json.dumps(CATALOG))
    return apps


class FakePorts:
    def __init__(self, up: set[int] | None = None) -> None:
        self.up = set(up or ())

    def __call__(self, port: int) -> bool:
        return port in self.up


def offline() -> Verse:
    raise VerseError("offline in tests")


def make_home(root: Path, *, up: set[int] | None = None, fetch=offline) -> Home:
    apps = make_tree(root)
    bsb = root / "bsb.txt"
    bsb.write_text((FIXTURES / "bsb_sample.txt").read_text(encoding="utf-8"), encoding="utf-8")
    refs = root / "verses.txt"
    refs.write_text("JOH 3:16\nPSA 23:1-2\n", encoding="utf-8")
    inbox = root / "Inbox"
    inbox.mkdir()
    return Home(
        settings=SETTINGS,
        apps_dir=apps,
        catalog_file=root / "catalog.json",
        bsb_file=bsb,
        verses_file=refs,
        cache_dir=root / "cache",
        static_dir=HOME_DIR / "static",
        creds=CredStore(root / "creds"),
        widgets_dir=HOME_DIR.parents[1] / "Widgets",  # the real widget code, read-only
        inbox_dir=inbox,
        probe_fn=FakePorts(up),
        fetch_verse=fetch,
        now=lambda: 1_800_000_000.0,
        today=lambda: date(2026, 9, 29),
    )


def temp_root() -> tempfile.TemporaryDirectory:
    return tempfile.TemporaryDirectory(prefix="home-test-")

"""The running Home: settings, paths, secrets and the shared helpers every route reaches through.

Built once by server.py (or by a test, with fixture paths and fakes for the network and ports).
catalog.json is re-read on each request — it is small, and an edit shows without a restart.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Callable

from core import catalog, launcher, session, verse
from core.credstore import CredStore
from core.settings import Settings
from core.web import Request
from core.webauthn import ChallengeStore

LOOPBACK = ("127.0.0.1", "::1")


@dataclass
class Home:
    settings: Settings
    apps_dir: Path
    catalog_file: Path
    bsb_file: Path
    verses_file: Path
    cache_dir: Path
    static_dir: Path
    creds: CredStore
    probe_fn: Callable[[int], bool] = catalog.probe
    fetch_verse: Callable[[], verse.Verse] = verse.fetch_niv
    now: Callable[[], float] = time.time
    today: Callable[[], date] = date.today
    challenges: ChallengeStore = field(default_factory=ChallengeStore)
    starter: launcher.Starter = field(init=False)
    secret: bytes = field(init=False)
    agent_key: str = field(init=False)

    def __post_init__(self) -> None:
        self.creds.ensure()
        self.secret = self.creds.session_secret()
        self.agent_key = self.creds.agent_key()
        self.starter = launcher.Starter(self.apps_dir, self.cache_dir, probe_fn=self.probe_fn)

    def catalog(self) -> dict:
        return catalog.load_catalog(self.catalog_file)

    def records(self) -> list[catalog.AppRecord]:
        return catalog.build_records(self.apps_dir, self.catalog(), probe_fn=self.probe_fn)

    def launch_for(self, name: str) -> launcher.Launch | None:
        """The launch entry for a BUILT app, or None (unknown, in build, or no entry)."""
        entry = self.catalog().get(name)
        folder = self.apps_dir / name
        if not entry or "launch" not in entry or not (folder / "README.md").is_file():
            return None
        return launcher.parse_launch(entry["launch"])

    def title_for(self, name: str) -> str:
        return self.catalog().get(name, {}).get("title", name)

    def signed_in(self, request: Request) -> bool:
        return session.is_valid(self.secret, request.cookie(session.COOKIE), self.now())

    def is_agent(self, request: Request) -> bool:
        return session.key_matches(self.agent_key, request.header("x-home-key"))

    def is_loopback(self, request: Request) -> bool:
        return request.client in LOOPBACK or request.client.startswith("::ffff:127.")

    def todays_verse(self) -> verse.Verse | None:
        return verse.todays_verse(
            today=self.today(),
            cache_file=self.cache_dir / "verse.json",
            refs_file=self.verses_file,
            bsb_file=self.bsb_file,
            fetch=self.fetch_verse,
        )

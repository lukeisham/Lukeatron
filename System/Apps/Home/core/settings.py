"""settings.json, read once at start-up. `remote` is read here and by launcher.target_url only."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    port: int
    rp_id: str
    origins: tuple[str, ...]
    remote: bool


def load_settings(path: Path) -> Settings:
    with path.open(encoding="utf-8") as handle:
        raw = json.load(handle)
    return Settings(
        port=int(raw["port"]),
        rp_id=str(raw["rp_id"]),
        origins=tuple(str(origin) for origin in raw["origins"]),
        remote=bool(raw.get("remote", False)),
    )

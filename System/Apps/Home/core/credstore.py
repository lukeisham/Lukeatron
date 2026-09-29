"""Home's secrets on disk, in System/Credentials/Home/ — git-ignored, synced by Dropbox.

Three files: passkeys.json (public keys only), session-secret and agent-key. Because Dropbox
syncs the folder, one passkey and one agent key serve both Macs. Files are created owner-only
and written atomically, so a half-written passkey list can never lock Luke out.
"""

from __future__ import annotations

import json
import os
import secrets
from pathlib import Path

from core.webauthn import Credential

PASSKEYS = "passkeys.json"
SESSION_SECRET = "session-secret"
AGENT_KEY = "agent-key"


def _write_private(path: Path, text: str) -> None:
    temp = path.with_name(path.name + ".tmp")
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        handle.write(text)
    temp.replace(path)


def _read_or_create_hex(path: Path) -> str:
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    value = secrets.token_hex(32)
    _write_private(path, value + "\n")
    return value


class CredStore:
    def __init__(self, directory: Path) -> None:
        self.directory = directory

    def ensure(self) -> None:
        self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)

    def session_secret(self) -> bytes:
        return bytes.fromhex(_read_or_create_hex(self.directory / SESSION_SECRET))

    def agent_key(self) -> str:
        return _read_or_create_hex(self.directory / AGENT_KEY)

    def passkeys(self) -> list[Credential]:
        path = self.directory / PASSKEYS
        if not path.exists():
            return []
        with path.open(encoding="utf-8") as handle:
            return [Credential(**entry) for entry in json.load(handle)["passkeys"]]

    def save_passkeys(self, passkeys: list[Credential]) -> None:
        payload = {"passkeys": [cred.to_dict() for cred in passkeys]}
        _write_private(self.directory / PASSKEYS, json.dumps(payload, indent=2) + "\n")

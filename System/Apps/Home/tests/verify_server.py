"""A second Home, for looking at the signed-in page without a passkey: real apps, throwaway secrets.

Runs on 127.0.0.1:8781 with a temporary credentials directory, and prints a session cookie valid
only for this instance. Paste it into the browser's console as shown. Never touches
System/Credentials/Home/ or the real Inbox/ — the real Home on 8780 rejects this cookie (different secret).

Run: python3 tests/verify_server.py
"""

from __future__ import annotations

import dataclasses
import logging
import sys
import tempfile
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import server  # noqa: E402
from core import paths, session  # noqa: E402

VERIFY_PORT = 8781


def main() -> int:
    logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    with tempfile.TemporaryDirectory(prefix="home-verify-") as scratch:
        scratch_dir = Path(scratch)
        (scratch_dir / "Inbox").mkdir()
        home = server.build_home(paths.find_root(), credentials_dir=scratch_dir / "creds", cache_dir=scratch_dir / "cache",
                                 inbox_dir=scratch_dir / "Inbox")
        print(f"verify inbox (InboxNote saves land here, not in the real Inbox/): {scratch_dir / 'Inbox'}", flush=True)
        home.settings = dataclasses.replace(home.settings, port=VERIFY_PORT, origins=(f"http://localhost:{VERIFY_PORT}",))
        cookie = session.make_value(home.secret, home.now())
        print(f'verify cookie: document.cookie = "{session.COOKIE}={cookie}; path=/"', flush=True)
        httpd = ThreadingHTTPServer((server.HOST, VERIFY_PORT), server.make_handler(home))
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
    return 0


if __name__ == "__main__":
    sys.exit(main())

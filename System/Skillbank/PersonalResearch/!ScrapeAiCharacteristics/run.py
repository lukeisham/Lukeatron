"""Run the AiCharacteristics Scrape from the command line: python3 run.py

Reads the DeepSeek key from System/Credentials/Home/deepseek-key, scrapes, and prints the summary as JSON.
Exits non-zero, with the reason on stderr, if the Scrape stopped (PY-6).
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict
from pathlib import Path

SYSTEM_DIR = Path(__file__).resolve().parents[3]
APP_DIR = SYSTEM_DIR / "Apps" / "AiCharacteristics"
CREDENTIALS_DIR = SYSTEM_DIR / "Credentials" / "Home"


def main() -> int:
    sys.path[:0] = [str(Path(__file__).resolve().parent), str(APP_DIR)]
    from aichar_scrape import ScrapeFailed, run_scrape
    from criteria.llm import DEEPSEEK

    key_file = CREDENTIALS_DIR / DEEPSEEK.key_file
    key = key_file.read_text(encoding="utf-8").strip() if key_file.exists() else ""
    try:
        summary = run_scrape(APP_DIR / "data", key)
    except ScrapeFailed as failed:
        print(f"Scrape stopped, nothing was changed: {failed}", file=sys.stderr)
        return 1
    print(json.dumps(asdict(summary), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

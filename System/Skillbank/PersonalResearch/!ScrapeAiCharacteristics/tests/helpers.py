"""Puts the skill, the AiCharacteristics app and the app's shared test fakes on the path."""

import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]
APP_DIR = SKILL_DIR.parents[2] / "Apps" / "AiCharacteristics"
FIXTURES = Path(__file__).resolve().parent / "fixtures"
sys.path[:0] = [str(SKILL_DIR), str(APP_DIR), str(APP_DIR / "tests" / "py")]


def wiki_reply() -> bytes:
    return (FIXTURES / "article-response.json").read_bytes()

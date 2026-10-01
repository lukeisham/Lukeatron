"""Puts the app folder on the path so tests import `criteria` as Home does."""

import sys
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(APP_DIR))

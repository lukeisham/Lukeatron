"""Puts the widget folder on the path so tests import `larder` as Home does."""

import sys
from pathlib import Path

WIDGET_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(WIDGET_DIR))

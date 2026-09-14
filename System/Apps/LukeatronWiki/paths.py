"""
LukeatronWiki constants — the ONLY module holding file path literals.
Every other module imports from here.
"""

import os
from pathlib import Path

# ============================================================================
# Root and memory paths
# ============================================================================
ROOT = Path(__file__).resolve().parents[3]  # _Lukeatron/
LT = ROOT / "Memory" / "Long-Term"

# ============================================================================
# Wiki control surface
# ============================================================================
WIKI = LT / "LukeatronWiki"
NODES = WIKI / "Nodes"
SEALED_YAML = WIKI / "_sealed.yaml"
INDEX_YAML = WIKI / "_index.yaml"
QUEUE_YAML = WIKI / "_queue.yaml"
MEDIA = WIKI / "_media"

# ============================================================================
# Enrichment sandbox
# ============================================================================
ENRICH_DIR = ROOT / "System" / "Sandbox" / "wiki-enrich"
REQ_DIR = ENRICH_DIR / "_requests"

# ============================================================================
# Templates and static assets
# ============================================================================
WIKI_CSS = ROOT / "System" / "Templates" / "wiki-page.css"
STATIC = Path(__file__).resolve().parent / "static"

# ============================================================================
# Server
# ============================================================================
PORT = int(os.environ.get("LUKEATRONWIKI_PORT", "8787"))


def store_rel(p):
    """
    Convert a path to a string relative to Memory/Long-Term/, with forward slashes.

    Args:
        p: str, Path, or pathlib.Path object (absolute or relative)

    Returns:
        str: path relative to LT with forward slashes
    """
    if isinstance(p, str):
        p = Path(p)
    elif not isinstance(p, Path):
        p = Path(p)

    # Make it absolute if it isn't already
    if not p.is_absolute():
        p = (LT / p).resolve()
    else:
        p = p.resolve()

    # Compute relative to LT
    try:
        rel = p.relative_to(LT)
        return rel.as_posix()
    except ValueError:
        # Path is outside LT; return absolute as posix
        return p.as_posix()

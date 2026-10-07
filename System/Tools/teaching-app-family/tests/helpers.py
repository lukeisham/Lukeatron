"""A throwaway family on disk for the tests: a few apps under a temporary root, with the real family.json rules."""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TOOL))
import changes  # noqa: E402
import registry  # noqa: E402

RENDER_JS = "export const hint = 'Search patterns…';\nconst title = 'Grammar';\nconst db = 'grammar.db';\nconst port = 8802;\nconst style = el.style;\n\nfunction a() {\n  return 1;\n}\n\nfunction b() {\n  return 2;\n}\n"


class FamilyTree:
    """Apps Grammar, Logic and Style (merge mode) and Rhetoric (manual), each holding the same small render.js."""

    def __init__(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.family = registry.load_family(root=self.root, state_dir=self.root / "state")
        for app in ("Grammar", "Logic", "Style", "Rhetoric"):
            member = self.family.members[app]
            text = RENDER_JS.replace("patterns", member.items).replace("Grammar", app).replace("grammar.db", f"{member.db}.db").replace("8802", str(member.port))
            self.write(app, "app/render.js", text)
            self.write(app, "server.py", f"PORT = {member.port}\n")
            self.write(app, f"{member.db}.db", "binary data")
            self.write(app, "app-decisions.md", "decisions")
        self.write("Style", "app/grid.css", ".grid {}\n")
        changes.snapshot(self.family)

    def path(self, app: str, rel: str) -> Path:
        return self.family.apps_dir / app / rel

    def write(self, app: str, rel: str, text: str) -> None:
        path = self.path(app, rel)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def read(self, app: str, rel: str) -> str:
        return self.path(app, rel).read_text(encoding="utf-8")

    def close(self) -> None:
        self.tmp.cleanup()

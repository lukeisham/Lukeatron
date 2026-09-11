"""Build both frozen faces from one clock reading and one stores/model pass
(the snapshot spec FR-10, the brief spec's own "one command").

Building `snapshot.py` and `brief.py` separately risks exactly the drift
FR-10 exists to prevent: an agent's brief quoting an older board than the
snapshot sitting beside it, because each read `datetime.now()` and re-ran
`stores.load_board_sources` -> `model.build_board` on its own. This script
reads the clock once, builds the board once, composes both faces' text, and
only then writes either file — a failure composing either face raises before
anything is written, so the two outputs never drift out of step (PY-6).

One job (SR-1): sequencing the two calls in the right order. It derives
nothing itself and renders nothing itself — `stores`, `model`, `snapshot`
and `brief` each still own exactly what they owned before this existed.
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

import brief
import model
import snapshot
import stores



def build_both(
    *, snapshot_path: Path | None = None, brief_path: Path | None = None
) -> tuple[Path, Path]:
    """Reads the clock once, builds the board once, and writes both faces
    stamped with that same `(today, build_time)` pair. Both faces' text is
    composed before either file is written, so a failure in either half
    leaves both untouched rather than shipping one face newer than the
    other."""
    build_time = datetime.now()
    today = build_time.date()

    sources = stores.load_board_sources(snapshot.lukeatron_root())
    board = model.build_board(sources, today=today)

    html_text = snapshot.build_snapshot_html(today=today, build_time=build_time, board=board)
    brief_text = brief.compose_brief(board, today=today, stamp=build_time)

    resolved_snapshot_path = snapshot_path or snapshot.default_output()
    resolved_brief_path = brief_path or brief.default_output_path()

    resolved_snapshot_path.parent.mkdir(parents=True, exist_ok=True)
    resolved_snapshot_path.write_text(html_text, encoding="utf-8")
    resolved_brief_path.parent.mkdir(parents=True, exist_ok=True)
    resolved_brief_path.write_text(brief_text, encoding="utf-8")
    return resolved_snapshot_path, resolved_brief_path


def main() -> None:
    try:
        snapshot_out, brief_out = build_both()
    except Exception as exc:  # noqa: BLE001 — PY-6: report and exit non-zero, never a silent skip
        print(f"build_faces.py: build failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    print(f"build_faces.py: wrote {snapshot_out} and {brief_out}")


if __name__ == "__main__":
    main()

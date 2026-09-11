"""Find the Lukeatron root without counting directory levels.

`brief.py`, `server.py` and `snapshot.py` all need the `_Lukeatron/` root — to
read `Memory/Medium-Term/` and to write `Outbox/`. They used to find it with
`Path(__file__).resolve().parents[3]`, which is correct only at one exact depth.

That broke the moment this app moved from `System/Sandbox/ProjectDashboard/` to
`System/Apps/ProjectDashboard/_template/` — one level deeper, so `parents[3]`
resolved to `System/` and the brief would have been written to
`System/Outbox/board-brief.md`, a directory that does not exist.

Depth-counting is the wrong mechanism here specifically because this directory
is a TEMPLATE: it is meant to be cloned, and `_test/` is a clone of it sitting
at a different depth already. A rule that breaks when the folder moves is a rule
that breaks by design in this project.

So: walk up looking for the markers that actually identify the root, and fail
loudly with the paths tried rather than silently resolving somewhere wrong.
`LUKEATRON_ROOT` in the environment still wins, for tests and for running the
app against a fixture tree.
"""

from __future__ import annotations

import os
from pathlib import Path

# Both must be present. `Memory/` alone appears in plenty of places; the
# bootloader at `.Claude/CLAUDE.md` is what makes a directory THE root
# (CLAUDE.md's own "load-bearing wiring" note).
ROOT_MARKERS = (Path(".Claude") / "CLAUDE.md", Path("Memory") / "Medium-Term")


# A copy of this app that must NEVER read the real store puts an empty file of
# this name beside `paths.py`. See `_assert_not_the_real_store` below.
TEST_COPY_MARKER = "TEST-COPY"


def _assert_not_the_real_store(root: Path, *, app_dir: Path) -> None:
    """Refuse the real Lukeatron root when this is a TEST copy.

    The test copy sits at `System/Apps/ProjectDashboard/_test/`, INSIDE the real
    tree, so walking up finds the real root and serves Luke's actual projects —
    under a banner reading "TEST DATA — fabricated projects, not Luke's real
    board". A label that lies about real data is worse than no label at all,
    which is why this is a hard failure and not a warning.

    Launcher scripts set `LUKEATRON_ROOT` correctly, but they only help the
    person who uses them; `python3 server.py` typed directly must fail too. The
    marker file is the single permitted difference between `_test/` and
    `_template/` that changes behaviour rather than only appearance — this
    function is identical in both, so there is no logic to keep in sync.
    """
    if not (app_dir / TEST_COPY_MARKER).exists():
        return
    if root == app_dir or app_dir in root.parents or root.is_relative_to(app_dir):
        return
    raise RuntimeError(
        f"this is a TEST copy ({app_dir / TEST_COPY_MARKER} exists) and it resolved "
        f"to {root}, which is outside it — that is the real store. A test copy must "
        "never read real data: it is labelled TEST on screen, so showing Luke's real "
        "projects would make the banner a lie. Run ./run_server.sh or ./run_build.sh, "
        "which point LUKEATRON_ROOT at this copy's own fixtures/lukeatron_root/."
    )


def find_lukeatron_root(start: Path | None = None) -> Path:
    """The `_Lukeatron/` root, from `LUKEATRON_ROOT` or by walking up from here.

    Raises RuntimeError naming every directory tried, rather than returning a
    plausible-but-wrong path — a wrong root reads an empty store and renders an
    empty board, which looks like "no projects" instead of like a failure.
    """
    app_dir = Path(__file__).resolve().parent
    override = os.environ.get("LUKEATRON_ROOT")
    if override:
        resolved = Path(override).expanduser().resolve()
        _assert_not_the_real_store(resolved, app_dir=app_dir)
        return resolved

    here = (start or Path(__file__)).resolve()
    tried: list[Path] = []
    for candidate in [here, *here.parents]:
        if not candidate.is_dir():
            continue
        tried.append(candidate)
        if all((candidate / marker).exists() for marker in ROOT_MARKERS):
            _assert_not_the_real_store(candidate, app_dir=app_dir)
            return candidate

    raise RuntimeError(
        "could not find the Lukeatron root (a directory holding both "
        f"{ROOT_MARKERS[0]} and {ROOT_MARKERS[1]}). Tried: "
        + ", ".join(str(p) for p in tried)
        + ". Set LUKEATRON_ROOT to override."
    )

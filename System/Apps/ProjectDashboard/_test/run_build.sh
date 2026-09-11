#!/usr/bin/env bash
# TEST-copy launcher (!AppDevelopment phase4-refactor.md STEP 5 divergence
# allowlist: "launcher markers"). Not present in _template/.
#
# Wires build_faces.py's two faces (board-snapshot.html, board-brief.md) to
# the fixture tree under fixtures/lukeatron_root/ via the app's own
# LUKEATRON_ROOT override (paths.py) — never a second mechanism.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE_ROOT="$HERE/fixtures/lukeatron_root"

if [ ! -d "$FIXTURE_ROOT" ]; then
  echo "run_build.sh: no fixture at $FIXTURE_ROOT — run 'python3 seed_fixture.py' first." >&2
  exit 1
fi

export LUKEATRON_ROOT="$FIXTURE_ROOT"
exec python3 "$HERE/build_faces.py" "$@"

#!/usr/bin/env bash
# TEST-copy launcher (!AppDevelopment phase4-refactor.md STEP 5 divergence
# allowlist: "launcher markers"). Not present in _template/.
#
# paths.py already honours a LUKEATRON_ROOT override — this script is that
# override, wired to the fixture tree seed_fixture.py generates, so this
# copy never falls through to the real Lukeatron root the way a bare
# `python3 server.py` would (paths.find_lukeatron_root walks up from this
# file's own directory when the env var is unset, and _Lukeatron/ itself
# sits four levels up from here carrying both root markers).
#
# Run seed_fixture.py first if fixtures/lukeatron_root/ doesn't exist yet.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE_ROOT="$HERE/fixtures/lukeatron_root"

if [ ! -d "$FIXTURE_ROOT" ]; then
  echo "run_server.sh: no fixture at $FIXTURE_ROOT — run 'python3 seed_fixture.py' first." >&2
  exit 1
fi

export LUKEATRON_ROOT="$FIXTURE_ROOT"
exec python3 "$HERE/server.py" "$@"

#!/bin/bash
# TEST COPY — this launches the refactor sandbox, not a real unit.
cd "$(dirname "$0")"
echo "=============================================="
echo "  TEST COPY — Dragons of the Northern Marches"
echo "  Fake data. Not real teaching work."
echo "=============================================="
exec python3 serve.py

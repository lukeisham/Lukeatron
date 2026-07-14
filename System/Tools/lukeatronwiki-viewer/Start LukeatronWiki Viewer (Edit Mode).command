#!/bin/bash
cd "$(dirname "$0")"
exec env LUKEATRONWIKI_EDIT=1 python3 serve.py

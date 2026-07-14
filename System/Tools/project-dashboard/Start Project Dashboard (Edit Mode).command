#!/bin/bash
cd "$(dirname "$0")"
exec env LUKEATRON_DASHBOARD_EDIT=1 python3 serve.py

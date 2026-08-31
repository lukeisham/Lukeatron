# CurriculumPreparation — Vibe Code Conventions

**Source**: `Memory/Long-Term/Coding/vibe-coding-rules.md` + house idiom extracted from `System/Tools/` viewers.
**Date**: 2026-08-29
**Scope**: All code in this project: Python, JavaScript, HTML, CSS, SVG, tests, migrations.

---

## 1. VIBE RULES — Binding Checklist

Every rule below is a **pass/fail check** a reviewer can apply line-by-line. Format is `[RULE-CODE] — Description (applies to: file type).`

### Setup Rules (SR-*)
- **SR-1** One file does one thing, named by its filename; no combining unless tightly bound by type/purpose. (All code)
- **SR-2** No pip, venv, or requirements.txt — stdlib only. Approved deps: none by default. (Python)
- **SR-3** Performance first: no blocking scripts, no unused CSS, no unbounded queries, no whole-store reads. (Python, CSS, SQL)
- **SR-4** Before copy-pasting logic to a second script, extract to a shared importable module; grep siblings for duplication. (Python, JS)
- **SR-5** No credentials, tokens, API keys in repo — live in .env at runtime, never hardcoded/commented/tested. (All code)
- **SR-6** Match neighbours before inventing — read closest sibling script first, absorb conventions. (Python, JS)
- **SR-7** Code guides explain architecture & rationale only, never restate what intention-revealing names already say. (All code)
- **SR-8** Comments explain **why** and cross-module connections, never history or line-by-line commentary. Delete stale comments instantly. (Python, JS)
- **SR-9** Developer-facing text (rules, invariants) lives in code comments, not on the UI. User-facing text is for the person using it. (HTML, UI code)

### Python Rules (PY-*)
- **PY-1** Stdlib only: pathlib, json, csv, sqlite3, argparse, http.server, urllib — no pip install. (Python)
- **PY-2** One script, one job; shared logic goes in importable modules beside it. (Python)
- **PY-3** Real work in named functions behind `if __name__ == "__main__":`; importing must never read/write/hit DB/start server. (Python)
- **PY-4** Typed signatures on every parameter and return: `list[str]`, `dict[str, int]`, `str | None` (modern generics only). (Python)
- **PY-5** Paths via `Path()` with `/` joining, anchored to `Path(__file__).resolve().parents[n]` — never working dir, never os.path.join. (Python)
- **PY-6** Explicit exceptions (specific catch), non-zero exit. Never bare `except:` or silent `except Exception:`. (Python)
- **PY-7** Context managers for every resource: `with open()`, `with sqlite3.connect()`, never leave close/commit to GC. (Python)
- **PY-8** SQLite: `?` placeholders only, `mode=ro` by default for read-only viewers, `uri=True`. (Python)
- **PY-9** Stream & batch — iterate cursors/files, never `.fetchall()` on unbounded data; `executemany` for bulk writes, one transaction. (Python)
- **PY-10** PEP 8 by hand: snake_case, UPPER_SNAKE constants, 4-space indent. No Black, Ruff, linter config. (Python)
- **PY-11** Self-documenting names > comments. Intention-revealing names, small functions, early returns. Docstrings for public functions only. (Python)
- **PY-12** Viewers never write — read-only design. A viewer that gains a write path becomes a Long-Term mutation (Checkpoint territory). (Python)

### JavaScript Rules (JS-*)
- **JS-1** Self-documenting > comments. Clear, intention-revealing names everywhere. (JavaScript)
- **JS-2** Robust & predictable > clever. Validate inputs, explicit error handling, early returns. Never fail silently. (JavaScript)
- **JS-3** Modern & simple > over-engineered. Current JS, small functions. Avoid unnecessary classes/abstractions. (JavaScript)
- **JS-4** Comments: "why", not "what". JSDoc for public APIs & complex logic only. Delete outdated comments immediately. (JavaScript)
- **JS-5** `async`/`await` + `try`/`catch` for all async; show loading before fetch, error state on failure; centralize raw `fetch()` calls in one module. (JavaScript)
- **JS-6** Safe DOM: event delegation for dynamic elements, remove listeners on removal, never innerHTML with user/Memory text, cache DOM queries. (JavaScript)
- **JS-7** No build step, no framework, no bundler — vanilla ES modules served directly. Frameworks require explicit sign-off. (JavaScript)

### HTML Rules (HTML-*)
- **HTML-1** Semantic first: `<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>`. `<div>` as pure styling hook only. One `<main>` per page. (HTML)
- **HTML-2** Every `<img>` has an `alt` attribute; descriptive for informative, empty `alt=""` for decorative. (HTML)
- **HTML-3** Exactly one `<h1>` per page. Never skip heading levels. Headings describe structure, not visual size. (HTML)
- **HTML-4** CSS in `<head>`, scripts at bottom or with `defer`. Inline critical CSS only when above-fold perf demands it. (HTML)
- **HTML-5** Accessible forms: every control has a real `<label>`, `aria-describedby` for errors. Placeholders are hints only, never labels. (HTML)
- **HTML-6** Escape everything interpolated — store text, titles, markdown are untrusted to a renderer. Applies equally to HTML built in Python strings in serve.py. (HTML, Python)

### CSS Rules (CSS-*)
- **CSS-1** One file, one job — each file styles exactly one component/layout/page, under 150 lines; split when it grows. (CSS)
- **CSS-2** Custom properties only: reference `--color-*`, `--space-*`, `--font-*` from a single token file. Never hardcode a value that belongs in a variable. (CSS)
- **CSS-3** Mobile inside component files — `@media (max-width)` rules in the same file as the component, using breakpoints from tokens. No separate mobile files. (CSS)
- **CSS-4** Semantic class names describe what a thing **is** (`.card-grid`, `.project-board`), never how it looks. kebab-case, consistent with filenames. (CSS)
- **CSS-5** Low specificity: prefer single classes, avoid IDs & nested selectors. **Never `!important`.** (CSS)
- **CSS-6** Sparse, structural comments: large clear section headings, useful (not decorative) comments. (CSS)

### SVG Rules (SVG-*)
- **SVG-1** Coordinate system: origin `(0,0)` top-left, x→right, y→down. Always define `viewBox` (case-sensitive, sets aspect ratio). (SVG)
- **SVG-2** Strict XML: self-close empty tags (`<circle />`), case-sensitive tags/attributes, always quote values. (SVG)
- **SVG-3** Painter's model, no z-index — elements render in source order (earlier beneath, later on top). (SVG)
- **SVG-4** Semantic shapes first (`<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>` for simple geometry); `<path d>` for complex shapes (M/L/C). (SVG)
- **SVG-5** DOM styling: `fill` & `stroke` attributes (not `background-color` / `border`). Target with classes/IDs. (SVG)

### Test Rules (TEST-*)
- **TEST-1** Stdlib runners only: Python `unittest`, JS `node:test` + `node:assert/strict`. No pytest, Jest, Mocha, mocking libraries. (Tests)
- **TEST-2** Smoke, not exhaustive: assert 3 things per module (imports cleanly, happy path, one guard/failure path). Stop there. (Tests)
- **TEST-3** File naming: one test file per module, named after the module (not the feature). Place in `tests/` beside source, mirroring tree. (Tests)
- **TEST-4** Isolated, in-memory, no network: DB tests use fresh `sqlite3.connect(":memory:")`, never touch real stores; no real network; reset module state. (Tests)
- **TEST-5** Deterministic, no sleeps — await real operations, never guessed delays. Slow tests usually do more than smoke needs. (Tests)
- **TEST-6** Assert on behaviour, not "didn't crash" — assert actual output/return/status/state change. (Tests)
- **TEST-7** Anything with a gate gets two tests: blocked path blocked, permitted path passes. Not done until both exist. (Tests)
- **TEST-8** DOM-dependent modules: fake DOM (hand-built, tiny), not jsdom or libraries. (Tests)
- **TEST-9** Mirror the logic, don't duplicate the bug — import real modules where possible. If recreating logic, comment which file/function it mirrors. (Tests)

### API Rules (API-*)
- **API-1** Routes are thin: parse input, call data function, shape response. No SQL/business logic in routing layer. (Python viewers)
- **API-2** One route file per resource — one mounted path, one data module. (Python viewers)
- **API-3** Errors from a registry — every failure response via shared `send_error()` with a code from one error registry. No inline one-off status/message. (Python viewers)
- **API-4** Validate before the data layer — required fields, types, enums in handler; return 400 naming offending field. Data layer assumes valid input. (Python viewers)
- **API-5** Write routes require auth. Lukeatron: **localhost tools do not write at all.** Not done until TEST-7 tests exist. (Python viewers)
- **API-6** Catch, log, respond — every handler wraps work in try/except. Log cause with method/path, send registry error. No raw exception/stack trace to client. (Python viewers)
- **API-7** Static routes before dynamic — `/admin/holding-pen` before `/admin/:key` so router doesn't swallow the literal. Comment where load-bearing. (Python viewers)
- **API-8** Bounded responses — list endpoints return named columns with limit, never unbounded table dump. Paginate anything unbounded. (Python viewers)

### SQL Rules (SQL-*)
- **SQL-1** Prepared statements always: every query via driver parameterized execute, never raw interpolated string. (SQLite)
- **SQL-2** User input only via `?` placeholders — values passed separately. Never interpolate/concatenate. (SQLite)
- **SQL-3** Named parameters for clarity — multi-column inserts/updates from dict use `:column`, keys whitelisted. (SQLite)
- **SQL-4** Identifiers from whitelists only — table/column/index names from constants or validated enums, never user input. (SQLite)
- **SQL-5** Full-text queries: sanitize search string before `MATCH ?` — tokenize & quote so FTS operators can't throw/change query. (SQLite)
- **SQL-6** UPDATE triggers: `WHEN` guard required — `WHEN NEW.updated_at = OLD.updated_at` prevents re-firing. (SQLite)
- **SQL-7** FTS triggers: `WHEN` guard + index sync — list exact content columns in WHEN so unrelated updates don't reindex. (SQLite)
- **SQL-8** Foreign key pragmas — `PRAGMA foreign_keys = ON` on every connection (SQLite disables by default). Verify in tests. (SQLite)
- **SQL-9** Query in sets, not loops — one query returns what's needed; never query-per-row. Select named columns (not `SELECT *`), bound with `LIMIT`. (SQLite)
- **SQL-10** Every filter/join has an index — columns in WHERE/JOIN/ORDER BY are indexed in schema. Verify with `EXPLAIN QUERY PLAN`. (SQLite)

### Migration Rules (MIG-*)
- **MIG-1** Numbered, sequential, one per number: `NNN_short_description.sql` zero-padded, next number up. Never suffixes like `004b`. (Migrations)
- **MIG-2** Applied migrations immutable — never edit once applied anywhere. The runner keys on filename, edits won't re-run & envs diverge. (Migrations)
- **MIG-3** Idempotent & re-runnable — `IF EXISTS`/`IF NOT EXISTS` on drop/create. Running twice must not error. (Migrations)
- **MIG-4** schema.sql updated same commit — canonical schema file builds fresh DBs. Structural changes that skip it leave new & migrated DBs out of sync. (Migrations)
- **MIG-5** Header comment: why, what, how to run — the only place a schema decision gets explained. (Migrations)
- **MIG-6** Verify before you drop — check schema & migration history for what actually exists. Drops of things still in use fail silently & found much later. (Migrations)
- **MIG-7** Destructive changes need Luke's OK — DROP TABLE/COLUMN, bulk DELETE/UPDATE touch real content. Confirm first. (Migrations)
- **MIG-8** Never special-case the runner — don't fix broken migration by adding skip to deploy script. Each exception makes behaviour unreproducible. (Migrations)

---

## 2. House Idiom — Extracted from Existing Viewers

### Path Anchoring (PY-5 pattern)

**serve.py viewers establish this absolute-path pattern:**

```python
# Locate repo root: serve.py lives 3 levels deep; parents[3] is _Lukeatron
ROOT = Path(__file__).resolve().parents[3]
PROJ_DIR = Path(os.environ.get("LUKEATRON_PROJECTS_DIR",
                               ROOT / "Memory" / "Medium-Term" / "Projects"))
TRACKING = PROJ_DIR / "_tracking.yaml"
PORT = int(os.environ.get("LUKEATRON_DASHBOARD_PORT", "8788"))
```

**Pattern:**
- `Path(__file__).resolve().parents[n]` — cron wrappers & `.command` launchers start in unpredictable directories
- Environment variable overrides with sensible defaults
- Port allocation with fallback retry loop (dashboard):
  ```python
  for _ in range(10):
      try:
          httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
          break
      except OSError:
          PORT += 1
  else:
      print("Could not bind a port."); sys.exit(1)
  ```

### http.server Usage (PY-1, API-1 pattern)

**Handler class extending `BaseHTTPRequestHandler`:**

```python
class Handler(http.server.BaseHTTPRequestHandler):
    def _send(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def _send_json(self, code, obj):
        import json
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/":
            projects = [build_project(r) for r in load_tracking()]
            return self._send(200, render(projects, self.edit_mode))

    def log_message(self, *a):
        pass  # suppress default logging
```

**Pattern:**
- `_send()` methods for response building (with encoding specified)
- `do_GET()` / `do_POST()` methods parse request, route by path
- Suppress default logging with `log_message(self, *a): pass`
- Query parsing: `urllib.parse.parse_qs()` with fallback to empty dict
- File time checks for conflict detection (409 on mtime mismatch)

### HTML Escaping (HTML-6, PY-6 pattern)

```python
def _clean(s):
    """Strip markdown emphasis / code ticks and escape for HTML."""
    s = str(s or "")
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = s.replace("`", "")
    return html.escape(s).strip()

# Always escape interpolated store text:
txt = _clean(b["action"]) or "(unnamed action)"
return f'<div>{txt}</div>'  # never innerHTML, always escaped

# In Python strings:
f'<div class="proj" data-state="{html.escape(p["state"])}">'
```

**Pattern:**
- `html.escape()` before embedding any untrusted string (store/user text)
- Strip markdown syntax when needed before escape
- Separate `_plain()` (stripped, UN-escaped, for data-attributes) from `_clean()` (escaped for HTML)

### Minimal YAML Parser Fallback (PY-1, SR-2 pattern)

```python
try:
    import yaml  # type: ignore
    def parse_yaml(text):
        return yaml.safe_load(text) or {}
except Exception:
    # Fallback: hand-built minimal parser for our controlled schema
    def _scalar(v):
        v = v.strip()
        if v == "" or v == "~" or v.lower() == "null":
            return None
        if v == "{}": return {}
        if v == "[]": return []
        # ... parse lists, bools, ints, strings as needed
        return v

    def parse_yaml(text):
        root, i = {}, 0
        lines = text.splitlines()
        # ... parse key:value and block lists
        return root
```

**Pattern:**
- Try stdlib/optional first (yaml may be installed)
- Fallback to hand-built tuned to controlled input (not general YAML)
- Handle scalars, inline lists, block lists of dicts — enough for config files

### Streaming vs. Loading (PY-9 pattern)

```python
# ✓ Correct: stream rows, don't load all at once
def load_actions(reg_path):
    lines = reg_path.read_text(encoding="utf-8").splitlines()
    tbl = []
    for l in lines:
        if l.startswith("|"):
            tbl.append(l)
        # process incrementally

# ✗ Avoid: .fetchall() on unbounded data
# cursor.fetchall()  # would load entire table into memory
```

### Context Managers (PY-7 pattern)

```python
# ✓ Always: with context
with open(EDITS_LOG, "a", encoding="utf-8") as f:
    f.write(f"[BROWSER] {verb} {target} {ts}\n")

# ✗ Never: implicit close
f = open(EDITS_LOG, "a")
f.write(...)
# f.close() may never run if exception
```

### Non-Zero Exit on Error (PY-6 pattern)

```python
def main():
    if not TRACKING.exists():
        print(f"⚠  Projects tracking file not found: {TRACKING}")
        sys.exit(1)  # signal failure to caller, cron, .command launcher
```

---

## 3. `.command` Double-Click Launcher Pattern

**Exact template from existing viewers:**

```bash
#!/bin/bash
cd "$(dirname "$0")"
exec python3 serve.py
```

**Pattern:**
- Shebang: `#!/bin/bash`
- Change to script directory: `cd "$(dirname "$0")"`
- Execute Python: `exec python3 serve.py` (no venv, no activation)
- Filename: `Start [Tool Name].command` (title-case, spaces OK)
- Permissions: `chmod +x` (executable bit set)

**Two variants exist in dashboard:**
- `Start Project Dashboard.command` — default (view mode)
- `Start Project Dashboard (Edit Mode).command` — launches with env var:
  ```bash
  #!/bin/bash
  cd "$(dirname "$0")"
  LUKEATRON_DASHBOARD_EDIT=1 exec python3 serve.py
  ```

---

## 4. Unittest Pattern (TEST-1 through TEST-9)

**Canonical pattern from `System/Widgets/Generator/FolkTale/tests/test_build_folktale.py`:**

```python
#!/usr/bin/env python3
"""Smoke tests for build_folktale.py (TEST-1/TEST-2: stdlib unittest,
imports cleanly, happy path, one guard path)."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

BUILD_DIR = Path(__file__).resolve().parents[1] / "cartridge" / "build"
sys.path.insert(0, str(BUILD_DIR))

import build_folktale  # noqa: E402  (path insert must precede this import)


class SplitSourceTests(unittest.TestCase):
    def test_translator_and_year_parsed_from_free_text_source(self) -> None:
        # TEST-6: assert on actual output, not "didn't crash"
        translator, year = build_folktale.split_source("Vernon Jones translation (1912), Project Gutenberg")
        self.assertEqual(translator, "Vernon Jones translation")
        self.assertEqual(year, "1912")

    def test_missing_year_left_blank_not_guessed(self) -> None:
        # TEST-2: guard path — one guard per module
        translator, year = build_folktale.split_source("D. L. Ashliman Folktexts (traditional Nasreddin collection)")
        self.assertEqual(year, "")
        self.assertTrue(translator)


class ParseSeedTests(unittest.TestCase):
    def test_seed_file_parses_to_40_tales_across_10_categories(self) -> None:
        # TEST-4: temp dir (Path(__file__).resolve().parents[1]),
        # not Memory/ — no real store writes
        tales = build_folktale.parse_seed(build_folktale.SEED_PATH)
        self.assertEqual(len(tales), 40)
        # TEST-2: three assertions max — imports, happy path, guard
```

**Pattern:**
- `from __future__ import annotations` (future-proof type hints)
- Typed signatures: `def test_foo(self) -> None:`
- Fix sys.path before importing module under test
- Three test classes max per module (one per function/class tested)
- Three assertions per test method (TEST-2)
- Test names: `test_<function>_<condition>` (descriptive, not generic)
- Temp files/in-memory DBs (TEST-4): no real Memory/ paths
- Always assert on output, never just "didn't throw" (TEST-6)

---

## 5. Top 10 Ways This Project's Builds Break Conventions

### Tier-1 Breakage (Severe)

1. **innerHTML with store/user text** — `element.innerHTML = user_text` violates JS-6 & HTML-6. Always escape: `element.textContent = ...` or `element.innerText = ...` for plain text, or build HTML with `html.escape()` before setting innerHTML.

2. **`!important` in CSS** — Violates CSS-5 (low specificity). Every `!important` is a debt marker; raise specificity or reorder selectors instead.

3. **Hardcoded paths** — `"/Users/luke/Dropbox/..."` violates PY-5 & SR-6. Always: `Path(__file__).resolve().parents[n]` + environment override.

4. **Copy-pasted logic** — A utility function appearing in >1 file violates SR-4. Extract to a shared module immediately on second occurrence.

5. **Silent exception swallowing** — `except: pass` or `except Exception: ...` (no logging) violates PY-6 & SR-2 (never stall silently). Catch specific exception, log context, exit non-zero.

### Tier-2 Breakage (Medium-High)

6. **SQL string interpolation** — `cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")` violates SQL-1/SQL-2. Always: `cursor.execute("SELECT ... WHERE id = ?", (user_id,))`.

7. **pip dependency without approval** — `import numpy`, `import requests` in production code violates SR-2 & PY-1. Stdlib only; every new dependency needs Luke's sign-off.

8. **`os.path.join()` for path construction** — Violates PY-5. Use `Path() / "subdir" / "file.txt"` instead.

9. **Comments restating code** — `x = 5  # set x to 5` violates SR-8 & PY-11. Delete it. Keep only "why" & cross-module connections.

10. **Test without actual assertion** — `try: func(); assert True` (TEST-6). Assert the **output**: `self.assertEqual(result, expected)`, never just "didn't crash".

---

## File References

- **Vibe Rules Source**: `/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/Memory/Long-Term/Coding/vibe-coding-rules.md`
- **Viewers (house idiom)**:
  - `/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/System/Tools/project-dashboard/serve.py`
  - `/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/System/Tools/lukeatronwiki-viewer/serve.py`
- **CSS Tokens & Patterns**:
  - `/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/System/Widgets/Parser/_shell/src/shell.css`
  - `/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/System/Widgets/Parser/_shell/StyleGuide/css/tokens.css`
  - `/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/System/Widgets/Parser/_shell/StyleGuide/css/patterns.css`
- **Test Patterns**:
  - `/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/System/Widgets/Generator/FolkTale/tests/test_build_folktale.py`
  - `/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/System/Widgets/Parser/_modules/MiniWiki/tests/test_extract_articles.py`

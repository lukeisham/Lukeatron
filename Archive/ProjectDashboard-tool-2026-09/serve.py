#!/usr/bin/env python3
"""
Project Dashboard — local browser viewer
========================================
A read-only web view of Memory/Medium-Term/Projects/ — the colour board across
every active project, laid out as the user asked:

  LEFT    a smart index of the projects — grouped by context, ordered so the
          most-demanding (🔴 → 🟠 → 🔵 → 🟢 → ⚪) float to the top.
  MIDDLE  every Next Action of a project as a COLOURED SQUARE, tinted by its
          State (the kind of attention it needs). Hover a square for the text.
  RIGHT   in words: the single next action that most needs doing to change the
          project's overall attention State — with its State square.

It reads two things LIVE on every request and never writes:
  • Memory/Medium-Term/Projects/_tracking.yaml   — the per-project colour board
    (state / waiting_on / wake), maintained by !ProjectSweep.
  • each project's registry.md ✅ Next Actions table — the per-action detail.

State vocabulary (precedence 🔴 → 🟠 → 🔵 → 🟢 → ⚪):
  🔴 urgent · 🟠 your move · 🔵 waiting · 🟢 on track · ⚪ undefined.

Per-action State: used verbatim if the Next Actions table carries a `State`
column (new template); otherwise DERIVED from Status + Owner + Type + Due so the
dashboard works on registries written before the column existed.

Run:   python3 serve.py            (auto-opens http://localhost:8788)
Stop:  Ctrl-C
"""
import http.server, socketserver, re, html, webbrowser, threading, sys, os, urllib.parse
from pathlib import Path
from datetime import date as _date, timedelta as _td, datetime as _dt

# --- locate the projects store --------------------------------------------------
# serve.py lives at System/Tools/project-dashboard/serve.py → _Lukeatron is parents[3]
ROOT = Path(__file__).resolve().parents[3]
PROJ_DIR = Path(os.environ.get("LUKEATRON_PROJECTS_DIR",
                               ROOT / "Memory" / "Medium-Term" / "Projects"))
TRACKING = PROJ_DIR / "_tracking.yaml"
MINOR_QUEUE = Path(os.environ.get("LUKEATRON_MINORTASKS_FILE",
                                  ROOT / "Memory" / "Medium-Term" / "MinorTasks" / "queue.md"))
PORT = int(os.environ.get("LUKEATRON_DASHBOARD_PORT", "8788"))

CONTEXT_ORDER = ["Personal Productivity", "Church", "Teaching", "Personal Research"]

# State model — keyword → (order, label, css-class). Lower order = more demanding.
STATES = {
    "urgent":    (0, "urgent",    "s-red"),
    "your move": (1, "your move", "s-org"),
    "waiting":   (2, "waiting",   "s-blu"),
    "on track":  (3, "on track",  "s-grn"),
    "undefined": (4, "undefined", "s-gry"),
}
EMOJI_STATE = {"🔴": "urgent", "🟠": "your move", "🔵": "waiting",
               "🟢": "on track", "⚪": "undefined"}
STATE_ORDER = ["urgent", "your move", "waiting", "on track", "undefined"]


def _rel_or_abs(path):
    """str(path) relative to ROOT when possible, else the absolute path — so a
    path outside ROOT (e.g. under a LUKEATRON_PROJECTS_DIR override used for
    testing) still round-trips through _resolve_safe (which accepts both)."""
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)
EMOJI_FOR_STATE = {v: k for k, v in EMOJI_STATE.items()}

EDITS_LOG = ROOT / "Memory" / "Long-Term" / "Logs" / "edits.log"


def log_edit(verb, target, summary):
    """Append one line to the shared browser-edits audit trail — every write
    from either tool's edit mode lands here so agents discover state that
    moved outside the skill layer. Best-effort; never blocks the response."""
    try:
        ts = _dt.now().isoformat(timespec="seconds")
        EDITS_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(EDITS_LOG, "a", encoding="utf-8") as f:
            f.write(f"[BROWSER: dashboard] [{verb}] {target} {summary} {ts}\n")
    except Exception:
        pass


def _table_cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def _table_col(header_cells, *names):
    low = [h.lower() for h in header_cells]
    for nm in names:
        for k, h in enumerate(low):
            if nm in h:
                return k
    return None


def find_next_actions_table(lines):
    """Locate the Next Actions table in RAW file lines (with newlines kept).
    Returns (header_idx, [row_idx, ...]) or None. Mirrors load_actions'
    detection but keeps line indices so a cell can be rewritten surgically."""
    start = next((k for k, l in enumerate(lines)
                  if re.match(r"^#{1,6}\s", l.strip()) and "next action" in l.lower()), None)
    if start is None:
        return None
    header_idx, row_idxs = None, []
    j = start + 1
    while j < len(lines):
        l = lines[j].strip()
        if re.match(r"^#{1,6}\s", l) and row_idxs:
            break
        if l.startswith("|"):
            if header_idx is None:
                header_idx = j
            elif not re.fullmatch(r"[\s:|\-]+", l):
                row_idxs.append(j)
        elif row_idxs and l == "":
            break
        j += 1
    if header_idx is None or not row_idxs:
        return None
    return header_idx, row_idxs


def mutate_registry_cell(reg_path, row_num, col_names, new_value):
    """Rewrite EXACTLY one cell — the `col_names` column of the Next-Actions row
    whose '#' cell equals row_num — leaving every other line byte-identical.
    Returns (ok, message)."""
    found = find_next_actions_table_from_path(reg_path)
    if found is None:
        return False, "Next Actions table not found"
    lines, header_idx, row_idxs = found
    header_cells = _table_cells(lines[header_idx])
    i_num = _table_col(header_cells, "#")
    i_col = _table_col(header_cells, *col_names)
    if i_num is None or i_col is None:
        return False, "column not found"
    for ri in row_idxs:
        cells = _table_cells(lines[ri])
        if i_num < len(cells) and cells[i_num] == str(row_num):
            if i_col >= len(cells):
                return False, "row too short for that column"
            cells[i_col] = new_value
            lines[ri] = "| " + " | ".join(cells) + " |\n"
            reg_path.write_text("".join(lines), encoding="utf-8")
            return True, "ok"
    return False, f"row #{row_num} not found"


def find_next_actions_table_from_path(reg_path):
    try:
        lines = reg_path.read_text(encoding="utf-8").splitlines(keepends=True)
    except Exception:
        return None
    found = find_next_actions_table(lines)
    if found is None:
        return None
    header_idx, row_idxs = found
    return lines, header_idx, row_idxs


def append_scrap(notes_path, text):
    """Append one timestamped scrap under a '## 📥 Browser scraps' heading in
    notes.md. Append-only — never touches anything already in the file."""
    content = notes_path.read_text(encoding="utf-8") if notes_path.exists() else ""
    heading = "## 📥 Browser scraps"
    stamp = _dt.now().strftime("%Y-%m-%d %H:%M")
    line = f"- {stamp} {text.strip()}\n"
    if heading in content:
        new_content = content.rstrip("\n") + "\n" + line
    else:
        sep = "\n\n" if content and not content.endswith("\n\n") else ""
        new_content = content.rstrip("\n") + ("\n" if content else "") + sep + f"{heading}\n\n{line}"
    notes_path.write_text(new_content, encoding="utf-8")


def stamp_pending_sweep(project_id):
    """Set pending_sweep: true on one project's _tracking.yaml row (idempotent,
    line-level only) — !ProjectSweep reconciles state/wake on its next run."""
    if not TRACKING.exists():
        return False
    lines = TRACKING.read_text(encoding="utf-8").splitlines(keepends=True)
    i = 0
    while i < len(lines):
        if re.match(rf"^\s*-\s*id:\s*{re.escape(str(project_id))}\s*$", lines[i]):
            # Sibling fields (e.g. the next line, "project:") are indented two
            # spaces deeper than the "- id:" marker itself — match THAT indent,
            # not the marker's, or the inserted key breaks the block's nesting.
            dash_indent = re.match(r"^(\s*)", lines[i]).group(1)
            indent = (re.match(r"^(\s*)", lines[i + 1]).group(1)
                      if i + 1 < len(lines) and lines[i + 1].strip() else dash_indent + "  ")
            j = i + 1
            already = False
            while j < len(lines):
                if re.match(r"^\s*-\s*id:\s*", lines[j]):
                    break
                if "pending_sweep:" in lines[j]:
                    already = True
                    break
                j += 1
            if not already:
                lines.insert(j, f"{indent}pending_sweep: true\n")
                TRACKING.write_text("".join(lines), encoding="utf-8")
            return True
        i += 1
    return False


def parse_state(raw):
    """Map a state string (from _tracking.yaml or a registry State cell) to a
    canonical key. Handles '🟠 your move', 'your move', '🔴', '<pending first
    sweep>', '' → all resolve to one of STATES (default 'undefined')."""
    if not raw:
        return "undefined"
    s = str(raw).strip()
    for em, key in EMOJI_STATE.items():
        if em in s:
            return key
    low = s.lower()
    for key in STATES:
        if key in low:
            return key
    return "undefined"  # '<pending first sweep>' and anything unrecognised


def parse_due(raw):
    """Parse a due-date string → datetime.date, or None if unparseable."""
    s = str(raw or "").strip()
    if not s or s in ("—", "-"):
        return None
    for fmt in ("%Y-%m-%d", "%d %b %Y", "%d %B %Y", "%b %Y", "%B %Y", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return _dt.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


# ============================================================================
# Minimal YAML reader (PyYAML if present; else a fallback tuned to our files —
# scalars, inline [lists], and a block list of dicts under `projects:`).
# ============================================================================
try:
    import yaml  # type: ignore
    def parse_yaml(text):
        return yaml.safe_load(text) or {}
except Exception:
    def _scalar(v):
        v = v.strip()
        if v == "" or v == "~" or v.lower() == "null":
            return None
        if v == "{}":
            return {}
        if v == "[]":
            return []
        if len(v) >= 2 and (v[0], v[-1]) in (('"', '"'), ("'", "'")):
            return v[1:-1]
        if v.startswith("[") and v.endswith("]"):
            inner = v[1:-1].strip()
            return [_scalar(x) for x in inner.split(",")] if inner else []
        if re.fullmatch(r"-?\d+", v):
            return int(v)
        if v.lower() in ("true", "false"):
            return v.lower() == "true"
        return v

    def parse_yaml(text):
        root, i, lines = {}, 0, text.splitlines()
        n = len(lines)
        while i < n:
            line = lines[i].rstrip()
            if not line.strip() or line.lstrip().startswith("#"):
                i += 1; continue
            m = re.match(r"^([A-Za-z0-9_\- ]+):\s*(.*)$", line)
            if not m:
                i += 1; continue
            key, val = m.group(1).strip(), m.group(2).strip()
            if val == "" and i + 1 < n and re.match(r"^\s*-\s", lines[i + 1] or ""):
                items, i = _read_block_list(lines, i + 1)
                root[key] = items
            else:
                root[key] = _scalar(val)
            i += 1
        return root

    def _read_block_list(lines, i):
        items, n, cur = [], len(lines), None
        while i < n:
            raw = lines[i]
            if not raw.strip() or raw.strip().startswith("#"):
                i += 1; continue
            if len(raw) - len(raw.lstrip()) == 0:
                break
            stripped = raw.strip()
            if stripped.startswith("- "):
                if cur is not None:
                    items.append(cur)
                cur = {}
                stripped = stripped[2:]
            mm = re.match(r"^([A-Za-z0-9_\- ]+):\s*(.*)$", stripped)
            if mm and cur is not None:
                cur[mm.group(1).strip()] = _scalar(mm.group(2))
            i += 1
        if cur is not None:
            items.append(cur)
        return items, i


# ============================================================================
# Load: tracking board + per-project Next Actions
# ============================================================================
def load_tracking():
    if not TRACKING.exists():
        return []
    data = parse_yaml(TRACKING.read_text(encoding="utf-8"))
    return data.get("projects") or []


def _clean(s):
    """Strip markdown emphasis / code ticks and escape for HTML."""
    s = str(s or "")
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = s.replace("`", "")
    return html.escape(s).strip()


def _plain(s):
    """Markdown-stripped, UN-escaped text — for data attributes read via
    textContent (the browser handles display escaping, so escape only once
    for the attribute itself)."""
    s = str(s or "")
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s).replace("`", "")
    return s.strip()


def load_actions(reg_path):
    """Extract the ✅ Next Actions table from a registry.md as a list of dicts.
    Tolerates the table with OR without the new `State` column."""
    try:
        lines = reg_path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return []
    start = next((k for k, l in enumerate(lines)
                  if re.match(r"^#{1,6}\s", l) and "next action" in l.lower()), None)
    if start is None:
        return []
    tbl, j = [], start + 1
    while j < len(lines):
        l = lines[j].strip()
        if re.match(r"^#{1,6}\s", l) and tbl:        # next heading ends the section
            break
        if l.startswith("|"):
            tbl.append(l)
        elif tbl and l == "":                         # blank line after table ends it
            break
        j += 1
    if len(tbl) < 2:
        return []

    def cells(r):
        return [c.strip() for c in r.strip().strip("|").split("|")]

    header = [h.lower() for h in cells(tbl[0])]

    def col(*names):
        for nm in names:
            for k, h in enumerate(header):
                if nm in h:
                    return k
        return None

    i_num, i_act = col("#"), col("action")
    i_own, i_typ = col("owner"), col("type")
    i_stat, i_state, i_due = col("status"), col("state"), col("due")

    out = []
    for r in tbl[1:]:
        if re.fullmatch(r"[\s:|\-]+", r):            # the |---|---| separator
            continue
        c = cells(r)
        if not any(c):
            continue
        g = lambda i: c[i] if (i is not None and i < len(c)) else ""
        out.append({"num": g(i_num), "action": g(i_act), "owner": g(i_own),
                    "type": g(i_typ), "status": g(i_stat),
                    "state": g(i_state), "due": g(i_due)})
    return out


def derive_action_state(a):
    """The State of a single action. Done (from Status) always wins — a finished
    action needs no attention regardless of any State cell. Otherwise an explicit
    `State` cell wins; else derive from Status / Owner / Type / Due. Returns a
    STATES key or 'done'."""
    status = str(a.get("status", "")).lower()
    if "done" in status or "☑" in a.get("status", "") or "✅" in a.get("status", ""):
        return "done"
    state_cell = str(a.get("state", "")).strip()
    if state_cell and state_cell not in ("—", "-"):     # explicit State (not a done placeholder)
        return parse_state(state_cell)
    if "block" in status or "⊘" in a.get("status", ""):
        return "waiting"                              # parked, can't proceed
    if "doing" in status or "◐" in a.get("status", ""):
        return "on track"
    if "undefined" in status or "○" in a.get("status", ""):
        return "undefined"
    # Due > 1 month away → waiting (hasn't ripened yet; owner/type derivation would
    # fire below, but a distant due date means the task isn't pressing right now).
    due_dt = parse_due(a.get("due", ""))
    if due_dt and due_dt > _date.today() + _td(days=31):
        return "waiting"
    owner = str(a.get("owner", "")).lower()
    typ = str(a.get("type", "")).lower()
    has_owner = owner not in ("", "—", "-", "<placeholder>")
    due = str(a.get("due", "")).strip() not in ("", "—", "-")
    if "luke" in owner or "human" in typ:
        return "your move"
    if "agent" in owner or typ == "agent":
        return "on track"
    if has_owner:                                     # a named third party
        return "waiting"
    if not has_owner and not due:
        return "undefined"
    return "undefined"


def build_project(row):
    """Assemble one project's dashboard model from its tracking row + registry."""
    pid = str(row.get("id", "?"))
    overall = parse_state(row.get("state"))
    pending = "pending" in str(row.get("state", "")).lower() or bool(row.get("pending_sweep"))
    reg_rel = str(row.get("path", "")) if row.get("path") else ""
    reg = ROOT / reg_rel if reg_rel else None
    notes = reg.parent / "notes.md" if reg else None
    actions = load_actions(reg) if reg and reg.exists() else []
    for a in actions:
        a["_state"] = derive_action_state(a)

    open_actions = [a for a in actions if a["_state"] != "done"]
    # Bottleneck: the most-demanding OPEN action — the one whose completion would
    # move the project's overall State. Tie broken by table order.
    bottleneck = None
    if open_actions:
        bottleneck = min(open_actions, key=lambda a: STATES[a["_state"]][0])
        peers = [a for a in open_actions
                 if STATES[a["_state"]][0] == STATES[bottleneck["_state"]][0]]
    else:
        peers = []

    # Drift: the live worst-open-action state vs the (possibly stale) board state.
    # Surfaced as a hint, never auto-applied — !ProjectSweep still owns `overall`.
    live_worst = bottleneck["_state"] if bottleneck else "on track"
    drift = live_worst if STATES[live_worst][0] != STATES[overall][0] else None

    done = sum(1 for a in actions if a["_state"] == "done")
    return {
        "id": pid,
        "title": str(row.get("title") or row.get("project") or pid),
        "context": str(row.get("context") or "—"),
        "secondary": row.get("secondary_contexts") or [],
        "group": row.get("group") or "",
        "status": str(row.get("status") or "Active"),
        "overall": overall,
        "drift": drift,
        "pending": pending,
        "waiting_on": str(row.get("waiting_on") or "").strip(),
        "wake": str(row.get("wake") or "").strip(),
        "reg_rel": reg_rel,
        "reg_mtime": reg.stat().st_mtime if reg and reg.exists() else 0,
        "notes_rel": _rel_or_abs(notes) if notes and notes.exists() else "",
        "notes_mtime": notes.stat().st_mtime if notes and notes.exists() else 0,
        "actions": actions,
        "open_count": len(open_actions),
        "done_count": done,
        "bottleneck": bottleneck,
        "peer_count": max(0, len(peers) - 1),
        "has_registry": bool(reg and reg.exists()),
    }


# ============================================================================
# HTML
# ============================================================================
# !HouseStyle — SUBORDINATE. The inline :root below is a rendered surface governed
# by the always-on house design skill (.claude/skills/!HouseStyle/) for tokens,
# motion and glyphs. NOTE: this is a DIFFERENT dashboard from
# System/Apps/ProjectDashboard/ — it shares no token file with it. It is dark-only;
# under the house ground contract that is expressed as [data-theme="dark"] on the
# root, not by inverting :root. Migrate when this CSS is next touched.
CSS = """
:root{--bg:#0f1115;--panel:#171a21;--panel2:#1d212b;--line:#2a2f3a;--ink:#e6e9ef;
--mut:#8b93a3;--acc:#6aa6ff;
--red:#e5484d;--org:#f0883e;--blu:#4b8bf4;--grn:#2fbf71;--gry:#6b7280;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
.wrap{display:flex;min-height:100vh}
.side{width:280px;flex:0 0 280px;background:var(--panel);border-right:1px solid var(--line);
padding:18px 14px;position:sticky;top:0;height:100vh;overflow:auto}
.brand{font-weight:700;font-size:17px;margin:0 0 2px}.brand a{color:var(--ink)}
.tag{color:var(--mut);font-size:12px;margin-bottom:14px}
.side h4{color:var(--mut);text-transform:uppercase;letter-spacing:.06em;font-size:11px;
margin:16px 0 6px}
.nav{list-style:none;margin:0 0 4px;padding:0}
.nav li{margin:2px 0;font-size:13px;display:flex;align-items:center;gap:8px;
padding:2px 4px;border-radius:5px}
.nav li:hover{background:var(--panel2)}
.nav a{color:var(--ink);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nav .pid{color:var(--mut);font-size:11px;font-variant-numeric:tabular-nums}
.mode-toggle{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;margin:10px 0 4px}
.mode-toggle button{flex:1;border:none;background:var(--panel2);color:var(--mut);font-size:12px;
padding:6px 0;cursor:pointer;font-weight:600}
.mode-toggle button.on{background:var(--org);color:#1a1200}
.mode-toggle button:disabled{cursor:wait;opacity:.6}
.mode-hint{color:var(--mut);font-size:11px;margin:4px 0 0}
.main{flex:1;padding:22px 30px;max-width:1040px}
h1{font-size:23px;margin:0 0 4px}
.crumb{color:var(--mut);font-size:13px;margin-bottom:16px}
/* the state square — explicitly a SQUARE, not a circle */
.sq{display:inline-block;width:13px;height:13px;border-radius:3px;flex:0 0 auto;
vertical-align:-1px}
.sq.lg{width:15px;height:15px}
.s-red{background:var(--red)}.s-org{background:var(--org)}.s-blu{background:var(--blu)}
.s-grn{background:var(--grn)}.s-gry{background:var(--gry)}
.s-done{background:var(--grn);opacity:.32}
/* legend / filter chips */
.legend{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--mut);
border:1px solid var(--line);border-radius:20px;padding:3px 10px;cursor:pointer;
user-select:none}
.chip:hover{border-color:var(--acc)}
.chip.off{opacity:.35}
.chip b{color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}
.ctx{margin:26px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.07em;
color:var(--mut);border-bottom:1px solid var(--line);padding-bottom:5px}
/* the project row — left rail | middle squares | right next-action */
.proj{display:grid;grid-template-columns:240px 1fr 300px;gap:16px;align-items:start;
background:var(--panel);border:1px solid var(--line);border-radius:11px;
padding:13px 15px;margin:9px 0}
.proj.complete{opacity:.6}
.p-head{display:flex;flex-direction:column;gap:3px;min-width:0}
.p-title{font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px}
.p-title .pid{color:var(--mut);font-size:11px;font-variant-numeric:tabular-nums}
.p-title span.t{overflow:hidden;text-overflow:ellipsis}
.p-meta{color:var(--mut);font-size:11.5px;display:flex;flex-wrap:wrap;gap:4px 8px}
.badge{font-size:10.5px;border:1px solid var(--line);border-radius:5px;padding:0 5px;color:var(--mut)}
.badge.wake{color:var(--acc);border-color:var(--acc)}
.badge.drift{color:var(--org);border-color:var(--org)}
.p-path{grid-column:1/-1;margin-top:2px;font-size:11px;color:var(--mut)}
.p-path a{color:var(--mut)}.p-path a:hover{color:var(--acc)}
.editpanel{grid-column:1/-1;margin-top:8px;border-top:1px dashed var(--line);padding-top:8px}
.editpanel summary{cursor:pointer;color:var(--org);font-size:12px}
.editrows{margin-top:6px}
.erow{display:inline-flex;align-items:center;gap:6px;margin:2px 6px 2px 0}
.erow .etxt{font-size:12px;color:var(--mut);max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ebtn{font-size:11px;border:1px solid var(--line);background:var(--panel2);color:var(--ink);
border-radius:6px;padding:2px 8px;cursor:pointer}
.ebtn:hover{border-color:var(--acc)}
.enote{margin-top:8px;display:flex;flex-direction:column;gap:6px;max-width:400px}
.enote textarea{background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:7px;
padding:6px 8px;font-size:12px;font-family:inherit;resize:vertical}
.col-h{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);
margin:0 0 6px}
/* middle: the task squares */
.squares{display:flex;flex-wrap:wrap;gap:5px}
.tsq{width:17px;height:17px;border-radius:4px;cursor:default;position:relative;
transition:transform .06s,box-shadow .06s}
.tsq:hover{transform:scale(1.18);box-shadow:0 0 0 2px var(--bg),0 0 0 3px var(--acc)}
.tsq.done::after{content:"✓";position:absolute;inset:0;display:flex;align-items:center;
justify-content:center;font-size:11px;color:#fff;opacity:.8}
/* floating hover tooltip — the action text under the cursor */
.tt{position:fixed;z-index:60;max-width:340px;background:#0b0d12;border:1px solid var(--line);
border-radius:9px;padding:9px 11px;font-size:13px;line-height:1.45;color:var(--ink);
box-shadow:0 8px 28px rgba(0,0,0,.55);pointer-events:none;opacity:0;transition:opacity .08s}
.tt.show{opacity:1}
.tt .tt-meta{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.04em;
margin:0 0 4px;display:flex;align-items:center;gap:6px}
.tt .tt-act{color:var(--ink)}
.noact{color:var(--mut);font-size:12px;font-style:italic}
/* right: the bottleneck next action, in words */
.next{font-size:13px;line-height:1.45}
.next .lbl{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--mut);
text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.next .txt{color:var(--ink)}
.next .more{color:var(--mut);font-size:11.5px;margin-top:4px}
.next .who{color:var(--mut);font-size:11.5px;margin-top:3px}
.empty{color:var(--mut);font-style:italic;font-size:13px}
"""

JS = """
const states = ['urgent','your move','waiting','on track','undefined'];
const STORE_KEY = 'dashboardFilterOff';
let off;
try { off = new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]')); }
catch(e) { off = new Set(); }
function key(s){return s.replace(/ /g,'-');}
document.querySelectorAll('.chip[data-state]').forEach(c=>{
  const s=c.dataset.state;
  if(off.has(s)) c.classList.add('off');
  c.addEventListener('click',()=>{
    if(off.has(s)){off.delete(s);c.classList.remove('off');}
    else{off.add(s);c.classList.add('off');}
    try { localStorage.setItem(STORE_KEY, JSON.stringify([...off])); } catch(e) {}
    apply();
  });
});
function apply(){
  document.querySelectorAll('.proj').forEach(p=>{
    p.style.display = off.has(p.dataset.state)?'none':'';
  });
  document.querySelectorAll('.ctx').forEach(h=>{
    let n=h.nextElementSibling, any=false;
    while(n && n.classList.contains('proj')){if(n.style.display!=='none')any=true;n=n.nextElementSibling;}
    h.style.display = any?'':'none';
  });
}
apply();
/* View/Edit toggle — flips the server's live write-gate via /do/mode, then
   reloads so the page re-renders from server truth (edit panels appear/
   disappear, no client-side duplication of the render logic). */
function setMode(edit){
  var vb=document.getElementById('modeView'), eb=document.getElementById('modeEdit');
  vb.disabled=true; eb.disabled=true;
  fetch('/do/mode',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:'state='+(edit?'on':'off')})
    .then(r=>{ if(!r.ok) throw new Error('toggle failed'); return r.json(); })
    .then(function(){ try{localStorage.setItem('dashEditing',edit?'on':'off');}catch(e){} location.reload(); })
    .catch(function(){ vb.disabled=false; eb.disabled=false; alert('Could not switch modes — try again.'); });
}
/* hover tooltip — show a task square's action text under the cursor */
const tip=document.createElement('div');tip.className='tt';document.body.appendChild(tip);
function moveTip(e){
  const pad=14, r=tip.getBoundingClientRect();
  let x=e.clientX+pad, y=e.clientY+pad;
  if(x+r.width>window.innerWidth-6) x=e.clientX-r.width-pad;
  if(y+r.height>window.innerHeight-6) y=e.clientY-r.height-pad;
  tip.style.left=Math.max(6,x)+'px'; tip.style.top=Math.max(6,y)+'px';
}
function showTip(e){
  const el=e.currentTarget;
  tip.textContent='';
  const m=document.createElement('div');m.className='tt-meta';m.textContent=el.dataset.meta||'';
  const a=document.createElement('div');a.className='tt-act';a.textContent=el.dataset.tip||'';
  tip.appendChild(m);tip.appendChild(a);
  tip.classList.add('show'); moveTip(e);
}
function hideTip(){tip.classList.remove('show');}
document.querySelectorAll('.tsq').forEach(s=>{
  s.addEventListener('mouseenter',showTip);
  s.addEventListener('mousemove',moveTip);
  s.addEventListener('mouseleave',hideTip);
});
"""


def sq(state_key, big=False):
    cls = STATES.get(state_key, STATES["undefined"])[2]
    return f'<span class="sq{" lg" if big else ""} {cls}"></span>'


def render(projects, edit_mode=False):
    view_cls = "" if edit_mode else "on"
    edit_cls = "on" if edit_mode else ""
    MODE_TOGGLE = (
        '<div class="mode-toggle">'
        f'<button id="modeView" class="{view_cls}" onclick="setMode(false)">View</button>'
        f'<button id="modeEdit" class="{edit_cls}" onclick="setMode(true)">Edit</button>'
        '</div>'
        '<p class="mode-hint">Edit is live for this browser on this Mac until switched back to View.</p>'
    )
    # ---- counts by overall state ----
    counts = {k: 0 for k in STATES}
    for p in projects:
        counts[p["overall"]] += 1

    legend = '<div class="legend">' + "".join(
        f'<span class="chip" data-state="{k}">{sq(k)}{STATES[k][1]} <b>{counts[k]}</b></span>'
        for k in STATES
    ) + "</div>"

    # ---- left sidebar: smart index (by context, ordered by demand) ----
    nav = ""
    by_ctx = {}
    for p in projects:
        by_ctx.setdefault(p["context"], []).append(p)
    ordered_ctx = [c for c in CONTEXT_ORDER if c in by_ctx] + \
                  [c for c in by_ctx if c not in CONTEXT_ORDER]
    for ctx in ordered_ctx:
        items = sorted(by_ctx[ctx], key=lambda p: (STATES[p["overall"]][0], p["id"]))
        nav += f'<h4>{html.escape(ctx)}</h4><ul class="nav">'
        for p in items:
            nav += (f'<li>{sq(p["overall"])}<a href="#p-{p["id"]}">{html.escape(p["title"])}</a>'
                    f'<span class="pid">{html.escape(p["id"])}</span></li>')
        nav += "</ul>"

    # ---- main: one row per project ----
    body = ""
    for ctx in ordered_ctx:
        body += f'<div class="ctx">{html.escape(ctx)}</div>'
        for p in sorted(by_ctx[ctx], key=lambda p: (STATES[p["overall"]][0], p["id"])):
            body += render_proj(p, edit_mode)

    total = len(projects)
    return f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Project Dashboard</title><style>{CSS}{MQ_CSS}</style></head><body>
<div class="wrap">
<aside class="side">
  <p class="brand"><a href="/">Project Dashboard</a></p>
  {_tabs("board")}
  <p class="tag">{total} projects · live colour board</p>
  {nav}
  <h4>Legend</h4>
  <ul class="nav" style="font-size:12px">
    <li>{sq("urgent")} urgent — overdue / no plan</li>
    <li>{sq("your move")} your move — Luke's turn</li>
    <li>{sq("waiting")} waiting — on a reply/date</li>
    <li>{sq("on track")} on track — in motion</li>
    <li>{sq("undefined")} undefined — needs shaping</li>
  </ul>
  <h4>Other tools</h4>
  <ul class="nav" style="font-size:12px"><li><a href="http://localhost:8787" target="_blank" rel="noreferrer">🧠 LukeatronWiki →</a></li></ul>
  {MODE_TOGGLE}
</aside>
<main class="main">
  <h1>Project Dashboard</h1>
  <p class="crumb">Each square is one Next Action, tinted by the attention it needs.
     The right column names the move that would shift the project's overall colour.
     Click a legend chip to filter. Reads live — refresh after a !ProjectSweep.</p>
  {legend}
  {body}
</main>
</div>
<script>{JS}</script>
</body></html>"""


def render_edit_panel(p):
    """Edit-mode-only panel: tick/cycle-state forms per open action, plus a
    scrap box for notes.md. Each control is its own small POST form — kept
    separate from the read-only squares grid so that markup is untouched."""
    rows = ""
    for a in p["actions"]:
        if a["_state"] == "done":
            continue
        num = _plain(a["num"])
        txt = html.escape(_plain(a["action"]) or "(no description)")
        rows += (
            f'<form method="POST" action="/do/tick" class="erow">'
            f'<input type="hidden" name="proj" value="{html.escape(p["reg_rel"], quote=True)}">'
            f'<input type="hidden" name="num" value="{html.escape(num, quote=True)}">'
            f'<input type="hidden" name="mtime" value="{p["reg_mtime"]}">'
            f'<span class="etxt">#{html.escape(num)} {txt}</span>'
            f'<button type="submit" class="ebtn" title="Mark done">✓ Done</button>'
            f'</form>'
            f'<form method="POST" action="/do/state" class="erow">'
            f'<input type="hidden" name="proj" value="{html.escape(p["reg_rel"], quote=True)}">'
            f'<input type="hidden" name="num" value="{html.escape(num, quote=True)}">'
            f'<input type="hidden" name="mtime" value="{p["reg_mtime"]}">'
            f'<button type="submit" class="ebtn" title="Cycle state">↻ State</button>'
            f'</form>'
        )
    actions_html = f'<div class="editrows">{rows}</div>' if rows else '<p class="empty">no open actions</p>'
    notehtml = ""
    if p.get("notes_rel"):
        notehtml = (
            f'<form method="POST" action="/do/note" class="enote">'
            f'<input type="hidden" name="proj" value="{html.escape(p["notes_rel"], quote=True)}">'
            f'<input type="hidden" name="mtime" value="{p["notes_mtime"]}">'
            f'<textarea name="text" placeholder="Append a scrap to notes.md…" rows="2"></textarea>'
            f'<button type="submit" class="ebtn">📥 Add scrap</button>'
            f'</form>'
        )
    return (f'<details class="editpanel"><summary>✏️ Edit</summary>'
            f'{actions_html}{notehtml}</details>')


def render_proj(p, edit_mode=False):
    # left rail
    sec = ""
    if p["secondary"]:
        sec = ' · ' + ", ".join(html.escape(str(s)) for s in p["secondary"])
    grp = f' · {html.escape(p["group"])}' if p["group"] else ""
    statusbadge = "" if p["status"] == "Active" else f'<span class="badge">{html.escape(p["status"])}</span>'
    pend = '<span class="badge">pending sweep</span>' if p["pending"] else ""
    wakehtml = f'<span class="badge wake">⏰ {html.escape(p["wake"])}</span>' if p["wake"] else ""
    drifthtml = (f'<span class="badge drift" title="Live open actions suggest a different state than the board">'
                 f'{sq(p["drift"])} actions suggest {STATES[p["drift"]][1]}</span>') if p.get("drift") else ""
    complete_cls = " complete" if p["status"] != "Active" else ""
    head = (f'<div class="p-head">'
            f'<div class="p-title">{sq(p["overall"], big=True)}'
            f'<span class="t">{html.escape(p["title"])}</span></div>'
            f'<div class="p-meta"><span class="pid">{html.escape(p["id"])}</span>'
            f'{statusbadge}{pend}{wakehtml}{drifthtml}'
            f'<span>{p["done_count"]}/{len(p["actions"])} done</span></div>'
            f'<div class="p-meta">{STATES[p["overall"]][1]}{grp}{sec}</div>'
            f'</div>')

    # middle: task squares
    if p["actions"]:
        sqs = ""
        for a in p["actions"]:
            stk = a["_state"]
            cls = "s-done done" if stk == "done" else STATES[stk][2]
            num = _plain(a["num"])
            txt = _plain(a["action"]) or "(no description)"
            who = _plain(a["owner"])
            due = _plain(a.get("due", ""))
            lbl = "done" if stk == "done" else STATES[stk][1]
            meta = (f'#{num} · ' if num else "") + lbl + (f' · {who}' if who else "") + (f' · due {due}' if due else "")
            sqs += (f'<div class="tsq {cls}" '
                    f'data-meta="{html.escape(meta, quote=True)}" '
                    f'data-tip="{html.escape(txt, quote=True)}"></div>')
        middle = f'<div class="col-h">tasks ({p["open_count"]} open)</div><div class="squares">{sqs}</div>'
    elif p["has_registry"]:
        middle = '<div class="col-h">tasks</div><div class="noact">no Next Actions table</div>'
    else:
        middle = '<div class="col-h">tasks</div><div class="noact">no registry</div>'

    # right: the bottleneck next action, in words
    b = p["bottleneck"]
    if b:
        stk = b["_state"]
        txt = _clean(b["action"]) or "(unnamed action)"
        who = _clean(b["owner"])
        due = _clean(b.get("due", ""))
        duehtml = f'<div class="who">due {due}</div>' if due else ""
        more = f'<div class="more">+{p["peer_count"]} more at this level</div>' if p["peer_count"] else ""
        whohtml = f'<div class="who">{who}</div>' if who else ""
        right = (f'<div class="col-h">next move</div>'
                 f'<div class="next"><div class="lbl">{sq(stk)} {STATES[stk][1]}</div>'
                 f'<div class="txt">{txt}</div>{whohtml}{duehtml}{more}</div>')
    elif p["waiting_on"]:
        right = (f'<div class="col-h">next move</div>'
                 f'<div class="next"><div class="lbl">{sq(p["overall"])} {STATES[p["overall"]][1]}</div>'
                 f'<div class="txt">{_clean(p["waiting_on"])}</div></div>')
    elif p["actions"]:
        right = '<div class="col-h">next move</div><div class="next"><span class="empty">all actions done</span></div>'
    else:
        right = '<div class="col-h">next move</div><div class="next"><span class="empty">—</span></div>'

    pathfoot = (f'<div class="p-path"><a href="/project?p={urllib.parse.quote(p["reg_rel"])}">📄 {html.escape(p["reg_rel"])}</a></div>'
                if p.get("reg_rel") else "")
    editpanel = render_edit_panel(p) if edit_mode and p.get("reg_rel") else ""

    return (f'<div class="proj{complete_cls}" id="p-{p["id"]}" data-state="{p["overall"]}" '
            f'data-context="{html.escape(p["context"])}">'
            f'{head}<div>{middle}</div><div>{right}</div>{pathfoot}{editpanel}</div>')


# ============================================================================
# Server
# ============================================================================
def shell(title, inner, edit_mode=False):
    badge = '<p style="color:var(--org)">✏️ Edit mode</p>' if edit_mode else ""
    return f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><style>{CSS}</style></head><body>
<div class="wrap"><main class="main" style="max-width:900px">
<p class="crumb"><a href="/">← Dashboard</a></p>{badge}{inner}
</main></div></body></html>"""


# ── Minor Queue tab ─────────────────────────────────────────────────────────
# A read-only view of Memory/Medium-Term/MinorTasks/queue.md — open rows only
# (☐ Open / ◐ Doing), in chronological order (row # ascending). Display only:
# this dashboard never writes the queue; !Initiative remains its sole owner.

def _tabs(active):
    """Small tab strip shared by the board and the minor-queue page."""
    def tab(key, href, label):
        on = " on" if key == active else ""
        return f'<a class="tab{on}" href="{href}">{label}</a>'
    return ('<div class="tabs">'
            + tab("board", "/", "▪ Board")
            + tab("minor", "/minor", "🗒️ Minor Queue")
            + '</div>')


def load_minor_queue():
    """Parse queue.md → (open_rows, status). status is 'ok', 'missing', or an
    error string. open_rows: list of dicts sorted by # ascending, ☑ Done excluded."""
    if not MINOR_QUEUE.exists():
        return [], "missing"
    try:
        lines = MINOR_QUEUE.read_text(encoding="utf-8").splitlines()
    except Exception as e:
        return [], f"unreadable: {e}"
    # find the header row: a table line containing a '#' column whose next line
    # is the |---|---| separator.
    header_idx = None
    for i in range(len(lines) - 1):
        l = lines[i].lstrip()
        if l.startswith("|") and re.match(r"^\s*\|[\s:|-]+\|\s*$", lines[i + 1]):
            cells = _table_cells(lines[i])
            if _table_col(cells, "#") is not None and _table_col(cells, "task") is not None:
                header_idx = i
                break
    if header_idx is None:
        return [], "no table found"
    hc = _table_cells(lines[header_idx])
    ci = {name: _table_col(hc, name) for name in
          ("#", "task", "source", "impact", "status", "state", "wake", "notes")}

    def cell(cells, key):
        idx = ci[key]
        return cells[idx].strip() if idx is not None and idx < len(cells) else ""

    rows = []
    for j in range(header_idx + 2, len(lines)):
        l = lines[j].lstrip()
        if not l.startswith("|"):
            break  # table ended
        cells = _table_cells(lines[j])
        num = cell(cells, "#")
        if not re.match(r"^\d+$", num):
            continue  # skip stray/malformed rows
        status = cell(cells, "status")
        if "☑" in status or "done" in status.lower():
            continue  # open rows only
        rows.append({
            "num": int(num),
            "task": cell(cells, "task"),
            "source": cell(cells, "source"),
            "impact": cell(cells, "impact"),
            "status": status,
            "state": parse_state(cell(cells, "state")),
            "wake": cell(cells, "wake"),
            "notes": cell(cells, "notes"),
        })
    rows.sort(key=lambda r: r["num"])
    return rows, "ok"


def _md_bold_strip(s):
    """Render the leading **bold** lead of a task cell as <strong>, escape rest."""
    s = html.escape(s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    return s


def render_minor_queue(rows, status, edit_mode=False):
    if status == "missing":
        note = f'<div class="noact">queue.md not found at {html.escape(str(MINOR_QUEUE))}</div>'
        body = ""
    elif status != "ok":
        note = f'<div class="noact">Could not read the queue: {html.escape(status)}</div>'
        body = ""
    else:
        note = ""
        if not rows:
            body = '<div class="noact">No open minor tasks — the queue is clear. 🎉</div>'
        else:
            trs = ""
            for r in rows:
                stlabel = STATES[r["state"]][1]
                imp = html.escape(r["impact"] or "—")
                imp_cls = "imp-high" if imp.lower() == "high" else "imp-low"
                wake = html.escape(r["wake"]) if r["wake"] and r["wake"] != "—" else ""
                trs += (
                    f'<tr>'
                    f'<td class="mq-num">{r["num"]}</td>'
                    f'<td class="mq-state" title="{stlabel}">{sq(r["state"])}<span class="mq-stlabel">{stlabel}</span></td>'
                    f'<td class="mq-task">{_md_bold_strip(r["task"])}</td>'
                    f'<td><span class="mq-imp {imp_cls}">{imp}</span></td>'
                    f'<td class="mq-source">{html.escape(r["source"])}</td>'
                    f'<td class="mq-wake">{wake}</td>'
                    f'</tr>'
                )
            body = (
                '<table class="mq">'
                '<thead><tr><th>#</th><th>State</th><th>Task</th><th>Impact</th>'
                '<th>Source</th><th>Wake/Due</th></tr></thead>'
                f'<tbody>{trs}</tbody></table>'
            )
    n = len(rows)
    return f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Minor Queue</title><style>{CSS}{MQ_CSS}</style></head><body>
<div class="wrap">
<aside class="side">
  <p class="brand"><a href="/">Project Dashboard</a></p>
  {_tabs("minor")}
  <p class="tag">{n} open minor task{"" if n == 1 else "s"}</p>
  <h4>About</h4>
  <p class="tag" style="line-height:1.5">Open rows (☐ / ◐) from the MinorTasks queue,
     row-number order. Read-only — <b>!Initiative</b> owns the queue.</p>
  <h4>Other tools</h4>
  <ul class="nav" style="font-size:12px"><li><a href="http://localhost:8787" target="_blank" rel="noreferrer">🧠 LukeatronWiki →</a></li></ul>
</aside>
<main class="main">
  <h1>Minor Queue</h1>
  <p class="crumb">Small self-contained tasks that don't warrant a project.
     Open rows only, in chronological order. Reads live — refresh after !MinorTask / !Initiative.</p>
  {note}{body}
</main>
</div></body></html>"""


MQ_CSS = """
.tabs{display:flex;gap:4px;margin:8px 0 10px}
.tabs .tab{flex:1;text-align:center;padding:6px 4px;font-size:12px;border-radius:7px;
  background:var(--panel2);color:var(--mut);text-decoration:none;border:1px solid var(--line)}
.tabs .tab.on{background:var(--acc);color:#0b1220;font-weight:600;border-color:var(--acc)}
table.mq{width:100%;border-collapse:collapse;font-size:13px}
table.mq th{text-align:left;color:var(--mut);font-weight:600;font-size:11px;
  text-transform:uppercase;letter-spacing:.04em;padding:6px 10px;border-bottom:1px solid var(--line)}
table.mq td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
table.mq tr:hover td{background:var(--panel2)}
.mq-num{color:var(--mut);font-variant-numeric:tabular-nums;text-align:right;width:1%}
.mq-state{white-space:nowrap;width:1%}
.mq-stlabel{margin-left:6px;color:var(--mut);font-size:12px}
.mq-task{max-width:640px}
.mq-source{color:var(--mut);font-size:12px;white-space:nowrap}
.mq-wake{color:var(--mut);font-size:12px;white-space:nowrap}
.mq-imp{font-size:11px;padding:1px 7px;border-radius:10px;border:1px solid var(--line)}
.mq-imp.imp-high{color:var(--org);border-color:var(--org)}
.mq-imp.imp-low{color:var(--mut)}
"""


class Handler(http.server.BaseHTTPRequestHandler):
    edit_mode = False

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

    def _query(self):
        qs = urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
        return {k: v[0] for k, v in qs.items()}

    def _resolve_safe(self, rel):
        """Resolve a path relative to PROJ_DIR's parent (ROOT), fenced inside PROJ_DIR."""
        target = (ROOT / rel).resolve()
        try:
            target.relative_to(PROJ_DIR.resolve())
        except ValueError:
            return None
        return target

    def _project_id_for(self, target):
        m = re.match(r"^([A-Za-z]+-\d+)-", target.parent.name)
        return m.group(1) if m else target.parent.name

    def _redirect(self, location="/"):
        self.send_response(303)
        self.send_header("Location", location)
        self.end_headers()

    def _read_form(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(length).decode("utf-8", errors="replace") if length else ""
        qs = urllib.parse.parse_qs(raw)
        return {k: v[0] for k, v in qs.items()}

    def do_POST(self):
        path = self.path.split("?")[0]
        if path == "/do/mode":
            # THE runtime write-gate. Deliberately no auth beyond POST-only —
            # Luke's explicit choice (single user, secured laptop) over the
            # earlier launch-time-only flag. Flips Handler.edit_mode live, for
            # every request on this process, no restart. See plan D1-D3.
            form = self._read_form()
            Handler.edit_mode = form.get("state", "") == "on"
            log_edit("mode", "-", "on" if Handler.edit_mode else "off")
            return self._send_json(200, {"edit_mode": Handler.edit_mode})
        if path not in ("/do/tick", "/do/state", "/do/note"):
            return self._send(404, "<h1>404</h1>")
        if not self.edit_mode:
            return self._send(403, shell("Forbidden", "<h1>Edit mode is off</h1><p>Flip the View/Edit toggle in the sidebar to enable writes.</p>"))
        form = self._read_form()
        rel = form.get("proj", "")
        target = self._resolve_safe(rel) if rel else None
        if target is None:
            return self._send(403, shell("Forbidden", "<h1>Access denied</h1><p>Writes resolve inside Projects/ only.</p>"))
        if not target.exists():
            return self._send(404, shell("Not found", f"<h1>Not found: {html.escape(rel)}</h1>"))
        try:
            form_mtime = float(form.get("mtime", "0") or "0")
        except ValueError:
            form_mtime = 0.0
        if abs(target.stat().st_mtime - form_mtime) > 0.01:
            return self._send(409, shell("Conflict", "<h1>409 — file changed underneath you</h1><p>Reload the dashboard and try again; nothing was overwritten.</p>"))

        if path == "/do/tick":
            num = form.get("num", "")
            ok, msg = mutate_registry_cell(target, num, ("status",), "☑ Done")
            if not ok:
                return self._send(400, shell("Edit failed", f"<h1>Could not tick #{html.escape(num)}</h1><p>{html.escape(msg)}</p>"))
            log_edit("tick", rel, f"action #{num} → Done")
            self._project_touched(target)
            return self._redirect("/")

        if path == "/do/state":
            num = form.get("num", "")
            lines = target.read_text(encoding="utf-8").splitlines(keepends=True)
            found = find_next_actions_table(lines)
            cur_key = "undefined"
            if found:
                header_idx, row_idxs = found
                header_cells = _table_cells(lines[header_idx])
                i_num, i_state = _table_col(header_cells, "#"), _table_col(header_cells, "state")
                if i_num is not None and i_state is not None:
                    for ri in row_idxs:
                        cells = _table_cells(lines[ri])
                        if i_num < len(cells) and cells[i_num] == str(num) and i_state < len(cells):
                            cur_key = parse_state(cells[i_state])
            nxt_key = STATE_ORDER[(STATE_ORDER.index(cur_key) + 1) % len(STATE_ORDER)]
            new_cell = f"{EMOJI_FOR_STATE[nxt_key]} {nxt_key}"
            ok, msg = mutate_registry_cell(target, num, ("state",), new_cell)
            if not ok:
                return self._send(400, shell("Edit failed", f"<h1>Could not cycle #{html.escape(num)}</h1><p>{html.escape(msg)}</p>"))
            log_edit("state", rel, f"action #{num} → {nxt_key}")
            self._project_touched(target)
            return self._redirect("/")

        if path == "/do/note":
            text = form.get("text", "").strip()
            if not text:
                return self._redirect("/")
            append_scrap(target, text)
            log_edit("note", rel, "scrap appended")
            return self._redirect("/")

    def _project_touched(self, registry_path):
        stamp_pending_sweep(self._project_id_for(registry_path))

    def do_GET(self):
        path = self.path.split("?")[0]
        if path.startswith("/do/"):
            return self._send(405, "<h1>405 — use POST</h1>")
        if path == "/project":
            q = self._query()
            rel = q.get("p", "")
            if not rel:
                return self._send(400, shell("Bad request", "<h1>Missing path</h1>"))
            target = self._resolve_safe(rel)
            if target is None:
                return self._send(403, shell("Forbidden", "<h1>Access denied</h1><p>Registries resolve inside Projects/ only.</p>"))
            if not target.exists() or target.suffix.lower() != ".md":
                return self._send(404, shell("Not found", f"<h1>Not found: {html.escape(rel)}</h1>"))
            raw = target.read_text(encoding="utf-8")
            inner = (f'<div class="crumb">📄 {html.escape(rel)} · read-only</div>'
                      f'<pre style="white-space:pre-wrap;overflow:auto;font:13px/1.5 ui-monospace,monospace">{html.escape(raw)}</pre>')
            return self._send(200, shell(target.stem, inner, self.edit_mode))
        if path == "/minor":
            rows, status = load_minor_queue()
            return self._send(200, render_minor_queue(rows, status, self.edit_mode))
        if path in ("/", ""):
            rows = load_tracking()
            projects = [build_project(r) for r in rows
                        if str(r.get("status", "")).strip() != "Archived"]
            return self._send(200, render(projects, self.edit_mode))
        self._send(404, "<h1>404</h1>")

    def log_message(self, *a):
        pass


def main():
    global PORT
    Handler.edit_mode = bool(os.environ.get("LUKEATRON_DASHBOARD_EDIT"))
    if not TRACKING.exists():
        print(f"⚠  Projects tracking file not found: {TRACKING}")
        print("   Set LUKEATRON_PROJECTS_DIR if it lives elsewhere.")
    for _ in range(10):
        try:
            httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
            break
        except OSError:
            PORT += 1
    else:
        print("Could not bind a port."); sys.exit(1)
    url = f"http://localhost:{PORT}"
    print(f"Project Dashboard → {url}")
    print(f"Serving: {PROJ_DIR}")
    print("Ctrl-C to stop.")
    if not os.environ.get("LUKEATRON_DASHBOARD_NO_BROWSER"):
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")


if __name__ == "__main__":
    main()

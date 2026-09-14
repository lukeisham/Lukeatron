#!/usr/bin/env python3
"""
LukeatronWiki — local browser viewer
====================================
A read-only web view of Memory/Long-Term/LukeatronWiki/:
  • the read / watch / write BACKLOG as a three-column board (_queue.yaml)
  • the interconnected PAGES with clickable [[wikilinks]] + backlinks (_index.yaml + <slug>.md)

Zero dependencies — pure Python 3 standard library. Reads the wiki files LIVE on every
request, so after !IdeaWiki edits a file you just refresh the browser. It never writes.

Run:   python3 serve.py            (auto-opens http://localhost:8787)
Stop:  Ctrl-C
"""
import http.server, socketserver, re, html, webbrowser, threading, sys, os, urllib.parse
from pathlib import Path
from datetime import datetime as _dt

# --- locate the wiki --------------------------------------------------------
# serve.py lives at System/Tools/lukeatronwiki-viewer/serve.py → _Lukeatron is parents[3]
ROOT = Path(__file__).resolve().parents[3]
WIKI_DIR = Path(os.environ.get("LUKEATRONWIKI_DIR", ROOT / "Memory" / "Long-Term" / "LukeatronWiki"))
LANDING = "lukeatronwiki"          # lukeatronwiki.md is the control surface / Main Page
PORT = int(os.environ.get("LUKEATRONWIKI_PORT", "8787"))
IMG_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
             ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml"}
# KIND-chip emoji for the top-right topic box. Source of truth is the !IdeaWiki
# skill (SET_THUMBNAIL block); kept in sync here read-only.
TYPE_EMOJI = {"book": "📖", "theme": "🧩", "question": "❓", "source": "🔗",
              "person-idea": "👤", "meta": "🗂️"}


def _rel_or_abs(path):
    """str(path) relative to ROOT when possible, else the absolute path — so a
    WIKI_DIR override outside ROOT (used for scratch-copy testing) never
    crashes the file-path footer."""
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)

# ============================================================================
# Minimal YAML reader — tuned to LukeatronWiki's own schema (scalars, inline
# [lists], empty {} / [], and block lists of dicts). Uses PyYAML if it happens
# to be installed; otherwise this fallback handles our controlled files.
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
        if (v[0], v[-1]) in (('"', '"'), ("'", "'")) and len(v) >= 2:
            return v[1:-1]
        if v.startswith("[") and v.endswith("]"):            # inline list
            inner = v[1:-1].strip()
            if not inner:
                return []
            return [_scalar(x) for x in _split_top(inner)]
        if re.fullmatch(r"-?\d+", v):
            return int(v)
        if v.lower() in ("true", "false"):
            return v.lower() == "true"
        return v

    def _split_top(s):                                       # split a,b on top-level commas
        out, depth, cur = [], 0, ""
        for ch in s:
            if ch in "[{":
                depth += 1
            elif ch in "]}":
                depth -= 1
            if ch == "," and depth == 0:
                out.append(cur); cur = ""
            else:
                cur += ch
        if cur.strip():
            out.append(cur)
        return out

    def parse_yaml(text):
        root, i = {}, 0
        lines = text.splitlines()
        n = len(lines)
        while i < n:
            raw = lines[i]
            line = raw.split(" #")[0].rstrip() if not _in_str(raw) else raw.rstrip()
            if not line.strip() or line.strip().startswith("#"):
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

    def _in_str(s):
        return False

    def _read_block_list(lines, i):
        items, n = [], len(lines)
        cur = None
        while i < n:
            raw = lines[i]
            if not raw.strip() or raw.strip().startswith("#"):
                i += 1; continue
            indent = len(raw) - len(raw.lstrip())
            if indent == 0:
                break
            stripped = raw.strip()
            if stripped.startswith("- "):
                if cur is not None:
                    items.append(cur)
                cur = {}
                stripped = stripped[2:]
                mm = re.match(r"^([A-Za-z0-9_\- ]+):\s*(.*)$", stripped)
                if mm:
                    cur[mm.group(1).strip()] = _scalar(mm.group(2))
            else:
                mm = re.match(r"^([A-Za-z0-9_\- ]+):\s*(.*)$", stripped)
                if mm and cur is not None:
                    cur[mm.group(1).strip()] = _scalar(mm.group(2))
            i += 1
        if cur is not None:
            items.append(cur)
        return items, i

# ============================================================================
# Page model
# ============================================================================
def split_frontmatter(text):
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            fm = text[3:end].strip("\n")
            body = text[end + 4:]
            # strip a leading HTML comment block (template guidance) if present
            return parse_yaml(fm), body
    # tolerate a leading <!-- ... --> comment before frontmatter
    if text.lstrip().startswith("<!--"):
        c = text.find("-->")
        if c != -1:
            return split_frontmatter(text[c + 3:].lstrip())
    return {}, text

def split_lead(body):
    """Split a page body into (h1, lead, rest): the H1 title line, the lead
    summary paragraph(s) before the first H2+, and everything from the first
    section heading onward."""
    lines = body.split("\n")
    rest_start = None
    for idx, ln in enumerate(lines):
        if re.match(r"^#{2,6}\s+", ln):
            rest_start = idx
            break
    if rest_start is None:
        head, rest = body, ""
    else:
        head = "\n".join(lines[:rest_start])
        rest = "\n".join(lines[rest_start:])
    head_lines = head.split("\n")
    # peel a leading H1 off the head so it isn't styled as part of the lead
    first = next((j for j, l in enumerate(head_lines) if l.strip()), None)
    if first is not None and re.match(r"^#\s+", head_lines[first]):
        h1 = head_lines[first]
        lead = "\n".join(head_lines[first + 1:])
    else:
        h1, lead = "", head
    return h1, lead, rest

def load_pages():
    pages = {}
    if not WIKI_DIR.exists():
        return pages
    # Pointer nodes live in Nodes/; the landing + about pages stay at the root.
    node_files = sorted(WIKI_DIR.glob("*.md")) + sorted((WIKI_DIR / "Nodes").glob("*.md"))
    for f in node_files:
        slug = f.stem
        try:
            text = f.read_text(encoding="utf-8")
        except Exception:
            continue
        fm, body = split_frontmatter(text)
        fmt = str(fm.get("format") or "article").lower().strip()
        is_meta = (slug == LANDING) or slug == "meta-about" or str(fm.get("type") or "").lower() == "meta" or fmt == "support"
        pages[slug] = {
            "slug": slug,
            "rel_path": _rel_or_abs(f),        # actual on-disk location (Nodes/ or root)
            "title": fm.get("title") or slug,
            "type": fm.get("type") or "",
            "topic": fm.get("topic") or "",
            "emoji": fm.get("emoji") or "",
            "format": fmt,                               # article | list | topic | support — layout (orthogonal to type)
            "status": fm.get("status") or "",
            "tags": fm.get("tags") or [],
            "related": fm.get("related") or [],
            "longterm_refs": fm.get("longterm_refs") or [],   # read-only references INTO Long-Term stores (never copies)
            "thumbnail": fm.get("thumbnail") or "",
            "thumbnail_caption": fm.get("thumbnail_caption") or "",
            "created": str(fm.get("created") or ""),
            "updated": str(fm.get("updated") or ""),
            "body": body,
            "is_landing": slug == LANDING,
            "is_meta": is_meta,                          # excluded from the auto Main-Page article feeds
        }
    return pages

def load_queue():
    qf = WIKI_DIR / "_queue.yaml"
    if not qf.exists():
        return []
    data = parse_yaml(qf.read_text(encoding="utf-8"))
    return data.get("items") or []

# ============================================================================
# Edit mode — quick-capture to the queue, tick a queue item. NEVER touches
# node pages, _index.yaml, or any subject store (see plan design decision D5:
# capture-not-edit — only !IdeaWiki absorbs, only !ArchiveMemory retires).
# ============================================================================
EDITS_LOG = ROOT / "Memory" / "Long-Term" / "Logs" / "edits.log"


def log_edit(verb, target, summary):
    try:
        ts = _dt.now().isoformat(timespec="seconds")
        EDITS_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(EDITS_LOG, "a", encoding="utf-8") as f:
            f.write(f"[BROWSER: wiki] [{verb}] {target} {summary} {ts}\n")
    except Exception:
        pass


def next_queue_id(text):
    nums = [int(m) for m in re.findall(r"id:\s*q-(\d+)", text)]
    return f"q-{(max(nums) + 1) if nums else 1:03d}"


def append_queue_item(qpath, title, kind, intent, source):
    """Append one well-formed item to _queue.yaml and bump count/last_updated.
    Append-only for the item block; count/last_updated are single-line edits."""
    text = qpath.read_text(encoding="utf-8")
    new_id = next_queue_id(text)
    today = _dt.now().strftime("%Y-%m-%d")

    def esc(s):
        return str(s).replace('"', '\\"')

    block = (
        f'\n  - id: {new_id}\n'
        f'    title: "{esc(title)}"\n'
        f'    kind: {kind}\n'
        f'    intent: {intent}\n'
        f'    status: queued\n'
        f'    needs_absorb: true\n'
        f'    source: "{esc(source)}"\n'
        f'    added: {today}\n'
        f'    notes: "Captured via LukeatronWiki viewer quick-capture — needs !IdeaWiki absorb."\n'
    )
    new_text = text.rstrip("\n") + "\n" + block

    m = re.search(r"^count:\s*(\d+)\s*$", new_text, re.M)
    if m:
        new_count = int(m.group(1)) + 1
        new_text = new_text[:m.start()] + f"count: {new_count}" + new_text[m.end():]
    m2 = re.search(r"^last_updated:\s*\S+\s*$", new_text, re.M)
    if m2:
        new_text = new_text[:m2.start()] + f"last_updated: {today}" + new_text[m2.end():]

    qpath.write_text(new_text, encoding="utf-8")
    return new_id


def set_queue_status(qpath, item_id, new_status):
    """Flip ONE item's status line — done or dropped only, the two
    Luke-decidable transitions. Retirement/promotion stay agent-owned."""
    lines = qpath.read_text(encoding="utf-8").splitlines(keepends=True)
    i = 0
    while i < len(lines):
        if re.match(rf"^\s*-\s*id:\s*{re.escape(item_id)}\s*$", lines[i]):
            j = i + 1
            while j < len(lines) and not re.match(r"^\s*-\s*id:\s*", lines[j]):
                if re.match(r"^\s*status:\s*", lines[j]):
                    indent = re.match(r"^(\s*)", lines[j]).group(1)
                    lines[j] = f"{indent}status: {new_status}\n"
                    qpath.write_text("".join(lines), encoding="utf-8")
                    return True
                j += 1
            return False
        i += 1
    return False

def load_themes():
    """Load the tracked-themes manifest from the `themes:` block in _index.yaml.
    Returns a list of {name, folder, hub_slug, exists} dicts sorted by name.
    Missing Long-Term folders are included with exists=False so the sidebar can
    flag them rather than silently drop them."""
    idx_file = WIKI_DIR / "_index.yaml"
    if not idx_file.exists():
        return []
    data = parse_yaml(idx_file.read_text(encoding="utf-8"))
    raw = data.get("themes") or []
    result = []
    for t in raw:
        if not isinstance(t, dict):
            continue
        folder = str(t.get("folder") or "").strip()
        exists = (ROOT / folder).is_dir() if folder else False
        result.append({
            "name": str(t.get("name") or "").strip(),
            "folder": folder,
            "hub_slug": str(t.get("hub_slug") or "").strip(),
            "exists": exists,
        })
    return sorted(result, key=lambda x: x["name"].lower())

def backlinks_for(slug, pages):
    return [p for p in pages.values() if slug in (p.get("related") or []) and p["slug"] != slug]

def load_index_slugs():
    """The slugs catalogued in _index.yaml's `pages:` list — read-only, for the
    integrity check (files on disk vs what the agent's map actually knows about)."""
    idx_file = WIKI_DIR / "_index.yaml"
    if not idx_file.exists():
        return set()
    data = parse_yaml(idx_file.read_text(encoding="utf-8"))
    return {str(p.get("slug") or "").strip() for p in (data.get("pages") or []) if isinstance(p, dict) and p.get("slug")}

def compute_integrity(pages):
    """Files vs index vs links — the standing audit as a live number, not a
    one-off manual check. Never writes; purely a read-only diagnostic."""
    files = set(pages.keys())
    indexed = load_index_slugs()
    unindexed = files - indexed
    dead_links = 0
    edges = {}
    for p in pages.values():
        for wl in re.findall(r'\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]', p.get("body") or ""):
            target = wl.strip()
            if target and target not in files:
                dead_links += 1
        edges[p["slug"]] = set(str(r).strip() for r in (p.get("related") or []) if r)
    one_way = sum(1 for a, rs in edges.items() for b in rs if b in edges and a not in edges[b])
    return {"files": len(files), "indexed": len(files & indexed), "unindexed": len(unindexed),
            "dead_links": dead_links, "one_way": one_way}

# ============================================================================
# Tiny Markdown → HTML (covers the LukeatronWiki template constructs)
# ============================================================================
# Known slugs at render time — set once per request from do_GET so md_inline can
# tell a live wikilink from a dead one. Read-only lookup; never mutated elsewhere.
KNOWN_SLUGS = set()

def _wl_cls(slug):
    return "wl" if slug in KNOWN_SLUGS else "wl wl-dead"

def md_inline(s):
    s = html.escape(s)
    s = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", lambda m: f'<a class="{_wl_cls(m.group(1).strip())}" href="/page/{m.group(1).strip()}">{m.group(2).strip()}</a>', s)
    s = re.sub(r"\[\[([^\]]+)\]\]", lambda m: f'<a class="{_wl_cls(m.group(1).strip())}" href="/page/{m.group(1).strip()}">{m.group(1).strip()}</a>', s)
    def _link(m):
        text, href = m.group(1), m.group(2)
        if href.lower().endswith(".pdf"):
            src = href if href.startswith("http") else "/pdf?p=" + urllib.parse.quote(href)
            return (f'<div class="pdf-viewer">'
                    f'<a href="{src}" target="_blank" class="pdf-title">&#128196; {text}</a>'
                    f'<embed src="{src}" type="application/pdf" class="pdf-embed"></div>')
        return f'<a href="{href}" target="_blank" rel="noreferrer">{text}</a>'
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", _link, s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    return s

def md_to_html(md):
    out, i = [], 0
    lines = md.split("\n")
    n = len(lines)
    in_list = False
    def close_list():
        nonlocal in_list
        if in_list:
            out.append("</ul>"); in_list = False
    while i < n:
        line = lines[i]
        # skip HTML comment blocks
        if line.strip().startswith("<!--"):
            while i < n and "-->" not in lines[i]:
                i += 1
            i += 1; continue
        if not line.strip():
            close_list(); i += 1; continue
        h = re.match(r"^(#{1,6})\s+(.*)$", line)
        if h:
            close_list()
            lvl = len(h.group(1))
            out.append(f"<h{lvl}>{md_inline(h.group(2))}</h{lvl}>")
            i += 1; continue
        if re.match(r"^(\-{3,}|\*{3,})\s*$", line):
            close_list(); out.append("<hr>"); i += 1; continue
        if line.lstrip().startswith("|") and i + 1 < n and re.match(r"^\s*\|[\s:|-]+\|\s*$", lines[i + 1]):
            close_list()
            rows = []
            while i < n and lines[i].lstrip().startswith("|"):
                rows.append(lines[i]); i += 1
            out.append(render_table(rows)); continue
        if line.lstrip().startswith(">"):
            close_list()
            out.append(f"<blockquote>{md_inline(line.lstrip()[1:].strip())}</blockquote>"); i += 1; continue
        li = re.match(r"^\s*[-*]\s+(.*)$", line)
        if li:
            if not in_list:
                out.append("<ul>"); in_list = True
            item = li.group(1)
            t = re.match(r"^\[([ xX])\]\s+(.*)$", item)
            if t:
                checked = "checked" if t.group(1).lower() == "x" else ""
                out.append(f'<li class="task"><input type="checkbox" disabled {checked}> {md_inline(t.group(2))}</li>')
            else:
                out.append(f"<li>{md_inline(item)}</li>")
            i += 1; continue
        close_list()
        out.append(f"<p>{md_inline(line)}</p>")
        i += 1
    close_list()
    return "\n".join(out)

def render_table(rows):
    def cells(r):
        return [c.strip() for c in r.strip().strip("|").split("|")]
    head = cells(rows[0])
    body = [cells(r) for r in rows[2:]]
    h = "".join(f"<th>{md_inline(c)}</th>" for c in head)
    b = "".join("<tr>" + "".join(f"<td>{md_inline(c)}</td>" for c in r) + "</tr>" for r in body)
    return f"<table><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table>"

# ============================================================================
# HTML chrome
# ============================================================================
# !HouseStyle — SUBORDINATE. The inline :root / :root.light pair below already
# solves both grounds, and was the existence proof for the house ground contract.
# It uses the OPPOSITE convention, though: dark base + .light override. The house
# rule is :root LIGHT with dark as the override (@media prefers-color-scheme +
# [data-theme]), because paper is always light and that makes print the base path.
# Migrate to the house mechanism when this CSS is next touched.
CSS = """
/* ── Dark theme (default) ── */
:root{--bg:#0f1115;--panel:#171a21;--panel2:#1d212b;--line:#2a2f3a;--ink:#e6e9ef;--mut:#8b93a3;--acc:#6aa6ff;
--read:#5aa9e6;--watch:#b07cf0;--write:#e0a64a;--done:#3ecf8e;--drop:#6b7280;--dead:#e5484d;}
.content .wl-dead{border-bottom:1px dashed var(--dead);color:var(--dead)}
/* ── Light theme (Wikipedia-style neutral) ── */
:root.light{--bg:#f8f9fa;--panel:#fff;--panel2:#f1f3f5;--line:#dee2e6;--ink:#1a1a1a;--mut:#6b7280;--acc:#2563eb;
--read:#1d6fa5;--watch:#6d28d9;--write:#b45309;--done:#15803d;--drop:#9ca3af;--dead:#c0362f;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
.wrap{display:flex;min-height:100vh}
.side{width:260px;flex:0 0 260px;background:var(--panel);border-right:1px solid var(--line);padding:20px 16px;position:sticky;top:0;height:100vh;overflow:auto}
.brand{font-weight:700;font-size:17px;margin:0 0 2px}.brand a{color:var(--ink)}
.tag{color:var(--mut);font-size:12px;margin-bottom:18px}
.side h4{color:var(--mut);text-transform:uppercase;letter-spacing:.06em;font-size:11px;margin:18px 0 6px}
.side ul{list-style:none;margin:0;padding:0}.side li{margin:3px 0}
.main{flex:1;padding:28px 40px;max-width:900px}
.board{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:8px}
.col{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px}
.col h3{margin:0 0 10px;font-size:14px;display:flex;align-items:center;gap:8px}
.dot{width:9px;height:9px;border-radius:50%}
.read .dot{background:var(--read)}.watch .dot{background:var(--watch)}.write .dot{background:var(--write)}
.card{background:var(--panel2);border:1px solid var(--line);border-radius:9px;padding:10px 11px;margin:8px 0}
.card .t{font-weight:600;font-size:14px}
.card .m{color:var(--mut);font-size:12px;margin-top:4px;display:flex;gap:8px;flex-wrap:wrap}
.pill{font-size:11px;padding:1px 7px;border-radius:20px;border:1px solid var(--line)}
.s-queued{color:var(--mut)}.s-active{color:var(--acc);border-color:var(--acc)}
.s-done{color:var(--done);border-color:var(--done)}.s-dropped,.s-promoted{color:var(--drop)}
.empty{color:var(--mut);font-size:13px;font-style:italic;padding:6px 2px}
.kind{font-size:11px;color:var(--mut)}
.content h1{font-size:26px;margin:0 0 14px}.content h2{font-size:19px;margin:24px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}
.content h3{font-size:16px;margin:18px 0 6px}
.content table{border-collapse:collapse;margin:10px 0;width:100%}
.content th,.content td{border:1px solid var(--line);padding:6px 10px;text-align:left;font-size:14px}
.content code{background:#000;padding:1px 5px;border-radius:5px;font-size:13px}
.content blockquote{border-left:3px solid var(--acc);margin:10px 0;padding:2px 14px;color:var(--mut)}
.content li.task{list-style:none;margin-left:-20px}
.content .wl{border-bottom:1px dashed var(--acc)}
.meta{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}
.backlinks{margin-top:30px;border-top:1px solid var(--line);padding-top:14px}
.backlinks h4{color:var(--mut);font-size:12px;text-transform:uppercase;margin:0 0 8px}
.crumb{color:var(--mut);font-size:13px;margin-bottom:14px}
.pdf-viewer{margin:14px 0;border:1px solid var(--line);border-radius:9px;overflow:hidden}
.pdf-title{display:block;padding:8px 12px;background:var(--panel);font-size:13px;border-bottom:1px solid var(--line)}
.pdf-embed{width:100%;height:640px;display:block;border:none}
.idx-jump{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 24px}
.idx-jump a{font-size:12px;padding:2px 8px;border:1px solid var(--line);border-radius:6px;color:var(--mut)}
.idx-jump a:hover{color:var(--acc);border-color:var(--acc)}
.idx-section{margin:0 0 28px}
.idx-section h2{font-size:17px;margin:0 0 10px;border-bottom:1px solid var(--line);padding-bottom:5px}
.idx-section h3{font-size:14px;color:var(--mut);margin:16px 0 5px;font-weight:600}
.idx-type-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:10px}
.idx-type-card{background:var(--panel);border:1px solid var(--line);border-radius:9px;padding:10px 12px}
.idx-type-card .label{font-weight:600;font-size:14px;text-transform:capitalize}
.idx-type-card .count{color:var(--mut);font-size:12px;margin:2px 0 6px}
.idx-type-card ul{list-style:none;margin:0;padding:0}
.idx-type-card li{font-size:13px;margin:2px 0}
.idx-az-row{display:flex;gap:6px;align-items:baseline;padding:3px 0;border-bottom:1px solid var(--line)}
.idx-az-row .az-letter{width:22px;font-weight:700;color:var(--mut);font-size:13px;flex:0 0 22px}
.idx-az-row ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px 14px}
.idx-az-row li{font-size:13px}
.idx-empty{color:var(--mut);font-style:italic;font-size:13px;padding:16px 0}
.idx-integrity{margin-top:-4px}
.idx-filter{margin:0 0 20px}
.idx-filter input{width:100%;max-width:320px;padding:7px 11px;border:1px solid var(--line);border-radius:8px;
background:var(--panel);color:var(--ink);font-size:13px}
.qwarn{background:rgba(229,72,77,.1);border:1px solid var(--dead);border-radius:9px;padding:8px 11px;margin-bottom:12px;font-size:13px}
.qfinished{margin-top:10px}
.qfinished summary{cursor:pointer;color:var(--mut);font-size:12px}
.capture{display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:var(--panel);
border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:0 0 16px}
.capture input[type=text],.capture select{background:var(--panel2);color:var(--ink);
border:1px solid var(--line);border-radius:7px;padding:5px 8px;font-size:13px}
.capture input[name=title]{flex:1 1 220px}
.ebtn{font-size:11px;border:1px solid var(--line);background:var(--panel2);color:var(--ink);
border-radius:6px;padding:3px 9px;cursor:pointer}
.ebtn:hover{border-color:var(--acc)}
.qedit{display:inline-block;margin:6px 6px 0 0}
.infobox{float:right;width:248px;margin:4px 0 18px 24px;background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:11px;text-align:center}
.infobox img{max-width:100%;border-radius:7px;display:block;margin:0 auto}
.infobox .ib-cap{color:var(--mut);font-size:12px;line-height:1.45;margin-top:9px}
.content .lead{font-size:16.5px;line-height:1.62;margin:2px 0 20px}
.content .lead p:first-child{margin-top:0}
.content::after{content:"";display:block;clear:both}
/* topic box — the two chips above the thumbnail in the right-rail infobox */
.topicbox{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:0 0 4px}
.infobox img{margin-top:8px}
.chip{font-size:12px;font-weight:600;padding:3px 9px;border-radius:20px;border:1px solid var(--line);white-space:nowrap}
.chip-kind{background:var(--panel2);color:var(--ink)}
.chip-subj{background:rgba(106,166,255,.12);color:var(--acc);border-color:var(--acc)}
/* auto Main Page */
.mp-grid,.mp-rail{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0}
.mp-col{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.mp-col h2{font-size:15px;margin:0 0 10px;border:none;padding:0;color:var(--mut);text-transform:uppercase;letter-spacing:.05em}
.mp-card{display:flex;gap:11px;align-items:flex-start;padding:9px 10px;margin:6px 0;background:var(--panel2);border:1px solid var(--line);border-radius:9px}
.mp-card:hover{border-color:var(--acc);text-decoration:none}
.mp-emo{font-size:19px;line-height:1.2}
.mp-body{display:flex;flex-direction:column}
.mp-t{font-weight:600;color:var(--ink);font-size:14px}
.mp-sub{color:var(--mut);font-size:12px;margin-top:2px}
.mp-hublist{list-style:none;margin:0;padding:0}.mp-hublist li{margin:5px 0;font-size:14px}
.mp-links{list-style:none;margin:0;padding:0}.mp-links li{margin:7px 0;font-size:13.5px}
@media (max-width:680px){.infobox{float:none;width:100%;margin:0 0 18px}.mp-grid,.mp-rail{grid-template-columns:1fr}}
/* format pill (article|list|topic|support — shown on the page meta row) */
.pill-fmt{color:var(--acc);border-color:var(--acc);text-transform:capitalize}
/* topic hub — auto member roll */
.topic-members{margin-top:26px;border-top:1px solid var(--line);padding-top:8px}
.topic-members h2{font-size:17px;margin:0 0 10px;border:none;padding:0}
/* list format — tighter, denser body for short collections */
.content-list li{margin:2px 0}
.content-list .lead{font-size:15px;margin-bottom:14px}
/* Related in Long-Term — read-only references into the subject stores */
.lt-refs{margin-top:26px;border-top:1px solid var(--line);padding-top:14px}
.lt-refs h4{color:var(--mut);font-size:12px;text-transform:uppercase;margin:0 0 8px}
.lt-refs ul{list-style:none;margin:0;padding:0}.lt-refs li{margin:4px 0;font-size:13.5px}
/* inline variant — topic pages: refs beneath the Summary, no heading/divider */
.lt-refs-inline{margin:0 0 22px;border-top:none;padding-top:0}
/* file-path footer */
.page-path{margin-top:32px;padding-top:12px;border-top:1px solid var(--line);color:var(--mut);font-size:12px;font-family:monospace}
/* light/dark toggle */
.theme-btn{background:none;border:1px solid var(--line);color:var(--mut);border-radius:7px;padding:3px 9px;cursor:pointer;font-size:13px;margin-top:12px;width:100%}
.theme-btn:hover{border-color:var(--acc);color:var(--ink)}
/* View/Edit mode toggle — flips the server's live write-gate via /do/mode */
.mode-toggle{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;margin:10px 0 4px}
.mode-toggle button{flex:1;border:none;background:var(--panel2);color:var(--mut);font-size:12px;
padding:6px 0;cursor:pointer;font-weight:600}
.mode-toggle button.on{background:var(--write);color:#1a1200}
.mode-toggle button:disabled{cursor:wait;opacity:.6}
.mode-hint{color:var(--mut);font-size:11px;margin:4px 0 8px}
"""

def page_shell(title, body, pages, edit_mode=False):
    themes = load_themes()
    if themes:
        tlinks = "".join(
            f'<li><a href="/page/{html.escape(t["hub_slug"])}">{html.escape(t["name"])}</a>'
            + ('' if t["exists"] else ' <span class="kind" title="Long-Term folder not found">⚠</span>')
            + '</li>'
            for t in themes
            if t["name"] and t["hub_slug"]
        )
        theme_nav = f'<h4>Themes</h4><ul>{tlinks or "<li class=\"empty\">no themes yet</li>"}</ul>'
    else:
        theme_nav = '<h4>Themes</h4><ul><li class="empty">no themes configured</li></ul>'
    return f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)} · LukeatronWiki</title><style>{CSS}</style>
<script>
(function(){{
  var t=localStorage.getItem('lwTheme');
  if(t==='light')document.documentElement.classList.add('light');
}})();
function toggleTheme(){{
  var on=document.documentElement.classList.toggle('light');
  localStorage.setItem('lwTheme',on?'light':'dark');
  document.getElementById('themeBtn').textContent=on?'🌙 Dark':'☀ Light';
}}
function filterPages(){{
  var q=(document.getElementById('pageFilter')||{{}}).value;
  if(q===undefined)return;
  q=q.toLowerCase();
  document.querySelectorAll('.idx-type-card li,.idx-az-row li').forEach(function(li){{
    li.style.display = li.textContent.toLowerCase().indexOf(q)>-1 ? '' : 'none';
  }});
}}
function setMode(edit){{
  var vb=document.getElementById('modeView'), eb=document.getElementById('modeEdit');
  vb.disabled=true; eb.disabled=true;
  fetch('/do/mode',{{method:'POST',headers:{{'Content-Type':'application/x-www-form-urlencoded'}},
    body:'state='+(edit?'on':'off')}})
    .then(function(r){{ if(!r.ok) throw new Error('toggle failed'); return r.json(); }})
    .then(function(){{ try{{localStorage.setItem('wikiEditing',edit?'on':'off');}}catch(e){{}} location.reload(); }})
    .catch(function(){{ vb.disabled=false; eb.disabled=false; alert('Could not switch modes — try again.'); }});
}}
</script>
</head><body>
<div class="wrap">
<aside class="side">
  <p class="brand"><a href="/">LukeatronWiki</a></p>
  <p class="tag">read · watch · write</p>
  {theme_nav}
  <h4>Control</h4><ul><li><a href="/page/{LANDING}">Main Page</a></li><li><a href="/">Backlog board</a></li><li><a href="/pages">All Pages</a></li></ul>
  <h4>Other tools</h4><ul><li><a href="http://localhost:8789" target="_blank" rel="noreferrer">📊 Project Dashboard →</a></li></ul>
  <div class="mode-toggle">
    <button id="modeView" class="{'' if edit_mode else 'on'}" onclick="setMode(false)">View</button>
    <button id="modeEdit" class="{'on' if edit_mode else ''}" onclick="setMode(true)">Edit</button>
  </div>
  <p class="mode-hint">Edit is live for this browser on this Mac until switched back to View.</p>
  <button id="themeBtn" class="theme-btn" onclick="toggleTheme()">☀ Light</button>
</aside>
<main class="main">{body}</main>
</div>
<script>
(function(){{
  var t=localStorage.getItem('lwTheme');
  var btn=document.getElementById('themeBtn');
  if(btn)btn.textContent=(t==='light')?'🌙 Dark':'☀ Light';
}})();
</script>
</body></html>"""

def render_all_pages(pages):
    content = [p for p in pages.values() if not p["is_landing"]]
    if not content:
        return '<h1>All Pages</h1><p class="idx-empty">No pages yet — add some wiki pages and they will appear here.</p>'

    # ---- By Type ----
    by_type = {}
    for p in content:
        key = str(p["type"]).strip().lower() or "untyped"
        by_type.setdefault(key, []).append(p)

    type_cards = ""
    for t in sorted(by_type):
        items = sorted(by_type[t], key=lambda x: str(x["title"]).lower())
        lis = "".join(f'<li><a href="/page/{p["slug"]}">{html.escape(str(p["title"]))}</a></li>' for p in items)
        type_cards += (f'<div class="idx-type-card">'
                       f'<div class="label">{html.escape(t)}</div>'
                       f'<div class="count">{len(items)} page{"s" if len(items) != 1 else ""}</div>'
                       f'<ul>{lis}</ul></div>')
    type_section = (f'<div class="idx-section"><h2>By Type</h2>'
                    f'<div class="idx-type-grid">{type_cards}</div></div>')

    # ---- By Tag ----
    by_tag = {}
    for p in content:
        for tag in (p["tags"] or []):
            by_tag.setdefault(str(tag).lower().strip(), []).append(p)

    if by_tag:
        tag_items = ""
        for tag in sorted(by_tag):
            pages_for_tag = sorted(by_tag[tag], key=lambda x: str(x["title"]).lower())
            lis = "".join(f'<li><a href="/page/{p["slug"]}">{html.escape(str(p["title"]))}</a></li>' for p in pages_for_tag)
            tag_items += (f'<h3>#{html.escape(tag)} <span class="kind">({len(pages_for_tag)})</span></h3>'
                          f'<ul style="list-style:none;margin:0 0 4px;padding:0;display:flex;flex-wrap:wrap;gap:3px 14px">{lis}</ul>')
        tag_section = f'<div class="idx-section"><h2>By Tag</h2>{tag_items}</div>'
    else:
        tag_section = '<div class="idx-section"><h2>By Tag</h2><p class="idx-empty">No tags on any page yet.</p></div>'

    # ---- A–Z ----
    az = {}
    for p in content:
        letter = str(p["title"])[0].upper() if p["title"] else "?"
        if not letter.isalpha():
            letter = "#"
        az.setdefault(letter, []).append(p)

    jump = "".join(f'<a href="#az-{l}">{l}</a>' for l in sorted(az))
    rows = ""
    for letter in sorted(az):
        items = sorted(az[letter], key=lambda x: str(x["title"]).lower())
        lis = "".join(f'<li><a href="/page/{p["slug"]}">{html.escape(str(p["title"]))}</a></li>' for p in items)
        rows += f'<div class="idx-az-row" id="az-{letter}"><span class="az-letter">{letter}</span><ul>{lis}</ul></div>'
    az_section = (f'<div class="idx-section"><h2>A–Z</h2>'
                  f'<div class="idx-jump">{jump}</div>{rows}</div>')

    total = len(content)
    ig = compute_integrity(pages)
    integrity = (f'<p class="crumb idx-integrity">🩺 {ig["files"]} files · {ig["indexed"]} indexed'
                 f'{" · " + str(ig["unindexed"]) + " unindexed" if ig["unindexed"] else ""}'
                 f'{" · " + str(ig["dead_links"]) + " dead link" + ("s" if ig["dead_links"] != 1 else "") if ig["dead_links"] else ""}'
                 f'{" · " + str(ig["one_way"]) + " one-way edge" + ("s" if ig["one_way"] != 1 else "") if ig["one_way"] else ""}</p>')
    return (f'<h1>All Pages</h1>'
            f'<p class="crumb">{total} page{"s" if total != 1 else ""} across {len(by_type)} type{"s" if len(by_type) != 1 else ""} · {len(by_tag)} tag{"s" if len(by_tag) != 1 else ""}</p>'
            + integrity
            + '<div class="idx-filter"><input type="text" id="pageFilter" placeholder="Filter pages by title…" oninput="filterPages()"></div>'
            + type_section + tag_section + az_section)

FINISHED_STATUSES = {"done", "dropped", "promoted"}

def render_board(queue, pages, edit_mode=False, q_mtime=0):
    lanes = {"read": [], "watch": [], "write": []}
    finished, unclassified = [], []
    for it in queue:
        intent = str(it.get("intent", "")).lower()
        status = str(it.get("status", "queued")).lower()
        if intent not in lanes:
            unclassified.append(it)
        elif status in FINISHED_STATUSES:
            finished.append(it)
        else:
            lanes[intent].append(it)

    def card(it):
        st = str(it.get("status", "queued")).lower()
        page = it.get("page")
        title = html.escape(str(it.get("title", "untitled")))
        if page:
            title = f'<a href="/page/{page}">{title}</a>'
        src = it.get("source")
        srclink = f' · <a href="{html.escape(str(src))}" target="_blank" rel="noreferrer">source</a>' if src and str(src).startswith("http") else ""
        absorb = ' <span class="pill s-queued">🌱 needs absorb</span>' if it.get("needs_absorb") else ""
        qedit = ""
        if edit_mode and st not in FINISHED_STATUSES:
            iid = html.escape(str(it.get("id", "")), quote=True)
            qedit = (
                f'<form method="POST" action="/do/qstatus" class="qedit">'
                f'<input type="hidden" name="id" value="{iid}">'
                f'<input type="hidden" name="mtime" value="{q_mtime}">'
                f'<input type="hidden" name="status" value="done">'
                f'<button type="submit" class="ebtn">✓ Done</button>'
                f'</form>'
                f'<form method="POST" action="/do/qstatus" class="qedit">'
                f'<input type="hidden" name="id" value="{iid}">'
                f'<input type="hidden" name="mtime" value="{q_mtime}">'
                f'<input type="hidden" name="status" value="dropped">'
                f'<button type="submit" class="ebtn">✕ Drop</button>'
                f'</form>'
            )
        return (f'<div class="card"><div class="t">{title}</div>'
                f'<div class="m"><span class="kind">{html.escape(str(it.get("kind","")))}</span>'
                f'<span class="pill s-{st}">{st}</span>{absorb}{srclink}</div>{qedit}</div>')

    def col(name):
        items = lanes[name]
        inner = "".join(card(i) for i in items) if items else '<div class="empty">nothing queued</div>'
        return f'<div class="col {name}"><h3><span class="dot"></span>{name.capitalize()} <span class="kind">({len(items)})</span></h3>{inner}</div>'

    total = sum(len(v) for v in lanes.values())
    head = f'<div class="crumb">The backlog — {total} item(s) across read / watch / write</div><h1>Backlog</h1>'
    board = f'<div class="board">{col("read")}{col("watch")}{col("write")}</div>'

    warn = ""
    if unclassified:
        items = "".join(f'<li>{html.escape(str(it.get("title","untitled")))} '
                         f'<span class="kind">(intent: "{html.escape(str(it.get("intent","")))}")</span></li>'
                         for it in unclassified)
        warn = (f'<div class="qwarn">⚠ {len(unclassified)} item{"s" if len(unclassified)!=1 else ""} '
                f'with an unrecognised intent (not read/watch/write) — not shown on the board:'
                f'<ul style="margin:6px 0 0;padding-left:18px">{items}</ul></div>')

    finished_html = ""
    if finished:
        items = "".join(card(i) for i in finished)
        finished_html = (f'<details class="qfinished"><summary>{len(finished)} recently finished '
                          f'(done / dropped / promoted)</summary><div class="board" style="margin-top:8px">'
                          f'{items}</div></details>')

    capture_html = ""
    if edit_mode:
        capture_html = f"""<form method="POST" action="/do/capture" class="capture">
<input type="hidden" name="mtime" value="{q_mtime}">
<input type="text" name="title" placeholder="Title…" required>
<select name="kind"><option>article</option><option>book</option><option>link</option><option>video</option></select>
<select name="intent"><option>read</option><option>watch</option><option>write</option></select>
<input type="text" name="source" placeholder="Source (URL or citation)…">
<button type="submit" class="ebtn">🌱 Quick-capture</button>
</form>"""

    return head + capture_html + warn + board + finished_html

def topicbox_infobox(p):
    """Build the top-right rail: a two-chip topic box (KIND from `type` + SUBJECT
    from `topic`/`emoji`) stacked above the thumbnail (if any). Renders even when
    there is no thumbnail, so the topic chips always show."""
    chips = []
    kind = str(p.get("type") or "").strip().lower()
    if kind:
        emo = TYPE_EMOJI.get(kind, "•")
        chips.append(f'<span class="chip chip-kind">{emo} {html.escape(kind.replace("-", " "))}</span>')
    subj = str(p.get("topic") or "").strip()
    semo = str(p.get("emoji") or "").strip()
    if subj:
        lead = (html.escape(semo) + " ") if semo else ""
        chips.append(f'<span class="chip chip-subj">{lead}{html.escape(subj)}</span>')
    elif (p.get("tags") or []):
        # no explicit subject → soft-fall back to the first tag
        chips.append(f'<span class="chip chip-subj">{html.escape(semo or "💡")} {html.escape(str((p["tags"] or [])[0]))}</span>')
    topicbox = f'<div class="topicbox">{"".join(chips)}</div>' if chips else ""
    # thumbnail
    imghtml = ""
    thumb = str(p.get("thumbnail") or "").strip()
    if thumb:
        src = thumb if thumb.startswith("http") else "/img?p=" + urllib.parse.quote(thumb)
        cap = str(p.get("thumbnail_caption") or "").strip()
        caphtml = f'<div class="ib-cap">{md_inline(cap)}</div>' if cap else ""
        imghtml = f'<img src="{html.escape(src)}" alt="{html.escape(str(p["title"]))}">{caphtml}'
    if not (topicbox or imghtml):
        return ""
    return f'<aside class="infobox">{topicbox}{imghtml}</aside>'

def render_main_page(pages, queue):
    """Wikipedia-style auto Main Page: a short intro (from lukeatronwiki.md), a
    'Recently updated' feed (by frontmatter `updated`), a 'From the archive' pick
    (oldest-touched), and a link rail. Built live from the index every request.
    Meta/landing pages are excluded from the article feeds."""
    landing = pages.get(LANDING)
    intro_html = ""
    if landing:
        h1_md, lead_md, rest_md = split_lead(landing["body"])
        intro_html = md_to_html(lead_md + ("\n" + rest_md if rest_md.strip() else ""))

    articles = [p for p in pages.values() if not p.get("is_meta")]

    def card(p, sub):
        ib = topicbox_infobox  # not used here; keep cards light
        emo = TYPE_EMOJI.get(str(p.get("type") or "").lower(), "•")
        subj = str(p.get("topic") or "").strip()
        tagline = html.escape(subj) if subj else (html.escape(str((p.get("tags") or ["—"])[0])))
        return (f'<a class="mp-card" href="/page/{p["slug"]}">'
                f'<span class="mp-emo">{emo}</span>'
                f'<span class="mp-body"><span class="mp-t">{html.escape(str(p["title"]))}</span>'
                f'<span class="mp-sub">{tagline} · {sub}</span></span></a>')

    # Recently updated — newest `updated` first (fallback to created), top 5
    by_recent = sorted(articles, key=lambda x: (x.get("updated") or x.get("created") or "", x["slug"]), reverse=True)
    recent = by_recent[:5]
    recent_html = ("".join(card(p, f'updated {p.get("updated") or "—"}') for p in recent)
                   or '<p class="idx-empty">No articles yet.</p>')

    # From the archive — oldest-touched, excluding the recents, up to 3
    recent_slugs = {p["slug"] for p in recent}
    archive = [p for p in reversed(by_recent) if p["slug"] not in recent_slugs][:3]
    archive_html = ("".join(card(p, f'created {p.get("created") or "—"}') for p in archive)
                    or '<p class="idx-empty">The whole wiki is on the recent feed.</p>')

    # Hubs — most-connected pages (by related + backlinks), top 4
    def conn(p):
        return len(p.get("related") or []) + len(backlinks_for(p["slug"], pages))
    hubs = sorted([p for p in articles if conn(p) > 0], key=lambda x: (-conn(x), str(x["title"]).lower()))[:4]
    hubs_html = ("".join(f'<li><a href="/page/{p["slug"]}">{html.escape(str(p["title"]))}</a> '
                         f'<span class="kind">· {conn(p)} link{"s" if conn(p) != 1 else ""}</span></li>' for p in hubs)
                 or '<li class="empty">no connections yet</li>')

    qcount = len(queue)
    links_html = (f'<ul class="mp-links">'
                  f'<li>🗂️ <a href="/page/meta-about">About LukeatronWiki</a> — what this wiki is &amp; how it works</li>'
                  f'<li>🧭 <a href="/pages">All Pages</a> — every page by type, tag, A–Z</li>'
                  f'<li>📋 <a href="/">Backlog board</a> — the read / watch / write queue ({qcount} item{"s" if qcount != 1 else ""})</li>'
                  f'</ul>')

    total = len(articles)
    head = (f'<h1>LukeatronWiki</h1>'
            f'<p class="crumb">{total} article{"s" if total != 1 else ""} · a thinking space and intake funnel</p>')
    intro = f'<div class="lead">{intro_html}</div>' if intro_html.strip() else ""
    grid = (f'<div class="mp-grid">'
            f'<section class="mp-col"><h2>Recently updated</h2>{recent_html}</section>'
            f'<section class="mp-col"><h2>From the archive</h2>{archive_html}</section>'
            f'</div>')
    rail = (f'<div class="mp-rail">'
            f'<section class="mp-col"><h2>Hubs</h2><ul class="mp-hublist">{hubs_html}</ul></section>'
            f'<section class="mp-col"><h2>Explore</h2>{links_html}</section>'
            f'</div>')
    return f'<div class="content">{head}{intro}{grid}{rail}</div>'

def topic_members(p, pages):
    """For a `format: topic` hub page, gather the wiki pages that belong to this
    topic — matched by shared `topic` (subject) OR any shared tag — excluding the
    hub itself and meta/support pages. The membership is built LIVE from the index,
    so a topic hub never goes stale. (AI organises the chips + See Also; the member
    roll is mechanical.)"""
    own = str(p.get("topic") or "").strip().lower()
    own_tags = {str(t).lower().strip() for t in (p.get("tags") or [])}
    out = []
    for q in pages.values():
        if q["slug"] == p["slug"] or q.get("is_meta"):
            continue
        q_topic = str(q.get("topic") or "").strip().lower()
        q_tags = {str(t).lower().strip() for t in (q.get("tags") or [])}
        if (own and q_topic == own) or (own_tags & q_tags):
            out.append(q)
    return sorted(out, key=lambda x: str(x["title"]).lower())

def topic_members_html(p, pages):
    members = topic_members(p, pages)
    if not members:
        return ('<div class="topic-members"><h2>In this topic</h2>'
                '<p class="idx-empty">No pages share this topic yet.</p></div>')
    cards = ""
    for q in members:
        emo = TYPE_EMOJI.get(str(q.get("type") or "").lower(), "•")
        subj = str(q.get("topic") or "").strip() or (str((q.get("tags") or ["—"])[0]))
        cards += (f'<a class="mp-card" href="/page/{q["slug"]}">'
                  f'<span class="mp-emo">{emo}</span>'
                  f'<span class="mp-body"><span class="mp-t">{html.escape(str(q["title"]))}</span>'
                  f'<span class="mp-sub">{html.escape(subj)} · {html.escape(str(q.get("type") or ""))}</span></span></a>')
    return (f'<div class="topic-members"><h2>In this topic '
            f'<span class="kind">({len(members)})</span></h2>'
            f'<div class="mp-grid" style="grid-template-columns:1fr 1fr">{cards}</div></div>')

def longterm_refs_html(p, heading=True, extra_cls=""):
    """Render the read-only Long-Term store references from `longterm_refs`.
    Each ref points INTO a Memory/Long-Term/ store — a reference, never a copy
    (the wiki must not duplicate Long-Term content). Items may be a bare path
    ('Theology/theology.md') or 'Label :: path'. Served read-only via /lt.

    `heading=False` drops the 'Related in Long-Term' label (used on topic pages,
    where the list sits inline beneath the Summary); `extra_cls` adds styling
    hooks for that inline placement."""
    refs = p.get("longterm_refs") or []
    if not refs:
        return ""
    items = ""
    for r in refs:
        raw = str(r).strip()
        if "::" in raw:
            label, path = (x.strip() for x in raw.split("::", 1))
        else:
            label, path = raw.rsplit("/", 1)[-1], raw
        path = path if path.startswith("Memory/") else f"Memory/Long-Term/{path}"
        href = "/lt?p=" + urllib.parse.quote(path)
        items += (f'<li><a href="{href}">{html.escape(label)}</a> '
                  f'<span class="kind">· {html.escape(path)}</span></li>')
    head = '<h4>Related in Long-Term</h4>' if heading else ''
    cls = "lt-refs" + (f" {extra_cls}" if extra_cls else "")
    return (f'<div class="{cls}">{head}'
            f'<ul>{items}</ul></div>')

def render_page(slug, pages):
    p = pages.get(slug)
    if not p:
        return None
    fmt = p.get("format") or "article"
    meta = ""
    if not p["is_landing"]:
        bits = []
        if fmt and fmt != "article":
            bits.append(f'<span class="pill pill-fmt">{html.escape(fmt)}</span>')
        if p["status"]:
            bits.append(f'<span class="pill s-active">{html.escape(str(p["status"]))}</span>')
        for t in (p["tags"] or []):
            bits.append(f'<span class="pill">#{html.escape(str(t))}</span>')
        meta = f'<div class="meta">{"".join(bits)}</div>' if bits else ""
    # ── topic box + thumbnail — a single right-floated rail, Wikipedia-infobox style ──
    infobox = topicbox_infobox(p)
    # split body into title / lead summary / sections
    h1_md, lead_md, rest_md = split_lead(p["body"])
    h1_html = md_to_html(h1_md) if h1_md.strip() else ""
    lead_html = f'<div class="lead">{md_to_html(lead_md)}</div>' if lead_md.strip() else ""
    rest_html = md_to_html(rest_md)
    body = infobox + h1_html + lead_html
    # #3 — read-only references into Long-Term stores (never copied content).
    # topic pages: the refs sit inline between the Summary and the first section
    # (See Also …), unlabelled; every other format keeps the bottom rail.
    if fmt == "topic":
        body += longterm_refs_html(p, heading=False, extra_cls="lt-refs-inline")
    body += rest_html
    # format: topic → append the live member roll of every page sharing this topic
    if fmt == "topic":
        body += topic_members_html(p, pages)
    if fmt != "topic":
        body += longterm_refs_html(p)
    bl = backlinks_for(slug, pages)
    blhtml = ""
    if bl:
        items = "".join(f'<li><a href="/page/{b["slug"]}">{html.escape(str(b["title"]))}</a></li>' for b in bl)
        blhtml = f'<div class="backlinks"><h4>What links here</h4><ul>{items}</ul></div>'
    # file-path footer — always shown on article pages
    rel_path = p.get("rel_path") or f"Memory/Long-Term/LukeatronWiki/{slug}.md"
    path_footer = f'<div class="page-path">📄 {html.escape(rel_path)}</div>'
    crumb = '<div class="crumb"><a href="/">← Backlog</a></div>'
    content_cls = "content content-list" if fmt == "list" else "content"
    return crumb + meta + f'<div class="{content_cls}">{body}</div>' + blhtml + path_footer

# ============================================================================
# Server
# ============================================================================
class Handler(http.server.BaseHTTPRequestHandler):
    edit_mode = False

    def _send(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def _send_file(self, file_path, ctype):
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _resolve_safe(self, href):
        """Resolve a query path relative to the wiki dir (or absolute), fenced
        to the _Lukeatron root. Returns the Path, or None if it escapes ROOT."""
        target = (WIKI_DIR / href).resolve() if not href.startswith("/") else Path(href).resolve()
        try:
            target.relative_to(ROOT)
        except ValueError:
            return None
        return target

    def _query_path(self):
        qs = urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
        vals = qs.get("p", [])
        return urllib.parse.unquote(vals[0]) if vals else None

    def _read_form(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(length).decode("utf-8", errors="replace") if length else ""
        qs = urllib.parse.parse_qs(raw)
        return {k: v[0] for k, v in qs.items()}

    def _redirect(self, location="/"):
        self.send_response(303)
        self.send_header("Location", location)
        self.end_headers()

    def _send_json(self, code, obj):
        import json
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        path = self.path.split("?")[0]
        if path == "/do/mode":
            # THE runtime write-gate. Deliberately no auth beyond POST-only —
            # Luke's explicit choice (single user, secured laptop) over the
            # earlier launch-time-only flag. Flips Handler.edit_mode live, for
            # every request on this process, no restart.
            form = self._read_form()
            Handler.edit_mode = form.get("state", "") == "on"
            log_edit("mode", "-", "on" if Handler.edit_mode else "off")
            return self._send_json(200, {"edit_mode": Handler.edit_mode})
        if path not in ("/do/capture", "/do/qstatus"):
            return self._send(404, "<h1>404</h1>")
        if not self.edit_mode:
            return self._send(403, page_shell("Forbidden", "<h1>Edit mode is off</h1><p>Flip the View/Edit toggle in the sidebar to enable writes.</p>", {}))
        qpath = WIKI_DIR / "_queue.yaml"
        if not qpath.exists():
            return self._send(404, page_shell("Not found", "<h1>_queue.yaml not found</h1>", {}))
        form = self._read_form()
        try:
            form_mtime = float(form.get("mtime", "0") or "0")
        except ValueError:
            form_mtime = 0.0
        if abs(qpath.stat().st_mtime - form_mtime) > 0.01:
            return self._send(409, page_shell("Conflict", "<h1>409 — the queue changed underneath you</h1><p>Reload the board and try again; nothing was overwritten.</p>", {}))

        if path == "/do/capture":
            title = form.get("title", "").strip()
            kind = form.get("kind", "article").strip().lower()
            intent = form.get("intent", "read").strip().lower()
            source = form.get("source", "").strip()
            if not title or intent not in ("read", "watch", "write"):
                return self._send(400, page_shell("Bad request", "<h1>Missing title or invalid intent</h1>", {}))
            new_id = append_queue_item(qpath, title, kind, intent, source)
            log_edit("capture", new_id, f'"{title}" ({intent}, needs_absorb)')
            return self._redirect("/")

        if path == "/do/qstatus":
            item_id = form.get("id", "").strip()
            new_status = form.get("status", "").strip().lower()
            if new_status not in ("done", "dropped"):
                return self._send(400, page_shell("Bad request", "<h1>Status must be done or dropped</h1>", {}))
            ok = set_queue_status(qpath, item_id, new_status)
            if not ok:
                return self._send(400, page_shell("Edit failed", f"<h1>Item {html.escape(item_id)} not found</h1>", {}))
            log_edit("qstatus", item_id, f"→ {new_status}")
            return self._redirect("/")

    def do_GET(self):
        global KNOWN_SLUGS
        path = self.path.split("?")[0]
        if path.startswith("/do/"):
            return self._send(405, "<h1>405 — use POST</h1>")
        if path in ("/pages", "/topics"):
            pages = load_pages()
            KNOWN_SLUGS = set(pages.keys())
            body = render_all_pages(pages)
            return self._send(200, page_shell("All Pages", body, pages, self.edit_mode))
        if path == "/pdf":
            href = self._query_path()
            if not href:
                return self._send(400, page_shell("Bad request", "<h1>Missing path</h1>", {}))
            pdf_path = self._resolve_safe(href)
            if pdf_path is None:
                return self._send(403, page_shell("Forbidden", "<h1>Access denied</h1>", {}))
            if not pdf_path.exists() or pdf_path.suffix.lower() != ".pdf":
                return self._send(404, page_shell("Not found", f"<h1>PDF not found: {html.escape(href)}</h1>", {}))
            return self._send_file(pdf_path, "application/pdf")
        if path == "/img":
            href = self._query_path()
            if not href:
                return self._send(400, page_shell("Bad request", "<h1>Missing path</h1>", {}))
            img_path = self._resolve_safe(href)
            if img_path is None:
                return self._send(403, page_shell("Forbidden", "<h1>Access denied</h1>", {}))
            ctype = IMG_TYPES.get(img_path.suffix.lower())
            if not img_path.exists() or ctype is None:
                return self._send(404, page_shell("Not found", f"<h1>Image not found: {html.escape(href)}</h1>", {}))
            return self._send_file(img_path, ctype)
        pages = load_pages()
        KNOWN_SLUGS = set(pages.keys())
        if path == "/lt":
            # read-only view of a Memory/Long-Term/ file referenced by a page's longterm_refs
            href = self._query_path()
            if not href:
                return self._send(400, page_shell("Bad request", "<h1>Missing path</h1>", pages))
            target = (ROOT / href).resolve()
            try:
                target.relative_to(ROOT / "Memory" / "Long-Term")   # fence to Long-Term only
            except ValueError:
                return self._send(403, page_shell("Forbidden", "<h1>Access denied</h1><p>References resolve inside Memory/Long-Term/ only.</p>", pages))
            LT_TEXT = {".md", ".markdown", ".yaml", ".yml", ".txt"}
            if not target.exists() or target.suffix.lower() not in LT_TEXT:
                return self._send(404, page_shell("Not found", f"<h1>Not found: {html.escape(href)}</h1><p>Long-Term references resolve to a .md / .yaml / .txt file.</p>", pages))
            raw = target.read_text(encoding="utf-8")
            rel = str(target.relative_to(ROOT))
            if target.suffix.lower() in (".md", ".markdown"):
                _fm, lbody = split_frontmatter(raw)
                rendered = f'<div class="content">{md_to_html(lbody)}</div>'
            else:
                rendered = f'<div class="content"><pre style="white-space:pre-wrap;overflow:auto">{html.escape(raw)}</pre></div>'
            inner = ('<div class="crumb">📦 Long-Term store · read-only reference</div>'
                     f'{rendered}'
                     f'<div class="page-path">📄 {html.escape(rel)}</div>')
            return self._send(200, page_shell(target.stem, inner, pages))
        if path == "/" or path == "":
            qf = WIKI_DIR / "_queue.yaml"
            q_mtime = qf.stat().st_mtime if qf.exists() else 0
            body = render_board(load_queue(), pages, self.edit_mode, q_mtime)
            return self._send(200, page_shell("Backlog", body, pages, self.edit_mode))
        m = re.match(r"^/page/(.+)$", path)
        if m:
            slug = m.group(1).rstrip("/")
            if slug == LANDING:
                body = render_main_page(pages, load_queue())
                return self._send(200, page_shell("Main Page", body, pages, self.edit_mode))
            rendered = render_page(slug, pages)
            if rendered is None:
                return self._send(404, page_shell("Not found", f'<h1>Not found</h1><p>No page <code>{html.escape(slug)}</code>.</p>', pages))
            title = pages[slug]["title"]
            return self._send(200, page_shell(str(title), rendered, pages, self.edit_mode))
        self._send(404, page_shell("Not found", "<h1>404</h1>", pages))

    def log_message(self, *a):
        pass

def main():
    global PORT
    Handler.edit_mode = bool(os.environ.get("LUKEATRONWIKI_EDIT"))
    if not WIKI_DIR.exists():
        print(f"⚠  Wiki folder not found: {WIKI_DIR}")
        print("   Set LUKEATRONWIKI_DIR if it lives elsewhere.")
    for attempt in range(10):
        try:
            httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
            break
        except OSError:
            PORT += 1
    else:
        print("Could not bind a port."); sys.exit(1)
    url = f"http://localhost:{PORT}"
    print(f"LukeatronWiki viewer → {url}")
    print(f"Serving: {WIKI_DIR}")
    print("Ctrl-C to stop.")
    if not os.environ.get("LUKEATRONWIKI_NO_BROWSER"):   # headless when set (e.g. SessionStart auto-launch)
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")

if __name__ == "__main__":
    main()

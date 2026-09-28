#!/usr/bin/env python3
"""validate.py — !GrammarFrame's mechanical checks. Standard library only.

Reads the two rendered guides through the hooks in reference/markup.md and rules on the criteria
listed there under "Script coverage". Judgement criteria are not touched.

  validate.py hashes                 per-heading source hashes of Original_Content.md (STEP 1, A13)
  validate.py rows                   data-row counts of the three tables (B3, B9)
  validate.py check [options]        STEP 8's mechanical ruling

check options:
  --prior DIR          the prior run's guides, for A13 carry-forward and A2 slug stability
  --redo SLUG,...      units marked REDO this run (exempt from the A13 unchanged-diff)
  --paste FILE         Luke's raw paste, for C28
  --rows-before rej=N,rev=M  --expect rej=X,rev=Y   B3 / B9 row counts
  --dir DIR            the Grammar store (default: Memory/Long-Term/Grammar)
  --json               machine-readable output

Exit: 0 all pass · 1 a GROUP A or B failure (STOP the run) · 2 GROUP C, D or E failures only.
"""
import argparse
import hashlib
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
GRAMMAR = ROOT / "Memory" / "Long-Term" / "Grammar"
TECH, THEATRE = "Technical_Outline.html", "Theatre.html"
VCAA = "https://f10.vcaa.vic.edu.au/learning-areas/english/english/glossary"

# C25 / C26 word lists — mirror reference/criteria.md; change them there first.
C25_BANNED = ["heading", "sub-heading", "skeleton", "chunk", "granular", "frame", "lane",
              "proposal set", "weight", "criterion", "criteria", "mapping table", "tier",
              "spanning", "niche", "unit", "branch", "home", "re-score"]
C26_BANNED = ["metaphysical", "ontological", "essence", "accident", "principle"]
SPECIMEN = {"gf-example", "gf-quote", "gf-q-applied"}
# D12 fixes the reach label's wording ("Governs N sections across H headings"), which C25's list
# would otherwise catch. The more specific criterion wins; the label is exempt from C25 only.
C25_EXEMPT = {"gf-reach-label"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source",
        "track", "wbr"}


# ─── a small DOM ────────────────────────────────────────────────────────────────────────────

class Node:
    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    @property
    def classes(self):
        return set((self.attrs.get("class") or "").split())

    def has(self, cls):
        return cls in self.classes

    def get(self, name, default=None):
        v = self.attrs.get(name)
        return default if v is None else v

    def walk(self):
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.walk()

    def find(self, cls):
        return [n for n in self.walk() if n.has(cls)]

    def ancestor(self, pred):
        p = self.parent
        while p is not None:
            if pred(p):
                return p
            p = p.parent
        return None

    def text(self, skip=lambda n: False):
        out = []
        for c in self.children:
            if isinstance(c, str):
                out.append(c)
            elif c.tag not in ("style", "script", "head") and not skip(c):
                out.append(c.text(skip))
        return re.sub(r"\s+", " ", " ".join(out)).strip()

    def canon(self, drop=lambda n: False, unwrap=lambda n: False, drop_attrs=()):
        """Canonical serialisation, for the A13 unchanged-block diff."""
        parts = []
        for c in self.children:
            if isinstance(c, str):
                t = re.sub(r"\s+", " ", c).strip()
                if t:
                    parts.append(t)
            elif drop(c):
                continue
            elif unwrap(c):
                parts.append(c.text())
            else:
                attrs = {k: v for k, v in c.attrs.items() if k not in drop_attrs}
                if "class" in attrs:
                    attrs["class"] = " ".join(sorted(x for x in (attrs["class"] or "").split()
                                                     if not re.match(r"gf-(breadth|reach)-", x)))
                a = " ".join(f'{k}="{attrs[k]}"' for k in sorted(attrs))
                parts.append(f"<{c.tag} {a}>{c.canon(drop, unwrap, drop_attrs)}</{c.tag}>")
        return " ".join(parts)


class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", {}, None)
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        p = self.cur
        while p is not None and p.tag != tag:
            p = p.parent
        if p is not None and p.parent is not None:
            self.cur = p.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def parse(path):
    p = Parser()
    p.feed(Path(path).read_text(encoding="utf-8"))
    return p.root


# ─── source hashes (A13) ────────────────────────────────────────────────────────────────────

HEAD_RE = re.compile(r"^(#{1,6})\s+(.*\S)\s*$")


def source_blocks(md_text):
    """Each Markdown heading starts a block that runs to the next heading of any level.
    Block = heading line + body, trailing whitespace stripped per line, blank lines at either end
    dropped, joined with \\n; hash = first 12 hex of SHA-256 over its UTF-8."""
    lines, blocks, cur = md_text.splitlines(), [], None
    in_fence = False
    for ln in lines:
        if ln.lstrip().startswith("```"):
            in_fence = not in_fence
        m = None if in_fence else HEAD_RE.match(ln)
        if m:
            if cur:
                blocks.append(cur)
            cur = {"level": len(m.group(1)), "title": m.group(2), "lines": [ln]}
        elif cur:
            cur["lines"].append(ln)
    if cur:
        blocks.append(cur)
    out = []
    for b in blocks:
        body = [l.rstrip() for l in b["lines"]]
        while body and not body[-1]:
            body.pop()
        text = "\n".join(body)
        out.append({"level": b["level"], "title": b["title"],
                    "hash": hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]})
    return out


# ─── Markdown tables (B3, B9) ───────────────────────────────────────────────────────────────

def table_rows(path):
    """Data rows of the first pipe table in the file; (count, rows with a wrong column count)."""
    if not Path(path).exists():
        return 0, []
    rows, width, bad = [], None, []
    for ln in Path(path).read_text(encoding="utf-8").splitlines():
        s = ln.strip()
        if not s.startswith("|"):
            if width is not None and rows is not None and s:
                break
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if width is None:
            width = len(cells)
            continue
        if all(re.fullmatch(r":?-+:?", c) for c in cells):
            continue
        rows.append(cells)
        if len(cells) != width:
            bad.append(s)
    return len(rows), bad


# ─── findings ───────────────────────────────────────────────────────────────────────────────

class Report:
    def __init__(self):
        self.results = {}   # criterion -> list of messages ("" list = pass); None = skipped

    def ran(self, crit):
        self.results.setdefault(crit, [])

    def fail(self, crit, msg):
        self.results.setdefault(crit, []).append(msg)

    def skip(self, crit, why):
        if crit not in self.results:
            self.results[crit] = None
            self.results.setdefault("_skipped", {})[crit] = why

    def exit_code(self):
        failed = {c for c, m in self.results.items() if c != "_skipped" and m}
        if any(c[0] in "AB" for c in failed):
            return 1
        return 2 if failed else 0


def order_key(c):
    m = re.match(r"([A-Z])(\d+)", c)
    return (m.group(1), int(m.group(2))) if m else ("Z", 0)


# ─── guide model ────────────────────────────────────────────────────────────────────────────

class Guide:
    def __init__(self, path):
        self.path, self.name = Path(path), Path(path).name
        self.root = parse(path)
        self.all = list(self.root.walk())
        self.ids = {n.get("id"): n for n in self.all if n.get("id")}
        self.headings = [n for n in self.all if n.has("gf-heading")]

    def find(self, cls):
        return [n for n in self.all if n.has(cls)]

    def owner(self, n):
        return n.ancestor(lambda p: p.has("gf-heading"))

    def own(self, container, cls, boundary=("gf-heading",)):
        """Descendants with `cls` whose nearest boundary ancestor is `container`."""
        out = []
        for n in container.find(cls):
            b = n.ancestor(lambda p: any(p.has(x) for x in boundary))
            if b is container:
                out.append(n)
        return out

    def title(self, h):
        for n in h.walk():
            if n.tag in ("h1", "h2", "h3", "h4", "h5", "h6") and self.owner(n) is h:
                return n.text(lambda c: c.classes & {"gf-glyph", "gf-chip", "gf-breadth-label"})
        return ""

    def questions(self):
        out = []
        for q in self.all:
            if not q.has("gf-q") or q.ancestor(lambda p: p.has("gf-index") or p.has("gf-note")):
                continue
            kind = ("breadth" if q.ancestor(lambda p: p.has("gf-breadth-qs")) else
                    "reach" if q.ancestor(lambda p: p.has("gf-reach-qs")) else "diagnostic")
            txt = q.find("gf-q-text")
            h = self.owner(q)
            out.append((kind, h.get("id") if h else None, txt[0].text() if txt else None))
        return out

    def rules(self):
        return [n for n in self.all if n.has("gf-rule")]

    def index_of(self, n):
        return self.all.index(n)


def reach_units(rule):
    parts = (rule.get("data-reach") or "").split()
    if not parts:
        return None, []
    try:
        return int(parts[0]), parts[1:]
    except ValueError:
        return None, parts


# ─── checks ─────────────────────────────────────────────────────────────────────────────────

def check_pair(T, H, R, epigraph):
    both = (T, H)

    # A1 — skeleton identity (text, order, nesting)
    R.ran("A1")
    sk = []
    for g in both:
        sk.append([(h.get("id"), g.title(h), (g.owner(h).get("id") if g.owner(h) else None))
                   for h in g.headings])
    if sk[0] != sk[1]:
        for a, b in zip(sk[0], sk[1]):
            if a != b:
                R.fail("A1", f"first difference: {T.name} {a} vs {H.name} {b}")
                break
        else:
            R.fail("A1", f"heading counts differ: {len(sk[0])} vs {len(sk[1])}")

    # A2 — slug identity and format
    R.ran("A2")
    for g in both:
        for h in g.headings:
            s = h.get("id") or ""
            if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", s):
                R.fail("A2", f"{g.name}: heading id not kebab-case: {s!r}")
        for sec in g.find("gf-section"):
            h = g.owner(sec)
            hid = (h.get("id") or "") if h is not None else ""
            if h is None or sec.get("id") not in (hid + "-form", hid + "-function"):
                R.fail("A2", f"{g.name}: section id {sec.get('id')!r} is not <slug>-form/-function")
        for sub in g.find("gf-subsection"):
            par = sub.ancestor(lambda p: p.classes & {"gf-section", "gf-subsection", "gf-heading"})
            if par is None or not (sub.get("id") or "").startswith(par.get("id", "") + "-"):
                R.fail("A2", f"{g.name}: sub-subsection id {sub.get('id')!r} does not extend its parent's")
    ids = [{n.get("id") for n in g.all if n.classes & {"gf-heading", "gf-section", "gf-subsection"}}
           for g in both]
    if ids[0] != ids[1]:
        R.fail("A2", f"slug sets differ: only in {T.name} {sorted(ids[0]-ids[1])}, "
                     f"only in {H.name} {sorted(ids[1]-ids[0])}")

    # A3 + D7 — tags, and chips beside every heading
    R.ran("A3"); R.ran("D7")
    tags = [{h.get("id"): h.get("data-tags", "") for h in g.headings} for g in both]
    for slug, t in tags[0].items():
        if slug in tags[1] and t != tags[1][slug]:
            R.fail("A3", f"{slug}: tags {t!r} vs {tags[1][slug]!r}")
    for g in both:
        for h in g.headings:
            want = [x for x in h.get("data-tags", "").split(";") if x]
            chips = [c.text() for c in g.own(h, "gf-chip")]
            if not want:
                R.fail("D7", f"{g.name} {h.get('id')}: no data-tags")
            elif chips != want:
                R.fail("D7", f"{g.name} {h.get('id')}: chips {chips} ≠ tags {want}")

    # A4 + D8 — question text identity, and the index
    R.ran("A4"); R.ran("D8")
    qs = [g.questions() for g in both]
    for g, ql in zip(both, qs):
        for kind, owner, txt in ql:
            if txt is None:
                R.fail("A4", f"{g.name} {owner}: a .gf-q with no .gf-q-text")
    if qs[0] != qs[1]:
        for a, b in zip(qs[0], qs[1]):
            if a != b:
                R.fail("A4", f"first difference: {a} vs {b}")
                break
        else:
            R.fail("A4", f"question counts differ: {len(qs[0])} vs {len(qs[1])}")
    # D3 (part) — breadth renders as the Contains overview only, never as questions
    R.ran("D3")
    for g in both:
        for n in g.find("gf-breadth-qs"):
            R.fail("D3", f"{g.name} {g.owner(n).get('id') if g.owner(n) else '?'}: a Breadth question block")
        for n in g.find("gf-index-q"):
            if n.get("data-kind") == "breadth":
                R.fail("D3", f"{g.name}: a Breadth entry in the index")
    # D3 (part) — a section's diagnostics come AFTER its rules (v3.9.0, Luke 2026-09-26)
    for g in both:
        for n in g.find("gf-diagnostics"):
            sibs = n.parent.children if n.parent else []
            later = sibs[sibs.index(n) + 1:] if n in sibs else []
            if any(isinstance(s, Node) and s.has("gf-rule") for s in later):
                R.fail("D3", f"{g.name} {g.owner(n).get('id') if g.owner(n) else '?'}: diagnostics precede a rule")
    group = {"diagnostic": 0, "breadth": 1, "reach": 2}
    for g, ql in zip(both, qs):
        ql = sorted(ql, key=lambda q: group.get(q[0], 3))   # the index groups by kind, run order within
        idx = g.find("gf-index")
        if len(idx) != 1:
            R.fail("D8", f"{g.name}: {len(idx)} .gf-index blocks, want 1")
            continue
        ix = idx[0]
        later = [n for n in g.all[g.index_of(ix):] if n.has("gf-heading")]
        if later:
            R.fail("D8", f"{g.name}: the index is not last — heading {later[0].get('id')} follows it")
        entries = []
        for e in ix.find("gf-index-q"):
            a = e if e.tag == "a" else next((n for n in e.walk() if n.tag == "a"), None)
            entries.append((e.get("data-kind"), (a.get("href", "")[1:] if a else None), e.text()))
        if entries != ql:
            R.fail("D8", f"{g.name}: index ({len(entries)} entries) does not equal the questions "
                         f"in run order ({len(ql)})")

    # A6 — the principle, once, before the first heading
    R.ran("A6")
    for g in both:
        pr = g.find("gf-principle")
        if len(pr) != 1:
            R.fail("A6", f"{g.name}: {len(pr)} .gf-principle blocks, want 1")
            continue
        if g.headings and g.index_of(pr[0]) > g.index_of(g.headings[0]):
            R.fail("A6", f"{g.name}: the principle comes after the first heading")
    tp = T.find("gf-principle")
    if len(tp) == 1 and epigraph and tp[0].text() != epigraph:
        R.fail("A6", f"{T.name}: principle text {tp[0].text()!r} ≠ epigraph {epigraph!r}")

    # A7 — box diagrams: nesting and words identical, labels free
    R.ran("A7")

    def box_shape(b):
        return (b.text(lambda c: c.has("gf-box-label") or c.has("gf-box")),
                [box_shape(c) for c in b.walk() if c.has("gf-box")
                 and c.ancestor(lambda p: p.has("gf-box")) is b])
    for h in T.headings:
        other = H.ids.get(h.get("id"))
        if other is None:
            continue
        bt = [box_shape(b) for b in T.own(h, "gf-box") if not b.ancestor(lambda p: p.has("gf-box"))]
        bh = [box_shape(b) for b in H.own(other, "gf-box") if not b.ancestor(lambda p: p.has("gf-box"))]
        if bt != bh:
            R.fail("A7", f"{h.get('id')}: box diagrams differ in nesting or words")

    # A8 — offline; D16 — the VCAA link's place
    R.ran("A8"); R.ran("D16")
    ext = re.compile(r"^\s*(https?:)?//", re.I)
    for g in both:
        raw = g.path.read_text(encoding="utf-8")
        if re.search(r"@import|url\(\s*['\"]?(https?:)?//", raw, re.I):
            R.fail("A8", f"{g.name}: external @import or url() in a stylesheet")
        for n in g.all:
            for attr in ("src", "href", "srcset", "data", "poster"):
                v = n.get(attr)
                if v and ext.match(v):
                    if n.tag == "a" and n.has("gf-vcaa"):
                        continue
                    R.fail("A8", f"{g.name}: external {attr} on <{n.tag}>: {v}")
    for n in H.find("gf-vcaa"):
        R.fail("D16", f"{H.name}: a VCAA link — Technical only")
    for n in T.find("gf-vcaa"):
        if n.get("href") != VCAA:
            R.fail("D16", f"{T.name}: VCAA link to {n.get('href')!r}, want the landing page")
        lab = n.ancestor(lambda p: p.has("gf-vcaa-label"))
        prev = None
        if lab is not None:
            sib = [c for c in lab.parent.children if isinstance(c, Node)]
            i = sib.index(lab)
            prev = sib[i - 1] if i else None
            if prev is not None and prev.has("gf-gloss") and i >= 2:
                prev = sib[i - 2]
        if prev is None or not prev.has("gf-term"):
            R.fail("D16", f"{T.name}: VCAA link not directly after a .gf-term first use")
        if n.ancestor(lambda p: p.tag in ("h1", "h2", "h3", "h4", "h5", "h6") or
                      p.classes & {"gf-chip", "gf-q", "gf-index"}):
            R.fail("D16", f"{T.name}: VCAA link inside a heading, chip, question or index")
        if n.ancestor(lambda p: p.has("gf-glossary")) is None:
            R.fail("D16", f"{T.name}: VCAA link outside the Glossary appendix")

    # A13 (within this run) — both guides carry the same hash per heading
    R.ran("A13")
    for h in T.headings:
        o = H.ids.get(h.get("id"))
        if o is not None and o.get("data-source-hash") != h.get("data-source-hash"):
            R.fail("A13", f"{h.get('id')}: data-source-hash differs between the guides")

    # A14 — breadth and reach identity
    R.ran("A14")
    for h in T.headings:
        o = H.ids.get(h.get("id"))
        if o is None:
            continue
        for a in ("data-breadth", "data-breadth-tier"):
            if h.get(a) != o.get(a):
                R.fail("A14", f"{h.get('id')}: {a} {h.get(a)!r} vs {o.get(a)!r}")
    tr = {r.get("id"): r for r in T.rules()}
    hr = {r.get("id"): r for r in H.rules()}
    if set(tr) != set(hr):
        R.fail("A14", f"rule sets differ: {sorted(set(tr) ^ set(hr))}")

    def reach_marks(g, rid):
        rows = sorted(r.get("data-unit") for t in g.all if t.has("gf-interactions")
                      and t.get("data-rule") == rid for r in t.walk() if r.get("data-unit"))
        stubs = sorted(((g.owner(s).get("id") if g.owner(s) else "") or "",
                        (s.ancestor(lambda p: p.get("id")) or s).get("id") or "")
                       for s in g.find("gf-stub") if rid in (s.get("data-rule") or "").split())
        strip = [(m.get("href"), m.has("gf-on")) for s in g.find("gf-strip")
                 if s.get("data-rule") == rid for m in s.find("gf-strip-mark")]
        return rows, stubs, strip
    for rid in set(tr) & set(hr):
        for a in ("data-reach", "data-reach-tier", "data-home-ruled"):
            if tr[rid].get(a) != hr[rid].get(a):
                R.fail("A14", f"rule {rid}: {a} {tr[rid].get(a)!r} vs {hr[rid].get(a)!r}")
        if reach_marks(T, rid) != reach_marks(H, rid):
            R.fail("A14", f"rule {rid}: interaction rows, stubs or strip differ between the guides")
    for cls in ("gf-foundations", "gf-contains"):
        a = [[x.get("href") for x in b.walk() if x.tag == "a"] for b in T.find(cls)]
        b = [[x.get("href") for x in c.walk() if x.tag == "a"] for c in H.find(cls)]
        if a != b:
            R.fail("A14", f".{cls} entries differ between the guides")

    # D6 — glyph asymmetry
    R.ran("D6")
    if T.find("gf-glyph"):
        R.fail("D6", f"{T.name}: carries {len(T.find('gf-glyph'))} theatre glyphs — must be plain")
    for h in H.headings:
        if not H.own(h, "gf-glyph"):
            R.fail("D6", f"{H.name} {h.get('id')}: heading has no glyph")


def note_lines(n):
    """A .gf-note's own words, one string per line (<br> splits), no spaces added at tag edges."""
    parts = []

    def walk(x):
        for c in x.children:
            if isinstance(c, str):
                parts.append(c)
            elif c.tag == "br":
                parts.append("\n")
            else:
                walk(c)
    walk(n)
    lines = [re.sub(r"\s+", " ", s).strip() for s in "".join(parts).split("\n")]
    if lines and lines[0].startswith("NOTE —"):
        lines[0] = lines[0][len("NOTE —"):].strip()
    return [s for s in lines if s]


def source_lines(src_md):
    """Luke's source lines with only Markdown bold marks, layout whitespace and a wrapping [ ] removed."""
    out = []
    for raw in src_md.splitlines():
        s = re.sub(r"\s+", " ", raw.replace("**", "")).strip()
        if s.startswith("[") and s.endswith("]"):
            s = s[1:-1].strip()
        if s:
            out.append(s)
    return out


def check_notes(g, R, src_md):
    # C37 — a NOTE is Luke's own words: each line found in one source line, nothing added
    R.ran("C37")
    src = source_lines(src_md)
    for n in g.find("gf-note"):
        for line in note_lines(n):
            if not any(line in s for s in src):
                where = g.owner(n).get("id") if g.owner(n) else "?"
                R.fail("C37", f"{g.name} {where}: NOTE line not in Original_Content.md: {line[:70]!r}")


def check_axis(T, H, R):
    # E1 Q0 — one axis per branch: chosen once, inherited below; Form/Function only on its own axis
    R.ran("E1")
    seen = []
    for g in (T, H):
        marks = {}
        for h in g.headings:
            hid = h.get("id")
            ax, frm, by = h.get("data-axis"), h.get("data-axis-from"), h.get("data-axis-by")
            marks[hid] = (ax, frm, by)
            if not ax or not frm or by not in ("notes", "Luke"):
                R.fail("E1", f"{g.name} {hid}: axis hooks missing or malformed "
                             f"(data-axis={ax!r} data-axis-from={frm!r} data-axis-by={by!r})")
                continue
            chooser, p = None, g.owner(h)
            while p is not None:
                if p.get("data-axis-from") == p.get("id") and p.get("data-axis") not in (None, "none"):
                    chooser = p
                    break
                p = g.owner(p)
            want = chooser.get("id") if chooser is not None else hid
            if frm != want:
                why = (f"ancestor {want!r} already chose {chooser.get('data-axis')!r}, so this heading "
                       f"inherits and may not choose" if chooser is not None and frm == hid else
                       f"expected {want!r} (itself, or the nearest ancestor that chose)")
                R.fail("E1", f"{g.name} {hid}: data-axis-from={frm!r}; {why}")
            elif chooser is not None and (ax, by) != (chooser.get("data-axis"), chooser.get("data-axis-by")):
                R.fail("E1", f"{g.name} {hid}: axis {ax!r}/{by!r} differs from its chooser {want!r} "
                             f"({chooser.get('data-axis')!r}/{chooser.get('data-axis-by')!r})")
            if ax != "form-function":
                secs = [n.get("id") for n in g.own(h, "gf-section")]
                subs = [n for n in g.own(h, "gf-subhead") if "form" in n.text().lower()]
                if secs or subs:
                    R.fail("E1", f"{g.name} {hid}: axis {ax!r} but holds Form/Function "
                                 f"{'sections ' + str(secs) if secs else 'sub-heading'}")
        seen.append(marks)
    for hid, m in seen[0].items():
        if hid in seen[1] and m != seen[1][hid]:
            R.fail("E1", f"{hid}: axis hooks differ between the guides: {m} vs {seen[1][hid]}")


HIDDEN_LABELS = {"gf-def": "Definition", "gf-callout": "Key summary", "gf-examples": "Examples",
                 "gf-diagnostics": "Diagnostic questions", "gf-reach-qs": "Reach questions"}


def check_labels(g, R):
    # D17 — every kind of element carries its hidden agent label, and none of the names is shown to Luke,
    # except NOTE, whose visible `NOTE —` is the one label both Luke and the agent read
    R.ran("D17")
    for cls, label in HIDDEN_LABELS.items():
        for n in g.find(cls):
            if n.get("data-label") != label:
                R.fail("D17", f"{g.name}: a .{cls} with data-label {n.get('data-label')!r}, want {label!r}")
    for q in g.find("gf-q"):
        if q.ancestor(lambda p: p.has("gf-index") or p.has("gf-note")):
            continue
        want = "Reach question" if q.ancestor(lambda p: p.has("gf-reach-qs")) else "Diagnostic question"
        if q.get("data-label") != want:
            R.fail("D17", f"{g.name}: a .gf-q with data-label {q.get('data-label')!r}, want {want!r}")
    for n in g.find("gf-note"):
        if not n.text().startswith("NOTE —"):
            R.fail("D17", f"{g.name}: a NOTE without its visible `NOTE —` label")
        if n.get("data-label"):
            R.fail("D17", f"{g.name}: a NOTE with a hidden data-label; its visible label is the only one")
    for n in g.find("gf-block-label"):
        if re.search(r"[A-Za-z]", n.text()):
            R.fail("D17", f"{g.name}: a visible block label {n.text()[:30]!r}; names are hidden data-labels")


def check_guide(g, R, heading_count):
    check_labels(g, R)
    # C16 — diagnostic coverage
    R.ran("C16")
    for h in g.headings:
        secs = g.own(h, "gf-section", boundary=("gf-heading",))
        units = secs or [h]
        for u in units:
            bnd = ("gf-heading", "gf-section", "gf-subsection")
            own_q = [q for q in u.find("gf-q")
                     if q.ancestor(lambda p: any(p.has(x) for x in bnd)) is u
                     and q.ancestor(lambda p: p.has("gf-diagnostics"))
                     and not q.ancestor(lambda p: p.has("gf-note"))]
            subs = [s for s in u.find("gf-subsection")
                    if s.ancestor(lambda p: any(p.has(x) for x in bnd)) is u]
            subs_ok = subs and all(
                any(q.ancestor(lambda p: p.has("gf-diagnostics"))
                    and not q.ancestor(lambda p: p.has("gf-note")) for q in s.find("gf-q"))
                for s in subs)
            if not own_q and not subs_ok:
                R.fail("C16", f"{g.name} {u.get('id')}: no diagnostic, own or through every sub-subsection")
        want = {x for x in h.get("data-tags", "").split(";") if x}
        tested = set()
        for q in h.find("gf-q"):
            if (g.owner(q) is h and q.ancestor(lambda p: p.has("gf-diagnostics"))
                    and not q.ancestor(lambda p: p.has("gf-note"))):
                tested |= {x for x in q.get("data-tests", "").split(";") if x}
        if want - tested:
            R.fail("C16", f"{g.name} {h.get('id')}: tags no diagnostic reaches: {sorted(want - tested)}")

    # C25 / C26 — vocabulary
    R.ran("C25"); R.ran("C26")
    body = next((n for n in g.all if n.tag == "body"), g.root)
    for crit, words in (("C25", C25_BANNED), ("C26", C26_BANNED)):
        exempt = SPECIMEN | (C25_EXEMPT if crit == "C25" else set())
        vis = body.text(lambda c: bool(c.classes & exempt))
        for w in words:
            for m in re.finditer(r"\b" + re.escape(w) + r"(s|es)?\b", vis, re.I):
                ctx = vis[max(0, m.start() - 30): m.end() + 30]
                R.fail(crit, f"{g.name}: {m.group(0)!r} in “…{ctx}…”")

    # D2 — glossary appendix: one section after the last heading and before the index, holding
    # every definition in alphabetical order; prose links point into it
    R.ran("D2")
    gl = g.find("gf-glossary")
    if len(gl) != 1 or gl[0].get("id") != "glossary":
        R.fail("D2", f"{g.name}: want one section.gf-glossary#glossary, found {len(gl)}")
    gl = gl[0] if gl else None
    if gl is not None:
        if g.owner(gl) is not None:
            R.fail("D2", f"{g.name}: the glossary sits inside a heading")
        elif g.headings and g.index_of(gl) < max(g.index_of(n) for h in g.headings for n in [h, *h.walk()]):
            R.fail("D2", f"{g.name}: the glossary is not after the last heading")
        idx = g.find("gf-index")
        if idx and g.index_of(gl) > g.index_of(idx[0]):
            R.fail("D2", f"{g.name}: the glossary comes after the index")
        names = [b.text().casefold() for b in gl.find("gf-term")]
        if names != sorted(names):
            R.fail("D2", f"{g.name}: glossary entries not in alphabetical order")
    defs = {}
    for b in g.find("gf-term"):
        t = b.get("data-term")
        if t in defs:
            R.fail("D2", f"{g.name}: term {t!r} bold-defined twice")
        defs[t] = b
        if gl is None or b.ancestor(lambda p: p is gl) is None:
            R.fail("D2", f"{g.name}: term {t!r} defined outside the glossary")
        sib = [c for c in b.parent.children if isinstance(c, Node)]
        nxt = sib[sib.index(b) + 1] if sib.index(b) + 1 < len(sib) else None
        if not (nxt is not None and nxt.has("gf-gloss")) and not b.find("gf-gloss"):
            R.fail("D2", f"{g.name}: term {t!r} first use has no gloss beside it")
        if b.get("id") != f"term-{t}":
            R.fail("D2", f"{g.name}: term {t!r} anchor id is {b.get('id')!r}, want 'term-{t}'")
    for a in g.find("gf-term-ref"):
        t = a.get("data-term")
        d = defs.get(t)
        if d is None:
            R.fail("D2", f"{g.name}: link to undefined term {t!r}")
        elif a.get("href") != f"#term-{t}":
            R.fail("D2", f"{g.name}: term {t!r} link points to {a.get('href')!r}")
        if a.ancestor(lambda p: p.tag in ("h1", "h2", "h3", "h4", "h5", "h6") or
                      p.classes & ({"gf-chip", "gf-q", "gf-index", "gf-tagged"} | SPECIMEN)):
            R.fail("D2", f"{g.name}: term {t!r} linked from a heading, chip, question, example or index")

    # D10 — cross-references resolve
    R.ran("D10")
    for a in g.all:
        href = a.get("href") or ""
        if a.tag == "a" and href.startswith("#") and href[1:] not in g.ids:
            R.fail("D10", f"{g.name}: link {href} does not resolve")
    for x in g.find("gf-xref"):
        tgt = g.ids.get((x.get("href") or "")[1:])
        if tgt is not None and not tgt.has("gf-heading"):
            R.fail("D10", f"{g.name}: cross-reference {x.get('href')} is not a heading")

    # D11 — breadth shading and labels; Contains overview on wide headings
    R.ran("D11"); R.ran("D14")
    for h in g.headings:
        tier = h.get("data-breadth-tier")
        sid = h.get("id")
        if tier not in ("leaf", "narrow", "wide"):
            R.fail("D11", f"{g.name} {sid}: data-breadth-tier {tier!r}")
            continue
        if not h.has(f"gf-breadth-{tier}"):
            R.fail("D11", f"{g.name} {sid}: class gf-breadth-{tier} missing")
        label = h.get("data-breadth-label")     # hidden agent label (D11, D17): an attribute, never shown
        if g.own(h, "gf-breadth-label"):
            R.fail("D17", f"{g.name} {sid}: the breadth label is shown; it is a hidden data-breadth-label")
        if (tier != "leaf") != bool(label):
            R.fail("D11", f"{g.name} {sid}: data-breadth-label {'missing' if tier != 'leaf' else 'on a leaf'}")
        elif label and not re.match(rf"Contains {re.escape(h.get('data-breadth') or '')} — \d+ kinds?, \d+ parts?$", label):
            R.fail("D11", f"{g.name} {sid}: data-breadth-label {label!r} does not carry the count {h.get('data-breadth')}")
        cont = g.own(h, "gf-contains")
        if tier == "wide":
            n = sum(1 for x in cont[0].walk() if x.tag == "a") if cont else 0
            if not cont:
                R.fail("D14", f"{g.name} {sid}: wide heading with no Contains overview")
            elif str(n) != (h.get("data-breadth") or ""):
                R.fail("D14", f"{g.name} {sid}: Contains lists {n}, data-breadth says {h.get('data-breadth')}")
            elif cont and any(x.get("data-kind") not in ("kind", "part")
                              for x in cont[0].walk() if x.tag == "a"):
                R.fail("D14", f"{g.name} {sid}: a Contains entry not labelled kind or part")
        elif cont:
            R.fail("D14", f"{g.name} {sid}: Contains overview on a {tier} heading")

    # D12 / D15 — reach marks; D14 Foundations
    R.ran("D12"); R.ran("D15")
    ids_to_heading = {}
    for n in g.all:
        if n.get("id"):
            h = n if n.has("gf-heading") else g.owner(n)
            ids_to_heading[n.get("id")] = h.get("id") if h else None
    broad = []
    for r in g.rules():
        rid, tier = r.get("id"), r.get("data-reach-tier")
        count, units = reach_units(r)
        if not rid:
            R.fail("D12", f"{g.name}: a rule with no id")
            continue
        if tier not in ("local", "spanning", "broad"):
            R.fail("D12", f"{g.name} {rid}: data-reach-tier {tier!r}")
            continue
        if not r.has(f"gf-reach-{tier}"):
            R.fail("D12", f"{g.name} {rid}: class gf-reach-{tier} missing")
        if count is None or count != len(units):
            R.fail("D12", f"{g.name} {rid}: data-reach count does not match its units")
        label = [x for x in r.find("gf-reach-label")
                 if x.ancestor(lambda p: p.has("gf-rule")) is r]
        if (tier != "local") != bool(label):
            R.fail("D12", f"{g.name} {rid}: reach label {'missing' if tier != 'local' else 'on a local rule'}")
        if tier == "broad":
            broad.append((count or 0, rid))
        if tier == "local":
            continue
        tables = [t for t in g.all if t.has("gf-interactions") and t.get("data-rule") == rid]
        rows = {x.get("data-unit"): x for t in tables for x in t.walk() if x.get("data-unit")}
        if set(rows) != set(units):
            R.fail("D12", f"{g.name} {rid}: interaction rows {sorted(rows)} ≠ reached {sorted(units)}")
        strips = [s for s in g.find("gf-strip") if s.get("data-rule") == rid]
        if len(strips) != 1:
            R.fail("D12", f"{g.name} {rid}: {len(strips)} reach strips, want 1")
        else:
            marks = strips[0].find("gf-strip-mark")
            if len(marks) != heading_count:
                R.fail("D12", f"{g.name} {rid}: strip has {len(marks)} marks, guide has {heading_count} headings")
            on = {(m.get("href") or "")[1:] for m in marks if m.has("gf-on")}
            want = {ids_to_heading.get(u) for u in units}
            if on != want:
                R.fail("D12", f"{g.name} {rid}: filled strip marks {sorted(on)} ≠ reached headings {sorted(x for x in want if x)}")
        stubs = [s for s in g.find("gf-stub") if rid in (s.get("data-rule") or "").split()]
        seen = set()
        for s in stubs:
            unit = s.ancestor(lambda p: p.get("id") in rows)
            if unit is None:
                R.fail("D15", f"{g.name} {rid}: a stub outside every reached unit")
                continue
            seen.add(unit.get("id"))
            if not any(a.tag == "a" and a.get("href") == f"#{ids_to_heading.get(rid)}" for a in s.walk()):
                R.fail("D15", f"{g.name} {rid} → {unit.get('id')}: stub does not link to the rule's home heading")
            if not s.text().startswith("Governed by:") or s.find("gf-does"):
                R.fail("D15", f"{g.name} {rid} → {unit.get('id')}: a stub is only `Governed by: <home heading>`")
        for u in set(rows) - seen:
            R.fail("D15", f"{g.name} {rid} → {u}: row with no stub")
    fnd = g.find("gf-foundations")
    if broad or fnd:
        got = [(x.get("href") or "")[1:] for f in fnd for x in f.walk() if x.tag == "a"]
        if len(fnd) != 1:
            R.fail("D14", f"{g.name}: {len(fnd)} Foundations lists, want 1")
        if set(got) != {rid for _, rid in broad}:
            R.fail("D14", f"{g.name}: Foundations {got} ≠ broad rules {sorted(r for _, r in broad)}")
        counts = [dict((r, c) for c, r in broad).get(x, 0) for x in got]
        if counts != sorted(counts, reverse=True):
            R.fail("D14", f"{g.name}: Foundations not highest reach first")
        if fnd and g.headings and g.index_of(fnd[0]) > g.index_of(g.headings[0]):
            R.fail("D14", f"{g.name}: Foundations after the first heading")

    # D13 — niche points hang under their rule, unshaded
    R.ran("D13")
    for n in g.find("gf-niche"):
        if n.ancestor(lambda p: p.has("gf-rule")) is None:
            R.fail("D13", f"{g.name}: a niche point not inside the rule it qualifies")
        if any(re.match(r"gf-(breadth|reach)-", c) for c in n.classes):
            R.fail("D13", f"{g.name}: a niche point carries shading or highlight")


ALLOWANCE = {"gf-breadth-label", "gf-contains", "gf-reach-label", "gf-interactions", "gf-strip",
             "gf-stub", "gf-breadth-qs", "gf-reach-qs"}
ALLOW_ATTRS = ("data-breadth", "data-breadth-tier", "data-reach", "data-reach-tier",
               "data-home-ruled", "data-flags")


def check_prior(cur, prior, redo, blocks, R):
    """A13 carry-forward and A2 stability against the prior run's guide."""
    src = {b["hash"] for b in blocks}
    pmap = {h.get("id"): h for h in prior.headings}
    cmap = {h.get("id"): h for h in cur.headings}
    for slug, ph in pmap.items():
        ch = cmap.get(slug)
        ph_hash = ph.get("data-source-hash")
        if ch is None:
            moved = [s for s, h in cmap.items() if h.get("data-source-hash") == ph_hash]
            if moved:
                R.fail("A2", f"{cur.name}: slug {slug!r} reassigned to {moved[0]!r}")
            elif ph_hash in src:
                R.fail("A2", f"{cur.name}: heading {slug!r} vanished though its source is still there")
            continue
        if ch.get("data-source-hash") != ph_hash or slug in redo:
            continue      # CHANGED or REDO — re-rendered, not carried

        def drop(n):   # breadth/reach marks, nested headings (checked on their own), and a
            # pre-appendix term strip (gf-terms) or inline gloss that the Glossary appendix took over
            return (bool(n.classes & (ALLOWANCE | {"gf-gloss", "gf-vcaa-label", "gf-terms"}))
                    or n.has("gf-heading"))

        def unwrap(n):  # a word linked to the glossary and a re-pointed cross-reference keep their words
            return bool(n.classes & {"gf-term", "gf-term-ref", "gf-xref"})
        # unwrapping a link leaves join spaces around it ("verb 's", "( auxiliary"); whitespace
        # alone is never a content change, so the diff ignores it
        tidy = lambda x: re.sub(r"\s+", "", x)
        a = tidy(ph.canon(drop, unwrap, ALLOW_ATTRS))
        b = tidy(ch.canon(drop, unwrap, ALLOW_ATTRS))
        if a != b:
            R.fail("A13", f"{cur.name} {slug}: UNCHANGED heading differs from the prior file "
                          f"beyond the two allowances — treat it as CHANGED")


# ─── commands ───────────────────────────────────────────────────────────────────────────────

def load_epigraph():
    p = HERE / "reference" / "meaning-first.md"
    if not p.exists():
        return None
    m = re.search(r"The PRINCIPLE.*?>\s*\*\*(.+?)\*\*", p.read_text(encoding="utf-8"), re.S)
    return m.group(1).strip() if m else None


def cmd_hashes(args):
    blocks = source_blocks((Path(args.dir) / "Original_Content.md").read_text(encoding="utf-8"))
    print(json.dumps(blocks, indent=2, ensure_ascii=False))
    return 0


def cmd_rows(args):
    d = Path(args.dir)
    out = {}
    for key, f in (("rej", "Rejected_Proposals.table.md"), ("rev", "Revisions.table.md"),
                   ("map", "Theatre_Mappings.table.md")):
        n, bad = table_rows(d / f)
        out[key] = n
        if bad:
            out[key + "_malformed"] = bad
    print(json.dumps(out))
    return 0


def parse_kv(s):
    out = {}
    for part in (s or "").split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = int(v)
    return out


def cmd_check(args):
    d = Path(args.dir)
    R = Report()
    src_md = (d / "Original_Content.md").read_text(encoding="utf-8") if (d / "Original_Content.md").exists() else ""
    blocks = source_blocks(src_md)
    T, H = Guide(d / TECH), Guide(d / THEATRE)
    flags, pending = [], []

    if not T.headings and not H.headings:
        R.skip("ALL", "no rendered headings in either guide — placeholders, nothing to check yet")
    else:
        check_pair(T, H, R, load_epigraph())
        check_axis(T, H, R)
        for g in (T, H):
            check_guide(g, R, len(g.headings))
            check_notes(g, R, src_md)
        # A13 — hashes against the source: every rendered hash is current; order follows the source
        src_order = [b["hash"] for b in blocks]
        for g in (T, H):
            rendered = [h.get("data-source-hash") for h in g.headings]
            for h in g.headings:
                hh = h.get("data-source-hash")
                if not hh or not re.fullmatch(r"[0-9a-f]{12}", hh):
                    R.fail("A13", f"{g.name} {h.get('id')}: missing or malformed data-source-hash")
                elif hh not in src_order:
                    R.fail("A13", f"{g.name} {h.get('id')}: hash {hh} matches no source block — stale")
            pos = [src_order.index(x) for x in rendered if x in src_order]
            if pos != sorted(pos):
                R.fail("A13", f"{g.name}: heading order does not follow Original_Content.md")
        done = {h.get("data-source-hash") for h in T.headings}
        pending = [b["title"] for b in blocks if b["hash"] not in done]
        for g in (T, H):
            for h in g.headings:
                if h.get("data-flags"):
                    flags.append(f"{g.name} {h.get('id')}: {h.get('data-flags')}")
    if args.prior:
        redo = {x for x in (args.redo or "").split(",") if x}
        for name, cur in ((TECH, T), (THEATRE, H)):
            pp = Path(args.prior) / name
            if pp.exists() and cur.headings:
                check_prior(cur, Guide(pp), redo, blocks, R)
    else:
        R.skip("A13-prior", "no --prior: carry-forward diff not run")

    # B3 / B9 — row counts
    before, expect = parse_kv(args.rows_before), parse_kv(args.expect)
    for key, crit, f in (("rej", "B3", "Rejected_Proposals.table.md"),
                         ("rev", "B9", "Revisions.table.md")):
        n, bad = table_rows(d / f)
        if bad:
            R.fail(crit, f"{f}: rows with the wrong column count: {bad[:3]}")
        if key in before and key in expect:
            R.ran(crit)
            if n - before[key] != expect[key]:
                R.fail(crit, f"{f}: {n - before[key]} new rows, expected {expect[key]}")
        elif not bad:
            R.skip(crit, "no --rows-before/--expect")

    # C28 — Original_Content.md changed only as permitted
    if args.paste:
        R.ran("C28")

        def norm(text):
            out = []
            for ln in text.splitlines():
                if HEAD_RE.match(ln) or not ln.strip():
                    continue
                s = ln.strip().replace("**", "")
                s = re.sub(r"^(>\s*)+", "", s)
                s = re.sub(r"^\*\s+", "", s)
                out.append(re.sub(r"\s+", " ", s).strip())
            return [x for x in out if x]
        paste = Path(args.paste).read_text(encoding="utf-8")
        a, b = norm(paste), norm(src_md)
        if a != b:
            for i, (x, y) in enumerate(zip(a, b)):
                if x != y:
                    R.fail("C28", f"line {i + 1}: paste {x!r} vs file {y!r}")
                    break
            else:
                R.fail("C28", f"line counts differ: paste {len(a)} vs file {len(b)}")
        if len(source_blocks(paste)) != len(blocks):
            R.fail("C28", "heading count differs between the paste and the file")

    code = R.exit_code()
    skipped = R.results.pop("_skipped", {})
    if args.json:
        print(json.dumps({"exit": code, "results": R.results, "skipped": skipped,
                          "flags": flags, "pending": pending}, indent=2, ensure_ascii=False))
        return code
    for crit in sorted(R.results, key=order_key):
        msgs = R.results[crit]
        if msgs is None:
            continue
        print(f"{'FAIL' if msgs else 'pass'}  {crit}")
        for m in msgs[:12]:
            print(f"        {m}")
        if len(msgs) > 12:
            print(f"        … {len(msgs) - 12} more")
    for crit, why in skipped.items():
        print(f"skip  {crit}: {why}")
    if flags:
        print("\nOpen flags:")
        for f in flags:
            print(f"  ⚑ {f}")
    if pending:
        print(f"\nPending (not yet rendered): {len(pending)} — " + "; ".join(pending[:10]))
    if "ALL" in skipped:
        print("\nNOTHING RENDERED YET")
        return code
    print({0: "\nALL PASS", 1: "\nSTOP — a GROUP A or B failure",
           2: "\nFix and re-rule — GROUP C/D/E failures"}[code])
    return code


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["hashes", "rows", "check"])
    ap.add_argument("--dir", default=str(GRAMMAR))
    ap.add_argument("--prior")
    ap.add_argument("--redo")
    ap.add_argument("--paste")
    ap.add_argument("--rows-before")
    ap.add_argument("--expect")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    return {"hashes": cmd_hashes, "rows": cmd_rows, "check": cmd_check}[args.command](args)


if __name__ == "__main__":
    sys.exit(main())

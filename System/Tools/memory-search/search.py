#!/usr/bin/env python3
"""memory-search — ranked full-text search over Lukeatron memory, for agents.

    search.py "query" [--store Theology] [--area long|medium] [-n 10] [--json]
    search.py --refresh        bring the index up to date and report what changed
    search.py --rebuild        drop the index and build it again
    search.py --stats          files and stores in the index
    search.py --sealed "query" [--pastoral]
                               search ONLY the sealed paths, from a separate index (see below)

Scope: Memory/Long-Term/ (every unsealed store, LukeatronWiki nodes included) and
Memory/Medium-Term/Projects/. Text files only (.md .txt .yaml .yml .csv .html .log); files over
2 MB are skipped.

The seal: every path named in Memory/Long-Term/LukeatronWiki/_sealed.yaml is left out when the
index is built, so sealed text can never come back in a result. The pastoral log is left out
even if the manifest forgets it. If the manifest cannot be read, nothing from Long-Term is
indexed and the command fails.

Matching: SQLite FTS5 with the trigram tokenizer, so a term matches anywhere inside a word
("atone" finds "atonement"), case-insensitive. Every term must match; "quoted phrases" stay
together; terms under 3 characters are checked by plain substring. Results are ranked with
BM25, a label match counting five times a body match. The label is the file name, led by the
frontmatter `title` when a Markdown file has one. Each query first refreshes changed
files, so an edit is searchable at once.

The sealed search is a parallel, separate index of exactly the paths the main index leaves
out. It is never merged into normal results and the wiki never uses it. The pastoral log is in
it but is returned only with --pastoral as well. Every sealed result is internal-only: it must
not be quoted in outgoing content, digests, wiki nodes or drafts (!Checkpoint; Gate P for the
pastoral log).

Both indexes are machine-local caches (~/Library/Caches/Lukeatron/memory-search.sqlite and
memory-search-sealed.sqlite, or $LUKEATRON_SEARCH_DB and its "-sealed" sibling): outside git and
never synced through Dropbox. Delete them at any time; the next query rebuilds them.
"""
import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / ".claude" / "CLAUDE.md").exists())
EXTENSIONS = {".md", ".txt", ".yaml", ".yml", ".csv", ".html", ".log"}
MAX_BYTES = 2_000_000
PASTORAL = "BalaclavaPC/Pastoral_Notes.table.md"
SNIPPET = 200
SCHEMA = "2"
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
FM_TITLE = re.compile(r"^title:\s*[\"']?(.+?)[\"']?\s*$", re.MULTILINE)


class SealError(Exception):
    pass


def default_db(sealed=False):
    override = os.environ.get("LUKEATRON_SEARCH_DB")
    base = Path(override) if override else Path.home() / "Library" / "Caches" / "Lukeatron" / "memory-search.sqlite"
    return base.with_name(base.stem + "-sealed" + base.suffix) if sealed else base


def read_seal(long_term):
    manifest = long_term / "LukeatronWiki" / "_sealed.yaml"
    try:
        data = parse_manifest(manifest.read_text(encoding="utf-8"))
        stores, files = data["stores"], data["files"]
    except Exception as exc:
        raise SealError(f"seal manifest unreadable ({manifest}): {exc}")
    files = set(files) | {PASTORAL}
    digest = hashlib.sha256(json.dumps([sorted(stores), sorted(files)]).encode()).hexdigest()
    return set(stores), files, digest


def parse_manifest(text):
    """Strict reader for the manifest's two lists (stdlib only). Anything unexpected raises."""
    data, key = {}, None
    for raw in text.splitlines():
        line = raw.split(" #", 1)[0].rstrip() if not raw.lstrip().startswith("#") else ""
        if not line.strip():
            continue
        if not line.startswith(" ") and line.endswith(":") and line[:-1] in ("stores", "files"):
            key = line[:-1]
            data[key] = []
        elif not line.startswith(" ") and line.replace(" ", "") in ("stores:[]", "files:[]"):
            key = None
            data[line.split(":")[0]] = []
        elif key and line.lstrip().startswith("- "):
            item = line.lstrip()[2:].strip().strip("\"'")
            if not item:
                raise ValueError("empty entry")
            data[key].append(item)
        else:
            raise ValueError(f"unexpected line: {raw!r}")
    if set(data) != {"stores", "files"}:
        raise ValueError("needs both a stores: and a files: list")
    return data


def sealed(rel, stores, files):
    return rel in files or rel.split("/", 1)[0] in stores


def walk_sealed(root, long_term_stores, long_term_files):
    """Yield (path, area, store, rel) for every sealed file; the pastoral log is area "pastoral"."""
    long_term = root / "Memory" / "Long-Term"
    for path in sorted(long_term.rglob("*")):
        rel = path.relative_to(long_term).as_posix()
        if path.is_file() and path.suffix.lower() in EXTENSIONS and not any(
                part.startswith(".") for part in rel.split("/")) and sealed(rel, long_term_stores, long_term_files):
            yield path, "pastoral" if rel == PASTORAL else "long", rel.split("/", 1)[0], rel


def walk(root, long_term_stores, long_term_files):
    """Yield (path, area, store, rel) for every searchable file."""
    long_term = root / "Memory" / "Long-Term"
    for path in sorted(long_term.rglob("*")):
        rel = path.relative_to(long_term).as_posix()
        if path.is_file() and path.suffix.lower() in EXTENSIONS and not any(
                part.startswith(".") for part in rel.split("/")) and not sealed(rel, long_term_stores, long_term_files):
            yield path, "long", rel.split("/", 1)[0], rel
    projects = root / "Memory" / "Medium-Term" / "Projects"
    for path in sorted(projects.rglob("*")) if projects.exists() else []:
        rel = path.relative_to(projects).as_posix()
        if path.is_file() and path.suffix.lower() in EXTENSIONS and not rel.startswith("."):
            yield path, "medium", "Projects", rel


def label_of(path, text):
    block = FRONTMATTER.match(text) if path.suffix.lower() == ".md" else None
    title = FM_TITLE.search(block.group(1)) if block else None
    return f"{title.group(1)} — {path.name}" if title else path.name


def text_of(path):
    raw = path.read_bytes()
    if len(raw) > MAX_BYTES or b"\0" in raw[:4096]:
        return None
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return None
    if path.suffix.lower() == ".html":
        text = "\n".join(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", line)).strip() for line in text.splitlines())
    return text


class Index:
    def __init__(self, root=ROOT, db=None, sealed=False):
        self.root = Path(root)
        self.long_term = self.root / "Memory" / "Long-Term"
        self.mode = "sealed" if sealed else "open"
        path = Path(db) if db else default_db(sealed)
        path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path)
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
            CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, mtime REAL, size INTEGER);
            CREATE VIRTUAL TABLE IF NOT EXISTS docs USING fts5(
                title, body, path UNINDEXED, area UNINDEXED, store UNINDEXED, tokenize='trigram');
        """)

    def meta(self, key):
        row = self.db.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        return row[0] if row else None

    def clear(self):
        self.db.executescript("DELETE FROM docs; DELETE FROM files; DELETE FROM meta;")

    def refresh(self):
        stores, files, digest = read_seal(self.long_term)
        if (self.meta("seal"), self.meta("schema"), self.meta("root"), self.meta("mode")) != (
                digest, SCHEMA, str(self.root), self.mode):
            self.clear()
        known = dict(self.db.execute("SELECT path, mtime FROM files"))
        seen, added, removed = set(), 0, 0
        for path, area, store, rel in (walk_sealed if self.mode == "sealed" else walk)(self.root, stores, files):
            key = path.relative_to(self.root).as_posix()
            seen.add(key)
            stat = path.stat()
            if known.get(key) == stat.st_mtime:
                continue
            self.db.execute("DELETE FROM docs WHERE path = ?", (key,))
            text = text_of(path)
            if text is not None:
                self.db.execute("INSERT INTO docs (title, body, path, area, store) VALUES (?, ?, ?, ?, ?)",
                                (label_of(path, text), text, key, area, store))
            self.db.execute("INSERT OR REPLACE INTO files VALUES (?, ?, ?)", (key, stat.st_mtime, stat.st_size))
            added += 1
        for key in set(known) - seen:
            self.db.execute("DELETE FROM docs WHERE path = ?", (key,))
            self.db.execute("DELETE FROM files WHERE path = ?", (key,))
            removed += 1
        self.db.executemany("INSERT OR REPLACE INTO meta VALUES (?, ?)",
                            [("seal", digest), ("schema", SCHEMA), ("root", str(self.root)), ("mode", self.mode)])
        self.db.commit()
        return added, removed

    def search(self, query, store=None, area=None, limit=10, pastoral=False):
        terms = [t.strip('"').strip() for t in re.findall(r'"[^"]+"|\S+', query)]
        terms = [t for t in terms if t]
        if not terms:
            return []
        long_terms = [t for t in terms if len(t) >= 3]
        short_terms = [t.lower() for t in terms if len(t) < 3]
        where, args = [], []
        if long_terms:
            where.append("docs MATCH ?")
            args.append(" AND ".join('"' + t.replace('"', '""') + '"' for t in long_terms))
        for term in short_terms:
            where.append("(lower(title) LIKE ? OR lower(body) LIKE ?)")
            args += [f"%{term}%"] * 2
        if store:
            where.append("lower(store) = ?")
            args.append(store.lower())
        if area:
            where.append("area = ?")
            args.append(area)
        if not pastoral:
            where.append("area != 'pastoral'")
        order = "bm25(docs, 5.0, 1.0)" if long_terms else "path"
        rows = self.db.execute(
            f"SELECT path, area, store, title, body FROM docs WHERE {' AND '.join(where)} ORDER BY {order} LIMIT ?",
            args + [limit]).fetchall()
        return [dict(zip(("path", "area", "store", "title"), row[:4]), **locate(row[4], terms)) for row in rows]

    def stats(self):
        rows = self.db.execute("SELECT area, store, count(*) FROM docs GROUP BY area, store ORDER BY area, store").fetchall()
        return {"files": sum(r[2] for r in rows), "stores": [{"area": a, "store": s, "files": n} for a, s, n in rows]}


def locate(body, terms):
    """The first line holding the most query terms, with a snippet centred on its first match."""
    needles = [t.lower() for t in terms]
    best, best_count = None, 0
    for number, line in enumerate(body.splitlines(), start=1):
        low = line.lower()
        count = sum(1 for n in needles if n in low)
        if count > best_count:
            best, best_count = (number, line), count
            if count == len(needles):
                break
    if not best:
        return {"line": None, "snippet": ""}
    number, line = best
    text = line.strip()
    low = text.lower()
    at = min(low.find(n) for n in needles if n in low)
    start = max(0, at - SNIPPET // 3)
    piece = text[start:start + SNIPPET]
    return {"line": number, "snippet": ("…" if start else "") + piece + ("…" if start + SNIPPET < len(text) else "")}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("query", nargs="?")
    parser.add_argument("--store")
    parser.add_argument("--area", choices=("long", "medium"))
    parser.add_argument("-n", type=int, default=10)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--rebuild", action="store_true")
    parser.add_argument("--stats", action="store_true")
    parser.add_argument("--sealed", action="store_true", help="search only the sealed paths")
    parser.add_argument("--pastoral", action="store_true", help="with --sealed: include the pastoral log")
    args = parser.parse_args(argv)
    if args.pastoral and not args.sealed:
        parser.error("--pastoral needs --sealed")
    index = Index(sealed=args.sealed)
    try:
        if args.rebuild:
            index.clear()
        added, removed = index.refresh()
    except SealError as exc:
        print(f"memory-search: {exc} — nothing indexed (fails closed)", file=sys.stderr)
        return 2
    if args.refresh or args.rebuild:
        print(f"{added} files indexed or updated, {removed} removed")
    if args.stats:
        print(json.dumps(index.stats(), indent=1) if args.json else
              "\n".join(f"{s['files']:5}  {s['area']:<6} {s['store']}" for s in index.stats()["stores"]))
    if not args.query:
        return 0 if (args.refresh or args.rebuild or args.stats) else parser.print_usage() or 1
    hits = index.search(args.query, args.store, args.area, args.n, pastoral=args.pastoral)
    if args.sealed and not args.json:
        print("⚠️  SEALED results — internal use only. Never quote them in outgoing content, digests,"
              " wiki nodes or drafts." + (" Pastoral log included: Gate P applies." if args.pastoral else ""))
    if args.json:
        print(json.dumps(hits, ensure_ascii=False, indent=1))
    else:
        for hit in hits:
            where = f"{hit['path']}:{hit['line']}" if hit["line"] else hit["path"]
            print(f"{where}  · {hit['title']}\n    {hit['snippet']}")
        print(f"— {len(hits)} result{'s' if len(hits) != 1 else ''}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

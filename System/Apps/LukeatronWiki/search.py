"""
search.py — ranked full-text search across every unsealed store.

Reaches disk ONLY through `library` (FR-2/AC-6). The ranking and matching come
from the shared memory-search engine (`library.search_index()`): every query
term must match, a term matches inside a word, "quoted phrases" stay together,
and results are ranked with filename matches first. The engine refreshes
changed files on every query, so an edit shows up on the very next search.

Two fences keep sealed material out: the engine never indexes a sealed path,
and every hit is re-checked here against `library.list_store()`, which is
seal-filtered. A file the engine cannot index (an image, a binary) can still
match on its filename through that same listing.
"""

try:
    from . import library
except ImportError:
    import library


_LIMIT = 500


def search(query):
    """
    Search every unsealed store for `query`, grouped by store.

    Returns:
        list[dict] — one entry per store with at least one hit, in
        `library.list_stores()` order:
            {"store": "<folder name>",
             "hits": [{"filename", "relpath", "kind": "title"|"body",
                       "excerpt", "line"}]}
        Within a store, hits keep the engine's rank; filename-only matches
        on files the engine does not index come last.

        An empty or whitespace-only query returns []. If the seal manifest
        cannot be read, the engine indexes nothing and this returns [].

    `kind` is "title" when every query term appears in the filename (title
    takes precedence, one hit per file); otherwise "body", with `line`
    naming the best-matching line (1-indexed).
    """
    if not query or not query.strip():
        return []
    terms = [t.strip('"').lower() for t in query.split() if t.strip('"')]
    whole = query.strip().strip('"').lower()

    stores = [s["folder"] for s in library.list_stores()]
    listings = {}
    for store in stores:
        files = library.list_store(store)
        if files:
            listings[store] = {f["filename"]: f for f in files}

    hits_by_store = {store: [] for store in listings}
    seen = set()
    index = library.search_index()
    for hit in (index.search(query, area="long", limit=_LIMIT) if index else []):
        store = hit["store"]
        filename = hit["path"].split("/", 3)[3] if hit["path"].count("/") >= 3 else ""
        entry = listings.get(store, {}).get(filename)
        if entry is None:
            continue
        seen.add(entry["relpath"])
        if all(t in filename.lower() for t in terms):
            hits_by_store[store].append(_hit(entry, "title", filename, None))
        else:
            hits_by_store[store].append(_hit(entry, "body", hit["snippet"], hit["line"]))

    for store, files in listings.items():
        for filename, entry in files.items():
            if entry["relpath"] not in seen and whole in filename.lower():
                hits_by_store[store].append(_hit(entry, "title", filename, None))

    return [{"store": s, "hits": hits_by_store[s]} for s in stores if hits_by_store.get(s)]


def _hit(entry, kind, excerpt, line):
    return {"filename": entry["filename"], "relpath": entry["relpath"],
            "kind": kind, "excerpt": excerpt, "line": line}

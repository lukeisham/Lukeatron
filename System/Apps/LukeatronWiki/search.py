"""
search.py — plain substring search across every unsealed store.

Reaches disk ONLY through `library` (FR-2/AC-6) — never opens the
Long-Term store tree or the wiki's own control surface itself. No index,
no cache: every
call re-walks every unsealed store live via `library.list_stores()` /
`library.list_store()` / `library.read_store_file()` (AD-1/FR-4), so an
edited file shows up on the very next query with no restart needed.

No ranking, no relevance scoring — the PRD rules that out ("plain
substring"). Matching is case-insensitive plain substring, on the filename
(title) and on file body text.
"""

try:
    from . import library
except ImportError:
    # Fallback for testing / direct execution (mirrors library.py's own
    # dual-import pattern, since this module may run outside a package
    # context — see server.py, which imports it the same way).
    import library


# Excerpt window: how much context to keep on each side of a body match,
# in characters. Purely a display convenience — has no bearing on whether
# something matches.
_EXCERPT_CONTEXT = 60
_EXCERPT_MAX = 160


def search(query):
    """
    Search every unsealed store for `query`, grouped by store.

    Args:
        query: str — plain text to search for, case-insensitive substring.

    Returns:
        list[dict] — one entry per store that has at least one hit, in the
        same order `library.list_stores()` returns them:
            {"store": "<folder name>",
             "hits": [{"filename", "relpath", "kind": "title"|"body",
                       "excerpt", "line"}]}

        An empty or whitespace-only query returns [] — there is nothing to
        substring-match against.

    FR-7/AC-1: a sealed store never appears here at all — not as an empty
    group, not as a count. `library.list_stores()` already excludes sealed
    stores, and `library.list_store()` / `library.read_store_file()` each
    re-check the seal gate per file, so a single sealed file inside an
    otherwise-open store is silently skipped the same way.

    FR-5/AC-3: a title match and a body match are visibly distinguished —
    `kind` is "title" whenever the query appears in the filename, even if
    it also appears in the body (title takes precedence for that file, one
    hit per file, never two rows for the same file/query pair). Otherwise,
    if the query appears anywhere in the body, `kind` is "body" and `line`
    names the first matching line (1-indexed).

    Binary/undecodable files (`library.read_store_file()` returns
    `{"text": None, "binary": True}`) can still title-match (the filename
    check needs no body read) but are skipped for body matching — there is
    no text to search, and this must never crash or match against None.
    """
    if not query or not query.strip():
        return []

    needle = query.lower()
    groups = []

    for store_info in library.list_stores():
        store = store_info["folder"]
        files = library.list_store(store)
        if not files:
            continue

        hits = []
        for entry in files:
            filename = entry["filename"]
            relpath = entry["relpath"]

            if needle in filename.lower():
                hits.append({
                    "filename": filename,
                    "relpath": relpath,
                    "kind": "title",
                    "excerpt": filename,
                    "line": None,
                })
                continue

            # Title didn't match — only now do we pay for a body read.
            file_data = library.read_store_file(store, filename)
            if file_data is None or file_data is library.SEALED:
                # Sealed-after-all, or vanished between listing and read —
                # either way, no hit, and definitely no crash.
                continue
            if file_data.get("binary"):
                continue

            text = file_data.get("text")
            if not text:
                continue

            match = _first_body_match(text, needle)
            if match is None:
                continue

            line_no, excerpt = match
            hits.append({
                "filename": filename,
                "relpath": relpath,
                "kind": "body",
                "excerpt": excerpt,
                "line": line_no,
            })

        if hits:
            groups.append({"store": store, "hits": hits})

    return groups


def _first_body_match(text, needle):
    """
    Find the first line of `text` containing `needle` (already lowercased),
    case-insensitively. Returns (line_number, excerpt) with line_number
    1-indexed, or None if there is no match.
    """
    for i, line in enumerate(text.splitlines(), start=1):
        idx = line.lower().find(needle)
        if idx != -1:
            return i, _excerpt(line, idx, len(needle))
    return None


def _excerpt(line, idx, needle_len):
    """
    Trim a matching line down to a short excerpt centred on the match, with
    an ellipsis on either side that got cut off. Purely cosmetic — never
    affects whether something is considered a match.
    """
    stripped = line.strip()
    # Recompute idx against the stripped line (leading whitespace removed).
    lead_trim = len(line) - len(line.lstrip())
    idx = max(0, idx - lead_trim)

    start = max(0, idx - _EXCERPT_CONTEXT)
    end = min(len(stripped), idx + needle_len + _EXCERPT_CONTEXT)
    excerpt = stripped[start:end]

    if len(excerpt) > _EXCERPT_MAX:
        excerpt = excerpt[:_EXCERPT_MAX]

    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(stripped) else ""
    return f"{prefix}{excerpt}{suffix}"

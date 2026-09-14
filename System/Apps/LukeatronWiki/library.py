"""
library.py — the ONLY module that touches Long-Term / LukeatronWiki on disk.

Every read anywhere else in the app (render, search, ...) must go through this
module's functions. Every function here consults `seal` before returning
anything (FR-9): there is exactly one place the privacy gate can go wrong.

No cache, no database, no module-level memoisation of content (FR-8). Every
call hits disk fresh, every time.
"""

import mimetypes
import os
import re
from pathlib import Path

try:
    from . import paths, seal, yamlio
except ImportError:
    # Fallback for testing / direct execution
    import paths
    import seal
    import yamlio


# ============================================================================
# Module-level sentinel — distinct from None. None means "not found" /
# "doesn't exist"; SEALED means "exists, but you may not have it."
# ============================================================================
SEALED = object()

# Recognised text suffixes. Anything else is treated as binary (decision:
# see read_store_file's docstring) rather than guessed at with a codec.
_TEXT_SUFFIXES = {
    ".md", ".table.md", ".list.md", ".notes.md", ".review.md", ".mem.md",
    ".map.md", ".yaml", ".yml", ".txt", ".log", ".json", ".csv", ".css",
    ".htm", ".html", ".xml", ".sql", ".conf", ".asc",
}


# ============================================================================
# Internal helpers
# ============================================================================


def _compound_suffix(filename):
    """
    Return the "meaningful" suffix of a filename, honouring compound
    extensions like `.table.md` / `.list.md` / `.notes.md` / `.review.md` /
    `.mem.md` / `.map.md` that the store-file naming convention uses.
    Falls back to the plain suffix (e.g. ".png") otherwise.
    """
    name = filename
    parts = name.split(".")
    if len(parts) >= 3:
        candidate = "." + ".".join(parts[-2:])
        if candidate.lower() in _TEXT_SUFFIXES:
            return candidate
    return Path(name).suffix


def _is_hidden(filename):
    return filename.startswith(".")


def _is_safe_relative_subpath(rel):
    """
    Cheap, string-level pre-check for a relative subpath under a store (or
    `_media/`): is this SHAPED like a plain descent into a subfolder, with
    no obvious escape attempt?

    This is deliberately just a fast-fail filter, NOT the security
    boundary — it exists so an obviously-hostile string never even reaches
    `Path.resolve()`. The check that actually matters is the post-resolve
    containment check in `_resolve_store_path` / `media_bytes`, which is
    what catches the traversal attempts that survive this pre-check
    (e.g. a symlink planted inside the store that itself points outside
    `Memory/Long-Term/` — no string inspection of the requested name can
    ever detect that).

    Allows: any depth of subfolder ("2_Corinthians/2_Cor_Series_prep.md"),
    spaces, a leading space in a folder name, colons in a filename — all of
    which are real, present-on-disk names in this repo's stores.

    Rejects (by shape, before resolve() ever runs):
      - empty, ".", or ".." as the whole string or any "/"-separated segment
      - a leading "/" (an absolute POSIX path)
      - a backslash anywhere (never a legitimate separator here; also the
        shape of a Windows-style path or UNC prefix, e.g. "\\\\server\\share")
      - a drive-letter prefix ("C:", "C:/...")
    """
    if not rel:
        return False
    if "\\" in rel:
        return False
    if rel.startswith("/"):
        return False
    if re.match(r"^[A-Za-z]:", rel):
        return False
    for part in rel.split("/"):
        if part in ("", ".", ".."):
            return False
    return True


def _resolve_store_path(store, filename):
    """
    Resolve `store`/`filename` to an absolute path, refusing to leave the
    store's own folder under `Memory/Long-Term/`.

    `filename` is untrusted input straight off a URL (per the build brief).
    Two separable concerns, checked independently:

      1. ALLOW — `filename` may be a relative subpath of any depth. Real
         Long-Term stores nest freely (sermon-prep series folders, "Bible
         Reports/", etc.) — a flat-filename-only API silently drops most of
         a store's content, which is not conservatism, it's a bug.
      2. REJECT — every escape shape: `..` in any segment, an absolute
         path, a drive-letter/UNC prefix (`_is_safe_relative_subpath`,
         cheap and string-level), AND — the check that actually matters —
         containment of the fully `Path.resolve()`d result under
         `Memory/Long-Term/`, which is what catches a symlink planted
         inside the store that points outside the tree. String inspection
         alone can never catch that; only the post-resolve check can.

    Returns the resolved absolute Path, or None if the request is unsafe or
    the store itself doesn't exist as a direct child of `Memory/Long-Term/`.
    """
    if not store or not filename:
        return None

    # Store must be a single path segment directly under LT, no traversal.
    if "/" in store or "\\" in store or store in (".", ".."):
        return None

    # Filename: allow any relative subpath, reject anything escape-shaped.
    if not _is_safe_relative_subpath(filename):
        return None

    store_dir = (paths.LT / store).resolve()

    # Containment check: the store folder itself must actually live under LT.
    try:
        store_dir.relative_to(paths.LT.resolve())
    except ValueError:
        return None

    candidate = (store_dir / filename).resolve()

    # Final containment check on the fully resolved path — the real
    # defence. Catches symlinks (file- or directory-level, at any depth in
    # the subpath) that point outside Memory/Long-Term/, and any ".." that
    # survived the string-level pre-check.
    try:
        candidate.relative_to(paths.LT.resolve())
    except ValueError:
        return None

    return candidate


def _iter_store_files(store):
    """
    Yield (relpath, path) for every real, non-hidden file anywhere under a
    store folder, at any depth.

    Recursive: nested subfolders (sermon-prep series folders, "Bible
    Reports/", Bible's SWORD-module machinery, etc.) are completely normal
    in this repo's Long-Term stores. `read_store_file`'s own signature
    (`store, filename`) already accepts a relative subpath — see
    `_resolve_store_path` — so a listing that stopped at the top level
    would simply be wrong, not conservative: it is the earlier defect this
    fix corrects, applied to enumeration instead of single-file reads.

    `relpath` is the file's path relative to the store's own root, using
    forward slashes, so it round-trips straight back through
    `read_store_file(store, relpath)`.

    Directories are walked with `followlinks=False` — a symlinked
    subfolder is not descended into, the same "no escape via symlink"
    discipline `_resolve_store_path` enforces on individual file reads.
    Hidden entries (dotfiles/dotfolders, e.g. `.DS_Store`) are excluded at
    every level, not just the top.
    """
    store_dir = paths.LT / store
    if not store_dir.is_dir():
        return
    for dirpath, dirnames, filenames in os.walk(store_dir, followlinks=False):
        # Prune hidden directories in place so os.walk never descends into
        # them, and keep traversal order deterministic.
        dirnames[:] = sorted(d for d in dirnames if not _is_hidden(d))
        current = Path(dirpath)
        for name in sorted(filenames):
            if _is_hidden(name):
                continue
            full = current / name
            if not full.is_file():
                continue
            relpath = full.relative_to(store_dir).as_posix()
            yield relpath, full


def _themes():
    """Read the themes: block of _index.yaml -> list of {name, folder, hub_slug}."""
    index = yamlio.load(paths.INDEX_YAML)
    themes = index.get("themes") if isinstance(index, dict) else None
    return themes if isinstance(themes, list) else []


def _hub_slug_for_store(store):
    """Look up the hub_slug for a store folder name from _index.yaml's themes:, or None."""
    for theme in _themes():
        if not isinstance(theme, dict):
            continue
        folder = theme.get("folder") or ""
        # folder is written like "Memory/Long-Term/Theology" — compare basename.
        if Path(str(folder)).name == store:
            hub = theme.get("hub_slug")
            return hub if isinstance(hub, str) and hub else None
    return None


def _display_name_for_store(store):
    for theme in _themes():
        if not isinstance(theme, dict):
            continue
        folder = theme.get("folder") or ""
        if Path(str(folder)).name == store:
            name = theme.get("name")
            if isinstance(name, str) and name:
                return name
    return store


def _split_frontmatter(text):
    """
    Split a node file's leading `---\\n ... \\n---` YAML frontmatter block
    from its markdown body. Returns (fm_dict, body_str). If there is no
    well-formed frontmatter block, returns ({}, text) unchanged.
    """
    if not text.startswith("---"):
        return {}, text

    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, text

    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break

    if end_idx is None:
        return {}, text

    fm_text = "\n".join(lines[1:end_idx])
    body = "\n".join(lines[end_idx + 1:])
    # Preserve the file's convention of a blank line after the closing ---.
    if body.startswith("\n"):
        body = body[1:]

    fm = yamlio.parse(fm_text)
    if not isinstance(fm, dict):
        fm = {}
    return fm, body


def _parse_longterm_refs(fm):
    """
    Turn the frontmatter's `longterm_refs` list (strings shaped
    "Label :: relpath") into [{"label","relpath","sealed"}], each checked
    against `seal.is_sealed()`.
    """
    raw = fm.get("longterm_refs")
    out = []
    if not isinstance(raw, list):
        return out
    for entry in raw:
        if not isinstance(entry, str):
            continue
        if "::" in entry:
            label, relpath = entry.split("::", 1)
            label = label.strip()
            relpath = relpath.strip()
        else:
            label = entry.strip()
            relpath = entry.strip()
        out.append({
            "label": label,
            "relpath": relpath,
            "sealed": seal.is_sealed(relpath) if relpath else False,
        })
    return out


def _extract_wikilinks(body):
    """Pull out every [[slug]] target from a node's markdown body, in order, deduped."""
    import re
    seen = []
    for m in re.finditer(r"\[\[([a-zA-Z0-9_\-]+)\]\]", body or ""):
        slug = m.group(1)
        if slug not in seen:
            seen.append(slug)
    return seen


def _node_path(slug):
    if not slug or "/" in slug or "\\" in slug or ".." in slug:
        return None
    return paths.NODES / f"{slug}.md"


def _read_node_raw(slug):
    """Read + parse a node file with no seal-filtering decisions applied. Internal use."""
    p = _node_path(slug)
    if p is None or not p.is_file():
        return None
    try:
        text = p.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return None

    fm, body = _split_frontmatter(text)
    refs = _parse_longterm_refs(fm)

    return {
        "slug": fm.get("slug") or slug,
        "title": fm.get("title") or slug,
        "fm": fm,
        "body": body,
        "longterm_refs": refs,
        "wikilinks": _extract_wikilinks(body),
        "emoji": fm.get("emoji"),
        "type": fm.get("type"),
        "format": fm.get("format"),
        "status": fm.get("status"),
        "tags": fm.get("tags") if isinstance(fm.get("tags"), list) else [],
        "updated": fm.get("updated"),
        "thumbnail": fm.get("thumbnail"),
    }


def _node_is_fully_sealed(node):
    """A node whose every longterm_ref is sealed (or whose slug is a sealed hub) is hidden."""
    refs = [r["relpath"] for r in node["longterm_refs"]]
    return seal.is_sealed_link(node["slug"], refs)


# ============================================================================
# Public API
# ============================================================================


def read_store_file(store, filename):
    """
    Return the verbatim content of a file under Memory/Long-Term/<store>/.

    Returns:
        SEALED  — the path is sealed (whole store, or this exact file)
        None    — the store/file doesn't exist, the request is unsafe
                  (traversal attempt), or the filename is hidden
        dict    — {"store","filename","relpath","text","suffix"} on success.
                  A file this app cannot decode as UTF-8 text (binary: .png,
                  .pdf, .pages, .bzz, etc. — decision, see below) is still
                  returned as a dict but with "text": None and "binary": True
                  set, so callers can offer a download/media link instead of
                  crashing or mangling bytes with a guessed codec.

    FR-1: content is returned verbatim — no normalising, no stripping.
    Binary-file decision: files are UTF-8 (per the build brief); a decode
    failure is handled explicitly (UnicodeDecodeError caught, "text": None,
    "binary": True) rather than silently reading with errors="ignore", which
    would quietly corrupt the very "untouched words" guarantee FR-1 exists
    for. This is not in the contract's dict shape verbatim, but a dict may
    carry additional keys without violating it.
    """
    if _is_hidden(filename or ""):
        return None

    relpath = f"{store}/{filename}" if store else filename
    if seal.is_sealed(relpath) or seal.is_sealed_store(store):
        return SEALED

    resolved = _resolve_store_path(store, filename)
    if resolved is None:
        return None
    if not resolved.is_file():
        return None

    # Re-check seal on the fully resolved, normalised path too — belt and
    # braces against any prefix-matching edge case in seal.is_sealed().
    if seal.is_sealed(resolved):
        return SEALED

    suffix = _compound_suffix(filename)

    try:
        raw = resolved.read_bytes()
    except OSError:
        return None

    try:
        text = raw.decode("utf-8")
        binary = False
    except UnicodeDecodeError:
        text = None
        binary = True

    return {
        "store": store,
        "filename": filename,
        "relpath": paths.store_rel(resolved),
        "text": text,
        "suffix": suffix,
        "binary": binary,
    }


def list_store(store):
    """
    List every file in a store, at any depth.

    Recursive (see `_iter_store_files`): "filename" here is the file's path
    relative to the store's own root, using forward slashes, so a nested
    file's "filename" may itself contain "/" (e.g.
    "2_Corinthians/2_Cor_Series_prep.md") — it is not a bare basename. This
    is the shape `read_store_file(store, filename)` already accepts, so the
    two stay round-trippable: `read_store_file(store, f["filename"])` works
    for every row this returns.

    Returns:
        None        — the store is sealed (FR-2: nothing at all, not an
                      empty list with a reason — its existence must not be
                      inferable from the return shape)
        list[dict]  — [{"filename","relpath","suffix"}], possibly empty,
                      for an unsealed (including non-existent) store
    """
    if seal.is_sealed_store(store):
        return None

    out = []
    for filename, path in _iter_store_files(store):
        relpath = f"{store}/{filename}"
        if seal.is_sealed(relpath):
            # A single sealed file inside an otherwise-unsealed store: FR-9
            # applies per-file too, so it is simply omitted from the listing.
            continue
        out.append({
            "filename": filename,
            "relpath": relpath,
            "suffix": _compound_suffix(filename),
        })
    return out


def list_stores():
    """
    List the unsealed subject stores under Memory/Long-Term/.

    Returns:
        list[dict] — {"name","folder","relpath","file_count","hub_slug"} for
        every unsealed subject store. Sealed stores and the wiki's own
        control surface (`LukeatronWiki/`) are excluded entirely.
    """
    out = []
    if not paths.LT.is_dir():
        return out

    for child in sorted(paths.LT.iterdir(), key=lambda p: p.name.lower()):
        if not child.is_dir():
            continue
        name = child.name
        if _is_hidden(name):
            continue
        if name == paths.WIKI.name:
            continue  # the wiki's own control surface, not a subject store
        if seal.is_sealed_store(name):
            continue

        file_count = sum(1 for _ in _iter_store_files(name))
        out.append({
            "name": _display_name_for_store(name),
            "folder": name,
            "relpath": name,
            "file_count": file_count,
            "hub_slug": _hub_slug_for_store(name),
        })

    return out


def read_node(slug):
    """
    Read a wiki node's frontmatter + body + resolved longterm_refs.

    Returns:
        None — no such node file
        dict — {"slug","title","fm","body",
                "longterm_refs":[{"label","relpath","sealed"}],
                "wikilinks":[slug],"emoji","type","format","status","tags",
                "updated","thumbnail"}

    Note: this never returns store-file CONTENT (FR-9's concern) — only the
    node's own body text (Luke's/the wiki's connective prose) and pointer
    metadata about where store content lives, with each pointer already
    flagged sealed/unsealed so callers never have to re-derive that.
    """
    return _read_node_raw(slug)


def list_nodes():
    """
    List every wiki node, seal-filtered.

    A node is omitted when it (per `seal.is_sealed_link`) is entirely a
    pointer into sealed material — i.e. it would resolve as a "sealed" link
    everywhere else in the app, so it's also withheld from surfaces (like
    capture's page dropdown) that would otherwise reveal its existence.
    """
    out = []
    if not paths.NODES.is_dir():
        return out

    for child in sorted(paths.NODES.iterdir(), key=lambda p: p.name.lower()):
        if not child.is_file() or child.suffix != ".md" or _is_hidden(child.name):
            continue
        slug = child.stem
        node = _read_node_raw(slug)
        if node is None:
            continue
        if _node_is_fully_sealed(node):
            continue
        out.append(node)

    return out


def resolve_wikilink(slug):
    """
    Resolve a [[slug]] wikilink to exactly one of three states.

    Returns:
        {"state": "live", "slug": slug, "title": <title>}
        {"state": "sealed", "slug": slug, "title": None}
        {"state": "unresolved", "slug": slug, "title": None}

    FR-4 / privacy requirement: a sealed target NEVER returns "unresolved" —
    that would let render draw a red link, which reveals the target exists
    and invites someone to create it. The sealed check runs first and does
    not depend on whether a node file happens to exist.
    """
    node = _read_node_raw(slug)
    refs = [r["relpath"] for r in node["longterm_refs"]] if node else []

    if seal.is_sealed_link(slug, refs):
        return {"state": "sealed", "slug": slug, "title": None}

    if node is not None:
        return {"state": "live", "slug": slug, "title": node["title"]}

    return {"state": "unresolved", "slug": slug, "title": None}


def backlinks(slug):
    """
    "What links here" — every OTHER node whose body contains [[slug]] or
    whose frontmatter `related:` list names it, computed live by re-walking
    every node on every call (AD-1: no index, no cache, no memo).

    Returns:
        list[dict] — [{"slug","title"}], for unsealed linking nodes only,
        excluding the target itself.
    """
    out = []
    if not paths.NODES.is_dir():
        return out

    for child in sorted(paths.NODES.iterdir(), key=lambda p: p.name.lower()):
        if not child.is_file() or child.suffix != ".md" or _is_hidden(child.name):
            continue
        other_slug = child.stem
        if other_slug == slug:
            continue
        node = _read_node_raw(other_slug)
        if node is None or _node_is_fully_sealed(node):
            continue

        related = node["fm"].get("related")
        related = related if isinstance(related, list) else []

        if slug in node["wikilinks"] or slug in related:
            out.append({"slug": node["slug"], "title": node["title"]})

    return out


def contents_page(store):
    """
    A store's plain contents page (PRD/OQ-1): distinguishes a genuinely
    empty store from one with files but no matching wiki node.

    Returns:
        SEALED — the store is sealed (FR-9: no content, no state hint, for
                 a sealed path under any name — the contract's documented
                 shape doesn't show this branch, but FR-9 requires it; see
                 the disagreement note in the build report)
        dict   — {"store","state","files"} where state is one of:
                 "empty"         — zero files in the store
                 "has-node"      — files present AND a wiki hub node exists
                 "awaiting-node" — files present, no matching hub node yet

    Nested files (design decision): "files" is `list_store(store)` verbatim
    — a FLAT list of {"filename","relpath","suffix"} rows, where "filename"
    may itself contain "/" for a nested file (e.g.
    "2_Corinthians/2_Cor_Series_prep.md"), rather than a tree grouped by
    subfolder. Chosen over grouping because render.spec.md's FR-6 is
    explicit that contents-page rendering uses `library.contents_page()`
    "verbatim — a file listing, no prose added"; a flat list needs no
    interpretation to render, a grouped tree would. This keeps the return
    shape's existing keys unchanged from before this fix — no additive key
    was needed here, unlike list_store's per-row "filename" values (which
    already covered nested paths via the same shared list_store() call).
    """
    if seal.is_sealed_store(store):
        return SEALED

    files = list_store(store)
    if files is None:
        # Defensive: list_store just told us it's sealed after all.
        return SEALED

    if not files:
        return {"store": store, "state": "empty", "files": files}

    hub_slug = _hub_slug_for_store(store)
    has_node = False
    if hub_slug:
        has_node = _node_path(hub_slug) is not None and _node_path(hub_slug).is_file()

    state = "has-node" if has_node else "awaiting-node"
    return {"store": store, "state": state, "files": files}


def integrity_counts():
    """
    Aggregate the numbers the on-screen integrity footer shows.

    Returns:
        {"stores","files","rendered","sealed","unindexed","dead_links",
         "one_way_edges"}

    FR-7 / AC-5: "sealed" is read from seal.count()["total"], never
    recomputed independently — there is exactly one source of truth for
    that number.
    """
    stores = list_stores()
    total_files = 0
    for s in stores:
        total_files += s["file_count"]

    nodes = list_nodes()
    node_slugs = {n["slug"] for n in nodes}

    # unindexed: unsealed store files that no live node's longterm_refs
    # points at (a rough, live-computed coverage gap indicator).
    referenced_relpaths = set()
    for n in nodes:
        for ref in n["longterm_refs"]:
            if not ref["sealed"]:
                referenced_relpaths.add(ref["relpath"])

    unindexed = 0
    for s in stores:
        for f in list_store(s["folder"]) or []:
            if f["relpath"] not in referenced_relpaths:
                unindexed += 1

    dead_links = 0
    one_way_edges = 0
    for n in nodes:
        for target in n["wikilinks"]:
            res = resolve_wikilink(target)
            if res["state"] == "unresolved":
                dead_links += 1
            elif res["state"] == "live":
                back = backlinks(target)
                if n["slug"] not in {b["slug"] for b in back}:
                    one_way_edges += 1

    return {
        "stores": len(stores),
        "files": total_files,
        "rendered": len(nodes),
        "sealed": seal.count()["total"],
        "unindexed": unindexed,
        "dead_links": dead_links,
        "one_way_edges": one_way_edges,
    }


def read_queue():
    """
    Read _queue.yaml (the read/watch/write backlog).

    FR-10: graceful-empty, not fail-closed — a missing, empty, or
    unparseable _queue.yaml (a pre-existing !IdeaWiki fixture this project
    doesn't create — FR-11) degrades to an empty backlog, never an
    exception. This is deliberately the opposite direction from seal's
    fail-closed behaviour on a bad _sealed.yaml: the risk here is a blank
    backlog panel, not an exposed sealed store.
    """
    data = yamlio.load(paths.QUEUE_YAML)
    if not isinstance(data, dict):
        return {"items": []}
    items = data.get("items")
    if not isinstance(items, list):
        items = []
    result = dict(data)
    result["items"] = items
    return result


def read_index():
    """
    Read _index.yaml (the node catalogue: themes/tags/pages).

    FR-10: graceful-empty on a missing/malformed _index.yaml — returns an
    empty index structure, never an exception.
    """
    data = yamlio.load(paths.INDEX_YAML)
    if not isinstance(data, dict):
        data = {}
    data.setdefault("themes", [])
    data.setdefault("tags", {})
    data.setdefault("pages", [])
    return data


def media_bytes(name):
    """
    Read a thumbnail from LukeatronWiki/_media/ by filename.

    Returns:
        (bytes, mimetype) — on success
        None — the file is missing, `_media/` itself is missing, the
              filename (or any segment of a nested subpath) is hidden, or
              the request tries to escape `_media/` (FR-10 graceful-empty;
              also the same allow-nested/reject-escape discipline as
              `read_store_file` — see `_is_safe_relative_subpath` and
              `_resolve_store_path` — applied to this second untrusted-name
              entry point, in case `_media/` ever grows subfolders)
    """
    if not name or any(_is_hidden(part) for part in name.split("/")):
        return None
    if not _is_safe_relative_subpath(name):
        return None

    media_dir = paths.MEDIA
    if not media_dir.is_dir():
        return None

    candidate = (media_dir / name).resolve()
    try:
        candidate.relative_to(media_dir.resolve())
    except ValueError:
        return None

    if not candidate.is_file():
        return None

    try:
        data = candidate.read_bytes()
    except OSError:
        return None

    mimetype, _ = mimetypes.guess_type(candidate.name)
    return data, (mimetype or "application/octet-stream")

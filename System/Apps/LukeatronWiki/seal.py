"""
Seal module — loads _sealed.yaml and provides privacy checks for sealed paths.

A sealed path is not read, not rendered, not searched, not linked, not listed.

Critical behaviour (spec AD-1): re-parse _sealed.yaml on EVERY call.
No caching of any kind. A hand-edit must be seen with no restart.

FR-7/FR-8 Failure handling: distinguish between manifest-missing/unreadable/malformed (FR-7: fail closed,
seal everything) and manifest-present-but-empty (FR-8: legitimate empty state, seal nothing).
"""

from pathlib import Path
import sys

try:
    from . import paths, yamlio
except ImportError:
    # Fallback for testing
    import paths
    import yamlio


def load():
    """
    Load and parse _sealed.yaml. Re-parsed on every call (spec AD-1).

    Returns:
        {
            "stores": set[str],
            "files": set[str],
            "_failure": bool  # True if manifest absent, unreadable, or malformed (FR-7)
        }

    FR-7 failure states: file doesn't exist, file unreadable, file has invalid YAML,
    file has valid YAML but wrong structure (stores/files not lists).

    FR-8 legitimate state: file exists, parses cleanly, stores and files are lists
    (even if empty).
    """
    # Check if file exists
    if not paths.SEALED_YAML.exists():
        # File doesn't exist - FR-7 failure
        _log_manifest_failure("manifest file not found")
        return {"stores": set(), "files": set(), "_failure": True}

    # File exists; try to parse it
    data = yamlio.load(paths.SEALED_YAML)

    # If yamlio returned empty dict, parsing failed - FR-7 failure
    if data == {}:
        _log_manifest_failure("manifest file failed to parse (invalid YAML)")
        return {"stores": set(), "files": set(), "_failure": True}

    stores = set()
    files = set()
    is_malformed = False

    # Load sealed stores (normalize to POSIX paths relative to LT)
    if "stores" in data:
        if isinstance(data["stores"], list):
            for store_name in data["stores"]:
                if isinstance(store_name, str):
                    stores.add(store_name)
        else:
            # stores key exists but is not a list - malformed - FR-7 failure
            is_malformed = True
    # If "stores" key is missing, that's OK — it defaults to empty list (FR-8)

    # Load sealed files (normalize to POSIX paths relative to LT)
    if "files" in data:
        if isinstance(data["files"], list):
            for file_path in data["files"]:
                if isinstance(file_path, str):
                    files.add(file_path)
        else:
            # files key exists but is not a list - malformed - FR-7 failure
            is_malformed = True
    # If "files" key is missing, that's OK — it defaults to empty list (FR-8)

    if is_malformed:
        _log_manifest_failure("manifest file has invalid structure (stores/files must be lists)")
        return {"stores": set(), "files": set(), "_failure": True}

    # File exists, parsed successfully, structure is valid - FR-8 (legitimate state, even if empty)
    return {"stores": stores, "files": files, "_failure": False}


def is_sealed(path):
    """
    Check if a path is sealed.

    Rules (spec AD-2):
    - File seals match exactly (relative to LT)
    - Store seals match by folder-path prefix (full path segment matching, not raw prefix)

    FR-7 behavior: if manifest is absent/unreadable/malformed, EVERY path is sealed.

    Args:
        path: str, Path, or pathlib.Path (absolute or relative to LT)

    Returns:
        bool: True if the path is sealed
    """
    # Normalize the path to a relative-to-LT POSIX string
    normalized = _normalize_to_relative(path)

    manifest = load()

    # FR-7: If manifest failed to load, everything is sealed
    if manifest.get("_failure", False):
        return True

    stores = manifest["stores"]
    files = manifest["files"]

    # Check exact file match first
    if normalized in files:
        return True

    # Check store prefix match (full path segments, not raw string prefix)
    # A path is under a sealed store if it starts with the store name as a full segment
    for store_name in stores:
        # The store name is a single segment (e.g., "People", "Tone")
        # A path is under this store if it's either:
        # 1. Exactly the store name
        # 2. Starts with "store_name/" (store name plus slash)
        if normalized == store_name or normalized.startswith(store_name + "/"):
            return True

    return False


def is_sealed_store(store):
    """
    Check if a store folder is sealed.

    FR-7 behavior: if manifest is absent/unreadable/malformed, EVERY store is sealed.

    Args:
        store: str (folder name, e.g., "People", "Tone")

    Returns:
        bool: True if the store is sealed
    """
    manifest = load()

    # FR-7: If manifest failed to load, everything is sealed
    if manifest.get("_failure", False):
        return True

    return store in manifest["stores"]


def is_sealed_link(slug, refs):
    """
    Check if a wikilink should render as plain text (sealed).

    A link is sealed if:
    - The slug is the kebab-case hub slug of a sealed store, OR
    - refs is non-empty and EVERY ref is sealed

    FR-7 behavior: if manifest is absent/unreadable/malformed, EVERY link is sealed.

    Args:
        slug: str (kebab-case hub slug, e.g., "people", "tone")
        refs: list of str (paths relative to LT from the node's longterm_refs)

    Returns:
        bool: True if the link should render as plain text
    """
    manifest = load()

    # FR-7: If manifest failed to load, everything is sealed
    if manifest.get("_failure", False):
        return True

    stores = manifest["stores"]

    # Check if slug matches any sealed store's hub slug
    # Hub slug is kebab-case version of store name
    for store_name in stores:
        # Convert store name to hub slug: CamelCase/with-spaces -> kebab-case
        # e.g., "Writing Non-Fiction" -> "writing-non-fiction"
        hub_slug = store_name.lower().replace(" ", "-")
        if slug == hub_slug:
            return True

    # Check if refs is non-empty and ALL refs are sealed
    if refs:
        return all(is_sealed(ref) for ref in refs)

    return False


def count():
    """
    Return counts of sealed stores and files for the integrity footer.

    FR-7 behavior: if manifest is absent/unreadable/malformed, return None for counts
    and add "_failure": True to signal the failure state to the caller (render module).
    This is distinct from the legitimate FR-8 state (empty manifest), which returns
    all counts as 0.

    Returns:
        {
            "stores": int or None,
            "files": int or None,
            "total": int or None,
            "_failure": bool (present only if True)
        }
    """
    manifest = load()

    # FR-7: If manifest failed to load, return error indicator
    if manifest.get("_failure", False):
        return {
            "stores": None,
            "files": None,
            "total": None,
            "_failure": True
        }

    # FR-8: Normal state (manifest exists, parsed cleanly)
    stores = len(manifest["stores"])
    files = len(manifest["files"])
    total = stores + files

    return {"stores": stores, "files": files, "total": total}


# ============================================================================
# Private helpers
# ============================================================================


def _log_manifest_failure(reason):
    """
    Log a manifest failure to stderr (visible in server logs).
    Called when FR-7 failure conditions are detected.

    Args:
        reason: str describing why the manifest failed
    """
    msg = f"[SEAL] CRITICAL: _sealed.yaml failure: {reason} — treating all paths as sealed (FR-7)"
    print(msg, file=sys.stderr)


def _normalize_to_relative(path):
    """
    Normalize a path to a relative-to-LT POSIX string.

    Args:
        path: str, Path, or pathlib.Path (absolute or relative)

    Returns:
        str: normalized path relative to LT, using forward slashes
    """
    if isinstance(path, str):
        path = Path(path)
    elif not isinstance(path, Path):
        path = Path(path)

    # If it's not absolute, assume it's relative to LT
    if not path.is_absolute():
        path = (paths.LT / path).resolve()
    else:
        path = path.resolve()

    # Compute relative to LT
    try:
        rel = path.relative_to(paths.LT)
        return rel.as_posix()
    except ValueError:
        # Path is outside LT; this shouldn't happen in normal use
        # Return as-is (absolute posix)
        return path.as_posix()

"""
Minimal stdlib-only YAML reader, tuned to LukeatronWiki's controlled file formats.
Handles: scalars (quoted/bare), null/~/empty, inline [a,b,c], inline {}, block lists
of scalars, block lists of dicts (including entries whose own values are inline
lists or nested maps), and nested mappings — all to arbitrary depth, with comments
and blank lines permitted anywhere (before, inside, or after any block).

No PyYAML dependency.

Failure philosophy: a construct this parser cannot recognise is never silently
dropped or turned into a `None` that looks like valid content. It raises
internally (`YamlParseError`), and `parse()`/`load()` translate that into the
existing "empty dict" failure signal the rest of the app already treats as
"this file did not parse" (see seal.py's FR-7 handling, which checks for an
empty dict as its invalid-YAML signal). So the external contract — parse(text)
-> dict, load(path) -> dict, {} on failure — is unchanged, but a failure now
means "the whole document was flagged as unparseable," never "a field quietly
became None while looking fine."
"""

import re
from pathlib import Path


class YamlParseError(Exception):
    """Raised internally when a line/construct cannot be parsed.

    Never escapes parse()/load() — both catch it and fall back to the
    existing {} failure contract — but it prevents a genuinely malformed or
    unsupported construct from being silently swallowed into `None` or from
    quietly dropping the rest of a block, which is how the two shipped
    defects (comment-before-block-list, nested mappings) went unnoticed.
    """


def parse(text):
    """
    Parse a YAML string into a dict.

    Args:
        text: YAML string

    Returns:
        dict: parsed YAML (empty dict if parsing fails)
    """
    if not text or not text.strip():
        return {}

    try:
        lines = text.splitlines()
        root, next_i = _parse_map(lines, 0, 0)
        # Anything left over at indent 0 that _parse_map didn't consume means
        # the document wasn't a single well-formed top-level mapping (e.g. a
        # top-level block list). Treat that the same as any other malformed
        # document rather than silently returning a partial result.
        i = _skip_blank_comments(lines, next_i)
        if i < len(lines):
            raise YamlParseError(f"unexpected content at line {i + 1}: {lines[i]!r}")
        return root if isinstance(root, dict) else {}
    except YamlParseError:
        return {}
    except Exception:
        return {}


def load(path):
    """
    Load and parse a YAML file. Returns {} if the file doesn't exist or fails to parse.

    Args:
        path: str or Path

    Returns:
        dict: parsed YAML
    """
    path = Path(path)
    if not path.exists():
        return {}

    try:
        text = path.read_text(encoding="utf-8")
        return parse(text)
    except Exception:
        return {}


def dump_scalar(value):
    """
    Safely quote a scalar value for writing YAML.

    Args:
        value: any scalar value

    Returns:
        str: properly quoted YAML scalar
    """
    if value is None:
        return "~"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)

    # Convert to string
    s = str(value)

    # If it's empty, return quoted empty string
    if not s:
        return '""'

    # If it looks like a special value, quote it
    if s.lower() in ("null", "~", "true", "false", "yes", "no", "on", "off"):
        return f'"{s}"'

    # If it contains special characters or starts/ends with space, quote it
    if (
        any(c in s for c in ":\n\r#[]{},'\"@`")
        or s[0] in " -?*&!"
        or s[-1] in " :"
        or " #" in s
    ):
        # Escape internal quotes
        escaped = s.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'

    return s


# ============================================================================
# Private parsing machinery
# ============================================================================


def _indent_of(line):
    return len(line) - len(line.lstrip(" "))


def _is_comment_or_blank(line):
    s = line.strip()
    return s == "" or s.startswith("#")


def _skip_blank_comments(lines, i):
    """Advance i past any blank or full-line-comment lines."""
    while i < len(lines) and _is_comment_or_blank(lines[i]):
        i += 1
    return i


def _strip_inline_comment(line):
    """Remove a trailing ` #comment` from a line, respecting quoted strings.

    A '#' inside a quoted string is data, not a comment, and must survive.
    """
    in_quote = False
    quote_char = None
    prev = ""
    for idx, ch in enumerate(line):
        if in_quote:
            if ch == quote_char and prev != "\\":
                in_quote = False
                quote_char = None
        else:
            if ch in ('"', "'"):
                in_quote = True
                quote_char = ch
            elif ch == "#" and (idx == 0 or line[idx - 1] in (" ", "\t")):
                return line[:idx].rstrip()
        prev = ch
    return line.rstrip()


def _find_key_colon(s):
    """Find the index of the ':' that separates a mapping key from its value.

    Respects quoted spans (a colon inside a quoted key/value is not the
    separator). The separating colon must be followed by whitespace or be
    the last character of the line (a bare `key:` with an empty value).
    Returns None if no such colon exists.
    """
    in_quote = False
    quote_char = None
    prev = ""
    for idx, ch in enumerate(s):
        if in_quote:
            if ch == quote_char and prev != "\\":
                in_quote = False
                quote_char = None
        else:
            if ch in ('"', "'"):
                in_quote = True
                quote_char = ch
            elif ch == ":" and (idx + 1 == len(s) or s[idx + 1] in (" ", "\t")):
                return idx
        prev = ch
    return None


def _scalar(v):
    """Parse a scalar value (e.g., a key or simple value)."""
    v = v.strip()

    if v == "" or v == "~" or v.lower() == "null":
        return None
    if v == "{}":
        return {}
    if v == "[]":
        return []

    # Quoted strings
    if len(v) >= 2:
        if (v[0] == '"' and v[-1] == '"') or (v[0] == "'" and v[-1] == "'"):
            # Remove quotes and handle escape sequences for double quotes
            inner = v[1:-1]
            if v[0] == '"':
                inner = inner.replace('\\"', '"').replace("\\\\", "\\")
            return inner

    # Inline lists [a, b, c]
    if v.startswith("[") and v.endswith("]"):
        inner = v[1:-1].strip()
        if not inner:
            return []
        return [_scalar(x) for x in _split_top_level(inner)]

    # Inline dicts {key: value, ...} — not used by any of this app's real
    # files (only `{}` appears). A non-empty flow mapping is a construct we
    # do not support; surface that loudly rather than silently returning {}.
    if v.startswith("{") and v.endswith("}"):
        raise YamlParseError(f"non-empty inline mapping not supported: {v!r}")

    # Booleans
    if v.lower() in ("true", "false"):
        return v.lower() == "true"

    # Numbers
    if re.fullmatch(r"-?\d+", v):
        return int(v)
    if re.fullmatch(r"-?\d+\.\d+", v):
        return float(v)

    # Plain string
    return v


def _split_top_level(s):
    """Split a comma-separated list, respecting nesting (quotes, brackets)."""
    parts = []
    current = ""
    depth = 0
    in_quote = False
    quote_char = None

    for i, ch in enumerate(s):
        if ch in ('"', "'") and (i == 0 or s[i - 1] != "\\"):
            if not in_quote:
                in_quote = True
                quote_char = ch
            elif ch == quote_char:
                in_quote = False
                quote_char = None

        if not in_quote:
            if ch in "[{":
                depth += 1
            elif ch in "]}":
                depth -= 1
            elif ch == "," and depth == 0:
                parts.append(current.strip())
                current = ""
                continue

        current += ch

    if current.strip():
        parts.append(current.strip())

    return parts


def _looks_like_list_item(line):
    """Does a (whitespace-stripped-of-leading-indent) line start a `- item`?"""
    return bool(re.match(r"^-(\s|$)", line))


def _parse_map(lines, i, indent):
    """
    Parse a mapping (`key: value` lines) starting at line index i, where every
    key of this mapping sits at exactly `indent` columns. Comments and blank
    lines are skipped wherever they occur. A key with an empty value is
    resolved by looking ahead (past any comments/blanks) at the next
    substantive line: deeper-indented `- ` lines become a block list, any
    other deeper indent becomes a nested mapping, and no deeper content means
    the value is null.

    Returns:
        (dict, next_index)
    """
    result = {}

    while True:
        i = _skip_blank_comments(lines, i)
        if i >= len(lines):
            break

        raw = lines[i]
        ind = _indent_of(raw)

        if ind < indent:
            break
        if ind > indent:
            raise YamlParseError(
                f"unexpected indent at line {i + 1} (expected {indent}, got {ind}): {raw!r}"
            )

        line = _strip_inline_comment(raw).strip()
        if line == "":
            # The only content was an inline comment — treat as blank.
            i += 1
            continue

        if _looks_like_list_item(line):
            raise YamlParseError(
                f"expected 'key: value' but found a list item at line {i + 1}: {raw!r}"
            )

        colon = _find_key_colon(line)
        if colon is None:
            raise YamlParseError(f"could not parse 'key: value' at line {i + 1}: {raw!r}")

        key = line[:colon].strip()
        val_str = line[colon + 1:].strip()

        if val_str == "":
            j = _skip_blank_comments(lines, i + 1)
            if j < len(lines):
                next_raw = lines[j]
                next_ind = _indent_of(next_raw)
                next_line = _strip_inline_comment(next_raw).strip()
                if next_ind > indent and next_line != "" and _looks_like_list_item(next_line):
                    items, j2 = _parse_list(lines, j, next_ind)
                    result[key] = items
                    i = j2
                    continue
                if next_ind > indent and next_line != "":
                    submap, j2 = _parse_map(lines, j, next_ind)
                    result[key] = submap
                    i = j2
                    continue
            result[key] = None
            i += 1
            continue

        result[key] = _scalar(val_str)
        i += 1

    return result, i


def _parse_list(lines, i, indent):
    """
    Parse a block list whose `- ` markers sit at exactly `indent` columns,
    starting at line index i. Comments and blank lines are skipped wherever
    they occur (before the list, between items, or after it). Each item is
    either a scalar, or — when its content is itself a `key: value` pair — a
    dict built from that line plus any deeper-indented continuation lines
    (which may themselves be inline lists, nested maps, or further block
    lists, to arbitrary depth).

    Returns:
        (list, next_index)
    """
    items = []

    while True:
        i = _skip_blank_comments(lines, i)
        if i >= len(lines):
            break

        raw = lines[i]
        ind = _indent_of(raw)

        if ind < indent:
            break
        if ind != indent:
            raise YamlParseError(
                f"unexpected indent inside list at line {i + 1} (expected {indent}, got {ind}): {raw!r}"
            )

        content_line = _strip_inline_comment(raw).strip()
        if not _looks_like_list_item(content_line):
            raise YamlParseError(f"expected a list item ('- ...') at line {i + 1}: {raw!r}")

        # Work out where the item's own content starts (the column right
        # after '- ', which continuation lines for a dict item must match).
        after_dash = raw[ind + 1:]
        rest_stripped = after_dash.lstrip(" ")
        n_spaces = len(after_dash) - len(rest_stripped)
        content_col = ind + 1 + n_spaces

        # `rest` is the dash line's content after '- ', with any inline
        # comment on that same line already stripped.
        stripped_line = _strip_inline_comment(raw).strip()
        rest = stripped_line[1:].strip()  # drop leading '-'

        if rest == "":
            j = _skip_blank_comments(lines, i + 1)
            if j < len(lines) and _indent_of(lines[j]) > ind:
                sub_ind = _indent_of(lines[j])
                sub_line = _strip_inline_comment(lines[j]).strip()
                if _looks_like_list_item(sub_line):
                    sub_items, j2 = _parse_list(lines, j, sub_ind)
                    items.append(sub_items)
                    i = j2
                    continue
                submap, j2 = _parse_map(lines, j, sub_ind)
                items.append(submap)
                i = j2
                continue
            items.append(None)
            i += 1
            continue

        colon = _find_key_colon(rest)
        if colon is not None:
            # This item is a dict. Build a virtual line list: the dash
            # line's own content, re-indented to content_col so it reads as
            # an ordinary mapping key, followed by the real subsequent
            # lines (which already sit at content_col or deeper for any
            # continuation/nesting).
            first_virtual = (" " * content_col) + rest
            virtual_lines = [first_virtual] + lines[i + 1:]
            submap, consumed = _parse_map(virtual_lines, 0, content_col)
            items.append(submap)
            # virtual_lines[0] stands in for original line i; virtual_lines[k]
            # (k >= 1) is lines[i + k] verbatim, so the next unconsumed
            # original index is i + consumed.
            i = i + consumed
            continue

        # Plain scalar list item.
        items.append(_scalar(rest))
        i += 1

    return items, i

"""
mdview.py — Markdown text to reading HTML, pure string in, string out.

Words are never changed: only Markdown markup becomes HTML markup. Raw HTML
inside a store file is escaped, never passed through, so a note can't run
script inside the wiki's origin. Every top-level block carries id="L<n>"
(its first source line) so search hits can jump to `#L<n>`.

Links leave this module only through the caller's `resolve_href` and
`render_wikilink`, so seal handling and store-relative paths stay in render.
"""

import html
import re

_FRONTMATTER_RE = re.compile(r"\A---[ \t]*\n(.*?)\n---[ \t]*\n", re.S)
_COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
_FENCE_RE = re.compile(r"^(\s*)(```+|~~~+)\s*([\w+-]*)")
_HR_RE = re.compile(r"^\s{0,3}([-*_])(\s*\1){2,}\s*$")
_LIST_RE = re.compile(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$")
_TABLE_SEP_RE = re.compile(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$")
_SAFE_SCHEME_RE = re.compile(r"^(https?:|mailto:|#|/)|^[^:]*$", re.I)

_CODE_SPAN_RE = re.compile(r"(`+)(.+?)\1")
_IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)")
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)")
_WIKILINK_RE = re.compile(r"\[\[([a-zA-Z0-9_\-]+)(?:\|([^\]]+))?\]\]")
_AUTOLINK_RE = re.compile(r"(?<![\"'=>])\bhttps?://[^\s<]+[^\s<.,;:!?)\]]")
_BOLD_RE = re.compile(r"(\*\*|__)(?=\S)(.+?)(?<=\S)\1")
_ITALIC_RE = re.compile(r"(?<![\w*])([*_])(?=\S)(.+?)(?<=\S)\1(?![\w*])")
_STRIKE_RE = re.compile(r"~~(?=\S)(.+?)(?<=\S)~~")


def split_frontmatter(text):
    """Return (frontmatter_text_or_None, body, body_first_line_number)."""
    m = _FRONTMATTER_RE.match(text)
    if not m:
        return None, text, 1
    return m.group(1), text[m.end():], m.group(0).count("\n") + 1


def to_html(text, resolve_href, render_wikilink, first_line=1):
    # Comments are blanked line-for-line so #L<n> anchors still match the file.
    text = _COMMENT_RE.sub(lambda m: "\n" * m.group(0).count("\n"), text)
    ctx = (resolve_href, render_wikilink)
    return _blocks(text.split("\n"), first_line, ctx, top=True)


def _esc(value):
    return html.escape(value, quote=True)


def _anchor(line_no, top):
    return f' id="L{line_no}"' if top else ""


def _indent(line):
    return len(line) - len(line.lstrip(" \t").replace("\t", "    ")) if line.strip() else 0


def _dedent(lines, n):
    out = []
    for ln in lines:
        expanded = ln.replace("\t", "    ")
        strip = min(n, len(expanded) - len(expanded.lstrip(" ")))
        out.append(expanded[strip:])
    return out


def _is_table_start(lines, i):
    return (
        i + 1 < len(lines)
        and "|" in lines[i]
        and _TABLE_SEP_RE.match(lines[i + 1]) is not None
    )


def _starts_block(lines, i):
    line = lines[i]
    return bool(
        _HEADING_RE.match(line.strip())
        or _FENCE_RE.match(line)
        or _HR_RE.match(line)
        or _LIST_RE.match(line)
        or line.lstrip().startswith(">")
        or _is_table_start(lines, i)
    )


def _blocks(lines, first_line, ctx, top=False):
    parts = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        stripped = line.strip()
        line_no = first_line + i

        if not stripped:
            i += 1
            continue

        fence = _FENCE_RE.match(line)
        if fence:
            marker = fence.group(2)
            lang = fence.group(3)
            body = []
            i += 1
            while i < n and not lines[i].strip().startswith(marker[0] * len(marker)):
                body.append(lines[i])
                i += 1
            i += 1
            cls = f' class="lang-{_esc(lang)}"' if lang else ""
            parts.append(
                f'<pre class="md-code"{_anchor(line_no, top)}><code{cls}>'
                f'{_esc(chr(10).join(_dedent(body, len(fence.group(1)))))}</code></pre>'
            )
            continue

        heading = _HEADING_RE.match(stripped)
        if heading:
            level = len(heading.group(1))
            parts.append(
                f"<h{level}{_anchor(line_no, top)}>{_inline(heading.group(2), ctx)}</h{level}>"
            )
            i += 1
            continue

        if _HR_RE.match(line):
            parts.append(f"<hr{_anchor(line_no, top)}>")
            i += 1
            continue

        if _is_table_start(lines, i):
            rows = [lines[i], lines[i + 1]]
            i += 2
            while i < n and "|" in lines[i] and lines[i].strip():
                rows.append(lines[i])
                i += 1
            parts.append(_table(rows, line_no, top, ctx))
            continue

        if stripped.startswith(">"):
            quoted = []
            while i < n and lines[i].strip().startswith(">"):
                quoted.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            inner = _blocks(quoted, line_no, ctx)
            parts.append(f'<blockquote class="md-quote"{_anchor(line_no, top)}>{inner}</blockquote>')
            continue

        if _LIST_RE.match(line):
            end = _list_end(lines, i)
            parts.append(_list(lines[i:end], line_no, top, ctx))
            i = end
            continue

        para = [stripped]
        i += 1
        while i < n and lines[i].strip() and not _starts_block(lines, i):
            para.append(lines[i].strip())
            i += 1
        parts.append(f"<p{_anchor(line_no, top)}>{_inline_lines(para, ctx)}</p>")

    return "".join(parts)


def _inline_lines(lines, ctx):
    # A trailing double space or backslash is Markdown's hard line break.
    out = []
    for k, ln in enumerate(lines):
        last = k == len(lines) - 1
        hard = ln.endswith("\\") and not last
        piece = _inline(ln[:-1] if hard else ln, ctx)
        out.append(piece + ("<br>" if hard else ""))
    return " ".join(out)


def _list_end(lines, start):
    base = _indent(lines[start])
    i = start + 1
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            nxt = i + 1
            if nxt < len(lines) and lines[nxt].strip() and (
                _indent(lines[nxt]) > base
                or (_LIST_RE.match(lines[nxt]) and _indent(lines[nxt]) == base)
            ):
                i += 1
                continue
            return i
        if _indent(line) < base:
            return i
        if _indent(line) == base and not _LIST_RE.match(line):
            if _starts_block(lines, i):
                return i
        i += 1
    return i


def _list(lines, first_line, top, ctx):
    base = _indent(lines[0])
    ordered = _LIST_RE.match(lines[0]).group(2)[0].isdigit()
    items = []
    current = None
    for k, line in enumerate(lines):
        m = _LIST_RE.match(line)
        if m and _indent(line) == base:
            current = {"first": m.group(3), "rest": [], "line": first_line + k}
            items.append(current)
        elif current is not None:
            current["rest"].append(line)

    lis = []
    for it in items:
        first = it["first"]
        task = re.match(r"^\[([ xX])\]\s+(.*)$", first)
        prefix = ""
        if task:
            checked = " checked" if task.group(1) in "xX" else ""
            prefix = f'<input type="checkbox" disabled{checked}> '
            first = task.group(2)
        child_lines = _dedent(it["rest"], base + 2)
        lead = []
        while child_lines and child_lines[0].strip() and not _LIST_RE.match(child_lines[0]):
            lead.append(child_lines.pop(0).strip())
        body = prefix + _inline_lines([first] + lead, ctx)
        if any(c.strip() for c in child_lines):
            body += _blocks(child_lines, it["line"] + 1 + len(lead), ctx)
        lis.append(f"<li>{body}</li>")

    tag = "ol" if ordered else "ul"
    start = ""
    if ordered:
        num = int(re.match(r"\s*(\d+)", lines[0]).group(1))
        if num != 1:
            start = f' start="{num}"'
    return f"<{tag}{start}{_anchor(first_line, top)}>{''.join(lis)}</{tag}>"


def _table_cells(row):
    row = row.strip()
    if row.startswith("|"):
        row = row[1:]
    if row.endswith("|") and not row.endswith("\\|"):
        row = row[:-1]
    cells = re.split(r"(?<!\\)\|", row)
    return [c.strip().replace("\\|", "|") for c in cells]


def _table(rows, first_line, top, ctx):
    header = _table_cells(rows[0])
    aligns = []
    for spec in _table_cells(rows[1]):
        if spec.startswith(":") and spec.endswith(":"):
            aligns.append("center")
        elif spec.endswith(":"):
            aligns.append("right")
        elif spec.startswith(":"):
            aligns.append("left")
        else:
            aligns.append("")

    def cell(tag, text, idx):
        align = aligns[idx] if idx < len(aligns) and aligns[idx] else ""
        style = f' style="text-align:{align}"' if align else ""
        return f"<{tag}{style}>{_inline(text, ctx)}</{tag}>"

    head = "".join(cell("th", c, k) for k, c in enumerate(header))
    body = []
    for r in rows[2:]:
        cells = _table_cells(r)
        cells += [""] * (len(header) - len(cells))
        body.append("<tr>" + "".join(cell("td", c, k) for k, c in enumerate(cells)) + "</tr>")
    return (
        f'<div class="md-table"{_anchor(first_line, top)}><table>'
        f"<thead><tr>{head}</tr></thead><tbody>{''.join(body)}</tbody></table></div>"
    )


def _inline(text, ctx):
    resolve_href, render_wikilink = ctx
    stash = []

    def keep(fragment):
        stash.append(fragment)
        return f"\x00{len(stash) - 1}\x00"

    text = _CODE_SPAN_RE.sub(lambda m: keep(f"<code>{_esc(m.group(2).strip())}</code>"), text)
    text = _WIKILINK_RE.sub(
        lambda m: keep(render_wikilink(m.group(1), m.group(2))), text
    )
    text = _esc(text)

    def safe_href(raw, embed=False):
        href = html.unescape(raw)
        if not _SAFE_SCHEME_RE.match(href):
            return None
        return resolve_href(href, embed)

    def image(m):
        href = safe_href(m.group(2), embed=True)
        if href is None:
            return m.group(0)
        return keep(f'<img src="{_esc(href)}" alt="{m.group(1)}" loading="lazy">')

    def link(m):
        href = safe_href(m.group(2))
        if href is None:
            return m.group(0)
        external = href.startswith(("http://", "https://"))
        extra = ' target="_blank" rel="noopener"' if external else ""
        return keep(f'<a href="{_esc(href)}"{extra}>{m.group(1)}</a>')

    text = _IMAGE_RE.sub(image, text)
    text = _LINK_RE.sub(link, text)
    text = _AUTOLINK_RE.sub(
        lambda m: keep(f'<a href="{m.group(0)}" target="_blank" rel="noopener">{m.group(0)}</a>'),
        text,
    )
    text = _BOLD_RE.sub(r"<strong>\2</strong>", text)
    text = _ITALIC_RE.sub(r"<em>\2</em>", text)
    text = _STRIKE_RE.sub(r"<del>\1</del>", text)

    while "\x00" in text:
        text = re.sub(r"\x00(\d+)\x00", lambda m: stash[int(m.group(1))], text)
    return text

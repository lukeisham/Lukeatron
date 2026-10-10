#!/usr/bin/env python3
"""Strict single-file bundler for Storytelling.

Reads app/index.html, inlines its stylesheets into <style> and every module reachable from its
module script into ONE classic <script>, and writes dist/Storytelling-<version>.html plus a
dist/Storytelling.html copy. The build step is confined to this script and its output, so the
app source stays a no-build ES-module tree (JS-7).

The bundler is a strict, checked subset. It supports only named static imports and
exports with relative ".js" specifiers, and refuses everything else with a file:line list:
default / namespace / side-effect / renamed imports, dynamic import(), import.meta, export
default, export *, re-exports, top-level await, import cycles, missing files, imported names a
module does not export, and top-level names declared in two modules (they would collide once
hoisted into one scope).

Usage:  python3 share/build_share.py [--check] [--app DIR] [--dist DIR]
        --check validates and reports without writing anything.
"""

from __future__ import annotations

import argparse
import bisect
import re
import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SIZE_LIMIT_BYTES = 2 * 1024 * 1024
VERSION_FILE = "data/version.js"

_IDENT = re.compile(r"[A-Za-z_$][\w$]*")
_STATEMENT = re.compile(r"(?<![\w$.])(import|export)(?![\w$])")
_DYNAMIC_IMPORT = re.compile(r"(?<![\w$.])import\s*[(.]")
_DECLARATION_KEYWORD = re.compile(r"(?<![\w$.])(const|let|var|class|function)(?![\w$])")
_AWAIT = re.compile(r"(?<![\w$.])await(?![\w$])")
_NETWORK_API = re.compile(
    r"(?<![\w$.])(?:(?:window|globalThis|self)\s*\.\s*)?"
    r"(?:fetch\s*\(|XMLHttpRequest\b|WebSocket\b|EventSource\b|importScripts\s*\()"
    r"|(?<![\w$])sendBeacon\s*\("
)
_URL_TEXT = re.compile(r"https?://[^\s\"'<>)]+")
_SEMVER = re.compile(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?")
_VERSION_EXPORT = re.compile(r"export\s+const\s+APP_VERSION\s*=\s*([\"'])([^\"']*)\1")
_SCHEME_OR_PROTOCOL_RELATIVE = re.compile(r"^(?:[a-z][a-z0-9+.-]*:|//)", re.IGNORECASE)

_REGEX_PRECEDING_CHARS = frozenset("(,=:[!&|?{;*%<>~^")
_REGEX_PRECEDING_WORDS = frozenset(
    {"return", "typeof", "case", "do", "else", "in", "of", "instanceof", "void", "delete",
     "throw", "new", "yield", "await"}
)
_EXPRESSION_WORDS = frozenset(
    {"new", "typeof", "void", "await", "return", "yield", "in", "of", "instanceof", "delete"}
)
_OPERATOR_CHARS = frozenset("=,:?&|^!~<>+-*/%")
_STATEMENT_STARTERS = frozenset(
    {"const", "let", "var", "function", "class", "export", "import", "async", "if", "for",
     "while", "do", "switch", "try", "throw", "return"}
)
_URL_ATTRIBUTES = ("src", "href", "poster", "data", "action", "formaction", "manifest", "ping")


@dataclass(frozen=True)
class Issue:
    """One refusal: where it is and what to change."""

    file: str
    line: int
    message: str

    def __str__(self) -> str:
        return f"{self.file}:{self.line}: {self.message}"


class BundleRefused(Exception):
    """The app cannot be bundled; `issues` lists every reason found."""

    def __init__(self, issues: list[Issue]) -> None:
        self.issues = sorted(issues, key=lambda i: (i.file, i.line, i.message))
        super().__init__("\n".join(str(i) for i in self.issues))


@dataclass(frozen=True)
class BuildResult:
    version: str
    html: str
    outputs: tuple[Path, ...]
    url_notes: tuple[str, ...]


@dataclass(frozen=True)
class _Edit:
    start: int
    end: int
    text: str


class _Lines:
    """Maps a character offset to its 1-based line number."""

    def __init__(self, text: str) -> None:
        self.starts = [0] + [m.end() for m in re.finditer("\n", text)]

    def of(self, offset: int) -> int:
        return bisect.bisect_right(self.starts, offset)


# --------------------------------------------------------------------------------------
# Masking: blank comments and string/regex contents so keyword searches cannot be fooled.
# --------------------------------------------------------------------------------------

class _Masker:
    """Returns the source with comment, string, template-text and regex contents blanked to
    spaces (newlines kept, so offsets and line numbers still match the original)."""

    def __init__(self, source: str) -> None:
        self.src = source
        self.out = list(source)
        self.i = 0
        self.brace = 0
        self.template_braces: list[int] = []

    def run(self) -> str:
        while self.i < len(self.src):
            self._step()
        return "".join(self.out)

    def _blank(self, start: int, end: int) -> None:
        for k in range(start, min(end, len(self.out))):
            if self.out[k] != "\n":
                self.out[k] = " "

    def _step(self) -> None:
        char = self.src[self.i]
        following = self.src[self.i + 1:self.i + 2]
        if char == "/" and following == "/":
            self._line_comment()
        elif char == "/" and following == "*":
            self._block_comment()
        elif char in "'\"":
            self._string(char)
        elif char == "`":
            self.i += 1
            self._template_text()
        elif char == "/" and self._regex_allowed():
            self._regex()
        else:
            self._code_char(char)

    def _code_char(self, char: str) -> None:
        if char == "{":
            self.brace += 1
        elif char == "}":
            if self.template_braces and self.brace == self.template_braces[-1]:
                self.template_braces.pop()
                self.i += 1
                self._template_text()
                return
            self.brace -= 1
        self.i += 1

    def _line_comment(self) -> None:
        end = self.src.find("\n", self.i)
        end = len(self.src) if end == -1 else end
        self._blank(self.i, end)
        self.i = end

    def _block_comment(self) -> None:
        end = self.src.find("*/", self.i + 2)
        end = len(self.src) if end == -1 else end + 2
        self._blank(self.i, end)
        self.i = end

    def _string(self, quote: str) -> None:
        j = self.i + 1
        while j < len(self.src):
            char = self.src[j]
            if char == "\\":
                self._blank(j, j + 2)
                j += 2
                continue
            if char == quote or char == "\n":
                break
            self._blank(j, j + 1)
            j += 1
        self.i = j + 1

    def _template_text(self) -> None:
        j = self.i
        while j < len(self.src):
            char = self.src[j]
            if char == "\\":
                self._blank(j, j + 2)
                j += 2
            elif char == "`":
                self.i = j + 1
                return
            elif char == "$" and self.src[j + 1:j + 2] == "{":
                self.template_braces.append(self.brace)
                self.i = j + 2
                return
            else:
                self._blank(j, j + 1)
                j += 1
        self.i = j

    def _regex_allowed(self) -> bool:
        j = self.i - 1
        while j >= 0 and self.out[j].isspace():
            j -= 1
        if j < 0:
            return True
        char = self.out[j]
        if char in _REGEX_PRECEDING_CHARS:
            return True
        if char.isalnum() or char in "_$":
            return _word_ending_at("".join(self.out), j) in _REGEX_PRECEDING_WORDS
        return False

    def _regex(self) -> None:
        j = self.i + 1
        in_class = False
        while j < len(self.src):
            char = self.src[j]
            if char == "\\":
                self._blank(j, j + 2)
                j += 2
                continue
            if char == "\n" or (char == "/" and not in_class):
                break
            if char == "[":
                in_class = True
            elif char == "]":
                in_class = False
            self._blank(j, j + 1)
            j += 1
        self.i = j + 1


def mask_js(source: str) -> str:
    """Blank comments and literal contents of JavaScript source, preserving offsets."""
    return _Masker(source).run()


def _word_ending_at(text: str, index: int) -> str:
    start = index
    while start >= 0 and (text[start].isalnum() or text[start] in "_$"):
        start -= 1
    return text[start + 1:index + 1]


def _skip_ws(text: str, pos: int) -> int:
    while pos < len(text) and text[pos].isspace():
        pos += 1
    return pos


def _depth_map(masked: str) -> list[int]:
    depth = 0
    depths: list[int] = []
    for char in masked:
        if char in ")}]":
            depth = max(0, depth - 1)
        depths.append(depth)
        if char in "({[":
            depth += 1
    return depths


# --------------------------------------------------------------------------------------
# Top-level declaration discovery (needed for duplicate-name detection and export lists).
# --------------------------------------------------------------------------------------

def _is_declaration_position(masked: str, pos: int) -> bool:
    """True if a `function`/`class` keyword at pos starts a declaration, not an expression."""
    j = pos - 1
    while j >= 0 and masked[j].isspace():
        j -= 1
    if j < 0:
        return True
    char = masked[j]
    if char in ";})]":
        return True
    if char in _OPERATOR_CHARS:
        return False
    word = _word_ending_at(masked, j)
    if word == "async":
        return _is_declaration_position(masked, j - len(word) + 1)
    return word not in _EXPRESSION_WORDS


def _next_token_starts_statement(masked: str, pos: int) -> bool:
    match = _IDENT.match(masked, _skip_ws(masked, pos))
    return bool(match) and match.group() in _STATEMENT_STARTERS


def _skip_expression(masked: str, pos: int, stops: str) -> int:
    """Advance to the end of an initializer: a stop char, an unbalanced closer, or a newline
    before a statement keyword (semicolon-less style)."""
    depth = 0
    while pos < len(masked):
        char = masked[pos]
        if char in "({[":
            depth += 1
        elif char in ")}]":
            if depth == 0:
                return pos
            depth -= 1
        elif depth == 0 and char in stops:
            return pos
        elif depth == 0 and char == "\n" and _next_token_starts_statement(masked, pos):
            return pos
        pos += 1
    return pos


def _parse_pattern(masked: str, pos: int) -> tuple[list[tuple[str, int]], int]:
    """Bound names in a destructuring pattern starting at `{` or `[`."""
    is_object = masked[pos] == "{"
    close = "}" if is_object else "]"
    names: list[tuple[str, int]] = []
    pos += 1
    while pos < len(masked):
        pos = _skip_ws(masked, pos)
        if pos >= len(masked):
            break
        if masked[pos] == close:
            return names, pos + 1
        if masked[pos] == ",":
            pos += 1
            continue
        if masked.startswith("...", pos):
            pos = _skip_ws(masked, pos + 3)
        pos = _parse_pattern_element(masked, pos, is_object, names)
        pos = _skip_ws(masked, pos)
        if masked.startswith("=", pos):
            pos = _skip_expression(masked, pos + 1, ",")
    return names, pos


def _parse_pattern_element(
    masked: str, pos: int, is_object: bool, names: list[tuple[str, int]]
) -> int:
    if pos < len(masked) and masked[pos] in "{[":
        found, pos = _parse_pattern(masked, pos)
        names.extend(found)
        return pos
    match = _IDENT.match(masked, pos)
    if not match:
        return pos + 1
    after_word = _skip_ws(masked, match.end())
    if is_object and masked[after_word:after_word + 1] == ":":
        target = _skip_ws(masked, after_word + 1)
        return _parse_pattern_element(masked, target, False, names)
    names.append((match.group(), match.start()))
    return match.end()


def _parse_declarators(masked: str, pos: int) -> list[tuple[str, int]]:
    """Names bound by a `const`/`let`/`var` list beginning at pos."""
    names: list[tuple[str, int]] = []
    while True:
        pos = _skip_ws(masked, pos)
        if pos >= len(masked):
            break
        if masked[pos] in "{[":
            found, pos = _parse_pattern(masked, pos)
            names.extend(found)
        else:
            match = _IDENT.match(masked, pos)
            if not match:
                break
            names.append((match.group(), match.start()))
            pos = match.end()
        pos = _skip_ws(masked, pos)
        if masked.startswith("=", pos):
            pos = _skip_expression(masked, pos + 1, ",;")
        if masked[pos:pos + 1] == ",":
            pos += 1
            continue
        break
    return names


def _collect_declarations(masked: str, depths: list[int]) -> dict[int, list[tuple[str, int]]]:
    """Top-level declarations keyed by the offset of their keyword: [(name, name_offset)]."""
    found: dict[int, list[tuple[str, int]]] = {}
    for match in _DECLARATION_KEYWORD.finditer(masked):
        start, keyword = match.start(), match.group(1)
        if depths[start] != 0:
            continue
        if keyword in ("const", "let", "var"):
            found[start] = _parse_declarators(masked, match.end())
            continue
        if not _is_declaration_position(masked, start):
            continue
        pos = _skip_ws(masked, match.end())
        if keyword == "function" and masked.startswith("*", pos):
            pos = _skip_ws(masked, pos + 1)
        name = _IDENT.match(masked, pos)
        found[start] = [(name.group(), name.start())] if name else []
    return found


# --------------------------------------------------------------------------------------
# One module: find imports/exports, refuse unsupported forms, produce the hoistable body.
# --------------------------------------------------------------------------------------

@dataclass
class ImportRef:
    names: list[str]
    spec: str
    line: int


@dataclass
class ModuleInfo:
    rel: str
    source: str
    imports: list[ImportRef] = field(default_factory=list)
    exports: set[str] = field(default_factory=set)
    declared: dict[str, int] = field(default_factory=dict)
    imported_names: set[str] = field(default_factory=set)
    body: str = ""


class _ModuleScan:
    def __init__(self, rel: str, source: str, issues: list[Issue]) -> None:
        self.rel = rel
        self.src = source
        self.issues = issues
        self.lines = _Lines(source)
        self.masked = mask_js(source)
        self.depths = _depth_map(self.masked)
        self.declarations = _collect_declarations(self.masked, self.depths)
        self.edits: list[_Edit] = []
        self.listed_exports: list[tuple[str, int]] = []
        self.info = ModuleInfo(rel, source)

    def refuse(self, offset: int, message: str) -> None:
        self.issues.append(Issue(self.rel, self.lines.of(offset), message))

    def run(self) -> ModuleInfo:
        self._flag_forbidden_constructs()
        for name_list in self.declarations.values():
            for name, offset in name_list:
                self.info.declared.setdefault(name, self.lines.of(offset))
        cursor = 0
        for match in _STATEMENT.finditer(self.masked):
            if match.start() < cursor or self.depths[match.start()] != 0:
                continue
            if _DYNAMIC_IMPORT.match(self.masked, match.start()):
                continue
            handler = self._import if match.group(1) == "import" else self._export
            cursor = handler(match)
        self._check_exports_are_declared()
        self.info.body = self._apply_edits()
        return self.info

    def _flag_forbidden_constructs(self) -> None:
        for match in _DYNAMIC_IMPORT.finditer(self.masked):
            self.refuse(match.start(), "dynamic import() / import.meta is not supported; use a static named import")
        for match in _NETWORK_API.finditer(self.masked):
            self.refuse(match.start(), f"network API `{match.group().strip()}` is not allowed; the shared file must make no network request")
        for match in _AWAIT.finditer(self.masked):
            if self.depths[match.start()] == 0 and not self._inside_arrow_statement(match.start()):
                self.refuse(match.start(), "top-level await is not supported")

    def _inside_arrow_statement(self, pos: int) -> bool:
        boundary = max(self.masked.rfind(";", 0, pos), self.masked.rfind("}", 0, pos))
        return "=>" in self.masked[boundary + 1:pos]

    def _statement_end(self, pos: int) -> int:
        while pos < len(self.masked) and self.masked[pos] in " \t":
            pos += 1
        if self.masked[pos:pos + 1] == ";":
            pos += 1
        if self.masked[pos:pos + 1] == "\n":
            pos += 1
        return pos

    def _named_list(self, open_pos: int, kind: str) -> tuple[list[str], int, bool]:
        """Parse `{ a, b }` -> (names, index after `}`, all-items-supported)."""
        close = self.masked.find("}", open_pos)
        if close == -1:
            self.refuse(open_pos, f"unterminated {kind} list")
            return [], open_pos + 1, False
        names: list[str] = []
        supported = True
        for item in self.masked[open_pos + 1:close].split(","):
            item = item.strip()
            if not item:
                continue
            if re.fullmatch(r"[A-Za-z_$][\w$]*", item) and item != "default":
                names.append(item)
                continue
            supported = False
            if item == "default" or re.match(r"default\s+as\b", item):
                self.refuse(open_pos, f"default {kind} is not supported; use a named export")
            elif re.fullmatch(r"[\w$]+\s+as\s+[\w$]+", item):
                self.refuse(open_pos, f"renamed {kind} `{' '.join(item.split())}` is not supported; use the original name")
            else:
                self.refuse(open_pos, f"unsupported {kind} item `{item}`")
        return names, close + 1, supported

    def _import(self, match: re.Match[str]) -> int:
        keyword_end = match.end()
        pos = _skip_ws(self.masked, keyword_end)
        char = self.masked[pos:pos + 1]
        if char in ("'", '"'):
            self.refuse(match.start(), "side-effect import (`import \"x\"`) is not supported; use a named import")
        elif char == "*":
            self.refuse(match.start(), "namespace import (`import * as`) is not supported; use named imports")
        elif char == "{":
            return self._named_import(match, pos)
        elif _IDENT.match(self.masked, pos):
            self.refuse(match.start(), "default import is not supported; use a named import")
        else:
            self.refuse(match.start(), "unrecognised import form")
        return keyword_end

    def _named_import(self, match: re.Match[str], open_pos: int) -> int:
        names, after_list, supported = self._named_list(open_pos, "import")
        pos = _skip_ws(self.masked, after_list)
        if not self.masked.startswith("from", pos):
            self.refuse(match.start(), "import is missing `from \"...\"`")
            return after_list
        quote_pos = _skip_ws(self.masked, pos + 4)
        quote = self.masked[quote_pos:quote_pos + 1]
        close = self.masked.find(quote, quote_pos + 1) if quote in ("'", '"') else -1
        if close == -1:
            self.refuse(match.start(), "import specifier must be a quoted string")
            return after_list
        spec = self.src[quote_pos + 1:close]
        end = self._statement_end(close + 1)
        if not (spec.startswith(("./", "../")) and spec.endswith(".js")):
            self.refuse(match.start(), f"import \"{spec}\": only relative paths ending in .js are supported")
            return end
        if supported:
            self.info.imports.append(ImportRef(names, spec, self.lines.of(match.start())))
            self.info.imported_names.update(names)
            self.edits.append(_Edit(match.start(), end, ""))
        return end

    def _export(self, match: re.Match[str]) -> int:
        pos = _skip_ws(self.masked, match.end())
        if self.masked[pos:pos + 1] == "*":
            self.refuse(match.start(), "`export *` re-export is not supported; import from the defining module")
            return match.end()
        if self.masked[pos:pos + 1] == "{":
            return self._export_list(match, pos)
        word = _IDENT.match(self.masked, pos)
        if word and word.group() == "default":
            self.refuse(match.start(), "default export is not supported; use a named export")
            return match.end()
        keyword_start = word.start() if word else pos
        if word and word.group() == "async":
            keyword_start = _skip_ws(self.masked, word.end())
        declaration = self.declarations.get(keyword_start)
        if declaration is None:
            self.refuse(match.start(), "unsupported export form; use `export const|let|var|function|class name`")
            return match.end()
        self.info.exports.update(name for name, _ in declaration)
        self.edits.append(_Edit(match.start(), pos, ""))
        return pos

    def _export_list(self, match: re.Match[str], open_pos: int) -> int:
        names, after_list, supported = self._named_list(open_pos, "export")
        pos = _skip_ws(self.masked, after_list)
        if self.masked.startswith("from", pos):
            self.refuse(match.start(), "re-export (`export { a } from`) is not supported; import from the defining module")
            return after_list
        end = self._statement_end(after_list)
        if supported:
            self.info.exports.update(names)
            self.listed_exports.extend((name, match.start()) for name in names)
            self.edits.append(_Edit(match.start(), end, ""))
        return end

    def _check_exports_are_declared(self) -> None:
        for name, offset in self.listed_exports:
            if name not in self.info.declared and name not in self.info.imported_names:
                self.refuse(offset, f"exports `{name}`, which this module does not declare")

    def _apply_edits(self) -> str:
        text = self.src
        for edit in sorted(self.edits, key=lambda e: e.start, reverse=True):
            text = text[:edit.start] + edit.text + text[edit.end:]
        return text.strip("\n")


def analyse_module(rel: str, source: str, issues: list[Issue]) -> ModuleInfo:
    """Scan one module's source; refusals are appended to `issues`."""
    return _ModuleScan(rel, source, issues).run()


# --------------------------------------------------------------------------------------
# The module graph: dependency order, cycles, missing files, unknown imported names.
# --------------------------------------------------------------------------------------

class _Graph:
    def __init__(self, app_dir: Path, issues: list[Issue]) -> None:
        self.app_dir = app_dir.resolve()
        self.issues = issues
        self.modules: dict[str, ModuleInfo] = {}
        self.order: list[str] = []
        self._state: dict[str, str] = {}
        self._targets: dict[tuple[str, str], str] = {}

    def add_entry(self, rel: str) -> None:
        self._visit(rel, [])

    def _visit(self, rel: str, stack: list[str]) -> None:
        if self._state.get(rel) == "done":
            return
        self._state[rel] = "active"
        source = (self.app_dir / rel).read_text(encoding="utf-8").replace("\r\n", "\n")
        info = analyse_module(rel, source, self.issues)
        self.modules[rel] = info
        for ref in info.imports:
            target = self._resolve(rel, ref)
            if target is None:
                continue
            if self._state.get(target) == "active":
                cycle = stack[stack.index(target):] + [rel, target] if target in stack else [rel, target]
                self.issues.append(Issue(rel, ref.line, "import cycle: " + " -> ".join(cycle)))
                continue
            self._visit(target, stack + [rel])
        self._state[rel] = "done"
        self.order.append(rel)

    def _resolve(self, importer: str, ref: ImportRef) -> str | None:
        candidate = (self.app_dir / importer).parent / ref.spec
        resolved = Path(_normalise(candidate))
        try:
            rel = resolved.relative_to(self.app_dir).as_posix()
        except ValueError:
            self.issues.append(Issue(importer, ref.line, f"import \"{ref.spec}\" leaves the app folder"))
            return None
        if not resolved.is_file():
            self.issues.append(Issue(importer, ref.line, f"import \"{ref.spec}\": file does not exist ({rel})"))
            return None
        self._targets[(importer, ref.spec)] = rel
        return rel

    def check_imported_names(self) -> None:
        for rel in self.order:
            for ref in self.modules[rel].imports:
                target = self._targets.get((rel, ref.spec))
                if target is None or target not in self.modules:
                    continue
                for name in ref.names:
                    if name not in self.modules[target].exports:
                        self.issues.append(Issue(rel, ref.line, f"`{name}` is not exported by {target}"))

    def check_duplicate_names(self) -> None:
        seen: dict[str, tuple[str, int]] = {}
        for rel in self.order:
            for name, line in self.modules[rel].declared.items():
                if name in seen:
                    first_file, first_line = seen[name]
                    self.issues.append(Issue(rel, line, f"top-level name `{name}` is also declared at {first_file}:{first_line}; rename one (they collide once bundled)"))
                else:
                    seen[name] = (rel, line)


def _normalise(path: Path) -> str:
    """Collapse ../ and ./ without touching the filesystem (unlike resolve(), which would
    follow symlinks and hide a target that escapes the app folder)."""
    parts: list[str] = []
    for part in path.parts:
        if part == "..":
            if parts and parts[-1] != "/":
                parts.pop()
        elif part != ".":
            parts.append(part)
    return str(Path(*parts)) if parts else "."


# --------------------------------------------------------------------------------------
# The page: index.html, stylesheets, script tags.
# --------------------------------------------------------------------------------------

@dataclass
class _Tag:
    name: str
    attrs: dict[str, str]
    start: int
    end: int
    close_start: int = -1
    close_end: int = -1


class _PageScanner(HTMLParser):
    def __init__(self, text: str) -> None:
        super().__init__(convert_charrefs=False)
        self._text = text
        self._lines = _Lines(text)
        self.tags: list[_Tag] = []
        self._open_script: _Tag | None = None
        self.feed(text)
        self.close()

    def _offset(self) -> int:
        line, col = self.getpos()
        return self._lines.starts[line - 1] + col

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        start = self._offset()
        raw = self.get_starttag_text() or ""
        entry = _Tag(tag, {k: (v or "") for k, v in attrs}, start, start + len(raw))
        self.tags.append(entry)
        if tag == "script":
            self._open_script = entry

    def handle_endtag(self, tag: str) -> None:
        if tag != "script" or self._open_script is None:
            return
        start = self._offset()
        self._open_script.close_start = start
        self._open_script.close_end = self._text.find(">", start) + 1
        self._open_script = None


@dataclass
class _PagePlan:
    edits: list[_Edit] = field(default_factory=list)
    entries: list[str] = field(default_factory=list)
    css_files: list[str] = field(default_factory=list)
    body_close: int = 0


def escape_script_text(js: str) -> str:
    """Keep JS safe inside <script>: a literal `</script` or `<!--` would end or confuse the block."""
    js = re.sub(r"</(script)", r"<\\/\1", js, flags=re.IGNORECASE)
    return js.replace("<!--", "<\\!--")


def _escape_style_text(css: str) -> str:
    return re.sub(r"</(style)", r"<\\/\1", css, flags=re.IGNORECASE)


def _local_file(base_dir: Path, ref: str, app_dir: Path) -> Path | None:
    if "?" in ref or "#" in ref:
        return None
    path = Path(_normalise(base_dir / ref))
    try:
        path.relative_to(app_dir)
    except ValueError:
        return None
    return path if path.is_file() else None


def _check_css(rel: str, css: str, issues: list[Issue]) -> None:
    lines = _Lines(css)
    uncommented = re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group()), css, flags=re.DOTALL)
    for match in re.finditer(r"@import\b", uncommented):
        issues.append(Issue(rel, lines.of(match.start()), "@import is not allowed; the shared file loads nothing from outside itself"))
    for match in re.finditer(r"url\(\s*([\"']?)([^)\"']*)\1\s*\)", uncommented):
        target = match.group(2).strip()
        if target and not target.startswith(("#", "data:")):
            issues.append(Issue(rel, lines.of(match.start()), f"url({target}) is not allowed; only data: URIs and #fragments"))


def _plan_page(html: str, app_dir: Path, issues: list[Issue]) -> _PagePlan:
    plan = _PagePlan()
    lines = _Lines(html)
    scanner = _PageScanner(html)
    for tag in scanner.tags:
        _check_tag_references(tag, lines, issues)
        if tag.name == "link" and "stylesheet" in tag.attrs.get("rel", "").lower().split():
            _plan_stylesheet(tag, lines, app_dir, plan, issues)
        elif tag.name == "script":
            _plan_script(tag, lines, app_dir, plan, issues)
    closing = html.lower().rfind("</body>")
    plan.body_close = len(html) if closing == -1 else closing
    return plan


def _check_tag_references(tag: _Tag, lines: _Lines, issues: list[Issue]) -> None:
    handled = (tag.name == "link" and "stylesheet" in tag.attrs.get("rel", "").lower().split()) or (
        tag.name == "script" and "src" in tag.attrs
    )
    if handled or tag.name in ("a", "area"):
        return
    for attribute in _URL_ATTRIBUTES:
        value = tag.attrs.get(attribute, "").strip()
        if value and not value.startswith(("#", "data:")):
            issues.append(Issue("index.html", lines.of(tag.start), f"<{tag.name} {attribute}=\"{value}\"> loads a file; the shared copy must be self-contained (use a data: URI)"))


def _plan_stylesheet(tag: _Tag, lines: _Lines, app_dir: Path, plan: _PagePlan, issues: list[Issue]) -> None:
    href = tag.attrs.get("href", "").strip()
    line = lines.of(tag.start)
    if not href or _SCHEME_OR_PROTOCOL_RELATIVE.match(href):
        issues.append(Issue("index.html", line, f"stylesheet \"{href}\" is external; only local files can be inlined"))
        return
    path = _local_file(app_dir, href, app_dir)
    if path is None:
        issues.append(Issue("index.html", line, f"stylesheet \"{href}\" does not exist"))
        return
    css = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    rel = path.relative_to(app_dir).as_posix()
    _check_css(rel, css, issues)
    plan.css_files.append(rel)
    plan.edits.append(_Edit(tag.start, tag.end, f"<style>\n{_escape_style_text(css.strip())}\n</style>"))


def _plan_script(tag: _Tag, lines: _Lines, app_dir: Path, plan: _PagePlan, issues: list[Issue]) -> None:
    line = lines.of(tag.start)
    kind = tag.attrs.get("type", "").strip().lower()
    src = tag.attrs.get("src", "").strip()
    whole = (tag.start, tag.close_end if tag.close_end > 0 else tag.end)
    if kind == "module":
        _plan_module_script(src, line, whole, app_dir, plan, issues)
    elif src:
        _plan_classic_script(src, line, whole, app_dir, plan, issues)


def _plan_module_script(src: str, line: int, whole: tuple[int, int], app_dir: Path, plan: _PagePlan, issues: list[Issue]) -> None:
    if not src:
        issues.append(Issue("index.html", line, "inline <script type=\"module\"> is not supported; put the code in a module file"))
        return
    if _SCHEME_OR_PROTOCOL_RELATIVE.match(src):
        issues.append(Issue("index.html", line, f"module script \"{src}\" is external"))
        return
    path = _local_file(app_dir, src, app_dir)
    if path is None:
        issues.append(Issue("index.html", line, f"module script \"{src}\" does not exist"))
        return
    plan.entries.append(path.relative_to(app_dir).as_posix())
    plan.edits.append(_Edit(whole[0], whole[1], ""))


def _plan_classic_script(src: str, line: int, whole: tuple[int, int], app_dir: Path, plan: _PagePlan, issues: list[Issue]) -> None:
    if _SCHEME_OR_PROTOCOL_RELATIVE.match(src):
        issues.append(Issue("index.html", line, f"script \"{src}\" is external"))
        return
    path = _local_file(app_dir, src, app_dir)
    if path is None:
        issues.append(Issue("index.html", line, f"script \"{src}\" does not exist"))
        return
    js = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    plan.edits.append(_Edit(whole[0], whole[1], f"<script>\n{escape_script_text(js.strip())}\n</script>"))


# --------------------------------------------------------------------------------------
# Assembly
# --------------------------------------------------------------------------------------

def read_version(app_dir: Path, issues: list[Issue]) -> str | None:
    path = app_dir / VERSION_FILE
    if not path.is_file():
        issues.append(Issue(VERSION_FILE, 1, "version file is missing"))
        return None
    match = _VERSION_EXPORT.search(path.read_text(encoding="utf-8"))
    if not match or not _SEMVER.fullmatch(match.group(2)):
        issues.append(Issue(VERSION_FILE, 1, "must contain `export const APP_VERSION = \"x.y.z\"`"))
        return None
    return match.group(2)


def assemble_bundle(graph: _Graph) -> str:
    parts = [f"// ---- {rel} ----\n{graph.modules[rel].body}" for rel in graph.order]
    return "(function () {\n\"use strict\";\n" + "\n\n".join(parts) + "\n})();"


def _apply_page_edits(html: str, plan: _PagePlan, bundle_js: str) -> str:
    edits = list(plan.edits)
    script = f"<script>\n{escape_script_text(bundle_js)}\n</script>\n"
    edits.append(_Edit(plan.body_close, plan.body_close, script))
    for edit in sorted(edits, key=lambda e: (e.start, e.end), reverse=True):
        html = html[:edit.start] + edit.text + html[edit.end:]
    return html


def _url_notes(app_dir: Path, files: list[str]) -> tuple[str, ...]:
    notes: list[str] = []
    for rel in files:
        text = (app_dir / rel).read_text(encoding="utf-8")
        for number, line in enumerate(text.split("\n"), start=1):
            for url in _URL_TEXT.findall(line):
                notes.append(f"{rel}:{number}: {url}")
    return tuple(notes)


def _size_issue(html_bytes: int, limit: int, app_dir: Path, files: list[str]) -> Issue | None:
    if html_bytes <= limit:
        return None
    sizes = sorted(((app_dir / rel).stat().st_size, rel) for rel in files)[::-1][:5]
    largest = ", ".join(f"{rel} ({size} B)" for size, rel in sizes)
    return Issue("dist", 0, f"bundle is {html_bytes} bytes, over the {limit}-byte limit; largest inputs: {largest}")


def build(
    app_dir: Path,
    dist_dir: Path,
    *,
    check_only: bool = False,
    size_limit: int = SIZE_LIMIT_BYTES,
) -> BuildResult:
    """Bundle app_dir into dist_dir, or with check_only=True validate without writing.

    Raises BundleRefused listing every problem found."""
    app_dir = app_dir.resolve()
    issues: list[Issue] = []
    index = app_dir / "index.html"
    if not index.is_file():
        raise BundleRefused([Issue("index.html", 0, "app/index.html does not exist")])
    html = index.read_text(encoding="utf-8").replace("\r\n", "\n")
    plan = _plan_page(html, app_dir, issues)
    if not plan.entries and not any(i.file == "index.html" for i in issues):
        issues.append(Issue("index.html", 1, "no <script type=\"module\" src=...> found"))
    graph = _Graph(app_dir, issues)
    for entry in plan.entries:
        graph.add_entry(entry)
    graph.check_imported_names()
    graph.check_duplicate_names()
    version = read_version(app_dir, issues)
    if issues or version is None:
        raise BundleRefused(issues)
    output = _apply_page_edits(html, plan, assemble_bundle(graph))
    inputs = ["index.html", *plan.css_files, *graph.order]
    size_issue = _size_issue(len(output.encode("utf-8")), size_limit, app_dir, inputs)
    if size_issue:
        raise BundleRefused([size_issue])
    outputs = () if check_only else _write_outputs(dist_dir, version, output)
    return BuildResult(version, output, outputs, _url_notes(app_dir, inputs))


def _write_outputs(dist_dir: Path, version: str, html: str) -> tuple[Path, ...]:
    dist_dir.mkdir(parents=True, exist_ok=True)
    data = html.encode("utf-8")
    versioned = dist_dir / f"Storytelling-{version}.html"
    plain = dist_dir / "Storytelling.html"
    for path in (versioned, plain):
        with path.open("wb") as handle:
            handle.write(data)
    return versioned, plain


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Bundle the Storytelling app into one HTML file.")
    parser.add_argument("--check", action="store_true", help="validate only; write nothing")
    parser.add_argument("--app", type=Path, default=PROJECT_ROOT / "app")
    parser.add_argument("--dist", type=Path, default=PROJECT_ROOT / "dist")
    args = parser.parse_args(argv)
    try:
        result = build(args.app, args.dist, check_only=args.check)
    except BundleRefused as refused:
        for issue in refused.issues:
            print(f"error: {issue}", file=sys.stderr)
        print(f"refused: {len(refused.issues)} problem(s); nothing written", file=sys.stderr)
        return 1
    for note in result.url_notes:
        print(f"note: http(s) text at {note} (must be About/credit text only)")
    size = len(result.html.encode("utf-8"))
    if args.check:
        print(f"ok: would write Storytelling-{result.version}.html ({size} bytes)")
    else:
        print(f"wrote {result.outputs[0]} and {result.outputs[1]} ({size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

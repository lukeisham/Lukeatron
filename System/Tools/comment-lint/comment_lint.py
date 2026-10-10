#!/usr/bin/env python3
"""comment-lint — enforces the Core Rules of Memory/Long-Term/Coding/vibe-coding-rules.md.

    comment_lint.py [path ...]    check the given files or folders (default: System/ and .claude/)

Checks:
  CORE-2  a code comment or docstring (.py .js .mjs .css .sh .html) holds no history, date,
          version, decision, permission, or spec or decision ID. App and widget README.md
          files are held to the same test (CORE-3).
  CORE-3  every folder in System/Apps/ and System/Widgets/ that holds .py or .js code has its own
          README.md and app-decisions.md at its root (CORE-4).

Prints one `path:line: [kind] text` per breach and, when there is any, a final line starting
with ✗ for the weekly memory-lint cron to log. Exits 1 on any breach.
"""
import ast
import io
import re
import sys
import tokenize
from collections.abc import Iterator
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_TARGETS = [ROOT / "System", ROOT / ".claude"]
APP_PARENTS = [ROOT / "System/Apps", ROOT / "System/Widgets"]

CODE_SUFFIXES = {".py", ".js", ".mjs", ".css", ".sh", ".html"}
# Generated output, snapshots, specs awaiting retirement, and scratch space are not maintained code.
SKIPPED_DIRS = {
    "node_modules", "__pycache__", ".git", "dist", "_build", "_research", "_scratch_build",
    "fixtures", "Sandbox", "baseline", "undo", "cache",
}

BREACH_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("date", re.compile(r"\b20\d\d-\d\d-\d\d\b")),
    ("version", re.compile(r"\bv\d+\.\d+(?:\.\d+)?\b")),
    ("history", re.compile(
        r"\b(?:used to be|formerly|was (?:changed|replaced|removed|moved)"
        r"|changed from|fixed (?:a |the )?bug|workaround for|re-?measured|baseline was"
        r"|(?:caught|found|added|removed) (?:during|in|on|after) (?:the )?(?:verification|audit|review|build|fix))\b", re.I)),
    ("decision", re.compile(
        r"\bLuke(?:'s)? (?:chose|choice|approved|granted|asked|decided|wants|wanted"
        r"|signed|agreed|prefers|ruled)\b|\bexception (?:granted|row)\b|\bLuke, \d"
        r"|\bapproved by\b|\bsigned off\b", re.I)),
    ("spec-id", re.compile(r"\b(?:AD|FR|NFR|INV|DEC|AC|OQ)(?:-[A-Z]{1,4})?-[A-Z]?\d+\b|\bD-\d{1,2}\b|\b[\w-]+\.spec\b")),
]

JS_BLOCK_ONLY = {".css"}
# Assembled from _shell/src/shell.html, so a fix belongs in that source, not the output.
BUILT_OUTPUT_SUFFIXES = ("_generator.html", "_parser.html")


def find_breaches(text: str) -> list[str]:
    return [kind for kind, pattern in BREACH_PATTERNS if pattern.search(text)]


def python_comments(source: str) -> Iterator[tuple[int, str]]:
    for token in tokenize.generate_tokens(io.StringIO(source).readline):
        if token.type == tokenize.COMMENT and not token.string.startswith("#!"):
            yield token.start[0], token.string
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            docstring_node = node.body[0] if node.body else None
            if (isinstance(docstring_node, ast.Expr) and isinstance(docstring_node.value, ast.Constant)
                    and isinstance(docstring_node.value.value, str)):
                for offset, line in enumerate(docstring_node.value.value.splitlines()):
                    yield docstring_node.lineno + offset, line


def c_style_comments(source: str, block_only: bool) -> Iterator[tuple[int, str]]:
    """Walks JS or CSS once, skipping string and template literals so data is never read as a
    comment. Regex literals are not tracked; a quote inside one can hide the rest of that line."""
    index, line, length = 0, 1, len(source)
    quote: str | None = None
    while index < length:
        char = source[index]
        if char == "\n":
            line += 1
            if quote in ("'", '"'):
                quote = None
        if quote:
            if char == "\\":
                index += 1
                if index < length and source[index] == "\n":
                    line += 1
            elif char == quote:
                quote = None
            index += 1
            continue
        if char in ("'", '"', "`"):
            quote = char
        elif source.startswith("/*", index):
            end = source.find("*/", index + 2)
            end = length if end == -1 else end
            for offset, text in enumerate(source[index + 2:end].split("\n")):
                yield line + offset, text
            line += source.count("\n", index, end)
            index = end + 2
            continue
        elif not block_only and source.startswith("//", index) and (index == 0 or source[index - 1] != ":"):
            end = source.find("\n", index)
            end = length if end == -1 else end
            yield line, source[index + 2:end]
            index = end
            continue
        index += 1


def html_comments(source: str) -> Iterator[tuple[int, str]]:
    for match in re.finditer(r"<!--(.*?)-->", source, re.S):
        start_line = source.count("\n", 0, match.start()) + 1
        for offset, text in enumerate(match.group(1).split("\n")):
            yield start_line + offset, text


def shell_comments(source: str) -> Iterator[tuple[int, str]]:
    for number, text in enumerate(source.splitlines(), start=1):
        stripped = text.lstrip()
        if stripped.startswith("#") and not stripped.startswith("#!"):
            yield number, stripped


def comments_in(path: Path, source: str) -> Iterator[tuple[int, str]]:
    match path.suffix:
        case ".py":
            yield from python_comments(source)
        case ".js" | ".mjs" | ".css":
            yield from c_style_comments(source, block_only=path.suffix in JS_BLOCK_ONLY)
        case ".html":
            yield from html_comments(source)
        case ".sh":
            yield from shell_comments(source)


def is_app_readme(path: Path) -> bool:
    return path.name == "README.md" and path.parent.parent in APP_PARENTS


def files_under(targets: list[Path]) -> Iterator[Path]:
    for target in targets:
        if target.is_file():
            yield target
            continue
        for directory, subdirectories, filenames in target.walk():
            subdirectories[:] = [name for name in subdirectories if name not in SKIPPED_DIRS]
            for name in filenames:
                path = directory / name
                if name.endswith(BUILT_OUTPUT_SUFFIXES):
                    continue
                if path.suffix in CODE_SUFFIXES or is_app_readme(path):
                    yield path


def text_breaches(path: Path) -> Iterator[str]:
    source = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix == ".md":
        lines: Iterator[tuple[int, str]] = enumerate(source.splitlines(), start=1)
    else:
        lines = comments_in(path, source)
    try:
        for number, text in lines:
            for kind in find_breaches(text):
                yield f"{path.relative_to(ROOT)}:{number}: [{kind}] {text.strip()[:140]}"
    except (SyntaxError, tokenize.TokenError) as error:
        yield f"{path.relative_to(ROOT)}:0: [unparsable] {error}"


def has_code(folder: Path) -> bool:
    return any(
        path.suffix in {".py", ".js"}
        for path in files_under([folder])
    )


def missing_app_docs() -> Iterator[str]:
    for parent in APP_PARENTS:
        for folder in sorted(path for path in parent.iterdir() if path.is_dir()):
            if not has_code(folder):
                continue
            for required in ("README.md", "app-decisions.md"):
                if not (folder / required).is_file():
                    yield f"{(folder / required).relative_to(ROOT)}:0: [missing] CORE-3/CORE-4 need it"


def main(argv: list[str]) -> int:
    targets = [Path(arg).resolve() for arg in argv] or DEFAULT_TARGETS
    breaches = [breach for path in files_under(targets) for breach in text_breaches(path)]
    if not argv:
        breaches.extend(missing_app_docs())
    for breach in breaches:
        print(breach)
    if not breaches:
        return 0
    files = len({breach.split(":", 1)[0] for breach in breaches})
    print(f"✗ comment-lint: {len(breaches)} Core Rule breaches in {files} files — run System/Tools/comment-lint/comment_lint.py")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

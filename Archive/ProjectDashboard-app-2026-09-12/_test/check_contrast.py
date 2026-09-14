"""Contrast check over the tokens (the styleguide spec AC-7).

"Every text/ground pair in the app measures >= 4.5:1, verified by a script over
the tokens, not by eye." Reads app/shared/tokens.css once, computes the real
WCAG relative-luminance contrast ratio for every text/ground pair the app's own
CSS actually pairs a colour token against (grepped by hand once, listed in
PAIRS below — this file does not parse the rest of the CSS, so a new pairing
introduced later needs a line added here to stay covered), and fails loudly on
any pair under the floor rather than a maintainer eyeballing swatches.

Run: python3 check_contrast.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

TOKENS_CSS = Path(__file__).resolve().parent / "app" / "shared" / "tokens.css"

# (text token, ground token, minimum ratio, where this pairing is drawn) — every
# entry here was confirmed against a real `color: var(--x)` on a `background:
# var(--y)` (or an inherited page/panel ground) by grepping app/monitor/*.css
# and app/unblock/*.css; this is not every token, only every one actually used
# as text against a ground somewhere in the app today.
PAIRS: list[tuple[str, str, float, str]] = [
    ("--ink", "--bg", 4.5, "body text on the page ground"),
    ("--ink", "--panel", 4.5, "control and card text on the panel ground"),
    ("--ink-guessed", "--bg", 4.5, "guessed-vs-stated text on the page ground"),
    ("--ink-guessed", "--panel", 4.5, "guessed-vs-stated text on the panel ground"),
    ("--bg", "--k3", 4.5, "primary-button text on kind-3 amber (monitor.css .primary-button)"),
    ("--bg", "--ink", 4.5, "worker toggle's pressed-state text (unblock.css .worker-btn[aria-pressed])"),
]

# The project sheet's own palette (styleguide FR-15/AC-8: ink-on-white, no
# fluorescent) — a second `:root` override under `@media print`, so it needs
# its own pass rather than being silently absorbed into the screen tokens
# above (a naive whole-file scan of every `:root { ... }` block would let this
# override clobber the screen values it's meant to sit beside instead).
PRINT_PAIRS: list[tuple[str, str, float, str]] = [
    ("--ink", "--bg", 4.5, "print sheet body text on white (styleguide FR-15/AC-8)"),
    ("--ink-guessed", "--bg", 4.5, "print sheet guessed-vs-stated text on white"),
]

_TOKEN_LINE = re.compile(r"(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);")
_ROOT_BLOCK = re.compile(r":root\s*\{([^{}]*)\}")
_PRINT_ROOT_BLOCK = re.compile(r"@media\s+print\s*\{\s*:root\s*\{([^{}]*)\}\s*\}")
_HEX = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")


class ContrastCheckError(Exception):
    """Raised when tokens.css cannot be parsed as this script expects."""


def parse_tokens(css_text: str) -> dict[str, str]:
    """The base screen palette — the file's first `:root { ... }` block, never
    the `@media print` override further down (that one has its own token dict,
    `parse_print_overrides`, so the two palettes can never bleed into each
    other the way a single whole-file scan of every `--name: value;` pair
    would let them)."""
    root_blocks = _ROOT_BLOCK.findall(css_text)
    if not root_blocks:
        raise ContrastCheckError(f"no :root block found in {TOKENS_CSS}")
    return {name: value.strip() for name, value in _TOKEN_LINE.findall(root_blocks[0])}


def parse_print_overrides(css_text: str) -> dict[str, str]:
    """Whatever `@media print { :root { ... } } ` redefines — empty if tokens.css
    carries no print override at all."""
    match = _PRINT_ROOT_BLOCK.search(css_text)
    if not match:
        return {}
    return {name: value.strip() for name, value in _TOKEN_LINE.findall(match.group(1))}


def _hex_to_rgb(hex_value: str) -> tuple[float, float, float, float]:
    match = _HEX.match(hex_value)
    if not match:
        raise ContrastCheckError(f"not a hex colour: {hex_value!r}")
    digits = match.group(1)
    if len(digits) == 3:
        digits = "".join(ch * 2 for ch in digits)
    r, g, b = (int(digits[i : i + 2], 16) for i in (0, 2, 4))
    a = int(digits[6:8], 16) / 255 if len(digits) == 8 else 1.0
    return r / 255, g / 255, b / 255, a


def _composite(fg: tuple[float, float, float, float], bg: tuple[float, float, float, float]) -> tuple[float, float, float]:
    r, g, b, a = fg
    br, bg_, bb, _ = bg
    return (a * r + (1 - a) * br, a * g + (1 - a) * bg_, a * b + (1 - a) * bb)


def _channel_luminance(c: float) -> float:
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(rgb: tuple[float, float, float]) -> float:
    r, g, b = (_channel_luminance(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(hex_a: str, hex_b: str) -> float:
    """WCAG contrast ratio between two colours, resolving `hex_a`'s alpha (if
    any) by compositing it over `hex_b` first — the correct treatment for a
    translucent text colour like `--ink-guessed` (FR-14), never treating it as
    opaque against an assumed ground."""
    fg = _hex_to_rgb(hex_a)
    bg = _hex_to_rgb(hex_b)
    composited = _composite(fg, bg) if fg[3] < 1.0 else fg[:3]
    l1 = relative_luminance(composited)
    l2 = relative_luminance(bg[:3])
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def check_pairs(tokens: dict[str, str], pairs: list[tuple[str, str, float, str]]) -> list[tuple[str, str, float, float, str]]:
    """Returns one row per pair: (text_token, ground_token, ratio, minimum, where).
    Never itself raises on a failing ratio — the caller decides what a failure
    means (TEST-7: the script's own gate test drives both paths)."""
    rows = []
    for text_token, ground_token, minimum, where in pairs:
        if text_token not in tokens:
            raise ContrastCheckError(f"{text_token} is not defined in tokens.css")
        if ground_token not in tokens:
            raise ContrastCheckError(f"{ground_token} is not defined in tokens.css")
        ratio = contrast_ratio(tokens[text_token], tokens[ground_token])
        rows.append((text_token, ground_token, ratio, minimum, where))
    return rows


def _report(label: str, rows: list[tuple[str, str, float, float, str]]) -> int:
    print(f"-- {label} --")
    failures = 0
    for text_token, ground_token, ratio, minimum, where in rows:
        status = "PASS" if ratio >= minimum else "FAIL"
        if status == "FAIL":
            failures += 1
        print(f"{status}  {text_token} on {ground_token}  {ratio:.2f}:1 (>= {minimum:.1f}:1)  — {where}")
    return failures


def main() -> int:
    try:
        css_text = TOKENS_CSS.read_text(encoding="utf-8")
    except OSError as err:
        raise ContrastCheckError(f"could not read {TOKENS_CSS}: {err}") from err

    screen_tokens = parse_tokens(css_text)
    print_tokens = {**screen_tokens, **parse_print_overrides(css_text)}

    failures = _report("screen", check_pairs(screen_tokens, PAIRS))
    failures += _report("print", check_pairs(print_tokens, PRINT_PAIRS))

    total = len(PAIRS) + len(PRINT_PAIRS)
    if failures:
        print(f"\n{failures} of {total} pair(s) below the AC-7 floor.", file=sys.stderr)
        return 1
    print(f"\nAll {total} pair(s) pass.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

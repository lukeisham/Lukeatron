"""Contrast check over the tokens.

"All three palettes pass check_contrast.py." Reads app/tokens.css once,
computes the real WCAG relative-luminance contrast ratio for every text/ground
pair the app's own CSS actually pairs a colour token against (grepped by hand
once, listed in PAIRS below — this file does not parse the rest of the CSS, so
a new pairing introduced later needs a line added here to stay covered), and
fails loudly on any pair under the floor rather than a maintainer eyeballing
swatches.

tokens.css carries three palettes cycled by `controls` — "default" (the bare
`:root` block), "paper" and "dark" (each a `body[data-palette="X"]`
override) — plus a `@media print` override. PAIRS must pass under
all three palettes, not just the default one, so this script resolves each
named override on top of the base tokens (an override wins for whatever it
redefines; everything else falls through to the default) and runs PAIRS
against each of the three results, in addition to the existing print pass.

Run: python3 check_contrast.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

TOKENS_CSS = Path(__file__).resolve().parent / "app" / "tokens.css"

# (text token, ground token, minimum ratio, where this pairing is drawn) —
# every entry here was confirmed against a real `color: var(--x)` on a
# `background: var(--y)` (or an inherited page/panel ground) by grepping
# app/board/*.css and app/controls/*.css; this is not every token, only every
# one actually used as text against a ground somewhere in the app today. A
# color-mix() ground (the lane wash, board.css) is deliberately excluded —
# this script only resolves literal hex values, the same scope its
# ProjectDashboard predecessor kept.
PAIRS: list[tuple[str, str, float, str]] = [
    ("--ink", "--bg", 4.5, "body text on the page ground"),
    ("--ink", "--panel-bg", 4.5, "card and control text on the panel ground"),
    ("--ink", "--panel-bg-alt", 4.5, "header and pill text on the alt panel ground"),
    ("--ink-muted", "--bg", 4.5, "muted text on the page ground"),
    ("--ink-muted", "--panel-bg", 4.5, "muted text on the panel ground (card due-date, meta labels)"),
    ("--ink-muted", "--panel-bg-alt", 4.5, "muted text on the alt panel ground (board counts)"),
    ("--accent", "--panel-bg", 4.5, "Documents/People row names on the panel ground (project.css .project-row-text--accent)"),
    # Flourish (shared/flourish.css). --danger is a border on a control, never text, so it is a
    # non-text UI component (WCAG 1.4.11: 3:1) against both grounds the control sits between.
    ("--danger", "--bg", 3.0, "failed-edit border against the control's own ground"),
    ("--danger", "--panel-bg", 3.0, "failed-edit border against the row it sits in"),
    ("--accent-text", "--bg", 4.5, "the saved-edit ✓ mark, which floats over the row's page ground"),
    ("--accent-text", "--panel-bg-alt", 4.5, "the 'Copied' button text (project.css .project-copy-btn.is-copied)"),
    ("--accent", "--panel-bg-alt", 3.0, "the copy tick and the 'Copied' button's border (non-text, 1.4.11)"),
]
# Note: the next-action line's lane colour (card.css
# .board-card-next-action[data-lane="..."]) is a decorative border, not the
# text colour — the text itself stays --ink, so it is not a text/ground pair
# this file needs to check (a border colour has no minimum-contrast rule;
# three of the five lane tokens measured 2.66-4.15:1 as TEXT here, which is
# exactly why the design uses a border instead — see card.css's own comment).

# Grounds that are a color-mix() of a tint over a base (the Next row, the copy/saved/failed
# washes). The pairs above resolve literal hex only, so these are mixed here the way CSS's
# `color-mix(in srgb, <tint> <strength>, <base>)` does — straight sRGB channels. Each entry:
# (text token, tint tokens, base token, strength token, minimum ratio, where). The lane tint
# is checked for every lane token, since a row's lane is data. Print drops every one of these
# (flourish.css @media print), so there is no print pass.
LANE_TOKENS: tuple[str, ...] = ("--l-mine", "--l-delegate", "--l-waiting", "--l-incoming", "--l-unshaped")
MIXED_PAIRS: list[tuple[str, tuple[str, ...], str, str, float, str]] = [
    ("--ink", LANE_TOKENS, "--panel-bg", "--next-tint-strength", 4.5, "the Next row's label on its lane tint"),
    ("--ink", LANE_TOKENS, "--bg", "--next-tint-strength", 4.5, "a stem chip's label on its lane tint"),
    ("--accent-text", LANE_TOKENS, "--panel-bg", "--next-tint-strength", 4.5, "the Next word on the Next row's lane tint"),
    ("--accent-text", LANE_TOKENS, "--bg", "--next-tint-strength", 4.5, "the Next word on a stem chip's lane tint"),
    ("--ink", ("--accent",), "--panel-bg", "--wash-strength", 4.5, "row text at the peak of the copy wash"),
    ("--ink", ("--accent",), "--bg", "--wash-strength", 4.5, "control text at the peak of the saved wash"),
    ("--ink", ("--danger",), "--bg", "--wash-strength", 4.5, "control text on the failed-edit red wash"),
]

# The print palette (paper is the print base path) — a second
# `:root` override under `@media print`, so it needs its own pass rather than
# being silently absorbed into the screen tokens above (a naive whole-file
# scan of every `:root { ... }` block would let this override clobber the
# screen values it's meant to sit beside instead).
PRINT_PAIRS: list[tuple[str, str, float, str]] = [
    ("--ink", "--bg", 4.5, "print sheet body text on the paper ground"),
    ("--ink-muted", "--bg", 4.5, "print sheet muted text on the paper ground"),
    ("--accent", "--panel-bg", 4.5, "print sheet Documents/People row names on the panel ground"),
]

# The three palettes PAIRS must pass under — "default" has no override block of its
# own (the base :root IS the default palette); "paper" and "dark" each
# resolve as the base tokens with their named override layered on top.
PALETTE_NAMES: tuple[str, ...] = ("paper", "dark")

_TOKEN_LINE = re.compile(r"(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);")
_ROOT_BLOCK = re.compile(r":root\s*\{([^{}]*)\}")
_PRINT_ROOT_BLOCK = re.compile(r"@media\s+print\s*\{\s*:root\s*\{([^{}]*)\}\s*\}")
_PALETTE_BLOCK = re.compile(r'body\[data-palette=(["\'])([a-zA-Z0-9_-]+)\1\]\s*\{([^{}]*)\}')
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


def parse_palette_overrides(css_text: str) -> dict[str, dict[str, str]]:
    """Every `body[data-palette="X"] { ... }` block, keyed by X — the
    explicit-attribute form of a named palette (paper, dark, ...).

    The `@media (prefers-color-scheme: dark) { body:not(...) { ... } }` block
    is deliberately not parsed here: print must carry exactly the
    same values as `body[data-palette="dark"]` so the explicit toggle always
    wins over the system, and tokens.css's own header comment says as much —
    checking the attribute form once is checking both by construction. A
    change to one block without the other is a defect this comment exists to
    catch by inspection, not something this script re-derives."""
    overrides: dict[str, dict[str, str]] = {}
    for _quote, name, body in _PALETTE_BLOCK.findall(css_text):
        overrides[name] = {n: v.strip() for n, v in _TOKEN_LINE.findall(body)}
    return overrides


def resolve_palette(base: dict[str, str], override: dict[str, str]) -> dict[str, str]:
    """A named palette's full token set: the override's own redefinitions,
    everything else falling through to the default `:root` (an override
    block only ever restates what actually differs, e.g. --font-body never
    appears in `body[data-palette="dark"]` because no palette changes it)."""
    return {**base, **override}


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
    translucent text colour like `--ink-guessed`, never treating it as
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


def _mix_to_hex(tint_hex: str, base_hex: str, strength: float) -> str:
    """`color-mix(in srgb, tint strength, base)` as an opaque hex — both inputs opaque."""
    tr, tg, tb, _ = _hex_to_rgb(tint_hex)
    br, bg_, bb, _ = _hex_to_rgb(base_hex)
    channels = (strength * tr + (1 - strength) * br, strength * tg + (1 - strength) * bg_, strength * tb + (1 - strength) * bb)
    return "#" + "".join(f"{round(c * 255):02x}" for c in channels)


def _strength(value: str) -> float:
    match = re.fullmatch(r"\s*(\d+(?:\.\d+)?)%\s*", value)
    if not match:
        raise ContrastCheckError(f"not a percentage: {value!r}")
    return float(match.group(1)) / 100


def check_mixed(tokens: dict[str, str]) -> list[tuple[str, str, float, float, str]]:
    """One row per (text, tint, base) combination in MIXED_PAIRS, the ground being the tint mixed
    over the base at the named strength. Same row shape as check_pairs, so _report prints both."""
    rows = []
    for text_token, tint_tokens, base_token, strength_token, minimum, where in MIXED_PAIRS:
        for name in (text_token, base_token, strength_token, *tint_tokens):
            if name not in tokens:
                raise ContrastCheckError(f"{name} is not defined in tokens.css")
        strength = _strength(tokens[strength_token])
        for tint_token in tint_tokens:
            ground = _mix_to_hex(tokens[tint_token], tokens[base_token], strength)
            ratio = contrast_ratio(tokens[text_token], ground)
            rows.append((text_token, f"{tint_token}@{strength_token} over {base_token}", ratio, minimum, where))
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

    default_tokens = parse_tokens(css_text)
    palette_overrides = parse_palette_overrides(css_text)
    print_tokens = {**default_tokens, **parse_print_overrides(css_text)}

    mixed_total = sum(len(tints) for _, tints, *_ in MIXED_PAIRS)
    failures = _report("default palette", check_pairs(default_tokens, PAIRS) + check_mixed(default_tokens))
    total = len(PAIRS) + mixed_total

    for name in PALETTE_NAMES:
        if name not in palette_overrides:
            raise ContrastCheckError(f'no body[data-palette="{name}"] block found in {TOKENS_CSS}')
        resolved = resolve_palette(default_tokens, palette_overrides[name])
        failures += _report(f"{name} palette", check_pairs(resolved, PAIRS) + check_mixed(resolved))
        total += len(PAIRS) + mixed_total

    failures += _report("print", check_pairs(print_tokens, PRINT_PAIRS))
    total += len(PRINT_PAIRS)

    if failures:
        print(f"\n{failures} of {total} pair(s) below the AC-4 floor.", file=sys.stderr)
        return 1
    print(f"\nAll {total} pair(s) pass, across all three palettes and print.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

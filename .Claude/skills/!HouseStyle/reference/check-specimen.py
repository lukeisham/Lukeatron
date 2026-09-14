#!/usr/bin/env python3
"""check-specimen.py — the !HouseStyle regression harness.

Asserts every custom property declared in a tokens file is actually exercised by a
specimen (or any page). An unexercised token is either dead weight or an untested
promise; both rot silently, which is what this catches.

    python3 check-specimen.py reference/tokens.css specimen.html
    python3 check-specimen.py reference/tokens.css a-real-page.html --surface

TWO MODES, because they answer different questions:

  default (specimen mode)  The page is the token INVENTORY. Every declared token must
                           appear, or it is dead weight or an untested promise.
                           Exit 1 if any token is unexercised.

  --surface                The page is a REAL surface, which legitimately uses only
                           some tokens (a form has no print rules; a table has no
                           glyphs). Reports coverage and still FAILS on colour, spacing
                           and duration LITERALS, which is the thing that actually rots
                           a token layer. Never fails merely for unused tokens.

Standard library only (vibe-coding-rules SR-2).
"""
import re
import sys
from pathlib import Path

DECL = re.compile(r"(?:^|[;{])\s*(--[A-Za-z0-9_-]+)\s*:", re.M)
USE = re.compile(r"var\(\s*(--[A-Za-z0-9_-]+)")
COMMENT = re.compile(r"/\*.*?\*/", re.S)


def strip_comments(src):
    """A token named in a comment is documentation, not a declaration or a usage."""
    return COMMENT.sub(" ", src)


# Literals that should have been tokens. Scoped to declaration position so token
# definitions and legitimate zero/1px hairlines do not trip it.
HEX = re.compile(r":\s*#[0-9a-fA-F]{3,8}\b")
PX = re.compile(r":\s*(?!0)(\d+)px\b")
MS = re.compile(r"(\d+)m?s\b")
LEGAL_PX = {1, 2, 3}  # hairlines and optical nudges


def find_literals(src, tokens_src=""):
    """Colour, spacing and duration literals in a page that should be var() calls.

    The token layer itself is exempt: it is where literals are SUPPOSED to live.
    When tokens.css is inlined into the page, subtract it wholesale — that also
    exempts the reduced-motion floor's 1ms, which is part of the layer's contract.
    """
    body = strip_comments(src)
    if tokens_src:
        body = body.replace(strip_comments(tokens_src), " ")
    # belt and braces for a page that redeclares :root itself
    body = re.sub(r":root[^{]*\{[^}]*\}", " ", body)
    out = []
    out += [f"colour {m.group(0).strip()}" for m in HEX.finditer(body)]
    out += [f"length {m.group(0).strip()}" for m in PX.finditer(body)
            if int(m.group(1)) not in LEGAL_PX]
    out += [f"duration {m.group(0)}" for m in MS.finditer(body)]
    return out


def main(argv):
    argv = list(argv)
    surface_mode = "--surface" in argv
    if surface_mode:
        argv.remove("--surface")
    if len(argv) != 3:
        print(__doc__.strip())
        return 2

    tokens_path, page_path = Path(argv[1]), Path(argv[2])
    for p in (tokens_path, page_path):
        if not p.is_file():
            print(f"FAIL  not a file: {p}")
            return 2

    tokens_src = strip_comments(tokens_path.read_text(encoding="utf-8"))
    page_src = strip_comments(page_path.read_text(encoding="utf-8"))

    # A token redeclared in the dark override is the same token, so collapse to a set.
    declared = set(DECL.findall(tokens_src))
    # Exercised = referenced via var() in the page, or in the tokens file itself
    # (one token composing another, e.g. --shade-edge referencing --line).
    used = set(USE.findall(page_src)) | set(USE.findall(tokens_src))

    unexercised = sorted(declared - used)
    unknown = sorted(used - declared)

    print(f"mode:        {'surface' if surface_mode else 'specimen'}")
    print(f"declared:    {len(declared)}")
    print(f"exercised:   {len(declared & used)}")
    print(f"unexercised: {len(unexercised)}")

    if unknown:
        print(f"\nWARN  {len(unknown)} var() reference(s) to undeclared tokens:")
        for t in unknown:
            print(f"  ?  {t}")

    if surface_mode:
        pct = round(100 * len(declared & used) / len(declared)) if declared else 0
        print(f"coverage:    {pct}%  (a real surface uses only what it needs)")
        literals = find_literals(page_src, tokens_src)
        if literals:
            print(f"\nFAIL  {len(literals)} hard-coded literal(s) that should be tokens:")
            for lit in sorted(set(literals)):
                print(f"  -  {lit}")
            return 1
        print("\nPASS  no hard-coded colour, length or duration literals.")
        return 1 if unknown else 0

    if unexercised:
        print(f"\nFAIL  {len(unexercised)} token(s) declared but never exercised:")
        for t in unexercised:
            print(f"  -  {t}")
        return 1

    print("\nPASS  every declared token is exercised.")
    return 1 if unknown else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

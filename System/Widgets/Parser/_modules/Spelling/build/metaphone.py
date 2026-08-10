"""metaphone.py — classic (single-key) Metaphone phonetic encoding.

Build-time port of `src/metaphone.js`. The two implementations MUST stay in
lockstep, rule for rule: this script precomputes each dictionary word's
Metaphone code into the `phonetic_index` table, and the browser-side
`src/metaphone.js` computes the misspelled word's code at query time — they
join on equal strings, so any drift between the two silently breaks phonetic
suggestion recall with no error. `bench/check_metaphone_parity.mjs` verifies
the two agree on a word sample; re-run it after editing either file.

Independently implemented from the published (public-domain) rule
description of Lawrence Philips' 1990 Metaphone algorithm — no code copied
from any licensed implementation.
"""

VOWELS = frozenset("AEIOU")


def _is_vowel(ch: str) -> bool:
    return ch in VOWELS


def metaphone(word: str) -> str:
    """Return the classic Metaphone code for `word` (letters only, uppercase,
    variable length — used for equality matching, not display)."""
    if not word:
        return ""

    raw = "".join(ch for ch in word.upper() if "A" <= ch <= "Z")
    if not raw:
        return ""

    if raw[:2] in ("KN", "GN", "PN", "AE", "WR"):
        raw = raw[1:]
    elif raw[0] == "X":
        raw = "S" + raw[1:]
    elif raw[:2] == "WH":
        raw = "W" + raw[2:]
    if not raw:
        return ""

    w_chars = [raw[0]]
    for i in range(1, len(raw)):
        if raw[i] == raw[i - 1] and raw[i] != "C":
            continue
        w_chars.append(raw[i])
    w = "".join(w_chars)

    n = len(w)
    out: list[str] = []
    skip = 0

    for i in range(n):
        if skip > 0:
            skip -= 1
            continue
        c = w[i]
        prev = w[i - 1] if i > 0 else ""
        nxt = w[i + 1] if i + 1 < n else ""
        nxt2 = w[i + 2] if i + 2 < n else ""
        is_first = i == 0

        if _is_vowel(c):
            if is_first:
                out.append(c)
            continue

        if c == "B":
            if not (i == n - 1 and prev == "M"):
                out.append("B")

        elif c == "C":
            if nxt == "I" and nxt2 == "A":
                out.append("X")
            elif nxt == "H":
                out.append("" if prev == "S" else "X")
                skip = 1
            elif nxt in ("I", "E", "Y"):
                out.append("S")
            else:
                out.append("K")

        elif c == "D":
            if nxt == "G" and nxt2 in ("E", "Y", "I"):
                out.append("J")
                skip = 1
            else:
                out.append("T")

        elif c == "G":
            if nxt == "H":
                after_h = w[i + 2] if i + 2 < n else ""
                if not _is_vowel(after_h):
                    skip = 1  # silent GH
                else:
                    out.append("K")
                    skip = 1
            else:
                handled = False
                if nxt == "N":
                    rest = w[i + 2:]
                    if rest == "" or rest == "ED":
                        skip = len(rest) + 1
                        handled = True
                if not handled:
                    if nxt in ("I", "E", "Y") and prev != "G":
                        out.append("J")
                    else:
                        out.append("K")

        elif c == "H":
            if _is_vowel(prev) and not _is_vowel(nxt):
                pass  # silent — vowel-H-consonant
            elif prev in "CSPTG":
                pass  # silent after these
            else:
                out.append("H")

        elif c == "K":
            if prev != "C":
                out.append("K")

        elif c == "P":
            if nxt == "H":
                out.append("F")
                skip = 1
            else:
                out.append("P")

        elif c == "Q":
            out.append("K")

        elif c == "S":
            if nxt == "I" and nxt2 in ("O", "A"):
                out.append("X")
            elif nxt == "H":
                out.append("X")
                skip = 1
            else:
                out.append("S")

        elif c == "T":
            if nxt == "I" and nxt2 in ("O", "A"):
                out.append("X")
            elif nxt == "H":
                out.append("0")  # theta
                skip = 1
            else:
                out.append("T")

        elif c == "V":
            out.append("F")

        elif c == "W":
            if _is_vowel(nxt):
                out.append("W")

        elif c == "X":
            out.append("KS")

        elif c == "Y":
            if _is_vowel(nxt):
                out.append("Y")

        elif c == "Z":
            out.append("S")

        else:  # F J L M N R
            out.append(c)

    return "".join(out)

#!/usr/bin/env python3
"""build_spelling_db.py — build the Spelling module's SQLite dictionary from
a SCOWL/ESDB release.

Provenance (required before this script may ship a `.db` — SpellingModule.spec.md AD-6/OQ-3):
  Source:   SCOWL / ESDB (English Speller Database), release 2020.12.07.
            https://github.com/en-wl/wordlist (formerly hosted as SCOWL/VarCon).
  Licence:  Permissive, MIT-like. Copyright 2000-2018 Kevin Atkinson. Quoted
            from the release's own `Copyright` file: "Permission to use,
            copy, modify, distribute and sell these word lists, the
            associated scripts, the output created from the scripts, and its
            documentation for any purpose is hereby granted without fee,
            provided that the above copyright notice appears in all
            copies..." No copyleft, no share-alike.
  Ruling:   `_research/DECISION-dictionary-source.md` (2026-08-09) — this
            source overrides the (verified-wrong) LibreOffice Hunspell
            recommendation in `_research/dictionary-sources.md`.
  Retrieved: 2026-08-09, `scowl-2020.12.07.tar.gz` (2.5 MB), extracted flat
            word lists from its `final/` directory (359 plain-text files,
            one word per line, ISO-8859-1/latin-1 encoded).

Required attribution (widget footer, per the ruling):
  "Spelling dictionary: SCOWL 2020.12.07 (c) 2000-2018 Kevin Atkinson --
   permissive licence. http://wordlist.aspell.net/"

Usage:
  python3 build_spelling_db.py --scowl-dir <path-to-scowl-final-or-release> --out spelling.db
  python3 build_spelling_db.py --scowl-dir <path> --out spelling_with_index.db --with-deletion-index

Default word-selection: SCOWL size tier <= 60 (~128k words), across the
english/american/british/australian/variant_1 dialect stems, all five SCOWL
categories (words, abbreviations, contractions, proper-names, upper) — this
combination is what the dictionary-source ruling's verified count
(127,830 words at tier<=60) was computed from.
"""
from __future__ import annotations

import argparse
import base64
import gzip
import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from metaphone import metaphone  # noqa: E402  (sys.path setup must precede this import)

DEFAULT_TIER = 50
# Measured, not guessed (see README's size-measurement section): tier<=60 with all five SCOWL
# categories (the ruling's suggested default) built an 11 MB .db, most of it a duplicate index
# bug plus ~20k low-value proper-name/upper entries. Fixed and re-measured: tier<=50 with just
# words/abbreviations/contractions gives 85,032 headwords (clears the plan's "ge60k" success
# criterion with margin) at 3.10 MB raw / ~4.1 MB base64-inflated -- the shipped default.
DIALECT_STEMS: dict[str, str | None] = {
    # stem name in SCOWL filenames -> variant tag ('AU'|'GB'|'US'|None=neutral)
    "english": None,
    "variant_1": None,
    "american": "US",
    "british": "GB",
    "australian": "AU",
}
ALL_CATEGORIES = ("words", "abbreviations", "contractions", "proper-names", "upper")
# Default excludes proper-names/upper: measured at tier<=60 they contribute ~8.5k + ~12k
# entries (16% of the list) for words that are of little spell-check value — proper nouns
# can't be meaningfully checked against a fixed list, and ALL-CAPS/CamelCase tokens are
# already exempted by the tokenizer+rule-order (spec FR-8 rule 7, §4 rule 3), not by dictionary
# membership. Cutting them keeps the dictionary focused on actual vocabulary and saves real
# bytes — see README's size-measurement section for the before/after numbers.
DEFAULT_CATEGORIES = ("words", "abbreviations", "contractions", "proper-names")
# "proper-names" was cut in an earlier pass of this script to save space, then
# MEASURED and put back: the AC-6 false-positive benchmark (bench/benchmark.mjs)
# showed a 65.8% false-positive rate against a 231-word proper-noun/jargon
# holdout with proper-names excluded -- almost every capitalised place/person
# name not at a sentence start (which is most of them) has no rule to protect
# it once it's not literally in the dictionary. Re-adding proper-names cost
# +0.31 MB raw (85,032 -> 93,456 words) and dropped the false-positive rate to
# the range recorded in README.md's benchmark section -- a clearly justified
# trade against SR-3, spelled out there with the real before/after numbers.
# "upper" (ALL-CAPS entries) stays excluded: FR-8 rule 7 / §4 rule 3 already
# exempt ALL-CAPS tokens by pattern, so a dictionary entry for them is dead
# weight, not a false-positive fix.

SCHEMA = """
CREATE TABLE words (
  word_id  INTEGER PRIMARY KEY,
  word     TEXT UNIQUE NOT NULL,
  rank     INTEGER NOT NULL,
  variant  TEXT
);

CREATE TABLE meta (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
"""
# NOTE: `word TEXT UNIQUE` already creates an implicit index
# (sqlite_autoindex_words_1) — an earlier version of this script also added
# an explicit `CREATE INDEX idx_words_word ON words(word)`, silently
# duplicating that index and costing ~2.2 MB for nothing. Measured and cut;
# see README's size-measurement section. Do not re-add it.

PHONETIC_INDEX_SCHEMA = """
CREATE TABLE phonetic_index (
  word_id    INTEGER NOT NULL REFERENCES words(word_id),
  metaphone  TEXT NOT NULL
);
CREATE INDEX idx_phonetic_metaphone ON phonetic_index(metaphone);
"""

DELETION_INDEX_SCHEMA = """
CREATE TABLE deletion_index (
  deletion_key TEXT NOT NULL,
  word_id INTEGER NOT NULL
);
CREATE INDEX idx_deletion_key ON deletion_index(deletion_key);
"""


def parse_tier(filename_stem_and_tier: str) -> tuple[str, int] | None:
    """Split a SCOWL final/ filename like 'english-words.60' into
    ('english-words', 60). Returns None for files without a numeric tier
    suffix (e.g. 'special-hacker.35' still matches; anything malformed is
    skipped)."""
    if "." not in filename_stem_and_tier:
        return None
    base, tier_str = filename_stem_and_tier.rsplit(".", 1)
    if not tier_str.isdigit():
        return None
    return base, int(tier_str)


def collect_words(
    scowl_final_dir: Path, max_tier: int, categories: tuple[str, ...] = DEFAULT_CATEGORIES
) -> dict[str, tuple[int, set[str]]]:
    """Read every matching SCOWL list file at or below `max_tier`.

    Returns {word: (min_tier_seen, {variant_tags_seen})}. `variant_tags_seen`
    is a set of 'AU'/'GB'/'US' region tags the word was found under (empty
    set = only ever seen in a neutral stem, i.e. accepted everywhere).
    """
    entries: dict[str, tuple[int, set[str]]] = {}
    matched_files = 0

    for path in sorted(scowl_final_dir.iterdir()):
        if not path.is_file():
            continue
        parsed = parse_tier(path.name)
        if parsed is None:
            continue
        base, tier = parsed
        if tier > max_tier:
            continue
        stem_match: str | None = None
        for stem in DIALECT_STEMS:
            for cat in categories:
                if base == f"{stem}-{cat}":
                    stem_match = stem
                    break
            if stem_match:
                break
        if stem_match is None:
            continue

        matched_files += 1
        variant = DIALECT_STEMS[stem_match]
        for raw_line in path.read_text(encoding="latin-1").splitlines():
            word = raw_line.strip()
            if not word:
                continue
            existing = entries.get(word)
            if existing is None:
                entries[word] = (tier, {variant} if variant else set())
            else:
                prev_tier, prev_variants = existing
                if variant:
                    prev_variants.add(variant)
                entries[word] = (min(prev_tier, tier), prev_variants)

    if matched_files == 0:
        raise RuntimeError(
            f"no SCOWL list files matched under {scowl_final_dir} "
            f"(tier <= {max_tier}) — check --scowl-dir points at the release's final/ directory"
        )
    return entries


def generate_deletions(word: str) -> set[str]:
    """SymSpell-style edit-distance-1 deletion neighbourhood: every string
    obtained by deleting exactly one character, plus the word itself."""
    deletions = {word}
    for i in range(len(word)):
        deletions.add(word[:i] + word[i + 1:])
    return deletions


def build_database(
    entries: dict[str, tuple[int, set[str]]],
    out_path: Path,
    with_deletion_index: bool,
    with_phonetic_index: bool,
    tier: int,
) -> None:
    if out_path.exists():
        out_path.unlink()

    with sqlite3.connect(out_path) as conn:
        conn.executescript(SCHEMA)
        if with_deletion_index:
            conn.executescript(DELETION_INDEX_SCHEMA)
        if with_phonetic_index:
            conn.executescript(PHONETIC_INDEX_SCHEMA)

        word_rows = []
        for word_id, (word, (rank, variants)) in enumerate(sorted(entries.items()), start=1):
            variant_tag = sorted(variants)[0] if len(variants) == 1 else None
            word_rows.append((word_id, word, rank, variant_tag))

        conn.executemany(
            "INSERT INTO words (word_id, word, rank, variant) VALUES (?, ?, ?, ?)",
            word_rows,
        )

        if with_phonetic_index:
            phonetic_rows = [
                (word_id, metaphone(word))
                for word_id, word, _rank, _variant in word_rows
                if metaphone(word)
            ]
            conn.executemany(
                "INSERT INTO phonetic_index (word_id, metaphone) VALUES (?, ?)",
                phonetic_rows,
            )
            print(f"  phonetic_index rows: {len(phonetic_rows):,}")

        if with_deletion_index:
            deletion_rows: list[tuple[str, int]] = []
            for word_id, word, _rank, _variant in word_rows:
                lower = word.lower()
                if not lower.isalpha() or len(lower) < 2:
                    continue
                for key in generate_deletions(lower):
                    deletion_rows.append((key, word_id))
            conn.executemany(
                "INSERT INTO deletion_index (deletion_key, word_id) VALUES (?, ?)",
                deletion_rows,
            )
            print(f"  deletion_index rows: {len(deletion_rows):,}")

        conn.execute(
            "INSERT INTO meta (key, value) VALUES (?, ?)",
            ("source", "SCOWL/ESDB 2020.12.07"),
        )
        conn.execute(
            "INSERT INTO meta (key, value) VALUES (?, ?)",
            ("licence", "Permissive (Kevin Atkinson, 2000-2018) - see build script header"),
        )
        conn.execute("INSERT INTO meta (key, value) VALUES (?, ?)", ("tier", str(tier)))
        conn.execute(
            "INSERT INTO meta (key, value) VALUES (?, ?)",
            ("word_count", str(len(word_rows))),
        )
        conn.execute(
            "INSERT INTO meta (key, value) VALUES (?, ?)",
            ("has_deletion_index", "1" if with_deletion_index else "0"),
        )
        conn.commit()
        conn.execute("VACUUM")


def write_gzipped_copy(db_path: Path) -> Path:
    """Write `<db_path>.gz` (gzip -9, stdlib) alongside the built `.db`.

    TASK-1 (test-and-refine pass, 2026-08-10): measured against the shipped
    93,456-word dictionary — raw 3,571,712 bytes / base64 4,762,284 bytes vs.
    gzip 1,620,962 bytes / base64(gzip) 2,161,284 bytes (~55% smaller than
    shipping the raw base64 `.db`). DecompressionStream('gzip') round-tripped
    byte-identical in ~64ms (Node v26, in-process; a real in-browser number
    was not obtainable in this build environment, flagged not guessed at —
    see README "Compression" section). The gzip file is a build artefact for
    a host's assembler to embed + base64-encode; this script does not touch
    `_shell/build/assemble.py` itself, which does not yet embed the Spelling
    module's `.db` in any cartridge build (no `dist/spelling.bundle.js`
    exists yet — that wiring is a separate, larger gap, not in this task's
    scope).
    """
    gz_path = db_path.with_suffix(db_path.suffix + ".gz")
    raw = db_path.read_bytes()
    compressed = gzip.compress(raw, compresslevel=9)
    gz_path.write_bytes(compressed)
    return gz_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scowl-dir", type=Path, required=True,
                         help="Path to the SCOWL release's 'final/' directory")
    parser.add_argument("--out", type=Path, required=True, help="Output .db path")
    parser.add_argument("--tier", type=int, default=DEFAULT_TIER,
                         help=f"Max SCOWL size tier to include (default {DEFAULT_TIER})")
    parser.add_argument("--categories", type=str, default=",".join(DEFAULT_CATEGORIES),
                         help=f"Comma-separated SCOWL categories (default {','.join(DEFAULT_CATEGORIES)}; "
                              f"available: {','.join(ALL_CATEGORIES)})")
    parser.add_argument("--with-deletion-index", action="store_true",
                         help="Also build the SymSpell deletion-neighbourhood index (measurement mode)")
    parser.add_argument("--with-phonetic-index", action="store_true",
                         help="Also build the precomputed Metaphone phonetic_index table (measurement mode)")
    args = parser.parse_args()

    if not args.scowl_dir.is_dir():
        raise SystemExit(f"--scowl-dir not found: {args.scowl_dir}")

    categories = tuple(c.strip() for c in args.categories.split(",") if c.strip())
    unknown = set(categories) - set(ALL_CATEGORIES)
    if unknown:
        raise SystemExit(f"unknown --categories value(s): {sorted(unknown)}; "
                          f"available: {ALL_CATEGORIES}")

    t0 = time.monotonic()
    entries = collect_words(args.scowl_dir, args.tier, categories)
    print(f"Collected {len(entries):,} unique words at tier <= {args.tier} "
          f"({time.monotonic() - t0:.1f}s)")

    t1 = time.monotonic()
    build_database(entries, args.out, args.with_deletion_index, args.with_phonetic_index, args.tier)
    print(f"Built database in {time.monotonic() - t1:.1f}s")

    size_bytes = args.out.stat().st_size
    print(f"Output: {args.out} ({size_bytes:,} bytes, {size_bytes / 1024 / 1024:.2f} MB)")

    gz_path = write_gzipped_copy(args.out)
    gz_size = gz_path.stat().st_size
    b64_raw_size = len(base64.b64encode(args.out.read_bytes()))
    b64_gz_size = len(base64.b64encode(gz_path.read_bytes()))
    print(f"Gzipped:  {gz_path} ({gz_size:,} bytes, {gz_size / 1024 / 1024:.2f} MB, "
          f"{100 * gz_size / size_bytes:.1f}% of raw)")
    print(f"Base64 raw:    {b64_raw_size:,} bytes ({b64_raw_size / 1024 / 1024:.2f} MB)")
    print(f"Base64 gzip:   {b64_gz_size:,} bytes ({b64_gz_size / 1024 / 1024:.2f} MB) "
          f"-- {100 * b64_gz_size / b64_raw_size:.1f}% of base64-raw")


if __name__ == "__main__":
    main()

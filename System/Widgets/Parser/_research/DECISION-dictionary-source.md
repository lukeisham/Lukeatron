# Ruling — dictionary source for the central spelling module

**Status:** Decided 2026-08-09 by the coordinating agent, on directly verified evidence.
**Supersedes:** the "Recommendation" section of `dictionary-sources.md`, which was wrong twice.

---

## Decision

**Use SCOWL / ESDB (English Speller Database) release 2020.12.07 — pre-built flat word lists.**

Not LibreOffice Hunspell en_AU, which the research agent recommended.

## Why the research was overturned

The research agent made two claims that decided its recommendation. Both were checked
directly and both are false:

| Claim in `dictionary-sources.md` | Verified reality |
| :--- | :--- |
| "SCOWL/VarCon unavailable online (all URLs 404)" | **False.** The project is live, renamed ESDB, at `github.com/en-wl/wordlist`, with releases on SourceForge. Downloaded successfully — 2.5 MB tarball. |
| "License: GNU GPL 2.0" for LibreOffice en_AU | **False.** LibreOffice's own README states the wordlist is under Kevin Atkinson's **LGPL** and the affix file under Geoff Kuenning's **BSD**. The agent's first report said LGPL/MPL, its second said GPL 2.0 — it flip-flopped, and neither was checked against the source. |

The agent also characterised licence obligations ("no source-code disclosure for embedded
data"), which is a legal conclusion it was in no position to draw and which nothing in this
plan needs.

## Verified facts about SCOWL

Confirmed by downloading `scowl-2020.12.07.tar.gz` and inspecting it:

- **Licence — permissive, MIT-like.** Quoted verbatim from the release's `Copyright` file:
  > "Permission to use, copy, modify, distribute and sell these word lists, the associated
  > scripts, the output created from the scripts, and its documentation for any purpose is
  > hereby granted without fee, provided that the above copyright notice appears in all
  > copies…"

  Copyright 2000–2018 Kevin Atkinson. No copyleft, no share-alike. Strictly better than
  LGPL/BSD for our purpose, and far better than the GPL the agent claimed.
- **359 pre-built flat word list files** ship in the release's `final/` directory. Plain text,
  one word per line.
- **Explicit Australian coverage** — `australian-words.*` and `australian_variant_1-words.*`
  at every size tier, alongside British, Canadian, and American.
- **Verified word counts** by cumulative size tier (English + American + British + Australian
  + variant_1, all categories):

  | Max tier | Words |
  | ---: | ---: |
  | ≤ 50 | 104,868 |
  | ≤ 60 | 127,830 |
  | ≤ 70 | 172,339 |
  | ≤ 80 | 354,613 |

## Why this is the better source

1. **No affix expander to write.** This is the decisive point. The Hunspell path required a
   200–300 line stdlib Python Hunspell `.aff` expander, estimated by the agent itself at 3–5
   hours, and it was the single largest technical risk in the whole spelling build. SCOWL's
   lists are already flat. Python's `tarfile` is standard library (PY-1), so the entire
   acquisition path is stdlib with no external tool — no `hunspell` CLI, no aspell, no
   sign-off needed under SR-2.
2. **Permissive licence** rather than LGPL/BSD/GPL ambiguity.
3. **Genuine Australian coverage**, at selectable size tiers.
4. **Variant classification comes free** — the `variant_1/2/3` and per-dialect files make the
   "that's the US spelling, the AU form is …" feature a data lookup rather than a research
   project.

## Instructions to the builder

- Default build target: **tier ≤ 60 (~128k words)**, which satisfies Luke's "large" while
  staying below the 172k and 355k tiers.
- **MEASURE before committing to SymSpell.** The fuzzy-matching research estimated a
  precomputed deletion index at 10–15 MB for 100k words, and explicitly marked that figure
  *unverified*. At 128k words that index could dwarf the word list itself and blow the
  file-size budget that D-0 already stretched. Build the `.db`, measure it, and report actual
  numbers before the design is locked. If the deletion index is too large, fall back to
  on-the-fly candidate generation over a compact word list and say so — a 3 MB widget that
  loads instantly beats a 12 MB one that is theoretically faster at suggesting.
- Frequency ranks: SCOWL's size tiers are themselves a frequency proxy (tier 10 = 1000
  commonest words). Use the tier number as a coarse rank before reaching for a separate
  frequency dataset and its extra megabytes and extra licence.

## Required attribution

The widget footer must carry:

> Spelling dictionary: SCOWL 2020.12.07 © 2000–2018 Kevin Atkinson — permissive licence.
> http://wordlist.aspell.net/

## Standing lesson for this project

Three of the four research reports asserted URLs, licences, or availability that turned out to
be wrong or unverified. **No licence, URL, or size figure enters a build decision on an agent's
say-so.** Download it, read the licence file, count the lines.

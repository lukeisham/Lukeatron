---
name: "!DeviceMentions"
description: "Rank the Rhetoric app's devices by how often they appear in Google Books (Ngram). One script, no agents: it searches every device's name and aliases case-insensitively, measures the same terms in a few rhetoric/fallacy context phrases, and scores commonly confused devices (Irony, Climax, Apostrophe, Red Herring…) on their context count instead of their raw count. Writes one ranking file and never touches the Rhetoric database."
type: Skill
status: Active
core_function: Find
intent: "Produce one cheap, repeatable popularity signal for each rhetorical device from Google Books Ngram, controlled for capitalisation, everyday-sense confusion and plain-word aliases."
version: 3.2.0
calibration:
  context: [Teaching]
  level: Standard
  scope: Local
memory_footprint:
  read: [System/Apps/Rhetoric/seed/devices.json]
  write: [System/Sandbox/DeviceMentions/ngram_cache.json, System/Apps/Rhetoric/seed/ngram_mentions.json]
---

## ⚡ TRIGGER
Primary: `!DeviceMentions` (old trigger `!WikipediaMentions` still fires it).
Fires when Luke asks to "rank the devices by Ngram", "score device popularity", "count mentions of the devices", or
"re-run the device mentions".
Not this skill: the 15-source popularity pass (`seed/popularity_pass.py`) and `seed/update_popularity.py`. This skill
writes **no** database column; applying its result to `popularity` is a separate decision for Luke.

**v3.0.0 (2026-10-03):** rebuilt on Luke's instruction to search Google Ngram only. The v2 multi-source,
Haiku-reader/Sonnet-verifier framework (Wikipedia, Urban Dictionary, TV Tropes) is retired and archived at
`Archive/DeviceMentions-v2-2026-10-03/`, together with its two partial outputs.
**v3.1.0 (same day):** hyphen handling (normalised matching, token count, tail search), floor only at zero context and
set to the lower quartile, stoplist extended (parallel structure, speech shift, self-correction).
**v3.2.0 (same day):** window 1980–2019; Metaphor/Hyperbole/Euphemism no longer confusable; discipline weight for
formal-logic/philosophy/statistics terms; near-zero band ordered by `lists_naming`. Agreement with the 15-source
`popularity.json` (Spearman rank correlation) rose from 0.60 to 0.64.

## 🛠️ LOGIC

// EXECUTION_START

**FILES (all in this skill folder)**
  `ngram_mentions.py`     the whole method. `python3 ngram_mentions.py` (add `--refresh` to ignore the cache).
  `alias_stoplist.json`   aliases never searched: everyday words or a dominant sense in another field (biology,
                          glassmaking, Latin theology/law). A device's own name is never stoplisted.
  `confusables.json`      devices whose NAME has a strong other sense, each with a one-line reason, plus
                          `auto_threshold` (any term above it, as a share of all words, is also treated as confusable).
                          Devices whose everyday use IS the device sense (Metaphor, Hyperbole, Euphemism) are NOT listed.
  `discipline_weights.json`  devices whose count is dominated by a specialist literature (formal logic, philosophy,
                          statistics), each with its field, and the `weight` (0.25) applied to them.
  Cache: `System/Sandbox/DeviceMentions/ngram_cache_<years>_<corpus>.json` — one per year window; re-runs fetch only
  new phrases.
  Output: `System/Apps/Rhetoric/seed/ngram_mentions.json`.

**METHOD**
  1. TERMS. For each of the 272 devices take its name and aliases, drop parentheticals and commas, skip stoplisted
     aliases and phrases over 5 tokens (Ngram's limit). HYPHENS: Ngram treats a hyphen as a token of its own and
     echoes "is-ought" back as "is - ought", so results are matched with hyphen spacing normalised, hyphens count
     toward the 5-token limit, and a hyphenated term is ALSO searched as its tail after the last hyphen when that tail
     is 2+ words ("Is-Ought Fallacy" → "ought fallacy"; "line-drawing fallacy" → "drawing fallacy"). Max is kept.
  2. RAW COUNT. Google Books Ngram JSON endpoint (`books.google.com/ngrams/json`), corpus `en`, years 1980–2019 (wider window steadies rare terms),
     smoothing 0, `case_insensitive=true` → use the "(All)" total, so capitalisation never splits a count. Mean yearly
     frequency. Per device, raw = the MAX over its terms (never a sum).
  3. CONTEXT COUNT. Each term inside frames, summed per term, max over terms:
       rhetorical devices  "use of X", "rhetorical X"
       fallacy devices     "X fallacy", "X argument", "fallacy of X"
  4. CONFUSABLES. For a device in `confusables.json` or with any term above `auto_threshold`:
     adjusted = min(raw, context × K), where K = median raw/context of the non-confusable devices (puts context on
     the raw scale). If the context count is 0 (frames below Ngram's threshold), adjusted = raw × Q, where Q = the
     lower quartile of context×K/raw among measured confusables, so a rare confusable is not scored zero (marked
     `context_floor`). The floor never overrides a measured context count. Everyone else: adjusted = raw.
  5. DISCIPLINE WEIGHT. A device in `discipline_weights.json` has adjusted × weight (the unweighted figure is kept as
     `before_weight_per_billion`), so formal-logic terms (Modus Ponens, Reductio ad Absurdum…) don't outrank devices
     that matter more to general rhetoric and argument teaching.
  6. RANK the 214 own devices by adjusted. NEAR-ZERO BAND: devices below 0.5 per billion words (≈40 classical rarities,
     including below-threshold zeros) are noise-level, so they rank after everyone else by `lists_naming` (how many
     curated lists name the device, from devices.json), then by count. `score` is unaffected by the band: round(100·ln(1+a)/ln(1+max)), a in per-billion words. The 58
     Flipside devices are also searched (their own counts are kept) but take `rank`/`score` from the device in
     `flipside_of` (`inherits`), as in the existing popularity rule.
  7. ERRORS. HTTP failures retry at 10/30/60 s; a phrase still failing is recorded as an error, never as zero, and is
     re-fetched on the next run. A phrase Ngram does not return is a true zero (below its 40-book threshold) and the
     device is marked `below_threshold` if none of its terms is found.

**GATE.** Low impact (output stays inside `_Lukeatron/`), ~150 requests, a few minutes, near-zero tokens. Tell Luke what
will run; no per-batch approval needed. Changing the lists or the frames is a judgement call — propose, then run.

**REPORT** to Luke in plain words: top 20, bottom 10, every confusable whose rank moved a lot from raw to adjusted,
devices ranked via an alias (check for leaks the stoplist missed), zeros, and errors.

**HARD RULES**
  · Never write `rhetoric.db`, `devices.json` or `popularity.json`. · Never invent or smooth a number.
  · A fetch error is an error, never zero. · Polite use only: one request at a time, ≥1.2 s apart, identifying User-Agent.

// EXECUTION_END

## ✅ OUTPUT
`System/Apps/Rhetoric/seed/ngram_mentions.json`: `measure`, `context_frames`, `K`, `Q`, and `ranking` — per device
`rank`, `score`, `adjusted_per_billion`, `raw_per_billion`, `ctx_per_billion`, `raw_term`, `terms_used`, `confusable`,
`note`, `context_floor`, `below_threshold`, `inherits` — plus a plain-words report.

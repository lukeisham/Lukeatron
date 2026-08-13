---
name: "!GenerateContent"
description: >
  Content harvester for the Generator widget suite (System/Widgets/Generator/) —
  the Tier-B, agent-side half of a system whose widgets themselves are offline
  Tier A (they read a content pool baked in at build time). Grows the four
  content pools between builds — APPEND-ONLY, never removes an existing item,
  and capped to AT MOST ONE new item per category per run for Riddle, FolkTale,
  and Psychometric (small, careful batches, never a bulk dump) — Riddle (61
  items, 8 categories), FolkTale (36 tales, 8 categories, ≤400 words each),
  Psychometric (60 items, 5 categories), and AiCharacteristics (a taxonomy —
  no addition cap; every existing entry is fully re-reviewed on every run, not
  spot-checked; only new entries are proposed). Every Riddle/FolkTale/
  AiCharacteristics candidate passes an independent citation/source
  double-check before it can be added; every Psychometric candidate passes an
  independent real-world-alignment double-check, with a candidate that fails
  alignment redone rather than shipped. Every attempt is bounded — no
  unbounded searching or composing — and hitting a bound produces a specific,
  named BLOCKER in the run's report rather than a fabricated item or a silent
  gap. Use when Luke asks to "add more riddles", "find more folk tales", "grow
  the psychometric pool", "check the AI-characteristics taxonomy is current",
  or "top up a Generator widget's content".
type: Skill
status: Active
domain: PersonalResearch (coding / amateur builds — Lukeatron Generator widgets)
intent: "Grow the Generator suite's four content pools between builds, additively only and in small, bounded per-category batches, without ever duplicating an existing item, fabricating provenance, shipping a misaligned test item, searching or composing without limit, or shipping a broken widget — research via !HeadlessChromeBrowser, independently verify every citation and every psychometric item's real-world alignment, append in each cartridge's exact content dialect, rebuild, test, and report real counts plus a named blocker for every slot that could not be filled."
version: 1.3.0
changelog: >
  1.3.0 (2026-08-13, Luke's explicit instruction) — added the BLOCKER PROTOCOL:
  a hard, small attempt ceiling per category slot (Riddle/FolkTale/Psychometric)
  and per citation check (AiCharacteristics), so the skill never searches or
  composes without limit; hitting a ceiling now produces a specific, named
  BLOCKER message in the report (what was tried, how many attempts, the exact
  reason each failed) instead of a fabricated item or a silent zero.
  Distinguished, for AiCharacteristics, a determinate citation FAIL (the paper
  was checked and does not match) from a technical/INCONCLUSIVE result (the
  check itself could not complete) — only the former is ever flagged as a
  fabrication candidate.
  1.2.0 (2026-08-13, Luke's explicit instruction) — added STEP 3 (batch cap):
  at most one new item per category per run for Riddle/FolkTale/Psychometric;
  AiCharacteristics explicitly exempted (no addition cap; full review every
  run, unchanged). Renumbered STEP 3-9 to STEP 4-10 accordingly.
  1.1.0 (2026-08-13, Luke's explicit instruction) — added STEP 6 (citation/source
  double-check) and STEP 7 (alignment double-check); made append-only and
  AiCharacteristics'-always-fully-reviewed explicit non-negotiables. Prompted by
  the same day's discovery that the Phase 1 AI-characteristics seed research
  contained five fabricated arXiv author attributions and one nonexistent arXiv
  ID, none of which the build pipeline (which only checks that code runs, not
  that a citation is real) had any way to catch.
dependencies: [System/Widgets/Generator/_modules/MiniWiki/build/extract_catalogue.py, System/Widgets/Generator/_shell/build/assemble.py, Memory/Long-Term/Coding/vibe-coding-rules.md]
calibration:
  context: [Personal Research]
  level: Extended
  scope: Local
memory_footprint:
  read: [System/Widgets/Generator, System/Widgets/Parser (read-only reference)]
  write: [System/Widgets/Generator/_research/seed, System/Widgets/Generator/*/cartridge/build, System/Widgets/Generator/_research/keepers]
---

## ⚡ TRIGGER
Primary: `!GenerateContent`
Fires when: Luke asks to grow, top up, add to, or refresh the content pool of any Generator widget —
"add more riddles", "find more folk tales", "grow the psychometric pool", "check the AI-characteristics
taxonomy", "harvest more content for `<widget>`" — or a scheduled/self-initiated pool-growth pass.
Scope: exactly one target per invocation — `Riddle`, `FolkTale`, `Psychometric`, or `AiCharacteristics` —
named by Luke or inferred from the request. Never touches more than one target per run.

## 🧭 CORE PRINCIPLE
**This skill is a librarian, not an author (except where the content itself must be original), it is
APPEND-ONLY, it works in small, capped batches — never a bulk dump — and every attempt it makes is
bounded.** It grows pools; it never redesigns or shrinks them; it never searches or composes past a
fixed ceiling hoping the next try works; and when it cannot fill a slot, it says so specifically rather
than inventing something that fits.

- **Riddle / FolkTale / Psychometric: additive only, and capped to AT MOST ONE new item per category,
  per run** (STEP 3 — the batch cap). A run may add up to one item to each of the target's categories,
  never more, regardless of how many strong candidates STEP 2 turns up. It never removes, replaces, or
  edits an existing entry — not even a weak one. If Luke wants an existing entry gone, that is a
  separate, explicit instruction to Luke directly, never something this skill infers or does on its
  own initiative.
- **AiCharacteristics: no addition cap — Luke set this target apart deliberately.** Every EXISTING
  entry is fully re-reviewed on every run (not spot-checked, not skipped when the taxonomy "looks
  recent") — its citation is independently re-verified (STEP 6) exactly as a new entry's would be,
  because a fabricated citation already shipped once undetected. A stale or fabricated existing entry
  is never silently deleted or rewritten — it is FLAGGED in the staged draft for Luke's review. Only
  NEW entries may be proposed for addition; the taxonomy's existing content is reviewed, not authored
  over.
- **Never fabricate to fill a gap, and never search or compose without a bound.** See the BLOCKER
  PROTOCOL immediately below — it applies throughout STEP 2, 3, 6, and 7 and is not optional.

`_shell/src/`, `_modules/`, and every cartridge's `engine.js`/`explainer.js`/`config.yaml` are
READ-ONLY REFERENCE (approved, built, do not touch — `System/Widgets/Parser` doubly so, never write
there at all). The only files this skill writes are: the target's `_research/seed/<x>.md` seed doc
(append-only), the derived `pool.json` / `<x>_content.md` / `content.json` build outputs (regenerated
BY the compiler, not hand-edited), and drafts staged under `_research/keepers/`. Never fabricate an
item, a source, or a count.

## 🚧 BLOCKER PROTOCOL (bounded attempts, mandatory specific reporting — applies throughout)

This section governs what happens when a riddle or folk tale can't be found, a psychometric item can't
be composed to pass alignment, or an AiCharacteristics review step can't complete. It is referenced
from STEP 2, 3, 6, and 7 rather than restated at each — read it once, it binds everywhere those steps
say "per the Blocker Protocol."

**Attempt ceilings — hard, not advisory:**
- **Riddle / FolkTale, per category slot:** up to **3 independent candidate attempts** (vary the
  search — different query terms, a different archive/collection/edition) before the slot is abandoned
  for this run. Each candidate that fails STEP 4 (duplicate), STEP 5 (no provenance), or STEP 6
  (citation unconfirmed) consumes one attempt.
- **Psychometric, per category slot:** up to **3 attempts total** — the initial composition plus up to
  2 alignment redos (STEP 7's existing cap; unchanged, now named explicitly as part of this protocol).
- **AiCharacteristics citation verification, per item** (new candidate or existing entry): up to **2
  lookup retries**, but ONLY if the first attempt errored technically (tool/network failure) rather
  than returning a determinate answer. A determinate result — the paper exists and matches, or the
  paper doesn't exist / doesn't match — is decided on the first lookup and never retried; retries exist
  only for "the check itself didn't complete," never for "I don't like the answer I got."

None of these ceilings may be raised mid-run by trying "just one more." Hitting one ends that slot's
or item's work for THIS run.

**When a ceiling is hit, produce a BLOCKER — never a silent gap, never a fabricated substitute.**
A blocker is a mandatory entry in STEP 10's report, in this exact shape:

  `BLOCKED — <target> / <category or entry id> — <what was tried, how many attempts, and the specific
  reason each attempt failed>. No item added for this slot.`

Be as specific as the actual attempts allow — name the real barrier, not a generic "not found":

- `BLOCKED — Riddle / norse — 3 candidates tried (two Poetic Edda commentary translations, one
  folklore-archive retelling); all 3 failed STEP 6's citation check: none of the claimed source
  editions matched the archive.org / Wikisource scans checked against them. No public-domain Norse
  riddle located this run that both exists as claimed and is textually distinct from the 5 already in
  the pool.`
- `BLOCKED — Psychometric / data-interpretation — composed 3 items (1 initial + 2 redos); all 3 failed
  STEP 7 alignment: the drafted answer did not match independent recomputation from the stated table
  each time (an arithmetic slip in the drafted key, not a flaw in the underlying scenario).`
- `BLOCKED — AiCharacteristics / existing entry 4.2 (cited as arXiv 2604.19768) — citation
  verification: DETERMINATE FAIL. No paper with this arXiv ID exists (checked directly against
  arxiv.org). Not a technical error, not a retry candidate — flagged in the staged draft for Luke's
  removal decision.`
- `BLOCKED — AiCharacteristics / candidate "RLHF-refusal-hedging" — citation verification:
  INCONCLUSIVE after 2 retries. Both arxiv.org and the publisher site returned connection timeouts.
  This is a tool/network failure, not evidence the citation is false — rerun later rather than
  treating this candidate as fabricated.`

This is never optional and never abbreviated to "not found" or "0 added" with no reason — the report
must carry enough detail that Luke, or a future run, knows exactly what was tried and exactly what
blocked it, without re-running the search from scratch to find out.

**What a blocker is NOT allowed to become:**
- Never fabricate a plausible-looking item to fill the slot "just this once," no matter how close a
  rejected candidate came to passing.
- Never keep searching or composing past the ceiling "in case the next one works" — the ceiling is a
  STOP instruction, not a suggestion, and this is exactly the "running endlessly" this protocol exists
  to prevent.
- Never report an unfilled slot as a bare "0 added" — if this skill was asked to grow a pool and a
  category ends at 0, that is either an explicit BLOCKED entry (something was tried and failed) or,
  for a Luke-requested review-only pass with no growth intent, a plainly stated "no addition attempted
  this run — review only," never left ambiguous between the two.
- Never treat an AiCharacteristics INCONCLUSIVE result as either "confirmed real" or "confirmed fake."
  Report it as inconclusive, distinctly from a determinate fail, and take no action on the entry beyond
  reporting it — no removal proposal, no silent pass.

## 🛠️ LOGIC

STEP 0 — RESOLVE TARGET.
  MATCH Luke's request TO one of:
    "Riddle"            → seed `Riddle/../_research/seed/riddles.md`,           compiler `compile_riddle_pool.py`
    "FolkTale"          → seed `_research/seed/folk-tales.md`,                  compiler `build_folktale.py`
    "Psychometric"      → seed `_research/seed/psychometrics.md`,               compiler `build_psychometric.py`
    "AiCharacteristics" → seed `_research/seed/ai-characteristics.md` + MiniWiki source
                           `AiCharacteristics/AiCharacteristics_miniwiki_source.md`,
                           no compiler — content.json is hand-authored (full review pass, not volume)
  ASSERT exactly one target resolved ELSE ask Luke to disambiguate — never guess across targets.

STEP 1 — COUNT BEFORE (the honest baseline).
  READ the target's current compiled content file (`<x>_content.md` for Riddle/FolkTale/Psychometric;
    `content.json` entry count for AiCharacteristics) and COUNT actual entries by parsing, never by
    trusting a prior claim on disk. This is the "before" figure for the final report.

STEP 2 — RESEARCH (via `!HeadlessChromeBrowser` — never invent a portal). Bounded by the Blocker
  Protocol's attempt ceilings above — do not search or compose past them.
  MATCH target:
    CASE "Riddle" / "FolkTale":
      SEARCH public-domain / clearly free-to-use sources only — folklore archives, Project Gutenberg,
        Wikisource, Internet Archive, national folklore collections, out-of-copyright anthologies.
      REJECT anything under active copyright or of unclear licence status — do not add it, do not
        "launder" it through paraphrase; skip it (this consumes one of the 3 attempts) and note the
        gap in the eventual BLOCKED report if the category never fills.
      FolkTale ADDITIONALLY: enforce the 400-word cap AT SOURCE SELECTION (prefer tales that already
        fit, or a public-domain abridgement) — never work around the build's own cap check (see D-4
        below).
      It is fine (encouraged, even) to surface more than one candidate per category in a single
        research pass — STEP 3 selects down to the cap, and having a genuine second-best candidate on
        hand means a STEP 5/6 rejection can consume the next Blocker Protocol attempt immediately
        rather than triggering a fresh search round.
    CASE "Psychometric":
      Items are written ORIGINAL — commercial psychometric test items (SHL, Kenexa, Talent Q, etc.)
        are copyrighted and MUST NOT be copied or lightly reworded. RESEARCH only the *format*
        (situational-judgement, verbal-comprehension-reasoning, abstract/diagrammatic-reasoning,
        deductive-reasoning, data-interpretation-reasoning — match the seed's existing five
        categories) and cite that research as the format source; the item text itself is Luke's/the
        agent's original composition, matching the existing `source: Original — Lukeatron
        Psychometric seed content` convention. Cross-reference
        `Psychometric/Psychometric-test-formats-reference.md` for the real-world formats and rule
        families STEP 7 will check candidates against.
      Abstract/diagrammatic items are structured rule-specs (grid/sequence/odd-one-out), matching
        `abstract_specs.py`'s existing hand-authored pattern — never literal SVG or a bare answer
        letter with no generating rule.
    CASE "AiCharacteristics":
      This is a FULL REVIEW, not a growth pass. RESEARCH recent (post-dating the taxonomy's
        `Research Date` in `ai-characteristics.md`) literature/tooling on LLM stylistic/content
        markers, to find NEW candidate characteristics. Independently of that date check, STEP 6
        below re-verifies EVERY EXISTING characteristic's citation on every run, regardless of how
        recently it was last touched.
      FOR EACH existing characteristic: is it still current, or has model behaviour moved past it
        (e.g. a marker RLHF/system-prompt tuning has since suppressed)? FOR gaps: has a new
        detectable characteristic emerged since the last research date?
      Flag stale/superseded characteristics for Luke's review — do NOT silently delete or overwrite
        an existing entry; propose the change. IF the research pass itself cannot complete (search
        tooling unreachable, no literature access) ➔ that is a BLOCKED report for the whole run, not
        a silently thin review — say plainly that the review could not be carried out and why.

STEP 3 — BATCH CAP (mandatory ceiling — applies before anything is evaluated further; does not apply
  to AiCharacteristics, see CORE PRINCIPLE). Works together with the Blocker Protocol above: the cap
  bounds how many items CAN be added; the Blocker Protocol bounds how many attempts are spent trying.
  Riddle — 8 categories, at most ONE new candidate carried forward per category:
    `african`, `anglo-saxon`, `biblical`, `chinese`, `english`, `folk`, `greek`, `norse`
    (id prefixes: `AF-`, `EX-`, `JW-`, `CH-`, `EN-`, `FO-`, `GR-`, `NO-` respectively).
  FolkTale — 8 categories, at most ONE new candidate carried forward per category:
    `ancient-greece`, `germany`, `india`, `ireland`, `japan`, `native-america`, `russia`,
    `turkey-middle-east`.
  Psychometric — 5 categories, at most ONE new candidate carried forward per category:
    `situational-judgement`, `verbal-critical-reasoning`, `abstract-reasoning`,
    `deductive-analytical`, `data-interpretation`.
  IF STEP 2 surfaced more than one candidate for a category ➔ evaluate them in order of strength
    (clearest text, best provenance first) through STEP 4-6, each rejection consuming one Blocker
    Protocol attempt, until one survives or the 3-attempt ceiling is reached.
  IF a category's candidates are exhausted within the 3-attempt ceiling with none surviving (STEP 4
    duplicate / STEP 5 missing provenance / STEP 6 failed citation, or — Psychometric — STEP 7
    alignment failure past its redo cap) ➔ that category's slot for this run is BLOCKED per the
    protocol above, not silently dropped — the one-per-category ceiling is a ceiling on SUCCESSFUL
    additions this run, not a guarantee every category gets one, and every miss must be named.
  A single run therefore adds AT MOST: Riddle 8, FolkTale 8, Psychometric 5 — bounded further by how
    many categories actually produced a surviving, verified candidate within their attempt ceiling.
    TRIGGER's scope (one target per invocation) means a single run touches only one of these ceilings,
    never more than one target.
  AiCharacteristics has NO cap here — carry forward every genuine new candidate STEP 2 found, and
    every existing entry, into STEP 6's full citation review, each individually bounded by the Blocker
    Protocol's 2-retry ceiling for technical (not determinate) failures only.

STEP 4 — DE-DUPLICATE (mandatory, before anything is appended).
  Matching rule (explicit): normalise candidate text — lowercase, strip Markdown emphasis/links,
    collapse whitespace, strip trailing punctuation — and compare against every existing entry's
    same-normalised `text`/`tale_text` (Riddle/FolkTale/Psychometric) or `d`+`e` fields
    (AiCharacteristics), PLUS a fuzzy check on `answer`/`title` for near-duplicate riddles (same
    solution, different phrasing — e.g. "Bookworm" vs "Book-eating moth" is the same riddle).
  ID collisions are necessary but NOT sufficient — a new id with normalised-duplicate text is still
    a duplicate. REJECT the candidate (consumes one Blocker Protocol attempt); do not append it; do
    not silently skip logging that it was rejected as a duplicate (STEP 10 reports rejected count too).

STEP 5 — PROVENANCE (mandatory field, gates inclusion).
  ASSERT every surviving candidate carries BOTH `source` and a licence/original-status field
    (`licence/public-domain note` for Riddle, `licence` for FolkTale, `source` doubling as the
    originality statement for Psychometric, citation for AiCharacteristics) ELSE DROP the candidate
    (consumes one Blocker Protocol attempt) — an item without provenance is never added, no exception.
  This step only checks that the field EXISTS. It says nothing about whether the field is TRUE —
    that is STEP 6's job, and it is not optional just because STEP 5 passed.

STEP 6 — EVAL: CITATION / SOURCE DOUBLE-CHECK (Riddle, FolkTale, AiCharacteristics — mandatory,
  independent of STEP 5; does not apply to Psychometric, whose items are original composition with
  no external citation per item — see STEP 7 instead).
  This is the exact failure class that broke the 2026-08-13 Long-Term-keeper draft: five of five
    arXiv author attributions proved fabricated and one arXiv ID did not exist, despite every entry
    being correctly MLA-formatted. **Correct formatting is not verification.** Never accept a
    citation solely because it looks right.
  SCOPE — who gets checked:
    Riddle / FolkTale: the (at most one live per category, per STEP 3) surviving new candidate from
      STEP 5.
    AiCharacteristics: every surviving NEW candidate from STEP 5, PLUS **every EXISTING entry in the
      taxonomy**, every single run (CORE PRINCIPLE — always fully reviewed, never spot-checked, and
      exempt from STEP 3's cap).
  FOR EACH item in scope, INDEPENDENTLY confirm via live web lookup (WebSearch/WebFetch — never the
    candidate's own claimed citation text, never memory/prior training data) that:
    Riddle / FolkTale: the named collection/work/edition genuinely exists and is genuinely
      public-domain/free-to-use, at the archive or URL claimed — not merely a plausible-sounding
      collection name.
    AiCharacteristics: the exact paper exists at the claimed identifier (arXiv ID / DOI / URL); the
      claimed title matches the paper's real, current title; the claimed author list matches the
      paper's real author list. "Same topic, different authors" or "similar title" is a
      DETERMINATE FAIL, not a near-pass and not a retry case.
  THREE possible outcomes per item — keep them distinct, per the Blocker Protocol:
    DETERMINATE PASS ➔ the item may proceed to STEP 8.
    DETERMINATE FAIL (checked, and it does not match) ➔
      New candidate ➔ REJECT it outright — do not append, do not caveat, do not keep
        "provisionally." Consumes one Blocker Protocol attempt for that category.
      Existing AiCharacteristics entry ➔ do NOT delete it directly — FLAG it in the staged draft
        (`_research/keepers/`) naming exactly what failed to verify and what the real record shows
        (if found), for Luke to resolve.
    INCONCLUSIVE (the lookup itself failed technically — network/tool error, not a content mismatch)
      ➔ retry once more (Blocker Protocol's 2-retry ceiling for AiCharacteristics; Riddle/FolkTale
      candidates that hit a technical error simply consume one of their 3 category attempts and move
      to the next candidate rather than retrying the same lookup, since a fresh candidate is available
      more cheaply than a second attempt at the same flaky lookup). Still inconclusive after the
      retry ➔ report it as INCONCLUSIVE, distinctly from a determinate fail — never treat "couldn't
      check" as either "confirmed real" or "confirmed fake."
  Log every rejection/flag/inconclusive with its reason — STEP 10's report carries a citation-check
    count (rejected new / flagged existing / inconclusive existing) separately from the STEP 4
    duplicate count and the STEP 5 missing-provenance count. These are different failure reasons and
    must not be conflated.

STEP 7 — EVAL: ALIGNMENT DOUBLE-CHECK (Psychometric only — mandatory, independent of STEP 5).
  Psychometric items are original composition, not sourced text, so there is no external citation to
    verify — instead verify the item's STRUCTURE genuinely aligns with real-world examples of its
    category, using the STEP 2 format research and `Psychometric-test-formats-reference.md`.
  FOR EACH surviving new candidate (at most one live per category, per STEP 3), independently confirm:
    Situational Judgement: a genuine scenario with competing/high-stress priorities, ranked or
      rated response options, and — matching real SJTs — no single option that is obviously and
      trivially "correct"; a real SJT rewards judgement between plausible options, not spotting an
      exaggerated wrong answer.
    Verbal Critical Reasoning: the stimulus passage genuinely supports (or genuinely fails to
      support) the stated conclusion by the rules of the claimed sub-type (inference / assumption /
      deduction / interpretation / argument evaluation) — re-derive the correct answer from the
      passage independently; do not trust the drafted answer key.
    Abstract / Diagrammatic Reasoning: the rule spec genuinely generates the claimed answer —
      RE-DERIVE it independently by walking the rule spec exactly as `abstract_specs.py`'s existing
      items do (D-3 discipline: the answer is DERIVED from the rule, never hand-asserted). A rule
      spec whose derived answer does not match its own claimed answer fails alignment.
    Deductive & Analytical Reasoning: the stated correct answer is actually logically valid given
      the premises (a genuine deduction, not merely a plausible-sounding one) — check this by formal
      re-derivation, not by re-reading the drafted explanation.
    Data Interpretation & Quantitative Reasoning: the underlying numbers/table are internally
      consistent and the claimed answer is arithmetically correct — recompute it independently.
  IF an item FAILS alignment ➔ **do not reject it outright — REDO it**, within the Blocker Protocol's
    3-attempt ceiling (1 initial + up to 2 redos). Return to STEP 2 and compose a fresh replacement
    item in the SAME category (never patch the failing item in place — a superficial edit to a
    structurally-misaligned item tends to leave the same defect), then re-run STEP 4 through STEP 5
    and this STEP 7 on the replacement (STEP 6 does not apply to Psychometric). A redo replaces that
    category's one candidate — per STEP 3, it never becomes a second addition to the same category.
  If still failing alignment after the 3rd attempt (the 2nd redo), that slot is BLOCKED per the
    protocol above — DROP it and report the specific reason each of the 3 attempts failed in STEP 10;
    never ship a misaligned item just to hit a target count.
  Log every redo (what failed, what changed) and every drop — STEP 10's report carries an
    alignment-redo count and an alignment-dropped-after-cap count, each drop stated as a full BLOCKED
    entry, not just a number.

STEP 8 — APPEND in the target's exact content dialect (read the existing file first; match its field
  set precisely — do not invent new labelled fields or drop existing ones). Only items that survived
  STEP 3 (within the per-category cap and its attempt ceiling), STEP 4 (not a duplicate), STEP 5 (has
  provenance), and — for their target — STEP 6 or STEP 7 (source verified / alignment confirmed) may
  reach this step:
  MATCH target:
    CASE "Riddle" / "FolkTale" / "Psychometric":
      APPEND new entries to the SEED file (`_research/seed/<x>.md`) in its existing labelled-bold-field
        dialect (`#### <Heading>` or `### N. Title`, then `**Label:** value` lines, blocks separated by
        a bare `---`) — matching field-for-field what STEP 0's file already has, including
        `**id:**` following the existing prefix/numbering scheme (e.g. Riddle's tradition-prefix ids:
        `EX-`, `GR-`, `NO-`, `EN-`, `JW-`, `CH-`, `AF-`, `FO-` — never invent a ninth prefix without
        Luke's sign-off). APPEND ONLY — never remove, replace, or reorder an existing block. At most
        one new block per category, per STEP 3.
      RUN the target's compiler to regenerate `pool.json` + `<x>_content.md` from the updated seed —
        NEVER hand-edit `pool.json` or `<x>_content.md` directly; they are build outputs, and the
        compiler is what keeps the MiniWiki catalogue and the engine's pool from drifting apart
        (single source of truth — `<x>_content.md` and `pool.json` are always derived, never edited).
        `python3 compile_riddle_pool.py <seed.md> <pool.json> <content.md>` (Riddle),
        `python3 build_folktale.py` (FolkTale, paths hard-coded relative to the script),
        `python3 build_psychometric.py <seed.md> <pool.json> <content.md>` (Psychometric).
      IF FolkTale's compiler rejects a tale over the 400-word cap ➔ that is the build working as
        designed — trim to a genuinely shorter public-domain variant/abridgement, or drop the tale
        (consumes a Blocker Protocol attempt); never patch the cap check itself (D-4, non-negotiable
        #3/#2 — the compiler is READ-ONLY).
    CASE "AiCharacteristics":
      This is a review-and-propose pass, not an autonomous edit: draft the proposed NEW additions
        (only — never a rewrite of an existing entry, and NOT subject to STEP 3's cap) to
        `_research/seed/ai-characteristics.md`'s dialect AND the MiniWiki-dialect equivalent for
        `AiCharacteristics_miniwiki_source.md`, plus the STEP 6 citation-flag/inconclusive list for
        existing entries, and stage all of it as a draft file under `_research/keepers/`
        (non-negotiable — never write a Long-Term-adjacent "final" content change without Luke's
        review since this taxonomy has no compiler to catch a bad edit). AWAIT Luke's go-ahead before
        hand-editing `content.json` / the MiniWiki source directly. The existing taxonomy is never
        altered by this skill on its own initiative — only reviewed and proposed against.

STEP 9 — REBUILD AND VERIFY (Riddle/FolkTale/Psychometric only — skip for AiCharacteristics, which
  stops at the staged draft in STEP 8 pending Luke's review):
  RUN `python3 _shell/build/assemble.py <Target>/cartridge <Target>/<Target>_generator.html`.
  IF non-zero exit ➔ STOP, report the assembler's own error, do not ship a broken widget.
  RUN the target's test suite:
    Riddle: `node --test Riddle/tests/test-engine.mjs`
    FolkTale: `python3 -m pytest FolkTale/tests/test_build_folktale.py` AND
      `node --test FolkTale/tests/js/test-engine.mjs FolkTale/tests/js/test-beat-accuracy.mjs`
    Psychometric: `python3 -m pytest Psychometric/tests/python/test_build_psychometric.py` AND
      `node --test Psychometric/tests/js/test-engine.mjs Psychometric/tests/js/test-abstract-rules.mjs`
  IF any test fails ➔ STOP, report which test and why, do not ship. The build/test gate is a hard
    stop, not a warning (non-negotiable — verify by reading the real files/results). This is itself a
    BLOCKED outcome for the whole run if it cannot be resolved — report it as such, do not leave a
    broken build unreported. Note the abstract-rules test independently re-derives every item's
    answer from its rule spec — the same check STEP 7 already ran on new items, now re-confirmed
    against the compiled output.

STEP 10 — COUNT AFTER. Re-parse the rebuilt `<x>_content.md` (or the staged AiCharacteristics draft)
  the same way as STEP 1. This is the "after" figure. Confirm `after >= before` — this skill is
  append-only, so a shrinking count is itself a bug in this run, not a valid outcome, and must be
  reported as a failure rather than a smaller-than-expected success. For Riddle/FolkTale/Psychometric,
  ALSO confirm `after - before <= number of categories` (STEP 3's ceiling) — exceeding it is a bug in
  this run, not a productive overshoot, and must be reported as a failure. Assemble the full list of
  BLOCKED entries accumulated across STEP 3/6/7/9 into the report — this is not optional even in a run
  that successfully filled every category, since a run can carry both successful additions AND
  blockers (e.g. 6 of 8 Riddle categories filled, 2 blocked).

## ✅ OUTPUT
State: target's seed doc grows only with de-duplicated, provenance-complete, source-verified (or, for
  Psychometric, alignment-confirmed) items in its exact content dialect, never more than one new item
  per category per run (Riddle/FolkTale/Psychometric), and never loses an existing entry; compiled
  pool/content/MiniWiki outputs regenerated (never hand-edited); shell assembly and the target's test
  suite both pass before anything is called done. AiCharacteristics stops at a staged, Luke-reviewed
  draft in `_research/keepers/` — proposing new entries (uncapped) and flagging suspect or inconclusive
  existing ones, never editing the live taxonomy itself. Every slot that could not be filled, and every
  citation that could not be resolved, is reported as a specific, named BLOCKED entry — never a silent
  gap and never papered over with a fabricated item.
Validation Check (Self-Test):
  `VERIFY count_after >= count_before (append-only; equal is fine, less is a bug) AND
  (for Riddle/FolkTale/Psychometric) count_after - count_before <= categories_touched (STEP 3's
  per-category ceiling was not exceeded) AND
  no appended Riddle/FolkTale/AiCharacteristics item lacks an independently-verified (DETERMINATE PASS)
  citation AND
  no appended Psychometric item failed its alignment check (or exhausted its 3-attempt ceiling
  unresolved) AND
  every category/item that did not receive a successful addition this run has a corresponding BLOCKED
  entry naming what was tried and why it failed (or is explicitly marked "review only, no growth
  attempted") AND
  no search or composition attempt exceeded its Blocker Protocol ceiling AND
  assemble.py exit code == 0 AND target test suite exit code == 0
  ELSE report the real failure and stop — never claim a target count that wasn't actually reached,
  never claim a citation or alignment check passed that wasn't actually independently re-derived, and
  never leave an unfilled slot unexplained.`
Report format (mandatory, every run): "Target: `<X>` | Before: `<N>` | After: `<N>` | Added: `<N>`
  (by category: `<cat>:<0|1>, ...`) | Rejected as duplicate: `<N>` | Rejected for missing provenance:
  `<N>` | Rejected/flagged/inconclusive by citation check: `<N>` (new rejected / existing flagged /
  existing inconclusive, AiCharacteristics only) | Redone by alignment check: `<N>` (Psychometric
  only) | Dropped after redo cap: `<N>` (Psychometric only) | Build: pass/fail | Tests: pass/fail |
  **Blockers:** one `BLOCKED — ...` line per unfilled slot/item, in the Blocker Protocol's exact
  format, or `none` if every attempted slot succeeded." The per-category breakdown is what makes the
  STEP 3 cap auditable — a report showing any category at 2+ is itself a defect in the run, and a
  category showing 0 with no matching BLOCKED line is also a defect (an unexplained gap). Never
  restate the Phase 1 research's original claimed targets (78 riddles, 38 tales) as if they were
  reached — Phase 1 delivered 61 and 36; this skill reports only what it itself verified on disk, this
  run.
Log: `[AGENT: !GenerateContent] [SUCCESS|FAIL|BLOCKED] target=<X> before=<N> after=<N> added=<N>
  blocked=<N> | tokens≈[N]` → `Memory/Long-Term/Logs/skills.log`. Use `BLOCKED` (not `FAIL`) when the
  run completed cleanly but one or more slots hit the Blocker Protocol's ceiling — that is a bounded,
  reported outcome, not a crash, and the log line should say so precisely.
Error path: Build or test failure ➔ stop, report the exact failing step/message, leave the seed
  addition in place but do NOT report the pool as grown until a rerun passes clean — report this as a
  BLOCKED run. Missing/unclear licence on a candidate ➔ drop the candidate (consumes a Blocker Protocol
  attempt), never add it "provisionally." Citation that cannot be independently confirmed ➔ reject
  (new, determinate fail) or flag (existing AiCharacteristics, determinate fail) or report inconclusive
  (technical failure after retry) — never add/keep it "probably fine," and never conflate inconclusive
  with confirmed-fake. Psychometric item that still fails alignment after the 3-attempt ceiling ➔ drop
  the slot, report it as a full BLOCKED entry, never ship it to hit a count. A run that would add more
  than one item to the same category ➔ that is a bug in this skill's execution, not a valid outcome —
  stop and report it rather than shipping the overshoot. A category or item with no successful addition
  and no BLOCKED entry ➔ that is itself a defect in the run's own reporting — the report is not
  complete until every gap is named. AiCharacteristics change proposed but Luke unreachable/silent ➔
  leave the draft in `_research/keepers/`, make no live edit — fail closed.

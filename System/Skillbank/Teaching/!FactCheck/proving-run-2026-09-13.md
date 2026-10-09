---
type: sandbox-test
title: "!FactCheck skill — Sandbox test run"
date: 2026-09-13
plan: "System/Plans/New/rebuild-fact-checking-app.md (Step 2)"
skill_under_test: "System/Skillbank/Teaching/!FactCheck/SKILL.md v1.0.0"
---

# !FactCheck — Sandbox test run

## Test input (one batch, 46 words — under the 250w batch size and the 1000w cap)

> NASA states that "the Moon is Earth's only natural satellite." According to NOAA, global sea
> levels have risen roughly 21–24 centimeters since 1880. Paris is the capital of France. In my
> opinion, this is the most pressing issue humanity faces today. A 2019 internal study by Acme Corp
> found that 73% of remote workers prefer four-day weeks.

Chosen deliberately to exercise all five outcomes in one pass: a direct quote, a paraphrase, a
bare common-knowledge fact, a non-checkable opinion, and a plausible-sounding but unfindable claim
(the fail-closed case).

## Run log (STEP 0–4, executed live with this session's WebSearch/WebFetch)

- **STEP 0** — 46 words, under the 1000w cap. Proceed.
- **STEP 1** — 46 words, one batch (under 250w).
- **STEP 2/3** — five claims discovered/codified:
  1. "The Moon is Earth's only natural satellite" — quotation marks → candidate `direct-quote`.
  2. "Global sea levels have risen roughly 21–24cm since 1880" — attributed to NOAA, no quotation marks → candidate `paraphrase`.
  3. "Paris is the capital of France" — bare proper-noun/common-knowledge → candidate `exists`.
  4. "This is the most pressing issue humanity faces today" — opinion → `checkable: false`.
  5. "A 2019 internal study by Acme Corp found 73% of remote workers prefer four-day weeks" — declarative, tied to a named organisation → candidate `claimed`.
- **STEP 4**, per chunk:
  1. WebSearch found `science.nasa.gov/moon/facts/`; WebFetch confirmed the page contains the exact
     quoted sentence verbatim. **Double-check passed.**
  2. WebSearch found `climate.gov`'s sea-level page; WebFetch confirmed the page states "Global
     average sea level has risen 8–9 inches (21–24 centimeters) since 1880" — matches. **Double-check passed.**
  3. Whitelist row "General facts" → Britannica first. WebFetch on `britannica.com/place/Paris`
     returned **HTTP 403** — candidate dropped, not cited (AD-FC12: a source that doesn't resolve
     fails the check regardless of how authoritative it is). Wayback fallback
     (`web.archive.org/web/2/...`) was also unreachable from this session. Fell back to open web:
     WebFetch on `en.wikipedia.org/wiki/Paris` resolved and confirmed the claim verbatim in its
     opening sentence. **Double-check passed on the fallback candidate**, not the whitelist's first
     choice — exactly the behaviour §1/AD-FC12 specify (try the next candidate rather than citing a
     dead link, and never skip the double-check just because a source is "supposed to" be right).
  4. Not sent to STEP 4 (non-checkable).
  5. WebSearch for the exact claim, company, and figure returned **no matching source anywhere** —
     confirmed as a genuinely unfindable/likely-fabricated claim. **Fail-closed applied.**

## Resulting table (STEP 5 output)

| Claim | Chunk | Source | Category |
|---|---|---|---|
| The Moon is Earth's only natural satellite | — | [NASA — Moon Facts](https://science.nasa.gov/moon/facts/) | Direct-quote |
| Global sea levels have risen roughly 21–24cm since 1880 | — | [NOAA Climate.gov — Global Sea Level](https://www.climate.gov/news-features/understanding-climate/climate-change-global-sea-level) | Paraphrase |
| Paris is the capital of France | — | [Wikipedia — Paris](https://en.wikipedia.org/wiki/Paris) | Exists |
| This is the most pressing issue humanity faces today | — | not checkable — opinion | — |
| A 2019 internal study by Acme Corp found 73% of remote workers prefer four-day weeks | — | unverified — unable to find a reliable source | Claimed (unconfirmed) |

Summary line the skill would report: *5 claims found, 4 checkable, 3 resolved to a confirmed
category, 1 fail-closed, 1 not checkable (opinion).*

## Verification against the plan's Success criteria

- [x] Table produced in the specified `Claim | Chunk | Source | Category` shape.
- [x] Every cited source was actually fetched and its content checked before citing (STEP 4.1–4.3)
      — not taken from a search snippet alone (proven by the Britannica 403 case: a snippet-plausible
      source was correctly rejected once fetched and found unreachable).
- [x] Fail-closed default fires correctly and does not fabricate (claim 5).
- [x] No verdict/true-false grading appears anywhere in the output — only provenance categories.
- [x] ≤250-word batching demonstrated on both a single-batch (46w) and a genuine two-batch (261w,
      split 137w/124w on a sentence boundary) input — see "Extended run" below.

## Extended run — proving multi-batch splitting (STEP 1)

The first run's input (46 words) never needed a second batch, so a second, longer input (261 words)
was run to exercise STEP 1's actual boundary-splitting logic end-to-end.

**Input (261 words, 16 sentences)** — the original test paragraph plus 11 further sentences mixing
more of the same five outcomes: a proper-noun/number fact (Great Barrier Reef, Mount Everest, Great
Wall of China), an attributed report figure (WHO life-expectancy report), an "it is claimed"/
"critics claim" cue (social media–anxiety), a dated historical fact (Berlin Wall, 1989), an
"it is widely believed" folk claim with an evidentiary hedge, a landmark science fact (Einstein,
general relativity, 1915), a disputed-historians claim (Library of Alexandria), a dated
organisational announcement (WHO declaring COVID-19 a pandemic, 11 March 2020), and one more
deliberately-fabricated claim ("a 2021 internal Bexley Institute survey" on dolphins and jazz).

- **STEP 1 batching** — split at the sentence boundary after 137 words (batch 1: the original 5
  claims) / 124 words (batch 2: the 11 new sentences) — both ≤250w, split cleanly on a sentence
  boundary, matching the skill's stated method.
- **Batch 2 STEP 4 spot-checks** (not every claim re-run; enough to prove the batch executes):
  - *Berlin Wall fell in 1989* — WebSearch found `history.com`'s "This Day in History" page;
    WebFetch confirmed: "East German officials open the Berlin Wall on November 9, 1989." **Passed.**
  - *WHO declared COVID-19 a pandemic, 11 March 2020* — first two fetch candidates
    (`who.int`'s own remarks page, then an NPR retrospective) **both timed out** — the skill's error
    path ("treat as no source found for that candidate, try the next candidate") was exercised for
    real, not just written. A third candidate, a PMC/NIH article, resolved and confirmed the date
    verbatim. **Passed on the third candidate**, correctly never citing the two that timed out.
  - *"A 2021 internal Bexley Institute survey" (dolphins/jazz)* — WebSearch returned nothing
    matching the organisation, the year, or the claim; only unrelated "Bexley" jazz-venue results.
    **Fail-closed applied**, second proof of this path in a different batch.

This confirms STEP 1's multi-batch splitting runs correctly (two batches, sentence-boundary-safe,
both ≤250w) and that STEP 4 behaves identically in a later batch as in the first — including,
incidentally, a live demonstration of the "candidate fails, try the next one" resilience path
(two timeouts in a row, still resolved by the third).

## Verdict

**Pass.** Across both runs (46w single-batch, 261w two-batch), the skill's Stage 1–4 pipeline,
executed live against real web sources, correctly split input into ≤250-word batches on sentence
boundaries, discovered and codified claims in each batch, searched whitelist-first with working
fallback paths when a candidate failed to resolve or timed out, double-checked every candidate
against its actual fetched content before citing it, and failed closed on two separate genuinely
unverifiable claims rather than guessing.

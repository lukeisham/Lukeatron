# search-mention-tracker.build.spec.md

**Kind:** Build (new functionality) · **Folder:** `_Builds/` · **Status:** Built ✅ (2026-07-07)
**Asset:** `System/Tools/Search/` — a local, browser-operated mention tracker.

## Motivation

Track down where **one specific phrase or term** is being mentioned across
**social media** and **news articles that carry comment sections**. Operated
from a single browser tab, one-click launched, zero external dependencies.

The defining search strategy is **path of least resistance, then escalating
precision**: gather a wide rough pool cheaply, then narrow it with a deeper,
more expensive pass, then confirm the survivors against the exact phrase.

## Requirements

- **FR-SMT-1** — Search **one phrase/term at a time**. A single text input drives
  the whole run.
- **FR-SMT-2** — Sources are limited to **social media and comment-bearing news**.
  v1 surfaces: Hacker News (Algolia), Reddit, Google News RSS — all key-free.
- **FR-SMT-3** — **Three backend functions**, one per phase, in `serve.py`:
  1. `scrape_social_media(term)` → **initial pool** (wide, cheap; no page fetches).
  2. `targeted_search(term, pool)` → **shortlist** (deep; fetches pages, scores real text).
  3. `confirm_match(term, shortlist)` → **final results** (strict exact-phrase confirmation).
- **FR-SMT-4** — Escalating precision: Phase 1 takes the path of least resistance
  (search endpoints only); Phase 2 fetches only the top-ranked candidates and
  deep-scores them; Phase 3 confirms the exact phrase is genuinely present.
- **FR-SMT-5** — **Simple one-page HTML/CSS** frontend: a term input, and three
  collapsible phase panels. Results in every phase are shown as **clickable links**.
- **FR-SMT-6** — The initial **pool** is optionally viewable; then the **shortlist**;
  then the **final results** — each behind its own phase panel.
- **FR-SMT-7** — Each phase reports its **cost**: elapsed time, estimated tokens
  (bytes ÷ 4 proxy — no LLM is called), HTTP request count, bytes fetched.
- **FR-SMT-8** — The user can **pause** between phases and **repeat** any phase.
  Achieved by running one phase per button; the browser holds pool/shortlist
  state, so re-running a phase is idempotent and needs no server state.
- **FR-SMT-9** — **One-click launch**: `Start Search.command` → `python3 serve.py`,
  auto-opens `http://localhost:8789`. Pure Python 3 stdlib, no `pip install`.
- **FR-SMT-10** — Ships with a **refactoring guide** (`REFACTORING_GUIDE.md`) for
  future extension.

## Acceptance criteria

- ✅ Entering a term and running Phase 1 returns a de-duplicated pool of links
  with a cost readout. *(verified: 50 candidates, ~2s, ~41k tok.)*
- ✅ Phase 2 fetches the top-N pool items, deep-scores them, and returns a smaller
  shortlist with visibly higher cost. *(verified: 50 → 15, ~899k tok.)*
- ✅ Phase 3 confirms the exact phrase and returns only confirmed mentions.
  *(verified: 15 → 13 confirmed.)*
- ✅ Every phase panel shows time + tokens + requests + bytes.
- ✅ Each phase is independently runnable/repeatable; nothing auto-advances.
- ✅ Launches with one double-click; no third-party packages.

## Out of scope (v1)

- Authenticated sources (X/Twitter, Instagram, TikTok — need keys/OAuth).
- Persistence of past searches / a results archive.
- Boolean query syntax, date filters, language filters.
- A live cancel-mid-phase button (pause is *between* phases in v1).
- LLM-based semantic matching (v1 uses lexical phrase + token-overlap scoring).

See [`search-mention-tracker.plan.md`](search-mention-tracker.plan.md) for the HOW
and its verification checklist, and [`../REFACTORING_GUIDE.md`](../REFACTORING_GUIDE.md).

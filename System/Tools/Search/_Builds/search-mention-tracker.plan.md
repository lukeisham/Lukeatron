# search-mention-tracker.plan.md

Subtask plan for [`search-mention-tracker.build.spec.md`](search-mention-tracker.build.spec.md).

## Prerequisites

None. Pure Python 3 standard library; no other subtask or capability required.

## Steps (mapped to FR numbers)

1. **Scaffold** the asset folder `System/Tools/Search/` and the four spec folders
   (`_Builds/_Spikes/_Refactors/_Changes` with `_Done/`). — framework
2. **Backend `serve.py`** — stdlib HTTP server + the three phase functions. (FR-SMT-3, 4)
   - `scrape_social_media` hits HN + Reddit + Google News, pools & de-dupes. (FR-SMT-1, 2)
   - `targeted_search` pre-ranks, fetches top-N, deep-scores → shortlist. (FR-SMT-4)
   - `confirm_match` re-fetches shortlist, confirms exact phrase → results. (FR-SMT-4)
   - `CostMeter` wraps every phase; `/api/phaseN` endpoints return `cost`. (FR-SMT-7)
   - Stateless server; browser passes pool/shortlist back → free pause/repeat. (FR-SMT-8)
3. **Frontend `index.html`** — one input + three collapsible phase panels, links
   only, per-phase cost line, Run/Repeat buttons. (FR-SMT-5, 6, 7, 8)
4. **Launcher** `Start Search.command` (chmod +x) → `python3 serve.py`, auto-open. (FR-SMT-9)
5. **Docs** — `REFACTORING_GUIDE.md` + `README.md`. (FR-SMT-10)

## Verification

- [x] `python3 -m py_compile serve.py` passes.
- [x] `GET /` returns the page (HTTP 200).
- [x] `POST /api/phase1` with a term returns `pool[]` + `cost{}` + `notes[]`.
- [x] `POST /api/phase2` narrows the pool to a smaller `shortlist[]`, cost higher.
- [x] `POST /api/phase3` returns `results[]` ⊆ shortlist, only exact-phrase matches.
- [x] Source outage is reported in `notes` (e.g. Reddit rate-limit), never a crash —
      `do_POST` catches all exceptions and returns them with a cost summary.
- [x] Launcher is executable and independent of any installed packages.

**Completion:** when this checklist is fully green, `git mv` this spec + plan into
`_Builds/_Done/` and strike the row in [`_PLAN.md`](_PLAN.md). *(All boxes green
2026-07-07; move deferred until Luke has reviewed the asset.)*

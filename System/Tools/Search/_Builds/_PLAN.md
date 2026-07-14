# _PLAN.md — _Builds/ folder plan (Search asset)

Folder plan for all build subtasks of the **Search** mention-tracker asset.

## Decision gates

- **Sources are key-free only** (v1). Any source needing OAuth/API keys (X,
  Instagram, TikTok) is a *separate future build*, gated on a credentials story —
  not started here. See `REFACTORING_GUIDE.md → Adding a source`.
- **No LLM in the loop** (v1). Matching is lexical (phrase + token overlap). An
  LLM-scored Phase 2/3 is a future Refactor, not a Build.

## Dependency analysis

Single subtask, no internal dependencies. External runtime dependency: **Python 3
stdlib only** (no `pip`). Soft coupling: `serve.py` and `index.html` share the
`/api/phaseN` request/response shape — change them together (documented in the
refactoring guide's API contract section).

## Waves

- **Wave 1 (done):** `search-mention-tracker` — the whole asset (backend +
  frontend + launcher + docs). No wave 2 in v1.

## Tracking table

| Subtask | Spec | Plan | Status | Notes |
|---|---|---|---|---|
| search-mention-tracker | [spec](search-mention-tracker.build.spec.md) | [plan](search-mention-tracker.plan.md) | ✅ Built & verified 2026-07-07 | Move to `_Done/` after Luke's review |

## Completion protocol

A subtask is done when its plan's Verification is fully green. Then `git mv` its
spec+plan into `_Done/`, strike its row above, and note any newly unblocked
follow-on builds (future sources / LLM scoring → would live in `_Refactors/` or a
new `_Builds/` row).

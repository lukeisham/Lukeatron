---
name: "!BookCover"
description: >
  Guarded OpenLibrary book-cover fetch, under a strict one-search/one-fetch token cap. Search
  OpenLibrary by title/author, take the first cover_i, GET the -M.jpg, save it to a page's
  _media/ folder, and return a caption. Callable directly by !IdeaWiki's SET_THUMBNAIL ladder
  (step a, book branch) so it does not have to re-derive the guard inline each time. A missing
  cover is always a silent, cost-free fallback — never worth extra token spend.
type: Skill
status: Active
domain: GeneralPurpose (system — thumbnail fetch)
intent: "Deterministic, repeatable book-cover fetch for LukeatronWiki pages, extracted from !IdeaWiki's inline SET_THUMBNAIL ladder into a callable helper once book absorption became frequent enough to be 'done by hand more than once, fixed procedure'."
version: 1.0.0
dependencies: []
calibration:
  context: [Any]
  level: Brief
  scope: Global
memory_footprint:
  read: [Memory/Long-Term/LukeatronWiki]
  write: [Memory/Long-Term/LukeatronWiki/_media]
---

## ⚡ TRIGGER
Primary: called directly by `!IdeaWiki`'s `SET_THUMBNAIL` ladder, step (a), whenever the item
being absorbed is a BOOK and no thumbnail exists yet.
Fires when: a page needs a cover image and the item type is `book` (has a title + author, ISBN
optional).
Never fires standalone from a user prompt — it is plumbing for `!IdeaWiki`, not a user-facing action.

## 🧭 CORE PRINCIPLE
**A thumbnail is a nicety, never worth a token spend.** One search, one fetch, then stop — the
topic-box emoji is the always-available, cost-free fallback.

## 🛠️ LOGIC

GUARD (hard cap, non-negotiable): at most ONE lightweight OpenLibrary search + ONE image fetch,
total, per call. No retries, no alternate-title attempts, no ISBN lookups if the title/author
search misses.

STEP 1 — SEARCH. Query OpenLibrary by title + author (single request):
  `https://openlibrary.org/search.json?title=<title>&author=<author>`
  TAKE the first result's `cover_i`. IF no result OR no `cover_i` ➔ ABANDON (go to OUTPUT: none).

STEP 2 — FETCH. One direct GET, no retry:
  `https://covers.openlibrary.org/b/id/<cover_i>-M.jpg`
  IF the request fails or returns a placeholder/empty image ➔ ABANDON (go to OUTPUT: none).

STEP 3 — SAVE. Write the image to
  `Memory/Long-Term/LukeatronWiki/_media/<slug>.jpg`
  (slug = the calling page's slug, passed in by `!IdeaWiki`).

STEP 4 — RETURN to the caller:
  `thumbnail = "_media/<slug>.jpg"`
  `thumbnail_caption = "Cover via OpenLibrary"`

## ✅ OUTPUT
On a hit: the saved `_media/<slug>.jpg` file + `thumbnail` / `thumbnail_caption` values, for
`!IdeaWiki` to set directly on the page.
On a miss (no result, no cover_i, or fetch failure) at any step: return nothing — `!IdeaWiki`
proceeds to the next rung of its `SET_THUMBNAIL` ladder (Thumbnails store → one lightweight
web search → none). A miss here costs exactly one search + one fetch, never more.
Log: "[AGENT: !BookCover] [SUCCESS|MISS] slug=[slug] title=[title]" → Logs/skills.log

---
plan: "wiki-link-longterm-stores"
context: Personal Research
secondary_contexts: [Personal Productivity]
created: 2026-06-25
status: New
major_because: "multi-step, modifies Long-Term memory (LukeatronWiki pages are Long-Term fixtures)"
project: ""
skills_used: [!IdeaWiki]
---

# Plan — Link Long-Term Topic Stores to LukeatronWiki

## Objective
Create wiki pages (topic hubs and content pages) in LukeatronWiki for each of the 13 in-scope Long-Term stores listed in `meta-about.md`, using `longterm_refs` to connect the wiki to each store without duplicating content — and clean up the index entries for the four pages moved out of the wiki earlier today.

## Success criteria (measurable)
- `_index.yaml` no longer lists the four moved pages (`hell-evangelism-hamartiology`, `raymond-ibrahim-two-swords-christ`, `theology-aphorisms`, `augustine-city-of-god`); their tag entries are also removed.
- `Nodes/theology.md` hub has updated `longterm_refs` pointing to the three content files now in `Theology/` (augustine-city-of-god.md, hell-evangelism-hamartiology.md, Notes_about_Faith_works.list.md).
- A `format: topic` hub page exists in the wiki for each of the 13 in-scope stores (12 new + `theology.md` updated).
- Each store with substantive content files (Significant, Sociology, Wisdom, Style Guide, Writing Fiction, YouTube) has at least one additional `format: article` or `format: list` wiki page referencing those files via `longterm_refs`.
- Every new page is registered in `_index.yaml` with tags, related slugs, and correct format.
- All `related` / See Also links are bidirectional.
- Stores with no current content (Writing Non-Fiction, Taxonomies) get a stub hub page only.

---

## Resources
- **Memory to read:** All 13 in-scope stores under `Memory/Long-Term/` — index files and content files listed in Steps 3–4.
- **Capability skills:** none (no email, web, or calendar needed)
- **Domain skills (Skillbank):** `!IdeaWiki`
- **Sub-agents:** none
- **Scripts:** none
- **Temp-skills:** none

---

## Steps

### Phase 1 — Tidy the index

- [ ] Step 1 — Open `Memory/Long-Term/LukeatronWiki/_index.yaml` and remove the four stale page entries: `hell-evangelism-hamartiology`, `raymond-ibrahim-two-swords-christ`, `theology-aphorisms`, `augustine-city-of-god`. Remove their slugs from the tag map. Decrement `count` accordingly. [edits: `_index.yaml`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 2 — Update `Nodes/theology.md` hub: add `longterm_refs` entries for the three files now in `Theology/` that are no longer wiki pages: `"Augustine — City of God :: Theology/augustine-city-of-god.md"`, `"Hell, Evangelism & Hamartiology notes :: Theology/hell-evangelism-hamartiology.md"`, `"Faith & works notes :: Theology/Notes_about_Faith_works.list.md"`. Remove `theology-aphorisms`, `augustine-city-of-god`, `hell-evangelism-hamartiology` from `related` (they are now Long-Term files, not wiki slugs). Add `wisdom` and `significant` to `related` in preparation for new hubs. [edits: `Nodes/theology.md`]
  - [ ] !Checkpoint — modifies Long-Term memory

---

### Phase 2 — Read store content

- [ ] Step 3 — Read the `_index.yaml` of every in-scope store to understand what content files exist. Stores: Method, Philosophy, Purpose, Significant, Sociology, Style Guide, Taxonomies, Theology (already read), Thumbnails, Wisdom, Writing Fiction, Writing Non-Fiction, YouTube. [reads: each store's `_index.yaml`]

- [ ] Step 4 — Read the substantive content files in stores that have them (verbatim content needed for article/list pages):
  - `Method/Method_Types.table.md`
  - `Philosophy/Notes about Reality.notes.md`
  - `Purpose/purpose.md`
  - `Significant/significant.md`, `Significant/Books_to_read.list.md`, `Significant/Films_to_watch.list.md`, `Significant/Open_Questions.list..md`, `Significant/Quotes.list.md`, `Significant/Topics_to_Research.list.md`, `Significant/Case_Studies.table.md`, `Significant/First_Things.table.md`, `Significant/Mulch.list.md`, `Significant/Notes_about_The_Secular_Age.review.md`
  - `Sociology/Notes_about_AI.md`, `Sociology/Notes_about_Conflict.notes.md`, `Sociology/The_Overton_window.list.md`
  - `Style Guide/` — read `_index.yaml`; note all style table filenames (no need to read bodies for hub creation)
  - `Wisdom/Wisdom.list.md`
  - `Writing Fiction/Story_ideas.list.md`
  - `YouTube/YouTube_video_ideas.list.md`
  [reads: files listed above]

---

### Phase 3 — Create topic hub pages (one per store)

Each hub is `format: topic`. The lead is a short verbatim orientation (Luke's own words, or a one-sentence statement in plain descriptive English describing what the store holds — not an AI summary). Do NOT hand-list members; the viewer builds the member roll live.

- [ ] Step 5 — Create `method.md` — topic hub for `Method/`. `longterm_refs`: `Method_Types.table.md`. Tags: `[method, thinking]`. [creates: `LukeatronWiki/Nodes/method.md`; edits: `_index.yaml`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 6 — Create `philosophy.md` — topic hub for `Philosophy/`. `longterm_refs`: `Notes about Reality.notes.md`. Tags: `[philosophy, metaphysics]`. [creates: `LukeatronWiki/Nodes/philosophy.md`; edits: `_index.yaml`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 7 — Create `purpose.md` — topic hub for `Purpose/`. `longterm_refs`: `purpose.md`. Tags: `[purpose, identity]`. [creates: `LukeatronWiki/Nodes/purpose.md`; edits: `_index.yaml`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 8 — Create `significant.md` — topic hub for `Significant/`. `longterm_refs`: `significant.md` + all content files listed in Step 4. Tags: `[significant, reading, research, ideas]`. [creates: `LukeatronWiki/Nodes/significant.md`; edits: `_index.yaml`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 9 — Create `sociology.md` — topic hub for `Sociology/`. `longterm_refs`: `Notes_about_AI.md`, `Notes_about_Conflict.notes.md`, `The_Overton_window.list.md`. Tags: `[sociology, culture, society]`. [creates: `LukeatronWiki/Nodes/sociology.md`; edits: `_index.yaml`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 10 — Create `style-guide.md` — topic hub for `Style Guide/`. `longterm_refs`: the full list of style table filenames from `Style Guide/_index.yaml`. Tags: `[style, art, visual, illustration]`. [creates: `LukeatronWiki/Nodes/style-guide.md`; edits: `_index.yaml`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 11 — Create `taxonomies.md` — stub topic hub for `Taxonomies/` (no content files yet). Tags: `[taxonomies, classification]`. [creates: `LukeatronWiki/Nodes/taxonomies.md`; edits: `_index.yaml`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 12 — Create `thumbnails.md` — topic hub for `Thumbnails/`. `longterm_refs`: `Thumbnails/_index.yaml`. Note: store contains image files; the hub serves as the discovery point for visual resources. Tags: `[thumbnails, art, visual, images]`. [creates: `LukeatronWiki/Nodes/thumbnails.md`; edits: `_index.yaml`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 13 — Create `wisdom.md` — topic hub for `Wisdom/`. `longterm_refs`: `Wisdom/Wisdom.list.md`, `Wisdom/theology-aphorisms.md` (moved earlier today). Tags: `[wisdom, aphorisms, maxims]`. `related`: `[theology]`. [creates: `LukeatronWiki/Nodes/wisdom.md`; edits: `_index.yaml`; edits: `Nodes/theology.md` See Also]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 14 — Create `writing-fiction.md` — topic hub for `Writing Fiction/`. `longterm_refs`: `Writing Fiction/Story_ideas.list.md`. Tags: `[writing, fiction, stories]`. [creates: `LukeatronWiki/Nodes/writing-fiction.md`; edits: `_index.yaml`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 15 — Create `writing-non-fiction.md` — stub topic hub for `Writing Non-Fiction/` (no content files yet). Tags: `[writing, non-fiction]`. `related`: `[writing-fiction]`. [creates: `LukeatronWiki/Nodes/writing-non-fiction.md`; edits: `_index.yaml`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 16 — Create `youtube.md` — topic hub for `YouTube/`. `longterm_refs`: `YouTube/YouTube_video_ideas.list.md`. Tags: `[youtube, video, ideas]`. [creates: `LukeatronWiki/Nodes/youtube.md`; edits: `_index.yaml`]
  - [ ] !Checkpoint — modifies Long-Term memory

---

### Phase 4 — Create content pages for stores with rich material

Where a store has substantive content files, create one or more `format: article` or `format: list` pages drawing on that verbatim content. Content must be verbatim (Luke's own words / source quotes) — no AI-generated summaries.

- [ ] Step 17 — **Significant** content pages. Based on content read in Step 4, decide which Significant files warrant standalone wiki pages vs. which are best referenced only via `longterm_refs` on the `significant.md` hub. Candidates for pages: `Open_Questions.list..md` (format: list), `Quotes.list.md` (format: list), `Notes_about_The_Secular_Age.review.md` (format: article). Create pages for those that have enough verbatim content to stand alone. Link bidirectionally to `significant.md`. [creates: up to 3 pages; edits: `_index.yaml`, `Nodes/significant.md`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 18 — **Sociology** content pages. Based on content read in Step 4, create `format: article` or `format: list` pages for: `Notes_about_AI.md` (slug: `sociology-ai`), `Notes_about_Conflict.notes.md` (slug: `sociology-conflict`), `The_Overton_window.list.md` (slug: `overton-window`). Each references its source file via `longterm_refs`. Link bidirectionally to `sociology.md`. [creates: up to 3 pages; edits: `_index.yaml`, `Nodes/sociology.md`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 19 — **Wisdom** content page. The `Wisdom/Wisdom.list.md` file contains Luke's running list of maxims. Create `wisdom-list.md` (format: list) with verbatim content from that file. `longterm_refs`: `Wisdom/Wisdom.list.md`. Link bidirectionally to `wisdom.md`. Skip if the content is too sparse to warrant a standalone page (leave as longterm_ref on the hub instead). [creates: 0–1 pages; edits: `_index.yaml`, `Nodes/wisdom.md`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 20 — **Writing Fiction** content page. Create `story-ideas.md` (format: list) with verbatim content from `Writing Fiction/Story_ideas.list.md`. Link bidirectionally to `writing-fiction.md`. Skip if sparse. [creates: 0–1 pages; edits: `_index.yaml`, `Nodes/writing-fiction.md`]
  - [ ] !Checkpoint — modifies Long-Term memory

- [ ] Step 21 — **YouTube** content page. Create `youtube-ideas.md` (format: list) with verbatim content from `YouTube/YouTube_video_ideas.list.md`. Link bidirectionally to `youtube.md`. Skip if sparse. [creates: 0–1 pages; edits: `_index.yaml`, `Nodes/youtube.md`]
  - [ ] !Checkpoint — modifies Long-Term memory

---

### Phase 5 — Wire up cross-hub links and finalise

- [ ] Step 22 — Review all new hub pages for natural cross-links. Add `related` slugs and See Also entries where topics genuinely connect (e.g. `wisdom` ↔ `theology`; `philosophy` ↔ `theology`; `significant` ↔ `sociology`; `writing-fiction` ↔ `writing-non-fiction`; `style-guide` ↔ `thumbnails`). Ensure every link is bidirectional. [edits: multiple `.md` pages; edits: `_index.yaml` related fields]

- [ ] Step 23 — Final `_index.yaml` audit: confirm `count` is correct, all new slugs appear in the pages list, all new tags appear in the tag map, and no stale entries remain. [edits: `_index.yaml`]

- [ ] Step 24 — Verify — check that: (a) no moved page slugs remain in `_index.yaml`; (b) every in-scope store has at least one wiki page; (c) all `related` links are bidirectional; (d) `Nodes/theology.md` points to the three files now in `Theology/` via `longterm_refs`. [pass/fail]

---

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !IdeaWiki] [SUCCESS] Linked 13 Long-Term stores to LukeatronWiki — created N pages, updated _index.yaml | tokens≈[N]`

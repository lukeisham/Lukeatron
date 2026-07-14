---
plan: "thematic-and-page-refactor"
context: Personal Research
secondary_contexts: [Coding]
created: 2026-06-26
status: New
major_because: "multi-step + modifies Long-Term memory (LukeatronWiki control surface) + modifies a key skill (!IdeaWiki, with Luke's explicit permission)"
project: ""
skills_used: []
---

# Plan — Thematic and Page Refactor (LukeatronWiki)

## Objective
Recast the LukeatronWiki sidebar so it lists **themes** (the Long-Term stores the wiki tracks) instead of every page; relocate the full page list to a dedicated **"All Pages"** view; and extend `!IdeaWiki` so that an absorbed item matching no existing theme triggers a **gated proposal** to create a new Long-Term folder + matching theme.

## Success criteria (measurable)
- The viewer sidebar (`System/Tools/lukeatronwiki-viewer/serve.py`) renders a **Themes** list — the 13 tracked stores (Method, Philosophy, Purpose, Significant, Sociology, Style Guide, Taxonomies, Theology, Thumbnails, Wisdom, Writing Fiction, Writing Non-Fiction, YouTube) — each linking to its topic-hub node, and no longer renders the per-page "Pages" list.
- The existing `/topics` route is **renamed to `/pages`** ("All Pages") and the sidebar Control section link is relabelled "All Pages" — the separate "Topics index" label is retired; the view still lists every non-hub page (By Type / By Tag / A–Z) and loads without error.
- A machine-readable **tracked-themes manifest** exists (the source the sidebar scan reads), kept in sync with the prose list in `meta-about.md`.
- `!IdeaWiki` skill.md contains a **gated new-theme path**: when ABSORB finds no in-scope store, it proposes a new `Memory/Long-Term/<Theme>/` folder + manifest entry + hub node via `!Checkpoint`, and **fails closed** (item parked, nothing created) until Luke approves.
- Viewer still starts cleanly on `localhost:8787`; every existing page and the backlog board still load.

## Resources
- **Memory to read:** `Memory/Long-Term/LukeatronWiki/_index.yaml`, `.../meta-about.md` (Included Long-Term stores list), `.../Nodes/` (hub nodes)
- **Capability skills:** none
- **Domain skills (Skillbank):** `!IdeaWiki` (the skill being modified) — key skill, modified under Luke's explicit instruction
- **Sub-agents:** none
- **Scripts:** `System/Tools/lukeatronwiki-viewer/serve.py` (the viewer — edited, then Sandbox-tested before going live)
- **Temp-skills:** none

## Steps
Bite-sized and ordered. Each box is one action. Tag the skill/tool/mode in brackets. Mark `[x]` when complete.

### Part A — Define the tracked-themes manifest (source of truth for the scan)
- [ ] Step 1 — Add a machine-readable `themes:` block to `_index.yaml` listing the 13 tracked stores as `{name, folder, hub_slug}`, mirroring the prose under **Included Long-Term stores** in `meta-about.md`. [reads: meta-about.md, _index.yaml]
- [ ] Step 2 — Add a one-line note in `meta-about.md` pointing to the `_index.yaml` `themes:` block as the canonical list, so prose and manifest can't silently diverge. [edits: meta-about.md]
  - [ ] !Checkpoint — Long-Term control-surface edit (`_index.yaml` + `meta-about.md`); confirm with Luke before write.

### Part B — Rewire the sidebar to themes (viewer)
- [ ] Step 3 — In `serve.py`, add a `load_themes()` that reads the `themes:` manifest and **scans `Memory/Long-Term/<folder>`** to confirm each tracked folder exists (skip + warn on any missing). [edits: serve.py]
- [ ] Step 4 — Rewrite `page_shell()` sidebar: replace the per-page "Pages" `<ul>` with a **Themes** list, each theme linking to its hub node (`/page/<hub_slug>`); keep the brand, tagline, and Control section. [edits: serve.py]
  - [ ] Test in Sandbox — copy serve.py to `System/Sandbox/`, run it on a spare port, confirm the sidebar shows the 13 themes and each link resolves to its hub.

### Part C — Add the "All Pages" view (viewer)
- [ ] Step 5 — Rename the existing `/topics` route to `/pages` and the `render_topics()` function to `render_all_pages()`; no new logic needed — the view already lists every page by type/tag/A–Z. [edits: serve.py]
- [ ] Step 6 — Update the sidebar Control section: change the "Topics index" link label to **All Pages** and its href to `/pages`; remove any orphaned `/topics` references. [edits: serve.py]
  - [ ] Test in Sandbox — run the Sandbox copy, open `/pages`, confirm every current content page appears and links work; confirm Main Page + Backlog board still render; confirm `/topics` is gone (404 is acceptable) or redirects.

### Part D — Promote the tested viewer
- [ ] Step 7 — Replace the live `serve.py` with the Sandbox-verified version; restart the viewer (or let the `SessionStart` hook respawn it) and confirm `localhost:8787` serves the new sidebar + All Pages. [runs: ensure-viewer.sh]

### Part E — Extend !IdeaWiki with the gated new-theme path
- [ ] Step 8 — **Draft** the changes to `!IdeaWiki/skill.md`: in ABSORB step 3, replace the "genuinely none fits → ASK Luke / NEVER invent" branch with a **PROPOSE-NEW-THEME** sub-path that (a) assembles a proposal `{theme name, Memory/Long-Term/<Theme>/ folder, manifest entry in _index.yaml themes:, meta-about.md prose line, new topic-hub node}`, (b) routes it through `!Checkpoint` (fail closed — park `_queue` row, create nothing until approved), and (c) on approval: create folder, append to manifest + meta-about.md, create hub node from Template_IdeaPage.md, then resume normal ABSORB. Produce the draft text before writing any file. [draft only: skill.md]
  - [ ] !Checkpoint — Luke gave sign-off to modify !IdeaWiki; this checkpoint confirms the specific implementation draft before it is written. Present the drafted logic and wait for approval.
- [ ] Step 9 — On approval: write the confirmed logic into `!IdeaWiki/skill.md`. [edits: skill.md]
- [ ] Step 10 — Bump `!IdeaWiki` version, update `## ✅ OUTPUT` + Validation Check to cover the new-theme path; refresh the Skillbank `_index.yaml` `Updated:` header if the description changed. [edits: skill.md, Skillbank _index.yaml]

### Verify
- [ ] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter, then move the file from `System/Plans/New/` to `System/Plans/Completed/`.

---

## Review notes (!ReviewPlan, 2026-06-26)
- Fixed: `secondary_contexts: [Coding]` added — build DoD applies, not research-citation standards.
- Fixed: Part E !Checkpoint moved before file writes (draft → checkpoint → write); Luke's prior sign-off noted.
- Resolved: All Pages vs Topics Index — `/topics` renamed to `/pages`, sidebar label updated to "All Pages"; no new view code needed.
- **APPROVED — cleared for execution.**

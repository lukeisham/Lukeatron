---
plan: "okf-frontmatter-retrofit"
context: Personal Research
secondary_contexts: [Coding]
created: 2026-07-05
status: Completed
major_because: "multi-step + modifies Long-Term memory across ~34 stores + edits protected templates and memory-structure.md"
project: ""
skills_used: []
---

# Plan — OKF Frontmatter Retrofit

## Objective
Make Lukeatron's memory OKF-compatible and wiki-compatible — define the frontmatter convention, retrofit existing Long-Term stores (and relevant project files) with the OKF **minimum** frontmatter, add `index.md` navigation pages alongside `_index.yaml`, and update the templates so future memories are born compliant (specialises the Personal Research North Star via the build bar: a working, portable knowledge base).

## Success criteria (measurable)
- A convention spec added to `Memory/Long-Term/Lukeatron/memory-structure.md`: OKF reserved fields, the agreed **minimum** (`type` + `title` + `description`), the rule that wiki keys (`topic`, `emoji`, `thumbnail`, `thumbnail_caption`) coexist as custom fields, and a per-store `type` vocabulary.
- Every existing `.md` in `Memory/Long-Term/` (excluding `Logs/`) that lacks frontmatter gains an OKF-minimum block; files with existing frontmatter (e.g. wiki nodes) gain any missing `type`/`title`/`description` **without** losing existing keys — verified by the inventory script showing 0 remaining non-compliant files.
- Each Long-Term store folder has an `index.md` navigation page **alongside** the retained `_index.yaml`.
- Memory-producing templates (`Template_WikiPage.md`, `Template_IdeaPage.md`, `Template_Person.md`, `Template_Group.md`, and any other that writes to a store) carry the OKF-minimum frontmatter so new files inherit it.
- Project files under `Memory/Medium-Term/Projects/` where relevant carry OKF-minimum frontmatter.
- Charter/purpose baseline held: nothing fabricated (descriptions are accurate to file content), no source standards touched, and the whole change clears `!Checkpoint` before it is final (High-impact: Long-Term + protected templates).

## Resources
- **Memory to read:** `Memory/Long-Term/Lukeatron/memory-structure.md`, a sample from each store type, `System/Templates/Template_WikiPage.md` / `Template_IdeaPage.md` / `Template_Person.md` / `Template_Group.md`, the OKF spec (blog post already reviewed — summary in Improvements.md row)
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** one per store-group for the retrofit fill (judgement — each file needs an accurate `type`/`title`/`description`)
- **Scripts:** `okf-inventory.py` (standalone, `Memory/Medium-Term/temp-skills/`) — lists every Long-Term `.md`, reports frontmatter present? / `type` present?, emits a worklist and a final compliance count
- **Temp-skills:** none

## Steps
- [ ] Step 1 — Read `memory-structure.md` + one sample file from each store shape (plain `.md`, wiki node, People/Group record, table file) to fix the type vocabulary [reads: memory]
- [ ] Step 2 — Draft the frontmatter convention + per-store `type` vocabulary in `System/Sandbox/okf-convention-draft.md` [inline]
- [ ] Step 3 — Write `okf-inventory.py` — inventories Long-Term `.md` files, flags non-compliant, prints a worklist + compliance count [script]
  - [ ] Test in Sandbox — run on a copy of 2–3 stores in `System/Sandbox/`; confirm it correctly distinguishes has-frontmatter / missing-type / compliant before any real write
- [ ] Step 4 — Retrofit each store-group: add OKF-minimum frontmatter where missing, backfill missing keys on files that already have frontmatter, never dropping existing keys [sub-agents, one per store-group]
- [ ] Step 5 — Add an `index.md` navigation page to each Long-Term store folder (generate from `_index.yaml` where present; retain `_index.yaml`) [inline/script]
- [ ] Step 6 — Add OKF-minimum frontmatter to memory-producing templates so future files are born compliant [inline — protected templates, High-impact]
- [ ] Step 7 — Retrofit relevant `Memory/Medium-Term/Projects/` files [sub-agent]
- [ ] Step 8 — Write the convention spec into `memory-structure.md` [inline]
  - [ ] !Checkpoint — Long-Term memory change across ~34 stores + protected template edits; hold for Luke's review/approval before final (High-impact)
- [ ] Step 9 — Re-run `okf-inventory.py`; confirm 0 non-compliant files [script]
- [ ] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter, then move the file from `System/Plans/New/` to `System/Plans/Completed/`.

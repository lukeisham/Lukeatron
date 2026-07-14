---
plan: "lukeatronwiki-refactor-3"
context: Personal Research
secondary_contexts: [Coding]
created: 2026-06-25
status: Completed
completed: 2026-06-25
skills_used: ["!CreatePlan", "!ReviewPlan", "!IdeaWiki", "!Suggest"]
completion_note: "All four changes shipped + verified on the live :8787 viewer. (1) Verbatim-only: mode:ai retired, {AI}/AI-key-points removed from template/skill/pages/viewer; AI role = format+link only. (2) Wiki relocated to Memory/Long-Term/LukeatronWiki/; all path refs swapped (script, sandbox-tested); lifecycle flipped to !ArchiveMemory across CLAUDE.md/skill/index/queue/meta. (3) Draws on Long-Term via longterm_refs + a read-only /lt route (fenced to Long-Term). (4) Four formats live (article/list/topic/support) with an auto-aggregating Theology topic hub. refactor-2 superseded. Two Swords thumbnail N/A (guard already exhausted 24 Jun)."
major_because: "multi-step build + relocates the wiki into Long-Term memory (!Checkpoint) + modifies the protected bootloader (CLAUDE.md), a protected key skill (!IdeaWiki) and a protected template (Template_IdeaPage.md) — requires Luke's explicit sign-off"
project: ""
supersedes: "lukeatronwiki-refactor-2"
skills_used: []
---

# Plan — LukeatronWiki Refactor Round 3 (verbatim-only · move to Long-Term · draw on Long-Term · four page formats)

## Objective
Refactor LukeatronWiki into a **verbatim-only, Long-Term-resident** thinking wiki whose AI role is limited to **formatting and linking** (See Also, topic organisation, chips), that **draws on both incoming material and existing Long-Term stores** (by reference, never by copy), and that renders **four page formats** — article (long-form), list (short), topic (hub), and support (how it works / setup) — consistently across the skill, template, viewer, and docs.

> **Charter anchor (Personal Research → build bar).** This is a build/coding project (`secondary_contexts: [Coding]`), so the Definition of Done is the **build bar**: it actually works (verified against the real files and a live viewer, not the sitemap) and matches existing house style (sibling skills/templates read first). Research-citation standards do not apply. Guardrails honoured: protected key skill/template/bootloader touched **only with Luke's explicit sign-off** (= this plan's approval); the Long-Term relocation and any Long-Term writes clear `!Checkpoint`. Decisions confirmed with Luke: Topic page = hub aggregating wiki pages on a topic/tag; this plan **supersedes & absorbs** refactor-2; verbatim becomes the **only** content mode.

## Success criteria (measurable)
- **#1 Verbatim-only / AI = format + link only** — `Template_IdeaPage.md` and `!IdeaWiki` carry no `mode: ai` logic, no `{AI}` prefix convention, no ai/verbatim ASK gate, and no AI-written summary / AI "Key Points" extraction. Page content is Luke's / the source's own words, AI-formatted; AI's only generative role is See Also links, chips, and topic organisation. The viewer renders no ai/verbatim mode badge (or a single neutral provenance line). `grep -rn "{AI}"` across the wiki + template + skill returns nothing load-bearing.
- **#2 Moved to Long-Term** — the wiki lives at `Memory/Long-Term/LukeatronWiki/`; `Memory/Medium-Term/LukeatronWiki/` no longer exists; `grep -rl "Medium-Term/LukeatronWiki"` across the repo returns **zero** files. Lifecycle governance updated everywhere from Medium-Term/`!PruneMemory` to Long-Term/`!ArchiveMemory` (CLAUDE.md Memory + Folder Reference + Info-Flow + skills table, `meta-about.md`, `!IdeaWiki` CHURN, `_index.yaml` header).
- **#3 Draws on Long-Term** — `!IdeaWiki` ABSORB and EXPLORE reference matching existing Long-Term subject-store content (read-only links, **never** copies — non-duplication governance honoured); pages carry a "Related in Long-Term" reference mechanism; ≥1 existing page demonstrates a working Long-Term reference.
- **#4 Four formats live** — a `format:` frontmatter field (`article | list | topic | support`) exists in the template; the viewer renders each distinctly; a **Topic** hub page auto-aggregates every wiki page sharing its topic/tag (chips + See Also, AI-organised); a **list** page renders compact; the **support** format covers how-the-wiki-works + setup and is excluded from article feeds; **article** is the default long-form render.
- **refactor-2 retired** — `lukeatronwiki-refactor-2.md` moved to `System/Plans/Completed/` (its viewer/template pieces confirmed already live); the Two Swords thumbnail acquired or honourably abandoned under the guard; its ai/verbatim duality collapsed to verbatim-only.
- **Build bar** — `serve.py` runs without error; Main Page + every article/list/topic/support page render in **both** light and dark themes; no dead links, no `{AI}` artefacts, no broken thumbnails.
- **Gates** — `!Checkpoint` cleared for the Long-Term relocation and any Long-Term writes; all three protected assets edited **only after** this plan is approved.

## Resources
- **Memory to read:** `Memory/Long-Term/` subject stores (Theology, Philosophy, Bible, … — for the #3 integration + the Theology topic hub demo), `Memory/Long-Term/Coding/` (house style), the wiki dir itself (already read this session).
- **Capability skills:** `!HeadlessChromeBrowser` (guarded Two Swords thumbnail — one search + one fetch max).
- **Domain skills (Skillbank):** `!IdeaWiki` (the skill being edited).
- **Sub-agents:** optional — one for the cross-file prose/governance rewrites (Medium-Term → Long-Term lifecycle wording) if done in a single pass; otherwise inline.
- **Scripts:** a one-off **path-swap** script in `Memory/Medium-Term/temp-skills/` doing the literal `Memory/Medium-Term/LukeatronWiki` → `Memory/Long-Term/LukeatronWiki` replacement across the **non-protected** referencing files (protected files edited by hand). Sandbox-tested on copies first.
- **Temp-skills:** none.

## Guardrail acknowledgement
The three protected assets — `CLAUDE.md` (bootloader), `!IdeaWiki/skill.md` (key skill), `Template_IdeaPage.md` (template) — are edited **post-approval only**. Luke's request + this plan's approval = the explicit sign-off the charter requires. The physical relocation into Long-Term and any Long-Term content writes clear `!Checkpoint`.

## Steps

### Phase A — Supersede refactor-2 & set the baseline
- [ ] Step 1 — **Retire refactor-2** — confirm its viewer/template pieces are already live (path footer, light/dark toggle, mode badge, `{AI} Notes` removed), tick its boxes, add a closing note "superseded by lukeatronwiki-refactor-3", and move `System/Plans/New/lukeatronwiki-refactor-2.md` → `System/Plans/Completed/`. [housekeeping]
- [ ] Step 2 — **Two Swords thumbnail (carry-over, optional)** — attempt a cover for `raymond-ibrahim-two-swords-christ` via `!HeadlessChromeBrowser` under the strict guard (one search + one fetch); save to `_media/`, set `thumbnail` + `thumbnail_caption`; if nothing obvious → document the honourable abandon and keep the ☪ chip. [!HeadlessChromeBrowser — guarded]

### Phase B — Relocate the wiki into Long-Term (#2)
- [ ] Step 3 — **Move the folder** — relocate `Memory/Medium-Term/LukeatronWiki/` → `Memory/Long-Term/LukeatronWiki/` whole (pages, `_index.yaml`, `_queue.yaml`, `_media/`, `lukeatronwiki.md`, `meta-about.md`). [Long-Term change]
  - [ ] !Checkpoint — Long-Term memory changes (the wiki now lives in Long-Term). Confirm with Luke before the move lands.
- [ ] Step 4 — **Write + sandbox-test the path-swap script** — a one-off script (`Memory/Medium-Term/temp-skills/relocate-wiki-paths.*`) that replaces `Memory/Medium-Term/LukeatronWiki` → `Memory/Long-Term/LukeatronWiki` across the **non-protected** files only: `serve.py`, `ensure-viewer.sh`, viewer `README.md`, `project-dashboard/README.md`, `Skillbank/_index.yaml`, `!Intake/skill.md`, `!GenerateWiki/skill.md`, `_index.yaml` header, `lukeatronwiki.md`, `PR-01.../registry.md`, `Projects/_tracking.yaml`. [script]
  - [ ] Test in Sandbox — run the script against copies in `System/Sandbox/`; diff the output; confirm only the path string changed and nothing else mangled, before running for real.
- [ ] Step 5 — **Viewer wiring** — in `serve.py` set `WIKI_DIR` default to `.../Memory/Long-Term/LukeatronWiki` and update the file-path footer string `Memory/Long-Term/LukeatronWiki/<slug>.md`; update `ensure-viewer.sh` if it hard-codes the path; confirm `settings.json` `SessionStart` hook still resolves (it points at the tool, not the wiki). [viewer]
- [ ] Step 6 — **Lifecycle governance prose (protected CLAUDE.md)** — rewrite every Medium-Term → Long-Term reference to LukeatronWiki in `CLAUDE.md` (Boot Sequence, Memory Structure, Folder Reference, Information Flow, the `!IdeaWiki` skills-table row, the Inbox-Disposition `③ Think` row) and flip its pruning governance from `!PruneMemory` (Medium-Term) to `!ArchiveMemory` (Long-Term, gated). [protected bootloader — post sign-off]
- [ ] Step 7 — **Lifecycle governance prose (data + skill)** — mirror the same Medium-Term→Long-Term / churn→`!ArchiveMemory` rewrite in `meta-about.md` ("lives in Medium-Term because its contents churn" → the Long-Term framing), the `!IdeaWiki` CHURN block + `dependencies`, and the `_index.yaml` header comment. [protected skill + Long-Term data — post sign-off]
  - [ ] !Checkpoint — Long-Term memory changes (governance wording inside the relocated store).

### Phase C — Verbatim-only / AI = format + link only (#1)
- [ ] Step 8 — **Template** — in `Template_IdeaPage.md` remove the `mode` field + ai/verbatim duality, delete the AI-extracted "Key Points" guidance (or recast it as a *verbatim* points list owned by Luke), drop the `{AI}` prefix convention, and state plainly that AI's only generative role is formatting + See Also + chips + topic organisation. [protected template — post sign-off]
- [ ] Step 9 — **Skill** — in `!IdeaWiki/skill.md` delete the Verbatim/AI ASK gate and all `mode` branching (always verbatim), remove the `{AI}`-summary / Key-Points-extraction instructions, restate the AI role, and bump `version`. [protected skill — post sign-off]
- [ ] Step 10 — **Viewer** — in `serve.py` remove the ai/verbatim mode-badge + `{AI}` prefix handling (collapse to a single neutral provenance line or none); prune the now-dead CSS. [viewer]
- [ ] Step 11 — **Existing pages** — strip `mode` frontmatter, any `{AI}` prefixes, and any AI-extracted "Key Points" from the five pages (`augustine-city-of-god`, `hell-evangelism-hamartiology`, `raymond-ibrahim-two-swords-christ`, `theology-aphorisms`, `meta-about`) so each holds verbatim, AI-formatted content only. [Long-Term data]
  - [ ] !Checkpoint — Long-Term memory changes (page edits in the relocated store).

### Phase D — Draw on existing Long-Term content (#3)
- [ ] Step 12 — **Reference mechanism** — add a Long-Term reference convention to the template + viewer: a `longterm_refs:` frontmatter list (store-relative paths/labels) rendered as a **"Related in Long-Term"** section — read-only links, **never** copied content (honours the never-duplicate rule). Optionally extend the viewer's already ROOT-fenced `_resolve_safe` to serve those `.md` read-only. [protected template + viewer]
- [ ] Step 13 — **Skill behaviour** — extend `!IdeaWiki` ABSORB to scan matching Long-Term subject stores for related existing content and add reference links, and EXPLORE to traverse into Long-Term; spell out the read-only/never-copy rule. [protected skill — post sign-off]
- [ ] Step 14 — **Demonstrate** — add at least one real Long-Term reference to an existing page (e.g. the theology pages → `Memory/Long-Term/Theology/`) and confirm it renders. [Long-Term data]
  - [ ] !Checkpoint — Long-Term memory changes.

### Phase E — Four page formats (#4)
- [ ] Step 15 — **`format` field** — add `format: article | list | topic | support` to `Template_IdeaPage.md` (default `article`) with one-line guidance per format; note it is orthogonal to `type` (the kind chip). [protected template — post sign-off]
- [ ] Step 16 — **Viewer rendering** — in `serve.py` switch `render_page` on `format`: **article** = current long-form render; **list** = compact list render (generalises the `<topic>-aphorisms` pattern); **topic** = a hub whose member grid is auto-built from `_index.yaml` by matching topic/tag (chips + See Also), like a Topics-Index scoped to one topic; **support** = help/setup styling, excluded from the Main-Page article feeds (alongside `meta`). [viewer]
- [ ] Step 17 — **Skill assigns format** — `!IdeaWiki` sets `format` on create (normal source/book/theme → article; aphorism/short collection → list; hub → topic; meta/help → support) and keeps topic hubs' membership reflected in `_index.yaml`. [protected skill — post sign-off]
- [ ] Step 18 — **Seed the formats** — tag the five existing pages with the right `format`, recast `theology-aphorisms` as `format: list`, recast `meta-about` (+ Main Page) as `format: support`, and create one **Topic hub** page (e.g. `theology` topic) that auto-aggregates the theology pages and references `Memory/Long-Term/Theology/`. [Long-Term data]
  - [ ] Test in Sandbox — run `serve.py` headless on a spare port; curl Main Page + each format (article/list/topic/support); check both themes, the topic hub's auto member-list, the Long-Term refs, no `{AI}` artefacts, no dead links/images. [build-bar verification]
  - [ ] !Checkpoint — Long-Term memory changes (new/edited pages + index in the relocated store).

### Phase F — Land & verify
- [ ] Step 19 — **Restart the viewer** — kill the running `:8787` process, relaunch via `ensure-viewer.sh`, confirm the new code + Long-Term path are live in the browser. [build-bar]
- [ ] Step 20 — **`!Suggest`** — review the path-swap script (and any repeated format work); recommend promoting/retiring it. [!Suggest]
- [ ] Verify — every line in **Success criteria** holds; result matches the **Objective**. [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

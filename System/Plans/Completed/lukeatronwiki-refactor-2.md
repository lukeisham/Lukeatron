---
plan: "lukeatronwiki-refactor-2"
context: Personal Research
secondary_contexts: [Coding]
created: 2026-06-24
status: Completed
superseded_by: "lukeatronwiki-refactor-3"
closed: 2026-06-25
closing_note: "Superseded by lukeatronwiki-refactor-3. Its viewer/template pieces (light/dark toggle, file-path footer, mode badge, {AI} Notes removal, mode field) were already implemented and are live in serve.py + Template_IdeaPage.md. The Two Swords thumbnail was attempted and honourably abandoned under the guard (2026-06-24: OpenLibrary no cover; Quadrant/Google bot-blocked). Refactor-3 collapses the ai/verbatim duality this plan introduced into verbatim-only."
major_because: "multi-step + modifies protected template (Template_IdeaPage.md) and protected key skill (!IdeaWiki) — requires Luke's explicit sign-off"
project: ""
skills_used: []
---

# Plan — LukeatronWiki Refactor Round 2 (thumbnail · toggle · path footer · remove Notes · verbatim mode)

## Objective
Extend LukeatronWiki so every page shows its file path, a light/dark toggle makes long reading comfortable, the {AI} Notes section is removed in favour of enriched Key Points, and the skill asks Verbatim-or-AI before writing any new page — producing a wiki that is faster to read, self-locating, and honest about provenance.

## Success criteria (measurable)
- Two Swords of Christ page has a cover image in `_media/` with `thumbnail` frontmatter set, OR the attempt is documented as honourably failed under the guard (one search + one fetch max).
- `serve.py` renders a light/dark toggle button in the sidebar; clicking it switches theme; preference survives a page reload (localStorage).
- Every wiki article page in the viewer shows a muted footer line: `Memory/Medium-Term/LukeatronWiki/<slug>.md`. Main Page and Topics Index have no footer.
- `## {AI} Notes` section is absent from `Template_IdeaPage.md` and all five existing pages; load-bearing Notes content is present in Key Points on the same pages.
- `Template_IdeaPage.md` has a `mode: verbatim | ai` frontmatter field; `!IdeaWiki` ABSORB logic asks the verbatim/AI question before writing any new normal-item page (skips if "verbatim" in prompt, or item is small).
- All five existing pages have `mode: ai` frontmatter.
- Build bar: `serve.py` runs without error; all five pages + Main Page + Topics render; light and dark theme both look correct.
- Sign-off guardrail: both protected-asset edits begin only after this plan is approved.

## Resources
- **Memory to read:** `Memory/Medium-Term/LukeatronWiki/` (all five pages, already read this session)
- **Capability skills:** `!HeadlessChromeBrowser` (guarded thumbnail search/fetch for Two Swords)
- **Domain skills (Skillbank):** `!IdeaWiki` (skill being edited)
- **Sub-agents:** none
- **Scripts / Temp-skills:** none (viewer edits live in `serve.py` directly)

## Guardrail acknowledgement
Both protected assets (`Template_IdeaPage.md`, `!IdeaWiki/skill.md`) are edited post-approval only. Luke's request + plan approval = explicit sign-off per the Personal Research charter.

## Steps

- [ ] Step 1 — **Thumbnail: Two Swords of Christ** — attempt cover via `!HeadlessChromeBrowser`: one search (e.g. ISBN lookup or publisher page for "The Two Swords of Christ Raymond Ibrahim"), one image fetch; save to `_media/raymond-ibrahim-two-swords-christ.<ext>`, set `thumbnail` + `thumbnail_caption` in the page frontmatter. If no obvious hit after one fetch → document the attempt in a comment on the page, leave `thumbnail: ""`, and fall back to the ☪ emoji chip. [!HeadlessChromeBrowser — guarded]

- [ ] Step 2 — **Remove `## {AI} Notes` from `Template_IdeaPage.md`** — fold the Notes-section instructions into the Key Points guidance comment; update the USING THE TEMPLATE header comment to drop the `{AI} Notes` reference; add `mode: verbatim | ai` frontmatter field with its explanation. [protected template — post sign-off]

- [ ] Step 3 — **Update `!IdeaWiki/skill.md`** — (a) replace `{AI} Notes` references in the ABSORB new-page format description with the Key-Points-only format; (b) add the Verbatim/AI ask gate: IF "verbatim" in prompt → `mode: verbatim`, no ask; ELIF small item (aphorism/fragment) → `mode: verbatim`, no ask; ELSE → ASK "Did you want an {AI} summary and key points, or Verbatim?"; (c) define Verbatim page content: summary = Luke's own words verbatim, Key Points = verbatim quotes/items, no AI prose; (d) bump version to 2.3.0. [protected skill — post sign-off]

- [ ] Step 4 — **Fold Notes → Key Points and remove `## {AI} Notes` from all five pages** — for each page (augustine, hell-evangelism, raymond-ibrahim, theology-aphorisms, meta-about): (a) move any load-bearing Notes sentences into Key Points as bullets; (b) delete the `## {AI} Notes` section; (c) add `mode: ai` to frontmatter. [Medium-Term, apply-safe]

- [ ] Step 5 — **Light/dark toggle in `serve.py`** — (a) add a light-theme CSS variable block (`:root.light { --bg:#f8f9fa; --panel:#fff; --panel2:#f1f3f5; --line:#dee2e6; --ink:#1a1a1a; --mut:#6b7280; --acc:#2563eb; }`) alongside the existing dark defaults; (b) add a toggle `<button>` in the sidebar (☀ / 🌙 label); (c) add ~10 lines of inline JS: on click toggle `document.documentElement.classList.toggle('light')`, persist to `localStorage`; on load read and apply. [viewer]

- [ ] Step 6 — **File-path footer in `serve.py`** — in `render_page`, append a `<footer class="page-path">` block after the backlinks section showing `Memory/Medium-Term/LukeatronWiki/<slug>.md` in muted monospace. Add `.page-path` CSS. Main Page (`render_main_page`) and Topics Index (`render_topics`) get no footer. [viewer]

- [ ] Step 7 — **Mode badge in `serve.py`** — in `load_pages`, read `fm.get("mode") or "ai"`; in `render_page`, render a small pill beside the existing status chip: `verbatim` (green) or `AI-assisted` (muted blue). [viewer]
  - [ ] Test in Sandbox — run headless on port 8799; curl Main Page + all five article pages; check: toggle button present, path footer on article pages, no {AI} Notes heading, mode badge present, img endpoint 200 if thumbnail acquired, light/dark CSS classes wired. [build-bar verification]

- [ ] Step 8 — **Restart `:8787` viewer** — kill the current process, relaunch via `ensure-viewer.sh`, confirm new code is live. [build-bar]

- [ ] Verify — every line in **Success criteria** holds. [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

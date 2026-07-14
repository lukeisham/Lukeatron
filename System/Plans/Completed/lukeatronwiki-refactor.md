---
plan: "lukeatronwiki-refactor"
context: Personal Research
secondary_contexts: [Coding]
created: 2026-06-24
status: Completed
major_because: "multi-step + modifies a protected template (Template_IdeaPage.md) and a protected key skill (!IdeaWiki) — requires Luke's explicit sign-off"
project: ""
skills_used: [!CreatePlan, !ReviewPlan, !IdeaWiki, !HeadlessChromeBrowser, !Suggest]
---

# Plan — LukeatronWiki Refactor (Wikipedia-style pages + auto Main Page)

## Objective
Rework LukeatronWiki so pages read like Wikipedia entries — a `{AI}` summary, a Key-Points list, a two-chip topic box, an optional guarded thumbnail, and See Also (no AI Open Questions) — fed by a viewer-generated Main Page, with the four existing pages retrofitted and a working `localhost:8787` viewer.

## Success criteria (measurable)
- `Template_IdeaPage.md` carries `topic`/`emoji` frontmatter and a body of: `{AI}` Summary lead → `## Key Points` → `## {AI} Notes` → `## See Also`; **no** Open Questions section.
- `!IdeaWiki/skill.md` documents: new-page format, aphorism routing (append to `<topic>-aphorisms` by dominant tag), the strict thumbnail guard (≤1 search + ≤1 fetch), and that the Main Page is now viewer-generated (stops hand-writing recent/entry/open-question lists).
- `serve.py` renders, for any page: a two-chip topic box (kind + subject) beside the thumbnail infobox; the Key Points list; and **no** Open Questions block.
- Visiting `localhost:8787/` shows an **auto-built Main Page** (Recently-updated by frontmatter date + a Featured/past block + Important links), excluding `meta-about`.
- `meta-about.md` exists holding the old descriptive blurb; `lukeatronwiki.md` is a thin stub linking it; both are reflected in `_index.yaml`.
- All four existing pages (`augustine-city-of-god`, `hell-evangelism-hamartiology`, `raymond-ibrahim-two-swords-christ`, `theology-aphorisms`) are in the new format with `{AI}` markers, Key Points, no Open Questions, and a thumbnail attempted under the guard.
- Build bar: the viewer actually runs and renders all pages without error (verified live, not by inspection); matches the existing `serve.py` house style.

## Resources
- **Memory to read:** `Memory/Medium-Term/LukeatronWiki/` (template already read: `_index.yaml`, `_queue.yaml`, `lukeatronwiki.md`, 4 pages); `System/Templates/Template_IdeaPage.md`
- **Capability skills:** `!HeadlessChromeBrowser` (guarded thumbnail search/fetch for the 4 pages)
- **Domain skills (Skillbank):** `!IdeaWiki` (the skill being edited)
- **Sub-agents:** none (changes are specific and known; no fan-out needed)
- **Scripts:** none (viewer edits live in `serve.py` directly)
- **Temp-skills:** none

## Guardrail acknowledgement
- This plan edits two **protected assets** — `Template_IdeaPage.md` (template) and `!IdeaWiki` (key skill). Charter guardrail: "Touch a key skill, checkpoint, or template only with Luke's explicit sign-off." Luke's request + approval of this plan **is** that sign-off. No edits to those two files begin until the plan is approved.

## Steps
Bite-sized and ordered. Each box is one action. Tag in brackets. Mark `[x]` when complete.

- [x] Step 1 — Update `System/Templates/Template_IdeaPage.md`: add `topic:` + `emoji:` frontmatter (subject chip); rewrite body to `{AI}`-prefixed Summary lead → new `## Key Points` (dotted quotes/key points/links) → `## {AI} Notes` → `## See Also`; **delete** the Open Questions section; refresh the header comment block to match. [edits protected template — post sign-off]
- [x] Step 2 — Update `System/Skillbank/GeneralPurposeSkills/!IdeaWiki/skill.md`: (a) new-page format incl. `topic`/`emoji`, `{AI}` markers, Key Points; (b) **remove** Open-Questions harvesting from ABSORB/EXPLORE/CHURN; (c) add aphorism routing — small items append to `<topic>-aphorisms` matched by dominant tag, create that page only if none exists; (d) add the **strict thumbnail guard** procedure (≤1 web search + ≤1 image fetch, abandon if nothing obvious, save to `_media/<slug>.<ext>`, emoji-only fallback); (e) note the Main Page is now **viewer-generated** — skill stops hand-writing recent/entry/open-question snapshots. [edits protected skill — post sign-off]
- [x] Step 3 — Edit `serve.py`: add **topic-box** render — a kind chip from `type` (📖 book · 🧩 theme · ❓ question · 🔗 source · 👤 person-idea) + a subject chip from `topic`+`emoji`, positioned beside/above the thumbnail infobox (and standalone when no thumbnail). [viewer]
- [x] Step 4 — Edit `serve.py`: render the new `## Key Points` section cleanly; confirm the `{AI}` literal renders in the Summary and the `{AI} Notes` heading; **remove** any Open Questions rendering path. [viewer]
- [x] Step 5 — Edit `serve.py`: build the **auto Main Page** for `/` — "Recently updated" (sort pages by frontmatter `updated` desc), a "Featured / from the archive" block, and an "Important links" block, all read live from `_index.yaml`/page frontmatter; **exclude** `meta-about` and the landing stub from these lists. [viewer]
  - [x] Test in Sandbox — run `serve.py` (or against a `System/Sandbox/` copy of the wiki), curl/load `/`, `/page/<each>`, `/topics`; confirm topic box, Key Points, thumbnails, auto Main Page, and **no** Open Questions all render without error. [build-bar verification]
- [x] Step 6 — Create `Memory/Medium-Term/LukeatronWiki/meta-about.md`: move the current descriptive/"why it's a pseudo-project"/"how pages work"/lifecycle blurb here as a proper page (type `meta`/excluded from lists). [Medium-Term, apply-safe]
- [x] Step 7 — Shrink `lukeatronwiki.md` to a thin stub: title + one-line purpose + link to `[[meta-about]]`; the recent/featured/links sections are now injected by the viewer, not stored here. Drop the "Open Questions (live)" block. [Medium-Term, apply-safe]
- [x] Step 8 — Retrofit the four existing pages to the new format — add `topic`/`emoji`, add `## Key Points`, prefix `{AI}` to the Summary + rename to `## {AI} Notes`, **delete** Open Questions, keep See Also untouched. [Medium-Term, apply-safe]
- [x] Step 9 — Thumbnails for the four pages via the Step-2 guard: `!HeadlessChromeBrowser` ≤1 search + ≤1 fetch each (book covers for the 3 books; theology-aphorisms likely emoji-only); save to `_media/<slug>.<ext>`, set `thumbnail`/`thumbnail_caption`; **abandon any that aren't a cheap obvious hit** and fall back to emoji. [!HeadlessChromeBrowser — guarded]
  - [x] !Checkpoint — guard adherence: confirm no page triggered more than one search + one fetch; report which got images vs emoji fallback.
- [x] Step 10 — Update `_index.yaml`: add `meta-about` (flagged excluded-from-lists), surface `topic`/`emoji` on each page entry if indexed, bump `count`/`last_updated`. [Medium-Term, apply-safe]
- [x] Step 11 — Restart/confirm the live viewer (the `SessionStart` hook on `:8787`); load Main Page + every page in a browser. [build-bar verification]
- [x] Verify — every line in **Success criteria** holds, and the result matches the **Objective**? [pass/fail]
- [x] Suggest — run `!Suggest` on the guarded-thumbnail-fetch routine; if it's reusably deterministic, propose capturing it as a temp-skill. [!Suggest]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

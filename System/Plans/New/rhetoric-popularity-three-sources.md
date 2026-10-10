---
plan: "rhetoric-popularity-three-sources"
context: Teaching
secondary_contexts: [Lukeatron]
created: 2026-10-03
status: New
major_because: "multi-step; changes a live app's data pipeline and writes its real database; blocked on human-gated scraping runs (!DeviceMentions)"
project: "Memory/Medium-Term/Projects/TE-15-rhetoric-popularity-three-sources"
skills_used: []
---

# Plan — Rhetoric popularity from Wikipedia, Urban Dictionary and TV Tropes

## Objective
Every Rhetoric device's `popularity` is computed from its mentions on English Wikipedia, Urban Dictionary and TV Tropes, so a device mentioned on all three outranks any device mentioned on two or fewer — advancing the Teaching North Star (the rhetoric tool) on a recorded, repeatable method.

## Decisions already made (Luke, 2026-10-03 — record in `app-decisions.md` at Step 1)
- **Coverage first.** Tier = number of sources in which the device has `hits > 0` (0–3). Within a tier, ties break on the mean of the three log-scaled 0–100 source `score`s. Stored value: `popularity = round((100 × tier + mean_score) / 4)`, 0–100 (tier 3 → 75–100, tier 2 → 50–75, tier 1 → 25–50, tier 0 → 0–25).
- **The old 15-source score is retired from scoring.** `seed/popularity.json` and `seed/popularity_pass.py` stay on disk as a record; nothing reads them for the score any more.
- **Hold until complete.** The score is applied only when all three ranking files exist, each with no `devices_pending`. Until then the database keeps its current popularity values.
- **Unchanged:** the database schema, the `popularity` column and every front-end file. Flipside devices still inherit their fallacy's popularity.

## Success criteria (measurable)
- `seed/combine_popularity.py` reads `seed/wikipedia_mentions.json`, `seed/urbandictionary_mentions.json` and `seed/tvtropes_mentions.json`, refuses (exit 1, names the problem, writes nothing) if any is missing, has a wrong `source`, lists `devices_pending`, or does not cover every non-Flipside device; otherwise writes `seed/popularity_combined.json` with one row for **all 272 devices** — the 58 Flipside rows carry their fallacy's `popularity` and `inherits` (because `update_popularity.py` refuses unless the file's device set equals the database's) — and per ordinary device each source's `hits` and `score`, `tier`, `popularity`, any `ambiguous` flag.
- Tests in `tests/` (fixture data only) prove: all-three beats two beats one even when the one-source score is higher; a device in no source scores 0 and the top device scores 100; each refusal case above; `update_popularity.py` reads the combined file, changes only `popularity`, and keeps Flipside inheritance. The whole suite passes.
- Charter baseline: source provenance is recorded (the three files carry `source`, `measure`, `generated_at`; the method is written into `seed/classification-criteria.md`); only counts are stored, no third-party text is copied into the app. *Charter note:* Urban Dictionary and TV Tropes are not "open-source" in the charter's sense; Luke chose them knowingly on 2026-10-03 and the decision row says so.
- README (Navigation, seed hand-off chain) and `seed/classification-criteria.md` (Popularity section) describe the new method; `app-decisions.md` carries the approval row.
- After the real apply: `SELECT COUNT(*) FROM devices` is still 272; every device in all three sources has popularity ≥ 75 and every device in at most two has < 75; a dated copy of `rhetoric.db` was taken first; the app's Popularity sort shows the new order in the browser.

## Resources
- **Memory to read:** none (all inputs are in `System/Apps/Rhetoric/seed/`).
- **Capability skills:** none.
- **Domain skills (Skillbank):** `!AppDevelopment` (Phase 4 "ordinary editing" + Refactor Health Check, G-1…G-4); `!DeviceMentions` (produces the three input files — run by Luke, one gated batch at a time, outside this plan's steps).
- **Sub-agents:** none (small, deterministic build; the Refactor Health Check is run inline).
- **Scripts:** `seed/combine_popularity.py` (new, deterministic) lives in the app's own `seed/`, not temp-skills, because it is part of the app's rebuild pipeline.
- **Temp-skills:** none.

## Steps
Phase A — build, no real data needed (can run now).
- [ ] Step 1 — Record the approval in `app-decisions.md` → Approvals: "Popularity = coverage-first combine of Wikipedia, Urban Dictionary and TV Tropes; 15-source score retired from scoring; applied only when all three are complete" with the charter note above (G-4). [inline]
- [ ] Step 2 — Commit the current state first (G-2). The folder already has Luke's uncommitted changes (README, `app-decisions.md`, `app/*`, `seed/devices.json`, `tests/test_render.mjs`, untracked `seed/confidence-scoring.md`); ask Luke before committing them, and stage only the files this plan touches in its own commit. [inline — **asks Luke**]
- [ ] Step 3 — Write `seed/combine_popularity.py` (pure function `combine(sources) -> rows` plus a `main()` that loads the three files, validates, writes `seed/popularity_combined.json`). Match the style of `seed/update_popularity.py`; comply with `vibe-coding-rules.md` (read it first). [inline]
  - [ ] Test in Sandbox — write `tests/test_combine_popularity.py` first (the cases in Success criteria) using fixture dicts, never the real files; run it red, then green. [inline]
- [ ] Step 4 — Change `seed/update_popularity.py` to read `popularity_combined.json` (its own transaction, its device-set check and Flipside inheritance unchanged); stop importing `OUT_PATH` from `popularity_pass.py`. Update `tests/test_update_popularity.py` to match. [inline]
  - [ ] Test in Sandbox — run `python3 -m unittest discover tests` (and the `.mjs` suites that already run) on fixture data. [inline]
- [ ] Step 5 — Rewrite the Popularity section of `seed/classification-criteria.md` (new method, formula, thresholds; mark the 15-source method superseded, keep its history in one line); update README's seed hand-off chain to `type_layers → load_devices → (three !DeviceMentions runs) → combine_popularity → update_popularity` and add the new files to Navigation. [inline]
  - [ ] !Checkpoint — none needed (nothing leaves the system; no Long-Term memory write).
- [x] Step 5b — Rewrite `app/about.html` (popularity section, new tables, sources) and update `tests/test_about.py` to cite the three sites; done 2026-10-03 at Luke's request. The page carries a one-paragraph "being switched" note that Step 10b removes. [inline]
- [ ] Step 6 — Refactor Health Check (7 questions, `!AppDevelopment` phase4) on the change so far; tell Luke any unmet question. [`!AppDevelopment`]

Phase B — apply (blocked until Luke has run `!DeviceMentions` for all three sources).
- [ ] Step 7 — **Wait for Luke:** run `!DeviceMentions` once per source until each `seed/<source>_mentions.json` shows an empty `devices_pending`. Tracked as this plan's project Next Action. [human input]
- [ ] Step 8 — Dry run: `python3 -m seed.combine_popularity` on the real files; show Luke the tier counts, the top 15 and bottom 15, and every device flagged `ambiguous`. No database write. [inline]
- [ ] Step 9 — Luke approves the dry-run result (G-4: this is the approval to apply). [**asks Luke**]
- [ ] Step 10 — Take a dated copy of `rhetoric.db` (`rhetoric.db.2026-MM-DD.bak`, same folder), then run `python3 -m seed.update_popularity`; confirm it reports the expected changed count. [inline]
- [ ] Step 10b — Delete the "These scores are being switched to this method…" paragraph from `app/about.html` now that the new scores are live; re-run `tests/test_about.py`. [inline]
- [ ] Step 11 — Open the app (`Start Rhetoric.command`, port 8794), sort by Popularity, and check the top, the bottom and one Flipside against `popularity_combined.json`. Report to Luke. [Browser pane]
- [ ] Verify — every line in **Success criteria** holds, and the result matches the **Objective**? [pass/fail]

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.

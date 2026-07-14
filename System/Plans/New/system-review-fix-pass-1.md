---
plan: "system-review-fix-pass-1"
context: Personal Research
secondary_contexts: [Coding, Church]
created: 2026-07-05
status: New
major_because: "multi-step; modifies CLAUDE.md, a core skill, Long-Term memory, and the user crontab (outside the tree)"
project: ""
skills_used: ["!CreatePlan", "!ReviewPlan"]
---

# Plan — System-Review Fix Pass (wave 1)

## Objective
Implement the four Improvements.md rows Luke marked 🤝 on 2026-07-05 from `System_Review_2026-07.md` — schedule `!Initiative`, fix doc-vs-disk drift, canonicalise `index.md` as store navigation, and demote `!GenerateWiki` to the Skillbank with a skills.log spec — so the documented system and the running system match (specialises the Personal Research North Star via the build bar: the build works and matches reality).

## Success criteria (measurable)
- `crontab -l` shows an initiative-sweep entry (`45 7 * * *`); `initiative-sweep.sh` invokes claude with `--model claude-haiku-4-5-20251001`; all four cron wrapper scripts append a timestamped heartbeat line to their `Logs/cron-*.log` on every firing.
- Zero references to `GrammarParser.md`, `/parse`, or `/email` remain in `System/Context/` or CLAUDE.md; `SermonSeriesPrep.md` + `CongregationalPrayer.md` appear only marked *(planned)*; CLAUDE.md's template table lists `Template_Contact.md`, `Template_TechSpec.md`, `Template_MLA_Reference.md`; church.md's promo scope says content is staged in `Outbox/` for Luke to post manually.
- The 4 plans in `Plans/Completed/` with `status: New` read `status: Completed`; System_guide.md line-175 path and CLAUDE.md's "~33 stores" are corrected; the two matching `issues.log` rows flip to Resolved.
- `Memory/Long-Term/` contains exactly one `_index.yaml` (LukeatronWiki's graph); every store's navigation lives in its populated `index.md`; CLAUDE.md + `memory-structure.md` name `index.md` as the store navigation surface; no skill or doc still instructs reading a store `_index.yaml` (grep-verified, LukeatronWiki excepted).
- `!GenerateWiki` lives at `System/Skillbank/GeneralPurposeSkills/!GenerateWiki/skill.md`, has a catalog row in `Skillbank/_index.yaml`, is gone from `.claude/skills/`, and CLAUDE.md's tables reflect the move.
- A one-page logging spec exists in `Memory/Long-Term/Logs/` defining the canonical skills.log line format (applied going forward, no retro-rewrite) and is referenced from that store's `index.md`.
- **Guardrails held:** every CLAUDE.md / core-skill / Long-Term / crontab change passes `!Checkpoint` (Luke's 🤝 rows are the standing sign-off; anything beyond their scope is held).

## Resources
- **Memory to read:** `Memory/Long-Term/Lukeatron/memory-structure.md`, `Memory/Long-Term/Logs/` (issues.log, skills.log formats), the populated non-wiki `_index.yaml` files (10 as of 2026-07-06, re-verify at execution time)
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** none — all edits are small, known, and enumerated by the review report
- **Scripts:** none (one-off edits; the only bulk operation — deleting empty yamls — is a single verified shell command, not a reusable procedure)
- **Temp-skills:** none

## Steps
- [ ] Step 1 — Cron: add `45 7 * * *` initiative-sweep line to the user crontab; add `--model claude-haiku-4-5-20251001` to `initiative-sweep.sh`; add one timestamped heartbeat line (START/END append to `Logs/cron-<name>.log`) to `project-sweep.sh`, `review-monday.sh`, `review-friday.sh` where absent [inline]
  - [ ] Test — `zsh -n` syntax check on all four wrapper scripts + one dry heartbeat append to a scratch log; immediately after installing, `crontab -l | grep -i initiative` to confirm the line landed correctly; full cron firing can't be sandboxed (live schedule), so next-morning log check is noted under Verify [inline]
  - [ ] !Checkpoint — crontab is outside `_Lukeatron/` (High impact; pre-agreed via 🤝 row 1)
- [ ] Step 2 — Context readmes: church.md (mark `SermonSeriesPrep.md`/`CongregationalPrayer.md` *(planned)*, `/sermonprep` → prose, descope social promo to Outbox/-staged-for-Luke), teaching.md (delete `GrammarParser.md` + `/parse` refs), personal-productivity.md (`/email` → `!AgentMail`) [inline]
- [ ] Step 3 — CLAUDE.md: template table (drop `GrammarParser.md`, mark `CongregationalPrayer.md` *(planned)*, add the 3 unlisted templates), "~33" → 34 [inline]
  - [ ] !Checkpoint — CLAUDE.md edit (High impact; pre-agreed via 🤝 row 2)
- [ ] Step 4 — Small fixes: flip `status: New` → `Completed` in the 4 Completed/ plans; fix System_guide.md line-175 path; mark the church.md-drift and social-portal rows Resolved in `issues.log` [inline]
- [ ] Step 5 — Index doctrine: identify "empty" via file size 0 bytes (`find Memory/Long-Term -name "_index.yaml" -size 0`); anything with any byte content is "populated" and goes through the diff-and-migrate path instead. Live count as of 2026-07-06 (re-verify at execution time, don't trust this number blind): 23 empty, 11 non-empty (10 populated non-wiki + `LukeatronWiki/_index.yaml`). Diff each populated non-wiki `_index.yaml` against its `index.md` and migrate any content not already represented; then delete the empty yamls + the migrated ones (retain `LukeatronWiki/_index.yaml`) [inline]
- [ ] Step 6 — Index doctrine wiring: update CLAUDE.md (Memory sections) + `memory-structure.md` to name `index.md` as the navigation surface; grep `.claude/skills/`, `System/`, `Memory/Long-Term/Lukeatron/` for store-`_index.yaml` read instructions and update each (LukeatronWiki excepted) [inline]
  - [ ] !Checkpoint — Long-Term deletions + CLAUDE.md/memory-structure.md edits (pre-agreed via 🤝 row 3). Per CLAUDE.md Memory Governance, a row-level 🤝 is not itself the Long-Term deletion gate — `!Checkpoint` routes these ~34 file deletions through `!ArchiveMemory` proper (double-check + review of the actual file list against the live find output, not the plan's stale counts) before any `rm` runs
- [ ] Step 7 — Demote `!GenerateWiki`: move `.claude/skills/!GenerateWiki/` → `System/Skillbank/GeneralPurposeSkills/!GenerateWiki/` (SKILL.md → skill.md), add catalog row to `Skillbank/_index.yaml`, move its row between CLAUDE.md's skill tables, adjust personal-research.md's capability table note [inline]
  - [ ] !Checkpoint — core-skill move + CLAUDE.md edit (pre-agreed via 🤝 row 4)
- [ ] Step 8 — Write `Memory/Long-Term/Logs/logging-spec.md` (canonical skills.log line format: `[<ISO timestamp>] [AGENT|WORKER: !<SkillName>] [SUCCESS|FAIL] <one-line outcome> | tokens≈<N>`; what counts as a skill entry; applied going forward only) and reference it from the Logs store `index.md` [inline]
- [ ] Step 9 — Update Improvements.md col 4: link this plan from the four 🤝 rows [inline]
- [ ] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass/fail] (cron heartbeats confirmed live at the next scheduled firing — 07:45 tomorrow)

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [ ] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.

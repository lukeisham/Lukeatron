---
type: report
title: "Lukeatron System Review — July 2026"
description: "Read-only audit of the whole Lukeatron system against its Guiding Purpose: skills usage, plans/projects throughput, scheduled automation, viewers, and doc-vs-disk drift, with ranked findings and proposed fixes."
created: 2026-07-05
plan: lukeatron-system-review
---

# Lukeatron System Review — July 2026

**Date:** 2026-07-05 · **Method:** four read-only sub-agent sweeps (skill inventory · plans/projects throughput · scheduled-runs/viewers · doc-vs-disk drift) + inline purpose-alignment synthesis. **Nothing was changed during the audit** except this report, `Improvements.md` proposal rows, and close-out logging.

## Executive summary

The system is **structurally sound and not silently failing**. Cron scheduling is real and hitting its slots (`!Review` Mon/Fri, `!ProjectSweep` Mon, `!Intake` 4× daily), both viewers serve HTTP 200 with SessionStart keep-alive hooks wired, checkpoint gates fire and are logged, and data integrity across plans/projects/tracking is 100% (no orphans, no phantom references, every project has registry.md + notes.md).

The real problems are three: **(1) `!Initiative` was never added to crontab** — the one genuinely dormant piece of automation; **(2) doc-vs-disk drift** — context readmes and CLAUDE.md name four templates and three slash-commands that don't exist; **(3) the Teaching context is effectively unbuilt** — all five TE projects are ⚪ undefined and its named tooling is missing. Ten of 23 skills have never fired.

---

## Findings — HIGH

### H1. `!Initiative` is not scheduled — daily automation is dormant
- **Evidence:** `System/Tools/cron/initiative-sweep.sh` exists (1.6K, 2026-06-28) but crontab has no entry for it; the other four cron entries (project-sweep, review-monday, review-friday, intake-sweep) are present and firing. All 3 logged `!Initiative` runs (06-29, 06-30, 07-04) were manual/session-triggered.
- **Impact:** The MinorTasks queue engine — CLAUDE.md says "Daily" — only runs when someone remembers. Low-impact rows won't auto-action; digests won't send.
- **Proposed fix:** Add the cron entry the script itself proposes: `45 7 * * * /bin/zsh ".../System/Tools/cron/initiative-sweep.sh"` (07:45 AEST, after ProjectSweep, before Review).

### H2. Context readmes name templates and skills that don't exist
- **Evidence:**
  - `church.md` (lines 33–35, 73, 80): `SermonSeriesPrep.md`, `SermonPassagePrep.md`, `CongregationalPrayer.md`, `/sermonprep` — none exist. The real template is `Template_SermonPrep.md`; no sermon skill is registered anywhere. (Seeded from `issues.log` 2026-07-05; confirmed.)
  - `teaching.md` (lines 27, 48, 67, 72): `GrammarParser.md` template + `/parse` skill — neither exists. `TE-01-grammar-parsing-app/registry.md` also cites both as "related existing assets."
  - `personal-productivity.md` (lines 33, 76): `/email` — doesn't exist; the real capability is `!AgentMail`.
  - CLAUDE.md's template table (Key Skills section) lists `CongregationalPrayer.md` and `GrammarParser.md` — both missing from `System/Templates/` — and omits three templates that DO exist (`Template_Contact.md`, `Template_TechSpec.md`, `Template_MLA_Reference.md`).
- **Impact:** Any task that follows a context readme to its named tooling hits a dead end; on-disk convention (`Template_<Name>.md`) and doc naming disagree.
- **Proposed fix:** One pass over the three context readmes + CLAUDE.md template table: rename references to real assets (`Template_SermonPrep.md`, `!AgentMail`), delete or explicitly mark-as-planned the four missing templates and three missing commands, add the three omitted templates. Alternatively create the missing assets where genuinely wanted (see H3 for teaching).

### H3. Teaching context is unbuilt
- **Evidence:** All 5 TE projects (TE-01..TE-05) are ⚪ undefined in `_tracking.yaml` with no defined items or wake dates; the context's core tool references (H2) are missing; no plan in New/ or Completed/ has advanced a Teaching deliverable.
- **Impact:** One of the four Guiding-Purpose contexts has no working machinery — the largest purpose-alignment gap found.
- **Proposed fix:** A shaping decision from Luke: flesh out one TE project (likely TE-01 grammar parser, whose template/skill would also resolve part of H2), consolidate the five into one "Teaching Apps" umbrella, or consciously park them.

---

## Findings — MEDIUM

### M1. 10 of 23 skills have never fired
- **Evidence (skills.log, 441 lines):** never fired — core: `!Calendar`, `!GenerateWiki`, `!MinorTask`; Skillbank: `!BookCover`, `!TechSpec` (both created 2026-07-05, too new to judge), `!Dashboard` (2026-06-22), `!ThinPortal` (pattern skill, not meant to fire). Heaviest users: `!HeadlessChromeBrowser` 299, `!CreatePlan` 25, `!ReviewPlan` 22.
- **Caveat:** `!MinorTask` shows zero log entries yet queue.md rows exist — it may be firing without logging (a logging-compliance gap, see M2), or rows are being written by `!Intake`/`!Initiative` directly.
- **Proposed fix:** Review each dormant skill: `!Calendar` and `!GenerateWiki` likely need trigger exposure (or retirement); `!Dashboard` may be superseded by the dashboard tool itself; confirm whether `!MinorTask` logs on invocation.

### M2. skills.log format drift — 6 variants + non-skill entries
- **Evidence:** markdown-table rows (lines 19, 152), date-prefix-no-brackets (line 43), timestamp-less WORKER lines (98, 291), pipe-delimited ISO lines (185), token counts as `N/A` vs bare vs `[bracketed]`; 9 entries under non-skill agent names (`schedule`, `People`, `drain-todos`, `pharmacy-list-email`, `Lukeatron`…).
- **Impact:** The log can't be reliably machine-audited — this very review needed fuzzy matching; usage counts are approximate.
- **Proposed fix:** Write a one-page logging spec into `Logs/_index.yaml` or `index.md` (canonical line format, what counts as a skill entry), and have skills conform going forward. No retro-rewrite needed (append-only doctrine).

### M3. Empty `_index.yaml` in 24 of 34 Long-Term stores — index doctrine drift
- **Evidence:** 24 stores have 0-byte `_index.yaml` (Bible, Theology, Grammar, …); all 34 stores have a **populated `index.md`** (added by the OKF retrofit, 2026-07-05). CLAUDE.md still says stores are read via "that store's own `_index.yaml` if present."
- **Impact:** An agent following CLAUDE.md doctrine opens an empty yaml and may conclude the store is empty; the real navigation now lives in `index.md`.
- **Proposed fix:** Pick one: (a) update CLAUDE.md/memory-structure.md to name `index.md` as the store navigation surface and delete/retire the empty yamls, or (b) populate the yamls. Option (a) matches where the system has actually moved.

### M4. 4 plans in Completed/ still carry `status: New`
- **Evidence:** `agentmail-feature-request.md`, `lukeatron-interactions-xyz-model.md`, `thematic-and-page-refactor.md`, `wiki-link-longterm-stores.md` — all in `System/Plans/Completed/` with frontmatter `status: New`. All other counts reconcile (22 plans total, 2 legitimately in New/).
- **Impact:** Location and metadata contradict; the completed-plans.log convention (added 2026-07-05) depends on the close-out step flipping status.
- **Proposed fix:** Flip the four frontmatter fields to `Completed` (5-minute Low-impact fix; the new close-out logging should prevent recurrence).

### M5. Cron execution leaves no log trail
- **Evidence:** No `cron-*.log` files exist in `Logs/`; scheduled-slot evidence had to be inferred from skills.log entries. Whether a given run was cron-fired or manual is currently indistinguishable.
- **Impact:** A cron silently dying (e.g., after an OS update revokes permissions) would be invisible until someone noticed missing digests.
- **Proposed fix:** Have each cron wrapper script append one timestamped line to a `Logs/cron.log` on every firing (even on skill failure) — the cheapest possible heartbeat.

### M6. No send-capable portal for social media (known, still open)
- **Evidence:** `issues.log` 2026-07-01 (open): Church context lists Instagram/Facebook/YouTube promo as in-scope but only `!AgentMail` and `!HeadlessChromeBrowser` exist as send portals.
- **Proposed fix:** Either descope social posting in church.md (stage content in Outbox/ for Luke to post — the current de-facto behaviour) or plan a portal. Recommend descoping the doc to match reality.

---

## Findings — LOW

- **L1. System_guide.md line 175** says skills graduate to `System/.claude/skills/` — correct path is `.claude/skills/`. One-word fix.
- **L2. CLAUDE.md says "~33 stores"** — there are 34. Cosmetic.
- **L3. LukeatronWiki graph hygiene** (already open in issues.log): 2 dead `[[theology-aphorisms]]` links in meta-about.md, 34 one-way `related:` edges, landing page absent from `_index.yaml`. Fix via `!IdeaWiki` in one tending pass.
- **L4. 8 of 29 projects ⚪ undefined** (PP-06, PP-14, TE-01..05, PR-06) — valid as shaping-phase per doctrine, but 28% of the board is unshaped; overlaps H3.
- **L5. completed-minor-tasks.log gap** (already open in issues.log): manual/dashboard completions bypass the log.
- **L6. PP-02 (USA taxes, late filing) is the sole 🔴 urgent project** — not a system defect, but the board's one red flag; surfaced here so the report can't be read as "all clear."

## Verified healthy (no action)

- Cron infrastructure live: `!ProjectSweep` hit Mon 06-29 07:30; `!Review` hit Mon 06-29 and Fri 07-03 17:00; `!Intake` hit 07-05 08:00. No missed slots detected.
- Both viewers serving (8787 wiki, 8788 dashboard, HTTP 200, multi-day uptime) with SessionStart hooks in `.claude/settings.json`; PostToolUse AgentMail intake hook present.
- Checkpoint gates (`!Checkpoint`, `!OutgoingContentCheck`) firing and logged, tier-aware, no bypass evidence; system fails closed.
- Skill catalog integrity 100%: all 16 core + 7 Skillbank skills exist at documented paths; no invisible skills.
- Plans/projects data integrity 100%: 29/29 projects tracked with folders + registry.md + notes.md; no orphans; MinorTasks queue rows fully-fielded, nothing stale. Plans throughput 73% completed (16/22).
- All 10 logged skill failures are `!HeadlessChromeBrowser` infrastructure issues (Cloudflare/CAPTCHA/startup), with graceful fallbacks — no logic failures.

## Purpose alignment (Step 5)

Against the Guiding Purpose — stewarding Luke's time across four contexts:

- **Personal Productivity — working.** Projects, email intake, queue, dashboard all live. Gap: `!Calendar` has never fired despite calendar admin being named in the charter — either the trigger surface is wrong or the need hasn't arisen; worth one deliberate test.
- **Church — working, docs lag reality.** Heaviest project load (10 CH projects), sermon-prep flow just strengthened (Sources.md). Gaps: H2 naming drift, M6 social portal, and the one 🟠 minor-queue hot item (Keith Foster's bouncing email, touching 4 CH projects).
- **Teaching — not yet real.** See H3. This is the context where docs promise most and disk delivers least.
- **Personal Research — working.** The wiki loop (`!IdeaWiki`, viewer, stores) is the system's most-developed organ; this review itself is the context's "verify the build" bar in action. Gap: `!GenerateWiki` — the charter's "output in both Markdown and wiki formats" — has never fired.

**Overall:** the system serves 3 of 4 contexts genuinely; the biggest single unattended-automation risk (H1) is a one-line cron fix.

## Proposed next steps

Findings return to `Improvements.md` as 💬 discussion rows (per the read-only guardrail — nothing here auto-spawns work): (1) schedule `!Initiative` + cron heartbeat log [H1+M5]; (2) doc-vs-disk drift fix pass [H2+M4+L1+L2+M6]; (3) index doctrine — `index.md` vs empty `_index.yaml` [M3]; (4) dormant-skill review + logging spec [M1+M2]; (5) Teaching context shaping decision [H3+L4]; wiki hygiene (L3) and minor-task log gap (L5) stay tracked in issues.log.

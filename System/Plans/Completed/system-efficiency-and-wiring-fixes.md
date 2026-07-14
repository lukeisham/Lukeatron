---
plan: "system-efficiency-and-wiring-fixes"
context: Personal Research
secondary_contexts: [Personal Productivity]
created: 2026-07-02
status: Completed
completed: 2026-07-02
major_because: "multi-step + High Impact — modifies CLAUDE.md, memory.md, and protected core skills (!DetermineContext, !Intake, !CreatePlan, !Review); reshapes the always-loaded boot layer"
project: ""
skills_used: ["!DetermineContext", "!CreatePlan", "!ReviewPlan", "!PruneMemory"]
outcome: "All 17 steps done. CLAUDE.md 39402→27157 bytes (31.1% reduction, target ≥30% met). All stale pointers repaired (phantom root indexes, wrong template names, System/.claude path). Doctrine single-sourced (wiki→memory-structure.md, email→Interactions+Tone, colours→SKILL.md). memory-structure.md created. Orphan Merrell plan archived. 3 issues.log rows resolved, 1 new logged (social-media portal gap remains open, pre-existing). Deviation from plan: !AgentMail SKILL.md is deliberately a thin portal and does NOT hold email doctrine — authoritative home is the Interactions section + Tone/, so pointers target there (honours D3 single-source intent)."
---

# Plan — Fix stale boot wiring and de-duplicate the always-loaded layer

## Objective
Make Lukeatron's boot layer truthful and lean: repair every stale pointer so the failure ladder never trips on the system's own wiring, and single-source the doctrine that is currently repeated across CLAUDE.md, memory.md, skills, and templates — cutting the fixed per-session context cost without weakening any safety gate or the four-context routing.

## Success criteria (measurable)
- **Zero** references to the phantom root indexes `Memory/Long-Term/_index.yaml` and `Memory/Medium-Term/_index.yaml` remain in `.Claude/` (verified by grep returning nothing).
- **Zero** references to the wrong template names `PlanTemplate.md` / `ProjectRegistryTemplate.md` remain (real names `Template_Plan.md` / `Template_ProjectRegistry.md` used everywhere).
- **Zero** references to the non-existent path `System/.claude/skills/` remain in CLAUDE.md; core skills are correctly cited at `.Claude/skills/`.
- CLAUDE.md is reduced by **≥ 30 %** (from ~39 KB) with **no capability, gate, or routing rule dropped** — only relocated to its single authoritative home and pointed to.
- Each of the **three named doctrines** appears in full in **exactly one** file, with every other mention a one-line pointer (verifiable per doctrine): (a) LukeatronWiki doctrine — full form only in `!IdeaWiki` SKILL.md + `memory-structure.md`; (b) email authorship rules — full form only in `!AgentMail` SKILL.md + `Tone/`; (c) `!ProjectSweep` colour semantics — full form only in its SKILL.md.
- The orphaned plan `System/Plans/New/merrell-sale-tracker.md` (PP-09 abandoned) is cleared via `!PruneMemory`.
- `skills.log` uses **one** timestamp format going forward (documented convention).
- All four `System/Context/*.md` readmes still load; a fresh dry-run of `!DetermineContext` on a sample prompt still selects the right context and reads only what it needs.

## Resources
- **Memory to read:** `.Claude/CLAUDE.md`, `.Claude/memory.md`, `Memory/Long-Term/Lukeatron/` (relocation target for moved exposition), `Memory/Long-Term/Logs/issues.log` (fold in pre-logged drift items), `System/Skillbank/_index.yaml`
- **Capability skills:** none (local file work only — no Outbox, no external party)
- **Domain skills (Skillbank):** `!PruneMemory` (clear the orphan plan)
- **Sub-agents:** none — deterministic edits; one agent pass with per-file checkpoints
- **Scripts:** a read-only `grep` verification pass (Phase 6) — no mutating script needed
- **Temp-skills:** none

## Design decisions (for !ReviewPlan and Luke to confirm)

**D1 — Protected files: this plan, once approved, is the explicit permission.** CLAUDE.md and the core skills `!DetermineContext`, `!Intake`, `!CreatePlan`, `!Review` are on the "never modify without explicit permission" list. Luke's approval of this reviewed plan constitutes that permission; each protected-file edit still passes an inline confirm step (Phase gates) before it is written. No protected file is touched before Luke approves the plan.

**D2 — Do NOT rename the `.Claude` folder.** The on-disk folder is `.Claude` (capital C); the harness auto-loads from it and `settings.json` references it. Renaming risks breaking harness auto-load and the SessionStart hooks for a purely cosmetic gain (macOS is case-insensitive). Instead: normalise *textual references* to match the real folder — `.Claude/skills/`, not `System/.claude/skills/`. Closes the `Medium/Open` casing-drift row already in `issues.log` (2026-06-26) at the reference level, not the filesystem level.

**D3 — Single-source, don't delete.** No rule is removed — each is moved to its one authoritative home and pointed to:
  - **LukeatronWiki / Memory-Structure exposition** → its full form lives in `!IdeaWiki`'s SKILL.md + a new `Memory/Long-Term/Lukeatron/memory-structure.md`; CLAUDE.md keeps a short pointer paragraph.
  - **Email authorship doctrine** → authoritative in `!AgentMail`'s SKILL.md + `Tone/Lukeatron_Agent_Email_Tone.md`; memory.md and the Interactions section reduce to pointers.
  - **`!ProjectSweep` colour semantics** → authoritative in its SKILL.md; the CLAUDE.md table row shrinks to one line.

**D4 — Key Skills table → one line per skill.** The harness already injects each core skill's description every session, and each SKILL.md is authoritative on invocation. The CLAUDE.md table therefore needs only: name · one-line purpose · data-store ownership (where it matters). Full specs stay in the SKILL.md bodies. This is the single largest token saving.

**D5 — System Guide sync becomes a check, not a mandate.** Replace the "update `System_guide.md` in the same pass" rule (which doubles every edit's cost and drifts anyway) with a one-line drift-check folded into `!Review`'s twice-weekly run: "does the guide still match CLAUDE.md's loop/skills/memory model? If not, flag it." CLAUDE.md stays the source of truth.

**D6 — `!DetermineContext` fast path.** Add an explicit fast-path clause: for a bare capability-portal read (`!Calendar` list, `!AgentMail` read, `!WhatsApp` read) the skill may name the context and skip loading the 4–7 KB readme; the readme loads only when the task generates content or routes arriving material. Reduces cost on the highest-frequency trivial prompts. (Optional — flag for Luke; safe to drop if he prefers the readme always load.)

## Steps
Ordered by risk: mechanical truth-repairs first (low risk), then the restructure (needs Luke's eye), then cleanup and verify.

### Phase 1 — Stale-pointer repairs (mechanical, correctness)
- [ ] Step 1 — Fix `.Claude/memory.md` boot set: replace the two phantom root-index lines (`Long-Term/_index.yaml`, `Medium-Term/_index.yaml`) with the truth — "stores load on demand; each store carries its own `_index.yaml`, read when a task touches it." [edits: memory.md]
  - [ ] !Checkpoint — native-memory edit; confirm wording with Luke before write.
- [ ] Step 2 — Fix `!DetermineContext/skill.md`: drop the two phantom root-index dependencies (lines 11–12) and reword STEP 4's "per Long-Term/_index.yaml" to "per each store's own `_index.yaml`, on demand." [edits: protected core skill — D1 gate]
- [ ] Step 3 — Fix `!Intake/skill.md` line 27 and `!CreatePlan/skill.md` lines 11 & 56: same phantom-root-index correction. [edits: protected core skills — D1 gate]
- [ ] Step 4 — Fix wrong template names: `!CreatePlan/skill.md` (lines 7, 8, 23, 83) and `!Review/skill.md` (lines 10, 70, 74) → `Template_Plan.md` / `Template_ProjectRegistry.md`. [edits: protected core skills — D1 gate]
- [ ] Step 5 — Fix CLAUDE.md lines 15 & 196: `System/.claude/skills/` → `.Claude/skills/`. [edits: CLAUDE.md — High Impact — D1 gate]
  - [ ] !Checkpoint — protected-file batch (Steps 2–5): show Luke the full diff before writing.

### Phase 2 — De-duplicate the always-loaded layer (the main saving)
- [ ] Step 6 — Rewrite CLAUDE.md **Key Skills** table to one line per skill (name · purpose · data-store ownership); move full specs' reliance onto the SKILL.md bodies (which already carry them). [edits: CLAUDE.md — D4]
- [ ] Step 7 — Create `Memory/Long-Term/Lukeatron/memory-structure.md` holding the full Long-Term/Medium-Term store exposition + LukeatronWiki doctrine; register it in `Memory/Long-Term/Lukeatron/_index.yaml`. Replace CLAUDE.md's Memory-Structure + LukeatronWiki blocks with a short pointer paragraph that **retains enough to know WHEN to load the detail** (names the two stores + the wiki, and the on-demand rule) — so routing never needs the full text at boot. [creates: memory-structure.md; edits: CLAUDE.md, Lukeatron/_index.yaml]
- [ ] Step 8 — Trim the Skillbank `_index.yaml` `!IdeaWiki` intent to one line + triggers, per the index header's own "one-line entry" convention (full doctrine stays in the skill body). [edits: Skillbank/_index.yaml]
  - [ ] !Checkpoint — protected-file batch (Steps 6–8): Luke reviews the restructured CLAUDE.md diff.

### Phase 3 — Single-source the email doctrine
- [ ] Step 9 — Confirm `!AgentMail/SKILL.md` + `Tone/Lukeatron_Agent_Email_Tone.md` carry the complete authorship rule (agent-authored, disclosed, Luke's-voice exception, never auto-send drafts); add anything missing there. [reads/edits: !AgentMail, Tone/]
- [ ] Step 10 — Reduce the triplicate email rules in `memory.md` and CLAUDE.md's Interactions section to one-line pointers at the authoritative source. [edits: memory.md, CLAUDE.md — D3]

### Phase 4 — Smaller improvements
- [ ] Step 11 — Replace CLAUDE.md's "keep System Guide in sync in the same pass" mandate with the D5 drift-check line, and add that one-line check to `!Review/skill.md`. [edits: CLAUDE.md, !Review — D1/D5 gate]
- [ ] Step 12 — Add the D6 fast-path clause to `!DetermineContext/skill.md` (skip readme load for bare capability-portal reads). [edits: protected core skill — D1/D6 gate]
- [ ] Step 13 — Document one canonical `skills.log` timestamp format at the top of `skills.log` (or its `_index.yaml`); no back-rewrite of existing rows. [edits: Logs/]

### Phase 5 — Cleanup
- [ ] Step 14 — Run `!PruneMemory` to clear the orphaned `System/Plans/New/merrell-sale-tracker.md` (PP-09 abandoned per Skillbank `_index.yaml`), routing any keeper through `!ArchiveMemory`. [runs: !PruneMemory]
- [ ] Step 15 — Close the folded-in `issues.log` rows: mark the 2026-06-26 casing-drift and 2026-06-24 Skillbank-layout-drift rows `Resolved` (or note residual scope). [edits: Logs/issues.log]

### Phase 6 — Verify
- [ ] Step 16 — Verification grep pass (read-only): confirm zero phantom root-index refs, zero wrong-template-name refs, zero `System/.claude/skills/` refs across `.Claude/`; confirm CLAUDE.md byte count is ≥ 30 % smaller. [runs: grep + wc]
- [ ] Step 17 — Dry-run `!DetermineContext --dry` on a sample prompt from each of the four contexts; confirm each still selects correctly and the fast path behaves. [runs: !DetermineContext --dry]
- [ ] Verify — every line in **Success criteria** met, and the result matches the **Objective**? No rule lost, only relocated. [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter, then move the file from `System/Plans/New/` to `System/Plans/Completed/`.

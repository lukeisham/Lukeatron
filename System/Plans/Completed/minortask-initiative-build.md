---
plan: "minortask-initiative-build"
context: Personal Research
secondary_contexts: [Personal Productivity]
created: 2026-06-27
status: Completed
major_because: "multi-step + creates two new Medium-Term memory stores + adds two protected skills (!MinorTask, !Initiative) + modifies protected skills (!Intake + the Lukeatron Interactions doctrine, Luke-authorised) + sets up an unattended scheduled task"
project: ""
skills_used: []
---

# Plan — Minor-Task Queue, !Initiative engine, and smarter !Intake routing

## Objective
Give Lukeatron a tracked **Minor Tasks Queue** with a skill that fills it (`!MinorTask`), a scheduled engine that works that queue (`!Initiative`), and a sharper `!Intake` that routes each arrival to existing-project / new-project / minor-task / "ask Luke", so nothing small is lost and nothing ambiguous goes silent. It also adds a lightweight **temp-contacts list** (`Memory/Medium-Term/Contacts/`) for people who matter to a task or project but not enough for Long-Term `People/`.

## Success criteria (measurable)
- A new store `Memory/Medium-Term/MinorTasks/queue.md` exists, with a documented column schema and an empty (header-only) table.
- `.claude/skills/!MinorTask/skill.md` exists: identifies a minor task, computes its **Impact** (High/Low per the rules below), and appends a row to the queue; also lists/surfaces the queue on demand. Dry-run on 3 sample items routes correctly.
- `.claude/skills/!Initiative/skill.md` exists: reads `MinorTasks/queue.md`; **auto-actions Low-impact rows unattended**; **proposes** an implementation/plan for High-impact rows (never executes them); writes results back to the queue; emails Luke a digest. `--dry` run produces a correct would-do report mutating nothing. Scope is the queue only — it never walks `Projects/`.
- `!Intake`'s ① PROJECT axis carries explicit existing-vs-new criteria, hands minor/one-off items to `!MinorTask`, and converts **ambiguous** items into a `🟠 your move / High` minor task ("Ask Luke what to do with: …") + archives the original with a back-pointer + advances the processed-marker (no duplicate on the next sweep). Fail-closed fallback (leave in `Inbox/`) preserved only if `!MinorTask` is unavailable.
- A scheduled `initiative-sweep` task runs `!Initiative` unattended on a cron, fails closed on anything outgoing/High-impact, and emails the digest.
- A new store `Memory/Medium-Term/Contacts/contacts.md` exists (documented schema + empty table). `!Intake` and `!MinorTask` add a row when a task/project references a person whose contact details don't warrant a full `People/` record. **Safety:** a recipient resolved *only* from `Contacts/` is treated as **non-listed** — `!OutgoingContentCheck` always fires the default four-way approval; never auto-send. Promotion to `People/` is suggested-only and gated by `!Checkpoint`.
- CLAUDE.md doctrine updated (Key Skills table, Inbox Disposition, Workflow at a Glance, Memory Structure, Folder Reference) to describe all of the above.
- Every new/changed skill logs one line to `Memory/Long-Term/Logs/skills.log`.

## Resources
- **Memory to read:** `Memory/Medium-Term/Projects/_tracking.yaml`, `…/Projects/<ID>/registry.md`, `Memory/Long-Term/People/` (check before minting a temp contact), `System/Templates/Template_ProjectRegistry.md`, `System/Templates/Template_Person.md`, `System/Templates/Template_skill.md`, `System/Templates/Template_Plan.md`
- **Capability skills:** `!AgentMail` (Initiative digest email)
- **Domain skills (Skillbank):** none
- **Sub-agents:** none
- **Scripts:** `System/Tools/cron/initiative-sweep.sh` (new — mirrors `intake-sweep.sh`)
- **Temp-skills:** none (these graduate straight to `.claude/skills/`)

## Design decisions (confirmed with Luke 2026-06-27)
- **Names:** minor-task skill = `!MinorTask`; engine = `!Initiative`.
- **!Initiative ⟷ !ProjectSweep = coexist, split by data store (confirmed 2026-06-27).** `!ProjectSweep` owns `Projects/` — it already both triages the colour board AND advances/executes project actions (its STEP 3 does exactly the agent-do-now / draft-plan / hold-outgoing work, with the same apply-safe boundary). It stays **completely unmodified**. `!Initiative` owns the new `MinorTasks/queue.md` — the store ProjectSweep never touches — and is the sibling engine over it. Initiative does **not** walk projects, **not** re-triage colours, **not** edit `!ProjectSweep`. Because the two operate on disjoint stores they cannot collide and need no run-order coupling. (This supersedes the earlier "triage vs execute" framing, which failed because ProjectSweep already executes.)
- **Auto-action = scheduled + unattended.** Unattended, Initiative auto-completes **Low-impact only**; everything High-impact or needing a checkpoint is held and surfaced.

### Impact rule (the gate `!MinorTask` computes and `!Initiative` obeys)
- **High** — the task changes a **core skill/checkpoint**, OR **modifies `CLAUDE.md`**, OR touches **files outside the `_Lukeatron/` tree**, OR generates **content to be sent/published outside Lukeatron**. Held for Luke; never auto-actioned.
- **Low** — the task only generates **content, skills, or actions that stay inside Lukeatron** (Sandbox drafts, a new Skillbank skill, an internal memory note/doc). Auto-actionable unattended.

The Impact axis is **documented once as shared vocabulary** (in CLAUDE.md). It is the same gate as `!ProjectSweep`'s existing apply-safe boundary, generalised (Low ≈ Medium-Term apply-safe; High adds core-skill / CLAUDE.md / outside-the-tree / outgoing). `!MinorTask` computes it; `!Initiative` obeys it on the queue; ProjectSweep keeps enforcing its equivalent on projects.

### Queue schema (`Memory/Medium-Term/MinorTasks/queue.md`)
Markdown table, single system-of-record (apply-safe, Medium-Term, pruned via `!PruneMemory`). Ranked by **State** (same precedence as projects: 🔴→🟠→🔵→🟢→⚪); the two added axes are **Source** and **Impact**.

`| # | Task | Source | Impact | Status | State | Wake/Due | Notes |`
- **Source** — where it came from: `Intake:AgentMail` · `Intake:Inbox` · `Intake:WhatsApp` · `Intake:ambiguous` · `Luke` · `ProjectSweep` · `Initiative`.
- **Impact** — `High` | `Low` (rule above).
- **Status** — ☐ Open · ◐ Doing · ☑ Done (reuse project vocabulary).
- **State** — 🔴 urgent · 🟠 your move · 🔵 waiting · 🟢 on track · ⚪ undefined (reuse colour board + precedence).

### Temp contacts (`Memory/Medium-Term/Contacts/contacts.md`)
A lightweight directory for people relevant to a minor task or project but **not significant enough for Long-Term `People/`**. Single markdown table, apply-safe, pruned via `!PruneMemory` when the linked task/project closes (unless promoted first).

`| ID | Name | Role / context | Email / phone | Linked to | Source | Notes |`
- **ID** — `TC-NN`. **Linked to** — the project id (`PR-07`) or queue row (`#3`) they belong to.
- **Trust (confirmed 2026-06-27):** carries **no** `interaction_tier`. By rule a `Contacts/`-only recipient is **non-listed** → default four-way `!OutgoingContentCheck`, **never** auto-send. The trust model stays anchored in Long-Term `People/`; this store holds *identity / contact details only, never trust*.
- **Resolution order for an outgoing recipient:** `People/` first (authoritative for tier) → else `Contacts/` for details, treated as non-listed → else unknown (also non-listed). `Contacts/` only saves the agent re-asking for an address; it never relaxes the gate.
- **Promotion:** when a temp contact becomes significant, `!ProjectSweep` / `!Initiative` may *suggest* promoting them to a full `People/` record — a Long-Term write, so it routes through `!Checkpoint`. Never automatic.

## Steps
Bite-sized and ordered. Each box is one action.

- [ ] Step 1 — Create the store `Memory/Medium-Term/MinorTasks/queue.md`: a header comment block documenting the column schema + the High/Low Impact rule, then the empty table (header row only). [makes: new Medium-Term store]
- [ ] Step 1b — Create the store `Memory/Medium-Term/Contacts/contacts.md`: a header comment documenting the schema + the **non-listed safety rule** (a `Contacts/`-only recipient is always non-listed), then the empty table (header row only). [makes: new Medium-Term store]
- [ ] Step 2 — Write `.claude/skills/!MinorTask/skill.md` from `Template_skill.md`: TRIGGER (invoked by `!Intake`; on-demand "log a minor task / add a chore / show the minor queue"); LOGIC (identify a minor task → compute Impact → assign Status/State → append a queue row; if the task names a person whose contact details aren't in `People/`, add/refresh a linked `Contacts/` row; LIST mode surfaces/ranks the queue); OUTPUT (row written / queue listed). Apply-safe (Medium-Term direct); fail closed on anything that would emit outgoing content. [runs: writes skill]
- [ ] Step 3 — Write `.claude/skills/!Initiative/skill.md` from `Template_skill.md`:
  - TRIGGER: `!Initiative`; scheduled `initiative-sweep`; flag `--dry` (report only).
  - LOGIC: detect interactive vs unattended → STEP 1 read `MinorTasks/queue.md`, take every ☐ Open / ◐ Doing row, rank by State precedence (🔴→🟠→🔵→🟢→⚪); STEP 2 for **Low-impact** rows → **execute** in-system this run, mark ☑ + write back; STEP 3 for **High-impact** rows (incl. `Intake:ambiguous` "ask Luke" items) → **propose** (draft a `!CreatePlan` plan or an implementation sketch to `Sandbox/`) and HOLD — never execute; STEP 4 assemble + email Luke a digest via `!AgentMail` (auto-done · held-for-you · ambiguous items awaiting your call).
  - GUARDRAILS: scope is `MinorTasks/` **only** — never reads/writes `Projects/`, never edits a registry or `_tracking.yaml`, never touches `!ProjectSweep`. Unattended → auto-act Low only; anything High / outgoing / Long-Term → `!Checkpoint`, fail closed.
  - [ ] Test in Sandbox — `!Initiative --dry` over a seeded sample queue; confirm the Low-auto-action vs High-propose split is correct and nothing mutates.
- [ ] Step 4 — Patch `.claude/skills/!Intake/skill.md` (the half-skill) — the ① PROJECT axis decision tree:
  `confident match to an Active project → UPDATE` · `else new multi-step endeavour → CREATE` · `else minor/one-off self-contained → hand to !MinorTask` · `else ambiguous → !MinorTask "Ask Luke what to do with: <item>" (Source Intake:ambiguous, Impact High, State 🟠 your move), archive the original with a back-pointer, advance the processed-marker`. Add explicit "belongs to an existing project" criteria (same endeavour/people/subject/purpose, not keyword overlap). Keep the old leave-in-`Inbox/`-and-flag behaviour **only** as the fail-closed fallback when `!MinorTask` is unavailable. Also: when an arrival carries a person's contact details for the project/task but the person doesn't warrant a `People/` record, add a **non-listed** `Contacts/` row linked to that project/queue item.
  - [ ] !Checkpoint — modifies a protected skill (`!Intake`); Luke authorised this change in-session 2026-06-27. Confirm the diff before saving.
- [ ] Step 5 — Build the scheduled task: write `System/Tools/cron/initiative-sweep.sh` (mirror `intake-sweep.sh` — lockfile, headless `claude -p "Run !Initiative now…"`, `--dangerously-skip-permissions`, fail closed, log to `Memory/Long-Term/Logs/cron-initiative-sweep.log`); register the cron via the scheduled-tasks MCP (propose daily ~07:45 Melbourne; the queue store is disjoint from `Projects/`, so there is **no** ordering dependency on `project-sweep`; Luke to confirm cadence).
  - [ ] !Checkpoint — creates an unattended auto-actioning task; confirm schedule + fail-closed wiring with Luke before going live.
- [ ] Step 6 — Update `.claude/CLAUDE.md` doctrine: add `!MinorTask` + `!Initiative` to the **Key Skills** table; add the minor-task + ambiguous→minor-task branch to **Inbox Disposition** and the **Workflow at a Glance** map; document the **Impact axis** (High/Low) once as shared vocabulary and the **ProjectSweep = `Projects/` vs Initiative = `MinorTasks/`** data-store split (so the boundary lives in doctrine, not just prose); update the **Lukeatron Interactions** section so a `Contacts/`-only recipient resolves to **non-listed** (with `People/` stated as authoritative for tier); list `MinorTasks/` and `Contacts/` under **Medium-Term** in **Memory Structure** + **Folder Reference**.
- [ ] Step 7 — Verify — every line in **Success criteria** passes; dry-runs clean; doctrine reads coherently for both human and agent. [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter, then move the file from `System/Plans/New/` to `System/Plans/Completed/`.

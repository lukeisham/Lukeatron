---
plan: "appdevelopment-registry-to-decisions"
context: [Lukeatron]
secondary_contexts: [Personal Research, Teaching]
created: 2026-09-28
status: Completed
major_because: "multi-step; modifies CLAUDE.md, a core skill reference (!HouseStyle sources.md) and .Claude/settings.json; moves a live app"
project: ""
skills_used: [!CreatePlan, !ReviewPlan, !AppDevelopment, !Checkpoint]
reviewed: 2026-09-28 — !ReviewPlan APPROVED (2 passes, 6 flags resolved)
---

# Plan — Simplify !AppDevelopment: one decisions file, no template/test, no Sandbox docs

> **Gates closed 2026-09-28** (Luke, in chat). A: build docs in `System/Apps/<Name>/_build/`
> (prd.md · specs/ · build.md), deleted once built; `app-decisions.md` + `wishlist.md` permanent at
> the app root; only mockups in `System/Sandbox/<Name>-mockups/`. B: retrofit table as proposed —
> Storytelling's build docs retired; Fact-checking `legacy-widget/` → `Archive/`;
> **CurriculumPreparation excluded** (R-10 still in `_test/`; retrofit later). C: commit first.

## Objective
Rewrite `!AppDevelopment` so each app has one `app-decisions.md` (Luke's approvals + granted
Vibe-Coding rule exceptions) instead of a build registry and a refactor registry. Build documents
live beside the app, not in Sandbox. Apps are built straight into `System/Apps/<Name>/` on real
data, with no `_template/` or `_test/` split. The wishlist becomes a standalone dumping ground.
Then retrofit every existing app/widget and bring CLAUDE.md into line. This serves the Lukeatron
North Star: keep the system correct, legible and doing what CLAUDE.md says it does.

## Success criteria (measurable)
- `templates/app-decisions.md` exists; `templates/registry.md` and `templates/refactor-registry.md` are gone.
- `grep -rn "registry\.md\|refactor-registry\|_template\|_test/\|refactor board\|divergence allowlist"`
  over `.Claude/`, `System/` (excluding `Archive/`, `Plans/Completed/`, `Sandbox/`) returns ONLY these
  expected hits: (a) anything under `System/Widgets/CurriculumPreparation/` and `!NewUnit/skill.md`
  (excluded widget); (b) the *project* registry — `Template_ProjectRegistry.md` and skills that read
  `Projects/<id>/registry.md`; (c) this plan. Any other hit fails the check.
- No `!AppDevelopment` file reads or writes a phase field. Phase is inferred from which files exist.
- `!AppWishlist` has its own Skillbank folder and `_index.yaml` entry. No phase file mentions it,
  and it has no PRD conflict scan.
- Each of the six Gate B apps has an `app-decisions.md` matching the approved table, and no
  `registry.md` / `refactor-registry.md` remains for it. CurriculumPreparation is untouched.
- No `_build/` folder remains for LukeatronWiki, ProjectKanban or Storytelling (built apps); no
  `System/Sandbox/` folder remains for any of the six apps except `Sandbox/Rhetoric-mockups/`.
- Storytelling runs from `System/Apps/Storytelling/` with its tests passing; `Fact-checking/legacy-widget/` is in `Archive/`.
- ProjectKanban runs from `System/Apps/ProjectKanban/` on :8789 after a fresh SessionStart hook;
  LukeatronWiki still serves on :8787; both test suites pass.
- CLAUDE.md edited with Luke's explicit sign-off; zero stale `_template` paths remain outside `Archive/`, `Plans/Completed/` and the excluded CurriculumPreparation hits listed above.

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md`; `Memory/Long-Term/Lukeatron/memory-structure.md`
- **Capability skills:** none
- **Domain skills (Skillbank):** `!AppDevelopment` (subject of the rewrite)
- **Sub-agents:** one Sonnet per retrofit app, extracting approvals and exceptions from registry, phase log and README (Step 9). Opus reviews each draft before it is shown to Luke.
- **Scripts:** a stale-reference grep, run in Step 13 (inline, one-off)
- **Temp-skills:** none

## Steps

**Gates**
- [x] Gate A — `_build/` inside the app folder (2026-09-28) [Luke]
- [x] Gate B — retrofit table confirmed: LukeatronWiki · ProjectKanban · Storytelling · Rhetoric · Fact-checking · HistoryOfPhilosophy. CurriculumPreparation excluded (2026-09-28) [Luke]
- [x] Gate C — commit current work first (2026-09-28) [Luke]

**Safety net**
- [x] Step 1 — Copy every `System/Sandbox/<app>/` folder being retired (not git-tracked) to `Archive/appdevelopment-restructure-2026-09-28/` [inline]
- [x] Step 2 — Commit current `System/` + `.Claude/` state (per Gate C), then `git status` clean [git]

**Rewrite the skill**
- [x] Step 3 — Write `templates/app-decisions.md`: two tables only, Approvals (date · what was approved · version) and Rule Exceptions (rule ID · where · reason · date). Delete `templates/registry.md` and `templates/refactor-registry.md` [inline]
- [x] Step 4 — Rewrite `skill.md`: phase inferred from files (PRD only → 1 · specs → 2 · build.md → 3 · code at the app root → built); drop registry-as-source-of-truth, STEP 1a and G-5; G-4 becomes "record an approval or exception the moment Luke gives it"; the next step lives in the project's Next Actions; G-2 narrows to deleting build docs only after a verified build [inline]
- [x] Step 5 — Rewrite `phase1-prd.md`: create `System/Apps/<Name>/` + build-doc location (Gate A) + `app-decisions.md`; no registry [inline]
- [x] Step 6 — Rewrite `phase2-specs.md`: specs into the Gate A location; mockups only in `System/Sandbox/<name>-mockups/` [inline]
- [x] Step 7 — Rewrite `phase3-buildprep.md`: no registry refresh; `build.md` into the Gate A location; the build writes code to the app root on real data. Add two rules: (a) tests use fixture/fake data inside `tests/`; (b) a dated copy of any real data file is taken before the app's first write to it (Memory/ is not in git) [inline]
- [x] Step 8 — Rewrite `phase4-refactor.md` as **Phase 4 — Retire the build docs + refine**: once the build is verified and Luke confirms, fold the doc-spec into README, write StyleGuide.md, delete the build docs via `!Checkpoint` (git keeps history). Refinement = direct edits guarded by git commit + tests. Remove `_template/`, `_test/`, the divergence allowlist and the refactor board. Keep the Health Check minus its diff question (#5) [inline]
- [x] Step 8a — Move `wishlist.md` out to `System/Skillbank/PersonalResearch/!AppWishlist/skill.md`: file sits in the app folder by association only; add / list / remove-when-acted; no ranking-by-phase, no conflict scan. Delete `templates/wishlist.md` from `!AppDevelopment` (moves with the skill) [inline]
- [x] Step 8b — Update `_index.yaml`: `!AppDevelopment` intent/triggers (drop wishlist triggers); new `!AppWishlist` entry. Update `!GenerateSupportiveContent/reference/targets.md`'s "Widget / app" target shape to the new layout [inline]
  - [x] !Checkpoint — show Luke the rewritten `!AppDevelopment` + `!AppWishlist` diff for sign-off before any retrofit step runs

**Retrofit (per Gate B)**
- [x] Step 9 — Draft `app-decisions.md` for each app from its registries and README [sub-agent per app, Opus review]
- [x] Step 10 — Per app — order: HistoryOfPhilosophy → Fact-checking (+ legacy-widget → Archive/) → Rhetoric (mockups → `Sandbox/Rhetoric-mockups/`) → LukeatronWiki → Storytelling (move built app to `System/Apps/Storytelling/`, first grep its code for `Sandbox` paths and fix any; run its tests + launcher, then retire build docs) — move docs to the Gate A location, write the approved `app-decisions.md`, delete `registry.md` / `refactor-registry.md`, and replace README "Rule exceptions" tables with a pointer to `app-decisions.md` [inline]
  - [x] !Checkpoint — each deletion of a registry or Sandbox folder
- [x] Step 11 — ProjectKanban flatten: `_template/*` → `System/Apps/ProjectKanban/`; fix paths in `.Claude/settings.json` hook, `.Claude/launch.json`, `ensure-kanban.sh`, `System/Viewer-Launch-Guide.md`, `!HouseStyle/reference/sources.md`, `!GenerateSupportiveContent/reference/targets.md`, `!NewUnit/skill.md`, and the open ProjectKanban plans `lukeatronwiki-link-to-projectkanban.md` + `projectkanban-urgency-shading.md` in `Plans/New/`. Stop :8789, move, fix the hook path, re-run `ensure-kanban.sh`, confirm :8789 serves, run both test suites [inline]
  - [x] `projectkanban-state-merge-bulk-suggest.md` is built on `_template/_test` + `refactor-registry.md` — not a path fix. Add a header note marking it `needs revision before execution` and tell Luke; do not rewrite it in this plan
  - [x] !Checkpoint — `!HouseStyle` is a Key Skill: Luke signs off the path edit

**CLAUDE.md**
- [x] Step 12 — Draft CLAUDE.md edits and show a diff for sign-off: Browser tools path (`ProjectKanban/_template/` → `ProjectKanban/`); Information Flow Sandbox row (app mockups only; app build docs live with the app); one line in Folder Reference that each app folder carries `app-decisions.md` [inline]
  - [x] !Checkpoint — Luke's explicit sign-off (charter guardrail)

**Verify**
- [x] Step 13 — Stale-reference grep (see Success criteria; Sandbox test N/A — it is a read-only one-line grep with no side effects); `curl` :8787 and :8789; run both apps' tests [script]
- [x] Verify — **PASS, with one recorded deviation** (2026-09-28):
  - 6 apps carry `app-decisions.md`; no `registry.md` / `refactor-registry.md` remains for any; CurriculumPreparation untouched.
  - :8787 and :8789 both 200; Dashboard serves real projects from `System/Apps/ProjectKanban/` via the repointed SessionStart hook.
  - Tests: ProjectKanban 218 py + 158 js · LukeatronWiki 304 (1 expected skip — retired staging folder) · Storytelling 534 js + 77 py; Storytelling server serves from its new home.
  - Stale-reference grep: remaining hits are intentional — the needs-revision banner on `projectkanban-state-merge-bulk-suggest.md` (plan body left for its revision), history comments in ProjectKanban `paths.py` / `test_paths.py` / `test_board.mjs` about the retired ProjectDashboard, identifiers in Storytelling's bundler, and the v2 skill's own "no `_template/`" checks.
  - **Deviation:** Storytelling keeps `_build/` — its build-board row 13 (whole-app review against every spec checklist + Luke's data checks) was found not done, so retiring the specs now would delete that review's checklists. Moved to `System/Apps/Storytelling/` with `_build/` kept; row 13 carried into the PRD. Retire with `!AppRetire` once row 13 is done.
  - Also: `Fact-checking/legacy-widget/` → `Archive/Fact-checking-legacy-widget-2026-09-28/` (per Luke); `!FactCheck` and the PRD now point there. Storytelling poster PNGs + `dist/` gitignored (public repo; poster licence OQ-X1 open).

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.

---
plan: "rebuild-fact-checking-app"
context: Teaching
secondary_contexts: [Lukeatron]
created: 2026-09-12
status: Completed
major_because: "multi-step; modifies TE-08's project registry and a project spec"
project: "TE-08-fact-checking-app"
skills_used: [!CreatePlan, !ReviewPlan, !FactCheck]
---

# Plan — Rebuild Fact-checking App

## Objective
Rebuild TE-08 (the Fact-checking claim/source-verification tool) as a working, agent-run
verification pipeline: a new Skillbank skill that tokenises input in 250-word batches, discovers
and codifies claims, searches and double-checks evidence against the five-category provenance
taxonomy already fixed in `FactCheckingParser.spec.md` (Exists / Direct-quote / Paraphrase /
Claimed / Observed), and fails closed to "unverified" whenever no source is confirmed — reusing
that spec's chunk contract, whitelist, and EVAL rules rather than inventing a new design.
Per Luke's explicit architecture decision (this session): the Skillbank skill is the primary,
agent-run verification engine; the existing spec's browser widget remains the secondary
tagging/viewer surface (with its copy-paste-to-Claude fallback) and is not rebuilt in this pass —
tracked instead as a named follow-up so it is not silently dropped.

## Success criteria (measurable)
- A new Skillbank skill `!FactCheck` exists at `System/Skillbank/Teaching/!FactCheck/skill.md`
  (house ⚡TRIGGER/🛠️LOGIC/✅OUTPUT format) and is registered in `System/Skillbank/_index.yaml`.
- Run against a real worked paragraph in `System/Sandbox/` (mixing a direct quote, a paraphrase,
  a common-knowledge fact, and an unverifiable claim), the skill produces a
  `Claim | Chunk | Source | Category` table where: every checkable chunk is searched and
  double-checked (source resolves + supports the recorded text) before being cited, and any chunk
  with no confirmed source renders the fail-closed `unverified — unable to find a reliable source`
  label rather than a fabricated one.
- Input is processed in ≤250-word batches internally even though the tool's cap stays 1000 words
  (Parser_guide.md §2.1) — demonstrated on the same test run.
- `FactCheckingParser.spec.md` updated: AD-FC6 revised for 250-word batching; §8 promotes the
  companion skill from "downstream, out of scope" to the in-scope primary Tier-B path; status line
  reflects both surfaces' real state.
- `TE-08` `registry.md` (purpose/DoD/Next Actions/Documents/Decision Log) and `notes.md` updated to
  match reality, including the deferred browser-cartridge build as a tracked next action.
- `Parser_guide.md` §2.1 row and §2.4 open items updated to name the new skill.
- **Charter-DoD deviation, Luke-approved this session:** the Teaching charter's baseline Definition
  of Done reads "the tool works standalone... consistent in approach (shared chassis, own
  cartridge)." This plan does not build that cartridge — Luke explicitly chose the "skill does the
  work, widget stays as a viewer" architecture over "copy-paste handoff only" and "skill+cartridge
  both, right now" when asked directly (this session, AskUserQuestion). The skill satisfies the
  charter's "works standalone, provenance-sourced" half in full; the "own cartridge,
  chassis-consistent" half is deliberately deferred, not silently dropped — recorded here and in
  TE-08's Decision Log (Step 5) so the gap is visible, not assumed closed.

## Resources
- **Memory to read:** none beyond what's already read this session (`System/Widgets/Parser/Fact-checking/`, `System/Suggestions/Parser_guide.md`, `Memory/Medium-Term/Projects/TE-08-fact-checking-app/`)
- **Capability skills:** none (the new skill uses Claude Code's own WebSearch/WebFetch tools when it runs, not a Lukeatron portal skill)
- **Domain skills (Skillbank):** none existing match Fact-checking verification — this plan creates `!FactCheck`
- **Sub-agents:** none — single-agent authoring + self-test
- **Scripts:** none
- **Temp-skills:** none — going straight to a registered Skillbank skill, since that is the deliverable itself, not a throwaway automation

## Steps
- [x] Step 1 — Draft `System/Skillbank/Teaching/!FactCheck/skill.md`: full Stage 1–4 pipeline (tag/discover claims → codify + 250-word-batch chunking → provenance search with whitelist-first + Wayback fallback → found-source double-check → five-category label, fail-closed default), citing `FactCheckingParser.spec.md` FR-FC/AD-FC IDs directly rather than restating them [domain skill authoring]
- [x] Step 2 — Test in Sandbox — run the skill on a worked paragraph mixing a direct quote, a paraphrase, a common-knowledge fact, and an unverifiable claim; verify the table, the double-check gate, and the fail-closed default all behave as specified [test: System/Sandbox/factcheck-skill-test.md] — extended with a second, 261-word two-batch run to also prove STEP 1's batch-splitting live
- [x] Step 3 — Register `!FactCheck` in `System/Skillbank/_index.yaml` (Teaching domain, triggers, one-line intent, dated changelog entry) [file edit]
- [x] Step 4 — Update `FactCheckingParser.spec.md`: revise AD-FC6 for 250-word batching, promote the companion-skill note in §8 to in-scope/built, update the Status line [file edit]
- [x] Step 5 — Update `TE-08` `registry.md` (purpose, Definition of Done, Next Actions, Documents table, Decision Log) and `notes.md` agent guidance to match what was actually built, naming the browser-cartridge build as the remaining next action [file edit]
- [x] Step 6 — Update `Parser_guide.md` §2.1 Fact-checking row and §2.4 open items to name the new skill and its status [file edit]
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [PASS]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.

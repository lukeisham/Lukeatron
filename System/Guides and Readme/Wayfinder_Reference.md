# Wayfinder — Reference Guide

Wayfinder is a nine-skill product-development-lifecycle framework, sent by Keith and
adopted into the Skillbank on 2026-07-14. It takes a coding product from raw notes through
to a documented, dependency-wired repo. It lives at
`System/Skillbank/PersonalResearch/Wayfinder/` and is catalogued in
`System/Skillbank/_index.yaml`.

It is **not one automated chain**. It is nine separate Skillbank skills, each with its own
triggers, that you (or the agent) invoke one at a time as a coding project needs them. See
§3 "Is this one long chain?" below for the full answer.

---

## 1. How to trigger it

There is no single `!Wayfinder` command — each of the nine skills fires on its own natural-
language triggers, matched the normal Skillbank way (task text checked against
`System/Skillbank/_index.yaml`, skill body loaded only on a hit):

| Skill | Say things like... |
| :--- | :--- |
| **!Utopia** | "scaffold this repo", "utopia init", "what are the PDLC folders", "generate the product brief" |
| **!Ideation** | "turn my notes into a problem statement", "propose solutions", "organize these into features", "check the ideation space" |
| **!TechSpecFullProject** / **!TechSpecSingleFeature** | "write a spec", "spec this feature", "draft the architecture", "spec workflow" (pre-existing Skillbank skills — Wayfinder's `specs` skill was folded into these) |
| **!Spike** | "spike this", "prototype and compare", "which of these should we use" |
| **!Research** | "research-scope", "keep tabs on this topic", "ongoing research on X" |
| **!MultiRepo** | "extract this module into its own repo", "share code between repos" |
| **!RepoRegistry** | "which github account", "add a new org to create repos under" |
| **!Waypoint** | "save a waypoint", "snapshot this project", "checkpoint the repo" (coding-repo session snapshot — **not** Lukeatron's own `!Checkpoint` safety gate) |
| **!SkillDocs** | "document a skill", "generate a docs site" |
| **!Readme** | "update the readme", "explain the folder structure" |

Each skill also exposes named sub-commands (its `commands/*.md` files) — e.g. `!Ideation`
has `ideas-problem`, `ideas-solution`, `ideas-feature`, `ideas-check`, etc. These aren't
Lukeatron slash commands; they're named modes within the one skill, matched by the same
natural-language triggers described in each skill's own trigger section.

---

## 2. Key components and what they do

| Skill | Purpose | Notable behaviour |
| :--- | :--- | :--- |
| **!Utopia** | Scaffolds a repo into 7 PDLC phase folders (Ideation → Retirement) + 3 activity folders (Projects/Evolutions/Recursions). Generates `<Product>.brief.md`, the product's public face to other products. | Auto-commits and pushes after scaffolding, with exceptions (no remote, push rejected, unconfirmed structural change, or the very first `/utopia-init` pass, which offers instead). |
| **!Ideation** | Raw notes → problem statement → 2-4 candidate solutions → clustered, reviewed feature ideas → narrative description. | Issues never deleted, only marked resolved in place. Supports "phasing" (splitting an overwhelming backlog into Phase1/Phase2 folders). `/ideas-check` is strictly read-only; `/ideas-fix` is its mutating counterpart. |
| **!TechSpecFullProject** / **!TechSpecSingleFeature** | Typed `.spec.md` documents, numbered requirements (FR-XX-n), decision records (AD-n), a Gap Register (GAP-n, never deleted), and a `_Done/` completion lifecycle. | `/specs-architecture` has a **hard review gate**: no downstream spec work starts until the module division is explicitly approved by you. |
| **!Spike** | Time-boxed investigation answering one question, closed with a go/no-go recommendation. | Non-convergence within the timebox still counts as a finding. Non-negotiable audit trail — every artifact lands in the project, never scratch space. |
| **!Research** | Open-ended, re-invocable research with no fixed deadline. | Later runs append dated updates; prior conclusions are never overwritten. |
| **!MultiRepo** | Extracts a module shared across sibling product repos into a new/existing shared repo, wires it back in as a package dependency. | Guard clause: must run from a workspace folder *containing* repos, never from inside one. Never force-pushes an existing repo's history — only the extracted copy's history is rewritten. |
| **!RepoRegistry** | Maintains `~/_REPOS.md` — the table of GitHub owners `/repo-new` picks from. | Rule: never invent an owner not listed; add it to the table first. |
| **!Waypoint** | Overwrites `WAYPOINT.md` at a repo's root with a full session-state snapshot (state, decisions, next actions, gotchas, key files), commits and pushes it. | Renamed from Keith's `checkpoint` command to avoid colliding with Lukeatron's own `!Checkpoint` safety gate — different thing entirely (this is repo-local session continuity, not an outgoing-content gate). |
| **!SkillDocs** | Generates a self-contained HTML documentation site for skills — one page per command. | Distinct from `!GenerateWiki`, which writes MLA-cited knowledge articles on a topic, not skill documentation. |
| **!Readme** | Keeps a product's root `README.md` current — intro + folder-structure map. Writes a separate, non-technical README when pointed at a skill directory itself. | Never generates a skill's README by summarizing its SKILL.md — writes it fresh, for a reader deciding whether to use the skill. |

**Design patterns shared across all nine:** ambiguity-resolution (drafting, clustering,
contradiction detection, architecture proposals) is delegated to Fable-backed subagents;
mechanical file operations stay in the main session. Nothing is deleted — issues and gaps
are marked resolved in place, preserving an audit trail.

---

## 3. Lifecycle — is this one long chain, or gated stage by stage?

**It is a modular toolkit, not a single automated chain.** There is no orchestrator that
walks a product through all nine skills unattended. Each skill/command is its own entry
point, invoked when that stage is actually needed — you (or whoever is driving) decides
when to move from Ideation to Specs to Implementation, not the framework.

That said, it isn't fully permission-gated at every step either — it sits in between:

- **Skills detect and defer to each other**, but don't force a sequence. `!Spike` and
  `!Research` check whether `!Utopia`/`!TechSpec*` are present and fall back gracefully if
  not; `!Utopia` recommends running `!Ideation` and `/synergy-init` next (asking first,
  defaulting to yes) — it doesn't run them silently.
- **Some stages carry hard, explicit review gates.** `/specs-architecture` will not let any
  downstream spec work begin until you've explicitly signed off on the proposed module
  division — "a reply that only addresses something else doesn't count as sign-off."
  `/utopia-brief` and `/ideas-describe` are reviewed with you before being committed.
- **Some stages act without asking, specifically around git.** `!Utopia`'s `/utopia-init`,
  `!MultiRepo`'s `/meta-reuse`, and `!Waypoint` **auto-commit and push to GitHub by default**
  once their scope is confirmed — this is the one place the framework moves autonomously
  through an outgoing, external action. This is also the reason our Skillbank adoption
  should route those specific auto-pushes through Lukeatron's own `!Checkpoint` gate before
  they're used for real: as imported, they'd push straight to GitHub without asking, which
  doesn't match Lukeatron's "nothing leaves or changes without a safety gate" invariant.

**In short:** you drive which stage runs and when; most drafting stages review with you
before committing to disk; but the git-push behaviour in three places is currently
autonomous and worth gating before first live use.

---

## 4. Git location

`https://github.com/lukeisham/Lukeatron.git` (private) is the `origin` remote, set up
2026-07-14. Scope is deliberately narrow — only `System/` and `.Claude/` (skills, templates,
Skillbank, config) are tracked; `.gitignore` excludes `Memory/`, `Inbox/`, `Outbox/`,
`Archive/`, `System/Sandbox/`, and real credentials (`System/Credentials/*`, keeping only
the `.example.*` files) at the repo root. No personal data — People/, Contacts/, sermon
prep, projects — is version-controlled. Initial commit pushed to `main`.

One file worth a look if the repo's visibility ever changes: `.Claude/skills/!OutgoingContentCheck/whitelist.yaml`
is tracked (it's system config, not Memory/) and may list real contact identifiers.

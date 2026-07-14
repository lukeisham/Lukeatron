---
name: "!Utopia"
description: >
  Manage a product repository's Utopia structure — the seven product-development-lifecycle
  (PDLC) phase folders (Ideation, Specification, Implementation, Marketing, Delivery, Production,
  Retirement) plus three activity folders (Projects, Evolutions, Recursions) that track work on a
  product over time. Use when scaffolding a new product repo's top-level structure, asked about
  "utopia", "PDLC folders", "phase folders", where a new sub-project belongs, converting a folder
  to a git submodule, or generating/refreshing a product's <Product>.brief.md. Part of the
  Wayfinder suite (from Keith); owns the folders, !Ideation/!SkillDocs-adjacent skills own what
  goes inside them.
type: Skill
status: Active
domain: "PersonalResearch (coding / amateur builds) — Wayfinder suite"
intent: "Give a coding project one consistent top-level shape across its whole lifecycle, and keep other products' understanding of it (<Product>.brief.md) current."
version: 1.0.0
dependencies: [git, "gh CLI", "!Ideation (Ideation/ contents)", "!Readme", synergy-init]
calibration:
  context: ["Personal Research"]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: []
---


# Utopia

A top-level repository structure for a product, organizing its whole
lifecycle into folders. Sits alongside the other MarkAs/Synergy methods
(`ideas`, `specs`, `readme`) — those own what goes *inside* a given
folder; Utopia owns the folders themselves and the repository they live
in.

## Structure

```
<repo root>/                  # one git repository — everything about the product
├── Ideation/                 # PDLC: problem, candidate solutions, feature ideas — owned by the `ideas` skill
├── Specification/            # PDLC: specs, plans — owned by the `specs` skill / `/synergy-init`
├── Implementation/           # PDLC: build/code phase — no owning method yet
├── Marketing/                # PDLC: positioning, launch materials — no owning method yet
├── Delivery/                 # PDLC: release, packaging, distribution — no owning method yet
├── Production/               # PDLC: live operation — support, incidents, monitoring — no owning method yet
├── Retirement/               # PDLC: sunset, deprecation, migration-off — no owning method yet
├── Projects/                 # Activity: net-new sub-products; one subfolder per sub-project
├── Evolutions/               # Activity: changes to something that already exists; one subfolder per sub-evolution
└── Recursions/                # Activity: Utopia applied recursively to a part of the product; one subfolder per sub-recursion
```

The **PDLC folders** hold the product's own material for that lifecycle
phase — there's one of each per repo. The **activity folders** are
collections (capitalized, per MarkAs collection convention): each is a
container of subfolders, one per concrete instance of that activity
(`Projects/<Name>/`, `Evolutions/<Name>/`, `Recursions/<Name>/`). A
subfolder inside an activity folder is typically a nested product in its
own right and may eventually get its own PDLC structure.

Only three PDLC methods are assigned so far (`Ideation` → `ideas`,
`Specification` → `specs`/`synergy-init`). The rest, and the precise line
between Projects/Evolutions/Recursions, are deliberately left open — see
"Keep this skill current" below.

## The repository is one git repo, committed and pushed automatically

The Utopia root is a single git repository — everything about the product
lives under it. `/utopia-init` creates it if it doesn't exist yet. After
this skill creates, moves, or scaffolds anything under the root (new
folders, a moved file, a new sub-project folder), **commit and push
automatically** — don't wait to be asked, that's the point of this skill.
Exceptions, where you must stop and tell the user instead of pushing
silently:
- No remote is configured — commit locally, say so, don't invent a remote.
- The push is rejected (diverged history, auth failure) — report the
  failure plainly rather than force-pushing.
- The change is a structural one the user hasn't confirmed yet (e.g.
  repointing which solution is chosen, converting a folder to a
  submodule, generating or refreshing `<Product>.brief.md`) — those
  follow their own skill's confirmation step first.
- The initial `/utopia-init` pass as a whole — reclassification (step 3:
  moving pre-existing content into PDLC folders) plus whichever
  phase-specific skills the user confirms (step 5: `ideas`,
  `/synergy-init`) — offer to commit once, after all of that scaffolding
  has run, rather than doing it automatically or committing partway
  through. That pass can move IDE project files, rewrite path references
  across the repo, and add sub-scaffolding; the user should see it all
  together in one diff before it lands. Once the repo is already
  Utopia-shaped, later incremental moves go back to auto-commit-and-push.

## Deciding where new work goes

- Something with no existing counterpart in the product → `Projects/<name>/`.
- A change to, or new version of, something that already shipped →
  `Evolutions/<name>/`.
- Utopia's own structure applied again to a part of the product (a
  sub-product that itself gets its own PDLC treatment) → `Recursions/<name>/`.

This three-way split is the least mature part of the model — confirm with
the user when a case is ambiguous rather than guessing, and fold what you
learn back into this file (see below).

## Recommending phase-specific skills

Once the phase folders exist, **ask, don't force, but default to yes**:
`/utopia-init` explicitly asks whether to run each of the following, with
running it as the recommended/default answer — silently skipping neither
was ever the point, this is about giving the user an explicit chance to
decline, not about being passive:
- Initialize `Ideation/` with the `ideas` skill.
- Scaffold `Specification/` using `/synergy-init`. As of its step 0,
  `/synergy-init` auto-detects an existing `Specification/` folder and
  nests `_Spikes/_Builds/_Refactors/_Changes` inside it automatically —
  `Ideation/Solutions/` and `README.md` still target the Utopia root
  regardless. No placement question to ask; just run it.

Neither is scaffolding done unasked by `/utopia-init` — committing to a
phase's method is a direction decision like choosing a solution in
`ideas` — but the default answer, absent a reason to hold off, is yes:
run it immediately once confirmed.

## Classifying pre-existing content into PDLC folders

When `/utopia-init` runs in a repo that already has files or folders at
the root (from before Utopia was adopted), it classifies each one and
moves it into the matching PDLC folder rather than leaving it stranded
next to the new scaffold. This is a normal, expected part of running
`/utopia-init` — not a special case that needs asking each time,
**except** when a classification is genuinely ambiguous.

Rough heuristic, in order of how clear-cut it usually is:
- A folder literally named `Specs/`, `Specifications/`, `Spec/`, or a
  clear synonym → merge its *contents* into `Specification/` (don't
  nest a redundant folder inside the PDLC folder: `git mv Specifications/*
  Specification/`, then remove the now-empty original — same treatment
  a folder named `Source/`, `Sources/`, or `src/` gets against
  `Implementation/`).
- Source code, packages, build configs, and any other folder that holds
  a target/module (e.g. an app target folder, a Swift package directory)
  → `Implementation/`, keeping its own name (`Implementation/CosmicApp/`,
  `Implementation/Packages/CosmicKit/`) since it isn't a synonym of the
  PDLC folder itself.
- IDE project/workspace files — Xcode `.xcodeproj`/`.xcworkspace`,
  Visual Studio `.sln`/`.vcxproj`, Android Studio module files, and
  similar — encode relative paths to the specific source folders they
  build. Move the project file and every folder it references **together,
  in one operation**, preserving their relative layout to each other, so
  only their shared parent directory changes and the internal relative
  paths keep resolving. Before moving, check whether the project file
  uses absolute paths or a fixed root-relative scheme (e.g. Xcode's
  `SRCROOT`-relative groups can look relative but a `sourceTree =
  "<absolute>"` entry isn't) — if so, the paths inside the project file
  need editing too, not just the files on disk. Verify the project still
  opens/builds after the move before calling it done. This is distinct
  from pure editor-preference config (`.vscode/`, `.editorconfig`,
  `.idea/` code-style files with no source-path references), which stays
  at root per the exception below.
- Grammar/EBNF, architecture docs, design docs, PRDs, module specs
  written before the code exists → `Specification/` (module-level specs
  that live alongside their code, e.g. a `module.spec.md` next to the
  `.swift` files it describes, can stay with the code in `Implementation/`
  — don't split a folder's contents across two PDLC folders unless the
  user asks)
- Raw notes, brainstorms, problem statements → `Ideation/`
- Positioning, launch copy, marketing assets → `Marketing/`
- Packaging, release, distribution configs → `Delivery/`
- Ops runbooks, monitoring, support docs → `Production/`
- Deprecation/migration-off docs → `Retirement/`

Stays at root, never classified: `README.md`, license files, `.gitignore`,
CI config, editor/tooling config, and anything already inside a PDLC or
activity folder. This includes package manifests that their toolchain
requires to sit at the repository root to be discoverable at all —
`Package.swift` (SPM), `package.json`, `Cargo.toml`, `go.mod`,
`pyproject.toml` — even though the code they describe lives in
`Implementation/`. Point the manifest's source paths into
`Implementation/` (e.g. SPM's `.target(path:)`) rather than moving the
manifest itself. `<Product>.brief.md` (see `/utopia-brief` below) stays
at root for the same reason: it exists so *other* products can find it
without knowing anything about this one's internal structure — nesting
it in a PDLC folder would defeat the point.

If a top-level item could plausibly fit more than one PDLC folder, or its
purpose isn't clear from its name/contents, ask the user rather than
guessing — then fold the answer back into this heuristic if it reveals a
pattern worth keeping.

A move isn't finished when the files land in the new location — any
doc or config that hardcodes the old paths (README, CLAUDE.md, build
commands, CI config, the IDE project file itself) needs those paths
updated to match, or the move has just traded a stray root folder for a
broken build.

## Converting folders to git submodules

PDLC folders and activity subfolders may later be promoted to their own
git submodule — **only when the user explicitly asks for a specific
folder, never proactively**, since it rewrites how that folder is
tracked. Use `/utopia-submodule <path>` for the mechanics. Mentioning the
possibility (e.g. while explaining this skill) is not a request to do it.

## Generating a product brief (`/utopia-brief`)

`/utopia-brief` writes `<Product>.brief.md` at **this repo's root** —
outside every PDLC folder, regardless of whether this repo uses Utopia
internally (see the root-level exception above). It's the file
`/specs-depend` (the `specs` skill) copies into a *different* product's
`Specification/Dependencies/` when this product is a dependency of that
one — so it is written for that reader specifically: a software designer
on another product deciding whether and how to build on top of this one,
who has **no other information about this product** than what's in this
file.

It synthesizes two sections from whatever of the following exists —
`Ideation/<product>.<kind>.description.md` (the `ideas` skill's
`/ideas-describe`), `Specification/<name>-PRD.spec.md` (the `specs`
skill's `/specs-prd`), and every `Ideation/Features/*.feature.idea.md`
with `inclusion: selected` (per the `ideas` skill's "Feature idea
frontmatter" — only committed capabilities, not proposed or deferred
ones) — delegated to a **Fable**-backed subagent (`Agent` tool, `model:
"fable"`, `subagent_type: "Plan"`, foreground), since deciding what's
capability-worth-telling-an-outsider-about versus what's a limitation is
judgment work, not mechanical transcription:

- **Capabilities and services** — thorough enough that a design decision
  on another product could actually be made from it, not just a feature
  list.
- **Known limitations** — drawn from the PRD's non-goals/out-of-scope,
  deferred/dropped features a consumer might otherwise assume exist, and
  any open `GAP-n` entries in `<name>.arch.spec.md`'s Gap Register (the
  `specs` skill's `/specs-architecture`), if one exists.

The draft is reviewed with the user before being written — this file
becomes another product's entire understanding of this one — and,
per the root-level auto-commit exception above, the command only
*offers* to commit and push afterward, never automatically.

When a refresh actually changes the content, `/utopia-brief` closes by
**telling** the user to run `/specs-depend` in each product that depends
on this one, so their pulled-in copy picks up the update — it never
tries to do this itself. The session is scoped to this one product's
directory; knowing who depends on it lives in *their*
`Ideation/<product>.dependencies.md` files, not here, so this is a
plain-language recommendation, not an action.

## Keep this skill current

This skill is intentionally incomplete: five of the seven PDLC phases
have no owning method yet, and Projects/Evolutions/Recursions is a first
cut at naming activities that will sharpen with real use. Whenever the
user explains, corrects, or refines how they actually use these folders —
in *any* product repo, not just this one — update this file
(`~/.claude/skills/utopia/SKILL.md`) in the same session. This is a
standing instruction, not a one-time task: don't apply a correction once
and let it evaporate next time the skill runs elsewhere.

---
description: Initialize this repository's root with the Utopia folder structure — 7 PDLC phase folders plus 3 activity folders — then commit and push. Idempotent; never overwrites existing folders or files.
allowed-tools: Bash(mkdir:*), Bash(git:*), Bash(ls:*), Bash(touch:*), Write, Read, AskUserQuestion, Skill
---

Initialize **this repository's root** with the **Utopia** structure — see
the `utopia` skill for the full model. Create only what's missing; never
overwrite or delete anything that already exists without asking first.
Idempotent — safe to re-run. Pre-existing top-level content does get
moved into the matching PDLC folder as step 3 below — that's expected
behavior, not an exception to ask permission for, except where step 3
itself says to ask.

## 1. PDLC phase folders

Create each, if missing. Any folder left empty gets a `.gitkeep` so git
tracks it:

```
Ideation/
Specification/
Implementation/
Marketing/
Delivery/
Production/
Retirement/
```

## 2. Activity folders

Create each, if missing, with a `.gitkeep` (leave empty — sub-project /
sub-evolution / sub-recursion folders are created on demand, not
scaffolded):

```
Projects/
Evolutions/
Recursions/
```

## 3. Classify and move pre-existing content

For every top-level item in the repo root that is *not* one of the
Utopia scaffold folders/`.gitkeep`s and not `README.md`, a license file,
`.gitignore`, or CI/editor/tooling config: classify it using the
heuristic in the `utopia` skill ("Classifying pre-existing content into
PDLC folders") and move it into the matching PDLC folder. Use `git mv`
where the item is already tracked so history follows the move. If an
item's classification is genuinely ambiguous between folders, ask the
user rather than guessing — everything unambiguous can be moved without
asking, this is expected behavior for `/utopia-init`, not an exception to
it.

This includes recognizing:
- Specs/source folders by name (`Specs/`, `Specifications/`, `Source/`,
  `Sources/`, `src/`, …) — merge contents into the matching PDLC folder
  rather than nesting a redundant subfolder.
- IDE project/workspace files (Xcode `.xcodeproj`/`.xcworkspace`, `.sln`,
  etc.) — move the project file and every source folder it references
  together, in one operation, preserving their relative layout, so
  internal path references keep resolving. See the `utopia` skill for
  the absolute-path caveat and the build-verification step.

After moving anything, update paths that pointed at the old location —
README, CLAUDE.md, build/CI commands, and the IDE project file itself if
it needed path edits — and re-run the project's build/test commands to
confirm nothing broke before moving on to step 5.

## 4. Git repository

If the root isn't already a git repo, `git init`. If there's no remote
configured, only add one if the user gives an explicit URL — never guess
or invent one.

## 5. Ask about phase-specific skills

Ask explicitly, via `AskUserQuestion`, rather than just mentioning these
in passing — one question per space, each defaulting to (and labeled as)
the recommended choice, "run it now":
- Whether to initialize `Ideation/` with the `ideas` skill.
- Whether to scaffold `Specification/` with `/synergy-init`.

For whichever the user confirms, run it immediately as part of this
command (invoke the `ideas` skill / `/synergy-init`) before moving to the
commit step — don't just note it as a follow-up. For anything the user
declines, say it can be run later and move on without pressing further.

## 6. Offer to commit

Only after step 5's phase-specific skills have run (or been declined) —
not before — stage everything created and moved (including the
reclassified content from step 3 and anything the `ideas` skill /
`/synergy-init` just scaffolded) so the user can review the full diff in
one pass, then **offer** to commit and push rather than doing it
automatically — this initial pass can move IDE project files, rewrite
path references across the repo, and add sub-scaffolding, so the user
should see it all together before it lands. Draft the commit message
describing the Utopia scaffold (and whatever phase-specific scaffolding
ran) and wait for a go-ahead. If there's no remote, say so plainly and
offer a local-only commit instead.

## 7. Report

Summarize what was created vs. already existed, the commit/push result
(including if there was nothing to push, or no remote), and the outcome
of the phase-specific skills question — which ran, which were skipped.

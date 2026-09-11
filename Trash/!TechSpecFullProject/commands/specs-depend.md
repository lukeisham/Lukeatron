---
description: Pull each of this product's dependencies' product briefs (<Product>.brief.md) into Specification/Dependencies/ (or Dependencies/ at the repo root without Utopia). Reads Ideation/<product>.dependencies.md for the dependency list, warning and falling back to asking directly if it's missing. Offers to commit and push.
allowed-tools: Bash(ls:*), Bash(find:*), Bash(mkdir:*), Bash(cp:*), Bash(git:*), Read, AskUserQuestion
---

Pull in a **product brief** (`<Product>.brief.md`) for each of this
product's dependencies, so specs work here can reference what it depends
on without leaving this repo. Read `~/.claude/skills/specs/SKILL.md`
first if it isn't already loaded this session — this command writes into
one of its folders and follows its conventions.

## 1. Find the dependency list

Look for `Ideation/<product>.dependencies.md` (written by the `ideas`
skill's `/ideas-solution`, once a solution is chosen).

- **Found** — read it. Each entry is already categorized (existing
  sister product / planned sister product / third-party) with whatever
  reference `/ideas-solution` recorded for it.
- **Not found** — **warn** the user plainly that it's missing.
  `/ideas-solution` may not have run its dependency step yet, or it ran
  and genuinely found none — absence alone doesn't tell you which, so
  don't guess either way. After warning, **fall back to asking the user
  directly**: does this product depend on any others, and if so, name
  them.

If there are no dependencies — confirmed by the file, or by the fallback
interview coming back empty — say so and stop; there's nothing to pull
in.

## 2. Locate each dependency

- If the dependency came from `Ideation/<product>.dependencies.md` and
  already has a usable local reference (a path to a sibling product
  folder), use that directly — skip to step 3.
- Otherwise (the fallback interview, or a file entry without a clear
  local reference): look for a sibling folder matching the dependency's
  name in this repo's parent workspace directory — the same convention
  `/ideas-solution` uses (a workspace folder containing multiple product
  repos as direct subfolders, per the `meta` skill's model).
  - Match found → treat it as a **local product**, continue to step 3.
  - No match → **third-party, or a planned product that isn't built
    yet** — nothing to pull in for it. Note this in the report and move
    to the next dependency; don't suggest `/utopia-brief` for something
    that isn't a real local repo yet.

## 3. Find the dependency's brief

**Always look at the top level of the dependency's own product
folder** for `<Product>.brief.md` — its repo root, never inside its
`Ideation/` or `Specification/`, even if that product itself uses
Utopia. This is a deliberate exception to the usual Utopia PDLC-folder
classification: a product's brief exists so *other* products can find it
without knowing anything about its internal structure.

- **Found** — copy it (step 4).
- **Not found** — don't fabricate one. Tell the user this dependency has
  no brief yet and suggest running `/utopia-brief` on that product to
  create one. **`/utopia-brief` doesn't exist yet** (it's planned) — say
  so plainly; this is a future step to note, not something to run now.

## 4. Copy into this product's Dependencies folder

Destination: `Specification/Dependencies/<Product>.brief.md` if this
repo has a `Specification/` folder (Utopia layout), otherwise
`Dependencies/<Product>.brief.md` at the repo root — create the
`Dependencies/` folder if it doesn't exist yet.

Copy the file verbatim — don't edit, summarize, or reformat it. If a
brief with that name is already there, overwrite it: this command always
pulls the current version of someone else's file, it doesn't diff or ask
before refreshing a stale copy.

## 5. Report

Summarize: where the dependency list came from (the file, or the
fallback interview), and for each dependency — brief copied, no brief
yet (suggested `/utopia-brief`), or third-party/not found locally
(nothing to pull) — plus where the copies landed.

## 6. Offer to commit and push

Offer — don't commit automatically, even in a Utopia repo where other
changes might otherwise qualify for auto-commit. These are copies of
another product's files landing in this one; the user should see the
diff before it's committed.

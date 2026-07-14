---
description: Extract a reusable module from one product repo into a new or existing shared repo, and wire it as a package dependency into one or more consumer repos. Generic version of the KVL to LanguageLibrary AST extraction. Only runs from a workspace folder containing git repos as direct subfolders — never inside a single repo.
allowed-tools: Bash(git:*), Bash(gh:*), Bash(find:*), Bash(ls:*), Bash(swift:*), Bash(mkdir:*), Read, Write, Edit
---

Extract **one module**, explicitly named by the user, from a source repo
into its own (new or existing) shared repo, then wire it as a package
dependency into every consumer repo the user names. This rewrites how that
code is owned and built — confirm every open question in step 1 before
touching anything, per the `meta` skill's own discipline.

## 0. Guard clause

Run the `meta` skill's guard clause first: confirm the current directory is
*not* inside a git repo, and that it contains at least one subfolder that
*is* one. If either check fails, stop and explain — do not proceed "just
this once."

## 1. Confirm scope

Ask for whatever isn't already given:

- **Source repo + module path** — e.g. `KVL`, `Implementation/AST/`.
- **Is the folder's content uniformly reusable, or mixed?** Read the
  files before assuming. A folder can hold both a generic piece and a
  product-specific piece built on top of it (this is exactly what
  happened with `GenericAST.swift` vs `KVLGrammar.swift` in KVL) — if so,
  confirm with the user exactly which files move and which stay, rather
  than moving the whole folder.
- **Destination** — an existing shared repo to extend, or a new one (name,
  visibility — default to matching the org's existing repos' visibility,
  don't assume public).
- **History strategy** — fresh start, or preserve history via
  `git subtree split --prefix=<path> -b <branch>` run in a disposable
  clone (never the user's working copy). Either is legitimate; it's the
  user's call. If the module folder is mixed (previous bullet), note that
  `git subtree split` operates per-directory — every file under the
  prefix comes along, and the non-reusable ones get removed with a
  follow-up commit in the extracted history once it's in the new repo.
  This is expected, not a bug: the source repo's own copies are never
  touched by the split.
- **Consumer repo(s)** — which repos should depend on the extracted
  module, and their package ecosystem. Detect from what's at each
  consumer's root: `Package.swift` → SPM, `package.json` → npm/yarn,
  `pyproject.toml`/`setup.py` → pip, `Cargo.toml` → Cargo, `go.mod` → Go
  modules. If a named consumer has none of these yet, that's fine (see
  step 6) — ask which ecosystem to set up. If ambiguous or unsupported,
  ask rather than guessing; **SPM is the only ecosystem with a fully
  worked example below** — for others, adapt the manifest syntax to the
  same shape (git-URL dependency pinned to a tag, wired into a package
  product/module) and say so plainly rather than improvising silently.

## 2. Extract

Per the history strategy chosen: `git subtree split` in a disposable
clone, or a fresh copy of just the reusable files. If content is mixed,
remove the non-reusable files from the extracted result with a clear
commit message — the source repo's own copies are untouched throughout.

## 3. Stand up the destination

- **New repo**: `gh repo create <org>/<name> --private` (no auto-init —
  let the extracted history become the initial history if preserving it).
  Push the extracted branch as `main`, then clone it into the workspace as
  a sibling folder, matching the naming convention of the other repos
  there.
- **Existing repo**: clone it (or use the existing local clone) and add
  the module as a new source path/target inside it.

Restructure the extracted file(s) into the destination's own
`Implementation/Sources/<Module>/` (SPM convention — adapt per ecosystem).
Carry over or write a short design note alongside the code (matching the
`module.spec.md`/`design.md` precedent of living with the code, not in
`Specification/`) — adapt existing header comments/docs rather than
inventing new rationale.

If it's a new repo, scaffold it:
- `/utopia-init` for the PDLC + activity folders.
- The `readme` skill for `README.md` — brief it on what the repo is
  actually scoped for (one module, or a family of related ones — ask if
  unclear, don't assume it'll stay single-purpose).
- `/synergy-init` for the Specs structure — its own step 0 now
  auto-detects the Utopia `Specification/` folder and nests there.

Note: a package manifest (`Package.swift`, `package.json`, etc.) stays at
the repo root even under Utopia — it's exempt from PDLC classification the
same way `.gitignore`/CI config are (see the `utopia` skill).

## 4. Package manifest

Add or update the destination's manifest to expose the module as a
product/package. For SPM:

```swift
// swift-tools-version: 6.0
import PackageDescription
let package = Package(
    name: "<RepoName>",
    products: [.library(name: "<Module>", targets: ["<Module>"])],
    targets: [.target(name: "<Module>", path: "Implementation/Sources/<Module>")]
)
```

Commit. Tag an initial version — `0.1.0` if the repo has no tags yet,
otherwise bump appropriately (new product in an existing package with
tags ⇒ likely a minor bump). Push the tag.

## 5. Update the source repo

Remove the extracted file(s). If the source repo still needs the module,
add the destination as a dependency (same manifest pattern as consumers,
step 6) and add the necessary `import` statements where the removed code
was used. Commit.

## 6. Wire each named consumer

For each consumer repo:
- If it already has a package manifest, add the destination as a
  dependency pinned to the tag from step 4, and add the product to
  whichever target(s) need it.
- If it has **no** manifest yet (no implementation code at all), create a
  minimal one plus **one placeholder target** that imports the new module
  and otherwise does nothing — proves the dependency resolves and builds,
  clearly commented as scaffolding to replace once real implementation
  starts. Don't invent the consumer's actual module design.

Build in each repo where a toolchain is available (`swift build` for SPM)
to confirm resolution and compilation before committing.

## 7. Verify

- Build succeeds in the destination and every consumer repo.
- The source repo no longer contains the extracted file(s); anything that
  stayed (mixed-content case) is unchanged.
- If history was preserved, `git log --follow` on the extracted file in
  its new location shows commits from before the extraction.

## 8. Report and push

Commit and push every touched repo automatically once scope was confirmed
in step 1 — this matches `/utopia-init`'s and `/utopia-submodule`'s
existing convention of not re-asking after the upfront confirmation.
Report plainly rather than push if something fails (no remote, diverged
history, auth) — never force-push to work around it.

Summarize: the destination repo (new or extended, with its URL), what
moved, what tag was cut, and which consumer repos were wired — including
any that got a placeholder target.

## Cautions

- Never force-push or rewrite an existing repo's history to accomplish
  this — only the *extracted* copy's history is rewritten (via subtree
  split into a disposable clone), never the source repo's own history.
- Don't run this speculatively. Mentioning that some code *could* be
  shared is not the same as the user asking for it to be extracted now —
  only act on a module the user explicitly names.
- `git add -A` before committing in any touched repo can sweep in
  unrelated pre-existing uncommitted changes. Check `git status` first and
  commit only what belongs to this operation, or call out clearly in the
  report if something unrelated got bundled in.

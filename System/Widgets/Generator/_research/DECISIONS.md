---
type: decision-record
title: "Generator — locked architectural decisions"
description: "Decisions Luke made before Phase 2 build. Binding on every builder agent. Do not re-litigate."
---

# Generator — Locked Decisions

Made by Luke, 2026-08-11, before the Phase 2 build. **Binding.** A builder agent that
disagrees raises it rather than silently deviating.

---

## D-1 — One shell, two modes

There is **one** chassis, `System/Widgets/Generator/_shell/`, serving all four cartridges.
Mode is declared per-cartridge in `config.yaml`:

```yaml
generator:
  mode: analyse   # or: present
```

| Mode | Cartridges | Surface |
| :--- | :--- | :--- |
| `analyse` | AiCharacteristics | Paste up to a page of text → tokenize → highlight characteristics → explainer on request. Parser-shaped. |
| `present` | Riddle, FolkTale, Psychometric | "Generate" pulls an item from the baked pool → display → per-cartridge interaction (clue / check-answer / beat-highlight) → one-click copy. |

This mirrors Parser's "one copy, N cartridges" discipline (SR-4 — share, don't copy-paste).
Nothing in `_shell/src/` may reference a cartridge by name.

Mode-specific chassis code lives in clearly separated seam files, not in branching
spaghetti inside `ui.js` (SR-1 — one file, one job).

---

## D-2 — Tier A baked pool, with optional Tier B refresh

**Default and offline path is pure Tier A.** The shipped single-file HTML contains a
content pool compiled in at build time. The widget works fully with no network and no key.

**Tier B is an opt-in enhancement**, per `System/Suggestions/Parser_guide.md` §4:

- The user pastes a Claude API key into a settings field in the widget.
- The key is held in `localStorage` only. It is **never** hardcoded, never written to a
  content file, never committed (SR-5). This repo is a git repo inside Dropbox — a secret
  written here is a secret synced and committed.
- Tier B **must degrade gracefully**: no key, or offline, or a failed request → the refresh
  button greys out with a note, and every Tier-A function keeps working. A Tier-B failure
  never breaks the widget (JS-2, JS-5 — loading state before the fetch, error state on
  failure).
- All `fetch()` calls are centralized in one `api.js` (JS-5), not scattered.

**The harvesting skill is the primary content path, not Tier B.** The skill (agent-side)
researches and grows the content `.md` files between builds; the build compiles them in.
Tier B in the widget is for a live top-up, not the main supply.

---

## D-3 — Abstract reasoning items are SVG generated from a rule spec

Psychometric category 3 (Abstract / Diagrammatic / Fluid Reasoning) stores each item as
**structured data**, not literal markup:

- A grid/matrix declaration, each cell described by shape, count, rotation, shading,
  position.
- The rule(s) that generate the sequence.
- A JS renderer draws the SVG at display time from that spec.
- **The same spec drives the answer check** — the correct option is derived from the rule,
  not hand-recorded separately, so the two cannot drift apart.

Hand-authored per-item SVG markup is rejected: it bloats the content files and makes every
new item a drawing job.

SVG follows the SVG rules in `Memory/Long-Term/Coding/vibe-coding-rules.md`: always a
`viewBox` (SVG-1, case-sensitive), self-closed empty tags (SVG-2), painter's-model source
order rather than any appeal to `z-index` (SVG-3), semantic shapes before `<path>` (SVG-4),
`fill`/`stroke` rather than `background-color`/`border` (SVG-5).

---

## Standing constraints (not decisions — house rules that already bind)

- `Memory/Long-Term/Coding/vibe-coding-rules.md` governs all code. Python stdlib only, no
  bundler, no framework, no pip (SR-2, PY-1, JS-7).
- `System/Widgets/Parser/` is **read-only reference** for this project. Copy patterns from
  it; never edit it.
- The shell's design tokens (`_shell/StyleGuide/css/tokens.css`) are the styling
  vocabulary. Never hardcode a value that belongs in a custom property (CSS-2).
- Tests are stdlib runners only — `unittest` for Python, `node:test` + `node:assert/strict`
  for JS (TEST-1), smoke-depth not exhaustive (TEST-2), fake DOM hand-built rather than
  jsdom (TEST-8).
- The build fails loudly and non-zero on any missing manifest field or file; it never ships
  a silently-broken cartridge (PY-6).

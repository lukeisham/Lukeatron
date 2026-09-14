---
name: "!BuildParserCartridge"
description: >
  Clone-and-build recipe for a new Parser-widget cartridge against the shared
  _shell/ chassis (System/Widgets/Parser/_shell/). Copies Grammar/cartridge/ as
  a skeleton, swaps in the new subject's config.yaml/engine/explainer/content,
  runs the shared assembler, and iterates on whatever the assembler's own
  validation names until a clean build ships. Twelve of the thirteen planned
  parser widgets (all but Grammar) still need this.
type: Skill
status: Active
domain: PersonalResearch (coding / amateur builds — Lukeatron Parser widgets)
intent: "Give every new parser cartridge the same deterministic build path Grammar proved, so the twelve remaining widgets (Style, Rhetoric, Logic, Interpretation, Story-tension, Tropes & symbols, Fact-checking, Systematic Theology, Biblical Theology, Greek and Hebrew, Biblical symbols and cross-references, Biblical Commentary) get built the same repeatable way instead of re-deriving the shell contract by hand each time."
version: 1.0.0
dependencies: [System/Widgets/Parser/_shell/README.md, System/Widgets/Parser/_shell/Specs/ParserShell.spec.md, System/Widgets/Parser/Grammar/cartridge]
calibration:
  context: [Personal Research, Teaching, Church]
  level: Extended
  scope: Local
memory_footprint:
  read: [System/Widgets/Parser]
  write: [System/Widgets/Parser]
---

## ⚡ TRIGGER
Primary: `!BuildParserCartridge`
Fires when: Luke asks to "build the `<X>` parser", "make a cartridge for `<X>`", "wire up `<X>` as a
parser widget", "clone the parser chassis for `<X>`", or the next item on the Parser build-out list
(`System/Widgets/setup/parser-widgets-research.md`) is picked up.
Scope: one parser at a time — the folder named in the request under `System/Widgets/Parser/<Store>/`.
Never touches `_shell/` (D-3: nothing shell-side is cartridge-specific; if a fix seems to require
editing `_shell/`, that's a shell bug, not a cartridge quirk — stop and flag it instead of patching
the shell inline).

## 🧭 CORE PRINCIPLE
**Grammar is a cartridge, not a template to copy-paste from.** Every other parser is built by
conforming to the shell↔cartridge contract (`ParserShell.spec.md`), not by hand-editing a Grammar
clone — the assembler is the enforcement mechanism, not a courtesy. It fails loud and non-zero on
any contract violation (PY-6) rather than shipping a broken widget silently.

## 🛠️ LOGIC

STEP 1 — CONFIRM inputs exist for `<Store>`:
  ASSERT `System/Widgets/Parser/<Store>/<Store>_content.md` exists ELSE STOP, tell Luke the content
    must be drafted first (not this skill's job).
  IF content is still marked DRAFT, or carries `[UNVERIFIED]` / `[PROPOSED SCOPE]` flags THEN
    surface them explicitly and AWAIT Luke's sign-off before building — never treat an unreviewed
    draft as final just because it exists.

STEP 2 — SKELETON.
  COPY `Grammar/cartridge/` → `<Store>/cartridge/` (structure only, per `_shell/README.md`
    §"Cloning a new parser").

STEP 3 — SWAP the four cartridge blocks (nothing in `_shell/` changes — D-3):
  a. `cartridge/build/config.yaml` — `cartridge.name/id/version/builtFrom`,
     `parser.inputUnit/cap/levels/tentativeThreshold`, `colours.palette`,
     `files.engine`/`files.explainer` (+ optional `files.styles`/`files.content`), `lexicon.*`
     (only if this parser genuinely needs one — most don't; see `_shell/README.md`'s manifest
     field list), `spelling.enabled` (opt in per `_shell/README.md`'s "Spelling module" section —
     default to `true` unless there's a stated reason not to).
  b. `<engine>.js` — MUST export exactly `{ parse, tokenize, CLOSED }`
     (`_shell/README.md` §"What a cartridge must provide").
  c. `<explainer>.js` — MUST export exactly the nine names: `tables, rules, toMarkdown, toText,
     funcOf, phraseOf, clauseOf, posShort, needSpace`.
  d. Content — either compile a `<content>.json` from `<Store>_content.md`, or point
     `files.content` straight at the markdown file (the assembler's best-effort outline compiler
     handles it — see `assemble.py`'s `compile_content_markdown()` docstring for format/limits).

STEP 4 — BUILD.
  RUN `python3 _shell/build/assemble.py <Store>/cartridge`
  IF non-zero exit ➔ the assembler names the exact missing/invalid field — fix THAT field, never
    work around the check, then re-run.
  REPEAT UNTIL clean build.

STEP 5 — VERIFY.
  OPEN the built `<Store>_parser.html` in a browser; test against the content file's own worked
    example(s), not an invented one.
  ASSERT no console errors, focus-level switching works, and — if `spelling.enabled` — spell-check
    and the footer attribution both render correctly.

STEP 6 — SPEC + CLOSE.
  WRITE a short spec citing `Grammar/Specs/Done/GrammarParser.spec.md` and
    `_shell/Specs/ParserShell.spec.md` as prerequisites (per `Parser_guide.md` §5b) — record only
    this parser's deltas, never restate the shared contract.
  UPDATE the parser's project registry (`Memory/Medium-Term/Projects/<code>-<store>-app/registry.md`)
    — mark the chassis and build-app actions done.

## ✅ OUTPUT
State: `<Store>/cartridge/` builds cleanly to `<Store>_parser.html` via the shared assembler,
  browser-verified against the content file's own worked example, with a short spec on file.
Validation Check (Self-Test):
  `VERIFY <Store>_parser.html exists AND assemble.py exit code == 0 AND no "__PLACEHOLDER__" string
  survives in the output ELSE fix the assembler-named field and re-run.`
Log: `[AGENT: !BuildParserCartridge] [SUCCESS] cartridge=<Store> | tokens≈[N]` →
  `Memory/Long-Term/Logs/skills.log`
Error path: Content still DRAFT / `[UNVERIFIED]` / `[PROPOSED SCOPE]` ➔ stop and route to Luke —
  never build a shipped widget against unreviewed content.

## 🎨 House style — SUBORDINATE

`!HouseStyle` is an always-on core skill (`.claude/skills/!HouseStyle/`) and the default for every rendered surface.
This surface is classified **SUBORDINATE** in its `reference/sources.md` register: the existing
chassis keeps **layout and structure**; the house style governs **tokens, motion, glyphs and
focus**. A new cartridge inherits the Parser chassis and therefore inherits this verdict — it takes the shared tokens rather than defining its own.

Do not invent a palette, spacing value or easing curve here. The flourish budget is counted
(2 animating elements · 3 elevation levels · 2 accent hues · 2 glyph weights · 3 motion durations
· 2 typeface families per view) — exceeding a count is a failure, not a judgment.

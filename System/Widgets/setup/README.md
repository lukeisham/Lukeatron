# Parser Widgets — Setup Files

**Temporary working files.** These are the scaffolding for building the parser widgets, not the widgets themselves.

## ⚠️ Disposal note

> **Once setup is complete, everything in `System/Widgets/setup/` gets moved to `/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/Trash`.**
>
> "Setup complete" = all thirteen parser widgets are built, tested, and living in `System/Widgets/Parser/`. Until then these files stay here and are the working reference for delegating build work.

## Where things live

| Path | Holds |
| :--- | :--- |
| `System/Widgets/Parser/` | **Every parser, fully centralised.** One folder per parser (`Grammar/`, `Rhetoric/`, `Logic/`, …), each holding its `build/` source, content draft, raw research material, and — once built — the shipped `<Store>_parser.html`. Only Grammar's is built so far. |
| `System/Widgets/setup/` | **This folder** — research, design system, and status report used to plan the builds. Bound for `Trash/` on completion. |

## Contents

| File | Purpose |
| :--- | :--- |
| `parser-widgets-research.md` | Per-parser research (13 parsers): purpose, reasoning tiers, output/UI, work done, work remaining, file inventory — plus a cross-cutting synthesis. The source of truth for delegating build work. |
| `parser-widgets-report.html` | The status review report — exec summary, status matrix, chassis UI mockup, 5-step remaining pipeline, per-parser cards, open decisions. Open in a browser. |
| `parser-widgets-design.md` | The design system behind the report (CSS, HTML conventions, parser-UI mockup snippet). Reusable if the report is regenerated. |

## Note on source files

**Everything parser-touched is centralised (2026-08-09), and the build system moved to a shared shell (2026-08-10).** The old pattern below — a `build/` folder of identical `template.html`/`build_parser.py`/`build_lexicon.py` clones inside each parser folder — has been retired (`System/Plans/New/parser-shell-and-spelling-module.md`, Step 8). Each of the 13 parsers now has one folder, `System/Widgets/Parser/<Store>/`, holding:

- `<Store>_content.md` — the editable content source, at the widget root (drafted for all 13; Fact-checking's is a stub)
- any raw research material that feeds the content draft (e.g. Rhetoric's schema map + two JSON databases, Logic's Fallacies/Syllogisms/Ways-of-Thinking folders)
- `cartridge/` — Grammar only so far — the parser's code (`config.yaml`, `<store>_engine.js`, `<store>_explainer.js`, compiled content JSON, lexicon `.db` if needed), assembled against the shared shell at `System/Widgets/Parser/_shell/`
- Grammar only, additionally: `Specs/Done/GrammarParser.spec.md`
- the shipped `<Store>_parser.html`, once built (only Grammar's exists so far)

New parsers are built as a `cartridge/` against `_shell/` (`_shell/README.md` §"Cloning a new parser"), not by cloning a template — the 12 other parsers have no `build/` folder until their cartridge is built.

**What stayed in `Memory/Long-Term/<Store>/`:** nothing but a pointer `_index.yaml` per store, noting the move and reserving the store name for any future non-parser content. Biblical Commentary's six SWORD modules (`CalvinCommentaries`, `Clarke`, `DTN`, `KingComments`, `RWP`, `Scofield`) also moved, on 2026-08-09, out of `Memory/Long-Term/Bible/` into `System/Widgets/Parser/Biblical Commentary/` — Bible/ keeps everything else (Bible Reports/, QuotingPassages/, the translation module), since those serve general Bible-reference purposes beyond this one parser.

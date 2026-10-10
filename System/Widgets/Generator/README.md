# Generator

The shared build kit for the present-mode generator apps (Riddle, FolkTale, Psychometric). It holds
the chassis every cartridge is assembled on (`_shell/`), the MiniWiki module the cartridges embed
(`_modules/MiniWiki/`), and the seed research their content pools compile from (`_research/seed/`).
The apps themselves live in `System/Apps/`; this folder ships no page of its own. The shell's
contract and build commands are in `_shell/README.md`.

## Navigation

```
Generator/
├── README.md
├── app-decisions.md
├── _shell/
│   ├── README.md
│   ├── Specs/
│   ├── StyleGuide/
│   ├── build/
│   │   ├── assemble.py
│   │   ├── miniyaml.py
│   │   └── vendor/
│   ├── src/
│   └── tests/
├── _modules/
│   └── MiniWiki/
└── _research/
    ├── DECISIONS.md
    ├── seed/
    │   ├── folk-tales.md
    │   ├── psychometrics.md
    │   ├── riddles.md
    │   └── ai-characteristics.md
    └── screenshots/
```

## Cross-app behaviour

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| `_shell/build/assemble.py` | `System/Apps/{Riddle,FolkTale,Psychometric}/` | Bakes each app's `cartridge/build/` into its `*_generator.html` | A shell contract change breaks every app's build until its cartridge matches; rebuild all three after any `_shell/src/` edit |
| `_research/seed/*.md` | Each app's pool builder (`compile_riddle_pool.py`, `build_folktale.py`, `build_psychometric.py`) and their tests | Seed text compiles into `pool.json` and the app's content `.md` | Moving or renaming a seed file breaks that app's rebuild and tests |
| `!HarvestWidgetContent` | `_research/seed/*.md` | Appends de-duplicated items with provenance | A seed format change needs the matching pool builder updated |
| `_modules/MiniWiki/` | `assemble.py`, each app's build | `extract_articles.py` turns the content `.md` into `*.miniwiki.json`; the bundle is inlined | Build fails if the module or its `dist/` bundle is missing |
| `System/Tools/web-shared/escape-html.js` | `_shell/src/escape-html.js` | Verbatim copy; `assemble.py` strips `export` and inlines it before the engine, so cartridge engines call the global `escapeHtml` | Editing only one copy lets the two drift |
| `assemble.py` | `_modules/Spelling/` | Looked for only when a cartridge sets `spelling.enabled` | That folder exists only under `System/Widgets/Parser/_modules/`, so enabling spelling fails the build |
| Home launcher | Each app's `*_generator.html` | Served as a `file` | A second output file would need serving too |

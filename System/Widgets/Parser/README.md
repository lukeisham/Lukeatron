# Parser

The module library and research left from the Parser widget family. The Parser chassis itself is
retired; the live chassis is `System/Widgets/Generator/_shell/`. What remains here is the Spelling
module (an embedded-SQLite English spell checker any widget can opt into), an earlier copy of the
MiniWiki module, the research behind both, and a scratch Grammar build. No running app imports
from this folder today.

## Navigation

```
Parser/
├── README.md
├── app-decisions.md
├── _modules/
│   ├── Spelling/
│   │   ├── README.md
│   │   ├── Specs/
│   │   ├── bench/
│   │   ├── build/
│   │   ├── data/
│   │   ├── dist/
│   │   ├── src/
│   │   └── tests/
│   └── MiniWiki/
├── _research/
│   ├── DECISION-dictionary-source.md
│   ├── dictionary-sources.md
│   ├── fuzzy-matching.md
│   ├── persistence-ui-testing.md
│   └── shell-cartridge-audit.md
└── _scratch_build/
    └── Grammar_scratch.html
```

## Cross-app behaviour

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| `_modules/MiniWiki/` | `System/Widgets/Generator/_modules/MiniWiki/` | Same module, two copies; the Generator copy is the one builds use, and the two have drifted | Editing this copy changes no built page |
| `_modules/Spelling/` | `System/Widgets/Generator/_shell/build/assemble.py` | `assemble.py` expects Spelling at `Generator/_modules/Spelling/`, not here | A cartridge that sets `spelling.enabled` fails to build until the module is moved or the path changed |
| `!BuildParserCartridge`, `System/Suggestions/Parser_guide.md`, `System/Widgets/setup/` | This folder | Describe the per-parser layout the Parser family was planned on | Those documents describe folders that no longer exist here |

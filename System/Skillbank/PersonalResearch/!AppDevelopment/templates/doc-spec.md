<!-- Template — THE documentation spec. Exactly one exists per project, always, whatever the size.
     Its scope is deliberately narrow (Vibe Coding Rules SR-7). It carries only the three sections
     below. It never walks through function bodies, never restates logic in prose, never writes a
     usage tutorial, and never says anything the code already says through its own names.
     No key-decisions section: the code is self-documenting. An architectural point that crosses
     an app/host boundary or spans more than one file belongs in section 1 instead (it folds into
     README). A decision Luke explicitly wants logged goes straight into app-decisions.md → Key
     decisions, the moment it is made — never authored here first.
     No spec survives Phase 4 — sections 1 and 2 fold into README.md, then the whole spec is
     deleted with the rest. Write every line to be worth keeping there.
     Delete these comment lines. -->

# <Name> — Documentation Spec

prd_version: <the PRD version this was written against>
status: <drafting | current | stale>

## 1. Cross-app behaviour

<What talks to what, across a module or host boundary: what each side may assume about the other,
and what breaks if that assumption changes. Only behaviour that crosses a boundary belongs here —
anything inside one module belongs in that module's own spec.
Also carries any architectural point that is itself cross-app or multi-file — the reasoning behind
a shared boundary, not just its runtime contract — since the code alone cannot show why a seam
sits where it does.
For a widget this always includes its host-app boundary (the job it does for the host app, where
it mounts, what it receives from the host app, what it emits back). An app has no host boundary — only module boundaries apply.>

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| | | | |

## 2. Navigation map

<An ASCII-style site map. Structure only — no per-file "what it does / why it's separate"
commentary; that is what the code's own name and contents are for.>

```
<Name>/
├── <file or folder>
├── <file or folder>
└── <folder>/
    └── <file or folder>
```

## 3. Granted rule exceptions
See `../../app-decisions.md` → Rule exceptions. That file is the only record; do not copy it here.

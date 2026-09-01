<!-- Template — THE documentation spec. Exactly one exists per project, always, whatever the size.
     Its scope is deliberately narrow (Vibe Coding Rules SR-7). It carries only the four sections
     below. It never walks through function bodies, never restates logic in prose, never writes a
     usage tutorial, and never says anything the code already says through its own names.
     No spec survives Phase 4 — this one is folded down into _template/README.md and then deleted
     with the rest, so write every line to be worth keeping there. Delete these comment lines. -->

# <Name> — Documentation Spec

prd_version: <the PRD version this was written against>
status: <drafting | current | stale>

## 1. Cross-boundary behaviour
<What talks to what, across a module or host boundary. What each side may assume about the other,
and what breaks if that assumption changes. Only behaviour that crosses a boundary belongs here —
anything inside one module belongs in that module's own spec.>

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| | | | |

## 2. Key decisions
<Architectural and functional. Each one gets its reason — the reason is the point. A decision
without a reason is a note, and notes belong in the PRD.>

| # | Decision | Reason | Rejected alternative |
|---|---|---|---|
| D-1 | | | |

## 3. Navigation map
<Lightweight. What lives where, and why. Not a file listing — a reader's map.>

```
<Name>/
├── <file>            <what it does, why it is separate>
├── <file>            <what it does>
└── <folder>/         <what lives here>
```

## 4. Granted rule exceptions
<Every break from Memory/Long-Term/Coding/vibe-coding-rules.md that Luke explicitly granted,
with the reason he was given. This table and the registry's must match exactly.
Empty is the normal state.>

| Rule ID | Where | Reason | Granted on |
|---|---|---|---|
| — | — | — | — |

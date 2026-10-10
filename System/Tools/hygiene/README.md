# Hygiene hook

Catches silent drift at the end of each turn, without adding a skill. A Claude Code hook starts it; Luke never runs it. It fixes the mechanical part itself (store indexes) and asks Claude once about the parts that need judgement (an uncatalogued skill, Major-looking work with no plan).

## Navigation
```
hygiene/
├── hook.py
├── tests/
└── state/            (local, not in git; one <session>.json each, pruned after 7 days)
```

## Behaviour
```
 Edit / Write / Bash touches Memory/Long-Term · Outbox/ · Skillbank · Plans · CLAUDE.md · .claude/skills
        │  PostToolUse hook  →  hook.py mark      (notes the path; silent)
        ▼
 turn ends ── Stop hook ──→  hook.py stop         (only this turn's new paths)
        │   Long-Term touched ............... memory_index.py sync → note to Luke if it added or dropped entries
        │   Skillbank touched, catalog gap .. holds the turn once: name the SKILL.md missing from _index.yaml
        │   Long-Term / Outbox / High-impact
        │     edited, no plan this session .. holds the turn once: minor or Major? if Major, !CreatePlan
        │   anything goes wrong ............. one issues.log line, exits quietly
```

## Rules it applies
- **Plan question.** Only Edit/Write paths count, because a shell command line cannot show what was written. A plan counts when this session edited a file in `System/Plans/`, or any plan there changed after the session's first noted edit. Asked at most once per session.
- **Exempt from the plan question.** The single-write skills (CLAUDE.md *Routing gate*): the pastoral log and the `People/` records written beside it (`!PastoralNote`); `LukeatronWiki/` and the subject-store write made in the same session (`!IdeaWiki`). Also `Logs/` and every `_index.yaml`.
- **Never held twice.** When a Stop hook has already held the turn (`stop_hook_active`), it only syncs and notes.
- **Never edits content.** The only write is the mechanical index sync, which `memory-lint.sh` also runs every Sunday.

## Tests
`python3 -m unittest discover -s System/Tools/hygiene/tests`

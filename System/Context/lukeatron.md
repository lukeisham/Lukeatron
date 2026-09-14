# 🧠 Context · Lukeatron

> Building, maintaining, and improving the Lukeatron system itself — skills, memory structure, apps/dashboards, and the harness it runs on. Split out of Personal Research (2026-09-12) once system work became substantial enough to need its own charter, tone, and Quick Decision Guide row.

```
CONTEXT      Lukeatron
TRIGGERS     build/fix/refactor a skill · memory structure · Skillbank · ProjectKanban / LukeatronWiki viewer · CLAUDE.md · the Lukeatron system itself
LOADS WITH   !DetermineContext  →  /context
TONE         precise, self-critical, house-style-consistent — Luke's own voice
```

---

## ✍️ Luke's To-Dos — *Lukeatron*

<!-- Scratchpad: jot quick to-dos for this domain. Tick [x] when done; clear out the dead ones whenever. -->

- [ ]
- [ ]

---

## 🎯 What this context is for

Active, hands-on work **on Lukeatron itself** — the agent system Luke runs this whole operation through. If the primary goal is "make Lukeatron work better / fix something broken in it / extend how it operates," this is the context — as distinct from Personal Research, which is research (and the *other* builds — a website, a macOS app) that Lukeatron merely helps produce.

- **🛠️ Creating skills** — authoring new capability/checkpoint skills to the house format (frontmatter → ⚡TRIGGER / 🛠️LOGIC / ✅OUTPUT, plus `manifest.json` and `EVAL.md`).
- **♻️ Refactoring skills** — tidying, consolidating, deleting and repairing existing skills (e.g. broken top-level symlinks under `.claude/skills/`, aligning log paths, pruning dead sub-skills).
- **🧩 Apps & viewers** — ProjectKanban (`System/Apps/ProjectKanban/`), LukeatronWiki (`System/Apps/LukeatronWiki/`), and any other internal tooling.
- **🗂️ Memory structure** — the Long-Term/Medium-Term layout, store conventions, `_tracking.yaml`, `_index.yaml` doctrine.
- **🧠 Learning how Claude works** — the harness: skills & slash commands, hooks, MCP servers, memory, settings, subagents, and how it wires into the CLAUDE.md bootloader.
- **📄 CLAUDE.md itself** — the operating manual, subject to the sign-off rule below.

**Working posture (a build bar, not a research-citation bar):**
- Match existing house style before inventing a new one — *read a sibling skill/app file first.*
- When touching a **key skill, checkpoint, template, or CLAUDE.md**, get Luke's explicit sign-off (per CLAUDE.md's Key Skills list).
- Verify against reality (read the actual files) rather than trusting the sitemap or a doc — they drift.
- Surface drift, breakage, and loose ends plainly; don't paper over them.

---

## 📐 Project Charter — Lukeatron

> Every project in this context inherits the following. A project's `purpose:` **specialises** the North Star; its **Definition of Done** is the baseline acceptance test. `!CreatePlan` derives the Objective + Success criteria from here; `!ReviewPlan` checks the plan against it.

**North Star** — Keep Lukeatron correct, legible, and doing what CLAUDE.md says it does; extend it deliberately, never by accident.

**Definition of Done** — the thing actually works / ships (verified against reality, not the sitemap); matches existing house style (read a sibling first); a core skill/checkpoint/template/CLAUDE.md change carries Luke's explicit sign-off; no silent drift between CLAUDE.md and the System Guide / skill bodies it describes.

**Guardrails**
- Never modify a **Key Skill, Checkpoint, or Template** (per CLAUDE.md's list) without Luke's explicit sign-off.
- Never modify **CLAUDE.md** itself without Luke's explicit sign-off.
- Anything that leaves the system or changes Long-Term memory clears `!Checkpoint`.
- Log every skill failure to `Logs/skills.log`, per *Failure Handling*.

---

## 🧰 Capability skills on call

| Need | Skill | Shell |
| :--- | :--- | :--- |
| Plan a major system change | `!CreatePlan` → `!ReviewPlan` | — |
| Capture a repeatable step as a skill | `!Suggest` | — |
| Web research on harness/tooling behaviour | `!HeadlessChromeBrowser` | — |

(Capability skills load on demand — only when the task reaches for them.)

---

## 🗃️ Memory this context leans on

- `Memory/Long-Term/Lukeatron/` — system documentation: memory structure & LukeatronWiki doctrine, Outbox protocol, thumbnail conventions
- `Memory/Long-Term/Coding/` — coding conventions & notes
- `Memory/Medium-Term/Projects/_tracking.yaml` — the project board this context's work often shows up on
- `System/Skillbank/_index.yaml` — the on-demand skill catalog
- `System/Apps/`, `System/Tools/` — the dashboards and viewers this context builds/maintains

> Native memory (`.Claude/memory.md`) carries *working-style* preferences only — not domain facts.

---

## 🔁 How a task flows here

```
prompt / Inbox item
      │
      ▼
 !DetermineContext ──► Lukeatron
      │
      ▼
 minor?  ── execute directly ──► !Checkpoint
      │
 major?  ── !CreatePlan ► !ReviewPlan ► execute ► !Suggest ► !Checkpoint
```

*Checkpoint before anything leaves the system or changes Long-Term memory. Core-skill/CLAUDE.md changes stop for Luke's sign-off regardless.*

---

*Work that turns out to be research (not build) belongs in Personal Research instead — move it there rather than stretching this context to cover it.*

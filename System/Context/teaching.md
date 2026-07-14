# 🎓 Context · Teaching

> Aspirational prep for a potential career in teaching — building eight online parser-tools (chassis/cartridge pattern, one reference chassis in Grammar) across English grammar, rhetoric, interpretation, logic, style, story-tension, tropes & symbols, and fact-checking, from open-source information.

```
CONTEXT      Teaching
TRIGGERS     grammar · rhetoric · interpretation · logic · style · story-tension · tropes & symbols · fact-checking · teaching tools
LOADS WITH   !DetermineContext  →  /context
TONE         clear, instructive, example-led — Luke's own voice
```

---

## ✍️ Luke's To-Dos — *Teaching*

<!-- Scratchpad: jot quick to-dos for this domain. Tick [x] when done; clear out the dead ones whenever. -->

- [ ]
- [ ]

---

## 🎯 What this context is for

This context is **aspirational** — groundwork for a possible teaching career, not active classroom work. The whole of it is the building of **eight specific online parser-tools**, one per area, each built on **open-source information** and sharing the chassis/cartridge architecture established by the Grammar reference build (`Memory/Long-Term/Grammar/Specs/GrammarParser.spec.md`; `System/Suggestions/Parser_guide.md`):

- **✏️ Grammar** — English grammar (parsing, analysis) — the reference chassis, built
- **🗣️ Rhetoric** — the art of persuasion and composition
- **🔍 Interpretation** — reading and interpreting texts
- **🧮 Logic** — reasoning, argument structure, fallacies
- **🎨 Style** — prose style pattern-matching
- **🎬 Story-tension** — plot/tension analysis of a scene
- **🐉 Tropes & symbols** — literary trope and symbol detection
- **✅ Fact-checking** — claim/source verification

If the primary goal is developing one of these eight tools or the knowledge behind it, this is the context.

---

## 📐 Project Charter — Teaching

> Every project in this context inherits the following. A project's `purpose:` **specialises** the North Star; its **Definition of Done** is the baseline acceptance test (a project may add to it, never drop below it). `!CreatePlan` derives the Objective + Success criteria from here; `!ReviewPlan` checks the plan against it.

**North Star** — Advance one of the eight aspirational tools (grammar · rhetoric · interpretation · logic · style · story-tension · tropes & symbols · fact-checking), built chassis-first from the Grammar reference architecture, on open-source material.

**Definition of Done**
- The tool works standalone in its area and is consistent in approach with the others (shared chassis, own cartridge).
- All source material is open-source, with provenance recorded.

**Guardrails**
- Open-source sources only; cite provenance.
- Match the house templates before inventing a new format.

---

## 📌 Current Focus — *Building the eight tools* ⚠️ IMPORTANT

> **The dominant work in this context is building the eight online parser-tools** — grammar, rhetoric, interpretation, logic, style, story-tension, tropes & symbols, and fact-checking — sharing Grammar's chassis and drawing on open-source source material.

**Working posture for this focus:**
- Source from **open-source** material; keep provenance clear.
- Build each tool to stand on its own area, but keep them all consistent in approach (shared chassis, per-aide cartridge — see `Parser_guide.md` §5b).
- Match Luke's existing house style and templates before inventing new ones.

---

## 🧰 Capability skills on call

| Need | Skill | Shell |
| :--- | :--- | :--- |
| Web research (open-source material) | `!HeadlessChromeBrowser` | — |
| Build a knowledge page | `!GenerateWiki` | — |
| Plan a major task | `!CreatePlan` → `!ReviewPlan` | — |

Templates this context leans on: the Grammar chassis (`Memory/Long-Term/Grammar/build/template.html`) is the reference clone-source for all eight tools; `Parser_guide.md` is the build playbook.

(Capability skills load on demand — only when the task reaches for them.)

---

## 🗃️ Memory this context leans on

- `Memory/Long-Term/Grammar/` — grammar reference & rules (reference chassis)
- `Memory/Long-Term/Rhetoric/` — rhetoric reference
- `Memory/Long-Term/Logic/` — logic reference
- `Memory/Long-Term/Interpretation/` — interpretation (hermeneutics) reference
- `Memory/Long-Term/Style/` — prose style reference
- `Memory/Long-Term/Story-tension/` — story tension/plot structure reference
- `Memory/Long-Term/Tropes & symbols/` — literary trope/symbol reference
- `Memory/Long-Term/Fact-checking/` — fact-checking sources & method
- `Memory/Long-Term/Teaching/` — teaching method & material
- `Memory/Long-Term/Method/` — working methods that cut across the tools

> Native memory (`.Claude/memory.md`) carries *working-style* preferences only — not domain facts.

---

## 🔁 How a task flows here

```
prompt / Inbox item
      │
      ▼
 !DetermineContext ──► Teaching
      │
      ▼
 minor?  ── execute directly ──► !Checkpoint
      │
 major?  ── !CreatePlan ► !ReviewPlan ► execute ► !Suggest ► !Checkpoint
```

*Checkpoint before anything leaves the system or changes Long-Term memory.*

---

*Tool-building overlaps with Personal Productivity (coding) — route here when the goal is the teaching subject matter; route to Productivity when it's purely the build mechanics.*

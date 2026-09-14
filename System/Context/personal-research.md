# 🔬 Context · Personal Research

> General research across a very broad range of topics — gathering, verifying, and synthesising knowledge to a defined standard — **and the coding / builds it feeds** (amateur builds and scripts). Building **the Lukeatron system itself** has its own context now — see `System/Context/lukeatron.md`.

```
CONTEXT      Personal Research
TRIGGERS     research · investigate · gather sources · synthesise findings · coding · amateur builds
LOADS WITH   !DetermineContext  →  /context
TONE         curious, rigorous, well-sourced — Luke's own voice
```

---

## ✍️ Luke's To-Dos — *Personal Research*

<!-- Scratchpad: jot quick to-dos for this domain. Tick [x] when done; clear out the dead ones whenever. -->

- [ ]
- [ ]

---

## 🎯 What this context is for

Research, **very broadly** — both standing interests and one-off investigations as they arise. The range of topics is wide; the live map of it is the subject stores in `Memory/Long-Term/` (Bible, Philosophy, Sociology, Medical, Theology, Wisdom, Writing, YouTube, and the rest).

It also owns **coding / builds** — amateur builds and scripts (conventions & notes in `Memory/Long-Term/Coding/`). Research and the building it feeds now live together here. Building **the Lukeatron system itself** is out of scope here — that's the Lukeatron context (`System/Context/lukeatron.md`).

If the primary goal is "find out / verify / synthesise" **or "build the thing,"** this is the context.

> **Two bars, one context.** *Research output* meets the Research standards below (MLA · peer-reviewed · no Wikipedia · Markdown+wiki). *Build deliverables* (code, scripts, skills) meet a **build bar** instead — it ships, it works, it matches house style — and are **not** held to research-citation standards. A project signals which it is via its `purpose:` and `secondary_contexts: [Coding]`.

---

## 📌 Current Focus — *The other builds* ⚠️ IMPORTANT

> The dominant work right now is two builds and the research feeding them. Both the **building** and the **research** live here. (Building Lukeatron itself moved to its own context — see `System/Context/lukeatron.md`.)

- **🌐 A website** — its build and the research feeding it
- **🍎 A macOS app in Swift** — its build and the research feeding it

**Working posture for build work (the build bar, not research-citation standards):**
- Match existing house style before inventing a new one — *read a sibling skill first.*
- When touching a **key skill, checkpoint, or template**, get Luke's explicit sign-off (per CLAUDE.md).
- Verify against reality (read the actual files) rather than trusting the sitemap — the two have already drifted.
- Surface drift, breakage, and loose ends plainly; don't paper over them.

---

## 📐 Research standards ⚠️ IMPORTANT

Apply these to all research output unless Luke says otherwise:

- **References** — **MLA** formatting.
- **Fact-checking, quotes & evidence** — **peer-reviewed journal articles**.
- **Illustrations** — **open-source** illustrations for style and visual material.
- **Strong preference against Wikipedia** — do not lean on it as a source.
- **Output format** — present research in **both Markdown and wiki formats**.
- **Source validation** — check sources against Luke's approved-domain list (`Preferences/`) before relying on them.

---

## 📐 Project Charter — Personal Research

> Every project in this context inherits the following. A project's `purpose:` **specialises** the North Star; its **Definition of Done** is the baseline acceptance test (a project may add to it, never drop below it). `!CreatePlan` derives the Objective + Success criteria from here; `!ReviewPlan` checks the plan against it.

**North Star** — Produce verified, well-sourced knowledge Luke can trust and reuse — and the working builds it feeds.

**Definition of Done** — *which branch applies depends on the project's nature:*

- **Research projects** — meet the **Research standards above** in full (MLA references · peer-reviewed sources for facts & quotes · open-source illustrations · no reliance on Wikipedia · output in both Markdown and wiki formats); every source validated against the approved-domain list (`Preferences/`).
- **Build / coding projects** (`secondary_contexts: [Coding]`) — the **build bar**: the thing actually works / ships (verified against reality, not the sitemap); matches existing house style (read a sibling first); **not** held to research-citation standards.

**Guardrails**
- No Wikipedia as a load-bearing source (research output).
- Research keepers stored to the matching Long-Term subject store; nothing uncited.
- Touch a key skill, checkpoint, or template only with Luke's explicit sign-off.
- Anything that leaves the system or changes Long-Term memory clears `!Checkpoint`.

---

## 🧰 Capability skills on call

| Need | Skill | Shell |
| :--- | :--- | :--- |
| Deep, multi-source, cited research | `deep-research` | — |
| Web research / browser actions | `!HeadlessChromeBrowser` | — |
| Build a knowledge page (wiki) | `!GenerateWiki` | — |
| Plan a major task | `!CreatePlan` → `!ReviewPlan` | — |

(Capability skills load on demand — only when the task reaches for them.)

---

## 🗃️ Memory this context leans on

- `Memory/Long-Term/` subject stores — the full topic range (Bible, Philosophy, Sociology, Medical, Theology, Wisdom, Writing Fiction/Non-Fiction, YouTube, …)
- `Memory/Long-Term/Coding/` — coding conventions & notes (build work)
- `Memory/Long-Term/Preferences/` — approved domains & source preferences
- `Memory/Long-Term/Subscriptions/` — accounts and resources available for research
- `Memory/Long-Term/Method/` — research methods

> Native memory (`.Claude/memory.md`) carries *working-style* preferences only — not domain facts.

---

## 🔁 How a task flows here

```
prompt / Inbox item
      │
      ▼
 !DetermineContext ──► Personal Research
      │
      ▼
 minor?  ── execute directly ──► !Checkpoint
      │
 major?  ── !CreatePlan ► !ReviewPlan ► execute ► !Suggest ► !Checkpoint
```

*Checkpoint before anything leaves the system or changes Long-Term memory.*

---

*Findings worth keeping are stored to the matching `Memory/Long-Term/` subject store; everything is sourced to the standards above.*

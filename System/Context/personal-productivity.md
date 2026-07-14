# 🗂️ Context · Personal Productivity

> The broadest of the four contexts — the home base. When a task doesn't clearly belong to Church, Teaching, or Personal Research, it lives here.

```
CONTEXT      Personal Productivity
TRIGGERS     email · calendar · projects · personal admin
LOADS WITH   !DetermineContext  →  /context
TONE         crisp, practical, low-ceremony — Luke's own voice
```

---

## 📅 Annual Leave

- **Mon 6 July – Mon 20 July 2026** — Luke is on annual leave. No commitments or planning-day events during this window.

---

## ✍️ Luke's To-Dos — *Personal Productivity*

<!-- Scratchpad: jot quick to-dos for this domain. Tick [x] when done; clear out the dead ones whenever. -->

- [ ]
- [ ]

---

## 🎯 What this context is for

Day-to-day personal administration and the machinery that keeps it running:

- **📨 Email** — drafting, replying, triage, routing (`!AgentMail`)
- **📅 Calendar** — events, appointments, scheduling (`!Calendar`)
- **🧩 Projects** — tracking active work in `Memory/Medium-Term/Projects/`
- **🧹 Admin** — the small, frequent, miscellaneous tasks of running a life

If the primary goal is "get this practical thing done," this is the context.

> **Coding moved.** Amateur builds, scripts, and the Lukeatron system itself now live under **Personal Research** (its build focus). Route code work there.

---

## 📐 Project Charter — Personal Productivity

> Every project in this context inherits the following. A project's `purpose:` **specialises** the North Star; its **Definition of Done** is the baseline acceptance test (a project may add to it, never drop below it). `!CreatePlan` derives the Objective + Success criteria from here; `!ReviewPlan` checks the plan against it.

**North Star** — Move Luke's day-to-day life forward: the practical thing works, with low ceremony.

**Definition of Done**
- The practical outcome actually works / ships — verified against reality, not the sitemap.
- Matches existing house style (read a sibling before inventing a new pattern).
- Anything that leaves the system or changes Long-Term memory has cleared `!Checkpoint`.

**Guardrails**
- Touch a key skill, checkpoint, or template only with Luke's explicit sign-off.
- Surface drift, breakage, and loose ends plainly — never paper over them.

---

## 📌 Current Focus — *building Lukeatron has moved*

> The Lukeatron build (creating/refactoring skills, learning the Claude harness) is **coding** and now lives under **Personal Research** → *Current Focus — Building Lukeatron + the other builds*. Route that work there.

---

## 🧰 Capability skills on call

| Need | Skill | Shell |
| :--- | :--- | :--- |
| Send / receive email | `!AgentMail` | — |
| Manage events & appointments | `!Calendar` | — |
| Web research / browser actions | `!HeadlessChromeBrowser` | — |
| Build a knowledge page | `!GenerateWiki` | — |
| Plan a major task | `!CreatePlan` → `!ReviewPlan` | — |

(Capability skills load on demand — only when the task reaches for them.)

---

## 🗃️ Memory this context leans on

- `Memory/Long-Term/Preferences/` — how Luke likes output shaped
- `Memory/Long-Term/Subscriptions/` · `Essential/` — accounts, frequent reference
- `Memory/Medium-Term/Projects/` — active project tracking
- `Memory/Medium-Term/file-locations.md` — where things actually live

> Native memory (`.Claude/memory.md`) carries *working-style* preferences only — not domain facts.

---

## 🔁 How a task flows here

```
prompt / Inbox item
      │
      ▼
 !DetermineContext ──► Personal Productivity
      │
      ▼
 minor?  ── execute directly ──► !Checkpoint
      │
 major?  ── !CreatePlan ► !ReviewPlan ► execute ► !Suggest ► !Checkpoint
```

*Checkpoint before anything leaves the system or changes Long-Term memory.*

---

*Default home context. When the goal is practical and doesn't sit squarely in another context, route here.*

---
name: Darkfactory
description: Run a multi-agent "dark factory" over a clear purpose — an Opus boss agent coordinates tiered subagents (Haiku for review/reading/internal search, Sonnet for internet research and building) to produce a finished result with minimal human involvement. Use when a task is big enough to warrant a coordinated agent fleet, or when Luke says "run the factory", "darkfactory", or "spin up agents on this".
---

# !Darkfactory — lights-out agent factory

A **dark factory** runs with the lights off: once the purpose is clear, agents do all the work and Luke only sees the gates and the finished output. The invoking agent acts as the **Boss** and never does the line work itself — it coordinates, decides, and dispatches.

## ⚡ TRIGGER

- Luke invokes it: "run the factory", "darkfactory", "spin up agents on this", "build this with subagents".
- A Major task where the plan calls for coordinated multi-agent execution.

## 🛠️ LOGIC

### 0. Purpose gate

The factory takes exactly one input: a **clear purpose** (what is being made, for whom, and what "done" looks like). If the purpose is not clear enough to write a one-sentence definition of done, **activate `!Grilling`** (Skillbank) and interview Luke until it is. Never start the line on a fuzzy purpose.

### 1. The Boss (Opus)

One **Opus-tier boss agent** runs the factory:
- Decomposes the purpose into work orders.
- Deploys subagents (below), reads their returns, and makes all decisions — subagents report, the Boss decides.
- Owns the definition of done and calls the factory finished.

### 2. The workforce — model tiers by job

| Tier | Jobs | Notes |
| :--- | :--- | :--- |
| **Haiku** | Review passes, reading files, internal searching (repo, `Memory/`, Skillbank) | Cheap, parallel — fan out freely |
| **Sonnet** | Internet research; building (code, documents, artifacts) | The making tier |
| **Opus** | The Boss only — coordination and decisions | One per factory |

Subagents may use any registered skill/tool or Skillbank skill their work order requires (load Skillbank bodies via `_index.yaml` lookup as usual).

**DeepSeek provision:** if the factory is running on DeepSeek, the tier table does not apply — **all subagents are the same model**. The Boss/workforce role split, Sandbox rule, and permission model still hold; only the model tiering collapses.

### 3. Sandbox rule

**Anything made must be tested in `Sandbox/` first.** Builds, scripts, documents, and drafts are created and exercised in `Sandbox/`; nothing promotes out of it until its test passes. Untested output never ships.

### 4. Permission model

Inside the factory, **no permissions are required** — agents read, search, draft, build, and test freely without asking. The exception is absolute: **`!Checkpoint` always fires** before any of:

- **Computer modification** — changes to files outside `Sandbox/`/`Outbox/` staging, system state, core skills, or CLAUDE.md
- **`Long-Term/` memory changes**
- **External emails** (any outgoing message)
- **Internet interactions** beyond read-only research (posting, submitting, logging in, purchasing)

`!Checkpoint` fails closed per the system rule: if it can't run, the action holds.

### 5. Output

Finished results land in **`Outbox/`** unless the invoking instructions direct otherwise (e.g. a specific project folder or store). The Boss closes with a short factory report to Luke: purpose, what was built, test results, agents used, and anything held at a `!Checkpoint` gate.

## ✅ OUTPUT

- The finished deliverable in `Outbox/` (or the instructed destination), tested in `Sandbox/` first.
- A factory report: purpose → work orders → results → gates fired.
- Any blocked actions held at `!Checkpoint`, named explicitly — never silently dropped.

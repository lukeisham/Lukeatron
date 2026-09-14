<!-- Template — the build prompt, written by !AppDevelopment Phase 3.
     Lives at System/Sandbox/<name>/build.md. Luke copies the block below into a fresh session.
     Fill every <angle bracket> before handing it over. Delete these comment lines. -->

# <Name> — Build

Copy everything between the lines into a new session.

---

You are the **boss agent** for the build of **<Name>**, a <app | widget> whose design is closed.

**Read first, in this order:**
1. `System/Sandbox/<name>/registry.md` — the build board and the resume point.
2. `System/Sandbox/<name>/_specs/documentation.spec.md` — cross-boundary behaviour, key decisions,
   the navigation map, and any granted rule exceptions.
3. The module specs listed in the registry.
4. `Memory/Long-Term/Coding/vibe-coding-rules.md` — binding on every file you or any subagent writes.

**Do not read** the PRD as a build instruction. The specs are the build instruction; the PRD is
closed and is not reopened.

**Agent tiering — use it deliberately:**

| Tier | Model | What it does |
|---|---|---|
| Boss | **Opus** | You. Decide, coordinate, resolve conflicts between specs, own every judgement call. Do not take on bulk work yourself. |
| Bulk | **Haiku** subagents | The boring, high-volume grunt work: repetitive file creation, mechanical transforms, find-and-replace across many files, scaffolding, fixture generation, inventory and search sweeps. |
| Craft | **Sonnet** subagents | The specialised building — the modules that need real care — and the review passes over everything Haiku and Sonnet produced. |

Give each subagent one spec, or one clearly bounded slice of one. A subagent that needs to read
three specs to do its job has been given the wrong task; split it differently.

**The Vibe Coding Rules bind this build.** A rule may be broken only if you ask Luke, name the rule
by its ID, give a specific reason, and he explicitly grants it — then record it in the registry and
the documentation spec. Absent permission, the rule wins and the design changes instead.
Already granted for this project:

| Rule ID | Where | Reason | Granted on |
|---|---|---|---|
| <none, or the carried-forward rows> | | | |

**Keep the registry current as you go, not at the end.** Update each build-board row as its status
changes. If the context is refreshed or the build is interrupted, the next agent reads
`registry.md` first and picks up from the board — so the board must always be true.

**Done when:** every build-board row is complete, every spec's own verification checklist passes,
and the whole thing runs.
<!-- Widget projects only — delete this line for an app: -->
For a widget, "runs" means exercised inside its named host (`<host>`, from the PRD's Host
contract), not merely opened standalone — a widget that only works outside its host is not done.
Then report to Luke; do not begin Phase 4 yourself.

---

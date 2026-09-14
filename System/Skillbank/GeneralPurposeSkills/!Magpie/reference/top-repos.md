# The Nest — top-ranked agent-skill repositories on GitHub

The deterministic survey list for `!Magpie`. Eleven repos, ranked as at 2026-09-07 — supersedes
the 2026-09-02 list, which Luke rejected as "a useful starter mix, not the best list": three
entries were broken or misnamed, two were too small or uneven to sit next to 100k+ repos, and the
list was missing the official spec plus the collections that actually dominate the ecosystem.

Order is the survey order: work down the list, stop when the question is answered.

| # | Repo | Tier | Focus | Why it ranks |
|---|------|------|-------|--------------|
| 1 | `obra/superpowers` | Core | The default agentic methodology | ~280k stars, updated through Aug 2026. The brainstorm → plan → TDD → review → verify pipeline — `!Brainstorm` was already lifted from here. If only one repo gets added, add this one. |
| 2 | `mattpocock/skills` | Core | Real-world software-engineering workflows | ~255k stars, still landing commits in early Sep 2026. `/grill-me` (forces questions before coding), `/tdd`, `/triage`. Discipline and domain modelling over quick, messy vibe coding. |
| 3 | `anthropics/skills` | Core | Official spec examples | ~175k stars, last push 3 Sep 2026. The source of the `SKILL.md` format everyone else copies. Belongs on any serious list. |
| 4 | `addyosmani/agent-skills` | Core | Production engineering workflows | ~92k stars, updated 5 Sep 2026. Verification, red flags, phase routing — more process-complete than Pocock's set, its closest peer. |
| 5 | `agentskills/agentskills` | Meta — spec | The open skill spec | ~25k stars. Not a skill pack — the contract everything else claims to follow. Read first, as context, not as item #4 in a skills list. |
| 6 | `VoltAgent/awesome-agent-skills` | Meta — index | Curated index of skill repos | One index beats ten more packs — how new high-signal skills get found without starring every niche CLI repo. (`ComposioHQ/awesome-claude-skills` is the alternate index.) |
| 7 | `rebelytics/one-skill-to-rule-them-all` | Meta — skill factory | Autonomous skill generation | ~2.3k stars, last commits late Aug 2026. Watches work sessions, captures corrections and judgement calls, writes new `SKILL.md` files. Unusual, not a "best of" general library, but useful + maintained. |
| 8 | `forrestchang/andrej-karpathy-skills` | Stable overlay | AI behavioural guardrails | Huge reach and a tight guardrail — "surgical changes" (touch only necessary lines), simplicity over agent over-engineering. Last real activity ~Apr 2026 — treat as a fixed overlay, not a living library. |
| 9 | `wondelai/skills` | Specialist — cross-discipline | Book-derived business/UX/marketing skills | ~2.1k stars, updated 29 Aug 2026. **Corrected repo name** (was misnamed `wondel-ai/wondel-agent-skills`). Source of `!RefactoringUI`, `!UXHeuristics`, `!DesignEverydayThings`, `!Microinteractions`. |
| 10 | `n8n-io/skills` | Specialist — domain-conditional | Vendor workflow/MCP automation | ~470 stars, vendor-maintained. **Corrected path** (was `n8n-io/n8n-agent-skills`, which 404s). Only worth opening when n8n is actually in scope — not a general library. |
| 11 | `rorkai/app-store-connect-cli-skills` | Specialist — domain-conditional | iOS/macOS deployment | ~1k stars, 20+ concrete App Store Connect/TestFlight/signing skills tied to a living CLI. Only worth opening when shipping iOS/macOS. |

## Removed since the 2026-09-02 list

- **`hoodini/ai-agents-skills`** — ~280 stars, uneven mix of vendor snippets and personal creative skills. Too small to rank.
- **`clean-code-agents/agents-md`** — 404, dead. No maintained architecture-doctrine repo has replaced it yet; flag this gap if that question comes up.
- **`b1rdmania/claude-plain-english-skill`** — ~41 stars. Good idea (anti-slop / Orwell-Gowers), too small for a top-10 slot. Kept only as a footnote for writing/tone questions, not a numbered row.
- **`kicad-ai/kicad-agent-skills`** — 404, dead. No first-tier hardware repo exists yet by stars/maintenance (`aklofas/kicad-happy`, `Milind220/Ki-Stack` seen but unranked).

## Optional domain add

`K-Dense-AI/scientific-agent-skills` (~43k, maintained) — a large, validated science pack. Reach
for this instead of a hardware repo when the ask is cross-discipline breadth rather than
best-engineering.

## Notes on the list

- **URL shape.** Each row is a GitHub path: `https://github.com/<repo>`. Skills usually sit at
  `skills/<name>/SKILL.md` or `<name>/SKILL.md`; the README is the fastest map.
- **Adjacency map** — which repo to raid for which question:
  - *Methodology / process pipeline* → 1
  - *Naming and command shape* → 1, 2, 3
  - *Spec / frontmatter contract* → 5, 3
  - *Discovery — "what else is out there"* → 6
  - *Skills that write skills* → 7
  - *Behavioural guardrails* → 8
  - *Non-code / cross-discipline domains* → 9, or `K-Dense-AI/scientific-agent-skills` for science breadth
  - *Tool/API plumbing* → 10 or 11 — pick the one matching the domain actually in scope
  - *Writing and tone rules* → `b1rdmania/claude-plain-english-skill` (footnote only, not a numbered row)
  - *Architecture doctrine* → no maintained pick currently; name the gap rather than guessing
- **Staleness.** Rankings move fast in this space. If this list is more than ~3 months old, say so
  in the report and offer a refresh pass rather than presenting it as current.

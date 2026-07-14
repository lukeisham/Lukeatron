---
name: "!ThinPortal"
description: >
  Build pattern (recipe) for creating a new EXTERNAL-ACCESS skill — a thin portal /
  plumbing layer that other skills and sub-agents call to reach an outside service
  (email, web, calendar, storage, an API). Read this whenever Luke asks to build, add,
  rebuild, or modernise an integration/connector/capability skill. Produces a single
  flat skill with canonical verbs, a uniform contract, and safety pushed to the caller.
type: Skill
status: Active
domain: GeneralPurpose (meta — system construction)
intent: "The reusable recipe behind !AgentMail, !HeadlessChromeBrowser and !Calendar. Use it to build the next external-access portal the same way."
version: 1.0.0
---

## ⚡ TRIGGER
Primary: `!ThinPortal`
Fires when: "build/add/rebuild a skill for <service>", "give the system access to <X>",
"make a connector/portal/pipe for <X>", or any new external-access capability.
Triggers from `!Suggest` when the proposed skill is external-access plumbing.

## 🧭 CORE PRINCIPLE
**A portal is plumbing, not a brain.** It exposes verbs and returns data; it holds no
opinions. The *thinking* — what to send, whom to invite, whether to delete, whether a
source is trustworthy — lives in the calling skill/sub-agent and with Luke. Keep the pipe
dumb so it stays reliable, and one portal = one external surface (no orchestrator + sub-skill
sprawl).

## 🛠️ THE RECIPE
1. **Verify connectivity FIRST — never build on an assumption.** Probe what is actually
   connected/authenticated before writing anything:
   - API → a read-only call with the real key (e.g. list inboxes).
   - CLI → check it installs and a `doctor`/smoke test passes.
   - MCP → call a read-only tool (e.g. `list_calendars`) to confirm auth + discover schema.
   Discover write/transmit schemas *without transmitting* (post empty/partial payloads to read
   validation errors) — and watch for endpoints that act on an empty body.
2. **Choose the backend honestly.** Prefer a connected native MCP > a maintained CLI/API >
   a hand-rolled script. Don't revive an archived approach if a first-class connector now
   exists. If multiple engines are plausible, use a **swappable registry** (markdown JSON
   blocks → dispatcher) and register a dormant fallback rather than betting on one.
3. **One flat skill.** `.claude/skills/!Name/` for a universal command; a Skillbank folder
   for a domain-specific one. Add a `scripts/` helper only if the pipe needs code (API/CLI);
   an MCP-backed portal is just a mapping doc — no script.
4. **Canonical verbs + uniform contract.** Define a small stable verb set (the caller's
   surface) that won't change even if the engine does. Pick ONE return contract: a JSON
   envelope `{ok, data|error}` for script portals; **pass-through** native output when the
   engine's format is the value (snapshot trees, event JSON). Document which.
5. **Safety belongs to the caller, but guard the footguns in the pipe.** Reads are free;
   anything outward-facing or state-changing (send, reply, post, submit, create/update/delete,
   invite) requires the caller to run `!OutgoingContentCheck` first. The portal assumes that
   was done — but still hard-guards known footguns (e.g. refuse to send empty content; default
   notifications to NONE; prefer decline over delete). Fail closed if auth is missing.
6. **Credentials by convention.** Read keys from `System/Credentials/` (dotenv `*.md` or
   `credentials.json`), env-var override first. Never inline a secret in the skill body.
7. **Zero/few dependencies.** Stdlib-only scripts where possible (e.g. Python `urllib`, no SDK).
8. **Log every call** to `Memory/Long-Term/Logs/skills.log`:
   `[WORKER: !Name] [SUCCESS|FAIL] <verb> | …`.
9. **Register it** — `.claude/skills/` auto-registers; a Skillbank skill MUST be added to
   `System/Skillbank/_index.yaml` or it is invisible.

## 🧪 WORKED EXEMPLARS (all built this way)
- **`!AgentMail`** — script portal over the AgentMail API; stdlib `urllib`; JSON envelope;
  hard guard refusing empty send/reply (the raw `reply` endpoint transmits on empty body).
- **`!HeadlessChromeBrowser`** — dispatcher + swappable `registry.md`; default backend Vercel
  `agent-browser`, Playwright registered dormant; pass-through output; judges `✓/✗` glyph, not
  exit code.
- **`!Calendar`** — no script: a mapping doc over the Google Calendar MCP; flags attendee
  events as outward-facing email; prefers `respond` (decline) over hard `delete`.

## ✅ OUTPUT
A single flat portal skill: `skill.md` (verbs, contract, safety, config) + optional
`scripts/` + optional `registry.md`, connectivity-verified, logged, and registered.

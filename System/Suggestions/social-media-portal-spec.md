---
title: Social Media Posting Portal (!SocialMedia) — Proposal
type: suggestion
status: draft
date: 2026-07-14
context: Church
related: [!ThinPortal, !AgentMail, !HeadlessChromeBrowser, !OutgoingContentCheck, Outbox/]
issue_ref: "Memory/Long-Term/Logs/issues.log — 2026-07-01, ch-03-july-estuary-execution"
---

# Social Media Posting Portal — Proposal

## Problem

Church context (`System/Context/church.md`, lines 37–39) lists external promo
(Instagram/Facebook/YouTube drafts) as in-scope, but no send-capable portal exists for
any social platform. Only `!AgentMail` (email) and `!HeadlessChromeBrowser` (research/
web actions, not publication) exist as send-capable portals. The result: promo content
is drafted, cleared through `!OutgoingContentCheck`, and staged in `Outbox/` indefinitely
for Luke to copy/paste and post manually. Concrete instance:
`Outbox/estuary-august-social-media-promo.md`, staged 2026-07-01, still unposted 13 days
later as of 2026-07-14.

This is **not fixable as a minor task** — it requires a new external portal, credential
acquisition/storage, and an architectural decision Luke should make (which platform(s),
which backend). Logged here as a proposal rather than executed.

## Why this can't be built silently

1. **No credentials exist.** `System/Credentials/` has no Instagram/Facebook/YouTube
   tokens. The only stored credentials are plaintext email+password in
   `Memory/Long-Term/BalaclavaPC/ Marketing and Ministry Plan/Marketing.notes.md` — not
   suitable for API auth and a separate security issue in its own right (plaintext
   passwords in a Long-Term store).
2. **No MCP is connected** for any social platform (confirmed against the initial
   commit's registered MCPs: WhatsApp, Google Calendar, AgentMail — no social media MCP).
3. **Backend choice is a real decision**, not a default: Meta Graph API (Instagram +
   Facebook, needs a Business/Creator account + app review for publishing permissions),
   YouTube Data API (OAuth + quota), or a third-party scheduler (Buffer/Later/Sprout —
   simpler auth, monthly cost, single integration point for multiple platforms).
4. **Per `!ThinPortal` recipe**, connectivity must be verified *first*, before any portal
   code is written — this proposal stops at the decision point deliberately.

## Recommended path (for Luke to choose)

**Option A — Buffer/Later API (recommended first choice).** One API key covers
Instagram + Facebook + (some tiers) YouTube/TikTok scheduling. Single credential to
store, single portal skill, avoids Meta's app-review process for direct posting. Monthly
subscription cost is the tradeoff.

**Option B — Meta Graph API direct (Instagram + Facebook only).** No subscription cost,
but requires: a Meta Developer app, Business verification, an Instagram
Business/Creator account linked to a Facebook Page, and app review to get the
`instagram_content_publish` permission. Heavier one-time setup; YouTube would still need
a separate Data API integration.

**Option C — Stay manual, reduce friction only.** Don't build a posting portal; instead
extend `!HeadlessChromeBrowser` with a saved-login profile so a caller skill can drive
the actual Instagram/Facebook web UI via browser automation (fragile — breaks on any UI
change, and arguably riskier than an API, since it mimics a human session on a shared
org account with plaintext-stored credentials).

## If Luke approves a path, the build (per !ThinPortal) is

1. Verify connectivity (probe the chosen API/MCP with a no-op call) before writing
   the portal.
2. One flat skill: `.claude/skills/!SocialMedia/skill.md` (or
   `System/Skillbank/Church/!SocialMedia/skill.md` if kept domain-scoped) — canonical
   verbs `post`, `schedule`, `list-drafts`, `delete`.
3. Credentials in `System/Credentials/social-media.md` (dotenv style), env-var override
   first — replacing the plaintext copy in Marketing.notes.md once live (flag that
   migration as a separate cleanup, not silent deletion of Long-Term content).
4. Uniform `{ok, data|error}` JSON contract; stdlib `urllib` where the backend allows it.
5. Hard guard: refuse empty content; caller must have already run
   `!OutgoingContentCheck` — the portal does not re-decide approval.
6. Log every call to `Memory/Long-Term/Logs/skills.log` as
   `[WORKER: !SocialMedia] [SUCCESS|FAIL] <verb> | ...`.
7. Register in `System/Skillbank/_index.yaml` if Skillbank-scoped (church.md's
   "External promotions" section should also drop the "no automated social-posting
   portal exists" caveat once built).
8. Test in `System/Sandbox/` before promotion, per `!ThinPortal` line 42.

## What this proposal does NOT do

- It does not pick a platform/backend on Luke's behalf.
- It does not create any credential file or touch `Marketing.notes.md`.
- It does not modify `church.md`, `CLAUDE.md`, or the Skillbank index — those changes
  are deferred until Luke picks an option above.

## Next action

Luke reviews Options A/B/C and picks one (or declines, keeping the manual `Outbox/`
workflow). On approval, spin this into a `!CreatePlan` Major task.

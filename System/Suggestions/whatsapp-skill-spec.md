---
title: WhatsApp Intake Skill — Technical Spec (Mix / Option 3)
type: suggestion
status: draft
date: 2026-06-23
context: Personal Productivity
related: [!Intake, !DetermineContext, intake-sweep, Inbox/, Outbox/]
---

# WhatsApp Intake Skill — Technical Spec

## Summary

Add WhatsApp as a fourth intake channel (alongside `Inbox/` and AgentMail) using the
**Mix** model: a single **dedicated thread** as the deliberate front door, plus a small
**hardcoded allowlist** of high-signal chats that get polled. Everything outside the
allowlist is invisible by design. The skill is **read-only** — eyes, not mouth.

## Hard constraints (from the connected WhatsApp MCP)

- The bridge is **query-only**: `list_chats`, `list_messages`, `get_message_context`,
  `search_contacts`, `download_media`, `get_chat`, `get_contact_chats`,
  `get_last_interaction`. **No send tool.**
- **No push / webhook** — nothing fires on message arrival. Ingestion is **polling only**,
  driven by the existing scheduled `intake-sweep`.
- Consequence: outbound replies are impossible from the skill. Any outbound "Act" must
  terminate as a draft in `Outbox/` for Luke to send by hand.

## Design (Option 3 — Mix)

- **Primary inbox:** WhatsApp "Message yourself" self-chat — deliberate captures Luke
  forwards/drops in.
- **Watchlist:** 3–6 high-signal JIDs that map cleanly to a context (e.g. a Balaclava
  leadership group → Church; a key family thread → Personal). Tunable via config only.
- **Rejected alternatives:** monitor-everything (firehose, terrible signal-to-noise, no
  real-time benefit since polling); single-thread-only (clean but loses passive capture).

## Configuration

`whatsapp-watch.yaml` (in the skill folder or `Preferences/`) — the entire control surface:

```yaml
self_chat_jid: "<luke-self-chat-jid>"     # primary deliberate inbox
watchlist:
  - jid: "<group-or-contact-jid>"
    label: "Balaclava Leadership"
    context: Church
  - jid: "<jid>"
    label: "Family"
    context: Personal Productivity
```

No JIDs hardcoded in the skill body (consistent with preferences-driven sourcing).
Editing the allowlist is the only way to change scope.

## Processing flow

1. **Poll** — per watched JID (self-chat + watchlist), call
   `list_messages(chat_jid=<jid>, after=<last_seen_iso>)`.
2. **De-dupe** — maintain a per-chat high-water timestamp (`_state.yaml`) so each message
   is processed exactly once.
3. **Route** — each new message becomes an `!Intake` item: `!DetermineContext`
   (pre-seeded by the watchlist entry's `context`) → one or more of ①–④ outcomes, or
   discard. Identical to how an inbound email is triaged.
4. **Media** — only pull via `download_media` when an outcome actually needs the file.
5. **Outbound** — any "④ Act" that replies/sends terminates at a draft in `Outbox/`
   (`!Checkpoint` gate). The skill never sends.

## Cost / efficiency

Per-sweep cost is O(small fixed number of watched chats), not O(entire WhatsApp). Fails
closed: an unlisted chat is never read.

## Open decision (needs Luke)

Which JIDs go on the watchlist, and each one's context. Until provided, the skill runs
self-chat-only.

## Build stub (next steps)

- `System/Skillbank/!WhatsApp/skill.md` + `_index.yaml` catalog entry (or `.claude/skills/`
  if promoted to a command).
- `whatsapp-watch.yaml` config + `_state.yaml` high-water store.
- Wire one extra step into `intake-sweep` to fan the watched JIDs into `!Intake`.

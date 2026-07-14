---
name: "!WhatsApp"
description: >
  Read-only portal to Luke's WhatsApp — lists chats, searches messages, retrieves contact
  history, and downloads received media. SEND IS DISABLED: send_message, send_file, and
  send_audio_message were removed at the source level (main.py) before deployment. This portal
  can only observe; it cannot transmit.
type: Skill
status: Active
domain: PersonalProductivity
intent: "Give Lukeatron read access to Luke's WhatsApp chats and messages via the local MCP bridge. Used for digests, inbox triage, conversation lookup, and feeding WhatsApp context into projects."
version: 1.0.0
---

## ⚡ TRIGGER
Primary: `!WhatsApp`
Fires when: "read my WhatsApp", "check WhatsApp", "what's in WhatsApp", "summarise my WhatsApp",
"find a WhatsApp message from [person]", "WhatsApp digest", "what did [person] say on WhatsApp",
or any task that needs WhatsApp message history as input.

## 🧭 NATURE OF THIS PORTAL
Read-only by design, not by convention. The three send tools (`send_message`, `send_file`,
`send_audio_message`) have been removed from the Python MCP server (`main.py`) — they do not
exist as callable tools. No prompt, no skill, and no misconfiguration can re-enable sending.

The Go bridge (`~/Developer/whatsapp-mcp/whatsapp-bridge/whatsapp-client`) must be running for
this portal to return live data. Messages are stored in a local SQLite DB
(`~/Developer/whatsapp-mcp/whatsapp-bridge/store/messages.db`) — completely offline, never
synced to any cloud service.

## 🔧 BACKEND
MCP server: `whatsapp` (registered in `~/.claude.json` at user scope).
Engine: `lharries/whatsapp-mcp` — Go bridge (whatsmeow) + Python FastMCP server.
DB path: `~/Developer/whatsapp-mcp/whatsapp-bridge/store/messages.db`
Bridge binary: `~/Developer/whatsapp-mcp/whatsapp-bridge/whatsapp-client`

**If the bridge is not running:** the MCP tools will return empty results or DB errors.
Fail closed — report "WhatsApp bridge is not running" and instruct Luke to restart it:
```
cd ~/Developer/whatsapp-mcp/whatsapp-bridge && ./whatsapp-client
```

## 📖 VERBS (available read tools)

| Verb | MCP Tool | When to use |
|------|----------|-------------|
| list-chats | `list_chats` | Get recent conversations — overview of active threads |
| list-messages | `list_messages` | Search/filter messages (by date, sender, text) |
| get-chat | `get_chat` | Get metadata for a specific chat by JID |
| get-messages-by-contact | `get_direct_chat_by_contact` | Find a 1:1 chat by phone number |
| get-contact-chats | `get_contact_chats` | All chats involving a contact |
| get-last-interaction | `get_last_interaction` | Most recent message with a contact |
| get-context | `get_message_context` | Messages before/after a specific message |
| search-contacts | `search_contacts` | Search contacts by name or phone |
| download-media | `download_media` | Download received media to local path |

## 📤 OUTPUT CONTRACT
Pass-through. MCP tool responses are returned as-is from the server — no wrapping, no
transformation. The calling skill/agent decides how to digest or present the data.

For digests and summaries, apply Luke's voice and compression preferences (see Skill 18 +
Skill 16). For project routing, match contact names against `Memory/Long-Term/People/`.

## 🔒 SAFETY
- No `!OutgoingContentCheck` needed — this portal cannot transmit.
- `download_media` writes files to the local Go bridge directory only — inspect the returned
  path before using the file.
- WhatsApp message content may be sensitive. Do not write raw conversation content to
  `Memory/Long-Term/` without Luke's explicit approval — summarise or abstract instead.
- JIDs are phone-number-based identifiers. Do not log JIDs to `skills.log` — log chat names
  or initials only.

## ⚡ FAILURE MODES
| Failure | Response |
|---------|----------|
| Bridge not running | Fail closed — report it, give restart command |
| DB locked (bridge restarting) | Wait 2s, retry once, then fail with "DB locked" |
| MCP server not found | Check `claude mcp list` — re-add if missing |
| Empty results | Confirm bridge has synced — check DB row count via Bash if needed |

## 📝 LOG
Every call logs to `Memory/Long-Term/Logs/skills.log`:
`[WORKER: !WhatsApp] [SUCCESS|FAIL] <verb> <brief-description> | tokens≈[N]`

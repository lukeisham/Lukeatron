---
name: "!AgentMail"
description: >
  External email access portal over the AgentMail API (agentmail.to). Use whenever a
  task needs to read, list, search, draft, send, reply to, or download attachments from
  email on Luke's behalf, or when another skill/sub-agent needs an email pipe. Canonical
  verbs: inboxes, messages, message, threads, thread, drafts, draft, delete-draft,
  mark-read, delete-message, get-attachment, send, reply, send-draft.
  Triggers: "check my email", "read the inbox", "send an email", "reply to", "draft an
  email", "what's in the inbox", "email <person>", "download attachment", or any skill needing email I/O.
type: Skill
status: Active
domain: Productivity (plumbing — external access only)
intent: "Single thin portal to the AgentMail API. Exposes email verbs and returns JSON. Holds no logic; the caller owns the decision to send and the !OutgoingContentCheck."
version: 1.0.0
---

## ⚡ TRIGGER
Primary: `!AgentMail`
Internal: any skill or sub-agent needing email I/O calls `scripts/agentmail.py` (never scrape Gmail or hand-roll API calls).
Account: inbox `lukeatron@agentmail.to`. Key: `AGENT_EMAIL_API_KEY` in `System/Credentials/credentials.md`.

## 🧭 WHAT THIS IS
Plumbing, not a brain. It gives callers a clean, predictable email pipe and returns
structured JSON. It does **not** draft prose, decide recipients, file received mail, or
manage contacts — those belong to the calling skill/sub-agent and to Luke. Keep it dumb
so it stays reliable.

## 🛠️ USAGE
Run the script; every call prints one JSON object and sets a 0/1 exit code.

```
python3 ".Claude/skills/!AgentMail/scripts/agentmail.py" <verb> [args]
```
`--inbox` is optional and auto-resolves to the sole inbox when only one exists.

**Read (safe, no transmission)**
| Verb | Purpose |
| :--- | :--- |
| `inboxes` | list inboxes |
| `messages [--labels received,unread] [--limit N]` | list message headers/previews |
| `message --id <message_id>` | read one message in full |
| `threads [--limit N]` | list threads |
| `thread --id <thread_id>` | read a full thread |
| `drafts` | list saved drafts |
| `get-attachment --message-id <id> --attachment-id <id> [--out <path>]` | download an attachment from a message to a local file |
| `get-attachment --thread-id <id> --attachment-id <id> [--out <path>]` | download an attachment via thread id (alternative path) |

**Write that does NOT transmit**
| Verb | Purpose |
| :--- | :--- |
| `draft --to … --subject … --text … [--attach <file>]` | create a saved draft (optionally with attachments) |
| `delete-draft --id <draft_id>` | remove a draft |
| `mark-read --id <message_id>` | mark a message as read (removes the `unread` label via PATCH) — use after triaging a message |
| `delete-message --id <message_id>` | permanently delete a message |

**Write that TRANSMITS — irreversible**
| Verb | Purpose |
| :--- | :--- |
| `send --to … [--cc] [--bcc] --subject … (--text \| --text-file \| --html \| --html-file) [--attach <file>]` | send a new message (optionally with attachments) |
| `reply --message-id <id> (--text \| --text-file \| --html …)` | reply within a thread |
| `send-draft --id <draft_id>` | send an existing draft |

Recipients are comma-separated. Prefer `--text-file` / `--html-file` for any body longer than a line.

## 🔒 SAFETY (non-negotiable)
1. `send`, `reply`, and `send-draft` send real, unrecallable email. The **caller must
   run `!OutgoingContentCheck` and get Luke's approval before invoking them.** This portal
   does not ask for approval — it assumes the caller already did.
2. The script **refuses to `send`/`reply` with empty body content** — a deliberate guard,
   because the raw AgentMail `reply` endpoint transmits even on an empty body.
3. On any failure the script returns `{"ok": false, "error": …, "status": …}` and exits 1.
   Never retry a `send`/`reply` blindly on error — a 200 may have already transmitted.

## ✅ OUTPUT
Success: `{"ok": true, "verb": "<verb>", "data": <api-payload>}` (exit 0)
Failure: `{"ok": false, "verb": "<verb>", "error": "<msg>", "status": <int|null>}` (exit 1)
Log: `[AGENT: !AgentMail] [SUCCESS|FAIL] <verb> | tokens≈[N]` → `Memory/Long-Term/Logs/skills.log`

## 🔌 BACKEND NOTES
- API base `https://api.agentmail.to/v0`; `inbox_id` is the email address itself.
- Auth via Bearer `AGENT_EMAIL_API_KEY` (env overrides the credentials file).
- Zero dependencies — Python 3 stdlib only (`urllib`, `base64`, `mimetypes`). No pip install, no SDK.
- `get-attachment` saves raw bytes to disk and returns `{"saved_to": <abs_path>, "size_bytes": N}`.
- `--attach <file>` on `send`/`draft` Base64-encodes each file; MIME type is guessed from extension.

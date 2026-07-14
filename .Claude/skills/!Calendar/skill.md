---
name: "!Calendar"
description: >
  External calendar access portal over the connected Google Calendar MCP. Use whenever a
  task needs to read, search, create, update, delete, or respond to calendar events, find
  free time, or check availability — or when another skill/sub-agent needs a calendar pipe.
  Canonical verbs: calendars, list, get, create, update, delete, respond, find-free.
  Triggers: "what's on my calendar", "am I free", "schedule/book", "move/reschedule",
  "cancel/decline", "find a time", "check my availability", or any skill needing calendar I/O.
type: Skill
status: Active
domain: Productivity (plumbing — external access only)
intent: "Single thin portal to the Google Calendar MCP. Maps canonical verbs to native MCP tools and encodes the config + safety rules. Holds no logic; the caller owns intent and the !OutgoingContentCheck on any write."
version: 1.0.0
---

## ⚡ TRIGGER
Primary: `!Calendar`
Internal: any skill/sub-agent needing the calendar uses the verb→tool map below.
Pipe: the **connected Google Calendar MCP** (native agent tools — no script, no `.ics` files).

## 🧭 WHAT THIS IS
Plumbing, not a brain. Unlike the old `Calendar_system` (which wrote `.ics` files via
`callib.py` and pushed to Google), this portal is a **thin mapping over the live MCP
connector**: the agent/sub-agent calls the MCP tool directly. It holds no scheduling
logic — deciding *what* to book, *who* to invite, or *whether* to cancel belongs to the
calling skill and to Luke.

## ⚙️ CONFIG (verified live)
- **Primary calendar** `luke.isham@gmail.com` — summary "Luke", tz **Australia/Sydney**.
- **Family calendar** `family01982712835364590109@group.calendar.google.com` — tz UTC.
- Default `calendarId` = `primary` (resolves to Luke's). Pass the Family id explicitly to target it.
- Always pass an explicit `timeZone` (IANA, e.g. `Australia/Sydney`) or full ISO-8601 offsets
  on event times — never rely on implicit local time.
- `System/Credentials/google_calendar.md` records `Australia/Melbourne`; the calendar's own
  tz is Sydney (same offset). Prefer `Australia/Sydney` to match the calendar.

## 🛠️ VERB → MCP TOOL MAP
The MCP server id is the connected Google Calendar connector. Verbs map to its tools:

| Verb | MCP tool | Notes |
| :--- | :--- | :--- |
| `calendars` | `list_calendars` | list available calendars |
| `list` / `view` | `list_events` | time-range + `fullText` search; set `pageSize=10`, use `orderBy=startTime` |
| `get` | `get_event` | full detail for one `eventId` |
| `create` | `create_event` | **write** — requires `summary`, `startTime`, `endTime` |
| `update` | `update_event` | **write** — requires `eventId`; only set fields you change |
| `delete` | `delete_event` | **destructive write** — prefer `respond` to cancel/decline |
| `respond` | `respond_to_event` | accept / tentative / decline an invite |
| `find-free` | `suggest_time` | needs `attendeeEmails` (use `["primary"]` for Luke's own free time) |

**Typical loop:** `list`/`find-free` to see state → draft the change → `!OutgoingContentCheck`
→ `create`/`update`/`delete`.

## 🔒 SAFETY (non-negotiable)
1. **Reads are free; writes are not.** `create`, `update`, `delete`, `respond` change Luke's
   calendar — the **caller must run `!OutgoingContentCheck` and get Luke's approval first.**
2. **Attendees = outgoing email.** Creating/updating an event with `attendees` sends invites,
   and `delete` sends cancellations. The API default is `notificationLevel=EXTERNAL_ONLY`
   (external people get emailed). Treat any event-with-attendees as **outward-facing content**:
   confirm the guest list with Luke, and set `notificationLevel=NONE` when you must avoid
   emailing anyone (e.g. fixing your own private event).
3. **Deletion is destructive and often unnecessary.** To cancel or decline an invitation, use
   `respond` (declined), not `delete`. Only hard-`delete` an event Luke owns, on explicit
   confirmation. Never delete an event you did not create without surfacing it to Luke first.
4. **Time discipline.** Always specify `timeZone`/offsets. Today's date and Luke's tz
   (Australia/Sydney) are the anchor for relative dates ("tomorrow", "next week").

## ✅ OUTPUT
- Returns the MCP tool's native JSON (calendar/event objects) to the caller verbatim.
- Log: `[WORKER: !Calendar] [SUCCESS|FAIL] <verb> | <eventId/summary>`
  → `Memory/Long-Term/Logs/skills.log`.

## 🔌 BACKEND NOTES
- If the MCP connector is not authenticated in a given session (e.g. a headless/cron run),
  this portal is unavailable — **fail closed**: report it to Luke, do not fall back to
  writing `.ics` files or guessing. Read-only verbs may still be attempted to confirm auth.

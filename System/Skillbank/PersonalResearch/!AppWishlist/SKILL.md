---
name: "!AppWishlist"
description: "A dumping ground for wishes about an app or widget. One wishlist.md in the app's folder; add a wish, list the wishes, and remove a wish once it is acted on or declined. Tied to the app only by living in its folder — it tracks nothing and is not connected to !AppDevelopment's phases, PRD or specs."
type: Skill
status: Active
core_function: Generate
intent: "Give Luke one place per app to drop wishes without losing them to conversation, and nothing more."
version: 2.0.0
dependencies: [template.md]
calibration:
  context: [PersonalResearch]
  level: Basic
  scope: Local
memory_footprint:
  read: [System/Apps, System/Widgets]
  write: [System/Apps, System/Widgets]
---

## ⚡ TRIGGER
Fires on: "add to the wishlist for <name>", "wish for <name>", "note this idea for <name>",
"what's on the wishlist for <name>", "wishlist for <name>", or when Luke volunteers a
someday-idea for an existing app.

## 🛠️ LOGIC

// EXECUTION_START

**STEP 0 — Find the wishlist**
  RESOLVE the app folder: `System/Apps/<Name>/` or `System/Widgets/<Name>/`.
  IF the folder does not exist ➔ ask Luke which app he means. Do not create an app folder.
  IF `wishlist.md` does not exist ➔ CREATE it from `template.md`.

**STEP 1 — Add a wish**
  TAKE Luke's wish however it arrives. REWORD it lightly into one clear line: keep the intent, drop
  nothing he said, invent nothing he didn't. If a rewording changes the meaning, show him first.
  APPEND it as a new row with today's date. No ranking, no status, no cross-checking.

**STEP 2 — List the wishes**
  READ the table and report it back as it stands. Filter only if Luke asks.

**STEP 3 — Remove a wish**
  WHEN a wish is acted on (built, or folded into a PRD / plan) or Luke declines it ➔ DELETE its
  row. The wishlist holds only wishes still waiting; nothing is kept for history (git has it).

// EXECUTION_END

## ✅ OUTPUT
`wishlist.md` in the app's folder, holding only wishes still waiting.

**Validation Check (Self-Test)**
```
VERIFY every row is one wish with a date
VERIFY no row describes something already built or declined
ELSE ➔ repair the file before reporting back
```

**Error Path**
```
CATCH app-not-found ➔ ask Luke which app; never create an app folder here.
CATCH [*]           ➔ report, hold, leave the wishlist file accurate.
```

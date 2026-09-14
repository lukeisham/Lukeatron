# Opening ProjectKanban and the Wiki — a plain guide

Two browser windows show you what Lukeatron is tracking:

- **ProjectKanban** — every active project, lane by whose move it is, column by how soon it's due. `http://localhost:8789`
- **LukeatronWiki** — the reading/watching/writing backlog and the idea pages. `http://localhost:8787`

## 1. Just open them

Both are **already running** whenever Claude is open — you don't need to start anything. Just type the address into your browser:

- ProjectKanban: `http://localhost:8789`
- Wiki: `http://localhost:8787`

(Bookmark them if you like — they don't move.)

## 2. Editing — neither tool has a mode switch

**ProjectKanban** — the board itself (the lane × column grid) is always read-only — click a card to
open that project's own page, and every field there (checkboxes, due dates, owner, kind, notes) is
live and editable straight away, no switch to flip. Click **"← Back to board"** to return. A
**Copy** button next to a field copies its text for pasting elsewhere; it doesn't change anything.

**The Wiki has no View/Edit toggle either** (the old viewer's did — that tool was retired
2026-09-12). Reading a page is always read-only. Two safe, deliberate ways to add something, both
always visible, neither needing a mode switch first:

- **🌱 Quick-capture**, at the bottom of the **Backlog** page — a small form (title, kind, intent,
  source, the page it belongs to, an optional note). Submitting it writes one queue row straight
  away; nothing else on the page changes and no agent is involved.
- **⊕ on a References / Supporting Quotes / See Also slot**, on any page — this doesn't write
  content itself. It leaves a request that waits until a Claude session picks it
  up and drafts something for you to accept or reject; the store itself is untouched until you
  click Accept.

Nothing else on the Wiki writes anything — there is no third, broader "edit mode" to leave on or
forget about.

## 3. Stopping a viewer

You almost never need to — they're designed to run quietly in the background. If you ever do want to stop one:

- Open Terminal and run:
  ```
  pkill -f "ProjectKanban/_template/server.py"      # stops ProjectKanban
  pkill -f "Apps/LukeatronWiki/server.py"            # stops the Wiki
  ```
- They'll come back automatically the next time a Claude session starts.

## Advanced (optional, most people can skip this)

Both tools have exactly one double-click launcher each — `System/Apps/LukeatronWiki/Start
LukeatronWiki.command` and `System/Apps/ProjectKanban/_template/Start ProjectKanban.command` —
since neither has a mode to start into beyond its normal one.

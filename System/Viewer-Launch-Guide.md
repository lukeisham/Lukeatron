# Opening the Dashboard and the Wiki — a plain guide

Two browser windows show you what Lukeatron is tracking:

- **Project Dashboard** — every active project, colour-coded by what needs your attention. `http://localhost:8788`
- **LukeatronWiki** — the reading/watching/writing backlog and the idea pages. `http://localhost:8787`

## 1. Just open them

Both are **already running** whenever Claude is open — you don't need to start anything. Just type the address into your browser:

- Dashboard: `http://localhost:8788`
- Wiki: `http://localhost:8787`

(Bookmark them if you like — they don't move.)

## 2. Turning on editing

By default both open in **View** — you can look, but clicking a button won't change anything. To edit:

1. Look at the left-hand sidebar, just below **"Other tools."**
2. You'll see two small buttons side by side: **View** and **Edit**.
3. Click **Edit**. The page reloads and editing controls appear — on the Dashboard, an "✏️ Edit" section on each project; on the Wiki, a "🌱 Quick-capture" box on the backlog board.
4. When you're done, click **View** again to switch editing back off.

That's it — no restarting anything, no separate app to open. The click takes effect immediately, for that browser, on this Mac.

## 3. How do I know which mode I'm in?

Look at the same two buttons. Whichever one is **highlighted** (lit up) is the mode you're in. If neither looks highlighted, you're most likely in View — refresh the page.

## 4. One thing to know

Editing being "on" applies to **that whole browser** on this Mac, not just the tab you clicked in — so if you leave it on Edit and someone else uses this laptop, they could also edit until you switch it back. On a personal, secured laptop like this one that's a fine trade-off; just get in the habit of clicking back to **View** when you're done, the same way you'd lock your screen.

## 5. Stopping a viewer

You almost never need to — they're designed to run quietly in the background. If you ever do want to stop one:

- Open Terminal and run:
  ```
  pkill -f project-dashboard/serve.py      # stops the Dashboard
  pkill -f lukeatronwiki-viewer/serve.py    # stops the Wiki
  ```
- They'll come back automatically the next time a Claude session starts.

## Advanced (optional, most people can skip this)

Each tool also has a **"(Edit Mode)"** double-click launcher inside its folder (`System/Tools/project-dashboard/` and `System/Tools/lukeatronwiki-viewer/`) that starts a copy already switched to Edit. This is a shortcut for scripting or automation — for normal day-to-day use, the **View/Edit toggle in the browser is simpler and does the same thing.**

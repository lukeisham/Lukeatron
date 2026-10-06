# Storytelling — smoke test (distribution.spec FR-X8, FR-X9)

A short manual check. Run the whole list **twice**: once on **Copy A**, the single file `dist/Storytelling.html` opened
by double-click (it loads as `file://…`, no server, no Python), and once on **Copy B**, Luke's own copy started with
`Start Storytelling.command` (or `python3 server.py`) at `http://127.0.0.1:8793/`. Use a browser tab with saved-story
storage that you do not mind adding one test story to. Record results in `share/smoke-results.md`.

To rebuild Copy A first: `python3 share/build_share.py` (add `--check` to validate without writing).

| # | Do this | Expected |
|---|---|---|
| 1 | **Open the app.** A: double-click `Storytelling.html`. B: run the launcher; the browser opens. | The page loads with no server for A. No error banner. Tab title is "Storytelling". |
| 2 | **Fresh load.** Look at the page. | The poster is drawn: 218 tiles (217 elements plus the Rogue card), a toolbar with Zoom in, Zoom out, Reset, Popularity, Print table, Lists, About, and an empty story tray under the diagram. |
| 3 | **Double-click a tile** (e.g. Plot Twist, `Pt`). | The detail panel opens on the right with the tile's symbol, name, group, description. |
| 4 | **Click Popularity**, then click it again. | Numbers on the tiles disappear, then return. |
| 5 | **Drag a tile into the tray.** Press on a tile, move into the tray, release. | One bead appears in the tray; the tile is marked as in the story. |
| 6 | **Chain three beads.** Drag two more different tiles into the tray. | Three beads in a chain, two ribbons joining them, numbered steps 1 to 3. |
| 7 | **Save.** Type a name (e.g. "Smoke story") and click Save. | A confirmation shows; the name appears under "Saved stories". |
| 8 | **Reload the page**, then click the saved name. | The saved story is still listed after the reload, and opening it brings back the three beads and two ribbons. |
| 9 | **Library.** Click Library, choose the first story (Quest / Hero's Journey); if asked to replace your map, choose Replace. | Its beads appear as your own editable copy and its tiles on the poster are highlighted as in the story. |
| 10 | **Print table.** Click Print table, then Colour. | The browser's print preview opens showing the table on one landscape page in colour, with the story's tiles highlighted. Cancel it. |
| 11 | **Lists.** Click Lists, pick a category, tick "Include examples", click Copy. Paste into any text editor. | The preview shows the category's list with examples; the panel says "Copied"; the pasted text matches the preview. `Esc` closes the panel. |
| 12 | **About.** Click About. | Shows "Storytelling", "Version 1.1.0" (matches the file name `Storytelling-1.1.0.html`), the poster credit (ComputerSherpa, via TV Tropes), the CC BY-NC-SA 3.0 statement and the "nothing is sent anywhere" statement. `Esc` closes it. |
| 13 | **Agent levers.** Open the browser console and run `storytellingAgent.help()`. | Returns an object with `ok: true` and a `manifest` (name, summary, levers). No error. |
| 14 | **Offline.** Turn Wi-Fi off (airplane mode). Reload A (or, for B, use the page you already have and repeat items 3, 4, 12). | The app works exactly as before. Nothing is missing, no error, no "cannot connect" note. (B needs only the local `python3` server, which loopback keeps working offline.) |

**Copy A extra:** copy `Storytelling.html` alone to an empty folder (or another machine with no Python) and repeat 1 to 14 in
Safari and in Chrome. If saved stories do not persist in a browser that blocks `localStorage` on files, a visible note says
saving is off for this session and nothing throws (FR-X4).

**Pass:** every "Expected" holds on both copies. **Fail:** record the item number, the copy, the browser and what you saw.

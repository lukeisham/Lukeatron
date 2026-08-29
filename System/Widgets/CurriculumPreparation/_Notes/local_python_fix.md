b) Local Python server per bundle adds launch frictionThe rejection of pure File System Access was deliberate and sound (atomicity, image files, path safety, Chrome-only quirks). Do not reverse it lightly. Instead eliminate the perceived friction.Make launch one gesture  Ship a double-clickable launcher (Start.command on macOS, or a tiny .js + AppleScript/Shortcuts wrapper) that:
– finds a free port,
– starts serve.py,
– opens Chrome to the correct URL,
– shows a clear “Server running — close this window to stop” status.  
Bundle the launcher inside the unit folder so the whole thing remains portable.

Reduce mental overhead  Fixed or sticky preferred port range with clear feedback if the preferred port is taken.  
Status bar or favicon that visibly indicates “live / unsaved / offline”.  
Auto-save on every successful PUT so the user never has to think about “did it write?”.

Optional hybrid fallback (only if measured pain remains high)  Primary path stays the server.  
Secondary path: File System Access for unit.json only, with images still going through the server (or a “download zip of images” escape hatch). This is more code, so only add it after a real user (you) has used the polished launcher for a few units and still finds the server annoying.

Never require the server for pure reading  A static index.html + embedded data (or a read-only mode) should open without Python for quick review of archived units.

Result: the server remains the reliable, scoped persistence layer, but day-to-day use feels like opening a normal local app.

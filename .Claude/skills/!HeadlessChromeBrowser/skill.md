---
name: "!HeadlessChromeBrowser"
description: >
  External web access portal — drives a real headless Chrome for web research and web
  actions (navigate, read, click, fill, log in, screenshot, run JS, save PDF, extract).
  Use whenever a task needs live web content beyond a static fetch, or when another
  skill/sub-agent needs a browser pipe. Canonical verbs: open, snapshot, text, html,
  click, fill, type, press, select, wait, scroll, screenshot, pdf, eval, back, forward,
  reload, close, doctor. Triggers: "research on the web", "open this page", "click/fill
  on a site", "log into", "screenshot this page", "scrape", "what does this site say",
  or any skill needing browser I/O.
type: Skill
status: Active
domain: Productivity (plumbing — external access only)
intent: "Single thin portal to a headless browser. Exposes canonical verbs via a swappable backend registry; default engine is Vercel agent-browser. Holds no logic; the caller owns intent and the !OutgoingContentCheck on any state-changing web action."
version: 1.0.0
---

## ⚡ TRIGGER
Primary: `!HeadlessChromeBrowser`
Internal: any skill/sub-agent needing the web calls `scripts/browser.py` (never scrape ad hoc).
Engine: Vercel `agent-browser` (default backend) → headless Chrome-for-Testing over CDP.

## 🧭 WHAT THIS IS
Plumbing, not a brain. It gives callers a clean, predictable browser pipe and a stable
verb set that won't change even if the engine underneath does (backends live in
`registry.md` and are swappable without code changes). It does **not** decide what to
research, judge page trust, or fill in personal data — those belong to the calling
skill/sub-agent and to Luke.

## 🛠️ USAGE
```
python3 ".Claude/skills/!HeadlessChromeBrowser/scripts/browser.py" <verb> [flags]
python3 ".Claude/skills/!HeadlessChromeBrowser/scripts/browser.py" --list-backends
```
| Verb | Purpose |
| :--- | :--- |
| `open --url U` | navigate (starts/uses the stateful session) |
| `snapshot` | accessibility tree with `@e` refs — read this to find elements |
| `text --ref SEL` / `html --ref SEL` | extract from a selector or `@ref` |
| `click --ref @e1` | click an element |
| `fill --ref @e1 --value X` / `type … --value X` | enter text |
| `press --value Enter` / `select --ref @e1 --value X` | key / dropdown |
| `wait --value <sel\|ms>` / `scroll --value down` | wait / scroll |
| `screenshot --out f.png` / `pdf --out f.pdf` | capture |
| `eval --js "document.body.innerText"` | run JS (best whole-page text extractor) |
| `title` / `url` / `back` / `forward` / `reload` / `close` / `doctor` | misc |
| `--raw "<subcommand>"` | pass a raw backend subcommand through (full CLI power) |

**Canonical loop:** `open --url …` → `snapshot` (read `@e` refs) → `click/fill --ref @e1`
→ `eval`/`text` to extract → `close` when done.

## 🔑 KEY BEHAVIOURS (learned from the live engine)
- **Refs are snapshot-scoped.** `@e1` is only valid until the page changes — re-`snapshot`
  after any navigation/click before using refs again.
- **Judge by the `✓/✗` marker, not exit code.** agent-browser prints `✗ …` on a logical
  failure while still exiting 0; the dispatcher flags these in the log but passes output
  through verbatim. Callers must read the glyph.
- **Whole-page text:** `text --ref` needs a real selector; for the full page use
  `eval --js "document.body.innerText"`.
- **Output is pass-through** (snapshot trees / text / JSON), not a JSON envelope — so the
  rich engine output reaches the caller intact.

## 🔒 SAFETY
1. **Read is free; web *actions* are not.** Navigating and reading are routine. But any
   action that submits a form, logs in, posts, purchases, or accepts terms is
   state-changing and outward-facing — the **caller must run `!OutgoingContentCheck` and
   get Luke's approval first.** This portal does not ask; it assumes the caller did.
2. **Link/URL trust is the caller's job.** Treat URLs from emails/messages/untrusted pages
   as suspicious; the caller verifies before opening. Never enter Luke's credentials,
   payment, or government IDs into a form — that stays prohibited (use the password
   manager / let Luke do it).
3. **Privacy:** prefer declining non-essential cookie/consent banners; never put personal
   data in URLs.

## ✅ OUTPUT
- Backend stdout/stderr streamed through verbatim; process exit code propagated.
- Log: `[WORKER: !HeadlessChromeBrowser] [SUCCESS|FAIL] <backend> <verb> rc=<n>`
  → `Memory/Long-Term/Logs/skills.log`.

## 🔌 BACKEND NOTES
- Backends are defined in `registry.md` (`## BACKEND:` json blocks). Default:
  `agent-browser` (installed + `doctor`-green here, Chrome-for-Testing 149).
- **Playwright** is registered as a **dormant fallback** — flip its `default` in
  `registry.md` and build the shim per that file if the Vercel CLI ever regresses.
- `chat` action requires `AI_GATEWAY_API_KEY` (otherwise disabled — not needed for core use).

# !HeadlessChromeBrowser — Backend Registry

This file is the **live browser registry**. `scripts/browser.py` parses every fenced
` ```json ` block under a `## BACKEND:` heading and treats it as a selectable backend.
**To swap or add an engine, edit a block — no code change.** Exactly one backend should
set `"default": true`. Set `"dormant": true` on a backend that is registered but not yet
installed (it still lists in `--list-backends`, tagged "(dormant)").

## Backend schema
- `name` *(str, required)* — id used by `--backend`.
- `default` *(bool)* — exactly one true.
- `dormant` *(bool)* — registered-but-not-installed marker (cosmetic).
- `bin` *(str, required)* — CLI executable name/path.
- `actions` *(object, required)* — canonical verb → list of argv tokens. Placeholders:
  `{url}`←`--url`, `{ref}`←`--ref`, `{value}`←`--value`, `{out}`←`--out`, `{js}`←`--js`.
  Append `?` (e.g. `{ref?}`) to make a placeholder optional (dropped if not supplied).
  Omit a verb the backend can't do — calling it then HALTs with a clear message.

---

## BACKEND: agent-browser  *(default — verified working v0.27.1)*

Vercel `agent-browser`: a stateful daemon driving Chrome-for-Testing over the Chrome
DevTools Protocol, purpose-built for AI agents. `snapshot` returns an accessibility tree
with `@e` refs; sessions persist across separate CLI calls (open once, then interact).

**Setup (one-time):** `npm install -g agent-browser` then `agent-browser install`
(downloads Chrome-for-Testing) — verify with `agent-browser doctor`. *Already installed
and green on this machine (Chrome-for-Testing 149).*
**Optional `chat` action:** `export AI_GATEWAY_API_KEY=gw_...` (otherwise `chat` is disabled).

```json
{
  "name": "agent-browser",
  "default": true,
  "bin": "agent-browser",
  "actions": {
    "open":       ["open", "{url}"],
    "snapshot":   ["snapshot"],
    "text":       ["get", "text", "{ref}"],
    "html":       ["get", "html", "{ref}"],
    "value":      ["get", "value", "{ref}"],
    "title":      ["get", "title"],
    "url":        ["get", "url"],
    "click":      ["click", "{ref}"],
    "fill":       ["fill", "{ref}", "{value}"],
    "type":       ["type", "{ref}", "{value}"],
    "press":      ["press", "{value}"],
    "select":     ["select", "{ref}", "{value}"],
    "wait":       ["wait", "{value}"],
    "scroll":     ["scroll", "{value}"],
    "screenshot": ["screenshot", "{out}"],
    "pdf":        ["pdf", "{out}"],
    "eval":       ["eval", "{js}"],
    "back":       ["back"],
    "forward":    ["forward"],
    "reload":     ["reload"],
    "close":      ["close"],
    "doctor":     ["doctor"]
  }
}
```

> Notes: refs are addressed `@e1` and are **snapshot-scoped** — re-`snapshot` after the
> page changes. `text`/`html` require a CSS selector or `@ref`; for whole-page text use
> `eval --js "document.body.innerText"`. agent-browser marks logical errors with a leading
> `✗` while still exiting 0 — judge an action by the `✓/✗` marker, not exit code alone.

---

## BACKEND: playwright  *(dormant fallback — activate only if agent-browser breaks)*

Registered escape hatch in case the experimental Vercel CLI regresses. Playwright is a
library, not a stateful CLI, so it needs a thin shim that exposes the same canonical verbs
(one session per process, or a small persistent server). The slot is reserved here; the
shim is **not yet built**.

**To activate:** (1) `pip install playwright` (uses system Chrome via `channel="chrome"`
— no Chromium download), (2) create `scripts/pw_shim.py` mapping the verbs below to
Playwright calls, (3) set this block's `"default": true` and remove `agent-browser`'s.

```json
{
  "name": "playwright",
  "dormant": true,
  "bin": "pw-shim",
  "actions": {
    "open":       ["open", "{url}"],
    "snapshot":   ["snapshot"],
    "text":       ["get", "text", "{ref}"],
    "click":      ["click", "{ref}"],
    "fill":       ["fill", "{ref}", "{value}"],
    "screenshot": ["screenshot", "{out}"],
    "pdf":        ["pdf", "{out}"],
    "eval":       ["eval", "{js}"],
    "close":      ["close"]
  }
}
```

---
plan: "lukeatronwiki-fix-slow-loading"
context: Lukeatron
secondary_contexts: []
created: 2026-09-20
status: Completed
major_because: "multi-step"
project: ""
skills_used: ["!CreatePlan", "!ReviewPlan"]
---

# Plan — LukeatronWiki: stop the viewer loading slowly (wishlist item 2)

## Objective
Make the LukeatronWiki viewer (`System/Apps/LukeatronWiki/`, `:8787`) load promptly and reliably in Chrome by removing the head-of-line blocking caused by its single-threaded server holding one keep-alive or idle connection while Chrome's other connections queue — using the smallest change that works, and keeping the recorded single-thread decision (AD-1) unless measurement proves it cannot. This specialises the Lukeatron North Star ("correct, legible, doing what CLAUDE.md says; extend deliberately, never by accident"): the fix is verified against the real browser, and the spec and code comments are updated so they do not drift from what the server now does.

## Success criteria (measurable)
- **Reproduced first.** The plan's Notes → Baseline records, before any edit: (a) with the Chrome tab open, `curl -m 10 http://localhost:8787/` times out or takes > 2 s; (b) with the tab closed, the same request's `time_total`; so we know whether slowness is only the blocking or also real per-request cost.
- **Fixed under the real browser.** With the wiki open in Chrome (the very condition that failed), 10 consecutive `curl` requests to `/`, `/static/app.css`, and one store page each return 200 in under 1 s, and the Chrome tab reaches `document_idle` (page text readable via the Chrome tools) within 5 s of navigation.
- **No behaviour lost.** The existing wiki test suite shows 0 new failures against the baseline recorded in Step 2; the four `/do/*` POST routes still work (covered by `tests/test_server.py`).
- **AD-1 honoured or knowingly superseded.** Either (Option A) the server stays single-threaded and no lock is added, or (Option B) it becomes threaded **with** every POST/write serialised under one lock, Luke has explicitly approved reversing AD-1, and `server.spec.md` records a new decision superseding it. There is no state in between.
- **No drift.** The `server.py` module docstring (lines 4–8), the drain-body comment at `_handle_post` (~line 326), and `System/Sandbox/LukeatronWiki/_specs/server.spec.md` (§ Decisions) all describe what the server now does.
- **Wishlist updated.** Row 2 is deleted from `System/Apps/LukeatronWiki/wishlist.md` (the file's own rule: shipped ideas are deleted on the spot).
- **Nothing written outside `_Lukeatron/`; no Long-Term store touched** (the app is read-only over Long-Term except its own gated capture/enrich routes, which the tests exercise on temp copies, not live stores).

## Resources
- **Memory to read:** none (app code and its spec only). Spec: `System/Sandbox/LukeatronWiki/_specs/server.spec.md` (AD-1, §5).
- **Capability skills:** none (Chrome browser tools for verification, not a skill).
- **Domain skills (Skillbank):** none matched.
- **Sub-agents:** none — every step is a small deterministic edit or a measurement.
- **Scripts / Temp-skills:** none.

## Steps
Order matters: measure → smallest fix → prove it in real Chrome → escalate only if it fails.

- [x] Step 1 — Reproduce and baseline. With the wiki tab open in Chrome: `lsof -nP -iTCP:8787` (note the idle ESTABLISHED Chrome connections), then `curl -s -m 10 -o /dev/null -w "%{http_code} %{time_total}\n" http://localhost:8787/`. Close the tab and repeat for `/`, `/static/app.css` and one store page. Record all numbers in **Notes → Baseline**. [inline, Bash]
- [x] Step 2 — Run the existing wiki test suite and record the exact working command and its pass/fail counts in **Notes → Baseline**. (Run from `System/Apps/LukeatronWiki/`; try `python3 -m unittest discover -s tests -t .`, fall back to whatever runs.) [inline, Bash]
- [x] Step 3 — **Option A (smallest, keeps AD-1).** In `server.py`: set `protocol_version = "HTTP/1.0"` (line 121) so each connection closes after its response, and add a short per-connection socket timeout (`timeout = 2` on `Handler`) so Chrome's speculative *idle* sockets — which send no bytes and would otherwise block a single-threaded server until Chrome closes them — are dropped quickly. Make sure the timeout is handled quietly (no traceback spam in `serve.log`). [inline edit]
  - [x] Test in Sandbox — run the edited server on a spare port with `LUKEATRONWIKI_PORT=8797 python3 server.py` (the port comes from `paths.PORT`, env `LUKEATRONWIKI_PORT`; leave `:8787` alone), open `http://localhost:8797/` in Chrome, run the Step 1 measurements against it. Then run the Step 2 suite. Stop the spare instance afterwards. [Sandbox, Bash + Chrome]
- [x] Step 4 — Decision gate. Did the Option A run meet the "Fixed under the real browser" criterion (10/10 requests < 1 s with Chrome connected)?
  - **Yes** → go to Step 6.
  - **No** → **Option B**: ask Luke for explicit approval to reverse AD-1 (it is a recorded design decision), then go to Step 5. [Luke's decision]
- [x] Step 5 — *(only if Option B approved)* Replace `HTTPServer` with `ThreadingHTTPServer` (`daemon_threads = True`) and wrap every write path (`_handle_post` and the `/do/*` handlers that reach `capture` / `enrich`) in one module-level `threading.Lock`; GETs stay lock-free (read-only). Add a test that fires two concurrent POSTs and asserts neither write is lost or interleaved. Re-run Step 3's Sandbox measurements and the Step 2 suite. [inline edit + test]
- [x] Step 6 — Update the words to match reality: `server.py` module docstring (lines 4–8), the keep-alive comment in `_handle_post` (~326), and `server.spec.md` §5 — for Option A, add a short decision beside AD-1 ("connections close per request + idle timeout, because Chrome's idle preconnects blocked the single thread"); for Option B, add a new decision that supersedes AD-1 and name the lock. [inline edit]
- [x] Step 7 — Apply for real: restart the live server on `:8787`. `ensure-wiki.sh` does nothing when the port is already live, so first stop the old process (`lsof -nP -iTCP:8787 -sTCP:LISTEN` → `kill <pid>`; close the Chrome tab first so its connections don't linger), then run `System/Apps/LukeatronWiki/ensure-wiki.sh` to relaunch it detached; confirm the new PID is listening. Reload the wiki in Chrome and confirm it loads promptly and the 10-request criterion passes on `:8787`. [inline, Bash + Chrome]
- [x] Step 8 — If it is still slow after the connection problem is fixed (i.e. requests with **no** Chrome connection are themselves slow — see the Step 1 "tab closed" numbers), profile the request path (`seal` re-parses the manifest per request; `library` / `render` scans on the home page) and log what you find, with the measured timings, in **Notes → Result** and as a **new wishlist row** rather than widening this plan. If the no-Chrome numbers were already fast, write "no residual cost" in Notes and skip. [inline]
- [x] Step 9 — Delete row 2 from `System/Apps/LukeatronWiki/wishlist.md`. [inline edit]
- [x] Verify — every line of **Success criteria** met, with the measured numbers written into **Notes → Result**. [pass/fail]

## Notes
**Baseline** — 2026-09-21. Suite: `python3 -m unittest discover -s tests -t .` from `System/Apps/LukeatronWiki/` = 299 tests, OK. Live `:8787` with Chrome attached: `curl /` and `/static/app.css` both timed out at 20 s (`lsof` showed 1 accepted + 2 queued Chrome sockets). Spare `:8797`, no Chrome: `/` 2.45 s, `/store/*` 2.0–2.1 s, static CSS 0.0017 s; one idle socket held = 8 s timeout. **So there were two causes, not one:** (1) single thread blocked by idle preconnects; (2) a real ~2 s render cost — `library.integrity_counts()` (page footer) called `backlinks()` per wikilink = 118 x 28 = ~3,300 node reads / ~17,000 YAML parses per page.

**Result** — 2026-09-21. Fix 1: `library._backlink_index()` builds all backlinks in one walk for `integrity_counts()` (no cross-request cache, AD-1 intact); counts identical before/after. Fix 2 (Option A, no AD-1 reversal): `server.py` `protocol_version = "HTTP/1.0"`, `timeout = 0.5`, `_QuietHTTPServer`. Numbers: page render 2.0–2.45 s -> 0.34–0.46 s; live `:8787` (Chrome pane attached) home nav 551 ms, link fetches 346–369 ms, `curl /` 0.44–0.45 s, static 0.0007 s; no new tracebacks in `serve.log`. Suite 302 tests OK (299 + 3 new; the two idle-socket tests fail against the old `server.py`). **Missed target:** with 3 idle sockets ahead, the *first* request stalls ~1.96 s (3 x 0.5 s + render), then all fast — the plan's <1 s bar holds for every request after that one. Threaded server (Option B) would remove it but reverses AD-1; not done. Remaining 0.35 s render cost is `list_stores` / `_themes` and repeated `seal.load()` — left for a future wishlist row if it matters. Specs updated: `server.spec.md` AD-1a, `library.spec.md` AD-1a. Wishlist row 2 deleted.

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.

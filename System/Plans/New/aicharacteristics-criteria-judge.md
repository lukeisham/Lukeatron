---
plan: "aicharacteristics-criteria-judge"
context: [Personal Research]
secondary_contexts: [Coding, Teaching]
created: 2026-10-02
status: New
major_because: "multi-step; touches external parties (Wikipedia fetch, Haiku API); modifies a built app and Home's route table"
project: ""
skills_used: []
---

# Plan — Refactor AiCharacteristics: Wikipedia → criteria → Simple English explainer → JEV check

## Objective
AiCharacteristics gains a **Scrape** button that turns the Wikipedia article on AI writing characteristics into a stable list of criteria, presents them as a Simple English explainer, and checks pasted text against them with JEV (a very cheap LLM judge answering yes/no + confidence per criterion); the 8 hard-coded detectors are retired. This specialises the Personal Research North Star (working builds that rest on verified knowledge) as a build whose behaviour is verified against reality.

## Success criteria (measurable)
- Clicking **Scrape** (signed in, via Home) fetches the article and rewrites `criteria.json`; with no click, the app reads only the saved file and makes no network call.
- A second Scrape on an unchanged article reports no new, changed or retired criteria and leaves every criterion's text, id and explainer unchanged (idempotence test passes; each criterion's `status` shows what the latest Scrape did, so it reads `kept`).
- A criterion marked `locked` or hand-edited is never overwritten by a Scrape; a criterion that vanishes from the article is marked `retired`, never deleted.
- The explainer renders every non-retired criterion in Simple English and passes the reading-level check (script; limits in step 7); any that still fail after one retry are listed as flagged in the Scrape summary.
- Pasting ≤700 words and clicking Check returns, for every non-retired criterion, `yes`/`no` + a confidence 0–1, shown per criterion; the "AI characteristics observed — not an authorship verdict" statement appears with every result set.
- Failure paths degrade closed and visibly: no key, no network, malformed judge reply, Wikipedia page shape changed → old data kept, message shown, no blank screen (PY-6 / JS-2).
- No API key in any repo file or in the browser (SR-5); pasted text is not logged.
- The old detectors, their content, and their 7 tests are gone; the new test suite passes on fixture data only; Refactor Health Check scores ≥ 8/10.
- README (Purpose, Navigation, Cross-app behaviour) matches the new app; the wishlist row is deleted.

**Charter note.** The Personal Research guardrail "no Wikipedia as a load-bearing source" governs *research output*. This is a **build project**: the article is the app's declared subject matter, not a source for factual claims, so the build bar applies. Step 2 asks Luke to confirm this reading.

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md` (binding, G-1); `System/Skillbank/PersonalResearch/!AppDevelopment/phase4-retire.md` (refinement rules + Health Check)
- **Capability skills:** !HeadlessChromeBrowser (fallback fetch only)
- **Domain skills (Skillbank):** !AppDevelopment (refinement path), !AppWishlist (remove the row), !HouseStyle (new standalone page)
- **Sub-agents:** none inside the running app. The Haiku extractor and explainer-writer are Haiku API calls made by the Scrape script (dynamic work, varies with the article)
- **Scripts:** scrape pipeline, merge script (deterministic ID-matched merge), reading-level check, judge-reply validator — all in the app folder with their tests
- **Temp-skills:** none

## Steps

**A. Safe ground**
- [x] 1 — Commit the current AiCharacteristics folder alone (`git add System/Apps/AiCharacteristics`); leave other apps' uncommitted changes untouched. Take a dated copy of any data file before its first write (G-2) — no data file exists yet, so none taken; committed as ad4481b. [runs: git]
- [x] 2 — Luke confirmed 2026-10-02, as a special exception scoped to this app, recorded in `app-decisions.md`. [asks Luke]
- [x] 3 — Ask Luke where the Haiku API key lives. Default proposal: server-side only, in a file outside the repo, read at Home start-up (launchd does not inherit shell environment, so an env var alone will not survive a restart; check `core/credstore.py` first for an existing owner-only secret pattern). If this needs a Vibe-Coding exception, ask by rule ID and record it in `app-decisions.md` (G-1). Done 2026-10-02: Luke chose the `System/Credentials/Home/anthropic-key` file (option A); the SR-5 exception is recorded in `app-decisions.md`. Luke places the key himself; the agent never sees it. [asks Luke; reads: credstore.py]

**B. Data contract and merge (offline, testable)**
- [x] 4 — Define the `criteria.json` contract: `id` (permanent), `title`, `description` (source-grounded), `question` (the yes/no question JEV gets), `plain` (Simple English explainer text), `status` (`new` | `changed` | `kept` | `retired`), `locked`, `source` (article section/revision id), plus file-level `scraped_at` and `article_revision`. Written as the header docstring of `criteria/merge.py` (the app's server-side package, beside `tests/py/`) and exercised by the test fixtures. [inline]
- [x] 5 — Write the merge script: match proposed criteria to existing by ID, falling back to title similarity; apply new/changed/retired; skip locked; preserve ordering. [script]
  - [x] Test — 14 unittest cases in `System/Apps/AiCharacteristics/tests/py/test_merge.py`, all passing (pure functions on in-memory fixtures, so nothing real was touched; run with `python3 -m unittest` from `tests/py`). Fixtures: unchanged article, reworded criterion, new criterion, removed criterion, locked criterion, and run-twice idempotence. Fixture data only.

**C. Scrape → criteria → explainer**
- [x] 6 — Write the Scrape pipeline as a script the Home route can call (a Home route cannot spawn a Claude Code sub-agent, so the "Haiku sub-agents" here are Haiku API calls made by this script): fetch the article text → saved source snapshot → Haiku extractor returns structured criteria (strict JSON) → merge script → Haiku explainer-writer fills/refreshes `plain` for new/changed criteria only → write `criteria.json` atomically (old file kept on any failure). Fetch method: a plain HTTP fetch of the article (it is a static page, so a script is cheaper and more repeatable than a browser); use the headless Chrome script bundled with !HeadlessChromeBrowser only if the plain fetch cannot read it, and tell Luke if so. Built as `criteria/{transport,article,haiku,extract,explain,scrape}.py`. The fetch uses Wikipedia's own API (plain text plus revision id in one call), so the Chrome fallback was not needed. The article title `Wikipedia:Signs of AI writing` is my best reading of "the article on AI writing characteristics" and is **unverified until step 14**, where Luke confirms it. [script · Haiku API]
  - [x] Test — `tests/py/test_scrape.py` and `test_scrape_parts.py` (17 cases): a scripted network and a synthetic saved article, no live call, each in a temp folder; assert failure paths (fetch error, malformed JSON, empty extract) leave the old file intact.
- [x] 7 — Write the reading-level check (average sentence and word length thresholds, set from a sample of the existing explainer) and run it over every `plain` field; over-threshold items are retried once with the reasons, then kept and listed in the Scrape summary as flagged. Thresholds: average sentence under 15 words, none over 25, long words (9+ letters) under 10% — Simple English norms, **not** taken from the old explainer, which averaged 20–29 words a sentence and would have set the bar too high. [script]
  - [x] Test — known-easy, known-hard and empty text, in `test_scrape_parts.py`.

**D. JEV judge**
- [x] 8 — Write the judge: one batched Haiku call (`claude-haiku-4-5-20251001`) per check, prompt = pasted text + every non-retired `question`, reply forced to strict JSON `[{id, answer: yes|no, confidence: 0–1}]`; validator rejects anything else (missing id, bad value) and retries once, then fails closed. Text capped at 700 words server-side. [script]
  - [x] Test — `tests/py/test_judge.py` (9 cases, 40 in the suite): validator on good, malformed, partial, duplicate and out-of-range replies; one retry then fail closed; network failure not retried; over-cap text refused before any call; stubbed LLM, no live call.

**E. Server routes (Home)**
- [ ] 9 — **Blocked on a rule exception (API-5 / PY-12: Home routes do not write; the Scrape route writes `data/criteria.json`) — asked of Luke 2026-10-02.** Prep done and committed: the judge's refusal reasons and a request deadline (`with_deadline`). Finding that changes step 12: Home serves a file-launch app only as its one launch `.html` (`routes/open.py` `serve_file`), so the page must be a single self-contained HTML and read its data through a new signed-in `GET /api/aichar/criteria` route (added here). Add `routes/aichar.py` to Home (same shape as `routes/larder.py`): `GET /api/aichar/criteria`, `POST /api/aichar/scrape` and `POST /api/aichar/check`, a `409` if a Scrape is already running, each signed-in only, Origin-checked, errors mapped to Home's status codes, a hard time limit on Scrape (Home is threaded, so a long Scrape does not block other routes, but it must not hang forever), no stack traces to the client, pasted text never logged; register in `server.py`'s POST table and the self-check. The app is already served by Home at `/apps/AiCharacteristics/`, so the page and routes share an origin. Commit only the files this step touches (Home has unrelated uncommitted changes). [script]
  - [ ] Test — route tests in `System/Apps/Home/tests/` (signed-out refused, bad origin refused, oversize text refused, stubbed success and failure).

**F. Front end**
- [ ] 10 — Shell fit check: the Generator shell's analyse mode is built around highlighted spans (`ENGINE.parse()`), which a yes/no judge cannot supply. Decide, and tell Luke the decision: **(a)** leave the shell and build a plain standalone page (recommended: the Riddle, FolkTale and Psychometric apps stay untouched), or **(b)** add a verdict-only mode to the shared shell. [inline; asks Luke if (b)]
- [ ] 11 — Read a sibling app's page first (charter build bar: match house style), classify the page under !HouseStyle, then build Sandbox mockups (Scrape button + "what changed" list; explainer; text box + per-criterion results) and show Luke. [!HouseStyle · mockups in `System/Sandbox/AiCharacteristics-mockups/`]
  - [ ] Luke approves the mockups before step 12.
- [ ] 12 — Build the page: reads `criteria.json` (static); Scrape button with progress and a "new / changed / retired" summary after each run; explainer view; Check view with the verdict-only results and the honesty statement. Update the Home catalog `launch.path`. [inline]

**G. Retire the old engine**
- [ ] 13 — Delete the 8 detectors and everything only they used: `engine.js`, `explainer.js`, old `content.json`, the 7 old tests, the MiniWiki bundle wiring, `AiCharacteristics_miniwiki_source.md`, and the old generator HTML once the new page runs. Ask Luke what becomes of `AI-writing-characteristics-reference.md` (archive vs. fold into the first scrape's source snapshot). Git history is the safety net. [inline; asks Luke on one file]
  - [ ] !Checkpoint — confirm deletion list with Luke before deleting.

**H. Verify and finish**
- [ ] 14 — First live run, with Luke watching: one real Scrape (fetches Wikipedia, calls Haiku) and one real Check (sends pasted text to the Haiku API). [!Checkpoint — external fetch and external API call; Luke approves each before it fires.]
- [ ] 15 — Run the idempotence check live (Scrape twice, compare), then exercise the app in the browser: Scrape, explainer, Check, plus the failure cases (no key, offline). [runs: preview/browser tools]
- [ ] 16 — Run the Refactor Health Check (7 questions, scored out of 10); fix anything unmet. [runs: phase4-retire.md]
- [ ] 17 — Rewrite README (Purpose; Navigation; Cross-app behaviour — Home routes, key location, retired shell dependency, what breaks if either changes); remove the "no refresh action" and "fixed at build time" lines. Append Luke's approval (and any granted exception) to `app-decisions.md`. Delete the wishlist row via !AppWishlist. [inline · !AppWishlist]
- [ ] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [ ] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.

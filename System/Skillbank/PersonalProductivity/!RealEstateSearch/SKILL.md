---
name: "!RealEstateSearch"
description: >
  Search for Victorian rental listings against Luke's criteria — suburb(s), price per week,
  desired features, bedrooms (the only mandatory field) — then runs a separate verification
  pass confirming each result is still live, within a month old, and actually meets the
  criteria before it's shown. Outputs a three-column chat table (address · summary · link)
  and offers to save it as markdown. Triggers: "find me a rental", "search for a place to
  rent", "look for listings in", "find an apartment in", "house hunting in", "rental search",
  "!RealEstateSearch".
type: Skill
status: Active
core_function: Find
intent: "Turn a loose set of rental preferences into a short, verified shortlist Luke can act on directly — never a raw dump of everything a listings site returns."
version: 1.0.0
dependencies: []
calibration:
  context: [Personal]
  level: Extended
  scope: Local
memory_footprint:
  read: []
  write: [System/Sandbox]
---

## ⚡ TRIGGER
Primary: `!RealEstateSearch`
Fires when: Luke asks to find/search for a rental property, house, apartment, or unit to rent
anywhere in Victoria — "find me a place in", "search for a rental", "what's available in",
"house hunting", or similar. **Rentals only** (the "$/pw" — price per week — framing is a
rental-market signal; this skill does not cover buying/sale listings).

## 🧭 A LOAD-BEARING FINDING — READ BEFORE SEARCHING
Tested live 2026-09-18. **realestate.com.au, domain.com.au, and view.com.au all sit behind
bot-detection (Kasada / DataDome) that blocks both the `!HeadlessChromeBrowser` portal and a
plain `WebFetch`** — confirmed by a live headless-Chrome hit on all three (Kasada/DataDome
challenge pages returned instead of content) and a `WebSearch` domain-filter rejection on
realestate.com.au specifically ("not accessible to our user agent"). **Never attempt to work
around this** — bypassing bot-detection is a hard-prohibited action system-wide, not a
judgement call to make per-run. If a future run finds these sites open again, that's a welcome
bonus, not something to go looking for by trying stealth flags, alternate user agents, etc.

**What does work, tested live the same day:** `rent.com.au` and `homely.com.au` are plain
server-rendered pages — a normal `WebFetch` reads them cleanly, no browser needed.
`homely.com.au` additionally exposes each listing's **relative listing age right on the
results page** ("Listed 3 days ago", "NEW on Homely"), which is exactly what the verification
pass needs and neither of the blocked sites would have given for free even if they were open.
So: **`homely.com.au` is the primary source; `rent.com.au` is the secondary cross-check**
(richer per-listing feature/amenity text). This is a considered choice, not a fallback of
convenience — re-derive it only if both sources stop working.

## 🛠️ LOGIC

**STEP 1 — ASK Luke for criteria**
  - `suburb(s)` (required) — one or more Victorian suburbs. Luke doesn't need to separately name
    surrounding suburbs unless he wants to: a single-suburb Homely search already widens to
    "surrounding and nearby suburbs" on its own (confirmed live). If Luke names several suburbs
    explicitly, search each one and merge.
  - `bedrooms` (**MANDATORY — the only required field besides suburb**) — a number, or "N+".
    IF blank ➔ STOP and re-ask; do not proceed without it.
  - `price per week range` (optional) — min, max, or both. Blank ➔ no price filter.
  - `desired features` (optional) — free text (e.g. "off-street parking, pets allowed, air con,
    dishwasher, balcony, second bathroom"). Blank ➔ no feature filter, just report what's there.

**STEP 2 — RESOLVE suburb → postcode**
  Homely's URLs require a postcode (`<suburb>-vic` alone 404s — confirmed live). For each named
  suburb, resolve its VIC postcode with one `WebSearch "<suburb> VIC postcode"` — this is a fixed,
  well-known fact (Australia Post), never guess it.

**STEP 3 — SEARCH each suburb (Homely, primary)**
  Build: `https://www.homely.com.au/for-rent/<suburb-slug>-vic-<postcode>/real-estate/<n>-bedrooms`
  (slug = lowercase, spaces→hyphens; confirmed working for multi-word suburbs, e.g. `south-yarra`).
  - Bedroom segment: try `<n>-bedrooms` first (confirmed for exact counts). For "N+", try
    `<n>-bedrooms-plus`; that segment is **unconfirmed** — if it 404s, fall back to the
    unfiltered `/real-estate/` path for that suburb and self-filter bedrooms ≥ N from each
    listing's own displayed bedroom count (every row shows it regardless).
  - `WebFetch` that URL asking for every visible listing's: address, weekly rent, bedrooms,
    bathrooms, car spaces, property type, inspection time if shown, the "Listed X days
    ago"/"NEW" text, and its own listing URL.
  - Repeat per suburb; merge results, de-duplicating on address.
  - Zero results at this stage ➔ say so plainly (STEP 7), suggest relaxing price or bedrooms —
    never invent a listing to fill the table.

**STEP 4 — FILTER (the agent's own read of the fetched rows, not the site's UI filters)**
  Apply, over what STEP 3 returned:
  - price band, if Luke gave one (one-sided min-only / max-only is fine)
  - bedrooms, if STEP 3 had to fall back to the unfiltered path (exact match, or ≥ N for "N+")
  Drop anything without an address or a working listing link.

**STEP 5 — VERIFY (separate pass, runs only on what survives STEP 4)**
  a. **Recency.** Use the "Listed X days ago" / "NEW" text already captured in STEP 3
     ("NEW" = 0 days). **Exclude anything > 30 days old.** If a row's age wasn't shown on the
     results page, `WebFetch` that listing's own Homely detail page before deciding — never
     assume recency, never wave one through unchecked.
  b. **Criteria match.** For each surviving candidate, `WebFetch` its own detail page (Homely;
     cross-check via the matching `rent.com.au` listing when Homely's description leaves a
     named feature ambiguous) and confirm bedrooms/price/property type against what STEP 3
     reported, plus check each of Luke's `desired features` against the actual description —
     don't silently drop a listing missing one feature; record the gap instead so Luke sees it
     (e.g. "✓ pets allowed, ✗ no dishwasher mentioned").
  c. Anything that fails recency or turns out mis-described on its own page (price changed,
     since leased, wrong bedroom count) is dropped here, quietly — it never reaches the table.

**STEP 6 — SELF-TEST before showing the table**
  `VERIFY` every remaining row has: a real street address, a listing link that was actually
  fetched in STEP 5 (not just carried over from STEP 3), and an explicit recency check ≤ 30
  days. Any row failing this ➔ drop it, don't show it "with a caveat."

**STEP 7 — OUTPUT the table in chat**
  Exactly three columns, in this order:
  | Address | Summary | Link |
  | :--- | :--- | :--- |
  | Full street address | price pw · beds/baths/cars · property type · "Listed N days ago" · feature-match notes | the listing URL |
  If STEP 3/4/5 left nothing, say so directly (no empty table) and suggest one concrete loosening
  (wider suburb list, higher price ceiling, fewer mandatory features).

**STEP 8 — OFFER to save**
  Ask Luke once: "Save this as a markdown file?" On yes, write the same table plus the search
  criteria and today's date to
  `System/Sandbox/RealEstateSearch_<primary-suburb-slug>_<YYYY-MM-DD>.md`.
  This stays entirely inside `_Lukeatron/` — **Low Impact** per the Impact Axis, no `!Checkpoint`
  needed for the save itself. If Luke is actively house-hunting as an ongoing thing (not a
  one-off), offer — once — to fold it into a project instead: the existing house-hunting project
  if Luke already has one, otherwise the Personal Productivity catch-all (PP-18 Chores and
  Errands) as a Next Action. Never invent a new project for a one-off search.

## ✅ OUTPUT
- A verified three-column chat table (Address · Summary · Link), or a plain "nothing matched"
  statement with a concrete suggestion — never an empty or unverified table.
- Optionally, on Luke's yes, a saved `System/Sandbox/RealEstateSearch_<suburb>_<date>.md` file.
- Log: `[SKILL: !RealEstateSearch] [SUCCESS|EMPTY|FAIL] suburbs=[...] bedrooms=[n] results=[n]`
  → `Memory/Long-Term/Logs/skills.log`.

**Validation Check (Self-Test)**
```
VERIFY bedrooms field was collected and non-blank BEFORE any search ran
VERIFY every output row's recency was checked in STEP 5, not assumed from STEP 3
VERIFY no row cites realestate.com.au / domain.com.au / view.com.au as its source
VERIFY the table has exactly three columns: Address, Summary, Link
```

**Error Path**
```
CATCH bedrooms missing ➔ re-ask, never search without it
CATCH a targeted site returns a bot-detection challenge (Kasada/DataDome/similar) ➔ STOP on
  that site, do not attempt evasion, fall back to the other confirmed-working source, and if
  neither works, report the outage to Luke plainly rather than guessing at listings
CATCH zero results after filtering ➔ report plainly + suggest one concrete loosening, never
  fabricate a listing to fill the table
CATCH a listing's own detail page contradicts the search-results row (price/beds/leased) ➔
  drop it silently in STEP 5c, don't show it with a caveat
```

## 🎨 Form governance
Output is a **fixed-template chat table** (Address · Summary · Link, STEP 7) — not `!HouseStyle`'s
territory (no HTML/CSS/SVG rendered) and not `!PlainEnglish`'s four-part shape either, per that
skill's own FORMAT test: a piece bound to its own fixed template uses that contract instead. The
three-column table **is** the contract.

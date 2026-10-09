# !RealEstateSearch — proving run (2026-09-18)

**Criteria used:** Richmond VIC, 2 bedrooms, $700–$800 p/w, features wanted: dishwasher, pets allowed.

## Site-access findings (why the skill is built the way it is)
- `realestate.com.au`, `domain.com.au`, `view.com.au` — all blocked by bot-detection
  (Kasada / DataDome) against both `!HeadlessChromeBrowser` and plain `WebFetch`. Not attempted
  again after confirming — bypassing bot-detection is prohibited outright, not a per-run choice.
- `rent.com.au`, `homely.com.au` — plain server-rendered pages, `WebFetch` reads them cleanly.
  `homely.com.au` exposes each listing's age on the results page itself ("Listed N days ago" /
  "NEW"), which is what makes the verification pass possible without opening every single result.

## Result table (STEP 7 format)

| Address | Summary | Link |
| :--- | :--- | :--- |
| 3/424A Bridge Road, Richmond VIC 3121 | $795 pw · 2 bed / 2 bath / 1 car · Apartment · Listed 3 days ago · ✓ dishwasher · ✓ pets allowed | https://www.homely.com.au/homes/3-424a-bridge-road-richmond-vic-3121/13510346 |
| 916/14 David Street, Richmond VIC 3121 | $750 pw · 2 bed / 1 bath / 1 car · Apartment · Listed 4 days ago · dishwasher not mentioned · pets not mentioned | https://www.homely.com.au/homes/916-14-david-street-richmond-vic-3121/11785705 |
| 113/132-136 Burnley Street, Richmond VIC 3121 | $700 pw · 2 bed / 1 bath / 1 car · Apartment · Listed 7 days ago · ✓ dishwasher · pets not mentioned | https://www.homely.com.au/homes/113-132-136-burnley-street-richmond-vic-3121/13503844 |
| 16/343 Church Street, Richmond VIC 3121 | $700 pw · 2 bed / 1 bath / 1 car · Apartment · Listed 10 days ago · ✓ dishwasher · pets not mentioned | https://www.homely.com.au/homes/16-343-church-street-richmond-vic-3121/13493302 |
| 8/88 Richmond Terrace, Richmond VIC 3121 | $790 pw · 2 bed / 1 bath / 1 car · Apartment · Listed 14 days ago · ✓ dishwasher · ✓ pets allowed | https://www.homely.com.au/homes/8-88-richmond-terrace-richmond-vic-3121/13468786 |

## Verification pass caught a real stale listing
`116/6 Lord Street, Richmond VIC 3121` — $750 pw, 2 bed / 2 bath / 1 car, matched price and
bedrooms, and the Homely *search-results row showed no age badge at all* (would have looked
current). Its own detail page reads **"Published 13 January 2026"** — over eight months before
today (2026-09-18). Correctly **excluded** by STEP 5a's per-listing recency check. This is the
proving case for why the skill never trusts a missing age badge as "recent enough" and always
opens the detail page to confirm.

## Verdict
Pipeline works end-to-end: suburb→postcode resolution, Homely search, price self-filter,
per-listing recency verification (caught a genuine stale listing missed by the results-page
badge), per-listing feature verification (correctly distinguished "confirmed" from "not
mentioned" rather than guessing), three-column table output. Proven — registered in
`System/Skillbank/_index.yaml`.

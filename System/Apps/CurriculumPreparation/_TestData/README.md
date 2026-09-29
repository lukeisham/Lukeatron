# _TestData — permanent test artefacts

**These files are TEST DATA. They are not part of the app, and they are never
copied into a unit bundle.**

Kept permanently and deliberately. Unlike `_Spikes/`, `_Builds/` and
`_Mockups/` — which are working folders that get archived once their build run
closes — this folder is durable. The files here are measurement instruments:
they are what the curriculum importer is tested and scored against, and a
result is only comparable over time if the input stays fixed.

## Why these must not move into `_template/`

`AC-BT-4` requires that grepping `_template/` for any curriculum-specific
string returns nothing, and `AD-8` keeps third-party curriculum text out of the
distributed tool. Real curriculum content therefore lives here, in Luke's own
project files, and never in the shipped bundle.

## Contents

### `vic-f10-v2-history/`

Victorian Curriculum F–10 Version 2.0 — **History**.

| File | What it is |
|---|---|
| `vcaa-history-authoritative.json` | Full authoritative snapshot of the History curriculum, all five bands, fetched from VCAA. The reference the importer's output is checked against. |
| `year10-history.source.md` | A real teacher's copy-paste — one unit's worth ("Australians at War 1914–1945"), messy and incomplete, exactly as it came off the website. The Q-1 fixture. |
| `AustraliansAtWar-testunit/` | A stamped unit bundle built from `_template/` and hand-entered from the Q-1 fixture above. The permanent live test app — run `serve.py` inside it to drive the real UI against real (messy) curriculum data, rather than testing against a clean synthetic fixture. |

## Provenance

- **Source:** https://f10.vcaa.vic.edu.au/learning-areas/humanities/history/curriculum
- **Endpoint:** the site is a Next.js build; the data was taken from its
  pre-rendered JSON at `/_next/data/<buildId>/learning-areas/humanities/history/curriculum.json`.
  The `buildId` rotates on every VCAA site rebuild, so it is discovered from
  the page's embedded `__NEXT_DATA__` rather than hardcoded.
- **Fetched:** 2026-08-30
- **Trimmed:** site chrome (menus, banners, Word templates) removed; only the
  curriculum payload and its learning-area title are kept.

### Licence and attribution

VCAA publishes Victorian Curriculum F–10 content under **Creative Commons
Attribution–NonCommercial (CC BY-NC)**. Note the **NonCommercial** term: this
material may be used for Luke's own teaching and for testing this tool, and
must not be redistributed commercially or published from the tool (`AD-8`).

> ⚠️ **Provenance caveat.** The licence and attribution strings are **not
> present in the fetched JSON payload** — `vcaa_check.py` correctly reports them
> as "not found in fetched source" rather than inventing them. The CC BY-NC
> term above is taken from VCAA's own copyright page, not from this snapshot.
> Before any output carrying this content is published or shared, confirm the
> current wording directly with VCAA.

## What the snapshot contains

Codes per band, counted from the file itself:

| Band | Knowledge | Skills | Total |
|---|---|---|---|
| Foundation to Level 2 | 6 | 8 | 14 |
| Levels 3 and 4 | 10 | 9 | 19 |
| Levels 5 and 6 | 12 | 10 | 22 |
| Levels 7 and 8 | 28 | 10 | 38 |
| **Levels 9 and 10** | **41** | **10** | **51** |

Structure: `curriculum.pathways[0].curriculum[<band>].contentDescriptionsContent`
→ strands → `subStrands` → `contentDescriptions` → `{code, contentDescription}`.

## Why the messy paste is kept too

The paste is the more valuable of the two. It is a genuine sample of what
actually arrives when a teacher copies from the website, and it carries the
real defects the importer has to survive:

- no indentation and no numbering — the usual structural clues are absent
- codes trail at the end of each line rather than leading it
- three codes silently missing from within pasted runs (K19, K21, S04)
- two typos, and a heading mangled from "Communicating" down to "community"
- one unit's scope only, not the whole curriculum

A tidied-up fixture would measure the importer against input it will never see.
**Do not correct this file.** Its defects are the point.

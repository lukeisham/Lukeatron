---
name: idea-wiki
description: "Tend LukeatronWiki — Luke's permanent, ongoing pseudo-project (Memory/Long-Term/LukeatronWiki/) that ABSORBS articles, books, links and videos he wants to READ, WATCH or WRITE, and grows them into an interconnected, Wikipedia-style web of pages. The wiki is the CONNECTIVE GRAPH; the CONTENT lives in Memory/ — every absorb WRITES the verbatim content INTO the matching in-scope Memory/Long-Term/<subject store> (Theology/, Philosophy/, Sociology/, … — the in-scope list is in meta-about.md / _index.yaml themes:) and the wiki page POINTS to it via longterm_refs. Pages are POINTER NODES: chips, the read/watch/write queue, See Also edges, and the longterm_refs that route to the store — NO substantive content on the page itself (Memory Governance — the wiki never duplicates Long-Term content). VERBATIM still governs the store write: Luke's own words or the source's own quotes; the agent NEVER writes summaries or extracts/invents 'key points'. The agent's only generative role is FORMATTING the verbatim content in the store and LINKING the wiki node (See Also edges, topic organisation, the two chips, the longterm_refs). Pages take one of four FORMATS — article (long-form node) · list (short collection node) · topic (a hub whose member roll the viewer builds live) · support (how-the-wiki-works, the wiki's own self-doc — may hold body text). ABSORB ('add this to the wiki', 'I want to read/watch/write X', 'remember this book/link/video') queues the item, WRITES its content into the matching store, and files a pointer node linked both ways. WORK ('what should I read/watch/write next', 'show the backlog') surfaces the queue. EXPLORE ('what connects to X', 'develop this idea') traverses the graph — into the Long-Term stores too. CHURN graduates a durable node into a Project / formal store page and retires stale nodes via !ArchiveMemory. A Long-Term fixture — its contents churn, the wiki is permanent. For thinking + intake — NOT for executing tasks (those are Projects). When ABSORB finds no in-scope store, it proposes a new theme via !Checkpoint (gated, fails closed) rather than silently parking or inventing a store."
type: Skill
status: Active
core_function: Synthesize
intent: "Keep LukeatronWiki absorbing and connected — every item queued with its read/watch/write intent, its verbatim content WRITTEN INTO the matching Memory/Long-Term/<subject store>, and a pointer node that links both ways AND references that store content via longterm_refs; the backlog stays workable; durable nodes graduate into a Project / formal store page and stale ones retire via !ArchiveMemory. Content lives in Memory/, never on the page; the agent only formats the verbatim content in the store and links the node. The wiki is permanent; its contents churn. Unmatched items trigger a gated new-theme proposal rather than a silent park."
version: 3.2.0
dependencies:
  - "Memory/Long-Term/LukeatronWiki/lukeatronwiki.md"
  - "Memory/Long-Term/LukeatronWiki/_index.yaml"
  - "Memory/Long-Term/LukeatronWiki/_queue.yaml"
  - "Memory/Long-Term/LukeatronWiki/Nodes/<slug>.md  (the pointer nodes; control surface stays at the LukeatronWiki/ root)"
  - "Memory/Long-Term/LukeatronWiki/_media/  (auto-saved page thumbnails)"
  - "Memory/Long-Term/Thumbnails/  (curated images — reused read-only as page thumbnails)"
  - "Memory/Long-Term/<subject stores>  (WRITE target — absorbed content is written here; the page references it read-only via longterm_refs)"
  - "System/Templates/Template_IdeaPage.md"
  - "!HeadlessChromeBrowser  (fetch a source og:image / open-license thumbnail)"
  - ".claude/skills/!CreatePlan  (promote a 'write' item to a Project)"
  - ".claude/skills/!ArchiveMemory  (retire/promote pages — Long-Term is gated)"
calibration:
  context: Any
  level: Extended
  scope: Global
memory_footprint:
  read: [Memory/Long-Term/LukeatronWiki, Memory/Long-Term/Thumbnails, Memory/Long-Term, System/Templates]
  write: [Memory/Long-Term/LukeatronWiki, Memory/Long-Term/<subject stores>]   # the pointer node + _media/ thumbnails go to LukeatronWiki/; the absorbed CONTENT is written to the matching subject store
---

## ⚡ TRIGGER
Primary: !IdeaWiki
Secondary (ABSORB): "add this to the wiki", "add to LukeatronWiki", "remember this book/link/video", "I want to read/watch/write", "save this idea/question/link", "queue this to read"
Secondary (WORK):   "what should I read next", "what should I watch/write next", "show the backlog", "what's in my queue", "the wiki backlog"
Secondary (EXPLORE):"what do I have on X", "what connects to Y", "develop this idea", "show the wiki"
Secondary (CHURN):  "promote this page", "promote this to a project", "this idea is done", "drop this from the wiki"
Disambiguation: a thing to DO (a task, a deadline, an action) is a Project — route to !CreatePlan, not here. The wiki is for thinking + intake only.
Mode select:
  MATCH intent
    CASE incoming-material            THEN ABSORB
    CASE backlog/next-question        THEN WORK
    CASE question-about-the-graph     THEN EXPLORE
    CASE mature/retire-a-page-or-item THEN CHURN
    DEFAULT ➔ ASK Luke "absorb, work the backlog, explore, or churn?"

## 🛠️ LOGIC
```
// EXECUTION_START
READ Memory/Long-Term/LukeatronWiki/_index.yaml INTO graph     // pages, tags, links — the map
READ Memory/Long-Term/LukeatronWiki/_queue.yaml INTO backlog   // read/watch/write items

// ═══════════ CONTENT-IN-MEMORY + VERBATIM RULE (applies to ALL modes) ═══════════
// CONTENT LIVES IN Memory/, NOT ON THE PAGE. Absorbed content is WRITTEN INTO the
// matching Memory/Long-Term/<subject store>; the wiki page is a POINTER NODE that
// routes to it via longterm_refs. The wiki never holds or duplicates the content
// (Memory Governance). A page body carries NO substantive content — only the chips,
// the read/watch/write queue, and See Also edges.
// The store write is VERBATIM — Luke's own words or the source's own quotes, exact.
// NEVER write an AI summary. NEVER extract or invent "key points". NEVER paraphrase
// into AI prose. NO "{AI}" prefix. If there is no verbatim content to place, leave the
// store untouched and the node's queue row pending — do not fill the gap with prose.
// The agent's ONLY generative acts are: FORMAT the verbatim content IN THE STORE
// (headings, bullets, tables, bold), set the two CHIPS, choose the FORMAT, write the
// See Also edges, and add the longterm_refs that point at the store. Format + link.
// EXCEPTION: format:support pages (the wiki's own how-it-works self-doc, e.g.
// meta-about) are not absorbed material — they may carry body text and need no store.

// ───────────────────────── ABSORB ─────────────────────────
IF mode == ABSORB THEN
  1. CLASSIFY item INTO {kind: article|book|link|video, intent: read|watch|write, type: theme|book|question|source, tags[]}
       IF intent unclear THEN ASK Luke "read, watch, or write?"
  2. QUEUE: append a row to _queue.yaml {id, title, kind, intent, status: queued, source, page, added: today}
  3. WRITE CONTENT → THE STORE (the load-bearing change — content lives in Memory/, not the page):
       IF the item carries NO content yet (a bare "remember this book / queue this link", nothing to
          store until Luke reads/watches it) THEN store_ref = none ; GOTO 4   // node + queue row only
       PICK the store: dominant = the item's leading tag/topic; match it to an IN-SCOPE Memory/Long-Term/<subject>
          store. The canonical in-scope list is the `themes:` block in _index.yaml (read it; do NOT rely on
          memory of what themes exist — the list may have grown). Closest subject wins; content may span
          stores → write to the dominant one.
          IF no in-scope store fits THEN → PROPOSE-NEW-THEME (below). NEVER write to an out-of-scope store
          silently; NEVER invent a store name without this gated path.

       // ── PROPOSE-NEW-THEME — fires ONLY when genuinely no in-scope store fits ──
       // This path is GATED. It fails closed: create nothing until Luke approves.
       PROPOSE_NEW_THEME:
         1. IDENTIFY the best candidate theme name (the subject area the item belongs to).
         2. ASSEMBLE a proposal:
              - Theme display name  (e.g. "Logic")
              - New folder path     Memory/Long-Term/<ThemeName>/
              - _index.yaml update  a new entry in the `themes:` block:
                    { name: "<ThemeName>", folder: "Memory/Long-Term/<ThemeName>", hub_slug: "<kebab-slug>" }
              - meta-about.md update  a new bullet under "Included Long-Term stores":
                    "- **<ThemeName>** — `Memory/Long-Term/<ThemeName>/`"
              - New hub node        a `format: topic` page at Nodes/<kebab-slug>.md from Template_IdeaPage.md
         3. ROUTE the proposal through !Checkpoint (outgoing structural change — always gated).
              Present the proposal clearly: "This item doesn't fit any existing theme.
              I propose creating a new theme: **<ThemeName>** (Memory/Long-Term/<ThemeName>/).
              Approve to create the folder, add it to the manifest, and continue absorbing."
         4. FAIL CLOSED: park the item's _queue row (page unset, status: queued, add note: "pending theme approval")
              and STOP until Luke approves. Do not create anything.
         5. ON APPROVAL:
              a. Create Memory/Long-Term/<ThemeName>/ (with an empty _index.yaml stub)
              b. Append to _index.yaml themes: block
              c. Append to meta-about.md "Included Long-Term stores" list
              d. Create the hub node Nodes/<kebab-slug>.md from Template_IdeaPage.md
                   (type: theme, format: topic — no content body; SET_THUMBNAIL; SET_FORMAT)
              e. Update _index.yaml pages: (add the hub) and tags:
              f. RESUME ABSORB from step 3 (WRITE CONTENT → THE NEW STORE)
         6. LOG the new theme creation in Logs/skills.log.
       WRITE verbatim into that store, matching the store's house style:
         // ── SMALL ITEM (aphorism / maxim / one-line formula / bare quote) ──
         IF item is small THEN APPEND it VERBATIM as a bullet (bold-label for maxims) to the store's
              matching list/notes file (e.g. Theology/Notes_*.list.md) — create that file if absent.
         // ── NORMAL CONTENT → a store notes/article file ──
         ELSE find a topic-matching file in the store; APPEND the verbatim content there, OR create
              "<Title>.notes.md" (store frontmatter: title, timestamp, topic, type) and write the
              verbatim content, FORMATTED only (headings/bullets/tables/bold — never summarised).
         store_ref = "<Title> (notes) :: <store>/<file>"   // remembered for step 5
         // Capture of Luke's own supplied material is normal, un-gated (like adding a page). The store
         // write does NOT generate or send anything. Only promote/drop/retire is gated (see CHURN).
  4. FILE THE POINTER NODE — find best-fit, else create (a pure pointer, NO content body):
       FILTER graph.pages BY (tag-overlap OR title/topic match) INTO candidates
       MATCH candidates
         CASE strong-fit THEN target = that node
         CASE none       THEN
           // ── CREATE the node (pointer only — content is in the store, not here) ──
           target = NEW page from Template_IdeaPage.md (slug = kebab topic)
                                                // WRITE the file to Memory/Long-Term/LukeatronWiki/Nodes/<slug>.md
           SET_FORMAT(target)                   // article | list | topic | support — see ladder below
           SET type + topic + emoji (the two chips)
           SET_THUMBNAIL(target, item)          // strict-guard image — see ladder below
           // NO lead/body content written onto the node — the store holds it.
       APPEND item to target "To Read / Watch / Write" as "<intent> · <ref> · <why>"
       record sources[]; SET _queue row.page = target.slug
       IF target pre-existed AND target.thumbnail is empty AND this item yields a usable image
         THEN SET_THUMBNAIL(target, item)                          // backfill a missing thumbnail, same ladder
       POINT — add the longterm_refs that route the node to its content:
         IF store_ref THEN ADD store_ref to target.longterm_refs        // where THIS absorb's content now lives
         SCAN Memory/Long-Term/<subject stores> for OTHER files matching the node's topic/tags
           (read each store's _index.yaml on demand; do NOT open every file)
         FOR each strong match → ADD a longterm_refs entry "Label :: <store>/<file>"
           // a REFERENCE, read-only. NEVER copy store content onto the node (no duplication).
         ASSERT a content-bearing node has ≥1 longterm_ref (topic hubs / pure backlog stubs are exempt)

  // ── SET_FORMAT(page) — choose the NODE layout (orthogonal to `type`). Content is in the store. ──
  //   list    : a node for a short collection (aphorisms, maxims, quote/link lists) — the collection
  //             itself lives in the store's list file; the node points to it.
  //   topic   : a HUB for a subject — its member roll is built LIVE by the viewer from
  //             the index (pages sharing this topic/tag). Body = short orientation + curated
  //             See Also only. Holds no absorbed content, so it need not carry a longterm_ref.
  //             Create one when a subject has several pages worth gathering; keep topic/tags accurate.
  //   support : how-the-wiki-works / setup / help (rare — e.g. meta-about). The wiki's own self-doc:
  //             NOT absorbed material, so it MAY carry body text and need not point to a store.
  //   article : everything else (long-form node). The default. Content lives in the store.

  // ── SET_THUMBNAIL(page, item) — auto top-right infobox image, under a STRICT TOKEN GUARD ──
  //   GUARD (hard cap, non-negotiable): at most ONE lightweight web search + ONE image fetch per page.
  //     If the first obvious candidate isn't in hand after that, ABANDON — do NOT browse on, open
  //     multiple tabs, screenshot pages, or keep searching. A thumbnail is a nicety, never worth a
  //     token spend. The TOPIC-BOX emoji is the always-available fallback, so a missing image costs nothing.
  //   Resolve in this order; take the FIRST cheap hit and stop:
  //     a) FREE/KNOWN endpoint (cheapest, preferred) — for a BOOK, the cover via OpenLibrary
  //          (covers.openlibrary.org by ISBN/title) — a single direct GET. For a VIDEO, its thumbnail URL.
  //     b) THUMBNAILS store — an existing topic-matching file in Memory/Long-Term/Thumbnails/
  //                          → reference it IN PLACE, read-only: thumbnail = "../../Thumbnails/<file>"
  //     c) ONE lightweight search — a single open-license / source-og:image search via
  //          !HeadlessChromeBrowser, then ONE fetch of the best candidate. Nothing obvious → ABANDON.
  //     d) NONE → leave thumbnail "" (the topic box still renders its emoji). Page creation proceeds regardless.
  //   ON a download (a/c): save to Memory/Long-Term/LukeatronWiki/_media/<slug>.<ext>
  //                        SET page.thumbnail = "_media/<slug>.<ext>"  (path the viewer serves & ROOT-fences)
  //   ALWAYS set page.thumbnail_caption = short credit/source line (attribution + link), or "" if none.
  //   Only IMG_TYPES the viewer serves: png · jpg · jpeg · gif · webp · svg.
  //   TOPIC BOX: also SET page.topic + page.emoji (the subject chip). type drives the kind chip.
  //     Emoji map (kind chip): book 📖 · theme 🧩 · question ❓ · source 🔗 · person-idea 👤 · meta 🗂️
  5. LINK — the load-bearing step. Connect target to every related page:
       FOR each related page R:
         ADD R.slug TO target.related  AND  ADD target.slug TO R.related   // BIDIRECTIONAL
         ADD a "See Also" line on BOTH pages
       ASSERT every related link has its reciprocal ELSE fix the missing end
       IF a topic HUB exists for this page's subject → ensure the page's topic/tags let it
         surface in that hub's live member roll (no manual member list needed)
  6. SET target.updated = today; bump status seed→growing→developed if earned
  7. UPDATE _index.yaml (upsert page incl. its `format`, refresh tags{}, bump count); UPDATE _queue.yaml (bump count)
  8. MAIN PAGE is VIEWER-GENERATED — serve.py builds "Recently updated", "From the archive",
       Hubs and the link rail LIVE from _index.yaml + page frontmatter. Do NOT hand-write snapshots
       into lukeatronwiki.md (that stub is a thin intro + a link to [[meta-about]]). Just keep
       _index.yaml current and ensure page.updated = today so it surfaces under "Recently updated".

// ───────────────────────── WORK (the backlog) ─────────────────────────
IF mode == WORK THEN
  1. FILTER backlog BY (intent if asked) AND status ∈ {queued, active}
  2. RANK by Luke's cue (oldest, by topic cluster, quick-wins) ; REPORT grouped read / watch / write
  3. ON Luke acting an item: SET status queued→active→done; bump _queue + the page checkbox
  4. A "done" READ/WATCH may seed VERBATIM takeaways — offer to capture Luke's own words (never an AI
     summary) and WRITE them INTO the node's store (per ABSORB step 3), not onto the page; ensure the
     node's longterm_refs point at that store file

// ───────────────────────── EXPLORE ─────────────────────────
IF mode == EXPLORE THEN
  1. LOCATE seed pages by tag/title match ; TRAVERSE related[] 1–2 hops INTO neighbourhood
  2. ALSO traverse the page's longterm_refs INTO the Long-Term stores — the existing store content
     is part of the graph (referenced, not copied)
  3. REPORT the cluster + strongest links + GAPS (pages/stores that SHOULD connect but don't;
     tensions across pages that together suggest a NEW page or a new Long-Term reference)
  4. PROPOSE a concrete move (new link, new longterm_ref, new page, next thing to read). On yes ➔ ABSORB it.

// ───────────────────────── CHURN (Long-Term lifecycle) ─────────────────────────
IF mode == CHURN THEN
  MATCH action
    CASE promote-node-durable  THEN the content already lives in a store (ABSORB wrote it there). Promotion
                                   FORMALISES it: graduate the scattered notes into the store's primary
                                   <store>.md / a proper article, add/refresh the store's _index.yaml row,
                                   SET node status: promoted, keep the node as a permanent pointer (its
                                   longterm_refs already aim at the home) — via !ArchiveMemory (gated)
    CASE promote-write-serious THEN DELEGATE to !CreatePlan → spin a real Project in Memory/Medium-Term/Projects/;
                                    SET the _queue 'write' row status: promoted (note project id)
    CASE drop-stale            THEN route the node/item retirement through !ArchiveMemory (Long-Term is gated);
                                    SET _queue row status: dropped. NOTE: dropping the wiki NODE does NOT
                                    delete the store content it pointed at — that is the store's to keep or
                                    retire on its own (a separate !ArchiveMemory decision).
  NEVER prune the wiki itself — only its stale CONTENTS, and only via !ArchiveMemory. The fixture is permanent.

CATCH page-orphaned (no related, not in index) ➔ flag it and propose a link
CATCH _index/_queue stale (file on disk missing from index) ➔ reconcile, report drift
// EXECUTION_END
```
Note: adding nodes/items AND writing Luke's own supplied material into a subject store is normal capture
— no gate (it neither generates nor sends). The only gated steps are FORMALISING a node into a store's
primary page and dropping/retiring a node or item — both run through !ArchiveMemory (gated, user-reviewed).
Promoting a serious 'write' to a Project goes via !CreatePlan.

## ✅ OUTPUT
ABSORB → the item is a row in _queue.yaml (kind · intent · status); its VERBATIM content is written INTO
  the matching Memory/Long-Term/<subject store> (Luke's/source's own words, formatted; no AI summary, no
  extracted key points); and a POINTER NODE in LukeatronWiki (no content body) links bidirectionally to its
  neighbours, routes to that store content via longterm_refs, and carries a `format` + a thumbnail (or "" —
  never blocked); _index.yaml reflects it. No orphans; the wiki holds NO content, only the graph.
  ABSORB (no theme match) → a PROPOSE-NEW-THEME proposal is routed through !Checkpoint; the item's _queue
  row is parked (page unset, status: queued, note: "pending theme approval") until Luke approves. On
  approval: new Long-Term folder + _index.yaml themes: entry + meta-about.md line + hub node are created,
  and ABSORB resumes into the new store.
WORK   → a grouped read/watch/write backlog with a clear "next", statuses updated as Luke acts.
EXPLORE→ a connection map across nodes AND referenced Long-Term stores: cluster, strongest links, gaps, one move.
CHURN  → the node formalised (store primary page / Project) or retired via !ArchiveMemory, the wiki itself untouched.

**Validation Check (Self-Test)**
```
VERIFY (no wiki page holds substantive content — content lives in a store; the node only routes) == true ELSE move it to the store
VERIFY (the store write is verbatim — no AI summary / extracted "key points" / "{AI}" prefix) == true ELSE strip it
VERIFY (every content-bearing node has ≥1 longterm_ref pointing at its store content) == true ELSE write the content + add the ref
VERIFY (every page in target.related lists target back) == true ELSE repair the one-way link
VERIFY (target page in _index.yaml.pages AND tags{} updated AND `format` recorded) == true ELSE re-upsert
VERIFY (every longterm_refs entry resolves to a real Memory/Long-Term/ file AND nothing was copied) == true ELSE fix/clear
VERIFY (every absorbed item has a _queue row AND that row's page resolves to a real page) == true ELSE reconcile
VERIFY (if target.thumbnail is set, the file it points to exists and is an IMG_TYPES ext) == true ELSE clear it to "" (never a dead image)
VERIFY (the wiki fixture — lukeatronwiki.md, _index.yaml, _queue.yaml — was NOT pruned) == true
VERIFY (if PROPOSE-NEW-THEME fired: !Checkpoint was run AND nothing was created before approval) == true ELSE revert
VERIFY (if a new theme was approved: _index.yaml themes: block + meta-about.md list + hub node ALL updated consistently) == true ELSE fix the gap
```

**Error Path**
```
CATCH [*] ➔ never drop the item silently: if it can't be placed, leave its _queue.yaml row with page unset (status: queued) and tell Luke it's unfiled and needs a home. Do NOT invent a page just to park it.
```

<!--
WIKI PAGE TEMPLATE — source of truth for pages in LukeatronWiki
================================================================================
WHAT THIS IS
  • One page in Memory/Long-Term/LukeatronWiki/Nodes/ — a Wikipedia-style node in
    Luke's idea graph. A page is a NOUN you can link to (a theme, a book, a
    question, a source), not a task. Projects complete things; LukeatronWiki helps
    Luke THINK, find connections, and queue the material that feeds the thinking.
  • The value of the wiki is its INTERCONNECTION. Every page must link out
    (`related`, "See also") and be reachable from the index. An orphan page is a
    note, not a wiki node.

POINTER NODES — THE RULE THAT MATTERS MOST
  • A wiki page DOES NOT HOLD the substantive content. The content — Luke's own
    words, or the source's own quotes — is WRITTEN INTO the matching
    Memory/Long-Term/<subject store> (e.g. Theology/, Philosophy/, Coding/), and
    the page POINTS to it via `longterm_refs`. The wiki is the connective graph;
    Memory/ is where information lives (Memory Governance — no duplication).
  • A page is therefore PURELY CONNECTIVE: the two chips (kind + subject), the
    read/watch/write queue ("To Read / Watch / Write"), the See Also edges, and the
    `longterm_refs` that route to the store file(s) holding the content. NO body of
    substantive content on the page itself.
  • VERBATIM still governs the STORE write: what lands in the subject store is
    Luke's own words / the source's own quotes, exact. The agent NEVER writes a
    summary, NEVER extracts or invents "key points", NEVER paraphrases into AI
    prose. The agent's only generative role is FORMATTING the verbatim content in
    the store + LINKING the wiki node (chips, See Also, longterm_refs).

DRAWS ON LONG-TERM (existing + new)
  • A page connects to the Long-Term subject stores — BOTH the existing content AND
    the new content the absorb just wrote into a store.
  • `longterm_refs` points INTO Memory/Long-Term/<store>/ files — a REFERENCE,
    read-only, NEVER a copy. The viewer renders these as "Related in Long-Term" and
    serves the referenced file read-only. This rail is now where the page's content
    is read, so a content-bearing page MUST carry at least one longterm_ref.

WHERE IT LIVES
  • Memory/Long-Term/LukeatronWiki/Nodes/<topic-slug>.md  — one file per page (the node).
    (The control surface — lukeatronwiki.md, meta-about.md, _index.yaml, _queue.yaml,
    _media/ — stays at the LukeatronWiki/ root; only the pointer nodes live in Nodes/.)
  • The CONTENT lives in Memory/Long-Term/<subject store>/ — pointed to by longterm_refs.
  • Catalogued in Memory/Long-Term/LukeatronWiki/_index.yaml (the connective
    tissue: every page, its tags, and its links). Missing from the index = invisible.
  • The read/watch/write items on a page are mirrored in the wiki's _queue.yaml.
  • Maintained by !IdeaWiki, which keeps links bidirectional and the index/queue live.
  • Long-Term fixture: pages still churn (durable nodes graduate into a Project or a
    formal store page, stale ones retire) — but that churn runs through !ArchiveMemory
    (gated), not !PruneMemory. The wiki itself is permanent.

LINKING RULE (the one that matters)
  • Links are BIDIRECTIONAL. If page A lists B in `related`, B lists A too, and both
    carry a "See also" line. !IdeaWiki enforces this; if you edit by hand, do both ends.

FORMATS — pick one per page (the `format` field; orthogonal to `type`)
  • article  — long-form node. Its content lives in a store file; the page points to it.
               The default.
  • list     — a node for a short collection (aphorisms, maxims, quote/link lists). The
               collection itself is appended to the matching store list file; the page
               points to it. Small standalone items attach to the matching "<topic>" list
               node rather than getting their own node.
  • topic    — a HUB. Its member roll (every page sharing this topic/tag) is built
               LIVE by the viewer, so it never goes stale. The page body is just a
               short orientation + curated See Also; do NOT hand-list members. (A hub
               MUST carry a longterm_ref for every file in the store it fronts —
               the hub IS the store's entry point, and a hub with no refs is an
               empty shell the reader cannot get out of. Settled by Luke
               2026-09-12; supersedes the earlier "need not carry a longterm_ref".)
  • support  — how-the-wiki-works / setup / help (e.g. meta-about). The wiki's own
               self-documentation — NOT absorbed material — so it may carry body text
               and need not point to a store. Excluded from the auto Main-Page feeds.

USING THE TEMPLATE
  • Sections to keep: frontmatter · "To Read / Watch / Write" · "See Also".
    A content-bearing node carries NO substantive body — its content is in the store
    pointed to by `longterm_refs`. (No verbatim body on the page. No AI "Key Points"
    digest. No "{AI} Notes". No "Open Questions".)
  • TOPIC BOX: the page renders a two-chip box top-right (beside the thumbnail) —
    a KIND chip from `type` (📖 book · 🧩 theme · ❓ question · 🔗 source · 👤 person-idea),
    and a SUBJECT chip from `topic` + `emoji` (e.g. ✝️ Theology, ☪ Islam, 💻 Coding).
  • Leave a <placeholder> in any section with no data yet. Delete this comment block
    from the finished page.
================================================================================
-->
---
slug: "<topic-slug>"                 # = filename, kebab-case; the wiki link target. Never changes.
title: "<Human-readable page title>"
description: "<one-sentence OKF summary of what this node points to / its topic>"
type: theme                          # theme | book | question | source | person-idea — drives the KIND chip
format: article                      # article | list | topic | support — page LAYOUT (orthogonal to type)
topic: ""                            # SUBJECT chip label in the top-right box (e.g. "Theology", "Islam", "Coding")
emoji: ""                            # the subject chip's emoji (e.g. ✝️, ☪, 💻). Leave "" to fall back to a tag/💡
status: seed                         # seed → growing → developed
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>                 # bump on every edit
tags: []                             # topic tags — shared tags cluster pages in the index (and feed topic hubs)
related: []                          # slugs of linked pages — the wiki edges (keep bidirectional)
longterm_refs: []                    # WHERE THE CONTENT LIVES — read-only references INTO Long-Term stores:
                                     #   "Label :: Philosophy/Thoughts about AI.notes.md" or a bare path.
                                     #   A reference, NEVER a copy. A content-bearing node MUST have ≥1.
sources: []                          # URLs, video links, book refs (title — author), people IDs
thumbnail: ""                        # representative image (top-right infobox). !IdeaWiki sets this
                                     #   automatically on new pages — auto-saved downloads land in
                                     #   _media/<slug>.<ext>; a curated image may instead be reused
                                     #   read-only as ../../Thumbnails/<file>. May also be an http URL.
                                     #   Leave "" for none (the infobox just won't render the image).
thumbnail_caption: ""                # optional one-line caption/credit under the thumbnail (supports links)
version: "1.0.0"
---

# <Title>

<!-- POINTER NODE — no substantive content here. The content lives in the Memory/ store
     pointed to by `longterm_refs` (rendered below as "Related in Long-Term", served
     read-only by the viewer). This node only routes: chips, the queue, See Also edges.
     For `format: topic`, this lead may be a short orientation — the member roll is
     auto-generated by the viewer. For `format: support`, body text is allowed (the wiki's
     own self-documentation). Inline-link other pages with [[other-slug]]. -->

## To Read / Watch / Write
<!-- Each item here is also a row in _queue.yaml (kind · intent · status). -->
- [ ] read · <Book — Author> · <why it's here>
- [ ] watch · <video URL> · <why it's here>
- [ ] write · <piece Luke wants to author> · <when serious → promote to a Project>

## See Also
- [[<related-slug>]] — <one line on how it connects>
<!-- Every entry here MUST have the reciprocal link on the other page.
     Long-Term store references — INCLUDING where this node's content lives — go in the
     `longterm_refs` frontmatter (rendered as "Related in Long-Term"), NOT here.
     See Also is for wiki-internal [[slug]] edges. -->

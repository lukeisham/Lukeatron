<!-- Template — README.md for !AppDevelopment Phase 4. Written once the build is verified,
     folding the documentation spec's cross-app section and navigation map down to what the code
     cannot say for itself.
     Each section has a fixed AUDIENCE — write it for that reader, not the others:
       - Purpose, Launch/Restart, Navigation — for a HUMAN (Luke) as much as for an agent. Plain
         English, nothing assumed.
       - Cross-app behaviour — for an AGENT that will build or change this later. Written AI for
         AI: dense, technical, contract-shaped is fine here; it does not need to read as prose.
     No decisions here, of any kind — the code is self-documenting; that is not this file's job.
     An architectural point that is itself cross-app or multi-file belongs under Cross-app
     behaviour below (it cannot go anywhere else, since no single file carries it). A decision
     Luke explicitly wants logged goes to app-decisions.md → Key decisions instead. Neither is
     restated here once it has a home.
     No file-specific commentary either — a file's own name and contents describe it; if a comment
     is doing that job, delete the comment, do not write it here.
     The code is the style guide — do not restate a token, colour, size, or duration value here.
     The one exception: if styling is split across more than one file, or a HouseStyle
     classification governs how every file relates to a shared chassis, that is a cross-file fact
     the code's own comments cannot carry — it goes under Cross-app behaviour too.
     Delete these comment lines when instantiating. -->

# <Name>

<One paragraph, no more — the PRD's Purpose trimmed to prose. What this is, who uses it, when.
Always the first thing under the title. For Luke as much as for an agent.>

## Launch / restart
<!-- OPTIONAL — for a HUMAN. Include only when there is something non-obvious to say (a server to
     start, a hook to re-run, a specific URL/port). Omit the whole section, not a stub, when
     opening the app IS the instruction (e.g. a single static page opened by URL). Brief dot
     points, plain commands, nothing an agent needs to interpret. -->
- <e.g. "Run `python3 server.py` from this folder, then open `http://localhost:<port>`.">
- <e.g. "To restart: stop the process (Ctrl-C) and run the command again.">

## Navigation
<!-- For a HUMAN as much as for an agent. An ASCII-style site map. Structure only — no per-file
     "what it does / why it's separate" commentary; the file's own name and contents carry that. -->
```
<Name>/
├── <file or folder>
├── <file or folder>
└── <folder>/
    └── <file or folder>
```

## Cross-app behaviour
<!-- Written AI for AI — dense and technical is fine. Always present, even when there is none —
     say so outright rather than omitting the section. -->
<What talks to what across a module or host boundary: what each side may assume, what breaks if
that assumption changes. A widget's host boundary always belongs here.
Also any architecture that is itself cross-app or multi-file — the reasoning behind a shared
seam, not just its runtime contract — since no one file's comments can carry it.
If styling is split across more than one file, or a shared HouseStyle classification governs
every file's relationship to a chassis, name that here too. Otherwise the code is the style
guide; do not restate a token or value.
If none of the above applies: "No cross-app behaviour — <Name> is self-contained." and stop.>

## Decisions and exceptions
See `app-decisions.md` for what Luke has approved, any decision he explicitly flagged, and any
granted Vibe-Coding rule exceptions. Not copied here.

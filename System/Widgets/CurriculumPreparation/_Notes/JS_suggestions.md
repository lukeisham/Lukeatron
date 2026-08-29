c) Reinventing wheels (tree layout, limited Markdown, coverage grid, etc.) in vanilla JS raises costAccept that some reinvention is the price of the constraints, then ruthlessly minimise the surface area.Isolate and freeze the hard pieces early  Tree layout → one pure function, thoroughly unit-tested against the fixture, never touched again.  
Markdown → extremely limited subset (bold, italic, unordered lists, maybe simple links). A 30–50 line state-machine or regex parser is fine and stays readable. Do not aim for CommonMark.  
Coverage grid → plain HTML table or SVG grid driven by the same data model; CSS does the heavy lifting. No custom grid engine.

Internal “lib” discipline (still zero external deps)  Create a small app/lib/ folder inside every bundle (or in the template) that holds the shared pure functions: tree layout, limited Markdown, geometry helpers, invariant checks, image placement.  
Copy or symlink from the template; treat it as project-owned code, not a package. This prevents duplication across documents while staying 100 % vanilla and offline.

Generate more, hand-code less  Prefer data → coordinates → SVG over hand-tuned layout per page.  
The style-guide tokens and document-shell already centralise geometry; lean on them harder so individual documents contain almost no layout arithmetic.

Only consider a single vendored pure-JS snippet if the measured cost is extreme  Example: a tiny, dependency-free tidy-tree implementation (a few hundred lines) could be copied into lib/ if writing it from scratch proves error-prone. Document the provenance and freeze the file. Do not open the door to npm or frameworks. This is a last resort after the fixture unit proves the pain.

Prioritisation rule for the remaining waves  Wave 1–2: only the algorithms required by the fixture unit.  
Everything else starts as the simplest correct version. Polish or generalise only when a second real unit demands it.

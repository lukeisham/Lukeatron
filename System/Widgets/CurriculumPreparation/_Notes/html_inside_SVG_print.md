a) SVG-first + adjacent HTML forms feel clunky; complex layout (arbor trees, mixed content, image placement) must be built from scratchCore principle: Keep pure SVG for the print/preview surface (non-negotiable for geometry and fidelity). Make the edit surface as comfortable as possible without abandoning the model.Practical steps:Dual-mode UI per document (highest leverage)  Edit mode: clean, data-driven HTML forms/side panels/grids that own the data. Changes write straight into the in-memory model and immediately update a live (throttled) SVG preview pane.  
Print/Preview mode: pure SVG pages exactly as they will print.
This removes most of the “edit beside the SVG” friction for multi-page documents while preserving the SVG as the single source of truth for layout and print.

Progressive interaction on the SVG itself  Click an element → open a compact, positioned popover or fixed side inspector (still pure HTML/CSS).  
For images: simple drag handles + resize corners drawn as SVG overlays; placement is just numbers written back to the model.  
Keyboard shortcuts and focus management so power use does not require constant mouse travel between form and canvas.  
“Click-to-edit” for short text fields (title, note, etc.) that temporarily swap the SVG text node for an absolutely positioned <input>/<textarea>.

Layout isolation and reuse  Implement the arbor-tree algorithm once, in a pure, well-tested module (Reingold-Tilford or a simplified tidy-tree variant). Feed it a clean node list + measured text widths; it returns only coordinates. Never mix layout logic into rendering.  
Pre-compute page breaks and positions for the fixture unit; treat later units as “data in, coordinates out.”  
Image placement and mixed content: store only logical refs + bounding boxes; a single shared “placeImages” routine draws them. Avoid per-page special cases.

Acceptance test that forces usability
Add a spike question (or gate) that measures edit time for a realistic multi-page lesson + image placement + tree tweak. If it exceeds a small threshold, the dual-mode design becomes mandatory before wave 3.

These keep the architecture intact and turn the SVG from an editing surface into a high-fidelity projection.

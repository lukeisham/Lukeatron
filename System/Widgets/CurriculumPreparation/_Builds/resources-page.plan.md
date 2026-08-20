# resources-page — Plan

| Field | Value |
|---|---|
| **Date** | 2026-08-19 |
| **Spec** | [resources-page.build.spec.md](resources-page.build.spec.md) |
| **Wave** | 4 |

## Prerequisites

- `document-shell` specced: A4 portrait page model and image primitive
  available to render into.
- `local-store` specced: JS client over the bundle server available as the
  sole persistence path.
- `image-paste` specced: `ImageRef` shape and the `images/` folder paste flow
  settled — this build adds no second image path.
- Unit-folder schema frozen; the resources-page item shape agreed as an
  addition to it, not a parallel structure.

## Steps

1. **Add the resources-page data shape to the unit schema** — one page per
   unit, a flat ordered array of items, each `{ kind: 'link'|'image'|'text',
   ...kind-specific fields, note? }`. No tier, binding, or coverage field on
   any item. *(FR-RESB-1, FR-RESB-2, AD-RESB-1, AD-RESB-3)*
2. **Build the item renderer** — one dot-point per item, rendered on
   `document-shell`'s A4 portrait page, drawing link/image/text kinds
   distinctly; images drawn through the shell's existing image primitive.
   *(FR-RESB-3, FR-RESB-4, FR-RESB-5, FR-RESB-9)*
3. **Write the scheme-check and escape helpers first**, before wiring any
   rendering to them — a URL scheme allowlist (`http:`/`https:` via
   `.protocol`) and a text-escaping function used everywhere user content is
   interpolated. Nothing renders a link or a text field until these exist.
   *(FR-RESB-13, FR-RESB-14, AD-RESB-5)*
4. **Build the fast-add control** — one control offering the three kinds,
   each revealing only its own field(s) on selection, no other field
   required. *(FR-RESB-7)*
5. **Build edit-in-place, delete (with a lightweight confirm), and
   reorder** (up/down controls plus drag), each mutation going straight
   through `local-store`'s existing save path. *(FR-RESB-8, FR-RESB-11,
   OQ-RESB-4)*
6. **Write the print CSS** — A4 portrait only, flowing across pages with no
   cap, long-URL word-wrap so nothing overflows the page edge. *(FR-RESB-9,
   FR-RESB-10, AD-RESB-4)*
7. **Add the Resources tab** to the widget's top tab bar, wiring it to this
   part alongside the existing five.
8. **Build a 40-item mixed-kind fixture list**, including one 200-character
   URL, one `javascript:` URL, one `data:` URL, and one text item containing
   `<img src=x onerror=...>` — the fixture used for every gate and print
   test below.
9. **Run the network-request gate test** — network disabled / requests
   logged, add + edit + view + print the fixture, confirm zero outbound
   requests and only same-origin `local-store` calls. *(FR-RESB-12, AC-RESB-8)*
10. **Run the URL-scheme gate test** — confirm the `javascript:`/`data:`
    fixture links render inert, the `https://` fixture link renders
    clickable. *(FR-RESB-13, AC-RESB-9)*
11. **Print the fixture list** and measure: page count, page box mm, the
    200-char URL's wrap behaviour. Record below. *(FR-RESB-9, FR-RESB-10,
    AC-RESB-6, AC-RESB-7)*
12. **Run the content-blindness grep** — confirm no curriculum/lesson/tiering
    vocabulary or binding field appears in the build. *(AC-RESB-11)*

## Verification

- [ ] **AC-RESB-1** — unit opens with its one resources page present, no
      create-a-second-one control *(step 1)*
- [ ] **AC-RESB-2** — adding each kind takes one action plus that kind's own
      field(s) only *(step 4)*
- [ ] **AC-RESB-3** — reorder persists across reload *(step 5)*
- [ ] **AC-RESB-4** — in-place edit updates render + saved file *(step 5)*
- [ ] **AC-RESB-5** — delete removes item, order preserved for the rest
      *(step 5)*
- [ ] **AC-RESB-6** — 40-item fixture prints multi-page A4 portrait, page box
      210 × 297 mm, no unreadable item split *(step 11)*
- [ ] **AC-RESB-7** — 200-char URL wraps, no horizontal overflow, edit view and
      print view *(step 11)*
- [ ] **AC-RESB-8** *(gate)* — zero outbound requests during add/edit/view/
      print *(step 9)*
- [ ] **AC-RESB-9** *(gate)* — blocked schemes inert, `https://` clickable
      *(step 10)*
- [ ] **AC-RESB-10** — hostile text item renders as literal text, not markup
      *(steps 3, 8)*
- [ ] **AC-RESB-11** — grep for lesson/student/curriculum/outcome/vcaa/
      victoria/bigIdea/nodeId finds nothing outside comments/fixtures
      *(step 12)*
- [ ] No `innerHTML` with user-entered content anywhere in the build *(step 3)*
- [ ] Persists only through `local-store`; no direct filesystem access
      *(step 5)*

## Measurements

> *Filled at step 11. Empty until the build runs.*

| What | Expected | Measured |
|---|---|---|
| Fixture item count | 40 | — |
| Page count | *(per step 11)* | — |
| Page box | 210 × 297 mm | — |
| Long-URL (200 char) wrap | wraps, no overflow | — |
| Outbound requests during full pass | 0 | — |
| Blocked-scheme links rendered clickable | 0 | — |

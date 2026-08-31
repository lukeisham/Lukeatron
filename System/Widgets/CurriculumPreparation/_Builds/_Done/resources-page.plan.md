# resources-page — Execution Plan

**Build:** resources-page (Wave 4, prerequisite: document-shell, local-store, image-paste)  
**Status:** Ready for implementation  
**Date:** 2026-08-29

---

## 1. Files

Exact paths under `_template/`:

| Path | Purpose | Owned by this build |
|------|---------|---|
| `app/js/resources-page.js` | Module: render flat list of links/images/text, add/edit/delete/reorder items, validate URLs, escape content, persist via local-store | Yes |
| `app/css/resources-page.css` | List layout, link styling, image display, text wrapping, print pagination, responsive spacing | Yes |
| `tests/test_resources-page.js` | Smoke: create items (link/image/text), edit, delete, reorder, verify no network requests, validate URL schemes, escape HTML | Yes |

**Consumed (not owned):**
- `app/js/document-shell.js` — A4 portrait page model, render loop, image primitive
- `app/js/image-paste.js` (wave 2, not yet specced) — ImageRef model, images/ manifest
- `app/js/local-store.js` — read/write unit.json via `store.loadUnit()` / `store.saveUnit()`
- `app/css/variables.css` — colour, spacing, typography tokens

**NOT consumed (deliberately excluded):**
- No curriculum binding
- No big-idea binding
- No assessment binding
- No traceability-links integration (resources excluded from graph per AD-26)

---

## 2. Steps

### Phase 1: Schema & Data Model

- [ ] Verify resourcesPage schema per datamodel: `{ id, items[] }`
- [ ] Each item: `{ id, kind, order, url?, label?, imageId?, text?, note? }`
- [ ] Enum kind: exactly `"link"` | `"image"` | `"text"` (no fourth value)
- [ ] Item fields:
  - Link: `url` (required), `label` (optional, defaults to URL if empty)
  - Image: `imageId` (required), resolves to images[] manifest
  - Text: `text` (optional, no length cap), no formatting
- [ ] Optional `note` on any kind (caption/metadata)
- [ ] Initialize empty resourcesPage if not present in loaded unit

### Phase 2: Rendering (A4 Portrait, No Page Cap)

- [ ] Implement `renderResourcesPage(resourcesPage, images)` → DocumentShell instance:
  - A4 portrait: 210×297mm viewBox
  - Flat, ordered list of items flowing across as many pages as needed (no hard cap, unlike crib sheet)
  - Each item: kind determines display
    - Link: clickable `<a href>` with label text
    - Image: rendered via document-shell.renderImage() primitive, missing-image placeholder on 404
    - Text: plain text block, no formatting
  - Optional note/caption below each item
  - Long URLs wrap (CSS word-wrap/break-word) rather than overflow page edge
  - Page breaks flow naturally; items don't split across breaks

### Phase 3: Add Item (Low-Friction Control)

- [ ] Implement item-add interface:
  - Kind selector: three buttons or dropdown (Link / Image / Text)
  - On kind select, show only required fields for that kind:
    - Link: URL input (required), Label input (optional)
    - Image: "Paste image" button (via image-paste flow)
    - Text: `<textarea>` (optional, no length/formatting constraints)
  - Note field (optional, any kind)
  - "Add" button (adds nothing if required field empty)
  - No binding, tier, category, or other field required
  - Low-friction: one action, fill fields, done

### Phase 4: Edit & Delete

- [ ] Implement in-place edit: click item to select, form fills, edit any field, auto-save
- [ ] Implement delete with lightweight confirm (distinct from no-confirm add)
  - Click delete → inline confirm button → on confirm, remove from list
  - No undo after confirm (FR-RESB-17)
- [ ] Auto-save on every edit through `local-store` (debounced)

### Phase 5: Reorder

- [ ] Implement reorder: up/down buttons or drag-and-drop
- [ ] Reorder updates array order, not separate `sortIndex` field (AD-RESB-3)
- [ ] Auto-save on reorder through `local-store`

### Phase 6: URL Validation (Scheme Allowlist)

- [ ] Implement URL scheme check before rendering as clickable link (FR-RESB-13):
  - Parse URL with `new URL(urlString)`
  - Allow only `.protocol === 'http:' || .protocol === 'https:'`
  - Any other scheme (`javascript:`, `data:`, `file:`, bare string, unrecognized) → store as inert text, never clickable
  - Render inert as `<span>` or plain text (no `<a href>`)
  - Test both blocked and permitted paths (AC-RESB-9)

### Phase 7: HTML Escaping & XSS Prevention

- [ ] **HTML-escape before inserting** (FR-RESB-14, JS-6):
  - Link label: `htmlEscape(label)` before `textContent` or interpolation
  - Link URL: only after scheme validation, safe to set `href`
  - Text item body: `htmlEscape(text)` before `textContent`
  - Note/caption: `htmlEscape(note)` before `textContent`
  - Never use `innerHTML` with item content
- [ ] Test XSS attempt: `<img src=x onerror=alert(1)>` in label/text → renders as literal visible text (AC-RESB-10)

### Phase 8: Network Safety (Zero Outbound Requests)

- [ ] Audit and **prevent all network requests** (FR-RESB-12):
  - No favicon fetch on link add
  - No preview/title fetch on link add
  - No oEmbed/thumbnail call
  - No `<img>` pointed at remote origin (images only from bundle via image-paste)
  - No `<link rel="preload">` or similar
- [ ] Test with network disabled and all requests logged: zero outbound calls (AC-RESB-8, TEST-7 network gate)

### Phase 9: Integration with image-paste

- [ ] Use image-paste's existing "Paste image" flow (not a new image path)
- [ ] Accept ImageRef objects: `{ imageId, x, y, width, height }`
- [ ] Render via `document-shell.renderImage()` primitive
- [ ] If image file missing: render document-shell's placeholder (not blank)

### Phase 10: No Structure Rules (Enforcement)

- [ ] Audit code to enforce AD-RESB-1 (no binding, no tiering, no curriculum connection):
  - Grep source for `lesson`, `student`, `curriculum`, `outcome`, `vcaa`, `victoria`, `bigIdea`, `nodeId` → must return nothing outside comments/fixtures (AC-RESB-11)
  - Never add fields for tier, tier color, assessment link, coverage, or binding
  - Items have `kind` only (no fourth type, no discriminator beyond these three)
- [ ] Refuse any impulse to add structure: "just one field for the tier" → explicitly reject with design rationale

### Phase 11: Print

- [ ] Print flows content across A4 portrait pages, no hard page cap
- [ ] Each item renders readable with no split mid-item if possible (CSS `break-inside: avoid`)
- [ ] Long URLs wrap, not overflow

### Phase 12: Tests & Verification

- [ ] Test: add link, image, text each in one action (AC-RESB-2)
- [ ] Test: reorder item, reload, order persists (AC-RESB-3)
- [ ] Test: edit item in place, re-renders and saves (AC-RESB-4)
- [ ] Test: delete item, confirm, removed from list and file (AC-RESB-5)
- [ ] Test: 40-item fixture prints multiple A4 pages, no split items (AC-RESB-6)
- [ ] Test: 200-character URL wraps in edit and print views (AC-RESB-7)
- [ ] Test: network disabled, add/edit/view/print → zero outbound requests (AC-RESB-8, TEST-7)
- [ ] Test: `javascript:alert(1)` and `data:text/html,...` links render inert; `https://` link is clickable (AC-RESB-9, TEST-7)
- [ ] Test: text with `<img src=x onerror=...>` renders literal (AC-RESB-10)
- [ ] Test: grep for curriculum/lesson/tier keywords returns nothing (AC-RESB-11)

---

## 3. Interfaces

### Exports (for main app to import and call)

```javascript
// resources-page.js
export class ResourcesPage {
  constructor(unit) { }

  // Render to SVG pages
  render() → DocumentShell instance

  // Add item methods
  addLink(url, label, note) → void (auto-save)
  addImage(imageRef, note) → void (auto-save)
  addText(text, note) → void (auto-save)

  // Edit/delete/reorder
  editItem(itemId, updates) → void (auto-save)
  deleteItem(itemId) → void (auto-save, after confirm)
  reorderItem(itemId, direction) → void (auto-save)

  // Queries
  getItems() → items[]
}

export function validateURLScheme(urlString) → { isValid: boolean, protocol?: string }
export function htmlEscape(text) → string
```

### Consumes

```javascript
// from document-shell
DocumentShell class

// from image-paste
ImageRef shape: { imageId, x, y, width, height }

// from local-store
store.loadUnit() → { resourcesPage, images[], ... }
store.saveUnit(unit) → Promise

// from standard library only
URL (built-in parser for scheme validation)
```

---

## 4. Verification

One row per acceptance criterion, mapped to concrete runnable check:

| AC-* | Check | How to verify |
|------|-------|---|
| AC-RESB-1 | Unit opens with resourcesPage present, empty, no "create" control | Load fixture, verify resourcesPage object exists, no add-new-page control in UI |
| AC-RESB-2 | Add link, image, text each take one action + that kind's fields only | Add each kind: verify only required fields shown, no other field required |
| AC-RESB-3 | Reorder item (move up/down), reload, order persists | Reorder fixture items, save, reload, verify same order |
| AC-RESB-4 | Edit item in place, updates rendered list and saved file | Fixture: edit link label → reflected on screen and in file |
| AC-RESB-5 | Delete item removes it from list and file; relative order of rest preserved | Fixture with 3 items: delete middle → remaining two in correct order |
| AC-RESB-6 | 40-item fixture prints multiple A4 portrait pages, no unreadable breaks | Print fixture, measure page count, verify items readable across pages |
| AC-RESB-7 | 200-char URL wraps in edit and print, no overflow | Fixture with long URL → edit view shows wrapped text, print view wrapped text |
| AC-RESB-8 | **Gate test (TEST-7, network)**: add/edit/view/print, zero outbound requests | Network disabled + request logger: zero calls outside local-store to bundle-server |
| AC-RESB-9 | **Gate test (TEST-7, URL scheme)**: `javascript:` and `data:` links inert; `https://` clickable | Both blocked paths (inert text) and permitted path (clickable anchor) demonstrated |
| AC-RESB-10 | XSS text `<img src=x onerror=...>` renders literal, never executed | Fixture: item text contains XSS payload → renders as visible literal `<img...>` in DOM |
| AC-RESB-11 | Grep source excludes `lesson`, `curriculum`, `outcome`, `vcaa`, `victoria`, `bigIdea`, `nodeId` | Grep build source for each keyword → zero results outside comments/tests |

---

## 5. Risks & Open Points

| Risk | Likelihood | Mitigation | Recommendation |
|------|---|---|---|
| Structure creeps in later ("just one field for tier") | **Low** | AD-RESB-1 recorded with rationale; schema forbids it; grep check (AC-RESB-11) enforces | Document design decision prominently in code comment; revisit only after real use |
| `javascript:` or `data:` URL becomes clickable | **Medium** | FR-RESB-13, AD-RESB-5: validate with URL parser `.protocol`, not regex; test AC-RESB-9 both paths | Use platform's own URL parser; test with encoded variants (`javascript%3A`, etc.) |
| User text reaches DOM via `innerHTML` | **Medium** | FR-RESB-14: never `innerHTML` with item content; test AC-RESB-10 with XSS payload | Audit all interpolation: use `textContent`, `innerText`, or escaped string interpolation only |
| Long URL overflows page edge instead of wrapping | **Low** | FR-RESB-10, AC-RESB-7: CSS `word-wrap: break-word` or `word-break: break-word`, tested against 200-char URL | Test CSS wrap rule against long-URL fixture |
| Favicon fetch or preview call sneaks in "for polish" | **Medium** | AD-RESB-2: forbids all outbound requests; gate test AC-RESB-8 (network disabled) catches it | Test with network monitor; block all non-localhost requests at browser level |
| Reorder loses item on save race | **Low** | Route every mutation through `local-store`'s debounced save; test AC-RESB-3 reload | Verify all reorder/add/delete calls go through store.saveUnit() |
| resourcesPage uninitialized (null/undefined) in older units | **Low** | Initialize empty resourcesPage if missing on load (same pattern as cribSheet) | Check in constructor or load handler; create empty object if missing |

**Recommended defaults for unresolved decisions:**
- Link label default: **URL itself** (if label left blank, display URL) (FR-RESB-3)
- Text item length cap: **unbounded** (FR-RESB-16 — no character limit)
- Text item formatting: **none** (plain text only, no markdown)
- Delete confirm style: **lightweight one-click confirm**, no undo after (FR-RESB-17)
- No structure enforcement: **explicit in code comment** with rationale (AD-RESB-1) so future maintainers understand why no binding exists
- URL scheme whitelist: **`http:` and `https:` only**, checked via `new URL().protocol`


# Actual exported interfaces — as BUILT (verified by grep, not as planned)

Downstream builds MUST import these exact names. Import as ES modules from `./js/<file>.js`.
Do NOT read `window.TIERS` / `window.DocumentShell` — those globals in index.html are not an interface.

## document-shell.js
- `export const TIERS` — the only definition of the three tier colours/names. Never redefine.
- `export class DocumentShell` — `constructor(data, renderFn, orientation)`, `setData(newData)`,
  `render()`, `exportSVG()`, `renderImage(blob, x, y, width, height, svgElement)`.
  Orientation is immutable per document; a part needing both makes two instances.

## local-store.js  (the ONLY door to the disk — never call fetch yourself)
- `export function validateUnit(unit)` → `{ valid, errors[] }`
- `export class LocalStore` — `loadUnit()`, `setData()`, `saveUnit()`, `hasUnsavedChanges()`, `onBeforeUnload()`
- `export { ServerClient, SCHEMA_VERSION, AUTOSAVE_DEBOUNCE_MS }`
- `ServerClient` also carries `uploadImage()`, `deleteImage()`, `fetchImage()` (added by image-paste).

## ids.js
- `export function newId(prefix)` → `<prefix>-<8 lowercase hex>` (AD-BOSS-1)

## domain-resolver.js  (owned by curriculum-editor)
- `export function resolveDomain(nodeId, nodes)` → `"skill" | "knowledge" | null`

## bigidea-list.js  (the hub — sole owner of coverage[] writes)
⚠ **Signature drift to note:** the shared glyph function takes THREE arguments as built, not two:
- `export function computeGlyphSet(bigIdeaId, nodes, resolveDomain)` — pass in `resolveDomain`
  imported from `domain-resolver.js`. (The plan wrote it as 2-arg; the build is 3-arg. Callers must
  match the BUILT signature. Audit to confirm this is the intended shape.)
- `export function resolveTopic(lessonId, lessons, bigIdeas)` → topicId | null
- Writes: `setCoverageEntry(bigIdeaId, nodeId, coverage, note)`, `setTopicCoverageEntry(topicId, nodeId, coverage, note)`
- Big ideas: `addBigIdea(title, topicId, parentId)`, `renameBigIdea`, `reorderBigIdeas`, `reparentBigIdea`, `deleteBigIdea`
- Topics: `addTopic(title)`, `renameTopic`, `reorderTopics`, `deleteTopic`
- Queries: `getLessonsBoundToBigIdea`, `getBigIdeasBoundToTopic`, `getBigIdeas`, `getTopics`, `getBigIdea`, `getTopic`
- Outline/tree: `parseOutlineText`, `renderOutlineText`, `applyOutlineChanges`, `renderAsciiTree`
- Init: `initBigIdeasModule(localStore, loadedUnit)`

## image-paste.js  (sole writer of image files + unit.images[])
- `export class ImagePasteManager`, `export function initImagePaste(localStore, uiCallbacks)`
- Other parts hold `ImageRef`s only and draw them via `DocumentShell.renderImage`.

/** The single place the app touches the network (JS-5). */

/** A failed request keeps its HTTP status so the caller can tell a refused change from an outage. */
async function request(method, path, body) {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw Object.assign(new Error(`${method} ${path} responded ${response.status}`), { status: response.status });
  }
  return response.json();
}

export const fetchItems = () => request('GET', '/api/items');

// Every change answers with the whole fresh Labels tree.
const change = async (method, path, body) => (await request(method, `/api/labels${path}`, body)).labels;

// A label carries its explanation, and may sit under a parent label.
export const createLabel = (name, definition, parentId) =>
  change('POST', '', parentId == null ? { name, definition } : { name, definition, parent_id: parentId });
export const editLabel = (labelId, name, definition) => change('PUT', `/${labelId}`, { name, definition });
export const deleteLabel = (labelId) => change('DELETE', `/${labelId}`);
// A move may also change the parent: `parentId` null is the top level; leave it out to keep the parent.
export const moveLabel = (labelId, index, parentId) =>
  change('PUT', `/${labelId}/position`, parentId === undefined ? { index } : { index, parent_id: parentId ?? 0 });
// With an index the entry goes to that spot among the label's entries (a move if it is already there); without, last.
export const addPlacement = (labelId, entryId, index) =>
  change('PUT', `/${labelId}/entries/${entryId}`, index === undefined ? undefined : { index });
export const removePlacement = (labelId, entryId) => change('DELETE', `/${labelId}/entries/${entryId}`);

// A label's whole list of tables (each `{ caption, colHeads, rowHeads, cells }`, see tablegrid.js) is saved in one go.
export const saveLabelTables = (labelId, tables) => change('PUT', `/${labelId}/tables`, { tables });

// A link label (the Add link button): just a name and an optional parent. The server gives it its own new, empty section at the
// end of the About page and answers with the tree, where the row carries that section's id in `about`.
export const createLabelLink = (name, parentId) => change('POST', '/links', parentId == null ? { name } : { name, parent_id: parentId });

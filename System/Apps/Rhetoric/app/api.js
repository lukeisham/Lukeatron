/** The single place the app touches the network (JS-5). */

/** A failed request keeps its HTTP status so the caller can tell a duplicate name from an outage. */
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

// Every change answers with the whole fresh tree of its group: `topical` or `grammar`.
const change = (prefix, key) => async (method, path, body) => (await request(method, `${prefix}${path}`, body))[key];
const topicalChange = change('/api/topical/types', 'topical');
const grammarChange = change('/api/grammar/labels', 'grammar');
const topicalLinkChange = change('/api/topical/links', 'topical');
const grammarLinkChange = change('/api/grammar/links', 'grammar');

// A Type, like a label, may sit under a parent Type.
export const createType = (name, definition, parentId) =>
  topicalChange('POST', '', parentId == null ? { name, definition } : { name, definition, parent_id: parentId });
export const editType = (typeId, name, definition) => topicalChange('PUT', `/${typeId}`, { name, definition });
export const deleteType = (typeId) => topicalChange('DELETE', `/${typeId}`);
// A move may also change the parent: `parentId` null is the top level; leave it out to keep the parent.
export const moveType = (typeId, index, parentId) =>
  topicalChange('PUT', `/${typeId}/position`, parentId === undefined ? { index } : { index, parent_id: parentId ?? 0 });
// With an index the device goes to that spot among the Type's devices (a move if it is already there); without, last.
export const addPlacement = (typeId, deviceId, index) =>
  topicalChange('PUT', `/${typeId}/devices/${deviceId}`, index === undefined ? undefined : { index });
export const removePlacement = (typeId, deviceId) => topicalChange('DELETE', `/${typeId}/devices/${deviceId}`);

// A Type's or label's whole list of tables (each `{ caption, colHeads, rowHeads, cells }`, see tablegrid.js) is saved in one go.
export const saveTypeTables = (typeId, tables) => topicalChange('PUT', `/${typeId}/tables`, { tables });
export const saveLabelTables = (labelId, tables) => grammarChange('PUT', `/${labelId}/tables`, { tables });

// A link label (the Add link button): just a name and an optional parent. The server gives it its own new, empty section at the
// end of the About page and answers with the tree, where the row carries that section's id in `about`.
export const createTypeLink = (name, parentId) => topicalLinkChange('POST', '', parentId == null ? { name } : { name, parent_id: parentId });
export const createLabelLink = (name, parentId) => grammarLinkChange('POST', '', parentId == null ? { name } : { name, parent_id: parentId });

// The Grammar labels work the same way; a label also carries its explanation, and may sit under a parent label.
export const createLabel = (name, definition, parentId) =>
  grammarChange('POST', '', parentId == null ? { name, definition } : { name, definition, parent_id: parentId });
export const editLabel = (labelId, name, definition) => grammarChange('PUT', `/${labelId}`, { name, definition });
export const deleteLabel = (labelId) => grammarChange('DELETE', `/${labelId}`);
export const moveLabel = (labelId, index, parentId) =>
  grammarChange('PUT', `/${labelId}/position`, parentId === undefined ? { index } : { index, parent_id: parentId ?? 0 });
export const addLabelPlacement = (labelId, deviceId, index) =>
  grammarChange('PUT', `/${labelId}/devices/${deviceId}`, index === undefined ? undefined : { index });
export const removeLabelPlacement = (labelId, deviceId) => grammarChange('DELETE', `/${labelId}/devices/${deviceId}`);

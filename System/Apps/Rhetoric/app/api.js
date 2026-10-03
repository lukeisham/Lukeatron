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

// Every Topical change answers with the whole fresh Topical tree.
const topicalChange = async (method, path, body) => (await request(method, `/api/topical/types${path}`, body)).topical;

export const createType = (name) => topicalChange('POST', '', { name });
export const renameType = (typeId, name) => topicalChange('PUT', `/${typeId}`, { name });
export const deleteType = (typeId) => topicalChange('DELETE', `/${typeId}`);
export const addPlacement = (typeId, deviceId) => topicalChange('PUT', `/${typeId}/devices/${deviceId}`);
export const removePlacement = (typeId, deviceId) => topicalChange('DELETE', `/${typeId}/devices/${deviceId}`);

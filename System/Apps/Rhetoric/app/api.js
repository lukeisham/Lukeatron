/** The single place the app touches the network (JS-5). */

export async function fetchItems() {
  const response = await fetch('/api/items');
  if (!response.ok) {
    throw new Error(`/api/items responded ${response.status}`);
  }
  return response.json();
}

// Which apps match what has been typed, and in what order. Pure: no DOM, so the node tests call it
// directly. Order while typing: names starting with the query, then names containing it, then
// matches in the blurb or context only. Each band keeps the incoming (context) order.

export function rank(apps, query) {
  const q = query.trim().toLowerCase();
  if (!q) return apps.map((_, i) => i);
  const bands = [[], [], []];
  apps.forEach((app, i) => {
    const title = app.title.toLowerCase();
    if (title.startsWith(q)) bands[0].push(i);
    else if (title.includes(q) || app.name.toLowerCase().includes(q)) bands[1].push(i);
    else if (`${app.blurb} ${app.context}`.toLowerCase().includes(q)) bands[2].push(i);
  });
  return bands.flat();
}

// The widget's one fetch (JS-5). Resolves {file}; rejects with {status}, 0 meaning Home was unreachable.

export async function saveNote(text) {
  let response;
  try {
    response = await fetch("/api/inbox-note", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw { status: 0 };
  }
  if (response.status !== 201) throw { status: response.status };
  return response.json();
}

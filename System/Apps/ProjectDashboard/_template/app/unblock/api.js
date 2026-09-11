// B-7 unblock UI — the single fetch surface (the unblock spec FR-9,
// JS-5: raw fetch() centralised here and nowhere else in this module).
//
// Route confirmed against the real server.py (B-4, built):
//   GET  /api/board.json                                    -> the board object
//   POST /api/edit    {project_id,row,mtime,action:"set_cell",column,value}
//   POST /api/edit    {project_id,row,mtime,action:"hand_over",recipient}
//   POST /api/request {source,text}                          -> _requests.yaml row
//
// Two routes below are NOT yet in server.py and are this file's own PROPOSAL
// for their contract — the same position server.py's own docstring was in
// before model.py/writes.py existed. Whoever adds them to server.py is the
// authority; this module only needs the shape to hold:
//   POST /api/scrap {project_id,mtime,text} -> writes.append_scrap, which
//     already exists and confirms this exact shape (its own docstring:
//     "not yet reachable through any server.py route... adding a route is
//     server.py's seam, not this module's"). `mtime` may be `null` —
//     append_scrap's signature takes `mtime: float | None = None` and
//     simply skips the staleness guard when it is absent.
//   POST /api/capacity {next_action_effort_weight,open_count} -> calls
//     model.lukes_capacity server-side (stores.completions + model's own
//     placeholder coefficients live there, not here — AD-9). Purely
//     informational (FR-2b); its absence never blocks the fit test itself,
//     which this module computes from data board.json already carries
//     (see capacity.js). A 404 here is treated as "not yet available", not
//     an error.

class ApiError extends Error {
  constructor(kind, message, field) {
    super(message);
    this.kind = kind; // "conflict" | "not_found" | "network" | "server"
    this.field = field;
  }
}

async function request(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkFailure) {
    throw new ApiError("network", "Could not reach the server.");
  }
  if (response.status === 409) {
    throw new ApiError("conflict", "This changed since it was last read — reload to see the current version.");
  }
  if (response.status === 404) {
    throw new ApiError("not_found", "Nothing is served at that path yet.");
  }
  if (!response.ok) {
    let field;
    try {
      field = (await response.json()).field;
    } catch (parseFailure) {
      // API-6: the body may not be JSON at all (e.g. a route that does not
      // exist yet) — the caller still gets a typed error, never a raw parse
      // exception surfacing as the failure.
    }
    throw new ApiError("server", `The server refused this (${response.status}).`, field);
  }
  return response.json();
}

export async function getBoard() {
  return request("/api/board.json");
}

export async function setCell({ projectId, row, column, value, mtime }) {
  return request("/api/edit", {
    method: "POST",
    body: { project_id: projectId, row, mtime, action: "set_cell", column, value },
  });
}

export async function handOver({ projectId, row, recipient, mtime }) {
  return request("/api/edit", {
    method: "POST",
    body: { project_id: projectId, row, mtime, action: "hand_over", recipient },
  });
}

export async function appendRequest({ source, text }) {
  return request("/api/request", { method: "POST", body: { source, text } });
}

/** Assumed contract — see module docstring. */
export async function appendScrap({ projectId, mtime, text }) {
  return request("/api/scrap", { method: "POST", body: { project_id: projectId, mtime, text } });
}

/** Assumed contract — see module docstring. Callers must treat a
 * "not_found" ApiError as "not available yet", not a failure to surface. */
export async function getCapacity({ nextActionEffortWeight, openCount }) {
  return request("/api/capacity", {
    method: "POST",
    body: { next_action_effort_weight: nextActionEffortWeight, open_count: openCount },
  });
}

export { ApiError };

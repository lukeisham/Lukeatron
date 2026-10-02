/** The only place this page talks to Home (JS-5): every request, its errors and its replies. */

export class ApiError extends Error {
  constructor(status, message, options) {
    super(message, options);
    this.status = status;
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (cause) {
    console.warn(`Home sent a non-JSON body with status ${response.status}`, cause);
    return null;
  }
}

async function request(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body,
    });
  } catch (cause) {
    throw new ApiError(0, "Could not reach Home.", { cause });
  }
  const payload = await readJson(response);
  if (!response.ok) throw new ApiError(response.status, payload?.message ?? `Home answered ${response.status}.`);
  if (payload === null) throw new ApiError(response.status, "Home sent a reply this page cannot read.");
  return payload;
}

export const loadCriteria = () => request("/api/aichar/criteria");
export const scrape = () => request("/api/aichar/scrape", { method: "POST", body: "{}" });
export const check = (text) => request("/api/aichar/check", { method: "POST", body: JSON.stringify({ text }) });

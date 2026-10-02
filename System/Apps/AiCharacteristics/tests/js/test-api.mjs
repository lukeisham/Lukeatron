// The page's one door to Home: what it sends, and how every failure surfaces. A fake fetch, never the network.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

let calls;
const reply = (status, body) => async (path, options) => {
  calls.push({ path, options });
  return { ok: status < 400, status, json: async () => { if (body === undefined) throw new SyntaxError("no json"); return body; } };
};
const api = await import("../../web/api.js");

beforeEach(() => { calls = []; });

test("loading criteria is a plain GET", async () => {
  globalThis.fetch = reply(200, { criteria: [] });
  assert.deepEqual(await api.loadCriteria(), { criteria: [] });
  assert.equal(calls[0].path, "/api/aichar/criteria");
  assert.equal(calls[0].options.method, "GET");
});

test("scrape and check are POSTs with a JSON body", async () => {
  globalThis.fetch = reply(200, { summary: {}, verdicts: [] });
  await api.scrape();
  await api.check("some text");
  assert.deepEqual(calls.map((c) => [c.path, c.options.method]), [["/api/aichar/scrape", "POST"], ["/api/aichar/check", "POST"]]);
  assert.equal(calls[1].options.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(calls[1].options.body), { text: "some text" });
});

test("a server error surfaces its message and status", async () => {
  globalThis.fetch = reply(503, { error: "unavailable", message: "no Haiku key is set up" });
  await assert.rejects(api.scrape(), (error) => error instanceof api.ApiError && error.status === 503 && error.message === "no Haiku key is set up");
});

test("an error with no readable body still gives a message", async () => {
  globalThis.fetch = reply(500, undefined);
  await assert.rejects(api.check("x"), (error) => error.status === 500 && /500/.test(error.message));
});

test("an unreadable success body is an error, not a silent null", async () => {
  globalThis.fetch = reply(200, undefined);
  await assert.rejects(api.loadCriteria(), (error) => error instanceof api.ApiError);
});

test("a network failure says Home could not be reached", async () => {
  globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
  await assert.rejects(api.loadCriteria(), (error) => error.status === 0 && error.message === "Could not reach Home.");
});

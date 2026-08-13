/* ============================================================
   SHELL · TIER B — Claude API pool refresh (DECISIONS.md D-2, task E)
   Never edited per cartridge. THE ONE PLACE ANY fetch() LIVES (JS-5) —
   nothing else in the shell or a cartridge should call fetch directly.

   Contract:
   - The API key lives in localStorage ONLY (key: "generatorApiKey"),
     entered by the user via the settings field this module mounts. It is
     NEVER hardcoded, never written to any file in this repo, and never
     leaves the browser except as the Authorization header of the one
     direct-from-the-page request below (SR-5).
   - Model id: claude-sonnet-5 (the current Sonnet).
   - Degrades closed (task E): no key, offline, or a failed/malformed
     response -> the Refresh-pool control disables itself with a visible
     note and every Tier-A function keeps working. A Tier-B failure must
     never throw past this module or break the rest of the widget (JS-2).

   Optional present-mode ENGINE hooks this module calls IF a cartridge
   provides them (present-mode.js requires neither — a cartridge that
   omits both simply never sees a working Refresh-pool button, same
   degrade-closed default as no API key):
     ENGINE.buildRefreshRequest()        -> { prompt: string }
     ENGINE.parseRefreshResponse(text)   -> PoolItem[]
   ============================================================ */
var ApiSeam = (function () {
  var STORAGE_KEY = "generatorApiKey";
  var API_URL = "https://api.anthropic.com/v1/messages";
  var MODEL = "claude-sonnet-5";

  var $ = function (id) { return document.getElementById(id); };

  function getKey() {
    try { return window.localStorage.getItem(STORAGE_KEY) || ""; }
    catch (e) { return ""; }
  }
  function setKey(key) {
    try { window.localStorage.setItem(STORAGE_KEY, key); }
    catch (e) { console.warn("ApiSeam.setKey: localStorage unavailable", e); }
  }

  function refreshCapable() {
    return typeof ENGINE !== "undefined" &&
      typeof ENGINE.buildRefreshRequest === "function" &&
      typeof ENGINE.parseRefreshResponse === "function";
  }

  /** The one fetch() call site (JS-5). Direct from the page — the key
   * never passes through any Lukeatron server. */
  async function callClaude(prompt) {
    const key = getKey();
    if (!key) throw new Error("no API key set");
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) {
      throw new Error("Claude API returned " + response.status);
    }
    const data = await response.json();
    const text = data && data.content && data.content[0] && data.content[0].text;
    if (typeof text !== "string") throw new Error("malformed Claude API response");
    return text;
  }

  /** Runs the full refresh cycle: build request -> fetch -> parse ->
   * onSuccess(items). Any failure at any step calls onError(message) and
   * never throws past this function (JS-2/JS-5: loading + error states,
   * degrade closed). */
  async function refreshPool(onSuccess, onError) {
    if (!refreshCapable()) {
      onError("this cartridge has no Tier B refresh support");
      return;
    }
    if (!getKey()) {
      onError("no API key set");
      return;
    }
    try {
      const req = ENGINE.buildRefreshRequest();
      const text = await callClaude(req.prompt);
      const items = ENGINE.parseRefreshResponse(text);
      if (!Array.isArray(items) || !items.length) {
        onError("Claude API response did not parse into any pool items");
        return;
      }
      onSuccess(items);
    } catch (e) {
      onError(e && e.message ? e.message : "refresh failed");
    }
  }

  /** Mounts the settings UI (key field + Refresh-pool button) into the
   * shell's #tierBBar. Present-mode-only (present-mode.js calls this from
   * its init()); analyse mode never mounts this bar. Degrades closed at
   * every branch: no #tierBBar in this build -> no-op; not refreshCapable
   * -> button stays disabled with an explanatory title. */
  function initSettingsUI() {
    var bar = $("tierBBar");
    if (!bar) return;
    bar.style.display = "flex";

    var keyInput = $("apiKeyInput");
    var saveBtn = $("btnSaveKey");
    var refreshBtn = $("btnRefreshPool");
    var status = $("tierBStatus");

    keyInput.value = getKey();

    if (!refreshCapable()) {
      refreshBtn.disabled = true;
      refreshBtn.title = "This cartridge does not support a Tier B pool refresh.";
      status.textContent = "Tier B refresh not available for this widget.";
      // The key field still works (it's just inert without refresh
      // support) — no reason to disable it too.
    }

    saveBtn.addEventListener("click", function () {
      setKey(keyInput.value.trim());
      status.textContent = getKey() ? "Key saved (this browser only)." : "Key cleared.";
    });

    refreshBtn.addEventListener("click", function () {
      if (!refreshCapable()) return;
      if (!getKey()) {
        status.textContent = "Enter and save an API key first.";
        return;
      }
      refreshBtn.disabled = true;
      var old = refreshBtn.textContent;
      refreshBtn.textContent = "Refreshing…";
      status.textContent = "";
      refreshPool(
        function onSuccess(items) {
          refreshBtn.disabled = false;
          refreshBtn.textContent = old;
          status.textContent = "Added " + items.length + " item(s) to the pool.";
          if (typeof PresentMode !== "undefined" && typeof PresentMode.addToPool === "function") {
            PresentMode.addToPool(items);
          }
        },
        function onError(message) {
          refreshBtn.disabled = false;
          refreshBtn.textContent = old;
          status.textContent = "Refresh failed: " + message + " — Tier A is unaffected.";
        }
      );
    });
  }

  return {
    getKey: getKey,
    setKey: setKey,
    refreshCapable: refreshCapable,
    refreshPool: refreshPool,
    initSettingsUI: initSettingsUI,
  };
})();

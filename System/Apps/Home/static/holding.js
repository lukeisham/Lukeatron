// The holding screen: shown while a stopped app starts (mode "starting"), or after starting an app
// that opens its own browser tab (mode "opened"). Polls /api/status/<app> until the app answers.

const card = document.getElementById("card");
const glyph = document.getElementById("glyph");
const message = document.getElementById("message");
const log = document.getElementById("log");
const title = document.getElementById("title").textContent;
const POLL_MS = 250;

const mode = card.dataset.mode;
if (mode === "opened") {
  // This tab only exists because Home opened it; the app makes its own tab, so step out of the way.
  message.textContent = `${title} is opening in its own tab.`;
  setTimeout(() => window.close(), 1500);
} else if (mode === "building") {
  glyph.textContent = "◌";
  message.textContent = `${title} is still being built, so there is nothing to open yet.`;
} else if (mode === "unknown") {
  glyph.textContent = "◌";
  message.textContent = `Home doesn't know how to open ${title}. Its entry in Home's catalog.json needs a launch method.`;
} else {
  message.textContent = `Starting ${title}…`;
  poll();
}

async function poll() {
  let status;
  try {
    const response = await fetch(`/api/status/${encodeURIComponent(card.dataset.app)}`);
    status = await response.json();
  } catch {
    setTimeout(poll, POLL_MS);
    return;
  }
  if (status.state === "live") {
    glyph.textContent = "●";
    glyph.classList.add("up");
    glyph.addEventListener("animationend", () => window.location.replace(status.target), { once: true });
    setTimeout(() => window.location.replace(status.target), 600);
  } else if (status.state === "failed") {
    message.textContent = `${title} didn't start within 8 seconds. Its last log lines:`;
    log.textContent = (status.log || []).join("\n") || "(the log is empty)";
    log.hidden = false;
  } else {
    setTimeout(poll, POLL_MS);
  }
}

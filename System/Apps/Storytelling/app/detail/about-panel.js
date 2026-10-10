/** The About panel. Opens on `storytelling:open-about`; closes on Esc or the Close button and returns focus to the toolbar's About button. */
import { EVT_OPEN_ABOUT } from "../shared/events.js";
import { APP_VERSION } from "../data/version.js";
import { ABOUT } from "../data/furniture.js";

const ABOUT_BUTTON_SELECTOR = '[data-action="about"]';

/**
 * Mount the About panel: it builds its contents inside the host element and shows or hides the host itself. It holds exactly this: the app name and
 * version, then the statements from `data/furniture.js`, then the poster's attribution `credits` (`licenceNotes` there are deliberately not shown).
 * @param {HTMLElement} host the host element supplied by index.html
 * @param {{ doc?: Document, about?: Object, version?: string }} [options] test overrides
 * @returns {{ isOpen: () => boolean }}
 */
export function mountAboutPanel(host, { doc = document, about = ABOUT, version = APP_VERSION } = {}) {
  // The host is the panel: index.html supplies it hidden, so showing must clear the host's own attribute.
  const panel = host;
  panel.classList.add("st-about");
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", `About ${about.appName}`);

  const heading = doc.createElement("header");
  heading.className = "st-about__header";

  const nameEl = doc.createElement("h2");
  nameEl.className = "st-about__name";
  nameEl.textContent = about.appName;

  const versionEl = doc.createElement("p");
  versionEl.className = "st-about__version";
  versionEl.textContent = `${about.versionLabel} ${version}`;

  heading.append(nameEl, versionEl);
  panel.append(heading);

  const statementsSection = doc.createElement("section");
  statementsSection.className = "st-about__statements";

  for (const statement of about.statements) {
    const statementEl = doc.createElement("p");
    statementEl.className = "st-about__statement";
    fillStatement(doc, statementEl, statement);
    statementsSection.append(statementEl);
  }

  panel.append(statementsSection);

  if (about.credits?.length) {
    const creditsSection = doc.createElement("section");
    creditsSection.className = "st-about__credits";
    for (const line of about.credits) {
      const creditEl = doc.createElement("p");
      creditEl.className = "st-about__credit";
      creditEl.textContent = line;
      creditsSection.append(creditEl);
    }
    panel.append(creditsSection);
  }

  const closeBtn = doc.createElement("button");
  closeBtn.className = "st-about__close";
  closeBtn.setAttribute("type", "button");
  closeBtn.textContent = "Close";
  closeBtn.setAttribute("aria-label", "Close About panel");
  panel.append(closeBtn);

  let opener = null;

  // The toolbar announces on `document`, so the event's target is never the button: remember what had
  // focus, and fall back to the toolbar button where the browser gives a clicked button none (Safari).
  function rememberOpener() {
    const active = doc.activeElement;
    const isRealFocus = active && active !== doc.body && typeof active.focus === "function";
    opener = isRealFocus ? active : doc.querySelector(ABOUT_BUTTON_SELECTOR);
  }

  function close() {
    panel.hidden = true;
    if (opener && typeof opener.focus === "function") opener.focus();
    else console.warn("about-panel: no element to return focus to after closing");
    opener = null;
  }

  function handleKeyDown(e) {
    if (e.key === "Escape" && !panel.hidden) {
      close();
    }
  }

  function handleOpen() {
    rememberOpener();
    panel.hidden = false;
    closeBtn.focus();
  }

  closeBtn.addEventListener("click", close);
  doc.addEventListener("keydown", handleKeyDown);
  doc.addEventListener(EVT_OPEN_ABOUT, handleOpen);

  return {
    isOpen: () => !panel.hidden,
  };
}

/** Writes a statement's text; the optional `italic` substring (a work's title) is set in <em>. Text nodes only, never HTML. */
function fillStatement(doc, paragraph, { text, italic }) {
  const at = italic ? text.indexOf(italic) : -1;
  if (at < 0) {
    paragraph.textContent = text;
    return;
  }
  const em = doc.createElement("em");
  em.textContent = italic;
  paragraph.append(text.slice(0, at), em, text.slice(at + italic.length));
}

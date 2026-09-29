// The v1 content of a widget slot: a titled, dashed frame saying the widget is still to come.
// A real widget replaces its slot module (inbox.js / news.js) and stops calling this.

export function renderPlaceholder(section, title, iconPath) {
  section.classList.add("placeholder");
  const heading = document.createElement("h2");
  heading.className = "slot-title";
  heading.innerHTML = `<svg class="glyph-line" viewBox="0 0 24 24" aria-hidden="true">${iconPath}</svg>`;
  heading.append(title);
  const note = document.createElement("p");
  note.className = "slot-note";
  note.textContent = "Coming later.";
  section.replaceChildren(heading, note);
}

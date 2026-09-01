/**
 * toolbar-actions.js — One-click Print, Copy, and Export CSV controls
 *
 * Implements FR-BIB-13 (copy-to-clipboard) and the print/export half of the
 * document surfaces: window.print() and navigator.clipboard.writeText() were
 * previously wired to nothing anywhere in the app, and the existing @media
 * print rules (document-shell.css and friends) had no trigger.
 *
 * Mount once per surface via mountToolbar(). All buttons are real <button>
 * elements, which document-shell.css's `@media print { button { display:
 * none } }` rule already hides — no extra print CSS needed for that part.
 *
 * Vanilla ES modules only, no framework.
 */

import { downloadCSV } from './csv-export.js';

/**
 * Extract readable text from a mounted surface for clipboard copy.
 * SVG document pages (crib sheet, lesson plans, assessments, resources,
 * curriculum map) hold their content as <text>/<tspan> elements, which
 * plain .innerText does not read — so those are walked explicitly, grouped
 * by page. Everything else (Coverage Grid, Lessons & Topics, Marking
 * Matrix — plain HTML tables/lists) falls back to .innerText.
 *
 * A single extractor here is what keeps this a lookup table inside
 * toolbar-actions.js rather than bolting a copy-serializer onto every
 * surface module individually.
 *
 * @param {HTMLElement} container - the surface's mounted content root
 * @returns {string} - plain text, pages separated by a blank line
 */
export function extractSurfaceText(container) {
  if (!container) return '';

  const svgPages = container.querySelectorAll('svg.document-page');
  if (svgPages.length > 0) {
    const pageTexts = Array.from(svgPages).map((svg) => {
      const lines = Array.from(svg.querySelectorAll('text')).map((t) => t.textContent.trim());
      return lines.filter(Boolean).join('\n');
    });
    return pageTexts.filter(Boolean).join('\n\n---\n\n');
  }

  return (container.innerText || container.textContent || '').trim();
}

/**
 * Build a toolbar of Print / Copy / (optional) Export CSV controls.
 *
 * @param {Object} options
 * @param {Function} options.getText - () => string; called at click time so
 *   copy always reflects the surface's current (possibly async-loaded) DOM.
 * @param {Function} [options.getCSVSource] - () => { unit, markingMatrix } |
 *   null; when provided, an "Export CSV" button appears and calls
 *   downloadCSV() from csv-export.js (never reimplemented here).
 * @param {string} [options.label] - surface name, used in the accessible
 *   names of each button (e.g. "Copy Marking Matrix").
 * @returns {HTMLElement} - the toolbar element, ready to append into the DOM
 */
export function mountToolbar({ getText, getCSVSource = null, label = 'page' }) {
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar-actions screen-only';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', `${label} actions`);

  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.className = 'toolbar-actions-button';
  printBtn.textContent = 'Print';
  printBtn.setAttribute('aria-label', `Print ${label}`);
  printBtn.addEventListener('click', () => {
    window.print();
  });
  toolbar.appendChild(printBtn);

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'toolbar-actions-button';
  copyBtn.textContent = 'Copy';
  copyBtn.setAttribute('aria-label', `Copy ${label} to clipboard`);
  copyBtn.addEventListener('click', () => {
    const text = getText ? getText() : '';
    copyToClipboard(text, copyBtn);
  });
  toolbar.appendChild(copyBtn);

  if (getCSVSource) {
    const csvBtn = document.createElement('button');
    csvBtn.type = 'button';
    csvBtn.className = 'toolbar-actions-button';
    csvBtn.textContent = 'Export CSV';
    csvBtn.setAttribute('aria-label', `Export ${label} as CSV`);
    csvBtn.addEventListener('click', () => {
      const source = getCSVSource();
      if (!source || !source.unit || !source.markingMatrix) return;
      downloadCSV(source.unit, source.markingMatrix);
      flashStatus(csvBtn, 'Downloaded');
    });
    toolbar.appendChild(csvBtn);
  }

  return toolbar;
}

/**
 * Write text to the clipboard, with a visible confirmation and graceful
 * handling of rejection (navigator.clipboard.writeText() rejects without a
 * user gesture or in insecure/non-HTTPS contexts — both are realistic here
 * since the app is served over plain http://127.0.0.1).
 *
 * @param {string} text
 * @param {HTMLButtonElement} button - button to flash a confirmation on
 */
function copyToClipboard(text, button) {
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    flashStatus(button, 'Copy unsupported', true);
    return;
  }

  navigator.clipboard.writeText(text).then(
    () => flashStatus(button, 'Copied'),
    () => flashStatus(button, 'Copy failed', true)
  );
}

/**
 * Briefly replace a button's label with a status message, then restore it.
 * @param {HTMLButtonElement} button
 * @param {string} message
 * @param {boolean} [isError]
 */
function flashStatus(button, message, isError = false) {
  const original = button.textContent;
  button.textContent = message;
  button.classList.toggle('toolbar-actions-button-error', isError);
  window.setTimeout(() => {
    button.textContent = original;
    button.classList.remove('toolbar-actions-button-error');
  }, 1500);
}

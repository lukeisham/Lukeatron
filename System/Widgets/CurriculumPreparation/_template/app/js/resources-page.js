/**
 * resources-page.js — Flat, unstructured resource list with links, images, and text
 *
 * Implements FR-RESB-* requirements:
 * - Flat ordered list of items (no tiering, no curriculum binding, no coverage links)
 * - Three kinds: link, image, text
 * - Optional note/caption on any item
 * - Fast add flow (one action, required fields only)
 * - A4 portrait page model, flowing to as many pages as needed
 * - URL scheme validation (http/https only)
 * - Zero outbound network requests (FR-RESB-12)
 * - HTML escaping for all user content (FR-RESB-14, JS-6)
 * - Vanilla ES modules only (FR-RESB-15)
 *
 * Exports: ResourcesPage class, validateURLScheme, htmlEscape
 * Consumes: DocumentShell, local-store, newId, image-paste
 */

import { DocumentShell, pxToUserUnits } from './document-shell.js';
import { newId } from './ids.js';

/**
 * Escape HTML special characters to prevent XSS.
 * Implements FR-RESB-14, HTML-6: every user string must be escaped.
 *
 * @param {string} text - Plain text to escape
 * @returns {string} HTML-safe escaped string
 */
export function htmlEscape(text) {
  if (typeof text !== 'string') {
    return '';
  }

  // Use DOM method if available (browser environment)
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Fallback for Node.js test environments
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, char => escapeMap[char]);
}

/**
 * Validate a URL's scheme before rendering as a clickable link.
 * Implements FR-RESB-13, AD-RESB-5: check with URL parser, not regex.
 * Allows: http:, https: only.
 * Blocks: javascript:, data:, file:, vbscript:, bare strings, unrecognized schemes.
 *
 * @param {string} urlString - URL to validate
 * @returns {Object} { isValid: boolean, protocol?: string }
 */
export function validateURLScheme(urlString) {
  if (typeof urlString !== 'string' || urlString.trim() === '') {
    return { isValid: false };
  }

  try {
    const url = new URL(urlString);
    const protocol = url.protocol; // e.g. "https:", "http:", "javascript:", etc.

    // Allow only http: and https: (with trailing colon)
    if (protocol === 'http:' || protocol === 'https:') {
      return { isValid: true, protocol };
    }

    // All other schemes are blocked (javascript:, data:, file:, vbscript:, etc.)
    return { isValid: false, protocol };
  } catch (err) {
    // URL constructor throws on invalid/malformed URLs
    // Treat as invalid scheme
    return { isValid: false };
  }
}

/**
 * ResourcesPage — flat item list with add/edit/delete/reorder operations
 *
 * Stores items as a flat array in document order (AD-RESB-3).
 * Persists via local-store only (FR-RESB-11).
 * Renders to A4 portrait pages via DocumentShell (FR-RESB-9).
 * Never makes outbound requests (FR-RESB-12).
 *
 * @param {LocalStore} localStore - Local data persistence client
 * @param {Object} unit - Loaded unit.json object
 */
export class ResourcesPage {
  constructor(localStore, unit) {
    if (!localStore) {
      throw new Error('localStore is required');
    }
    if (!unit) {
      throw new Error('unit is required');
    }

    this.localStore = localStore;
    this.unit = unit;

    // Ensure resourcesPage exists on first load (FR-RESB-1)
    if (!this.unit.resourcesPage) {
      this.unit.resourcesPage = {
        id: newId('res-'),
        items: []
      };
    }
  }

  /**
   * Get all items in the resources page.
   * @returns {Array} Array of item objects
   */
  getItems() {
    return (this.unit.resourcesPage?.items || []).slice();
  }

  /**
   * Add a link item to the resources page.
   * Label defaults to URL if left blank (FR-RESB-3).
   *
   * @param {string} url - Required: the link destination
   * @param {string} label - Optional: display label (defaults to URL)
   * @param {string} note - Optional: caption/note
   */
  addLink(url, label = '', note = '') {
    if (!url || typeof url !== 'string') {
      throw new Error('url is required and must be a string');
    }

    const item = {
      id: newId('ri-'),
      kind: 'link',
      order: this._getNextOrder(),
      url: url.trim(),
      label: (label || url).trim(),
      note: (note || '').trim()
    };

    this.unit.resourcesPage.items.push(item);
    this._save();
  }

  /**
   * Add an image item to the resources page.
   * Image is stored as an ImageRef (imageId, x, y, width, height).
   *
   * @param {Object} imageRef - ImageRef object with imageId and dimensions
   * @param {string} note - Optional: caption/note
   */
  addImage(imageRef, note = '') {
    if (!imageRef || !imageRef.imageId) {
      throw new Error('imageRef with imageId is required');
    }

    const item = {
      id: newId('ri-'),
      kind: 'image',
      order: this._getNextOrder(),
      imageId: imageRef.imageId,
      x: imageRef.x || 0,
      y: imageRef.y || 0,
      width: imageRef.width || 50,
      height: imageRef.height || 50,
      note: (note || '').trim()
    };

    this.unit.resourcesPage.items.push(item);
    this._save();
  }

  /**
   * Add a text item to the resources page.
   * Plain text only, no formatting (FR-RESB-5, FR-RESB-16).
   *
   * @param {string} text - Optional: text body (no length cap)
   * @param {string} note - Optional: caption/note
   */
  addText(text = '', note = '') {
    const item = {
      id: newId('ri-'),
      kind: 'text',
      order: this._getNextOrder(),
      text: (text || '').trim(),
      note: (note || '').trim()
    };

    this.unit.resourcesPage.items.push(item);
    this._save();
  }

  /**
   * Edit an item's fields in place.
   * Validates URL schemes if editing a link.
   *
   * @param {string} itemId - ID of the item to edit
   * @param {Object} updates - Fields to update (url, label, text, note, etc.)
   */
  editItem(itemId, updates) {
    const item = this.unit.resourcesPage.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    // Validate URL scheme if editing a link's URL
    if (item.kind === 'link' && updates.url && typeof updates.url === 'string') {
      const validation = validateURLScheme(updates.url);
      if (!validation.isValid) {
        throw new Error(`Invalid URL scheme: ${updates.url}`);
      }
    }

    // Apply updates
    if (updates.url !== undefined) item.url = updates.url.trim();
    if (updates.label !== undefined) item.label = updates.label.trim();
    if (updates.text !== undefined) item.text = updates.text.trim();
    if (updates.note !== undefined) item.note = updates.note.trim();

    this._save();
  }

  /**
   * Delete an item from the resources page.
   * No undo after deletion (FR-RESB-17).
   *
   * @param {string} itemId - ID of the item to delete
   */
  deleteItem(itemId) {
    const index = this.unit.resourcesPage.items.findIndex(i => i.id === itemId);
    if (index === -1) {
      throw new Error(`Item ${itemId} not found`);
    }

    this.unit.resourcesPage.items.splice(index, 1);
    this._save();
  }

  /**
   * Reorder an item by moving it up or down.
   * Updates array order directly, not a separate sortIndex (AD-RESB-3).
   *
   * @param {string} itemId - ID of the item to move
   * @param {string} direction - 'up' or 'down'
   */
  reorderItem(itemId, direction) {
    const index = this.unit.resourcesPage.items.findIndex(i => i.id === itemId);
    if (index === -1) {
      throw new Error(`Item ${itemId} not found`);
    }

    if (direction === 'up' && index > 0) {
      [this.unit.resourcesPage.items[index - 1], this.unit.resourcesPage.items[index]] =
        [this.unit.resourcesPage.items[index], this.unit.resourcesPage.items[index - 1]];
    } else if (direction === 'down' && index < this.unit.resourcesPage.items.length - 1) {
      [this.unit.resourcesPage.items[index], this.unit.resourcesPage.items[index + 1]] =
        [this.unit.resourcesPage.items[index + 1], this.unit.resourcesPage.items[index]];
    }

    this._save();
  }

  /**
   * Render the resources page to DocumentShell (A4 portrait, multiple pages).
   * Implements FR-RESB-9, FR-RESB-10 (URL wrapping).
   *
   * @returns {DocumentShell} Rendered page instance
   */
  render() {
    // Convert items to pages (flat list, no hard page cap)
    const pages = this._paginateItems();

    const renderFn = (pageData, svgElement) => {
      this._renderPageContent(pageData, svgElement);
    };

    // Create DocumentShell with A4 portrait, no page cap (FR-RESB-9)
    const shell = new DocumentShell(pages, renderFn, 'portrait');
    return shell;
  }

  /**
   * Get the images map for rendering (used by render functions).
   * @returns {Object} Map of imageId -> blob
   */
  getImagesMap() {
    const imagesMap = {};
    if (this.unit.images && Array.isArray(this.unit.images)) {
      this.unit.images.forEach(img => {
        imagesMap[img.id] = img.blob || null;
      });
    }
    return imagesMap;
  }

  // ===== Private Methods =====

  /**
   * Get the next order value for a new item.
   * @private
   * @returns {number}
   */
  _getNextOrder() {
    if (this.unit.resourcesPage.items.length === 0) {
      return 1;
    }
    const maxOrder = Math.max(...this.unit.resourcesPage.items.map(i => i.order || 0));
    return maxOrder + 1;
  }

  /**
   * Save the entire unit to local-store.
   * Debounced via local-store's own save mechanism.
   * @private
   */
  async _save() {
    try {
      await this.localStore.saveUnit(this.unit);
    } catch (err) {
      // Never stall silently (JS-2)
      console.error('Failed to save resources page:', err);
      throw err;
    }
  }

  /**
   * Paginate items into pages for A4 rendering.
   * No hard page cap (AD-RESB-4); each page flows naturally.
   * @private
   * @returns {Object} { pages: [{ items: [...] }] }
   */
  _paginateItems() {
    // For now, split items into groups; DocumentShell handles page breaks
    // A4 portrait page box: 210mm × 297mm
    // Estimating ~15-20 items per page depending on content length
    const itemsPerPage = 20;
    const pages = [];

    for (let i = 0; i < this.unit.resourcesPage.items.length; i += itemsPerPage) {
      pages.push({
        items: this.unit.resourcesPage.items.slice(i, i + itemsPerPage)
      });
    }

    if (pages.length === 0) {
      pages.push({ items: [] });
    }

    return { pages };
  }

  /**
   * Render a single page of resource items to SVG.
   * Implements FR-RESB-10 (URL wrapping), FR-RESB-14 (escaping).
   * @private
   */
  _renderPageContent(pageData, svgElement) {
    const items = pageData.items || [];
    const imagesMap = this.getImagesMap();

    let yPos = 20; // Start below top margin
    const pageHeight = 277; // A4 portrait in mm
    const contentHeight = pageHeight - 40; // Leave 20mm margins top/bottom
    const maxWidth = 170; // A4 width (210mm) - 40mm margins

    items.forEach((item, idx) => {
      if (yPos > contentHeight) {
        // Page break; shouldn't happen in pagination but guard against it
        return;
      }

      let itemHeight = 0;

      // Render item based on kind
      if (item.kind === 'link') {
        itemHeight = this._renderLinkItem(item, svgElement, 10, yPos, maxWidth);
      } else if (item.kind === 'image') {
        itemHeight = this._renderImageItem(item, svgElement, 10, yPos, maxWidth, imagesMap);
      } else if (item.kind === 'text') {
        itemHeight = this._renderTextItem(item, svgElement, 10, yPos, maxWidth);
      }

      // Render note if present (FR-RESB-6)
      if (item.note) {
        itemHeight += this._renderNote(item.note, svgElement, 12, yPos + itemHeight, maxWidth - 4);
      }

      yPos += itemHeight + 5; // Add spacing between items
    });
  }

  /**
   * Render a link item with URL and label.
   * Validates scheme before rendering as clickable (FR-RESB-13).
   * Escapes label text (FR-RESB-14).
   * @private
   * @returns {number} Height used
   */
  _renderLinkItem(item, svgElement, x, y, maxWidth) {
    const validation = validateURLScheme(item.url);
    const label = item.label || item.url;
    const escapedLabel = htmlEscape(label);

    // Create text element (always escaped)
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y + 4));
    text.setAttribute('font-size', String(pxToUserUnits(11)));
    text.setAttribute('font-family', 'var(--font-system)');
    text.setAttribute('fill', 'var(--color-text-primary)');

    if (validation.isValid) {
      // Clickable link: create <a> element (URL is already validated as safe)
      const link = document.createElementNS('http://www.w3.org/2000/svg', 'a');
      link.setAttributeNS('http://www.w3.org/1999/xlink', 'href', item.url);
      link.setAttribute('target', '_blank');

      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('fill', '#185FA5');
      tspan.setAttribute('text-decoration', 'underline');
      tspan.textContent = escapedLabel;

      link.appendChild(tspan);
      text.appendChild(link);
    } else {
      // Inert text: no link, just plain text
      text.textContent = escapedLabel;
    }

    svgElement.appendChild(text);
    return 5; // Link item height
  }

  /**
   * Render an image item.
   * Uses DocumentShell.renderImage() primitive for consistency.
   * @private
   * @returns {number} Height used
   */
  _renderImageItem(item, svgElement, x, y, maxWidth, imagesMap) {
    const imageBlob = imagesMap[item.imageId] || null;
    const width = item.width || 50;
    const height = item.height || 50;

    // Call DocumentShell's renderImage method
    const shell = new DocumentShell(
      { pages: [{ items: [] }] },
      () => {}, // Dummy render function
      'portrait'
    );
    shell.renderImage(imageBlob, x, y, width, height, svgElement);

    return height + 2;
  }

  /**
   * Render a text item.
   * Plain text, no formatting (FR-RESB-5, FR-RESB-16).
   * Escapes all content (FR-RESB-14).
   * SVG <text> never wraps on its own (JS-6), so long text is manually
   * wrapped into <tspan> lines that fit maxWidth (mm) — see _wrapToLines().
   * @private
   * @returns {number} Height used (mm)
   */
  _renderTextItem(item, svgElement, x, y, maxWidth) {
    const escapedText = htmlEscape(item.text);
    const fontSize = pxToUserUnits(10);
    const lineHeight = fontSize * 1.3;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y + 4));
    text.setAttribute('font-size', String(fontSize));
    text.setAttribute('font-family', 'var(--font-system)');
    text.setAttribute('fill', 'var(--color-text-primary)');

    const lines = this._wrapToLines(escapedText, maxWidth, fontSize);
    lines.forEach((line, i) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', String(x));
      tspan.setAttribute('dy', i === 0 ? '0' : String(lineHeight));
      tspan.textContent = line;
      text.appendChild(tspan);
    });

    svgElement.appendChild(text);
    return Math.max(5, lines.length * lineHeight);
  }

  /**
   * Render a note/caption below an item.
   * Escapes content (FR-RESB-14). Wrapped for the same reason as text items.
   * @private
   * @returns {number} Height used (mm)
   */
  _renderNote(noteText, svgElement, x, y, maxWidth) {
    const escapedNote = htmlEscape(noteText);
    const fontSize = pxToUserUnits(9);
    const lineHeight = fontSize * 1.3;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y + 3));
    text.setAttribute('font-size', String(fontSize));
    text.setAttribute('font-family', 'var(--font-system)');
    text.setAttribute('fill', 'var(--color-text-secondary)');
    text.setAttribute('font-style', 'italic');

    const lines = this._wrapToLines(escapedNote, maxWidth, fontSize);
    lines.forEach((line, i) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', String(x));
      tspan.setAttribute('dy', i === 0 ? '0' : String(lineHeight));
      tspan.textContent = line;
      text.appendChild(tspan);
    });

    svgElement.appendChild(text);
    return Math.max(4, lines.length * lineHeight);
  }

  /**
   * Word-wrap plain text into lines that fit maxWidth (mm) at the given
   * SVG user-unit font size. Estimates average character width rather than
   * measuring (no canvas access needed in Node test environments) — close
   * enough for layout purposes, matching the estimate style already used in
   * arbor-tree.js's description word-wrap.
   * @private
   * @returns {string[]} - wrapped lines
   */
  _wrapToLines(text, maxWidth, fontSize) {
    if (!text) return [''];
    const avgCharWidth = fontSize * 0.55; // rough average glyph width
    const maxChars = Math.max(1, Math.floor(maxWidth / avgCharWidth));
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length > maxChars && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [''];
  }
}

/**
 * document-shell.js — Paginated A4 document renderer
 *
 * Exports tier constants (single source of truth), page model,
 * render loop, and print CSS injection. No framework, vanilla ES modules only.
 */

// ===== Tier Constants (FR-DS-6, INV-DM-1) =====
// Single definition in codebase; every build imports these.
export const TIERS = {
  pass: {
    line: "#1F6B41",      // Green tier — borders
    tint: "#E4F4E9",      // Green tier — background
    ink: "#14502F"        // Green tier — text
  },
  intermediate: {
    line: "#185FA5",      // Blue tier — borders
    tint: "#E6F1FB",      // Blue tier — background
    ink: "#0C447C"        // Blue tier — text
  },
  advanced: {
    line: "#9A4E12",      // Orange tier — borders
    tint: "#FCEEE2",      // Orange tier — background
    ink: "#703508"        // Orange tier — text
  }
};

// ===== px → SVG user-unit conversion =====
// The document surface is an SVG with viewBox="0 0 210 297" and width="210mm",
// so ONE SVG USER UNIT = ONE MILLIMETRE. A font-size (or any length) set as a
// bare SVG ATTRIBUTE (e.g. text.setAttribute("font-size", "11")) is unitless,
// which SVG resolves as user units — i.e. millimetres, not pixels. Passing a
// normal CSS px value there renders ~3.78x oversized (96dpi / 25.4mm-per-inch).
// Every renderer that sets font-size (or other px-authored lengths) via
// setAttribute() MUST convert through pxToUserUnits() first. This mirrors the
// mm/user-unit fix already applied to the CSS custom properties in
// variables.css (--font-size-*-mm tokens, whose VALUES are written in px —
// see the comment there). Do not set raw px numbers as SVG attributes.
const PX_PER_MM = 96 / 25.4; // 3.7795...

/**
 * Convert a CSS px value to SVG user units (mm) for use in setAttribute().
 * @param {number} px - size in CSS pixels, as designed in the style guide
 * @returns {number} - equivalent size in SVG user units, rounded to 2dp
 */
export function pxToUserUnits(px) {
  return Math.round((px / PX_PER_MM) * 100) / 100;
}

// Common font sizes, pre-converted (px -> user units), for renderers that
// want a named constant instead of calling pxToUserUnits() inline.
export const FONT_SIZE_UU = {
  9: pxToUserUnits(9),
  10: pxToUserUnits(10),
  11: pxToUserUnits(11),
  13: pxToUserUnits(13),
  14: pxToUserUnits(14)
};

// ===== Page Geometry Constants =====
// Fixed A4 dimensions in mm; 1 unit = 1 mm for true-size print.
const PAGE_GEOMETRY = {
  portrait: {
    viewBox: "0 0 210 297",
    width: 210,
    height: 297,
    cssSize: "A4 portrait"
  },
  landscape: {
    viewBox: "0 0 297 210",
    width: 297,
    height: 210,
    cssSize: "A4 landscape"
  }
};

// ===== DocumentShell Class =====
/**
 * Page model for paginated A4 documents.
 *
 * @param {Object} data - { pages: [ { orientation: "portrait"|"landscape", content: {...} } ] }
 * @param {Function} renderFn - (pageData, svgElement) => void; draws into SVG
 * @param {string} orientation - "portrait" or "landscape"; immutable per document
 */
export class DocumentShell {
  constructor(data, renderFn, orientation) {
    if (!["portrait", "landscape"].includes(orientation)) {
      throw new Error(`Invalid orientation: ${orientation}. Must be "portrait" or "landscape".`);
    }
    this.data = data;
    this.renderFn = renderFn;
    this.orientation = orientation;
    this.svgPages = [];

    // Inject print CSS on instantiation (FR-DS-3, FR-DS-11)
    this._injectPrintCSS();

    // Render on init
    this.render();
  }

  /**
   * Update data and re-render all pages.
   * @param {Object} newData - new data object
   */
  setData(newData) {
    this.data = newData;
    this.render();
  }

  /**
   * Render all pages from this.data into the DOM.
   * Creates one <svg> element per page, clears old SVGs first.
   */
  render() {
    // Clear existing SVG pages
    this.svgPages.forEach(svg => svg.remove());
    this.svgPages = [];

    // Get page geometry for this document's orientation
    const geom = PAGE_GEOMETRY[this.orientation];

    // Render each page
    if (this.data && this.data.pages && Array.isArray(this.data.pages)) {
      this.data.pages.forEach(pageData => {
        // Create SVG element with correct dimensions
        const svg = this._createSVGElement(geom);

        // Call render function to populate SVG
        this.renderFn(pageData, svg);

        // Append to document body
        document.body.appendChild(svg);
        this.svgPages.push(svg);
      });
    }
  }

  /**
   * Create a new SVG element with correct A4 geometry.
   * @param {Object} geom - geometry from PAGE_GEOMETRY
   * @returns {SVGElement}
   */
  _createSVGElement(geom) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", geom.viewBox);
    svg.setAttribute("width", `${geom.width}mm`);
    svg.setAttribute("height", `${geom.height}mm`);
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.classList.add("document-page");
    return svg;
  }

  /**
   * Export serialized SVG source (hand-readable, no generated id soup).
   * @returns {string} - SVG markup
   */
  exportSVG() {
    if (this.svgPages.length === 0) {
      return "";
    }

    // Serialize all SVG pages
    const serializer = new XMLSerializer();
    return this.svgPages
      .map(svg => serializer.serializeToString(svg))
      .join("\n\n");
  }

  /**
   * Draw an image into SVG at a given position and size.
   * If blob is null/missing, render visible placeholder (FR-DS-9, FR-IMG-6).
   *
   * @param {Blob|null} imageBlob - image blob or null
   * @param {number} x - position in mm
   * @param {number} y - position in mm
   * @param {number} width - width in mm
   * @param {number} height - height in mm
   * @param {SVGElement} svgElement - target SVG element
   */
  renderImage(imageBlob, x, y, width, height, svgElement) {
    // Create a group for the image and its boundary
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "image-container");

    if (!imageBlob) {
      // Render visible placeholder
      this._renderImagePlaceholder(x, y, width, height, group);
    } else {
      // Create object URL from blob
      const objectUrl = URL.createObjectURL(imageBlob);

      // Create clipping rectangle for bounded rendering
      const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
      const clipPathId = `clip-${Math.random().toString(36).substr(2, 9)}`;
      clipPath.setAttribute("id", clipPathId);

      const clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      clipRect.setAttribute("x", String(x));
      clipRect.setAttribute("y", String(y));
      clipRect.setAttribute("width", String(width));
      clipRect.setAttribute("height", String(height));
      clipPath.appendChild(clipRect);

      svgElement.appendChild(clipPath);

      // Create image element
      const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
      image.setAttribute("x", String(x));
      image.setAttribute("y", String(y));
      image.setAttribute("width", String(width));
      image.setAttribute("height", String(height));
      image.setAttributeNS("http://www.w3.org/1999/xlink", "href", objectUrl);
      image.setAttribute("clip-path", `url(#${clipPathId})`);
      image.setAttribute("preserveAspectRatio", "xMidYMid slice");

      group.appendChild(image);
    }

    svgElement.appendChild(group);
  }

  /**
   * Render a visible placeholder for missing images.
   * Light grey box with dashed border and label.
   *
   * @param {number} x - position in mm
   * @param {number} y - position in mm
   * @param {number} width - width in mm
   * @param {number} height - height in mm
   * @param {SVGElement} group - target group element
   */
  _renderImagePlaceholder(x, y, width, height, group) {
    // Background rectangle
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("x", String(x));
    bgRect.setAttribute("y", String(y));
    bgRect.setAttribute("width", String(width));
    bgRect.setAttribute("height", String(height));
    bgRect.setAttribute("fill", "var(--color-bg-light)");
    bgRect.setAttribute("stroke", "var(--color-border-dashed)");
    bgRect.setAttribute("stroke-dasharray", "5,5");
    bgRect.setAttribute("stroke-width", "1");
    bgRect.classList.add("image-placeholder");

    group.appendChild(bgRect);

    // Placeholder text
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(x + width / 2));
    text.setAttribute("y", String(y + height / 2 + 2));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", String(pxToUserUnits(9)));
    text.setAttribute("fill", "var(--color-text-secondary)");
    text.setAttribute("font-family", "var(--font-system)");

    const textContent = document.createTextNode("Image not loaded");
    text.appendChild(textContent);

    group.appendChild(text);
  }

  /**
   * Inject print CSS rules for A4 orientation.
   * Forces colour-adjust: exact on tier colours (FR-DS-11).
   */
  _injectPrintCSS() {
    // Check if print CSS already exists
    if (document.getElementById("document-shell-print-css")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "document-shell-print-css";

    const geom = PAGE_GEOMETRY[this.orientation];
    const cssRules = `
      @page {
        size: ${geom.cssSize};
        margin: 15mm;
      }

      @page :first {
        margin-top: 15mm;
      }

      svg.document-page {
        page-break-after: always;
        break-after: page;
        display: block;
      }

      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        svg.document-page {
          page-break-after: always;
          break-after: page;
        }
      }
    `;

    style.textContent = cssRules;
    document.head.appendChild(style);
  }
}

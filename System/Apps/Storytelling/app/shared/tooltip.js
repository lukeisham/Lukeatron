/**
 * tooltip.js — hover-over text that shows in every browser, including the Claude app's built-in pane (which draws no
 * native `title` tooltips). A node carries its text in `data-tip`; one delegated listener on the document shows it in a
 * single floating `.st-tooltip` on hover or keyboard focus and hides it on leave, blur, scroll or Escape.
 */
export const TIP_ATTR = "data-tip";
const GAP = 8;
const MARGIN = 8;

/** Sets (or, for empty text, removes) a node's hover-over text. */
export function setTip(node, text) {
  if (text) node.setAttribute(TIP_ATTR, text);
  else node.removeAttribute(TIP_ATTR);
}

/** Left/top for a tip of `tipSize` next to `target`: below it, or above when there is no room, kept inside the viewport. */
export function tipPosition(target, tipSize, viewport) {
  let left = Math.min(target.left, viewport.width - tipSize.width - MARGIN);
  left = Math.max(MARGIN, left);
  let top = target.bottom + GAP;
  if (top + tipSize.height > viewport.height - MARGIN) top = Math.max(MARGIN, target.top - GAP - tipSize.height);
  return { left, top };
}

/** Installs the delegated listeners once on `doc`. Returns `{ hide, destroy }`. */
export function mountTooltips(doc = globalThis.document) {
  const tip = doc.createElement("div");
  tip.className = "st-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  doc.body.appendChild(tip);
  let current = null;

  const tipTarget = (event) => (event.target && event.target.closest ? event.target.closest(`[${TIP_ATTR}]`) : null);

  function hide() {
    current = null;
    tip.hidden = true;
  }

  function show(target) {
    const text = target.getAttribute(TIP_ATTR);
    if (!text) return hide();
    current = target;
    tip.textContent = text;
    tip.hidden = false;
    const view = doc.defaultView ?? globalThis;
    const at = tipPosition(target.getBoundingClientRect(), tip.getBoundingClientRect(), { width: view.innerWidth, height: view.innerHeight });
    tip.style.left = `${at.left}px`;
    tip.style.top = `${at.top}px`;
  }

  const onOver = (event) => {
    const target = tipTarget(event);
    if (target && target !== current) show(target);
    else if (!target) hide();
  };
  const onOut = (event) => {
    if (current && !(event.relatedTarget && current.contains && current.contains(event.relatedTarget))) hide();
  };
  const onFocus = (event) => {
    const target = tipTarget(event);
    if (target) show(target);
  };
  const onKey = (event) => {
    if (event.key === "Escape") hide();
  };

  const listeners = [["mouseover", onOver], ["mouseout", onOut], ["focusin", onFocus], ["focusout", hide], ["scroll", hide], ["keydown", onKey]];
  for (const [name, handler] of listeners) doc.addEventListener(name, handler, true);
  return {
    hide,
    destroy() {
      for (const [name, handler] of listeners) doc.removeEventListener(name, handler, true);
      tip.remove?.();
    },
  };
}

/** Small DOM helpers. Text goes in as text nodes, never as markup (JS-6): criteria come from the open web. */

export function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === false || value == null) continue;
    node.setAttribute(name, value === true ? "" : value);
  }
  node.append(...children);
  return node;
}

export function byRole(root, role) {
  const node = root.querySelector(`[data-role="${role}"]`);
  if (!node) console.warn(`The page is missing [data-role="${role}"]`);
  return node;
}

export function setBusy(button, busy, busyLabel, idleLabel) {
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
  button.textContent = busy ? busyLabel : idleLabel;
}

export function setStatus(node, text, failed = false) {
  node.textContent = text;
  node.classList.toggle("failed", failed);
}

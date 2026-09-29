// The Inbox slot. v1: placeholder only (what it will show is on Home's wishlist).
import { renderPlaceholder } from "./placeholder.js";

export function mount(section) {
  renderPlaceholder(section, "Inbox", '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>');
}

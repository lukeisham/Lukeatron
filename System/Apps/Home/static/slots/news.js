// The News slot. v1: placeholder only (what it will show is on Home's wishlist).
import { renderPlaceholder } from "./placeholder.js";

export function mount(section) {
  renderPlaceholder(section, "News", '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 8h10M7 12h10M7 16h6"/>');
}

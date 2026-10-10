/** Every event name the modules send on `document`. One place, so a rename is one edit. */
export const EVT_SELECT = "storytelling:select";
export const EVT_OPEN = "storytelling:open";
export const EVT_STORY_CHANGED = "storytelling:story-changed";
export const EVT_OPEN_ABOUT = "storytelling:open-about";
export const EVT_OPEN_LISTS = "storytelling:open-lists";
export const EVT_OPEN_LIBRARY = "storytelling:open-library";
export const EVT_NOTICE = "storytelling:notice";
/** Sent when an agent session opens, closes or renames the story. Detail `{ active, name }`. */
export const EVT_AGENT_SESSION = "storytelling:agent-session";
/** Status-line wording while an agent holds the story map; lives here so the canvas need not import agent-api.js. */
export const AGENT_STATUS_TEXT = "An agent is editing this story";
/** Sent by shared/output.js just before the print dialog opens. Detail `{ target, tone }`; listeners prepare their own print view (whole poster, --print-scale). */
export const EVT_BEFORE_PRINT = "storytelling:before-print";
/** Sent when the print dialog closes or printing failed. Detail `{ target, tone }`; listeners undo what EVT_BEFORE_PRINT did. */
export const EVT_AFTER_PRINT = "storytelling:after-print";

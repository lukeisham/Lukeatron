// ids.js — Centralized ID generation per AD-BOSS-1
// Format: <prefix>-<8 lowercase hex>, generated once, never regenerated

/**
 * Generate a unique ID in the format '<prefix>-<8 lowercase hex>'
 * @param {string} prefix - The prefix for the ID (e.g., 'node', 'topic', 'lesson')
 * @returns {string} A unique ID in the format '<prefix>-<8 lowercase hex>'
 * @throws {Error} If prefix is not a non-empty string
 */
export function newId(prefix) {
  if (typeof prefix !== 'string' || prefix.length === 0) {
    throw new Error('prefix must be a non-empty string');
  }

  // Generate 8 random bytes (64 bits) → 16 hex chars, take first 8
  const randomBytes = new Uint8Array(4);
  crypto.getRandomValues(randomBytes);

  // Convert to hex string
  let hexString = '';
  for (let i = 0; i < randomBytes.length; i++) {
    hexString += randomBytes[i].toString(16).padStart(2, '0');
  }

  return `${prefix}-${hexString}`;
}

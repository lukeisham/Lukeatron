/** Where a drop lands in an ordered list of ids, in the terms the server's move routes take. */

/**
 * The index `movedId` should end up at when dropped on the `side` ('before' or 'after') of
 * `anchorId`, counted in the list with `movedId` taken out first (which is what the server does).
 * @param {number[]} ids the list as it stands, in order
 * @returns {number}
 */
export function insertionIndex(ids, movedId, anchorId, side) {
  const others = ids.filter((id) => id !== movedId);
  const anchor = others.indexOf(anchorId);
  if (anchor === -1) {
    console.warn('order: anchor is not in the list', { anchorId, ids });
    return others.length;
  }
  return side === 'after' ? anchor + 1 : anchor;
}

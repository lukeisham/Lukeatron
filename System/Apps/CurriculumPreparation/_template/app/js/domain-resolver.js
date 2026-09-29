// domain-resolver.js — Shared domain-resolution function (FR-CEB-5)
// Owned by curriculum-editor; called by arbor-tree and bigidea-list
// Implements: INV-DM-43 (node.domain set only on strands; outcomes/tasks inherit via walk)

/**
 * Resolve the effective domain for a node by walking its ancestry.
 * - For strand nodes: return node.domain directly
 * - For outcome/task nodes: walk parentId chain to nearest strand ancestor, return its domain
 * - If no ancestor strand or domain unset on ancestor: return null
 *
 * @param {string} nodeId - The node.id to resolve
 * @param {Array} nodes - The unit.nodes[] array
 * @returns {string|null} "skill" | "knowledge" | null
 * @throws {Error} If nodeId or nodes is invalid
 */
export function resolveDomain(nodeId, nodes) {
  if (typeof nodeId !== 'string' || nodeId.length === 0) {
    throw new Error('nodeId must be a non-empty string');
  }

  if (!Array.isArray(nodes)) {
    throw new Error('nodes must be an array');
  }

  // Build nodeMap for O(1) lookup
  const nodeMap = {};
  for (const node of nodes) {
    if (node.id) {
      nodeMap[node.id] = node;
    }
  }

  const node = nodeMap[nodeId];
  if (!node) {
    throw new Error(`Node ${nodeId} not found in nodes array`);
  }

  // If this node is a strand, return its domain directly
  if (node.kind === 'strand') {
    return node.domain || null;
  }

  // For outcome/task, walk parentId chain to find nearest strand ancestor
  let current = node;
  while (current.parentId) {
    const parent = nodeMap[current.parentId];
    if (!parent) {
      // Parent doesn't exist; stop walking (shouldn't happen if tree is valid)
      return null;
    }

    if (parent.kind === 'strand') {
      // Found the nearest strand ancestor
      return parent.domain || null;
    }

    // Continue walking up
    current = parent;
  }

  // No strand ancestor found
  return null;
}

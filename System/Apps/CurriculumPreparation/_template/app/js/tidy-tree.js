// tidy-tree.js — Horizontal tree layout algorithm (AD-ATB-1)
// Pure function: nodes + edges → positioned rectangles, no overlap, frozen once passing AC-ATB-1
// Implements: FR-ATB-1, Q-4 (horizontal family tree, root at left, children fan right)

/**
 * Layout a tree horizontally from left to right.
 * Root at x=0; children fan right; no node overlap at realistic scale.
 *
 * @param {Array} nodes - Unit.nodes[] array, may be empty
 * @param {Array} edges - Array of { parentId, childId } (one edge per non-root node)
 * @param {number} cardWidth - Card width in pixels (including padding)
 * @param {number} cardHeight - Card height in pixels (including padding)
 * @returns {Array} Array of { nodeId, x, y, width, height } positioned rectangles
 * @throws {Error} If inputs invalid
 */
export function layoutTree(nodes, edges, cardWidth, cardHeight) {
  if (!Array.isArray(nodes)) {
    throw new Error('nodes must be an array');
  }
  if (!Array.isArray(edges)) {
    throw new Error('edges must be an array');
  }
  if (typeof cardWidth !== 'number' || cardWidth <= 0) {
    throw new Error('cardWidth must be a positive number');
  }
  if (typeof cardHeight !== 'number' || cardHeight <= 0) {
    throw new Error('cardHeight must be a positive number');
  }

  // Empty tree is valid (OQ-BT-1 resolved)
  if (nodes.length === 0) {
    return [];
  }

  // Build node map, children map, and find ALL top-level roots (strands).
  // A curriculum unit has SEVERAL top-level strands (AC-ATB-1's own fixture:
  // "~2 strands, ~15 outcomes"), so every node with parentId: null is a root
  // to be laid out, not just the first one found.
  const nodeMap = {};
  const childrenMap = {};
  const roots = [];

  for (const node of nodes) {
    if (node.id) {
      nodeMap[node.id] = node;
    }
  }

  for (const edge of edges) {
    if (edge.childId && edge.parentId) {
      if (!childrenMap[edge.parentId]) {
        childrenMap[edge.parentId] = [];
      }
      childrenMap[edge.parentId].push(edge.childId);
    }
  }

  for (const node of nodes) {
    if (!node.parentId) {
      roots.push(node);
    }
  }

  if (roots.length === 0) {
    // No root found; return empty layout
    return [];
  }

  // Horizontal tidy-tree layout: root at left (x by depth), descendants
  // fan right. Vertical position is assigned by a post-order walk so each
  // leaf claims its own row (rowCounter) and each internal node centers on
  // its children's rows — the standard technique that guarantees no
  // overlap, extended here to run once per top-level strand so multiple
  // strands stack as independent, non-overlapping bands top-to-bottom.
  const layouts = [];
  const layoutByNodeId = {};
  const rowHeight = cardHeight + 30; // 30px vertical spacing between sibling rows
  const colWidth = cardWidth + 40; // 40px horizontal spacing between depth levels
  let rowCounter = 0;

  function visit(nodeId, depth) {
    const node = nodeMap[nodeId];
    if (!node) return null;

    const children = childrenMap[nodeId] || [];
    const x = depth * colWidth;
    let y;

    if (children.length === 0) {
      // Leaf: claim the next free row.
      y = rowCounter * rowHeight;
      rowCounter += 1;
    } else {
      // Internal node: lay out children first, then center on their span.
      const childYs = [];
      for (const childId of children) {
        const childLayout = visit(childId, depth + 1);
        if (childLayout) childYs.push(childLayout.y);
      }
      if (childYs.length > 0) {
        y = (Math.min(...childYs) + Math.max(...childYs)) / 2;
      } else {
        y = rowCounter * rowHeight;
        rowCounter += 1;
      }
    }

    const entry = { nodeId: node.id, x, y, width: cardWidth, height: cardHeight };
    layouts.push(entry);
    layoutByNodeId[node.id] = entry;
    return entry;
  }

  for (const root of roots) {
    visit(root.id, 0);
  }

  return layouts;
}

/**
 * Build children map from edge list.
 * @param {Array} edges - Array of { parentId, childId }
 * @returns {Object} Map { parentId: [childId, ...] }
 */
export function buildChildrenMap(edges) {
  const map = {};
  for (const edge of edges) {
    if (edge.parentId && edge.childId) {
      if (!map[edge.parentId]) {
        map[edge.parentId] = [];
      }
      map[edge.parentId].push(edge.childId);
    }
  }
  return map;
}

/**
 * Build edge list from nodes array.
 * One edge per non-root node: { parentId, childId }.
 * @param {Array} nodes - Unit.nodes[] array
 * @returns {Array} Array of { parentId, childId }
 */
export function buildEdgeList(nodes) {
  const edges = [];
  for (const node of nodes) {
    if (node.parentId && node.id) {
      edges.push({ parentId: node.parentId, childId: node.id });
    }
  }
  return edges;
}

/**
 * Compute tree depth (maximum parent chain length from root).
 * @param {Object} nodeMap - Map of node.id → node
 * @param {Object} childrenMap - Map of parentId → [childId, ...]
 * @param {string} rootId - Root node ID
 * @returns {number} Maximum depth (0 = root only)
 */
export function computeTreeDepth(nodeMap, childrenMap, rootId) {
  let maxDepth = 0;

  function visit(nodeId, depth) {
    maxDepth = Math.max(maxDepth, depth);
    const children = childrenMap[nodeId] || [];
    for (const childId of children) {
      visit(childId, depth + 1);
    }
  }

  visit(rootId, 0);
  return maxDepth;
}

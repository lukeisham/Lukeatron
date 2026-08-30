// test_tidy-tree.js — Unit tests for tree layout algorithm (FR-ATB-1, AD-ATB-1)

import test from 'node:test';
import assert from 'node:assert';
import { layoutTree, buildEdgeList, buildChildrenMap, computeTreeDepth } from '../app/js/tidy-tree.js';

test('tidy-tree: imports successfully', (t) => {
  assert.strictEqual(typeof layoutTree, 'function');
  assert.strictEqual(typeof buildEdgeList, 'function');
});

test('tidy-tree: handles empty nodes array (OQ-BT-1)', (t) => {
  const result = layoutTree([], [], 140, 80);
  assert.deepStrictEqual(result, []);
});

test('tidy-tree: lays out single root node', (t) => {
  const nodes = [
    { id: 'root', kind: 'strand', parentId: null }
  ];
  const edges = [];

  const result = layoutTree(nodes, edges, 140, 80);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].nodeId, 'root');
  assert.strictEqual(result[0].x, 0);
  assert.strictEqual(result[0].y, 0);
});

test('tidy-tree: lays out root with child nodes (horizontal fan)', (t) => {
  const nodes = [
    { id: 'root', kind: 'strand', parentId: null },
    { id: 'child1', kind: 'outcome', parentId: 'root' },
    { id: 'child2', kind: 'outcome', parentId: 'root' }
  ];
  const edges = [
    { parentId: 'root', childId: 'child1' },
    { parentId: 'root', childId: 'child2' }
  ];

  const result = layoutTree(nodes, edges, 140, 80);
  assert.strictEqual(result.length, 3);

  // Root at top level, children at depth 1
  const rootPos = result.find(r => r.nodeId === 'root');
  const childPos = result.filter(r => r.nodeId.startsWith('child'));

  assert.strictEqual(rootPos.x, 0);
  childPos.forEach(pos => {
    assert(pos.x > rootPos.x, 'Children should fan right of root');
    assert.strictEqual(pos.width, 140);
    assert.strictEqual(pos.height, 80);
  });
});

test('tidy-tree: computes positions without overlap', (t) => {
  // Fixture: ~2 strands, ~15 outcomes, several tasks (simplified)
  const nodes = [
    { id: 'strand1', kind: 'strand', parentId: null },
    { id: 'strand2', kind: 'strand', parentId: null },
    { id: 'outcome1-1', kind: 'outcome', parentId: 'strand1' },
    { id: 'outcome1-2', kind: 'outcome', parentId: 'strand1' },
    { id: 'outcome2-1', kind: 'outcome', parentId: 'strand2' },
    { id: 'task1-1-1', kind: 'task', parentId: 'outcome1-1' },
    { id: 'task1-1-2', kind: 'task', parentId: 'outcome1-1' }
  ];
  const edges = buildEdgeList(nodes);

  const result = layoutTree(nodes, edges, 140, 80);

  // Check no overlaps: all rectangles should have unique positions or not intersect
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const r1 = result[i];
      const r2 = result[j];
      // Rectangles should not overlap
      const overlap = !(
        r1.x + r1.width <= r2.x ||
        r2.x + r2.width <= r1.x ||
        r1.y + r1.height <= r2.y ||
        r2.y + r2.height <= r1.y
      );
      assert(!overlap, `Nodes ${r1.nodeId} and ${r2.nodeId} overlap`);
    }
  }
});

test('tidy-tree: throws on invalid nodes', (t) => {
  assert.throws(
    () => layoutTree(null, [], 140, 80),
    /nodes must be an array/
  );
});

test('tidy-tree: throws on invalid edges', (t) => {
  assert.throws(
    () => layoutTree([], null, 140, 80),
    /edges must be an array/
  );
});

test('tidy-tree: throws on invalid cardWidth', (t) => {
  assert.throws(
    () => layoutTree([], [], 0, 80),
    /cardWidth must be a positive number/
  );
});

test('tidy-tree: throws on invalid cardHeight', (t) => {
  assert.throws(
    () => layoutTree([], [], 140, -1),
    /cardHeight must be a positive number/
  );
});

test('tidy-tree: buildEdgeList extracts edges from nodes', (t) => {
  const nodes = [
    { id: 'root', kind: 'strand', parentId: null },
    { id: 'child', kind: 'outcome', parentId: 'root' }
  ];

  const edges = buildEdgeList(nodes);
  assert.strictEqual(edges.length, 1);
  assert.deepStrictEqual(edges[0], { parentId: 'root', childId: 'child' });
});

test('tidy-tree: buildEdgeList skips root node', (t) => {
  const nodes = [
    { id: 'root', kind: 'strand', parentId: null },
    { id: 'root2', kind: 'strand', parentId: null },
    { id: 'child', kind: 'outcome', parentId: 'root' }
  ];

  const edges = buildEdgeList(nodes);
  assert.strictEqual(edges.length, 1);
  assert.deepStrictEqual(edges[0], { parentId: 'root', childId: 'child' });
});

test('tidy-tree: buildChildrenMap groups children by parent', (t) => {
  const edges = [
    { parentId: 'root', childId: 'child1' },
    { parentId: 'root', childId: 'child2' },
    { parentId: 'child1', childId: 'grandchild' }
  ];

  const map = buildChildrenMap(edges);
  assert.deepStrictEqual(map['root'], ['child1', 'child2']);
  assert.deepStrictEqual(map['child1'], ['grandchild']);
});

test('tidy-tree: computeTreeDepth returns max depth', (t) => {
  const nodeMap = {
    'root': { id: 'root' },
    'child': { id: 'child' },
    'grandchild': { id: 'grandchild' }
  };
  const childrenMap = {
    'root': ['child'],
    'child': ['grandchild']
  };

  const depth = computeTreeDepth(nodeMap, childrenMap, 'root');
  assert.strictEqual(depth, 2);
});

test('tidy-tree: computeTreeDepth returns 0 for root-only', (t) => {
  const nodeMap = { 'root': { id: 'root' } };
  const childrenMap = {};

  const depth = computeTreeDepth(nodeMap, childrenMap, 'root');
  assert.strictEqual(depth, 0);
});

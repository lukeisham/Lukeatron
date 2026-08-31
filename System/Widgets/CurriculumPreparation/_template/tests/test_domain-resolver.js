// test_domain-resolver.js — Unit tests for resolveDomain (FR-CEB-5)

import test from 'node:test';
import assert from 'node:assert';
import { resolveDomain } from '../app/js/domain-resolver.js';

test('domain-resolver: imports successfully', (t) => {
  assert.strictEqual(typeof resolveDomain, 'function');
});

test('domain-resolver: returns domain directly for strand nodes', (t) => {
  const nodes = [
    { id: 'node-strand', kind: 'strand', domain: 'skill', parentId: null },
  ];

  const result = resolveDomain('node-strand', nodes);
  assert.strictEqual(result, 'skill');
});

test('domain-resolver: returns null for strand without domain', (t) => {
  const nodes = [
    { id: 'node-strand', kind: 'strand', domain: null, parentId: null },
  ];

  const result = resolveDomain('node-strand', nodes);
  assert.strictEqual(result, null);
});

test('domain-resolver: walks to nearest strand ancestor for outcome', (t) => {
  const nodes = [
    { id: 'root', kind: 'strand', domain: 'knowledge', parentId: null },
    { id: 'outcome', kind: 'outcome', parentId: 'root' },
  ];

  const result = resolveDomain('outcome', nodes);
  assert.strictEqual(result, 'knowledge');
});

test('domain-resolver: walks to nearest strand ancestor for task', (t) => {
  const nodes = [
    { id: 'root', kind: 'strand', domain: 'skill', parentId: null },
    { id: 'outcome', kind: 'outcome', parentId: 'root' },
    { id: 'task', kind: 'task', parentId: 'outcome' },
  ];

  const result = resolveDomain('task', nodes);
  assert.strictEqual(result, 'skill');
});

test('domain-resolver: returns null if no ancestor strand exists', (t) => {
  const nodes = [
    { id: 'root', kind: 'outcome', parentId: null },
    { id: 'task', kind: 'task', parentId: 'root' },
  ];

  const result = resolveDomain('task', nodes);
  assert.strictEqual(result, null);
});

test('domain-resolver: throws on invalid nodeId', (t) => {
  const nodes = [
    { id: 'node-strand', kind: 'strand', domain: 'skill', parentId: null },
  ];

  assert.throws(() => resolveDomain('', nodes), /nodeId must be a non-empty string/);
});

test('domain-resolver: throws on invalid nodes array', (t) => {
  assert.throws(() => resolveDomain('some-id', null), /nodes must be an array/);
});

test('domain-resolver: throws on non-existent nodeId', (t) => {
  const nodes = [
    { id: 'node-strand', kind: 'strand', domain: 'skill', parentId: null },
  ];

  assert.throws(() => resolveDomain('non-existent', nodes), /not found/);
});

test('domain-resolver: resolves multiple outcomes under same strand', (t) => {
  const nodes = [
    { id: 'strand1', kind: 'strand', domain: 'skill', parentId: null },
    { id: 'outcome1', kind: 'outcome', parentId: 'strand1' },
    { id: 'outcome2', kind: 'outcome', parentId: 'strand1' },
  ];

  assert.strictEqual(resolveDomain('outcome1', nodes), 'skill');
  assert.strictEqual(resolveDomain('outcome2', nodes), 'skill');
});

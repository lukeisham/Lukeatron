// test_image-loader.js — Smoke tests for image dimension decoding
// Tests: import, happy path (decode dimensions), guard (invalid blob)

import { test } from 'node:test';
import assert from 'node:assert';
import { decodeImageDimensions, getDefaultPosition } from '../app/js/image-loader.js';

test('image-loader imports successfully', async (t) => {
  assert.strictEqual(typeof decodeImageDimensions, 'function');
  assert.strictEqual(typeof getDefaultPosition, 'function');
});

test('getDefaultPosition returns sensible defaults', async (t) => {
  const pos = getDefaultPosition();
  assert.strictEqual(typeof pos.x, 'number');
  assert.strictEqual(typeof pos.y, 'number');
  assert(pos.x >= 0);
  assert(pos.y >= 0);
});

test('getDefaultPosition with custom parameters', async (t) => {
  const pos = getDefaultPosition(10, 20, 100, 100);
  assert.strictEqual(pos.x, 15); // 10 + 5 margin
  assert.strictEqual(pos.y, 25); // 20 + 5 margin
});

test('decodeImageDimensions rejects invalid blob', async (t) => {
  try {
    await decodeImageDimensions(null);
    assert.fail('Should have thrown error for null blob');
  } catch (err) {
    assert.match(err.message, /must be a Blob/);
  }
});

test('decodeImageDimensions rejects non-Blob argument', async (t) => {
  try {
    await decodeImageDimensions({ fake: 'object' });
    assert.fail('Should have thrown error for non-Blob');
  } catch (err) {
    assert.match(err.message, /must be a Blob/);
  }
});

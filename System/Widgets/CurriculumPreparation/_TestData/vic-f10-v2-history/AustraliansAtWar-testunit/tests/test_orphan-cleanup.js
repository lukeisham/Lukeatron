// test_orphan-cleanup.js — Smoke tests for orphan image detection
// Tests: import, happy path (compute orphans), guard (verify referenced images not orphaned)

import { test } from 'node:test';
import assert from 'node:assert';
import { getReferencedImageIds, computeOrphanImages } from '../app/js/orphan-cleanup.js';

test('orphan-cleanup imports successfully', async (t) => {
  assert.strictEqual(typeof getReferencedImageIds, 'function');
  assert.strictEqual(typeof computeOrphanImages, 'function');
});

test('getReferencedImageIds finds images in lesson tier pages', async (t) => {
  const unit = {
    lessons: [
      {
        id: 'lesson-1',
        tiers: {
          pass: {
            tier: 'pass',
            imageRefs: [{ imageId: 'img-001' }]
          },
          intermediate: {
            tier: 'intermediate',
            imageRefs: []
          },
          advanced: {
            tier: 'advanced',
            imageRefs: []
          }
        }
      }
    ]
  };

  const refs = getReferencedImageIds(unit);
  assert(refs.has('img-001'));
  assert.strictEqual(refs.size, 1);
});

test('getReferencedImageIds finds images in crib-sheet sections', async (t) => {
  const unit = {
    cribSheet: {
      sections: [
        {
          bigIdeaId: 'idea-1',
          half: 'upper',
          imageRefs: [{ imageId: 'img-crib-1' }]
        }
      ]
    }
  };

  const refs = getReferencedImageIds(unit);
  assert(refs.has('img-crib-1'));
});

test('getReferencedImageIds finds images in resources page', async (t) => {
  const unit = {
    resourcesPage: {
      items: [
        {
          id: 'res-item-1',
          kind: 'image',
          imageId: 'img-res-1'
        },
        {
          id: 'res-item-2',
          kind: 'link',
          url: 'https://example.com'
        }
      ]
    }
  };

  const refs = getReferencedImageIds(unit);
  assert(refs.has('img-res-1'));
  assert.strictEqual(refs.size, 1);
});

test('computeOrphanImages identifies unreferenced images', async (t) => {
  const unit = {
    images: [
      { id: 'img-001', filename: 'image-001.png', byteSize: 1000, mimeType: 'image/png' },
      { id: 'img-002', filename: 'image-002.png', byteSize: 2000, mimeType: 'image/png' },
      { id: 'img-003', filename: 'image-003.png', byteSize: 3000, mimeType: 'image/png' }
    ],
    lessons: [
      {
        id: 'lesson-1',
        tiers: {
          pass: {
            tier: 'pass',
            imageRefs: [{ imageId: 'img-001' }]
          },
          intermediate: { tier: 'intermediate', imageRefs: [] },
          advanced: { tier: 'advanced', imageRefs: [] }
        }
      }
    ]
  };

  const orphans = computeOrphanImages(unit);
  assert.strictEqual(orphans.length, 2);
  assert.strictEqual(orphans.find(o => o.id === 'img-002').id, 'img-002');
  assert.strictEqual(orphans.find(o => o.id === 'img-003').id, 'img-003');
  // img-001 should NOT be in orphans (TEST-7: verify referenced image is NOT deleted)
  assert.strictEqual(orphans.find(o => o.id === 'img-001'), undefined);
});

test('computeOrphanImages returns empty array when no images', async (t) => {
  const unit = {
    images: []
  };

  const orphans = computeOrphanImages(unit);
  assert.strictEqual(orphans.length, 0);
});

test('computeOrphanImages handles missing images array', async (t) => {
  const unit = {
    lessons: []
  };

  const orphans = computeOrphanImages(unit);
  assert.strictEqual(orphans.length, 0);
});

test('getReferencedImageIds finds images in unit assessment', async (t) => {
  const unit = {
    unitAssessment: {
      majorAssessment: {
        tiers: {
          pass: {
            tier: 'pass',
            imageRefs: [{ imageId: 'img-ua-major' }]
          },
          intermediate: { tier: 'intermediate', imageRefs: [] },
          advanced: { tier: 'advanced', imageRefs: [] }
        }
      },
      miniAssessments: [
        {
          id: 'mini-1',
          tiers: {
            pass: {
              tier: 'pass',
              imageRefs: [{ imageId: 'img-mini-1' }]
            },
            intermediate: { tier: 'intermediate', imageRefs: [] },
            advanced: { tier: 'advanced', imageRefs: [] }
          }
        }
      ]
    }
  };

  const refs = getReferencedImageIds(unit);
  assert(refs.has('img-ua-major'));
  assert(refs.has('img-mini-1'));
  assert.strictEqual(refs.size, 2);
});

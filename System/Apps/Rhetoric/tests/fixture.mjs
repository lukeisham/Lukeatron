// Shared hand-built /api/items payload for the front-end tests: two devices in three trees,
// one ranked and one not, one with a Latin example and one with markup-shaped text.
export function payload() {
  const leaf = (id) => ({ kind: 'device', id });
  const tree = (rootId, typeId, name) => [{
    kind: 'node', id: rootId, name: `${name} Root`, definition: `${name} root definition`,
    children: [{
      kind: 'node', id: typeId, name: `${name} Type`, definition: `${name} type definition`,
      children: [leaf(1), leaf(2)],
    }],
  }];
  return {
    trees: {
      category: tree(1, 2, 'Category'),
      form: tree(3, 4, 'Form'),
      function: tree(5, 6, 'Function'),
    },
    devices: {
      1: {
        name: 'Metaphor', definition: 'a comparison without "like"', popularity: 90, ai_confidence_rating: 'high',
        topical_rank: null, examples: ['carpe *diem* is a "saying" (Horace)'],
      },
      2: {
        name: 'Anaphora', definition: '<script>alert(1)</script>', popularity: null, ai_confidence_rating: 'low',
        topical_rank: 1, examples: [],
      },
    },
  };
}

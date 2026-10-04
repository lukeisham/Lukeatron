import { createState } from '../app/state.js';

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
      // Topical: one real Type holding Metaphor, and the derived Unsorted heading (id 0) holding Anaphora.
      topical: [
        { kind: 'node', id: 7, name: 'Irony', definition: '', children: [leaf(1)] },
        { kind: 'node', id: 0, name: 'Unsorted', definition: 'not yet placed under a Type', children: [leaf(2)] },
      ],
      // Grammar: Anaphora is the one grammar-bearing device, filed under one label and one function; Metaphor sits under "No grammatical term" (id 0).
      grammar_function: [
        { kind: 'node', id: 5, name: 'Function Root', definition: 'Function root definition', children: [leaf(2)] },
        { kind: 'node', id: 0, name: 'No grammatical term', definition: 'devices that turn on no grammatical term', children: [leaf(1)] },
      ],
      grammar_label: [
        {
          kind: 'node', id: 1, name: 'Clause', definition: 'a group of words with a subject and a verb',
          children: [{ kind: 'node', id: 2, name: 'Independent clause', definition: 'can stand alone', children: [leaf(2)] }],
        },
        { kind: 'node', id: 0, name: 'No grammatical term', definition: 'devices that turn on no grammatical term', children: [leaf(1)] },
      ],
    },
    devices: {
      1: {
        name: 'Metaphor', definition: 'a comparison without "like"', popularity: 90, ai_confidence_rating: 'high',
        topical_rank: null, explanation: null, examples: ['carpe *diem* is a "saying" (Horace)'],
      },
      2: {
        name: 'Anaphora', definition: '<script>alert(1)</script>', popularity: null, ai_confidence_rating: 'low',
        topical_rank: 1, examples: [],
        explanation: {
          summary: 'Repeats the opening words.',
          function: { labels: ['Independent clause'], example: '*We shall fight* [independent clause] on the beaches' },
          form: { labels: ['Independent clause', 'Conjunction'], example: '*We shall fight* [independent clause], *and* [conjunction] never yield' },
        },
      },
    },
  };
}

// The state most tests want: every device listed. Reveal mode (the app's default) has its own tests.
export function plainState() {
  const state = createState(payload());
  state.reveal = false;
  return state;
}

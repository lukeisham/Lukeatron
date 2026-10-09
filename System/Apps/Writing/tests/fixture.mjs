import { createState } from '../app/state.js';

// Shared hand-built /api/items payload for the front-end tests: two entries in three trees,
// one ranked and one not, one with a Latin example and one with markup-shaped text.
export function payload() {
  const leaf = (id) => ({ kind: 'entry', id });
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
      // Labels: two labels, "Independent clause" inside "Clause" and a second top-level "Phrase" with nothing in it;
      // Anaphora is filed under the inner label and under Clause itself (an entry may sit at two levels), Metaphor under neither.
      labels: [
        {
          kind: 'node', id: 1, name: 'Clause', definition: 'a group of words with a subject and a verb',
          children: [{ kind: 'node', id: 2, name: 'Independent clause', definition: 'can stand alone', children: [leaf(2)] }, leaf(2)],
        },
        { kind: 'node', id: 3, name: 'Phrase', definition: 'a group of words without a verb of its own', children: [] },
      ],
    },
    // Real quotes for the Index group: two of Metaphor's, two of Anaphora's; one has no author and two have no known date.
    quotes: [
      { id: 1, entry_id: 1, text: '"All the *world\'s* a stage"', source: 'Shakespeare, *As You Like It*, 2.7', author: 'William Shakespeare', date: null },
      { id: 2, entry_id: 2, text: '"We shall fight on the beaches"', source: 'Churchill, House of Commons speech, 4 June 1940', author: 'Winston Churchill', date: '1940-06-04' },
      { id: 3, entry_id: 1, text: '"Beneath the rule of men entirely great / The pen is mightier than the sword."', source: 'Bulwer-Lytton, *Richelieu*, 2.2, 1839', author: 'Edward Bulwer-Lytton', date: '1839' },
      { id: 4, entry_id: 2, text: '"Am I to praise a man who..."', source: '*Reference Handbook*, book 4, §28', author: null, date: null },
    ],
    entries: {
      1: {
        name: 'Metaphor', definition: 'a comparison without "like"', popularity: 90, ai_confidence_rating: 'high',
        examples: ['carpe *diem* is a "saying" (Horace)'],
      },
      2: {
        name: 'Anaphora', definition: '<script>alert(1)</script>', popularity: null, ai_confidence_rating: 'low',
        examples: [],
      },
    },
  };
}

// The state most tests want: every entry listed. Reveal mode (the app's default) has its own tests.
export function plainState() {
  const state = createState(payload());
  state.reveal = false;
  return state;
}

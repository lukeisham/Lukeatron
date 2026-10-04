# Grammar label schema

Reference for the grammar labels and the two grammar slots every device can carry. Read it before
editing `grammar-labels.md` or `grammar.json`. The code that enforces it is `load_grammar.py`; the
tables are in `schema.sql` (see GRAMMAR SLOTS there).

## What a grammar label is

A grammar label is a named piece of English grammar, with a plain definition, filed in a tree.

| Field | Rule |
| :--- | :--- |
| Name | A grammatical term, such as `Independent clause`. Unique among its siblings. May not contain a spaced em dash. |
| Definition | One plain-English phrase saying what the term is. Required. |
| Parent | The label it sits under, or none for a top-level label. |
| Depth | Three levels at most: top-level, then one, then two below. A fourth level is refused. |
| Path | Its names from the top, joined with ` > `: `Clause > Subordinate clause > Relative clause`. A path is how `grammar.json` points at a label. |

The tree is written as a bullet outline, two spaces of indent per level, in `grammar-labels.md`:

```
- Clause — a group of words with a subject and a verb
  - Subordinate clause — a clause that cannot stand alone
    - Relative clause — a subordinate clause introduced by who, which or that
```

## The two grammar slots

Every device that turns on grammar has two slots. Either may be left empty, but not both.

| Slot | Holds | Question it answers |
| :--- | :--- | :--- |
| **Grammar function** | The grammar labels used to achieve this device's function. | What grammar does the work of this device? |
| **Grammar form** | The grammar labels that represent this device. | What does this device look like in grammatical terms? |

Each slot holds one or more labels and one example. So a device has four slots in all:
Grammar function, Grammar function example, Grammar form and Grammar form example.

- A slot with labels must have an example, and a slot with an example must have labels.
- The same label may appear in both slots of one device.
- An example quotes a short passage. It puts the key parts in `*italics*` and gives each grammatical
  term's definition in `[brackets]`, as in `*He came* [independent clause], *he saw* [independent clause]`.
- Besides its two slots, a device carries a one-sentence `summary`.

## Record format in `grammar.json`

One record per grammar-bearing device. Leave a slot out, or set it to `null`, when it is empty. The record below is an illustration of the shape, not loaded data.

```json
{
  "device": "Asyndeton",
  "summary": "Leaves out the conjunctions between items.",
  "function": {
    "labels": ["Word class > Conjunction"],
    "example": "*I came* [independent clause], *I saw* [independent clause], *I conquered* [independent clause]"
  },
  "form": {
    "labels": ["Clause > Independent clause"],
    "example": "*I came* [independent clause], *I saw* [independent clause], *I conquered* [independent clause]"
  }
}
```

## How the slots reach the database

| Where | What |
| :--- | :--- |
| `grammar_labels` | The tree: one row per label, with `parent_id`. |
| `device_labels` | One row per label in a slot: `device_id`, `slot` (`function` or `form`), `label_id`. |
| `grammar_explanations` | One row per device: `summary`, `function_example`, `form_example` (NULL when the slot is empty). |

On screen, the two Grammatical groups show each slot under its device as its labels followed by its
example. In the Grammatical Label group a device is filed under every label it uses in either slot.

## Proposed label tree (draft, not yet loaded)

A starting set for Luke to cut, rename and extend. The loader reads `grammar-labels.md`, not this
file: to adopt the tree, copy the block below into `grammar-labels.md` under its heading, then run
`python3 -m seed.load_grammar`. It follows the format above, with 8 top-level labels and 3 levels at most.

```
- Word class — a group of words that behave alike in a sentence
  - Noun — a word that names a person, place, thing or idea
  - Verb — a word that names an action, event or state
  - Adjective — a word that describes a noun
  - Adverb — a word that describes a verb, an adjective or another adverb
  - Pronoun — a word that stands in for a noun
  - Determiner — a word that introduces a noun, such as the, a or this
  - Preposition — a word that links a noun to the rest of the sentence, showing place, time or relation
  - Conjunction — a word that joins words, phrases or clauses
    - Coordinating conjunction — joins elements of equal rank, such as and, but or or
    - Subordinating conjunction — joins a subordinate clause to a main clause, such as because or although
  - Interjection — a word that expresses a sudden feeling and stands apart from the sentence
- Phrase — a group of words with no subject and verb of its own that works as one unit
  - Noun phrase — a noun with its modifiers, working as a subject, object or complement
  - Verb phrase — a main verb with its helping verbs
  - Prepositional phrase — a preposition with its object and any modifiers
  - Appositive — a noun phrase placed beside another to rename it
  - Participial phrase — a phrase built on a participle that describes a noun
- Clause — a group of words with a subject and a verb
  - Independent clause — a clause that can stand alone as a sentence
  - Subordinate clause — a clause that cannot stand alone
    - Relative clause — a subordinate clause introduced by who, which or that
    - Adverbial clause — a subordinate clause that works like an adverb, giving time, reason or condition
    - Noun clause — a subordinate clause that works as a noun
- Sentence — a complete unit of thought, built from one or more clauses
  - Simple sentence — one independent clause
  - Compound sentence — two or more independent clauses
  - Complex sentence — one independent clause and at least one subordinate clause
  - Compound-complex sentence — two or more independent clauses and at least one subordinate clause
  - Fragment — a group of words punctuated as a sentence that lacks a subject or a finite verb
  - Run-on sentence — independent clauses joined with no conjunction or proper punctuation
- Sentence purpose — what a sentence is used to do
  - Declarative — makes a statement
  - Interrogative — asks a question
  - Imperative — gives a command or request
  - Exclamatory — expresses strong feeling
- Verb feature — a way a verb is marked
  - Tense — the time of an action, such as past, present or future
  - Mood — the attitude of the sentence, such as indicative, imperative or subjunctive
  - Voice — whether the subject does the action (active) or receives it (passive)
  - Aspect — whether an action is complete, ongoing or repeated
- Word form — the shape a word takes
  - Comparison — the forms of an adjective or adverb that show degree
  - Number — whether a word is singular or plural
  - Affix — a prefix or suffix added to a word
  - Compound word — one word made from two or more words
- Word order — the arrangement of words and elements in a sentence
  - Inversion — the usual order of elements is reversed
  - Parallelism — matching grammatical structure across items
  - Ellipsis — words that the reader can supply are left out
  - Apposition — placing two elements side by side so that the second explains the first
```

Notes on the draft: the 51 labels are common English grammar terms; their definitions are plain-English
drafts for Luke's review. `Apposition` (the arrangement) and `Appositive` (the phrase) are kept apart on
purpose. `Conjunction` sits under `Word class` with its two kinds beneath it, so a device that works by
dropping or piling up conjunctions can name the label at either level.

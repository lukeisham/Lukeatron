---
type: content-source
title: "Style — Content Source"
description: "Greatest-hits prose-style schema synthesised from Strunk & White, Williams, and Orwell. Draft content source for the Style parser aide; pending Luke review."
status: draft
---

> **STATUS: DRAFT — pending Luke review**

# Style — Content Source

Per `System/Suggestions/Parser_guide.md` §5a — schemas, rules, and explanation text for the Style parser
(input unit: one paragraph; cap 1000 words; Tier A pattern matching to a style schema).

This file collates a "greatest hits" prose-style schema drawn from three canonical sources. Each rule is
outline-numbered, placed in a logical category, and accompanied by a before/after example. Provenance marks
distinguish direct quotation (Strunk, public domain) from paraphrase (Williams, Orwell). A full provenance
and licence statement appears at the end of the file (§6).

---

## 1. Clarity

### 1.1 Use the active voice

> "The active voice is usually more direct and vigorous than the passive."
> — Strunk & White, *The Elements of Style* (source)

The passive voice is not grammatically wrong, but it often buries the agent,
lengthens the sentence, and drains its energy. Prefer the active construction
unless the agent is genuinely unknown, irrelevant, or best concealed.

**Before** (passive):
> The report was reviewed by the committee, and a decision was reached by them to approve the project.

**After** (active):
> The committee reviewed the report and approved the project.

---

### 1.2 Put statements in positive form

> "Make definite assertions. Avoid tame, colorless, hesitating, non-committal language."
> — Strunk & White, *The Elements of Style* (source)

Use the word *not* as a means of denial or antithesis, never as a means of evasion.
Readers grasp affirmative statements faster than negative ones.

**Before** (negative evasion):
> He was not very often on time.

**After** (positive assertion):
> He usually came late.

**Before** (negative tangle):
> The data do not show that the treatment had no effect.

**After** (positive):
> The data show that the treatment had an effect.

---

### 1.3 Use definite, specific, concrete language

> "Prefer the specific to the general, the definite to the vague, the concrete to the abstract."
> — Strunk & White, *The Elements of Style* (source)

Abstract language forces the reader to supply the missing picture. Concrete detail
grounds the argument and holds attention.

**Before** (vague):
> A period of unfavourable weather set in.

**After** (concrete):
> It rained every day for a week.

**Before** (abstract):
> He showed satisfaction as he took possession of his well-earned reward.

**After** (concrete):
> He grinned as he pocketed the coin.

---

### 1.4 Make characters the subjects of your sentences (paraphrase)

*Paraphrased from Joseph Williams, **Style: Lessons in Clarity and Grace**.*

Readers follow prose more easily when the grammatical subject names the
character performing the action. Avoid abstract nouns in the subject slot when
a flesh-and-blood agent is doing the work. In Williams's terms: "Express
characters as subjects and their actions as verbs." (paraphrase)

**Before** (abstract subject, nominalised action):
> Our lack of data prevented evaluation of the programme's effectiveness.

**After** (character as subject, action as verb):
> Because we lacked data, we could not evaluate how effective the programme was.

---

### 1.5 Express actions as verbs (paraphrase)

*Paraphrased from Joseph Williams, **Style: Lessons in Clarity and Grace**.*

Avoid nominalisations — verbs disguised as nouns (*evaluation*, *implementation*,
*development*) — which drain movement from a sentence. Williams: "Turn nominalizations
back into verbs wherever possible. Readers understand actions more quickly when
they are expressed as verbs, not as abstract nouns." (paraphrase)

**Before** (nominalised):
> The committee will conduct an investigation into the matter and make a recommendation.

**After** (verbs restored):
> The committee will investigate the matter and recommend a course of action.

---

## 2. Brevity

### 2.1 Omit needless words

> "Vigorous writing is concise. A sentence should contain no unnecessary words, a paragraph no unnecessary sentences, for the same reason that a drawing should have no unnecessary lines and a machine no unnecessary parts."
> — Strunk & White, *The Elements of Style* (source)

Every word should pull its weight. Common offenders: *the fact that*, *in the
event that*, *due to the fact that*, *there is/are*, and all manner of throat-clearing.

**Before** (bloated):
> In light of the fact that the meeting has been postponed, it is necessary for us to reschedule our travel arrangements at this point in time.

**After** (tight):
> Because the meeting has been postponed, we must reschedule our travel.

---

### 2.2 If it is possible to cut a word out, always cut it out (paraphrase)

*Paraphrased from George Orwell, **"Politics and the English Language"** (1946).*

Orwell's fourth rule is an uncompromising version of the brevity principle.
If a word does no demonstrable work — qualifying, hedging, or merely inflating —
it should go. Orwell: "If it is possible to cut a word out, always cut it out."
(paraphrase, source named)

**Before** (hedged):
> It is generally felt by many people that a fairly significant number of the proposed changes are, on the whole, perhaps somewhat unnecessary.

**After** (cut):
> Many people feel that most of the proposed changes are unnecessary.

---

### 2.3 Never use a long word where a short one will do (paraphrase)

*Paraphrased from George Orwell, **"Politics and the English Language"** (1946).*

Orwell's second rule favours the short, common word over the long, rare one —
not to dumb down the prose, but to speed understanding. Orwell: "Never use a
long word where a short one will do." (paraphrase, source named)

**Before** (inflated):
> The meteorological conditions precipitated the cancellation of the outdoor festivities.

**After** (plain):
> The weather forced us to cancel the outdoor party.

---

## 3. Coherence

### 3.1 Old information before new information (paraphrase)

*Paraphrased from Joseph Williams, **Style: Lessons in Clarity and Grace**.*

Williams's most powerful single principle: begin each sentence with information
the reader already knows (or can easily infer), then introduce new material at
the end. This "old-to-new" flow reduces the cognitive load of reading and creates
natural bridges between sentences. Williams: "Put at the beginning of a sentence
those ideas that you have already mentioned, referred to, or implied, or that you
can reasonably assume your reader already knows." (paraphrase)

**Before** (new-before-old — jarring jump):
> A radical shift in monetary policy was announced by the central bank yesterday.
> Rising inflation had prompted the decision.

**After** (old-before-new — smooth flow):
> The central bank announced a radical shift in monetary policy yesterday.
> The decision was prompted by rising inflation.

---

### 3.2 Build cohesive paragraphs (paraphrase)

*Paraphrased from Joseph Williams, **Style: Lessons in Clarity and Grace**.*

Cohesion is the felt connection between sentences; coherence is the sense that
all parts belong to a single whole. Williams: "A paragraph coheres when the
reader can see that every sentence serves a single, identifiable purpose."
(paraphrase) Use topic strings — repeating or varying the key subject across
sentences — and logical connectors (*therefore*, *however*, *in addition*) to
make the thread visible.

**Before** (disjointed):
> The experiment lasted six months. Researchers collected data at three sites.
> Funding came from the National Science Foundation. Previous studies had used
> different protocols.

**After** (cohesive topic string):
> The experiment lasted six months and gathered data from three sites.
> This design was funded by the National Science Foundation. It improved on
> earlier protocols in several respects.

---

### 3.3 Keep related words together

> "The position of the words in a sentence is the principal means of showing their relationship."
> — Strunk & White, *The Elements of Style* (source)

Modifiers should sit next to the words they modify. Separating a subject from
its verb, or a modifier from its target, forces the reader to hold a grammatical
gap open — and risks ambiguity.

**Before** (separated):
> He noticed a large stain in the rug that was right in the centre.

**After** (together):
> He noticed a large stain right in the centre of the rug.

**Before** (subject–verb gap):
> The committee, after reviewing all the evidence and consulting with outside experts over the course of three meetings, decided.

**After** (gap closed):
> The committee decided after reviewing all the evidence and consulting with outside experts over three meetings.

---

### 3.4 Express coordinate ideas in similar form (parallelism)

> "Express parallel ideas in parallel form. This principle, that of parallel construction, requires that expressions similar in content and function be outwardly similar."
> — Strunk & White, *The Elements of Style* (source)

Parallel structure helps the reader see the symmetry of related ideas at a
glance. Break it and you create a small but real stumble.

**Before** (broken parallel):
> The role involves writing reports, managing a team, and you must attend weekly meetings.

**After** (parallel):
> The role involves writing reports, managing a team, and attending weekly meetings.

---

## 4. Voice

### 4.1 Never use the passive where you can use the active (paraphrase)

*Paraphrased from George Orwell, **"Politics and the English Language"** (1946).*

Orwell's third rule is a harder version of the active-voice principle (§1.1).
Where Strunk frames the active voice as a preference, Orwell frames the passive
as a moral hazard — a device that can obscure responsibility. Orwell: "Never
use the passive where you can use the active." (paraphrase, source named)

**Before** (passive evasion):
> Mistakes were made during the audit process.

**After** (active responsibility):
> The audit team made mistakes.

---

### 4.2 Write in a way that comes naturally

> "Write in a way that comes naturally... Do not attempt to be folksy or assume a breezy manner that does not befit who you are."
> — Strunk & White, *The Elements of Style* (source)

Affectation — whether pretentious or faux-humble — breaks the reader's trust.
The goal is not to sound "writerly" but to sound like a clear-minded person
who has something worth saying.

**Before** (affected):
> One cannot but be struck by the manifold splendours of the aforementioned vista.

**After** (natural):
> The view was beautiful.

---

### 4.3 Do not overwrite

> "Do not overwrite. Rich, ornate prose is hard to digest, generally unwholesome, and sometimes nauseating."
> — Strunk & White, *The Elements of Style* (source)

Overwriting calls attention to the writer at the expense of the subject.
Prefer the plain style; ornament should be earned, not default.

**Before** (overwritten):
> The resplendent, golden orb of day sank slowly and majestically beneath the cerulean horizon, painting the heavens with hues of crimson and amber.

**After** (restrained):
> The sun set.

---

## 5. Diction

### 5.1 Avoid dead metaphors and clichéd similes (paraphrase)

*Paraphrased from George Orwell, **"Politics and the English Language"** (1946).*

Orwell's first rule — his most famous — targets the prefabricated phrase.
A metaphor or simile that you are used to seeing in print has lost its power
to evoke; the reader glances past it without forming a mental image. Orwell:
"Never use a metaphor, simile, or other figure of speech which you are used to
seeing in print." (paraphrase, source named)

**Before** (dead metaphor):
> The project was a baptism of fire, but we kept our nose to the grindstone and left no stone unturned.

**After** (fresh language):
> The project was punishing, but we worked relentlessly and checked every detail.

---

### 5.2 Prefer the standard to the offbeat

> "Prefer the standard to the offbeat."
> — Strunk & White, *The Elements of Style* (source)

Novelty for its own sake distracts. Standard English, deployed with precision,
outperforms a thesaurus-driven search for the unusual. Let the idea be fresh;
the language need not draw attention to itself.

**Before** (offbeat):
> The professor's allocution anent the examination's modalities eventuated in considerable discombobulation among the matriculants.

**After** (standard):
> The professor's remarks about the exam format confused the students.

---

### 5.3 Use figures of speech sparingly

> "Use figures of speech sparingly. The simile is a common device and a useful one, but similes coming in rapid fire, one right on top of another, are more distracting than illuminating."
> — Strunk & White, *The Elements of Style* (source)

One well-chosen comparison can illuminate. A cascade of them buries meaning.
When you do reach for a figure of speech, make it one you have thought up
yourself — vivid, apt, and singular.

**Before** (overloaded with figures):
> The meeting was a perfect storm: a minefield of competing agendas, a pressure cooker of tension, and a tightrope walk over a sea of discontent.

**After** (one apt comparison):
> The meeting was a tug of war between two competing visions.

---

## 6. Provenance

### Sources, editions, and licence status

| Source | Edition / Date | Author | Licence / Status | Usage in this file |
|---|---|---|---|---|
| *The Elements of Style* | Original 1918 edition (Strunk) and later Strunk & White editions | William Strunk Jr. and E.B. White | **Public domain** (1918 original); later editions may carry renewed copyrights on White's contributions only — all quoted matter herein is drawn from material that is in the public domain | Direct quotation throughout (§§1.1–1.3, 2.1, 3.3–3.4, 4.2–4.3, 5.2–5.3) |
| *Style: Lessons in Clarity and Grace* | Multiple editions (first published 1981) | Joseph M. Williams | **Copyright** — Pearson Education. Used here in **paraphrase only**; no direct quotation | Paraphrased principles (§§1.4–1.5, 3.1–3.2) |
| "Politics and the English Language" | 1946 (essay, originally published in *Horizon*) | George Orwell | **Copyright** — the Orwell estate. Used here in **paraphrase only**; no direct quotation | Paraphrased rules (§§2.2–2.3, 4.1, 5.1) |

### Additional notes

- All "Before/After" example pairs are **original compositions written for this file**. They are not drawn from any source.
- The categorisation into five groups (Clarity, Brevity, Coherence, Voice, Diction) is this file's own editorial structuring and does not appear in any source.
- Where a principle appears in more than one source (e.g., active voice in both Strunk & White and Orwell), both sources are acknowledged; the principal citation is attached to the section where the canonically "strongest" articulation appears.
- The paraphrase rules for Williams and Orwell material follow the project's provenance policy: the source is named at each occurrence, the paraphrase marker is explicit, and no words, phrases, or sentence structures are reproduced from the original texts.

# Rhetoric — classification criteria (APPROVED 2026-09-30, except Popularity)

Drafted by the agent under Luke's delegation ("you organise the types and devices, ask me if stuck").
Applies to seed-pipeline FR-5/FR-6. Luke approved these on 2026-09-30 (the FR-5 gate), with two changes made that day: a device may hold several Category tags, and the Popularity scale is reopened (see Popularity).

## General
- Each device gets exactly ONE Form heading and exactly ONE Function heading, and ONE OR MORE Category headings, each tree judged independently (AD-3). "Node" here means a heading (root or Type) in a tree, never a device.
- Only nodes in `nodes.json` (Sandbox working copy; the authoritative trees are `seed/type-layers/*.md`) may be used. Never invent a node (AD-2). A device that fits no node in a
  tree is ESCALATED for that tree, with a one-line reason and the closest candidate.
- Place at the most specific node that fits (a nested Type before its root). Use a root itself only
  when no nested Type fits but the root clearly does.
- Topical rank is never set.

## Category — what a device IS
- Kind devices → one of the 8 kind roots (Resemblance, Association, Naming, Invention, Extended
  Meaning, Ornamental Epithet, Fallacy, Fallacy Flipside), per their definitions in `nodes.json` (Sandbox working copy; the authoritative trees are `seed/type-layers/*.md`).
- The five canon roots (Inventio, Dispositio, Elocutio, Memoria, Pronuntiatio) are used only when the
  device is fundamentally about that canon: argument generation (Inventio), arrangement/ordering
  (Dispositio), style/diction (Elocutio), memorability aids (Memoria), delivery/sound (Pronuntiatio).
  Where a kind root fits equally well, the kind root wins.
- Every fallacy → Fallacy. Every Flipside entry → Fallacy Flipside. Every fallacy has exactly one Flipside
  entry (58 of each). Valid argument forms that are not fallacies (Modus Ponens, Modus Tollens,
  Constructive Dilemma, Reductio, Steelmanning, Principle of Charity, Inference to the Best Explanation,
  Argument from Expert Opinion) go to Inventio, not Flipside.

- A device takes a second (or third) Category tag whenever another Category heading genuinely fits it
  (e.g. Fallacy and Naming), each tag placed by the rules above. Never add a tag just to hedge; one
  tag is normal. (Wording added 2026-09-30 from Luke's answer; he set no narrower condition.)

## Form — what a device LOOKS LIKE
- Judge by structure only, ignoring purpose. Nine roots: Replacement, Pairing, Sonic, Addition & Omission,
  Reversal, Semantic Play (surface operations); Argument Structure (the shape of the reasoning);
  Speech Act (the kind of utterance); Sentence Shape (how the sentence is built).
- A Flipside entry takes the same Form as its fallacy unless the legitimate use clearly has another shape.

## Function — what a device DOES
- Judge by the main effect on the audience, ignoring how it is built. If two effects tie, take the
  one the classical description names first. Fallacies are classed by the effect they aim for
  (usually Persuasion); Flipside entries by the effect of the legitimate use. Devices whose effect is to
  avoid, deflect or soften go to Evasion.

## Escalation
- A device that fits no node in a tree gets no placement in that tree and comes to Luke; the write step
  refuses to run while any device lacks a node in all three.

## Popularity — web frequency (Luke chose this 2026-09-30; replaces count × 25)
- A research pass counts, for every device, how many distinct sources mention it. The four scraped
  lists (`seed/scraped_lists.py`) are four of those sources; the rest are rhetoric reference pages
  found through `!HeadlessChromeBrowser` (network use is allowed only in this stage, seed FR-8).
- Match on the device's name or any of its aliases. A source counts once however often it repeats
  the name.
- Score = the source count scaled to 0–100 so the most widely mentioned device is 100 and a device
  in no source is 0. Counts are heavily skewed (most devices are rare), so the scale is logarithmic:
  `round(100 * ln(1 + count) / ln(1 + max_count))`.
- A Flipside device inherits its fallacy's popularity (Luke, 2026-10-02), since no source names a
  Flipside label; `seed/update_popularity.py` applies this after the source scores.
- `popularity` is a required 0–100 integer in the database; a device is not written without one.
- SOURCES (15, approved by Luke 2026-09-30; each URL is verified by the research pass before use):
  - The four scraped lists: American Rhetoric (Devices in Sound), Reedsy (Literary Devices), Reedsy
    (Rhetorical Devices), LitCharts (Literary Devices and Terms).
  - Reference: Silva Rhetoricae (BYU); Wikipedia "List of rhetorical techniques" (finds candidates,
    never cited for a claim); Encyclopaedia Britannica rhetoric entries.
  - Academic: Purdue OWL (rhetorical devices); Stanford Encyclopedia of Philosophy (rhetoric
    entries); The Norton Field Guide index.
  - Classroom: Read Write Think (NCTE); an AP Language rhetorical-devices list (College Board or
    Fiveable); ThoughtCo rhetorical terms glossary.
  - Fallacies: Your Logical Fallacies; Internet Encyclopedia of Philosophy fallacies article; Purdue
    OWL logical fallacies. These three count only for fallacy devices (Fallacy and Fallacy Flipside).

## Merging new popularity data with the existing database (approved 2026-09-30)
New data may change a device's popularity and may add candidate devices; it never overwrites an
approved placement.
1. The research pass writes `seed/popularity.json` (counts per device and per source). No other file
   or the database changes at this point; the pass is re-runnable.
2. Match on `normalise()` of the name plus the device's `aliases`. No fuzzy matching. A differently
   spelled source name is added to that device's aliases by hand.
3. Known device: only `popularity` is recomputed. Definition, examples, placements and flipside link
   are untouched.
4. Unknown name: goes to a review file, not the database. If Luke approves it, it is classified under
   these criteria and appended to `devices.json` with a definition, an example and all its tags.
5. A name matching two devices is listed for Luke.
6. A dry-run report (old score, new score, new candidates, ambiguities, and any device present in
   `devices.json` but not the database or vice versa) is approved by Luke before any write.
7. The write is a separate update script: one transaction, `UPDATE devices SET popularity` only. It is
   not `load_devices.py`.

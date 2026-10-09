# AI confidence rating: rubric

How a device's `ai_confidence_rating` is set.

`ai_confidence_rating` is a stored value, never computed at run time. It is set once per device in `seed/devices.json`, then copied unchanged through `load_devices.py` → `rhetoric.db` → `items.py` → `state.js` → `render.js` (badge) and `main.js` (toggle). Only the seed step may change it, so this rubric is applied there. `seed/confidence-scoring.md` records which tests each device failed and why.

**What the rating claims** (as `schema.sql` words it): the AI's confidence that the device's definition, example and categorisation are accurate *together*. Score three yes/no tests, then count the passes.

| Test | Passes when |
| :--- | :--- |
| **1. Definition** | It has one settled meaning (a term with rival senses, e.g. Adnomination, fails), AND either it is named in 2 or more distinct sources (the four scraped lists plus the reference sources counted in `seed/popularity.json`; Wikipedia never counts), OR a published handbook, primary text or scholarly paper that is not already a counted source gives the same sense. Name that work, with a locator, in `seed/confidence-scoring.md`. Commercial and hobby sites do not qualify. A description whose wording rests on Wikipedia alone fails this test, even if listed sources name the device. |
| **2. Example** | At least one example exists, and a reader who did not know the device's name could identify it from the example alone. For a fallacy, the example visibly commits the error. |
| **3. Categorisation** | Its Form, Function and Category placements each follow `seed/classification-criteria.md` directly. Fails if any placement needed a judgement call between close nodes or stretches a node's definition. |

| Passes | Rating | Reads as |
| :--- | :--- | :--- |
| 3 | `high` | Safe to teach from as it stands |
| 2 | `medium` | Worth a check before relying on it |
| 0–1 | `low` | A draft; verify before use |

**Rules of use**
- A device that fails Test 1 can never be `high`, because nothing outside the AI vouches for its definition.
- A description sourced only from Wikipedia (`definitions.md`, step 2, tier 2) fails Test 1, which lowers the label: at most `medium`. Naming in two lists does not rescue it, because those lists did not supply the wording. Record "Wikipedia only" for the device in `seed/confidence-scoring.md` and re-score it in the same change.
- A Flipside is rated on its own. Every Flipside label is coined for this app and appears in no source, so Flipsides fail Test 1 and top out at `medium`.
- Never leave a device unrated: an unscored device stays `low` (the schema default).
- When a device is edited (new definition, example or placement), re-score it in the same change and update `seed/confidence-scoring.md`.

Devices that fail Test 1 are listed in `seed/confidence-scoring.md` with the reason.

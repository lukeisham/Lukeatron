# Review ledger (agent only)

How the `device_review` table is kept.

`device_review` (one row per device: `definition_reviewed`, `ai_example_reviewed`, `quote_changes`) is the agent's private review ledger, defined in `schema.sql`. Nothing in the app reads it: `items.py` and `server.py` select named columns, it is not in `seed/devices.json`, and `tests/test_add_device_review.py` fails if the app code mentions it. The agent reads it straight from `rhetoric.db`.

- `definition_reviewed`: set to 1 when the device's definition has been read against `definitions.md` and the result recorded in `app-decisions.md`.
- `ai_example_reviewed`: set to 1 when the device's constructed example has been checked against `constructed-examples.md`.
- `quote_changes`: how many times a credited quote has been written for the device. A trigger adds 1 for every insert of, or edit to, a credited example (a delete adds 0, a date edit adds 0), so 1 is the original quote and more than 1 means it was replaced or edited. A constructed example never counts.
- Set the two flags by hand in the same change as the review's `app-decisions.md` row; the counter needs no help. When a definition is edited after review, set the flag back to 0 until it is re-checked.
- A device row is created by trigger. `python3 -m seed.add_device_review` back-fills an older database and is safe to run twice. A rebuild from scratch discards the table, like the Topical tables, so back the database up first.

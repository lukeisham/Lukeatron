# Grammar cartridge

Grammar-specific code only — nothing here is imported by another parser (plan D-3).
The shared chassis, the assembler, and the full rebuild recipe live in
`../../_shell/README.md`; this file only covers what's Grammar-specific.

## Contents
- `build/config.yaml` — cartridge manifest (name, cap, levels, colours, lexicon, spelling)
- `build/grammar_engine.js` — ENGINE.rules + ENGINE.CLOSED
- `build/grammar_explainer.js` — EXPLAINER.render + helpers
- `build/grammar_content.json` — compiled from `../Grammar_contents.md` (the editable source)
- `build/Grammar_lexicon.db` — the embedded 20k-word POS lexicon
- `build/build_lexicon.py` — rebuilds `Grammar_lexicon.db` from scratch (optional; the built
  `.db` is already the persistent artifact). Usage and source provenance are in the script's
  own header.

## Editing
- **Rules, content, or lexicon:** edit `../Grammar_contents.md`, `build/grammar_engine.js`, or
  `build/grammar_explainer.js` directly.
- **Rebuild the shipped widget** after any edit:
  ```bash
  python3 ../../_shell/build/assemble.py . ../Grammar_parser.html
  ```
  (run from `Grammar/cartridge/`; or see `_shell/README.md` for the path from repo root)

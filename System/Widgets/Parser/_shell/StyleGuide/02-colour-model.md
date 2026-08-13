# 2. The Colour Model

This is the most distinctive part of the system: how a parsed sentence gets
coloured. It's specified as **AD-7** in `Grammar/Specs/Done/GrammarParser.spec.md`
and generated as CSS by **AD-2** in `_shell/Specs/ParserShell.spec.md`. This
page translates both into one practical reference.

## The idea: structural kinship, not category colour

Colour does **not** mean "this is a noun" or "this is a verb." It means
**"this belongs to the same structural unit."** Each clause in the sentence
gets its own hue; everything nested inside that clause — its phrases, its
words — renders in shades and tints of the *same* hue. A word's colour is
stable across every focus level: "days" is amber because it's inside the
amber clause, at every zoom level, not because "days" is a noun.

Four channels, kept deliberately separate so they never collide:

| Channel | Carries | Example |
| :--- | :--- | :--- |
| **Hue** | Clause family | This clause is amber, that one is teal |
| **Shade within the hue** | Phrase within that clause | A darker/lighter amber for a phrase inside the amber clause |
| **Tint** | Individual word's family membership (at word focus) | The word renders in the same hue, lightly tinted |
| **Opacity / fade** | Focus-level distance | Levels not currently selected fade toward `--hf` |

**Confidence is not a colour channel.** A tentative tag (below
`parser.tentativeThreshold` in `config.yaml`) renders as a **dashed
underline** plus slightly reduced saturation — never a different shade —
because shade is already spoken for by structural nesting.

## The palette shape

Every cartridge declares 1+ hues in `config.yaml` under `colours.palette`.
Each hue is exactly five values:

| Key | Role |
| :--- | :--- |
| `h50` | Lightest tint — clause background at full intensity |
| `h100` | Phrase/word background at full intensity, and the colour-key chip background |
| `h600` | Mid-tone — labels, tentative-underline colour, colour-key chip text |
| `h800` | Darkest — text colour on `h50`/`h100` backgrounds (must stay legible) |
| `hf` | A translucent `rgba(...)` fade — the "not currently focused" version of this hue |

Grammar's shipped palette (`Grammar/cartridge/build/config.yaml`) — the
reference example every new cartridge should look at:

| Hue | h50 | h100 | h600 | h800 | hf |
| :--- | :--- | :--- | :--- | :--- | :--- |
| teal | `#E1F5EE` | `#9FE1CB` | `#0F6E56` | `#085041` | `rgba(29,158,117,.12)` |
| amber | `#FAEEDA` | `#FAC775` | `#854F0B` | `#633806` | `rgba(239,159,39,.12)` |
| purple | `#EEEDFE` | `#CECBF6` | `#534AB7` | `#3C3489` | `rgba(127,119,221,.12)` |
| pink | `#FBEAF0` | `#F4C0D1` | `#993556` | `#72243E` | `rgba(212,83,126,.12)` |
| coral | `#FAECE7` | `#F5C4B3` | `#993C1D` | `#4A1B0C` | `rgba(216,90,48,.12)` |
| blue | `#E6F1FB` | `#B5D4F4` | `#185FA5` | `#0C447C` | `rgba(55,138,221,.12)` |

Note blue's `h600` (`#185FA5`) is the *exact same value* as the chassis
`--acc` token. That's deliberate consistency, not a coincidence to
reproduce accidentally if you drop blue from a future palette — see
[01-foundations.md](01-foundations.md).

Swatches for all six, live: [`css/preview.html`](css/preview.html).

## Hue assignment: cyclic by clause index, not curated

`ui.js` picks a clause's hue with `pal[cx % pal.length]` — the clause's
index in parse order, modulo the palette length. There is no per-clause
semantic assignment (no "conditional clauses are always purple"). This
means:

- **Palette order matters less than palette count and distinctiveness.**
  Six hues means the 7th clause in a sentence repeats hue #1. For a
  cartridge whose input unit typically contains more than ~6 structural
  units (e.g. a full paragraph rather than one sentence — check
  `parser.inputUnit`/`parser.cap` in your `config.yaml`), consider more
  than six hues, or accept the repeat as visually acceptable at that
  distance.
- Every hue in the palette should be **mutually distinguishable** at a
  glance (including for common colour-vision deficiencies) — six
  same-lightness pastels that only differ in hue angle is the failure mode
  to avoid. Grammar's six vary in both hue *and* perceived lightness/
  chroma, which is why they work.

## How focus-level CSS gets generated (AD-2)

You do **not** hand-write `.v-<level>` CSS per cartridge. The assembler
(`generate_focus_css` in `_shell/build/assemble.py`) reads `parser.levels`
(ordered coarse → fine, length `n`) and assigns each of the three
render-kinds a fixed **home index** — the one level where it renders at
full intensity:

- **Clause home** = index `1` (or `0` if `n == 1`)
- **Phrase home** = index `2` (only exists if `n > 2`)
- **Word home** = the **last** index (`n − 1`)

Then, for each level `p`:

- **`p` is the clause home:** `.cl` full intensity
  (`background:var(--h50); color:var(--h800)`), `.lbl` shown, and
  `.cl.tentC` gets the dashed tentative underline.
- **`p == 0` and `p` is *not* the clause home** (only possible when
  `n > 1`, i.e. level 0 is coarser than the clause home): `.cl` renders
  faded (`var(--hf)`) with a distinguishing `3px solid var(--h600)` left
  border — a quiet "clause boundary" indicator for the view *before* any
  structural focus is selected.
- **Any other level** (not the clause home, not level 0): `.cl` is simply
  `background:var(--hf)` — faded, no border.
- **`p` is the phrase home:** `.ph` full intensity
  (`background:var(--h100); color:var(--h800)`), `.ph.tentP` dashed.
- **`p` is the word home:** `.w` full intensity, `.pos` (the word-class
  label) becomes visible, `.w.tentW` dashed.

A level can be more than one home at once when `n` is small — e.g. with
exactly two levels, the finer level is *both* the clause home and the word
home, so it renders both fully and no `.ph` rule is ever emitted (no
orphaned phrase CSS for a cartridge with no phrase-granularity level). This
fixed-index model reproduces Grammar's original four-level behaviour
byte-for-byte (Grammar is literally the `n=4` instance) — a cartridge with
two levels or six levels gets working default styling for free, with **zero
custom CSS required**. Only reach for `files.styles` if you need a visual
override this template genuinely can't express (rare — see
[05](05-building-a-cartridge.md)). A worked 4-level example, with the exact
generated CSS, is in [`css/preview.html`](css/preview.html).

## Picking a palette for a new cartridge

1. Start from Grammar's six hues if your domain has no reason to differ —
   consistency across widgets is worth more than a "branded" palette per
   parser.
2. If you do need a new hue, generate all five values (`h50/h100/h600/h800/hf`)
   together, keeping the same *relationship* between them: `h50`→`h100` is a
   light tint step, `h600`→`h800` is a dark contrast step, `hf` is `h600`'s
   RGB at ~12% alpha (match the `.12` alpha used throughout Grammar's
   palette unless you have a specific reason to differ).
3. Check `h800`-on-`h50`/`h100` for text contrast — these pairs render as
   actual body text at focus, not just background.
4. Palette length should roughly match how many structural units your
   `inputUnit`/`cap` combination typically produces — see "Hue assignment"
   above.

## The MiniWiki module reuses the shell tokens — no new palette

`_modules/MiniWiki/` (the optional per-cartridge "Mini-Wiki" tab, see
[03-components.md](03-components.md) and
[05-building-a-cartridge.md](05-building-a-cartridge.md)) introduces **zero**
new colours. Its own stylesheet, `_modules/MiniWiki/src/styles.js`'s
`MINIWIKI_CSS`, is written entirely against the shell's existing tokens:
`--bg`, `--card`, `--ink`, `--ink2`, `--ink3`, `--line`, `--line2`, `--acc`,
`--accbg`, `--radius`. Confirmed by reading the file — every colour
declaration in it is a `var(--...)` reference to one of those ten, plus
`#fff` used the same way `shell.css` already uses it (as literal white text
*on* an accent-filled surface — `.mw-copy-all` and `.mw-term-chip:hover`,
mirroring `button.primary`'s `color:#fff` on `background:var(--ink)`), never
as a new background colour of its own. `--red` (the one semantic colour,
reserved for spelling) is **not** used — MiniWiki has no error state.

This matters more than usual for MiniWiki specifically, because the wiki
opens in a **separate browser tab/document** (`_shell/src/miniwiki-seam.js`),
which cannot inherit the parser tab's `<style>` block. The seam re-declares
the same ten token values verbatim in a small `:root{...}` string
(`ROOT_TOKENS_CSS`) before injecting `MINIWIKI_CSS` into the new document —
so if you ever change a token value in `shell.css`, **update
`miniwiki-seam.js`'s `ROOT_TOKENS_CSS` to match**, or the wiki tab and the
parser tab will silently drift apart in colour. `--red` is correctly absent
from `ROOT_TOKENS_CSS` too, for the same "no error state" reason.

If a future edit to `src/styles.js` ever hardcodes a colour that isn't one
of the ten tokens above (or the `#fff`-on-accent convention already
established by the shell), that is a CSS-2 violation and should be raised
with Luke rather than silently accepted as "the module's own palette" — the
whole point of the reuse is that MiniWiki reads as the same system as the
rest of the widget, not a themed panel bolted onto it.

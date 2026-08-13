# 5. Building a Cartridge's Visuals

Practical checklist for the visual side of cloning a new parser (Rhetoric,
Logic, Style, …) from Grammar's cartridge, per `_shell/README.md`'s
"Cloning a new parser" recipe. Covers only what this style guide adds on
top of that recipe.

## What you set — `colours.palette` in `config.yaml`

This is the one required visual decision every cartridge makes. See
[02-colour-model.md](02-colour-model.md) for the full model; mechanically:

```yaml
colours:
  palette:
    - name: teal
      h50: "#E1F5EE"
      h100: "#9FE1CB"
      h600: "#0F6E56"
      h800: "#085041"
      hf: "rgba(29,158,117,.12)"
    # ...1 or more hues
```

The assembler validates every field is present per hue (`GeneratorShell.spec.md`
§8) and exits non-zero, naming the missing field, if you skip one — you
cannot ship a cartridge with a partial hue.

**Default choice: reuse Grammar's six hues.** Only design a new palette if
your domain genuinely needs a different hue count (see "Hue assignment" in
[02](02-colour-model.md)) — a "branded" palette per parser trades away the
one thing that currently makes all thirteen widgets feel like one system.

## What you almost never set — `files.styles`

The assembler **generates** the focus-level CSS from `parser.levels`
(AD-2) — this covers `.v-<level>` rules for `.cl`/`.ph`/`.w` and their
tentative variants automatically, for any level count or naming. You do
**not** need `files.styles` just because your cartridge has different level
names or a different level count than Grammar's four.

Reach for `files.styles` only when you need a **genuine visual override**
the generated template can't express — e.g., a render-kind that doesn't fit
the coarse→fine nesting model (see `GeneratorShell.spec.md` OQ-1: "two
independent classification axes" is explicitly flagged as out of scope for
the generic template and needs a design conversation first, not a silent
CSS workaround).

If you do add `files.styles`:

1. It loads **after** the generated focus CSS, so it can override any
   selector without needing to know which cartridge it's overriding for
   (the assembler doesn't care — it just concatenates in order).
2. Start from [`css/patterns.css`](css/patterns.css) for the readable
   version of whatever base rule you're overriding, not from the minified
   `shell.css` — copy the pattern, then narrow your override to the
   specific selector/property you actually need to change. Don't restate
   rules you're not changing.
3. Use the tokens (`var(--ink)`, `var(--line)`, etc. — see
   [01-foundations.md](01-foundations.md)) rather than new hardcoded
   colours, so the override still tracks the shell's palette if it changes.
4. Preview your override by opening the assembled widget directly — there
   is currently no way to preview a `files.styles` override against
   `css/preview.html` without wiring it into a real build, since the
   preview page links the shell's base CSS only.

## What you never touch

- `_shell/src/*` — per D-3, editing the shared chassis for one cartridge's
  needs is a shell bug, not a cartridge quirk. If the shell genuinely needs
  to change (a bug, a missing generic capability), that's a shell-level
  change reviewed on its own, not smuggled in via one cartridge's build.
- The `.badge` glyph, the overall page layout (`.wrap`/`.card`), and the
  three floating-overlay patterns (`#tip`/`#ctx`/`#spelling-suggestions`) —
  these are shell identity, not per-cartridge surface.
- `--acc` / `--accbg` — the one shared accent colour. A cartridge's
  structural palette (its clause hues) is a separate system from the
  interactive-accent system; don't repurpose `--acc` to mean "this
  cartridge's brand colour."

## Opting into MiniWiki — `miniwiki` in `config.yaml`

The Mini-Wiki tab (see [03-components.md](03-components.md#miniwiki-opens-in-a-new-browser-tab-not-this-pages-chrome)
and [04-states-and-interaction.md](04-states-and-interaction.md#miniwiki-states-and-interaction))
is, like the spelling module, an optional peer module the shell wires in —
never shell code, never a required feature. **Default OFF.** A cartridge
that omits the `miniwiki` block from its `config.yaml` entirely assembles
**byte-identically** to one that was never touched (confirmed in
`_shell/build/assemble.py`: `miniwiki_bundle_src_js` stays the JS literal
`""` and `miniwiki_enabled` stays `false`, so `#btnMiniWiki` never becomes
visible and no MiniWiki bytes are embedded).

```yaml
miniwiki:
  enabled: true                          # default OFF — this is the opt-in
  articlesFile: "logic.miniwiki.json"    # required if enabled — path relative to build/
  cartridgeName: "Logic Mini-Wiki"       # optional, default cartridge.name
```

**Two build steps happen before `assemble.py`, not inside it:**

1. Extract the cartridge's outline-numbered content into the article JSON
   `assemble.py` embeds:
   ```bash
   python3 _modules/MiniWiki/build/extract_articles.py <Cartridge>_content.md \
     --out build/<name>.miniwiki.json --cartridge-id <id>
   ```
2. Build (or rebuild, after any `_modules/MiniWiki/src/*.js` edit) the
   module's own bundle — a separate artefact from the extracted JSON:
   ```bash
   python3 _modules/MiniWiki/build/bundle_miniwiki.py     # writes dist/miniwiki.bundle.js
   ```

`assemble.py` then reads both: `miniwiki.articlesFile` (validated as JSON,
fails loudly and non-zero if missing or malformed — PY-6) and the shared
`dist/miniwiki.bundle.js` (fails loudly if `miniwiki.enabled: true` but the
bundle hasn't been built yet). Neither step is optional if `miniwiki.
enabled: true` — see `_modules/MiniWiki/README.md` for the full pipeline
(the five content-model decisions, both supported content dialects, and the
"never fabricate a citation" MLA-references rule).

**What you never do for MiniWiki specifically:** hand-write any of its
CSS. `_modules/MiniWiki/src/styles.js`'s `MINIWIKI_CSS` is the one and only
source of MiniWiki's styling (injected by the module's own `mount()`,
independent of `files.styles`) — a cartridge cannot and should not target
`.mw-*` selectors from its own `files.styles`, since that CSS never reaches
the separate tab the wiki opens in.

## Before shipping — checklist

- [ ] `colours.palette` has every hue's five values, validated by a
      successful `assemble.py` run (it fails loudly if not — §8's checklist).
- [ ] Palette hues are mutually distinguishable at a glance (see
      [02](02-colour-model.md) — this is a human judgement call the
      assembler can't check for you).
- [ ] If `files.styles` exists, every rule in it is a genuine override, not
      a restatement of something the generated CSS or `shell.css` already
      provides.
- [ ] Open the assembled `.html` directly and check the stage rendering,
      colour key, and every focus level look right for your actual content
      — `css/preview.html` shows the shell in isolation, not your
      cartridge's real output.

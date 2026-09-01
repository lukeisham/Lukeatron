# Curriculum Ingest

Paste your curriculum text here, then run the unit and import it.

Use **one** of the two options below — whichever matches how your curriculum
comes out when you copy it. Leave the other one empty.

Paste **inside the grey fenced blocks**, between the ``` lines. That keeps your
indentation and spacing exactly as copied, which helps the importer work out
the structure.

Don't tidy anything up. Leave odd line breaks, stray headings and duplicated
whitespace alone — the importer copes with mess, and "fixing" the text by hand
can remove the very clues it uses.

---

## Option A — Plain dump

Everything in one go. Best when you've selected a whole page or PDF section and
just want to paste it. The importer works out the structure itself and flags
anything it wasn't sure about.

```text

```

---

## Option B — Sorted

Paste each part under its own heading. Best when you're copying a few separate
pieces, or when Option A guessed the structure wrong and you'd rather be
explicit. Any section you leave empty is simply skipped.

### Description

Overview or achievement-standard prose — the paragraphs describing what
students should know and be able to do by the end of the level. This is
reference material, not a checklist. It goes on the unit's resources page.

```text

```

### Knowledge

The content the unit covers — what students learn *about*.

```text

```

### Skills

What students learn to *do* — the capabilities, processes and techniques.

```text

```

---

## Notes

- **Use Option A or Option B, not both.** If both hold text, Option B wins,
  because you've said explicitly where things belong.
- **Codes are kept exactly as written.** Whatever identifier your curriculum
  uses is preserved character for character and is how re-imports match up.
- **Re-importing is safe.** Paste an updated version and import again — your
  own edits are kept, and only untouched items are refreshed.
- **Gaps get flagged, not filled.** If the importer spots a code missing from a
  run it will ask whether you meant to leave it out. It never invents content.

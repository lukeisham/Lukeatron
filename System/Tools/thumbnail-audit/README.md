# Thumbnail Audit — the standing "quick check"

A tiny **read-only** utility that sweeps every `.md` under `Memory/` for image
references and confirms each one resolves to a file that exists. It is the quick
check named in `Memory/Long-Term/Lukeatron/thumbnail-conventions.md` — run it after
relocating images, moving the vault, or any bulk edit that touches image paths.

## What it checks

Three reference kinds, in every `Memory/**/*.md`:

- markdown images / image-links — `![alt](src)` and `[txt](src.ext)`
- HTML image tags — `<img ... src="...">`
- frontmatter `thumbnail:` keys (wiki-node infobox images)

Each reference is resolved against **both** renderers' rules and passes if it
resolves under either (see the conventions note for the full rules):

1. a plain markdown preview — absolute path, or relative to the `.md` file;
2. the LukeatronWiki viewer's `/img?p=` route — relative to the wiki dir, or
   absolute; fenced to the `_Lukeatron` root.

External (`http(s)://`, `data:`) references are skipped. It never writes.

## Run it

```
python3 audit.py
```

Runs from anywhere — it locates the `_Lukeatron` root from its own path.

| Exit code | Meaning |
| :--- | :--- |
| `0` | all references resolve |
| `1` | one or more broken (or a file couldn't be read) — details printed |
| `2` | `Memory/` not found (set `LUKEATRON_ROOT` if the vault lives elsewhere) |

## Requirements

Python 3 standard library only — no dependencies.

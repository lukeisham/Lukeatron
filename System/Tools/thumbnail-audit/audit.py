#!/usr/bin/env python3
"""
Thumbnail & Image Reference Audit — the standing "quick check"
==============================================================
Sweeps every `.md` under `Memory/` for image references and confirms each one
resolves to a file that exists. Covers three reference kinds:

  • markdown images / image-links   ![alt](src)  and  [txt](src.ext)
  • HTML image tags                 <img ... src="...">
  • frontmatter thumbnail: keys     (wiki-node infobox images)

Each reference is resolved against BOTH renderers' rules (see
Memory/Long-Term/Lukeatron/thumbnail-conventions.md):
  1. a plain markdown preview — absolute path, or relative to the .md file;
  2. the LukeatronWiki viewer's /img?p= route — relative to the wiki dir, or
     absolute; fenced to the _Lukeatron root.
A reference counts as OK if it resolves under EITHER rule.

Read-only: this tool reports, it never writes.

Run:   python3 audit.py            (from anywhere)
Exit:  0 = all references resolve · 1 = one or more broken · 2 = Memory/ missing
Env:   LUKEATRON_ROOT   override the _Lukeatron root (default: derived from this
                        file's location — System/Tools/thumbnail-audit/ → parents[3]).
"""
import os
import re
import sys
from pathlib import Path

# System/Tools/thumbnail-audit/audit.py  →  _Lukeatron is parents[3]
ROOT = Path(os.environ.get("LUKEATRON_ROOT", Path(__file__).resolve().parents[3]))
MEM = ROOT / "Memory"
WIKI = MEM / "Long-Term" / "LukeatronWiki"
IMG_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}

# markdown image  ![alt](src)  and plain link to an image  [txt](src.ext)
MD_LINK = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
# HTML  <img ... src="...">
HTML_IMG = re.compile(r'<img[^>]*\ssrc=["\']([^"\']+)["\']', re.IGNORECASE)
# frontmatter thumbnail: value (quoted or bare) — MULTILINE so ^/$ match per line
THUMB = re.compile(r'^\s*thumbnail:\s*["\']?([^"\'\n]+?)["\']?\s*$', re.MULTILINE)


def is_img(s):
    return Path(s.split("#")[0].split("?")[0].strip()).suffix.lower() in IMG_EXT


def resolve(ref, mdfile):
    """Return candidate absolute paths a renderer might use for `ref`, or None
    if the reference is external (http/data) and out of scope."""
    ref = ref.strip()
    if ref.startswith(("http://", "https://", "data:")):
        return None
    if ref.startswith(("/img?p=", "img?p=")):
        p = ref.split("p=", 1)[1]
        p = p.split("#")[0]
        cands = [WIKI / p, Path(p)]
    else:
        ref = ref.split("#")[0].split("?")[0]
        if ref.startswith("/"):
            cands = [Path(ref)]                 # absolute filesystem path
        else:
            cands = [mdfile.parent / ref,       # relative to the .md file
                     WIKI / ref]                # relative to the wiki dir (viewer)
    out = []
    for c in cands:
        try:
            out.append(c.resolve())
        except Exception:
            pass
    return out


def main():
    if not MEM.is_dir():
        print(f"⚠  Memory/ not found at {MEM}")
        print("   Set LUKEATRON_ROOT if the vault lives elsewhere.")
        return 2

    findings = []          # (mdfile, kind, ref)
    read_errors = []       # (mdfile, err)
    total_refs = 0
    md_files = sorted(MEM.rglob("*.md"))

    for md in md_files:
        try:
            text = md.read_text(encoding="utf-8")
        except Exception as e:
            read_errors.append((md, str(e)))
            continue

        checks = []
        for m in THUMB.finditer(text):
            val = m.group(1).strip()
            if val and val not in ("''", '""'):
                checks.append(("thumbnail:", val))
        for m in MD_LINK.finditer(text):
            src = m.group(1).strip()
            if is_img(src):
                checks.append(("md-image", src))
        for m in HTML_IMG.finditer(text):
            checks.append(("html-img", m.group(1).strip()))

        for kind, ref in checks:
            cands = resolve(ref, md)
            if cands is None:
                continue                        # external — skip
            total_refs += 1
            if not any(c.exists() for c in cands):
                findings.append((md, kind, ref))

    print(f"Scanned {len(md_files)} .md files under Memory/; "
          f"{total_refs} image references checked.")

    if read_errors:
        print(f"\n⚠  {len(read_errors)} file(s) could not be read:")
        for md, err in read_errors:
            print(f"   {md.relative_to(ROOT)} :: {err}")

    if not findings:
        print("\n✅ No broken image references found.")
        return 1 if read_errors else 0

    print(f"\n❌ {len(findings)} broken image reference(s):")
    for md, kind, ref in findings:
        print(f"  [{kind}] {md.relative_to(ROOT)}")
        print(f"        → {ref}")
    return 1


if __name__ == "__main__":
    sys.exit(main())

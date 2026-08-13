#!/usr/bin/env python3
"""Assemble a single parser widget HTML file from a shell + a cartridge.

Replaces the 13 near-identical build_parser.py clones (SR-4; vibe-coding-
rules.md names them as its standing example). One shell (this folder's
sibling ``src/``) is shared by every cartridge; a cartridge supplies
CONFIG/CONTENT/ENGINE/EXPLAINER per ParserShell.spec.md's contract.

Provenance (FR-21, carried over from Grammar/build/build_parser.py):
  * sql.js 1.13.0 (sql-wasm.js + sql-wasm.wasm) — SQLite compiled to WASM.
    Licence: MIT (sql.js) / SQLite is public domain. Originally retrieved
    2026-07-05 from cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/; this
    shell vendors one shared copy at _shell/build/vendor/ (extracted from
    the shipped Grammar_parser.html, since no separate source file existed
    on disk — see _shell/README.md) rather than embedding it per cartridge.
  * A cartridge's lexicon .db carries its own provenance in its own
    build script's header (e.g. Grammar/build/build_lexicon.py).

Usage:
  python3 assemble.py <cartridge_dir> [output.html]

Cartridge folder contract (ParserShell.spec.md §8):
  <cartridge_dir>/build/config.yaml      required — manifest
  <cartridge_dir>/build/<engine>.js      required — path from files.engine
  <cartridge_dir>/build/<explainer>.js   required — path from files.explainer
  <cartridge_dir>/build/<styles>.css     optional — path from files.styles
  <cartridge_dir>/build/<content>.json   optional — path from files.content
                                          (a *.md path here compiles via
                                          compile_content_markdown(); see
                                          its docstring for the format and
                                          its known limitations)
  <cartridge_dir>/build/<lexicon>.db     optional — path from lexicon.dbFile

Every failure below is named and non-zero-exit (PY-6) — no output file is
written on a failed validation (FR-16).
"""
from __future__ import annotations

import argparse
import base64
import datetime
import json
import re
import sqlite3
import sys
from pathlib import Path

import miniyaml

SHELL_DIR = Path(__file__).resolve().parents[1] / "src"
VENDOR_DIR = Path(__file__).resolve().parent / "vendor"
SPELLING_DIR = Path(__file__).resolve().parents[2] / "_modules" / "Spelling"
SPELLING_BUNDLE = SPELLING_DIR / "dist" / "spelling.bundle.js"
SPELLING_DB_GZ = SPELLING_DIR / "data" / "spelling.db.gz"
MINIWIKI_DIR = Path(__file__).resolve().parents[2] / "_modules" / "MiniWiki"
MINIWIKI_BUNDLE = MINIWIKI_DIR / "dist" / "miniwiki.bundle.js"
# Required footer attribution (_research/DECISION-dictionary-source.md,
# verbatim from the release's own Copyright file) — every cartridge that
# ships with spelling.enabled: true must show this string, not a
# per-cartridge restatement of it (AD-6/AC-8). The trailing URL is wrapped
# in [label](url) markdown-link syntax — _shell/src/ui.js's
# renderAttribution() turns that into a real target=_blank anchor — but the
# visible text is unchanged, character for character, from the verbatim
# string this constant has always held.
SPELLING_ATTRIBUTION = (
    "Spelling dictionary: SCOWL 2020.12.07 © 2000–2018 Kevin Atkinson "
    "— permissive licence. [http://wordlist.aspell.net/](http://wordlist.aspell.net/)"
)

REQUIRED_ENGINE_KEYS = {"parse", "tokenize", "CLOSED"}
REQUIRED_EXPLAINER_KEYS = {
    "tables", "rules", "toMarkdown", "toText",
    "funcOf", "phraseOf", "clauseOf", "posShort", "needSpace",
}
PLACEHOLDER_RE = re.compile(r"__[A-Z_]+__")
RETURN_OBJECT_RE = re.compile(r"return\s*\{([^{}]*)\}")


class CartridgeError(Exception):
    """Raised for any validation failure; message is the whole story (PY-6)."""


def main() -> None:
    parser = argparse.ArgumentParser(description="Assemble a cartridge into one offline parser widget HTML file.")
    parser.add_argument("cartridge_dir", type=Path, help="Cartridge folder (must contain build/config.yaml)")
    parser.add_argument("output", nargs="?", type=Path, default=None, help="Output HTML path")
    args = parser.parse_args()

    try:
        out_path = assemble(args.cartridge_dir.resolve(), args.output)
    except CartridgeError as exc:
        sys.exit(f"assemble.py: {exc}")

    size_mb = out_path.stat().st_size / 1_048_576
    print(f"wrote {out_path}: {size_mb:.2f} MB")


def assemble(cartridge_dir: Path, output: Path | None) -> Path:
    build_dir = cartridge_dir / "build"
    config_path = build_dir / "config.yaml"
    if not config_path.exists():
        raise CartridgeError(f"config.yaml not found: {config_path}")

    config = miniyaml.load_file(config_path)
    validate_manifest(config)

    cartridge_id = config["cartridge"]["id"]
    out_path = output if output else cartridge_dir / f"{cartridge_id}_parser.html"

    shell_html = _read(SHELL_DIR / "shell.html")
    shell_css = _read(SHELL_DIR / "shell.css")
    lexicon_js = _read(SHELL_DIR / "lexicon.js")
    ui_js = _read(SHELL_DIR / "ui.js")
    spelling_seam_js = _read(SHELL_DIR / "spelling-seam.js")
    miniwiki_seam_js = _read(SHELL_DIR / "miniwiki-seam.js")

    engine_path = build_dir / config["files"]["engine"]
    explainer_path = build_dir / config["files"]["explainer"]
    engine_js = _read_required(engine_path, "ENGINE file")
    explainer_js = _read_required(explainer_path, "EXPLAINER file")
    validate_module_exports(engine_js, "ENGINE", REQUIRED_ENGINE_KEYS)
    validate_module_exports(explainer_js, "EXPLAINER", REQUIRED_EXPLAINER_KEYS)

    content = compile_content(build_dir, config.get("files", {}).get("content"))

    lexicon_cfg = config.get("lexicon") or {}
    spelling_cfg = config.get("spelling") or {}
    spelling_enabled = bool(spelling_cfg.get("enabled", False))

    # sql.js is needed if EITHER the cartridge lexicon OR the central spelling
    # dictionary is embedded — both are sql.js-backed SQLite .db payloads
    # (ParserShell.spec.md FR-7 / SpellingModule.spec.md FR-3's
    # createSqlJsBackend), and the shell only vendors one shared copy.
    need_sqljs = bool(lexicon_cfg.get("enabled")) or spelling_enabled
    wasm_b64, sqljs_js = load_sqljs_vendor() if need_sqljs else ("", "")
    db_b64 = embed_lexicon_db(build_dir, lexicon_cfg) if lexicon_cfg.get("enabled") else ""
    spelldb_b64 = embed_spelling_db() if spelling_enabled else ""

    focus_css = generate_focus_css(config["parser"]["levels"], config["colours"]["palette"])

    styles_file = config.get("files", {}).get("styles")
    cartridge_css = _read(build_dir / styles_file) if styles_file else ""

    # D-1/FR-11: the spelling module is a peer module the shell wires in, not
    # shell code. spelling.enabled:true is what makes the assembler embed the
    # module's bundle + dictionary — the OLD ad-hoc edit-distance-1 checker
    # this replaces never existed in _shell/src/ui.js (that duplication was
    # only ever in the pre-shell Grammar/build/template.html monolith, which
    # this build never reads from), so there is nothing to strip here beyond
    # not shipping a bundle at all when spelling.enabled is false/absent.
    if spelling_enabled:
        if not SPELLING_BUNDLE.exists():
            raise CartridgeError(
                f"spelling.enabled is true but the spelling module bundle is missing: "
                f"{SPELLING_BUNDLE} (run python3 _modules/Spelling/build/bundle_spelling.py first)"
            )
        spelling_js = _read(SPELLING_BUNDLE) + "\n" + spelling_seam_js
    else:
        spelling_js = spelling_seam_js

    # MiniWiki (decision 5 / requirement C): DEFAULT OFF — a cartridge opts
    # in via miniwiki.enabled: true + miniwiki.articlesFile pointing at a
    # build/*.miniwiki.json produced by _modules/MiniWiki/build/extract_articles.py.
    # Grammar and every other cartridge that omits this block is byte-for-byte
    # unaffected: miniwiki_bundle_src_js stays "" and the bundle is never read.
    #
    # Per Luke's correction, the wiki opens in a NEW TAB as its own complete
    # document (miniwiki-seam.js's open()) rather than mounting into this
    # page's DOM — so the bundle is embedded here as a JS STRING CONSTANT
    # (MINIWIKI_BUNDLE_SRC), not executed in the parser page's own window.
    # window.open() creates a separate realm; a function/closure can't be
    # handed across that boundary, only source text can.
    miniwiki_cfg = config.get("miniwiki") or {}
    miniwiki_enabled = bool(miniwiki_cfg.get("enabled", False))
    miniwiki_articles_json = "[]"
    miniwiki_cartridge_name = json.dumps(miniwiki_cfg.get("cartridgeName", config["cartridge"]["name"]))
    miniwiki_bundle_src_js = '""'
    if miniwiki_enabled:
        if not MINIWIKI_BUNDLE.exists():
            raise CartridgeError(
                f"miniwiki.enabled is true but the miniwiki module bundle is missing: "
                f"{MINIWIKI_BUNDLE} (run python3 _modules/MiniWiki/build/bundle_miniwiki.py first)"
            )
        miniwiki_articles_json = embed_miniwiki_articles(build_dir, miniwiki_cfg)
        bundle_text = _read(MINIWIKI_BUNDLE)
        # Defensive, matching load_sqljs_vendor()'s identical escape: a raw
        # "</script" inside this JS-string constant would still close the
        # <script> tag early — the HTML parser doesn't know it's inside a
        # string literal. The bundle has none today (grep-verified), but a
        # future source edit could introduce one.
        if "</script" in bundle_text.lower():
            bundle_text = re.sub(r"</script", "<\\/script", bundle_text, flags=re.IGNORECASE)
        miniwiki_bundle_src_js = json.dumps(bundle_text)
    miniwiki_js = f"var MINIWIKI_BUNDLE_SRC = {miniwiki_bundle_src_js};\n" + miniwiki_seam_js

    config_js = build_config_js(config)
    build_date = datetime.date.today().isoformat()

    default_icon = (
        "data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 30 30\">"
        "<rect width=\"30\" height=\"30\" rx=\"7\" fill=\"%231a1a17\"/>"
        "<text x=\"15\" y=\"20\" text-anchor=\"middle\" font-family=\"Georgia,serif\" "
        "font-size=\"16\" font-weight=\"bold\" fill=\"%23faf9f5\">P</text></svg>"
    )
    icon_href = config["cartridge"].get("icon") or default_icon

    substitutions = {
        "__ASSET_NAME__": config["cartridge"]["name"],
        "__ASSET_VERSION__": config["cartridge"]["version"],
        "__BUILT_FROM__": config["cartridge"]["builtFrom"],
        # In-page header badge (distinct from __ICON_HREF__, the browser-tab
        # favicon) — first letter of cartridge.id, uppercased, so a
        # cartridge's badge matches its own identity without a second
        # manifest field to keep in sync with `icon`'s SVG glyph by hand.
        "__BADGE_GLYPH__": (config["cartridge"]["id"][:1] or "P").upper(),
        "__CAP__": str(config["parser"]["cap"]),
        "__INPUT_UNIT__": config["parser"]["inputUnit"],
        "__BUILD_DATE__": build_date,
        "__ICON_HREF__": icon_href,
        "__SHELL_CSS__": shell_css,
        "__FOCUS_CSS__": focus_css,
        "__CARTRIDGE_CSS__": cartridge_css,
        "__CONFIG__": config_js,
        "__CONTENT__": json.dumps(content, ensure_ascii=False),
        "__WASM_B64__": wasm_b64,
        "__DB_B64__": db_b64,
        "__SPELLDB_B64__": spelldb_b64,
        "__SQLJS__": sqljs_js,
        "__LEXICON_JS__": lexicon_js,
        "__ENGINE_JS__": engine_js,
        "__EXPLAINER_JS__": explainer_js,
        "__SPELLING_SEAM_JS__": spelling_js,
        "__MINIWIKI_JS__": miniwiki_js,
        "__MINIWIKI_ARTICLES__": miniwiki_articles_json,
        "__MINIWIKI_CARTRIDGE_NAME__": miniwiki_cartridge_name,
        "__UI_JS__": ui_js,
    }

    out_html = shell_html
    for placeholder, value in substitutions.items():
        if placeholder not in out_html:
            raise CartridgeError(f"shell.html is missing placeholder {placeholder}")
        out_html = out_html.replace(placeholder, value)

    leftover = PLACEHOLDER_RE.findall(out_html)
    if leftover:
        raise CartridgeError(f"unreplaced placeholders survived into output: {sorted(set(leftover))}")

    floor = len(shell_html) + len(shell_css) + len(ui_js)
    if len(out_html) <= floor:
        raise CartridgeError(
            f"output ({len(out_html)} bytes) is not larger than the shell skeleton alone "
            f"({floor} bytes) — treated as a build failure (§8 sanity floor)"
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(out_html, encoding="utf-8")
    return out_path


# ---------------------------------------------------------------- manifest


def validate_manifest(config: dict) -> None:
    missing: list[str] = []

    def require(path: str, predicate=lambda v: v is not None) -> None:
        node = config
        for part in path.split("."):
            if not isinstance(node, dict) or part not in node:
                missing.append(path)
                return
            node = node[part]
        if not predicate(node):
            missing.append(path)

    require("cartridge.name")
    require("cartridge.id")
    require("cartridge.version")
    require("cartridge.builtFrom")
    require("parser.inputUnit")
    require("parser.cap", lambda v: isinstance(v, int) and v > 0)
    require("parser.levels", lambda v: isinstance(v, list) and len(v) >= 1)
    require("parser.tentativeThreshold", lambda v: isinstance(v, (int, float)) and 0 <= v <= 1)
    require("colours.palette", lambda v: isinstance(v, list) and len(v) >= 1)
    require("files.engine")
    require("files.explainer")

    if missing:
        raise CartridgeError("config.yaml missing/invalid required field(s): " + ", ".join(missing))

    # FR-19: sweeps.items is required together with sweeps.enabled: true —
    # absent/false by default, same contract miniwiki.enabled already uses.
    sweeps_cfg = config.get("sweeps") or {}
    if sweeps_cfg.get("enabled") and not sweeps_cfg.get("items"):
        raise CartridgeError("sweeps.enabled is true but sweeps.items is missing/empty")

    for i, hue in enumerate(config["colours"]["palette"]):
        for field in ("h50", "h100", "h600", "h800", "hf", "name"):
            if field not in hue:
                raise CartridgeError(f"colours.palette[{i}] missing field '{field}'")


def build_config_js(config: dict) -> str:
    c, p = config["cartridge"], config["parser"]
    lexicon_cfg = config.get("lexicon") or {}
    spelling_cfg = config.get("spelling") or {}
    spelling_enabled = bool(spelling_cfg.get("enabled", False))
    miniwiki_cfg = config.get("miniwiki") or {}
    tier_b_note = (config.get("tierB") or {}).get(
        "note", "Tier B (API/agent) slot present but disabled in this build."
    )
    obj = {
        "name": c["name"],
        "version": c["version"],
        "builtFrom": c["builtFrom"],
        "inputUnit": p["inputUnit"],
        "cap": p["cap"],
        "levels": list(p["levels"]),
        "clausePalette": [
            {k: hue[k] for k in ("h50", "h100", "h600", "h800", "hf", "name")}
            for hue in config["colours"]["palette"]
        ],
        "tentativeThreshold": p["tentativeThreshold"],
        # FR-2: tierB.enabled MUST be false in this build — the assembler
        # enforces that by construction, never trusting a manifest value.
        "tierB": {"enabled": False, "note": tier_b_note},
        "lexicon": {
            "enabled": bool(lexicon_cfg.get("enabled", False)),
            "attribution": lexicon_cfg.get("attribution", ""),
        },
        # AC-8/AD-6: attribution is sourced from the module's own metadata
        # (SPELLING_ATTRIBUTION, this file's constant, quoting the SCOWL
        # release's own Copyright file) — never a per-cartridge restatement.
        "spelling": {
            "enabled": spelling_enabled,
            "attribution": SPELLING_ATTRIBUTION if spelling_enabled else "",
        },
        "miniwiki": {
            "enabled": bool(miniwiki_cfg.get("enabled", False)),
        },
    }
    if p.get("focusLabels"):
        obj["focusLabels"] = p["focusLabels"]
    # FR-19/FR-20: sweeps is optional and cartridge-defined; passed through
    # verbatim (the shell only reads item fields to render checkboxes — it
    # never interprets CONTENT ids or sweep semantics itself, FR-9). Absent
    # for every cartridge that doesn't declare it, Grammar included.
    sweeps_cfg = config.get("sweeps") or {}
    if sweeps_cfg.get("enabled") and sweeps_cfg.get("items"):
        obj["sweeps"] = {"enabled": True, "items": sweeps_cfg["items"]}
    return json.dumps(obj, ensure_ascii=False)


# ------------------------------------------------------------------ files


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def _read_required(path: Path, what: str) -> str:
    if not path.exists():
        raise CartridgeError(f"{what} not found: {path}")
    return path.read_text(encoding="utf-8")


# --------------------------------------------------------- export checks


def validate_module_exports(js_text: str, var_name: str, required_keys: set[str]) -> None:
    if f"var {var_name} =" not in js_text and f"var {var_name}=" not in js_text:
        raise CartridgeError(f"{var_name} file has no 'var {var_name} = ' assignment")
    matches = RETURN_OBJECT_RE.findall(js_text)
    if not matches:
        raise CartridgeError(f"{var_name} file has no 'return {{...}}' export object")
    found_keys: set[str] = set()
    for body in matches[-1:]:
        for entry in body.split(","):
            key = entry.split(":", 1)[0].strip()
            if key:
                found_keys.add(key)
    missing = required_keys - found_keys
    if missing:
        raise CartridgeError(f"{var_name} is missing required export(s): {sorted(missing)}")


# ------------------------------------------------------------------ content


def compile_content(build_dir: Path, content_ref: str | None) -> dict:
    if not content_ref:
        return {}
    content_path = build_dir / content_ref
    if not content_path.exists():
        raise CartridgeError(f"files.content not found: {content_path}")
    if content_path.suffix == ".json":
        try:
            data = json.loads(content_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CartridgeError(f"files.content ({content_path.name}) is not valid JSON: {exc}") from exc
        if not isinstance(data, dict):
            raise CartridgeError(f"files.content ({content_path.name}) must compile to a JSON object")
        return data
    if content_path.suffix == ".md":
        return compile_content_markdown(content_path)
    raise CartridgeError(f"files.content has an unsupported extension: {content_path.suffix}")


def compile_content_markdown(md_path: Path) -> dict:
    """Best-effort compiler: outline-numbered entries -> CONTENT (FR-3).

    Recognises a line of the form ``<id> <Name>`` where <id> is a dotted
    outline number (``1.3``, ``4.1n``, ``5.3.1``) at the start of the line,
    followed by indented body text and an optional ``Example: "..."`` line.
    This is a genuine parser, not a stub — but it is a NEW addition for
    this migration (Grammar's own CONTENT ships as a pre-compiled JSON file
    instead, extracted verbatim from the accepted monolith, precisely so
    Grammar's migration fidelity does not depend on this compiler's
    correctness). Treat this path as unverified against a full 400+ entry
    real-world content file until a second cartridge exercises it.
    """
    entry_re = re.compile(r"^(\d+(?:\.\d+)*[a-z]?)\s+(.+)$")
    example_re = re.compile(r"^\s*Example:\s*(.+)$", re.IGNORECASE)
    content: dict = {}
    current_id = None
    lines = md_path.read_text(encoding="utf-8").splitlines()
    body_lines: list[str] = []

    def flush() -> None:
        if current_id is None:
            return
        text = " ".join(line.strip() for line in body_lines if line.strip())
        content[current_id]["d"] = text

    for line in lines:
        m = entry_re.match(line)
        if m:
            flush()
            current_id, name = m.group(1), m.group(2).strip()
            content[current_id] = {"n": name, "l": "", "d": ""}
            body_lines = []
            continue
        ex = example_re.match(line)
        if ex and current_id:
            content[current_id]["e"] = ex.group(1).strip()
            continue
        if current_id:
            body_lines.append(line)
    flush()

    if not content:
        raise CartridgeError(f"files.content ({md_path.name}) compiled to zero entries — check the outline format")
    return content


# ------------------------------------------------------------------ lexicon


def load_sqljs_vendor() -> tuple[str, str]:
    """Read the shared sql.js vendor files, needed whenever EITHER a
    cartridge lexicon OR the central spelling dictionary is embedded."""
    sqljs_path = VENDOR_DIR / "sql-wasm.js"
    wasm_path = VENDOR_DIR / "sql-wasm.wasm"
    if not sqljs_path.exists() or not wasm_path.exists():
        raise CartridgeError(
            f"a sql.js-backed .db is enabled but the shared sql.js vendor files are missing: "
            f"{sqljs_path}, {wasm_path} (see _shell/README.md)"
        )
    sqljs_js = sqljs_path.read_text(encoding="utf-8")
    if "</script" in sqljs_js.lower():
        sqljs_js = sqljs_js.replace("</script", "<\\/script")
    wasm_b64 = base64.b64encode(wasm_path.read_bytes()).decode("ascii")
    return wasm_b64, sqljs_js


def embed_lexicon_db(build_dir: Path, lexicon_cfg: dict) -> str:
    db_file = lexicon_cfg.get("dbFile")
    if not db_file:
        raise CartridgeError("lexicon.enabled is true but lexicon.dbFile is not set")
    db_path = build_dir / db_file
    if not db_path.exists():
        raise CartridgeError(f"lexicon.dbFile not found: {db_path}")

    schema = lexicon_cfg.get("schema", "")
    expected_columns = {c.strip() for c in schema.split(",") if c.strip()}
    if expected_columns:
        with sqlite3.connect(f"file:{db_path}?mode=ro", uri=True) as conn:
            try:
                cursor = conn.execute("PRAGMA table_info(lexicon)")
            except sqlite3.DatabaseError as exc:
                raise CartridgeError(f"lexicon.dbFile does not open as SQLite: {exc}") from exc
            actual_columns = {row[1] for row in cursor.fetchall()}
        if actual_columns != expected_columns:
            raise CartridgeError(
                f"lexicon.dbFile schema mismatch: manifest declares {sorted(expected_columns)}, "
                f"database has {sorted(actual_columns)}"
            )

    return base64.b64encode(db_path.read_bytes()).decode("ascii")


def embed_miniwiki_articles(build_dir: Path, miniwiki_cfg: dict) -> str:
    """Read a pre-built *.miniwiki.json (extract_articles.py's output — a
    dict keyed by article id) and re-serialise it as a JSON ARRAY, which is
    the shape MiniWikiModule.spec.md's createMiniWikiModule({articles})
    expects (decision 5: articles come from build-time JSON only, never
    hardcoded here or in JS)."""
    articles_file = miniwiki_cfg.get("articlesFile")
    if not articles_file:
        raise CartridgeError("miniwiki.enabled is true but miniwiki.articlesFile is not set")
    articles_path = build_dir / articles_file
    if not articles_path.exists():
        raise CartridgeError(
            f"miniwiki.articlesFile not found: {articles_path} "
            f"(run python3 _modules/MiniWiki/build/extract_articles.py first)"
        )
    try:
        data = json.loads(articles_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise CartridgeError(f"miniwiki.articlesFile ({articles_path.name}) is not valid JSON: {exc}") from exc
    articles = list(data.values()) if isinstance(data, dict) else data
    if not isinstance(articles, list):
        raise CartridgeError(f"miniwiki.articlesFile ({articles_path.name}) must be a JSON object or array")
    return json.dumps(articles, ensure_ascii=False)


def embed_spelling_db() -> str:
    """Embed the central spelling module's gzipped dictionary (FR-11, D-1).

    Unlike a cartridge lexicon, this .db is NOT per-cartridge — it lives at
    _modules/Spelling/data/spelling.db.gz, shared by every widget that opts
    in via spelling.enabled: true. Shipped pre-gzipped (build/build_spelling_db.py's
    write_gzipped_copy()) so the base64-inflated payload the browser downloads
    is ~2.06 MB rather than ~4.55 MB (measured, Spelling/README.md
    "Compression") — the shell decompresses it at runtime via
    SpellingBackend.decompressGzipBase64 (spelling-seam.js).
    """
    if not SPELLING_DB_GZ.exists():
        raise CartridgeError(
            f"spelling.enabled is true but the dictionary is missing: {SPELLING_DB_GZ} "
            f"(run python3 _modules/Spelling/build/build_spelling_db.py first)"
        )
    return base64.b64encode(SPELLING_DB_GZ.read_bytes()).decode("ascii")


# ------------------------------------------------------------- focus CSS


def generate_focus_css(levels: list[str], palette: list[dict]) -> str:
    """Generate #stage.v-<level> CSS from CONFIG.levels (D-6, AD-2).

    Fixed-home model: three render "kinds" — clause (.cl), phrase (.ph),
    word (.w) — each has one home level index that renders it at full
    intensity: clause at index 1, phrase at index 2, word at the LAST
    index. Level 0 (coarsest) always gets the faded "boundary" treatment
    for .cl instead of a home. This exact rule reproduces Grammar's
    current four-level CSS (template.html:40-50) byte-for-byte when
    levels has length 4 — verified by migration diff, not merely
    asserted. For levels shorter than 4 (e.g. AC-5's two-level synthetic
    cartridge) homes collapse: with only 2 levels, level 1 is both the
    clause home AND the last (word) home, so it renders both fully; no
    level ever gets a phrase home (index 2 doesn't exist), so no
    orphaned .ph rule is emitted. See ParserShell.spec.md AD-2/OQ-1 —
    this fixed-index reading is this build's resolution of an ambiguity
    the spec left explicitly open pending a second, differently-shaped
    cartridge.
    """
    n = len(levels)
    cl_home = 1 if n > 1 else 0
    ph_home = 2 if n > 2 else -1
    w_home = n - 1

    blocks = []
    for p, level in enumerate(levels):
        selector = f"#stage.v-{level}"
        rules = []
        if p == cl_home:
            rules.append(
                f"{selector} .cl{{background:var(--h50);color:var(--h800);}}\n"
                f"{selector} .lbl{{display:inline-block;background:var(--h100);color:var(--h800);}}\n"
                f"{selector} .cl.tentC{{border-bottom:2px dashed var(--h600);}}"
            )
        elif p == 0:
            rules.append(
                f"{selector} .cl{{background:var(--hf);border-left:3px solid var(--h600);"
                f"border-radius:0 4px 4px 0;padding-left:7px;margin-right:3px;}}"
            )
        else:
            rules.append(f"{selector} .cl{{background:var(--hf);}}")

        if p == ph_home:
            rules.append(
                f"{selector} .ph{{background:var(--h100);color:var(--h800);padding:1px 4px;}}\n"
                f"{selector} .ph.tentP{{border-bottom:2px dashed var(--h600);}}"
            )

        if p == w_home:
            rules.append(
                f"{selector} .w{{display:inline-block;background:var(--h100);color:var(--h800);"
                f"border-radius:4px;padding:1px 6px;margin:2px 1px;text-align:center;}}\n"
                f"{selector} .pos{{display:block;font-size:11px;color:var(--h600);font-weight:600;"
                f"line-height:1.2;padding-bottom:2px;}}\n"
                f"{selector} .w.tentW{{border-bottom:2px dashed var(--h600);}}"
            )
        blocks.append("\n".join(rules))
    return "\n".join(blocks)


if __name__ == "__main__":
    main()

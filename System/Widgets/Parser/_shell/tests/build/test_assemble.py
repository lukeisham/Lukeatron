#!/usr/bin/env python3
"""Smoke + gate tests for _shell/build/assemble.py (TEST-1/TEST-2/TEST-4/TEST-7).

Builds synthetic cartridges under tempfile.TemporaryDirectory() — never
touches Grammar/ or any real .db (TEST-4). unittest only (TEST-1).
"""
import re
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "build"))

import assemble  # noqa: E402

MIN_ENGINE = (
    "var ENGINE = (function(){\n"
    "function parse(text){return {meta:{asset:CONFIG.name,version:CONFIG.version,cap:CONFIG.cap,"
    "wordCount:0,overCap:false},tokens:[],spans:[],findings:[],"
    "summary:{classifications:[],counts:{}},_toks:[],_clauses:[]};}\n"
    "function tokenize(text){return [];}\n"
    "var CLOSED = {};\n"
    "return {parse:parse,tokenize:tokenize,CLOSED:CLOSED};\n"
    "})();\n"
)

MIN_EXPLAINER = (
    "var EXPLAINER = (function(){\n"
    "function tables(R){return '';}\n"
    "function rules(R){return '';}\n"
    "function toMarkdown(R){return '';}\n"
    "function toText(R){return '';}\n"
    "function funcOf(R,i){return '';}\n"
    "function phraseOf(R,i){return null;}\n"
    "function clauseOf(R,i){return null;}\n"
    "function posShort(t){return '';}\n"
    "function needSpace(a,b){return true;}\n"
    "return {tables:tables,rules:rules,toMarkdown:toMarkdown,toText:toText,funcOf:funcOf,"
    "phraseOf:phraseOf,clauseOf:clauseOf,posShort:posShort,needSpace:needSpace};\n"
    "})();\n"
)

MIN_CONFIG_YAML = """
cartridge:
  name: "Test parser"
  id: "Test"
  version: "1.0.0"
  builtFrom: "Test_contents.md"
parser:
  inputUnit: "one sentence"
  cap: 50
  levels:
    - macro
    - micro
  tentativeThreshold: 0.5
colours:
  palette:
    - name: teal
      h50: "#E1F5EE"
      h100: "#9FE1CB"
      h600: "#0F6E56"
      h800: "#085041"
      hf: "rgba(29,158,117,.12)"
files:
  engine: "engine.js"
  explainer: "explainer.js"
"""


def make_cartridge(root: Path, config_yaml: str = MIN_CONFIG_YAML,
                    engine: str = MIN_ENGINE, explainer: str = MIN_EXPLAINER) -> Path:
    build_dir = root / "build"
    build_dir.mkdir(parents=True)
    (build_dir / "config.yaml").write_text(config_yaml, encoding="utf-8")
    (build_dir / "engine.js").write_text(engine, encoding="utf-8")
    (build_dir / "explainer.js").write_text(explainer, encoding="utf-8")
    return root


class TestAssemble(unittest.TestCase):
    def test_imports_cleanly(self) -> None:
        # PY-3: import performs no I/O.
        self.assertTrue(hasattr(assemble, "assemble"))
        self.assertTrue(hasattr(assemble, "generate_focus_css"))

    def test_happy_path_produces_valid_html_with_no_placeholders(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cartridge = make_cartridge(Path(tmp) / "Test")
            out = assemble.assemble(cartridge, cartridge / "out.html")
            html = out.read_text(encoding="utf-8")
            self.assertIn("<title>Test parser</title>", html)
            self.assertIn("var CONFIG = ", html)
            self.assertIn("var ENGINE = ", html)
            self.assertIn("var EXPLAINER = ", html)
            # AC-3: no surviving placeholder pattern.
            self.assertEqual(re.findall(r"__[A-Z_]+__", html), [])

    def test_idempotent_rebuild_is_byte_identical(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cartridge = make_cartridge(Path(tmp) / "Test")
            out1 = assemble.assemble(cartridge, cartridge / "out1.html")
            out2 = assemble.assemble(cartridge, cartridge / "out2.html")
            self.assertEqual(out1.read_bytes(), out2.read_bytes())

    # ---- TEST-7 gate tests: the blocked path is genuinely blocked ----

    def test_missing_required_field_is_rejected_and_named(self) -> None:
        bad_yaml = MIN_CONFIG_YAML.replace("  cap: 50\n", "")
        with tempfile.TemporaryDirectory() as tmp:
            cartridge = make_cartridge(Path(tmp) / "Test", config_yaml=bad_yaml)
            with self.assertRaises(assemble.CartridgeError) as ctx:
                assemble.assemble(cartridge, cartridge / "out.html")
            self.assertIn("parser.cap", str(ctx.exception))
            self.assertFalse((cartridge / "out.html").exists())

    def test_engine_missing_export_is_rejected_and_named(self) -> None:
        bad_engine = MIN_ENGINE.replace("var CLOSED = {};\n", "").replace(
            "return {parse:parse,tokenize:tokenize,CLOSED:CLOSED};", "return {parse:parse,tokenize:tokenize};"
        )
        with tempfile.TemporaryDirectory() as tmp:
            cartridge = make_cartridge(Path(tmp) / "Test", engine=bad_engine)
            with self.assertRaises(assemble.CartridgeError) as ctx:
                assemble.assemble(cartridge, cartridge / "out.html")
            self.assertIn("CLOSED", str(ctx.exception))
            self.assertFalse((cartridge / "out.html").exists())

    def test_explainer_missing_needspace_is_rejected_and_named(self) -> None:
        bad_explainer = MIN_EXPLAINER.replace(",needSpace:needSpace", "")
        with tempfile.TemporaryDirectory() as tmp:
            cartridge = make_cartridge(Path(tmp) / "Test", explainer=bad_explainer)
            with self.assertRaises(assemble.CartridgeError) as ctx:
                assemble.assemble(cartridge, cartridge / "out.html")
            self.assertIn("needSpace", str(ctx.exception))

    # ---- TEST-7 gate tests: the permitted path passes through ----

    def test_valid_cartridge_passes_validation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cartridge = make_cartridge(Path(tmp) / "Test")
            out = assemble.assemble(cartridge, cartridge / "out.html")
            self.assertTrue(out.exists())

    # ---- Lexicon schema gate (TEST-4: in-memory-equivalent temp db, never the real .db) ----

    def test_lexicon_schema_mismatch_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cartridge = make_cartridge(Path(tmp) / "Test")
            db_path = cartridge / "build" / "lex.db"
            conn = sqlite3.connect(db_path)
            conn.execute("CREATE TABLE lexicon(word TEXT PRIMARY KEY, pos TEXT)")  # missing alt/feat/rank
            conn.commit()
            conn.close()
            yaml_with_lexicon = MIN_CONFIG_YAML + (
                "lexicon:\n  enabled: true\n  dbFile: \"lex.db\"\n"
                "  schema: \"word,pos,alt,feat,rank\"\n"
            )
            cartridge2 = make_cartridge(Path(tmp) / "Test2", config_yaml=yaml_with_lexicon)
            (cartridge2 / "build" / "lex.db").write_bytes(db_path.read_bytes())
            with self.assertRaises(assemble.CartridgeError) as ctx:
                assemble.assemble(cartridge2, cartridge2 / "out.html")
            self.assertIn("schema mismatch", str(ctx.exception))

    # ---- Focus-CSS generation (D-6 / AC-5) ----

    def test_focus_css_four_levels_matches_grammar_fixed_home_model(self) -> None:
        palette = [{"h50": "#a", "h100": "#b", "h600": "#c", "h800": "#d", "hf": "#e", "name": "x"}]
        css = assemble.generate_focus_css(["sentential", "clausal", "phrasal", "lexical"], palette)
        self.assertIn("#stage.v-sentential .cl{background:var(--hf);border-left", css)
        self.assertIn("#stage.v-clausal .cl{background:var(--h50);color:var(--h800);}", css)
        self.assertIn("#stage.v-phrasal .ph{background:var(--h100);color:var(--h800);padding:1px 4px;}", css)
        self.assertIn("#stage.v-lexical .w{display:inline-block", css)
        # No orphaned phrase rule at sentential/clausal/lexical.
        self.assertNotIn("v-sentential .ph", css)
        self.assertNotIn("v-clausal .ph", css)
        self.assertNotIn("v-lexical .ph", css)

    def test_focus_css_two_levels_has_no_phrase_rule(self) -> None:
        palette = [{"h50": "#a", "h100": "#b", "h600": "#c", "h800": "#d", "hf": "#e", "name": "x"}]
        css = assemble.generate_focus_css(["macro", "micro"], palette)
        self.assertNotIn(".ph{", css)  # AC-5: no orphaned Grammar-specific CSS
        self.assertIn("#stage.v-macro .cl{background:var(--hf);border-left", css)
        self.assertIn("#stage.v-micro .cl{background:var(--h50)", css)
        self.assertIn("#stage.v-micro .w{display:inline-block", css)


if __name__ == "__main__":
    unittest.main()

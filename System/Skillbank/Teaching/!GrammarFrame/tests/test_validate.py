"""Tests for validate.py: one conforming guide pair, then one break per check.

Run: python3 -m unittest discover -s tests   (from the !GrammarFrame folder)
"""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
import validate  # noqa: E402

VCAA = validate.VCAA
SOURCE = """# Noun phrase

A noun phrase is built around a noun.

## Determiners

Determiners come first in the noun phrase.
"""


def hashes():
    return [b["hash"] for b in validate.source_blocks(SOURCE)]


def guide(theatre, *, q2="Does it come before every adjective?", stub="#noun-phrase",
          rule_prose="The noun is the head; everything else hangs on it.", extra_body="",
          extra_head="", glossary=None, np_prose=None,
          np_axis='data-axis="form-function" data-axis-from="noun-phrase" data-axis-by="notes"',
          det_axis='data-axis="form-function" data-axis-from="noun-phrase" data-axis-by="notes"',
          det_inner=""):
    h_np, h_det = hashes()
    glyph = '<span class="gf-glyph">🎭</span> ' if theatre else ""
    vcaa = "" if theatre else f'<span class="gf-vcaa-label">(VCAA: <a class="gf-vcaa" href="{VCAA}">noun</a>)</span>'
    principle = ("On this stage, grammar lets meaning reach the audience." if theatre
                 else "Grammar allows the communication of meaning.")
    prose = ("The lead actor holds the scene; " + rule_prose) if theatre else rule_prose
    if glossary is None:
        glossary = ('<section class="gf-glossary" id="glossary"><h2>Glossary</h2>\n'
                    '  <p class="gf-termrow"><b class="gf-term" id="term-determiner" data-term="determiner">'
                    'determiner</b> <span class="gf-gloss">a word that picks the noun out</span></p>\n'
                    '  <p class="gf-termrow"><b class="gf-term" id="term-noun" data-term="noun">noun</b> '
                    f'<span class="gf-gloss">a naming word</span>{vcaa}</p>\n</section>')
    if np_prose is None:
        np_prose = 'A <a class="gf-term-ref" data-term="noun" href="#term-noun">noun</a>'
    return f"""<!doctype html><html><head><title>g</title>{extra_head}</head><body><main>
<p class="gf-principle">{principle}</p>
<nav class="gf-foundations"><a href="#r-det">Determiners open</a></nav>
<section class="gf-heading gf-breadth-narrow" id="noun-phrase" data-source-hash="{h_np}"
  data-tags="Syntax;Phrase" data-breadth="1" data-breadth-tier="narrow" data-breadth-label="Contains 1 — 1 kind, 0 parts" {np_axis}>
  <h2>{glyph}Noun phrase <span class="gf-chip">Syntax</span><span class="gf-chip">Phrase</span></h2>
  <div class="gf-rule gf-reach-spanning" id="r-np" data-reach="1 determiners" data-reach-tier="spanning">
    <p>{np_prose}. {prose}</p>
    <span class="gf-reach-label">Governs 1 sections across 1 headings</span>
    <table class="gf-interactions" data-rule="r-np">
      <tr data-unit="determiners"><td><a href="#determiners">Determiners</a></td>
        <td class="gf-does">{'picks the noun out'}</td><td><i class="gf-example">the cat</i></td></tr>
    </table>
    <div class="gf-strip" data-rule="r-np">
      <a class="gf-strip-mark" href="#noun-phrase"></a><a class="gf-strip-mark gf-on" href="#determiners"></a>
    </div>
    <div class="gf-niche">Exception: a pronoun can stand alone.</div>
  </div>
  <p class="gf-stub" data-rule="r-det">Governed by: <a href="#determiners">Determiners</a></p>
  <div class="gf-diagnostics" data-label="Diagnostic questions">
    <div class="gf-q" data-label="Diagnostic question" data-tests="Syntax;Phrase"><span class="gf-q-text">Can one word replace the group?</span>
      <span class="gf-q-applied">the old cat</span></div>
  </div>
  <div class="gf-box"><span class="gf-box-label">{'Cast' if theatre else 'NP'}</span>the
    <div class="gf-box"><span class="gf-box-label">N</span>cat</div></div>
  <section class="gf-heading gf-breadth-leaf" id="determiners" data-source-hash="{h_det}"
    data-tags="Syntax" data-breadth="0" data-breadth-tier="leaf" {det_axis}>
    <h2>{glyph}Determiners <span class="gf-chip">Syntax</span></h2>
    <div class="gf-rule gf-reach-broad" id="r-det" data-reach="1 noun-phrase" data-reach-tier="broad">
      <p>Determiners come first before any <a class="gf-term-ref" data-term="noun" href="#term-noun">noun</a>.</p>
      <span class="gf-reach-label"><b>Governs 1 sections across 1 headings</b></span>
      <table class="gf-interactions" data-rule="r-det">
        <tr data-unit="noun-phrase"><td><a href="#noun-phrase">Noun phrase</a></td>
          <td class="gf-does">opens the phrase</td><td></td></tr>
      </table>
      <div class="gf-strip" data-rule="r-det">
        <a class="gf-strip-mark gf-on" href="#noun-phrase"></a><a class="gf-strip-mark" href="#determiners"></a>
      </div>
    </div>
    <p class="gf-stub" data-rule="r-np">Governed by: <a href="{stub}">Noun phrase</a></p>
    <div class="gf-diagnostics" data-label="Diagnostic questions">
      <div class="gf-q" data-label="Diagnostic question" data-tests="Syntax"><span class="gf-q-text">{q2}</span></div>
    </div>
    <a class="gf-xref" href="#noun-phrase">see Noun phrase</a>{det_inner}
  </section>
</section>
{extra_body}
{glossary}
<section class="gf-index">
  <div class="gf-index-q" data-kind="diagnostic"><a href="#noun-phrase">Can one word replace the group?</a></div>
  <div class="gf-index-q" data-kind="diagnostic"><a href="#determiners">{q2}</a></div>
</section>
</main></body></html>"""


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)
        (self.d / "Original_Content.md").write_text(SOURCE, encoding="utf-8")
        self.write()

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, tech=None, theatre=None, d=None):
        d = d or self.d
        d.mkdir(exist_ok=True)
        (d / "Technical_Outline.html").write_text(tech or guide(False), encoding="utf-8")
        (d / "Theatre.html").write_text(theatre or guide(True), encoding="utf-8")

    def run_check(self, *extra):
        p = subprocess.run([sys.executable, str(HERE / "validate.py"), "check", "--dir", str(self.d),
                            "--json", *extra], capture_output=True, text=True)
        out = json.loads(p.stdout)
        return p.returncode, {c: m for c, m in out["results"].items() if m}, out

    def assertFails(self, crit, code, *extra):
        rc, failed, _ = self.run_check(*extra)
        self.assertIn(crit, failed, f"expected {crit} to fail; failures: {failed}")
        self.assertEqual(rc, code, failed)


class Conforming(Base):
    def test_clean_pair_passes(self):
        rc, failed, out = self.run_check()
        self.assertEqual(failed, {})
        self.assertEqual(rc, 0)
        self.assertEqual(out["pending"], [])

    def test_hashes_command(self):
        self.assertEqual(len(validate.source_blocks(SOURCE)), 2)
        self.assertTrue(all(len(h) == 12 for h in hashes()))

    def test_placeholder_guides_skip(self):
        (self.d / "Technical_Outline.html").write_text("<html><body><p>not yet</p></body></html>")
        (self.d / "Theatre.html").write_text("<html><body><p>not yet</p></body></html>")
        rc, failed, out = self.run_check()
        self.assertEqual(rc, 0)
        self.assertIn("ALL", out["skipped"])


class Breaks(Base):
    def test_A4_question_differs(self):
        self.write(theatre=guide(True, q2="Does it lead the line?"))
        self.assertFails("A4", 1)

    def test_A8_external_script(self):
        self.write(tech=guide(False, extra_head='<script src="https://cdn.example/x.js"></script>'))
        self.assertFails("A8", 1)

    def test_A13_stale_hash(self):
        (self.d / "Original_Content.md").write_text(SOURCE + "\nMore.\n", encoding="utf-8")
        self.assertFails("A13", 1)

    def test_A13_pending_is_not_a_failure(self):
        (self.d / "Original_Content.md").write_text(SOURCE + "\n# Verb phrase\n\nLater.\n")
        rc, failed, out = self.run_check()
        self.assertEqual(rc, 0, failed)
        self.assertEqual(out["pending"], ["Verb phrase"])

    def test_A13_unchanged_block_edited(self):
        prior = self.d / "prior"
        self.write(d=prior)
        self.write(tech=guide(False, rule_prose="Edited without a source change."),
                   theatre=guide(True, rule_prose="Edited without a source change."))
        self.assertFails("A13", 1, "--prior", str(prior))

    def test_A13_redo_exempts_the_unit(self):
        prior = self.d / "prior"
        self.write(d=prior)
        self.write(tech=guide(False, rule_prose="Redone on request."),
                   theatre=guide(True, rule_prose="Redone on request."))
        rc, failed, _ = self.run_check("--prior", str(prior), "--redo", "noun-phrase")
        self.assertEqual(rc, 0, failed)

    def test_C25_process_word(self):
        self.write(theatre=guide(True, rule_prose="The skeleton holds it."))
        self.assertFails("C25", 2)

    def test_C25_reach_label_exempt(self):
        rc, failed, _ = self.run_check()
        self.assertNotIn("C25", failed)

    def test_D15_stub_links_wrong_home(self):
        self.write(tech=guide(False, stub="#determiners"))
        self.assertFails("D15", 2)

    def test_D2_duplicate_first_use(self):
        extra = '<p><b class="gf-term" id="term-noun" data-term="noun">noun</b><span class="gf-gloss">x</span></p>'
        self.write(tech=guide(False, extra_body=extra), theatre=guide(True, extra_body=extra))
        self.assertFails("D2", 2)

    def test_D2_definition_outside_glossary(self):
        inline = ('A <b class="gf-term" id="term-noun" data-term="noun">noun</b> '
                  '<span class="gf-gloss">a naming word</span>')
        gl = ('<section class="gf-glossary" id="glossary"><h2>Glossary</h2><p class="gf-termrow">'
              '<b class="gf-term" id="term-determiner" data-term="determiner">determiner</b> '
              '<span class="gf-gloss">x</span></p></section>')
        self.write(tech=guide(False, np_prose=inline, glossary=gl),
                   theatre=guide(True, np_prose=inline, glossary=gl))
        self.assertFails("D2", 2)

    def test_D2_glossary_not_alphabetical(self):
        def gl(vcaa):
            return ('<section class="gf-glossary" id="glossary"><h2>Glossary</h2>'
                    '<p class="gf-termrow"><b class="gf-term" id="term-noun" data-term="noun">noun</b> '
                    f'<span class="gf-gloss">a naming word</span>{vcaa}</p>'
                    '<p class="gf-termrow"><b class="gf-term" id="term-determiner" data-term="determiner">'
                    'determiner</b> <span class="gf-gloss">x</span></p></section>')
        v = f'<span class="gf-vcaa-label">(VCAA: <a class="gf-vcaa" href="{VCAA}">noun</a>)</span>'
        self.write(tech=guide(False, glossary=gl(v)), theatre=guide(True, glossary=gl("")))
        self.assertFails("D2", 2)

    def test_D2_missing_glossary(self):
        self.write(tech=guide(False, glossary="", np_prose="A noun"),
                   theatre=guide(True, glossary="", np_prose="A noun"))
        self.assertFails("D2", 2)

    def test_D2_link_in_a_question(self):
        q = 'Is the <a class="gf-term-ref" data-term="noun" href="#term-noun">noun</a> first?'
        self.write(tech=guide(False, q2=q), theatre=guide(True, q2=q))
        _, failed, _ = self.run_check()
        self.assertIn("D2", failed)

    def test_D16_vcaa_outside_glossary(self):
        vc = ('A <a class="gf-term-ref" data-term="noun" href="#term-noun">noun</a>'
              f'<span class="gf-vcaa-label">(VCAA: <a class="gf-vcaa" href="{VCAA}">noun</a>)</span>')
        self.write(tech=guide(False, np_prose=vc))
        self.assertFails("D16", 2)

    def test_A13_term_strip_moved_to_glossary(self):
        prior = self.d / "prior"
        strip = ('<p class="gf-terms"><span class="gf-termrow"><b class="gf-term" id="term-noun" '
                 'data-term="noun">noun</b> <span class="gf-gloss">a naming word</span></span></p>')
        mark = '<div class="gf-rule gf-reach-spanning"'
        old = [guide(t, np_prose="A noun").replace(mark, strip + mark, 1) for t in (False, True)]
        self.write(tech=old[0], theatre=old[1], d=prior)
        _, failed, _ = self.run_check("--prior", str(prior))
        self.assertNotIn("A13", failed)

    def test_D3_breadth_block_retired(self):
        b = ('<div class="gf-breadth-qs"><div class="gf-q"><span class="gf-q-text">'
             'What kinds does a noun phrase come in?</span></div></div>')
        mark = '<div class="gf-rule gf-reach-spanning"'
        self.write(tech=guide(False).replace(mark, b + mark, 1),
                   theatre=guide(True).replace(mark, b + mark, 1))
        _, failed, _ = self.run_check()
        self.assertIn("D3", failed)

    def test_D3_diagnostics_before_rule(self):
        def flip(html):
            i = html.index('  <div class="gf-diagnostics" data-label="Diagnostic questions">')
            j = html.index("</div>\n  </div>", i) + len("</div>\n  </div>")
            block, rest = html[i:j], html[:i] + html[j:]
            mark = '  <div class="gf-rule gf-reach-spanning"'
            return rest.replace(mark, block + "\n" + mark, 1)
        self.write(tech=flip(guide(False)), theatre=flip(guide(True)))
        _, failed, _ = self.run_check()
        self.assertIn("D3", failed)

    def test_C37_note_with_addition(self):
        note = '<p class="gf-note">NOTE — Determiners come first in the noun phrase</p>'
        mark = '  <p class="gf-stub" data-rule="r-det"'
        ok = guide(False).replace(mark, note + "\n" + mark, 1)
        self.write(tech=ok, theatre=guide(True).replace(mark, note + "\n" + mark, 1))
        _, failed, _ = self.run_check()
        self.assertNotIn("C37", failed)
        bad = note.replace("phrase</p>", "phrase. This is a working judgement.</p>")
        self.write(tech=guide(False).replace(mark, bad + "\n" + mark, 1),
                   theatre=guide(True).replace(mark, bad + "\n" + mark, 1))
        _, failed, _ = self.run_check()
        self.assertIn("C37", failed)

    def test_D17_label_missing(self):
        self.write(tech=guide(False).replace(' data-label="Diagnostic questions"', '', 1), theatre=guide(True))
        _, failed, _ = self.run_check()
        self.assertIn("D17", failed)

    def test_D17_note_without_its_label(self):
        note = '<p class="gf-note">Determiners come first in the noun phrase</p>'
        mark = '  <p class="gf-stub" data-rule="r-det"'
        self.write(tech=guide(False).replace(mark, note + "\n" + mark, 1),
                   theatre=guide(True).replace(mark, note + "\n" + mark, 1))
        _, failed, _ = self.run_check()
        self.assertIn("D17", failed)

    def test_D11_shown_breadth_label(self):
        shown = '<span class="gf-chip">Phrase</span><span class="gf-breadth-label">Contains 1 — 1 kind, 0 parts</span></h2>'
        f = lambda h: h.replace('<span class="gf-chip">Phrase</span></h2>', shown, 1)
        self.write(tech=f(guide(False)), theatre=f(guide(True)))
        _, failed, _ = self.run_check()
        self.assertIn("D17", failed)

    def test_D11_label_missing(self):
        f = lambda h: h.replace(' data-breadth-label="Contains 1 — 1 kind, 0 parts"', "", 1)
        self.write(tech=f(guide(False)), theatre=f(guide(True)))
        _, failed, _ = self.run_check()
        self.assertIn("D11", failed)

    def _axis(self, **kw):
        self.write(tech=guide(False, **kw), theatre=guide(True, **kw))
        _, failed, _ = self.run_check()
        return failed

    def test_E1_inherited_axis_passes(self):
        self.assertNotIn("E1", self._axis())

    def test_E1_hooks_missing(self):
        self.assertIn("E1", self._axis(det_axis=""))

    def test_E1_inherits_wrong_value(self):
        self.assertIn("E1", self._axis(
            det_axis='data-axis="purpose" data-axis-from="noun-phrase" data-axis-by="notes"'))

    def test_E1_from_not_an_ancestor(self):
        self.assertIn("E1", self._axis(
            np_axis='data-axis="form-function" data-axis-from="determiners" data-axis-by="notes"'))

    def test_E1_child_chooses_under_a_chooser(self):
        self.assertIn("E1", self._axis(
            det_axis='data-axis="form-function" data-axis-from="determiners" data-axis-by="Luke"'))

    def test_E1_child_may_choose_under_none(self):
        failed = self._axis(
            np_axis='data-axis="none" data-axis-from="noun-phrase" data-axis-by="Luke"',
            det_axis='data-axis="form-function" data-axis-from="determiners" data-axis-by="notes"')
        self.assertNotIn("E1", failed)

    def test_E1_form_function_section_outside_its_axis(self):
        sec = ('<section class="gf-section" id="determiners-form"><h4>Form</h4>'
               '<p>Determiners are a closed set.</p></section>')
        ok = self._axis(det_inner=sec)
        self.assertNotIn("E1", ok)
        purpose = 'data-axis="purpose" data-axis-from="noun-phrase" data-axis-by="Luke"'
        self.assertIn("E1", self._axis(np_axis=purpose, det_axis=purpose, det_inner=sec))
        sub = '<h4 class="gf-subhead">Form &amp; Function</h4>'
        self.assertIn("E1", self._axis(np_axis=purpose, det_axis=purpose, det_inner=sub))

    def test_E1_guides_disagree(self):
        self.write(tech=guide(False), theatre=guide(True, det_axis=
            'data-axis="form-function" data-axis-from="noun-phrase" data-axis-by="Luke"'))
        _, failed, _ = self.run_check()
        self.assertIn("E1", failed)

    def test_D6_glyph_in_technical(self):
        self.write(tech=guide(True).replace("On this stage, grammar lets meaning reach the audience.",
                                            "Grammar allows the communication of meaning."))
        self.assertFails("D6", 2)

    def test_B3_row_count(self):
        rej = ("| Date | Heading | Class | Item | Reason | Ruled by |\n| :- | :- | :- | :- | :- | :- |\n"
               "| 2026-09-26 | x | Quote | q | r | Luke |\n")
        (self.d / "Rejected_Proposals.table.md").write_text(rej)
        self.assertFails("B3", 1, "--rows-before", "rej=0", "--expect", "rej=2")
        rc, failed, _ = self.run_check("--rows-before", "rej=0", "--expect", "rej=1")
        self.assertNotIn("B3", failed)

    def test_C28_paste_reworded(self):
        paste = self.d / "paste.md"
        paste.write_text(SOURCE.replace("built around", "made around"))
        self.assertFails("C28", 2, "--paste", str(paste))
        paste.write_text(SOURCE.replace("A noun phrase", "**A noun phrase**"))
        rc, failed, _ = self.run_check("--paste", str(paste))
        self.assertNotIn("C28", failed)


if __name__ == "__main__":
    unittest.main()

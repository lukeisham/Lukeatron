"""Tests for share/build_share.py, the strict single-file bundler.

TEST-7 gate tests: each unsupported form is refused (one test per form, blocked path) and
a valid app passes (permitted path). The fixture bundle is executed with node so the test
asserts the bundle's behaviour, not just its shape. No network, no sleeps.

Run: python3 -m unittest tests.test_build_share -v
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "share"))

import build_share  # noqa: E402  (path set above)

FIXTURE = ROOT / "tests" / "fixtures" / "share"
BUILDER = ROOT / "share" / "build_share.py"

PAGE = (
    "<!doctype html><html><head><meta charset=\"utf-8\"></head><body>\n"
    "<script type=\"module\" src=\"main.js\"></script>\n</body></html>\n"
)
VERSION_JS = 'export const APP_VERSION = "1.2.3";\n'


def write_app(root: Path, files: dict[str, str]) -> Path:
    """A minimal app: a page, a version file, plus the given files (which may override them)."""
    app = root / "app"
    contents = {"index.html": PAGE, "data/version.js": VERSION_JS, **files}
    for rel, text in contents.items():
        path = app / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    return app


def bundle_script(html: str) -> str:
    """The bundler's own classic <script> (the one with no type attribute)."""
    match = re.search(r"<script>\n(.*?)\n</script>", html, flags=re.DOTALL)
    assert match, "no bundle script in output"
    return match.group(1)


class BundlerTestCase(unittest.TestCase):
    def setUp(self) -> None:
        temp = TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.tmp = Path(temp.name)

    def refusal(self, files: dict[str, str]) -> list[build_share.Issue]:
        app = write_app(self.tmp, files)
        with self.assertRaises(build_share.BundleRefused) as caught:
            build_share.build(app, self.tmp / "dist", check_only=True)
        return caught.exception.issues

    def assert_refused_at(self, files: dict[str, str], file: str, line: int, fragment: str) -> None:
        issues = self.refusal(files)
        matching = [i for i in issues if i.file == file and i.line == line and fragment in i.message]
        self.assertTrue(matching, f"expected {file}:{line} mentioning {fragment!r}, got {[str(i) for i in issues]}")


class TestFixtureBundle(BundlerTestCase):
    """Permitted path: a valid app bundles, and the bundle behaves."""

    def test_imports_cleanly_and_exposes_build(self) -> None:
        self.assertTrue(callable(build_share.build))
        self.assertTrue(callable(build_share.main))

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_bundle_runs_and_prints_expected_result(self) -> None:
        result = build_share.build(FIXTURE, self.tmp / "dist", check_only=True)
        run = subprocess.run(
            ["node", "-"], input=bundle_script(result.html), capture_output=True, text=True, timeout=30
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(run.stdout.strip(), "hello, story! </script> STORY | v9.8.7")

    def test_output_is_one_classic_script_with_no_modules_or_imports(self) -> None:
        html = build_share.build(FIXTURE, self.tmp / "dist", check_only=True).html
        self.assertNotIn('type="module"', html)
        self.assertNotIn("<link", html)
        self.assertNotRegex(html, r"(?m)^\s*(import|export)\s")
        self.assertIn("<style>", html)
        self.assertIn("#app { color: #123456; }", html)

    def test_dependencies_come_before_dependents(self) -> None:
        html = build_share.build(FIXTURE, self.tmp / "dist", check_only=True).html
        order = [html.index(f"// ---- {rel} ----") for rel in ("data/version.js", "shared/greet.js", "main.js")]
        self.assertEqual(order, sorted(order))

    def test_meta_tags_and_json_manifest_are_preserved(self) -> None:
        html = build_share.build(FIXTURE, self.tmp / "dist", check_only=True).html
        self.assertIn('<meta name="storytelling-agent" content="window.storytellingAgent">', html)
        self.assertIn('<script type="application/json" id="storytelling-agent-manifest">{"levers":["help"]}</script>', html)

    def test_script_close_tag_in_source_is_escaped(self) -> None:
        html = build_share.build(FIXTURE, self.tmp / "dist", check_only=True).html
        self.assertEqual(html.count("</script>"), 2)  # the manifest and the bundle, nothing from the string
        self.assertIn("<\\/script>", html)

    def test_import_words_in_comments_strings_and_templates_are_not_imports(self) -> None:
        main = (
            '// import x from "./nope.js"\n'
            '/* export default 1; import * as ns from "./nope.js" */\n'
            'const a = "import { z } from \'./nope.js\'";\n'
            "const b = `import(\"./nope.js\") ${a.length}`;\n"
            "const c = /import\\s+x/.test(a);\n"
            "console.log(a.length + b.length, c);\n"
        )
        result = build_share.build(write_app(self.tmp, {"main.js": main}), self.tmp / "dist", check_only=True)
        self.assertEqual(result.version, "1.2.3")

    def test_supported_declaration_shapes_bundle(self) -> None:
        helper = (
            "export const { p, q: [r] } = { p: 1, q: [2] }, s = 3;\n"
            "export async function loadIt() { return await Promise.resolve(p + r + s); }\n"
            "export class Thing {}\n"
            "const later = () => await_free();\n"
            "function await_free() { return later; }\n"
            "export { later };\n"
        )
        main = 'import { p, r, s, loadIt, Thing, later } from "./helper.js";\nconsole.log(p, r, s, typeof loadIt, typeof Thing, typeof later);\n'
        app = write_app(self.tmp, {"main.js": main, "helper.js": helper})
        html = build_share.build(app, self.tmp / "dist", check_only=True).html
        self.assertNotIn("export", bundle_script(html).replace("// ---- helper.js ----", ""))

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_supported_declaration_shapes_execute(self) -> None:
        helper = "export const { p, q: [r] } = { p: 1, q: [2] }, s = 3;\nexport function total() { return p + r + s; }\n"
        main = 'import { total } from "./helper.js";\nconsole.log(total());\n'
        app = write_app(self.tmp, {"main.js": main, "helper.js": helper})
        html = build_share.build(app, self.tmp / "dist", check_only=True).html
        run = subprocess.run(["node", "-"], input=bundle_script(html), capture_output=True, text=True, timeout=30)
        self.assertEqual(run.stdout.strip(), "6", run.stderr)

    def test_version_is_in_the_file_name_and_the_copy_is_identical(self) -> None:
        dist = self.tmp / "dist"
        result = build_share.build(FIXTURE, dist)
        self.assertEqual([p.name for p in result.outputs], ["Storytelling-9.8.7.html", "Storytelling.html"])
        self.assertEqual(sorted(p.name for p in dist.iterdir()), ["Storytelling-9.8.7.html", "Storytelling.html"])
        self.assertEqual((dist / "Storytelling-9.8.7.html").read_bytes(), (dist / "Storytelling.html").read_bytes())

    def test_same_input_gives_byte_identical_output(self) -> None:
        first, second = self.tmp / "a", self.tmp / "b"
        build_share.build(FIXTURE, first)
        build_share.build(FIXTURE, second)
        self.assertEqual((first / "Storytelling.html").read_bytes(), (second / "Storytelling.html").read_bytes())

    def test_check_mode_validates_without_writing(self) -> None:
        dist = self.tmp / "dist"
        result = build_share.build(FIXTURE, dist, check_only=True)
        self.assertEqual(result.outputs, ())
        self.assertFalse(dist.exists())

    def test_cli_check_passes_on_valid_app_with_exit_zero(self) -> None:
        run = subprocess.run(
            [sys.executable, str(BUILDER), "--check", "--app", str(FIXTURE), "--dist", str(self.tmp / "dist")],
            capture_output=True, text=True, timeout=60,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertIn("Storytelling-9.8.7.html", run.stdout)
        self.assertFalse((self.tmp / "dist").exists())

    def test_cli_build_writes_both_files(self) -> None:
        dist = self.tmp / "dist"
        run = subprocess.run(
            [sys.executable, str(BUILDER), "--app", str(FIXTURE), "--dist", str(dist)],
            capture_output=True, text=True, timeout=60,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertTrue((dist / "Storytelling-9.8.7.html").is_file())

    def test_http_text_in_source_is_reported_not_refused(self) -> None:
        main = 'const credit = "tvtropes.org, https://tvtropes.org/pmwiki";\nconsole.log(credit);\n'
        result = build_share.build(write_app(self.tmp, {"main.js": main}), self.tmp / "dist", check_only=True)
        self.assertEqual(result.url_notes, ("main.js:1: https://tvtropes.org/pmwiki",))


class TestRefusedForms(BundlerTestCase):
    """Blocked path: each unsupported form is genuinely refused, naming file and line."""

    def test_default_import_is_refused(self) -> None:
        self.assert_refused_at({"main.js": '\nimport thing from "./a.js";\n', "a.js": "export const x = 1;\n"}, "main.js", 2, "default import")

    def test_default_plus_named_import_is_refused(self) -> None:
        self.assert_refused_at({"main.js": 'import thing, { x } from "./a.js";\n', "a.js": "export const x = 1;\n"}, "main.js", 1, "default import")

    def test_default_named_binding_is_refused(self) -> None:
        self.assert_refused_at({"main.js": 'import { default as t } from "./a.js";\n', "a.js": "export const x = 1;\n"}, "main.js", 1, "default import")

    def test_namespace_import_is_refused(self) -> None:
        self.assert_refused_at({"main.js": 'const a = 1;\nimport * as ns from "./a.js";\n', "a.js": "export const x = 1;\n"}, "main.js", 2, "namespace import")

    def test_dynamic_import_is_refused(self) -> None:
        self.assert_refused_at({"main.js": 'const f = () => {\n  return import("./a.js");\n};\n', "a.js": "export const x = 1;\n"}, "main.js", 2, "dynamic import")

    def test_export_star_is_refused(self) -> None:
        files = {"main.js": 'import { x } from "./a.js";\n', "a.js": '\nexport * from "./b.js";\n', "b.js": "export const x = 1;\n"}
        self.assert_refused_at(files, "a.js", 2, "export *")

    def test_export_default_is_refused(self) -> None:
        self.assert_refused_at({"main.js": 'import { x } from "./a.js";\n', "a.js": "export const x = 1;\nexport default x;\n"}, "a.js", 2, "default export")

    def test_side_effect_import_is_refused(self) -> None:
        self.assert_refused_at({"main.js": 'import "./a.js";\n', "a.js": "export const x = 1;\n"}, "main.js", 1, "side-effect import")

    def test_renamed_import_is_refused(self) -> None:
        self.assert_refused_at({"main.js": 'import { x as y } from "./a.js";\n', "a.js": "export const x = 1;\n"}, "main.js", 1, "renamed import")

    def test_named_reexport_is_refused(self) -> None:
        files = {"main.js": 'import { x } from "./a.js";\n', "a.js": 'export { x } from "./b.js";\n', "b.js": "export const x = 1;\n"}
        self.assert_refused_at(files, "a.js", 1, "re-export")

    def test_import_cycle_is_refused_and_names_the_path(self) -> None:
        files = {
            "main.js": 'import { a } from "./a.js";\nconsole.log(a);\n',
            "a.js": 'import { b } from "./b.js";\nexport const a = b;\n',
            "b.js": '\nimport { a } from "./a.js";\nexport const b = a;\n',
        }
        issues = self.refusal(files)
        cycle = [i for i in issues if "import cycle" in i.message]
        self.assertEqual([(i.file, i.line) for i in cycle], [("b.js", 2)])
        self.assertIn("a.js -> b.js -> a.js", cycle[0].message)

    def test_duplicate_top_level_name_across_modules_is_refused(self) -> None:
        files = {
            "main.js": 'import { one } from "./a.js";\nimport { two } from "./b.js";\nconsole.log(one, two);\n',
            "a.js": "const helper = 1;\nexport const one = helper;\n",
            "b.js": "\nconst helper = 2;\nexport const two = helper;\n",
        }
        self.assert_refused_at(files, "b.js", 2, "`helper` is also declared at a.js:1")

    def test_duplicate_function_and_comma_declarator_names_are_refused(self) -> None:
        files = {
            "main.js": 'import { one } from "./a.js";\nimport { two } from "./b.js";\nconsole.log(one, two);\n',
            "a.js": "export function one() { return 1; }\nlet keep = 1, clash = 2;\n",
            "b.js": "export function two() { return 2; }\nfunction clash() {}\n",
        }
        self.assert_refused_at(files, "b.js", 2, "`clash`")

    def test_import_of_missing_file_is_refused(self) -> None:
        self.assert_refused_at({"main.js": 'import { x } from "./ghost.js";\n'}, "main.js", 1, "does not exist")

    def test_import_of_name_the_target_does_not_export_is_refused(self) -> None:
        self.assert_refused_at({"main.js": 'import { nope } from "./a.js";\n', "a.js": "export const x = 1;\n"}, "main.js", 1, "`nope` is not exported by a.js")

    def test_bare_and_extensionless_specifiers_are_refused(self) -> None:
        self.assert_refused_at({"main.js": 'import { x } from "./a";\n', "a.js": "export const x = 1;\n"}, "main.js", 1, "only relative paths ending in .js")

    def test_import_escaping_the_app_folder_is_refused(self) -> None:
        self.assert_refused_at({"main.js": 'import { x } from "../outside.js";\n'}, "main.js", 1, "leaves the app folder")

    def test_top_level_await_is_refused(self) -> None:
        self.assert_refused_at({"main.js": "const x = 1;\nawait Promise.resolve(x);\n"}, "main.js", 2, "top-level await")

    def test_await_inside_async_function_is_permitted(self) -> None:
        main = "async function run() { return await Promise.resolve(1); }\nconst arrow = async () => await run();\nconsole.log(arrow);\n"
        result = build_share.build(write_app(self.tmp, {"main.js": main}), self.tmp / "dist", check_only=True)
        self.assertEqual(result.version, "1.2.3")

    def test_network_call_is_refused(self) -> None:
        self.assert_refused_at({"main.js": 'console.log(1);\nfetch("/x");\n'}, "main.js", 2, "network API")

    def test_external_script_and_stylesheet_are_refused(self) -> None:
        page = PAGE.replace("</head>", '<link rel="stylesheet" href="https://example.org/a.css"></head>')
        page = page.replace("</body>", '<script src="https://example.org/a.js"></script></body>')
        issues = self.refusal({"index.html": page, "main.js": "console.log(1);\n"})
        messages = " | ".join(str(i) for i in issues)
        self.assertIn("stylesheet", messages)
        self.assertIn("script \"https://example.org/a.js\" is external", messages)

    def test_css_import_and_external_url_are_refused(self) -> None:
        page = PAGE.replace("</head>", '<link rel="stylesheet" href="s.css"></head>')
        css = "/* url(https://ok-in-comment) */\n@import 'other.css';\nbody { background: url(bg.png); }\n"
        issues = self.refusal({"index.html": page, "s.css": css, "main.js": "console.log(1);\n"})
        self.assertEqual([(i.file, i.line) for i in issues], [("s.css", 2), ("s.css", 3)])

    def test_missing_version_is_refused(self) -> None:
        issues = self.refusal({"data/version.js": "export const NOT_IT = 1;\n", "main.js": "console.log(1);\n"})
        self.assertIn(("data/version.js", 1), [(i.file, i.line) for i in issues])

    def test_oversize_bundle_is_refused_and_lists_largest_inputs(self) -> None:
        app = write_app(self.tmp, {"main.js": "const big = 1; // " + "x" * 500 + "\n"})
        with self.assertRaises(build_share.BundleRefused) as caught:
            build_share.build(app, self.tmp / "dist", check_only=True, size_limit=200)
        self.assertIn("largest inputs: main.js", str(caught.exception))

    def test_refusal_writes_nothing(self) -> None:
        app = write_app(self.tmp, {"main.js": 'import x from "./a.js";\n', "a.js": "export default 1;\n"})
        dist = self.tmp / "dist"
        with self.assertRaises(build_share.BundleRefused):
            build_share.build(app, dist)
        self.assertFalse(dist.exists())

    def test_all_problems_are_listed_not_just_the_first(self) -> None:
        main = 'import a from "./x.js";\nimport * as b from "./x.js";\nconst c = import("./x.js");\n'
        issues = self.refusal({"main.js": main, "x.js": "export const q = 1;\n"})
        self.assertEqual([i.line for i in issues if i.file == "main.js"], [1, 2, 3])


class TestCommandLineRefusals(BundlerTestCase):
    """A refused app exits non-zero and the message names file and line."""

    def run_cli(self, files: dict[str, str]) -> subprocess.CompletedProcess[str]:
        app = write_app(self.tmp, files)
        return subprocess.run(
            [sys.executable, str(BUILDER), "--app", str(app), "--dist", str(self.tmp / "dist")],
            capture_output=True, text=True, timeout=60,
        )

    def assert_cli_refuses(self, files: dict[str, str], expected: str) -> None:
        run = self.run_cli(files)
        self.assertEqual(run.returncode, 1)
        self.assertIn(expected, run.stderr)
        self.assertFalse((self.tmp / "dist").exists())

    def test_cli_refuses_default_import(self) -> None:
        self.assert_cli_refuses({"main.js": 'import t from "./a.js";\n', "a.js": "export const x = 1;\n"}, "main.js:1:")

    def test_cli_refuses_namespace_import(self) -> None:
        self.assert_cli_refuses({"main.js": 'import * as t from "./a.js";\n', "a.js": "export const x = 1;\n"}, "main.js:1:")

    def test_cli_refuses_cycle(self) -> None:
        files = {"main.js": 'import { a } from "./a.js";\n', "a.js": 'import { b } from "./b.js";\nexport const a = 1;\n', "b.js": 'import { a } from "./a.js";\nexport const b = 1;\n'}
        self.assert_cli_refuses(files, "b.js:1: import cycle")

    def test_cli_refuses_duplicate_name(self) -> None:
        files = {
            "main.js": 'import { a } from "./a.js";\nimport { b } from "./b.js";\n',
            "a.js": "const dup = 1;\nexport const a = dup;\n",
            "b.js": "const dup = 2;\nexport const b = dup;\n",
        }
        self.assert_cli_refuses(files, "b.js:1:")


if __name__ == "__main__":
    unittest.main()

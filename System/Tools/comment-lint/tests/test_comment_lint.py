"""Smoke tests for comment-lint. Each test writes throwaway files; nothing reads the real tree."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import comment_lint  # noqa: E402

PYTHON_SOURCE = '''"""Reads the store once per request."""
DATE_IN_DATA = "2026-01-01"


def load():
    # Host check defeats DNS rebinding.
    # Luke chose a new tab here (2026-09-29).
    return DATE_IN_DATA
'''

JS_SOURCE = '''const url = "https://example.com/x"; // keeps the origin fixed
const label = "per frontend.spec AD-5";
/* Splits on the `*italic*` convention (database.spec AD-6). */
'''


class CommentLintTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.folder = Path(temporary.name)
        self.original_root = comment_lint.ROOT
        comment_lint.ROOT = self.folder
        self.addCleanup(setattr, comment_lint, "ROOT", self.original_root)

    def breaches_in(self, name: str, source: str) -> list[str]:
        path = self.folder / name
        path.write_text(source)
        return list(comment_lint.text_breaches(path))

    def test_python_flags_decision_comment_but_not_string_data(self):
        breaches = self.breaches_in("module.py", PYTHON_SOURCE)
        self.assertEqual([breach.split(":")[1] for breach in breaches], ["7", "7"])
        self.assertEqual({breach.split(" ")[1] for breach in breaches}, {"[date]", "[decision]"})

    def test_javascript_reads_comments_only_and_ignores_urls(self):
        breaches = self.breaches_in("view.js", JS_SOURCE)
        self.assertEqual(len(breaches), 1)
        self.assertTrue(breaches[0].startswith("view.js:3: [spec-id]"))

    def test_clean_why_comment_passes(self):
        self.assertEqual(self.breaches_in("ok.css", "/* Tokens only; dark mode swaps them. */\n.a { color: red; }\n"), [])

    def test_unparsable_python_is_reported_not_raised(self):
        breaches = self.breaches_in("broken.py", "def broken(:\n")
        self.assertEqual(len(breaches), 1)
        self.assertIn("[unparsable]", breaches[0])


if __name__ == "__main__":
    unittest.main()

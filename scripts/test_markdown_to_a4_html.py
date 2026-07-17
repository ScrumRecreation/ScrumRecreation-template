import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().with_name("markdown_to_a4_html.py")
SPEC = importlib.util.spec_from_file_location("markdown_to_a4_html", MODULE_PATH)
module = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(module)


class MarkdownToA4HtmlTests(unittest.TestCase):
    def test_short_sections_are_packed_into_the_same_page(self) -> None:
        markdown = "# Title\n\n## Section 1\n\nFirst paragraph.\n\n## Section 2\n\nSecond paragraph.\n"
        html = module.build_html(markdown, "sample.md")

        self.assertNotIn("変換しました", html)
        self.assertEqual(html.count('class="page"'), 1)


if __name__ == "__main__":
    unittest.main()
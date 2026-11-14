import base64
import hashlib
import json
import re
import unittest

from tools.faq_schema import END, START, render

SOURCE = """<!doctype html><html><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'">
</head><body>
<details class="faq"><summary>Вопрос?</summary><p>Ответ.</p></details>
</body></html>"""


class FaqSchemaTest(unittest.TestCase):
    def test_injects_faq_page_with_matching_csp_hash(self):
        result = render(SOURCE)
        self.assertEqual(result.count(START), 1)
        self.assertEqual(result.count(END), 1)
        block = re.search(re.escape(START) + r'<script type="application/ld\+json">(.*?)</script>', result).group(1)
        data = json.loads(block)
        self.assertEqual(data["@type"], "FAQPage")
        self.assertEqual(data["mainEntity"][0]["name"], "Вопрос?")
        self.assertEqual(data["mainEntity"][0]["acceptedAnswer"]["text"], "Ответ.")
        digest = base64.b64encode(hashlib.sha256(block.encode()).digest()).decode()
        self.assertIn(f"'sha256-{digest}'", result)

    def test_rerender_leaves_the_file_unchanged(self):
        once = render(SOURCE)
        self.assertEqual(render(once), once)

    def test_page_without_questions_is_rejected(self):
        with self.assertRaises(ValueError):
            render("<!doctype html><html><head></head><body></body></html>")

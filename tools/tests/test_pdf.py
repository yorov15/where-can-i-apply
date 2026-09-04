import unittest

from tools.pdf import pdf_to_text


def make_pdf(pages: list[list[str]]) -> bytes:
    """Собирает минимальный настоящий PDF из строк текста.

    Написан руками, чтобы у теста был предсказуемый файл и не пришлось
    класть в репозиторий двоичный образец, происхождение которого через
    год никто не вспомнит. Формат самый простой: одна страница на список
    строк, шрифт Helvetica, никакого сжатия.
    """
    objects = []

    page_ids = []
    for number, lines in enumerate(pages):
        content_id = 4 + number * 2
        page_id = 5 + number * 2
        page_ids.append(page_id)

        commands = ["BT", "/F1 12 Tf", "72 720 Td"]
        for index, line in enumerate(lines):
            if index:
                commands.append("0 -16 Td")
            escaped = line.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
            commands.append(f"({escaped}) Tj")
        commands.append("ET")
        stream = "\n".join(commands).encode("latin-1")

        objects.append(
            (content_id, b"<< /Length %d >>\nstream\n%s\nendstream" % (len(stream), stream))
        )
        objects.append(
            (
                page_id,
                b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                b"/Contents %d 0 R /Resources << /Font << /F1 3 0 R >> >> >>"
                % content_id,
            )
        )

    kids = b" ".join(b"%d 0 R" % pid for pid in page_ids)
    objects.insert(0, (1, b"<< /Type /Catalog /Pages 2 0 R >>"))
    objects.insert(
        1, (2, b"<< /Type /Pages /Kids [%s] /Count %d >>" % (kids, len(page_ids)))
    )
    objects.insert(
        2, (3, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    )

    objects.sort(key=lambda pair: pair[0])

    out = bytearray(b"%PDF-1.4\n")
    offsets = {}
    for number, body in objects:
        offsets[number] = len(out)
        out += b"%d 0 obj\n" % number + body + b"\nendobj\n"

    xref_at = len(out)
    highest = max(offsets)
    out += b"xref\n0 %d\n" % (highest + 1)
    out += b"0000000000 65535 f \n"
    for number in range(1, highest + 1):
        out += b"%010d 00000 n \n" % offsets.get(number, 0)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (
        highest + 1,
        xref_at,
    )
    return bytes(out)


class TestPdfToText(unittest.TestCase):
    def test_reads_a_single_page(self):
        data = make_pdf([["Applicants must be under 21 years of age."]])
        self.assertIn("Applicants must be under 21 years of age.", pdf_to_text(data))

    def test_joins_pages(self):
        data = make_pdf([["First page rules"], ["Second page rules"]])
        text = pdf_to_text(data)
        self.assertIn("First page rules", text)
        self.assertIn("Second page rules", text)

    def test_line_breaks_become_spaces(self):
        data = make_pdf([["Minimum grade point", "average of 80 percent"]])
        self.assertIn("Minimum grade point average of 80 percent", pdf_to_text(data))

    def test_hyphenated_word_is_joined_back(self):
        # В PDF строка часто рвётся посреди слова. Без склейки цитата
        # «requirements» не нашлась бы никогда: в тексте лежало бы
        # «require- ments».
        data = make_pdf([["The require-", "ments are listed below"]])
        self.assertIn("requirements are listed below", pdf_to_text(data))

    def test_real_hyphen_survives(self):
        data = make_pdf([["Full-time study only"]])
        self.assertIn("Full-time study only", pdf_to_text(data))

    def test_garbage_is_a_clear_error(self):
        with self.assertRaises(ValueError) as caught:
            pdf_to_text(b"not a pdf at all")
        self.assertIn("PDF", str(caught.exception))


if __name__ == "__main__":
    unittest.main()

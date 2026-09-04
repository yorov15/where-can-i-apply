"""Извлечение текста из PDF.

Половина государственных стипендий публикует настоящие требования не на
странице, а в PDF: Stipendium Hungaricum, MEXT и другие. Без чтения PDF
они недоступны конвейеру целиком.

Здесь живёт единственная зависимость проекта — pypdf. Она только в
tools/: сайт остаётся без зависимостей, потому что PDF читается при
сборке данных, а не у пользователя в браузере.
"""

import io
import re

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from tools.snapshot import normalize

# Перенос слова: дефис на конце строки, дальше перевод строки. В PDF это
# верстка, а не часть слова, и без склейки цитата «requirements» не
# нашлась бы — в тексте лежало бы «require- ments».
_HYPHEN_BREAK = re.compile(r"-\s*\n\s*")


def pdf_to_text(data: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
    except (PdfReadError, OSError, ValueError, KeyError) as error:
        raise ValueError(f"Не удалось прочитать PDF: {error}") from error

    if not pages:
        raise ValueError("Не удалось прочитать PDF: в файле нет страниц")

    text = "\n".join(pages)
    text = _HYPHEN_BREAK.sub("", text)
    return normalize(text)

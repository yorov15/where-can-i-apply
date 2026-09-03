"""Снимок страницы: HTML в текст, нормализация, хеш.

Нормализация нужна не для красоты. Проверка цитат ищет фразу из записи
в тексте страницы обычным поиском подстроки. Модель копирует цитату с
неразрывными пробелами и типографскими кавычками, а в другом месте той
же страницы стоят обычные — без приведения к одному виду честная цитата
не находится, и валидатор ругается на верную запись.
"""

import hashlib
import re
from html.parser import HTMLParser

SKIP_TAGS = {"script", "style", "noscript", "svg", "head"}


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data):
        if self._skip_depth == 0:
            self.parts.append(data)


def html_to_text(html: str) -> str:
    parser = _TextExtractor()
    parser.feed(html)
    return normalize(" ".join(parser.parts))


def normalize(text: str) -> str:
    # Коды, а не сами символы: неразрывный пробел в исходнике неотличим
    # от обычного, и правило молча перестало бы работать при копировании.
    replacements = {
        "\u00a0": " ",  # неразрывный пробел
        "’": "'",  # правая одиночная кавычка
        "‘": "'",  # левая одиночная кавычка
        "“": '"',  # левая двойная кавычка
        "”": '"',  # правая двойная кавычка
        "–": "-",  # короткое тире
        "—": "-",  # длинное тире
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return re.sub(r"\s+", " ", text).strip()


def sha256_of_text(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()

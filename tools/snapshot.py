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
        "‐": "-",  # типографский дефис
        "‑": "-",  # неразрывный дефис: встретился на ntc.tj в «синфи 11‑ум»
        "‒": "-",  # цифровое тире
        "−": "-",  # минус
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    # BOM и прочие нулевой ширины: пробелами не считаются, поэтому
    # re.sub ниже их не уберёт, а в начале цитаты они всё ломают.
    text = re.sub(r"[\ufeff\u200b\u200c\u200d\u2060]", "", text)
    # \u0423\u043f\u0440\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0435 \u043a\u043e\u0434\u044b, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0448\u0440\u0438\u0444\u0442\u044b PDF \u043e\u0441\u0442\u0430\u0432\u043b\u044f\u044e\u0442 \u0432\u043c\u0435\u0441\u0442\u043e \u043f\u0440\u043e\u0431\u0435\u043b\u0430 (\x00,
    # \x07): \u0433\u043b\u0430\u0437\u043e\u043c \u044d\u0442\u043e \u043f\u0440\u043e\u0431\u0435\u043b, \u0430 \u0434\u043b\u044f \u0441\u0432\u0435\u0440\u043a\u0438 \u0446\u0438\u0442\u0430\u0442\u044b \u2014 \u0441\u0442\u0435\u043d\u0430 \u043f\u043e\u0441\u0440\u0435\u0434\u0438 \u0444\u0440\u0430\u0437\u044b.
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def strip_volatile(text: str, patterns) -> str:
    """Убирает куски, которые меняются сами по себе.

    На странице ntc.tj стоит счётчик просмотров: он растёт при каждом
    заходе, и хеш страницы меняется без единой правки требований. Без
    этой чистки слежение кричало бы «страница изменилась» каждый раз, а
    механизм, который врёт всегда, хуже отсутствующего.

    Что считать изменчивым, решает человек в tools/sources.toml — не
    робот и не догадка по виду текста.
    """
    for pattern in patterns or ():
        text = re.sub(pattern, "", text)
    return re.sub(r"\s+", " ", text).strip()


def sha256_of_text(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def source_fingerprint(pages) -> str:
    """Один хеш на весь источник — по хешам всех его страниц.

    Раньше запись помнила хеш только первой страницы. У Венгрии правила
    допуска лежат в третьей, в PDF «Call for Applications», и её подмена
    проходила незаметно: слежение говорило «без изменений», а выдача
    считала по прошлогоднему порогу возраста.
    """
    return sha256_of_text("\n".join(page["contentHash"] for page in pages))

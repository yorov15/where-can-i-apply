"""Список источников, которые утвердил человек.

Робот собирает, человек утверждает. Автоматический поиск источников
поисковиком запрещён: SEO-мусор и агентские сайты ранжируются выше
первоисточников и содержат неверные факты.
"""

import re
import tomllib
from pathlib import Path

# Необязательный ключ volatile — список регулярных выражений для кусков,
# которые меняются сами по себе: счётчики просмотров, даты «сегодня»,
# номера сессий. Хеш считается без них, иначе слежение кричит о правках
# требований там, где просто выросла цифра счётчика.

SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
REQUIRED_KEYS = ("name", "approvedBy", "approvedAt")

# Часть источников недоступна программе, но доступна человеку: сайт
# рисуется JavaScript-ом, отдаёт 412 автоматическим клиентам или прячет
# документ за формой. Тогда человек сохраняет файл сам, обычным
# браузером, и кладёт путь сюда. Это не обход защиты: страницу открывает
# человек, конвейер лишь разбирает то, что уже получено.
#
# У каждого файла обязателен адрес, откуда он сохранён: без него запись
# невозможно перепроверить, а это главное обещание проекта.


def load_sources(path) -> dict:
    with Path(path).open("rb") as handle:
        return tomllib.load(handle)


def check_sources(raw: dict) -> list[str]:
    problems = []
    for program_id, entry in raw.items():
        if not SLUG.match(program_id):
            problems.append(
                f"{program_id}: идентификатор должен быть в нижнем регистре через дефис"
            )
        for key in REQUIRED_KEYS:
            if key not in entry:
                problems.append(f"{program_id}: нет поля {key}")
        urls = entry.get("urls", [])
        files = entry.get("files", [])
        if not urls and not files:
            problems.append(f"{program_id}: нет ни одного адреса")
        for url in urls:
            if not url.startswith("https://"):
                problems.append(f"{program_id}: адрес не по https — {url}")

        for number, item in enumerate(files):
            if not isinstance(item, dict):
                problems.append(f"{program_id}: files[{number}] должен быть таблицей с path и url")
                continue
            if not item.get("path"):
                problems.append(f"{program_id}: files[{number}] без path")
            origin = item.get("url", "")
            if not origin:
                problems.append(
                    f"{program_id}: files[{number}] без url — "
                    "без адреса источника запись нельзя перепроверить"
                )
            elif not origin.startswith("https://"):
                problems.append(f"{program_id}: files[{number}] адрес не по https — {origin}")
        approved_at = entry.get("approvedAt", "")
        if approved_at and not ISO_DATE.match(approved_at):
            problems.append(f"{program_id}: дата утверждения не в формате ГГГГ-ММ-ДД")
        for pattern in entry.get("volatile", []):
            try:
                re.compile(pattern)
            except re.error as error:
                problems.append(
                    f"{program_id}: volatile — не регулярное выражение {pattern!r}: {error}"
                )
    return problems

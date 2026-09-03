"""Список источников, которые утвердил человек.

Робот собирает, человек утверждает. Автоматический поиск источников
поисковиком запрещён: SEO-мусор и агентские сайты ранжируются выше
первоисточников и содержат неверные факты.
"""

import re
import tomllib
from pathlib import Path

SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
REQUIRED_KEYS = ("name", "urls", "approvedBy", "approvedAt")


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
        if not urls:
            problems.append(f"{program_id}: нет ни одного адреса")
        for url in urls:
            if not url.startswith("https://"):
                problems.append(f"{program_id}: адрес не по https — {url}")
        approved_at = entry.get("approvedAt", "")
        if approved_at and not ISO_DATE.match(approved_at):
            problems.append(f"{program_id}: дата утверждения не в формате ГГГГ-ММ-ДД")
    return problems

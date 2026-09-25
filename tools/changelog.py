"""Журнал изменений данных и Atom-лента из него.

Уведомлений «условия поменялись» сайт присылать не может: для этого нужен
адрес человека, а сайт ничего не собирает. Лента устроена наоборот: файл
лежит на сайте, читалка сама заходит за ним, и сайт не знает, кто подписан.

В журнал попадает только то, что человек увидит в карточке: правила
допуска, срок, покрытие, условия текстом, название и ссылка для подачи.
Перепроверка («страница не изменилась, дата проверки сдвинулась») и
повторная подпись того же правила изменением не считаются: лента, в
которой каждый день что-то «обновилось», через неделю перестаёт читаться.
"""

import json
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

BASE = "https://kuda-podat.vercel.app/"
FEED_LIMIT = 40

# Как поле допуска называется в ленте. Порядок — как в анкете.
RULE_LABELS = {
    "citizenship": "гражданство",
    "schoolCountry": "страна школы",
    "schoolYears": "годы школы",
    "graduationYear": "год выпуска",
    "age": "возраст",
    "gpa": "средний балл",
    "language": "язык",
    "exam": "экзамен",
}

# Что ещё в записи видно человеку, в порядке показа.
OTHER_LABELS = (
    ("deadline", "срок"),
    ("coverage", "что покрывает"),
    ("textConditions", "условия текстом"),
    ("name", "название"),
    ("applyUrl", "ссылка для подачи"),
)

# Дата и автор подписи меняются при каждой повторной проверке.
SIGNATURE_KEYS = ("checkedAt", "checkedBy")


def _rule(rule):
    if not isinstance(rule, dict):
        return rule
    return {key: value for key, value in rule.items() if key not in SIGNATURE_KEYS}


def _conditions(items):
    """Что видит человек: текст, тип, поле и взнос. Цитата — для проверяющего,
    её переформулировка карточку не меняет."""
    out = []
    for item in items or []:
        fee = item.get("fee")
        if isinstance(fee, dict):
            fee = {key: value for key, value in fee.items() if key != "evidence"}
        out.append((item.get("ru"), item.get("kind"), item.get("field"), fee))
    return out


def summarize(before, after) -> list[str]:
    """Что изменилось между двумя версиями записи, словами для ленты."""
    if before is None:
        return ["новая программа"]
    labels = []
    old_rules = before.get("eligibility") or {}
    new_rules = after.get("eligibility") or {}
    for field, label in RULE_LABELS.items():
        if _rule(old_rules.get(field)) != _rule(new_rules.get(field)):
            labels.append(f"правило: {label}")
    for key, label in OTHER_LABELS:
        if key == "textConditions":
            changed = _conditions(before.get(key)) != _conditions(after.get(key))
        else:
            changed = before.get(key) != after.get(key)
        if changed:
            labels.append(label)
    return labels


def record(path, day: str, program_id: str, changes: list[str]) -> None:
    """Дописывает в журнал. Две правки одной программы за день сливаются в
    одну запись: подписчику нужен итог дня, а не история сеансов."""
    if not changes:
        return
    path = Path(path)
    entries = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
    for entry in entries:
        if entry["date"] == day and entry["id"] == program_id:
            entry["changes"] = entry["changes"] + [c for c in changes if c not in entry["changes"]]
            break
    else:
        entries.append({"date": day, "id": program_id, "changes": list(changes)})
    # Сортировка устойчивая: внутри дня порядок записи сохраняется.
    entries.sort(key=lambda entry: entry["date"], reverse=True)
    path.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def feed_xml(entries, names, limit: int = FEED_LIMIT, today: str | None = None) -> str:
    shown = list(entries)[:limit]
    updated = (shown[0]["date"] if shown else today or date.today().isoformat()) + "T00:00:00Z"
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="ru">',
        "  <title>Куда я могу подать документы: что изменилось</title>",
        "  <subtitle>Правки в правилах, сроках и условиях программ. Лента ничего не знает о своих читателях.</subtitle>",
        f'  <link href="{BASE}"/>',
        f'  <link rel="self" type="application/atom+xml" href="{BASE}feed.xml"/>',
        f"  <id>{BASE}</id>",
        f"  <updated>{updated}</updated>",
    ]
    for entry in shown:
        name = names.get(entry["id"], entry["id"])
        text = ", ".join(entry["changes"])
        lines += [
            "  <entry>",
            f"    <title>{escape(f'{name} · {text}')}</title>",
            f"    <id>tag:kuda-podat.vercel.app,{entry['date']}:{escape(entry['id'])}</id>",
            f'    <link href="{BASE}"/>',
            f"    <updated>{entry['date']}T00:00:00Z</updated>",
            f"    <summary>{escape(f'Изменено в карточке «{name}»: {text}. Открой сайт и сверь условия.')}</summary>",
            "  </entry>",
        ]
    lines.append("</feed>")
    return "\n".join(lines) + "\n"

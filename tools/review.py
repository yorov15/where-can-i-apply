"""Утверждение записи человеком.

Единственный файл, которому разрешено писать в data/programs/. У шага
извлечения такого права нет — поэтому непроверенное значение не может
попасть в выдачу, даже если кто-то забудет посмотреть.
"""

import copy
import json
import sys
from datetime import date
from pathlib import Path

from tools.fetch import latest_snapshot
from tools.schema import FIELDS, absence_rule
from tools.snapshot import source_fingerprint
from tools.validate import validate_program


def field_changes(current, proposed) -> list[dict]:
    current_rules = (current or {}).get("eligibility", {})
    proposed_rules = proposed.get("eligibility", {})

    changes = []
    for field in FIELDS:
        before = current_rules.get(field)
        after = proposed_rules.get(field)
        if before == after:
            continue
        if before is None and after is None:
            continue
        changes.append({"field": field, "before": before, "after": after})
    return changes


# Эти поля review проставляет сам при утверждении, показывать их как
# изменения незачем.
SET_BY_REVIEW = frozenset({"eligibility", "source", "status", "leftEmpty"})


def other_changes(current, proposed: dict) -> list[dict]:
    """Что меняется помимо семи правил допуска.

    Раньше review показывал только правила, а название, покрытие, сроки и
    текстовые условия записывались молча. Человек утверждал «запись
    целиком», а видел треть — и подписывался под тем, чего не читал.
    """
    before = current or {}
    changes = []
    for key in sorted(set(before) | set(proposed)):
        if key in SET_BY_REVIEW:
            continue
        if before.get(key) == proposed.get(key):
            continue
        changes.append({"field": key, "before": before.get(key), "after": proposed.get(key)})
    return changes


def merge_proposed(current, proposed: dict) -> dict:
    """Накладывает предложение модели на утверждённую запись.

    null в предложении означает «модель ничего не нашла», а не «здесь
    ничего не должно быть»: extract.py прямо велит возвращать null, когда
    поля нет в тексте явно. Трактовать это как «убрать» — значит молча
    предлагать откат чужой работы, в том числе подписей человека, которых
    модель поставить не может в принципе.

    Убрать правило можно, отредактировав запись руками. Побочным эффектом
    того, что модель промолчала, — нельзя.
    """
    merged = copy.deepcopy(proposed)
    current_rules = (current or {}).get("eligibility") or {}
    merged.setdefault("eligibility", {})

    for field in FIELDS:
        if merged["eligibility"].get(field) is None and current_rules.get(field) is not None:
            merged["eligibility"][field] = copy.deepcopy(current_rules[field])

    # Отказы человека переносятся по той же причине, что и правила: их
    # ставит review, а предложение модели про них не знает. Без переноса
    # память об отказах стиралась бы при первой же следующей записи, и
    # вопросы возвращались бы все разом.
    declined = (current or {}).get("leftEmpty")
    if declined:
        merged["leftEmpty"] = copy.deepcopy(declined)

    return merged


def unasked_fields(program: dict, current, content_hash: str) -> list[str]:
    """Пустые поля, о которых человека ещё не спрашивали на этом снимке.

    Отказ «нет, требование может быть, просто не на этой странице» —
    такое же решение, как подпись, и переспрашивать его каждый прогон
    вредно: на шестой раз человек начинает жать вслепую, а тогда он
    подпишет и то, чего не проверял.

    Отказ запоминается вместе с хешем снимка. Изменился текст источника —
    спрашиваем снова: на новом тексте ответ может быть другим.
    """
    declined = (current or {}).get("leftEmpty") or {}
    return [
        field
        for field in empty_fields(program)
        if declined.get(field) != content_hash
    ]


def remember_declined(program: dict, fields, content_hash: str) -> dict:
    """Записывает, что человек осознанно оставил поля пустыми."""
    remembered = copy.deepcopy(program)
    declined = dict(remembered.get("leftEmpty") or {})
    for field in fields:
        declined[field] = content_hash
    if declined:
        remembered["leftEmpty"] = declined
    return remembered


def prune_declined(program: dict) -> dict:
    """Убирает отметки об отказе с полей, у которых правило уже появилось.

    Отметка живёт только затем, чтобы не переспрашивать про пустое поле.
    Как только поле заполнено — подписью или новым правилом из источника —
    она ничего не значит и только вводит в заблуждение того, кто откроет
    запись руками.
    """
    pruned = copy.deepcopy(program)
    declined = pruned.get("leftEmpty")
    if not declined:
        pruned.pop("leftEmpty", None)
        return pruned

    empty = set(empty_fields(pruned))
    kept = {field: value for field, value in declined.items() if field in empty}
    if kept:
        pruned["leftEmpty"] = kept
    else:
        pruned.pop("leftEmpty", None)
    return pruned


def empty_fields(program: dict) -> list[str]:
    """Поля, про которые в записи ничего нет.

    Каждое такое поле красит карточку в жёлтый с текстом «программа не
    указывает». Иногда это правда — мы не смотрели. А иногда человек
    страницу читал и требования там действительно нет. Второе надо уметь
    сказать, иначе жёлтыми становятся почти все записи и цвет перестаёт
    что-либо значить.
    """
    rules = program.get("eligibility", {})
    return [field for field in FIELDS if rules.get(field) is None]


def sign_absence(program: dict, field: str, today: str, note: str) -> dict:
    """Ставит подпись человека под отсутствием требования. Вход не меняет."""
    signed = copy.deepcopy(program)
    signed.setdefault("eligibility", {})[field] = absence_rule(today, note)
    return signed


YES = ("да", "д", "y", "yes")
NO = ("нет", "н", "n", "no")


def ask(question: str, reader=input) -> bool:
    """Спрашивает, пока не получит внятный ответ.

    Раньше распознавалось только «да», а всё остальное молча считалось
    отказом — включая пустой Enter. Подсказка [да/нет] выглядит так,
    будто Enter соглашается, и человек, нажавший его, терял всю работу
    без единого слова об этом. Молчаливый отказ на согласие — худший вид
    ошибки: выглядит как успех.
    """
    while True:
        try:
            answer = reader(question).strip().lower()
        except EOFError:
            print("ввод закончился, считаю за отказ")
            return False
        if answer in YES:
            return True
        if answer in NO:
            return False
        print("   не понял. Напиши «да» или «нет»")


def approve(program: dict, today: str, pages: list[dict]) -> dict:
    """Утверждает запись и записывает все страницы источника с хешами.

    Страницы записываются целиком, а не одной первой: у половины программ
    правила допуска лежат не на ней. Пока запись помнила только первую,
    слежение молча пропускало изменения во всех остальных.
    """
    approved = prune_declined(program)
    approved["status"] = "published"
    approved.setdefault("source", {})
    approved["source"]["url"] = pages[0]["url"]
    approved["source"]["pages"] = [
        {"url": page["url"], "contentHash": page["contentHash"]} for page in pages
    ]
    approved["source"]["lastVerified"] = today
    approved["source"].pop("contentHash", None)
    approved["source"]["humanChecked"] = True
    return approved


BRIEF_LIMIT = 400


def _brief(value) -> str:
    text = json.dumps(value, ensure_ascii=False)
    return text if len(text) <= BRIEF_LIMIT else text[:BRIEF_LIMIT] + " …"


def _show_list(before, after) -> None:
    """Показывает, что в списке добавилось и что убыло.

    Печатать список целиком «было» и «станет» бесполезно: шесть текстовых
    условий против пяти — две стены текста, отличающиеся одним элементом.
    Человек подтверждает, не имея возможности прочитать, а это то же
    самое, что не показывать вовсе.
    """
    removed = [item for item in before if item not in after]
    added = [item for item in after if item not in before]

    if not removed and not added:
        print("  изменился только порядок")
        return
    for item in removed:
        print("  убрать:   ", _brief(item))
    for item in added:
        print("  добавить: ", _brief(item))


def _one_line(value) -> str:
    """Значение в одну строку, без цитат и заметок — они и есть вся масса."""
    if value is None:
        return "пусто"
    if isinstance(value, dict):
        short = {k: v for k, v in value.items() if k not in ("evidence", "note")}
        return _brief(short)
    return _brief(value)


def show_new(program: dict) -> list[str]:
    """Как показать запись, которой ещё нет.

    Диффом новую запись показывать бессмысленно: «было null, станет ...»
    повторяется двенадцать раз и хоронит вопрос об утверждении под стеной
    JSON. Человек перестаёт читать — а чтение здесь и есть вся работа,
    ради которой шаг существует.
    """
    lines = []
    name = (program.get("name") or {}).get("ru") or program.get("id")
    lines.append(f"  {name}")
    lines.append(f"  {program.get('hostCountry')}, {program.get('level')}")

    coverage = program.get("coverage") or {}
    words = {True: "да", False: "нет", None: "не сказано"}
    lines.append(
        "  покрытие: обучение "
        f"{words.get(coverage.get('tuition'), '?')}"
        f", проживание {words.get(coverage.get('living'), '?')}"
        f", дорога {words.get(coverage.get('travel'), '?')}"
    )
    note = (coverage.get("note") or {}).get("ru")
    if note:
        lines.append(f"    {note}")

    deadline = program.get("deadline") or {}
    lines.append(
        f"  приём: {deadline.get('opens')} — {deadline.get('closes')}"
        f" ({deadline.get('confidence')})"
    )
    lines.append(f"  подача: {program.get('applyUrl')}")

    lines.append("  правила допуска:")
    rules = program.get("eligibility") or {}
    for field in FIELDS:
        lines.append(f"    {field:<15} {_one_line(rules.get(field))}")

    conditions = program.get("textConditions") or []
    lines.append(f"  условия текстом ({len(conditions)}):")
    for number, condition in enumerate(conditions, 1):
        lines.append(f"    {number}. {(condition.get('ru') or '')}")

    lines.append(f"  запись целиком, с цитатами: proposed/{program.get('id')}.json")
    return lines


def _show(change: dict) -> None:
    print(f"\n=== {change['field']} ===")
    before, after = change["before"], change["after"]

    if isinstance(before, list) or isinstance(after, list):
        _show_list(before or [], after or [])
        return

    print("было:  ", _brief(before))
    print("станет:", _brief(after))


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    proposed_dir = root / "proposed"
    programs_dir = root / "data" / "programs"
    programs_dir.mkdir(parents=True, exist_ok=True)

    candidates = sorted(proposed_dir.glob("*.json")) if proposed_dir.exists() else []
    if not candidates:
        print("В proposed/ нет ни одной записи. Сначала tools.fetch и tools.extract.")
        return 1

    for path in candidates:
        program_id = path.stem
        proposed = json.loads(path.read_text(encoding="utf-8"))

        snapshot_dir = latest_snapshot(root, program_id)
        if snapshot_dir is None:
            print(f"{program_id}: законченного снимка нет, сначала python -m tools.fetch")
            continue
        meta = json.loads((snapshot_dir / "meta.json").read_text(encoding="utf-8"))
        text = "\n\n".join(
            p.read_text(encoding="utf-8") for p in sorted(snapshot_dir.glob("*.txt"))
        )

        # Обязательные поля здесь не требуем: их ещё можно заполнить
        # подписью ниже, а отвергнуть запись до этого — значит не дать
        # её заполнить вообще.
        problems = validate_program(proposed, text, check_required=False)
        if problems:
            print(f"\n{program_id}: запись не прошла проверку, утверждать нечего:")
            for problem in problems:
                print("  -", problem)
            continue

        target = programs_dir / f"{program_id}.json"
        current = json.loads(target.read_text(encoding="utf-8")) if target.exists() else None

        # Отказы привязываются к отпечатку всего источника: человек
        # отвечает, глядя на объединённый текст всех страниц, значит и
        # переспрашивать надо при изменении любой из них.
        content_hash = source_fingerprint(meta["pages"])
        proposed = merge_proposed(current, proposed)
        changes = field_changes(current, proposed) + other_changes(current, proposed)
        empty = unasked_fields(proposed, current, content_hash)

        # Пустые поля — повод зайти, даже когда правила не менялись:
        # запись могла быть утверждена раньше, а подписи под отсутствием
        # требований ещё не поставлены.
        if not changes and not empty:
            print(f"{program_id}: изменений нет")
            continue

        if changes:
            if current is None:
                print(f"\n{program_id}: новая запись, такой ещё нет")
                for line in show_new(proposed):
                    print(line)
            else:
                print(f"\n{program_id}: изменений {len(changes)}")
                for change in changes:
                    _show(change)

            if not ask("\nУтвердить эту запись целиком? [да/нет] "):
                print("пропущено")
                continue
        else:
            print(f"\n{program_id}: правила не менялись, но есть пустые поля")

        if empty:
            print(f"\nОсталось {len(empty)} пустых полей.")
            print("Пустое поле красит карточку в жёлтый: «программа не указывает».")
            print("Если ты открывал страницу и требования там правда нет — скажи да,")
            print("и поле перестанет желтить выдачу. Подпись будет твоя, не модели.")
            today = date.today().isoformat()
            declined = []
            print(f"Проверить самому: python -m tools.look {program_id} <слово>")
            for field in empty:
                if not ask(f"  {field}: требования на странице нет? [да/нет] "):
                    declined.append(field)
                    continue
                note = input("     чем именно ручаешься (одной строкой): ").strip()
                if not note:
                    print("     без пояснения подпись не ставится, пропускаю")
                    continue
                proposed = sign_absence(proposed, field, today, note)

            # Отказ запоминается вместе с хешем снимка: пока источник не
            # изменился, второй раз не спросим.
            if declined:
                proposed = remember_declined(proposed, declined, content_hash)

            if not changes and not field_changes(current, proposed) and not declined:
                print(f"{program_id}: ничего не подписано, запись не тронута")
                continue

        # Проверяем то, что действительно запишется: после слияния с
        # утверждённой записью и после подписей. Перенесённое правило могло
        # опираться на цитату, которой в новом снимке уже нет.
        problems = validate_program(proposed, text)
        if problems:
            print(f"\n{program_id}: итоговая запись не проходит проверку:")
            for problem in problems:
                print("  -", problem)
            print("Ничего не записано.")
            continue

        approved = approve(proposed, date.today().isoformat(), meta["pages"])
        target.write_text(
            json.dumps(approved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"{program_id}: записано в {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

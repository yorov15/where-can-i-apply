"""Механические проверки записи. Без модели, без сети.

Главная из них — проверка цитат. Каждое evidence обязано найтись в
скачанном тексте обычным поиском подстроки. Модель, придумавшая
требование, не может придумать к нему цитату, которая там найдётся.
"""

import re
from datetime import date
from urllib.parse import urlparse

from tools.schema import (
    CONDITION_KINDS,
    APPLY_CHANNEL_TYPES,
    FIELDS,
    LANGUAGE_TESTS,
    EXAM_TESTS,
    EXAM_LIMITS,
    FEE_CURRENCIES,
    RELATIVE_BOUNDS,
    REQUIRED_FIELDS,
    SCALES,
    SIGNERS,
    TAGS_REQUIRED,
    VALUE_KEYS,
    is_country_code,
)
from tools.snapshot import normalize

MIN_AGE = 15
MAX_AGE = 60

MONTH_DAY = re.compile(r"^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")


def validate_program(
    program: dict, snapshot_text: str, check_required: bool = True, require_tags=None
) -> list[str]:
    """Проверяет запись. С check_required=False не требует обязательных полей.

    Так проверяют предложение модели до того, как человек поставил подписи:
    пустое обязательное поле на этом шаге ещё можно заполнить, и отвергать
    из-за него всю запись — значит не дать её заполнить вообще. Перед
    записью на диск проверка идёт полная.
    """
    if require_tags is None:
        require_tags = TAGS_REQUIRED
    problems = []
    haystack = normalize(snapshot_text)
    eligibility = program.get("eligibility") or {}

    for extra in sorted(set(eligibility) - set(FIELDS)):
        problems.append(f"лишнее поле в eligibility: {extra}")

    for field in FIELDS:
        rule = eligibility.get(field)
        if rule is None:
            if field in REQUIRED_FIELDS and check_required:
                problems.append(
                    f"{field}: обязательное поле, null запрещён — "
                    "нужно правило или явное «ограничения нет» с цитатой"
                )
            continue

        if rule.get("noLimit") is True:
            problems.extend(_check_absence(field, rule))
            continue

        evidence = rule.get("evidence")
        if not evidence:
            problems.append(f"{field}: нет цитаты из источника")
        elif normalize(evidence) not in haystack:
            problems.append(f"{field}: цитата не найдена в тексте источника — {evidence!r}")

        # У порога экзамена может быть своя цитата: IELTS и TOEFL часто
        # стоят в разных строках таблицы, и одной фразой их не накрыть.
        # Проверяется она так же, как цитата правила.
        for requirement in rule.get("anyOf") or []:
            own = requirement.get("evidence")
            if own and normalize(own) not in haystack:
                problems.append(
                    f"{field}: цитата к {requirement.get('test')} не найдена "
                    f"в тексте источника — {own!r}"
                )

        if rule.get("definedBy") is not None:
            problems.extend(_check_delegated(field, rule))
            continue

        if rule.get("notMeasured") is not None:
            problems.extend(_check_not_measured(field, rule))
            continue

        problems.extend(_check_numbers_have_evidence(field, rule))
        problems.extend(_check_rule_shape(field, rule))

    # Условия текстом доезжают до карточки так же, как правила, и их
    # цитаты проверяются тем же способом. Долго не проверялись вовсе — и
    # прогон по всем карточкам нашёл две цитаты, которых в снимке нет
    # дословно: в одной запятая стояла не там, в другой была точка,
    # которой на странице нет.
    for number, condition in enumerate(program.get("textConditions") or [], 1):
        quote = condition.get("evidence")
        if not quote:
            problems.append(f"условие {number}: нет цитаты из источника")
        elif normalize(quote) not in haystack:
            problems.append(
                f"условие {number}: цитата не найдена в тексте источника — {quote!r}"
            )
        problems.extend(_check_condition_tags(number, condition, require_tags))
        problems.extend(_check_fee(number, condition, haystack))

    # Флаг «есть другой путь» без слов, какой именно, — пустая отговорка:
    # карточка написала бы «или экзамен вуза» и не сказала бы, что за экзамен.
    exam = (program.get("eligibility") or {}).get("exam") or {}
    if exam.get("alternative") is True and not any(
        c.get("kind") == "workaround" and c.get("field") == "exam"
        for c in program.get("textConditions") or []
    ):
        problems.append("exam: alternative без условия kind=workaround по полю exam — не сказано, какой это путь")

    problems.extend(_check_deadline(program.get("deadline") or {}))
    problems.extend(_check_apply_channel(program.get("applyChannel"), haystack))
    return problems


def _https_url(value, allow_http=False):
    if not isinstance(value, str):
        return False
    try:
        parsed = urlparse(value)
        schemes = ('http', 'https') if allow_http else ('https',)
        return parsed.scheme in schemes and bool(parsed.hostname) and not parsed.username and not parsed.password
    except ValueError:
        return False


def _check_apply_channel(channel, haystack):
    if channel is None:
        return []
    if not isinstance(channel, dict) or set(channel) != {'routes'}:
        return ['applyChannel: нужен объект с единственным полем routes']
    routes = channel['routes']
    if not isinstance(routes, list) or not 1 <= len(routes) <= 6:
        return ['applyChannel.routes: нужен список от 1 до 6 подтверждённых маршрутов']
    problems, seen = [], set()
    for i, route in enumerate(routes, 1):
        where = f'applyChannel.routes[{i}]'
        if not isinstance(route, dict):
            problems.append(f'{where}: нужен объект')
            continue
        if set(route) != {'type', 'name', 'url', 'note', 'evidence', 'source'}:
            problems.append(f'{where}: нужны type, name, url, note, evidence, source без лишних полей')
        if route.get('type') not in APPLY_CHANNEL_TYPES:
            problems.append(f'{where}.type: неизвестный тип канала')
        for key, limit, required in [('name', 120, True), ('note', 240, route.get('url') is None)]:
            value = route.get(key)
            if not isinstance(value, str) or len(value) > limit or (required and not value.strip()) or '\ufffd' in value:
                problems.append(f'{where}.{key}: нужен текст до {limit} знаков без U+FFFD')
        url = route.get('url')
        if url is not None:
            if not _https_url(url, allow_http=True):
                problems.append(f'{where}.url: нужен HTTP(S)-адрес или null с пояснением адресата')
            elif normalize(url) not in haystack:
                problems.append(f'{where}.url: ссылка не найдена в снимке источника')
        quote = route.get('evidence')
        if not isinstance(quote, str) or not quote.strip() or '\ufffd' in quote:
            problems.append(f'{where}.evidence: нужна цитата без U+FFFD')
        elif normalize(quote) not in haystack:
            problems.append(f'{where}.evidence: цитата не найдена в снимке источника')
        source = route.get('source')
        if not isinstance(source, dict) or set(source) != {'url', 'lastVerified', 'contentHash'}:
            problems.append(f'{where}.source: нужны url, lastVerified и contentHash')
        else:
            if not _https_url(source['url']):
                problems.append(f'{where}.source.url: нужен HTTPS-адрес')
            try:
                if not isinstance(source['lastVerified'], str) or date.fromisoformat(source['lastVerified']).isoformat() != source['lastVerified']:
                    raise ValueError
            except ValueError:
                problems.append(f'{where}.source.lastVerified: нужна настоящая дата')
            if not re.fullmatch(r'sha256:[0-9a-f]{64}', str(source['contentHash'])):
                problems.append(f'{where}.source.contentHash: нужен SHA-256 снимка')
        identity = (str(route.get('type')), str(route.get('name')), str(url))
        if identity in seen:
            problems.append(f'{where}: маршрут повторяется')
        seen.add(identity)
    return problems


NUMBER = re.compile(r"\d+(?:[.,]\d+)?")
THOUSANDS = re.compile(r"\d{1,3}(?:,\d{3})+")


def _numbers_in(text: str) -> set:
    found = set()
    for raw in NUMBER.findall(text or ""):
        value = raw.replace(",", ".")
        found.add(value)
        found.add(value.rstrip("0").rstrip("."))
    # «1,400» в английском тексте — тысяча четыреста, а не 1,4. Без этого
    # порог SAT 1400 не находился в честной цитате Tohoku.
    for raw in THOUSANDS.findall(text or ""):
        found.add(raw.replace(",", ""))
    return found


def _check_numbers_have_evidence(field: str, rule: dict) -> list[str]:
    """Порог обязан стоять в той же цитате, что его подтверждает.

    Иначе получается правило, которое выглядит проверенным и не является
    им. У KAIST под требованием «IELTS 6.5» стояла цитата «нужно сдать
    один из экзаменов»: она доказывает, что сертификат нужен, и ничего
    не говорит про 6.5. Само число при этом взялось из соседней таблицы —
    в тот раз верное, но проверка его не видела, и следующее могло
    оказаться выдуманным.
    """
    evidence = rule.get("evidence")
    if not evidence:
        return []

    problems = []

    def check(name, value, quote):
        if value is None:
            return
        known = _numbers_in(quote)
        text = str(value)
        if text not in known and text.rstrip("0").rstrip(".") not in known:
            problems.append(
                f"{field}: {name} = {value}, но этого числа нет в цитате — "
                f"порог должен подтверждаться той же цитатой, {quote!r}"
            )

    for key in ("min", "max", "maxExclusive"):
        check(key, rule.get(key), evidence)
    # Порог со своей цитатой проверяется по ней, а не по цитате правила:
    # иначе число могло бы «подтвердиться» соседней строкой таблицы.
    for requirement in rule.get("anyOf") or []:
        check(
            f"{requirement.get('test')} min",
            requirement.get("min"),
            requirement.get("evidence") or evidence,
        )
    return problems


def _check_absence(field: str, rule: dict) -> list[str]:
    """Проверяет правило, которым человек ручается за отсутствие требования.

    Цитаты тут нет и быть не может, поэтому вместо неё требуется подпись:
    кто и когда смотрел. И ни одного значения — ручаться можно только за
    отсутствие ограничения. Как только появляется число, работает обычный
    путь с обязательной цитатой, и соврать «возраст до 25, я проверил»
    этим способом нельзя.
    """
    problems = []

    present = sorted(VALUE_KEYS & set(rule))
    if present:
        problems.append(
            f"{field}: noLimit не может стоять вместе со значениями "
            f"({', '.join(present)}) — за число нужна цитата"
        )
    if rule.get("evidence") is not None:
        problems.append(f"{field}: при noLimit цитата должна быть null")
    if rule.get("checkedBy") not in SIGNERS:
        problems.append(f"{field}: noLimit требует checkedBy — одно из {', '.join(SIGNERS)}")
    if not _is_iso_date(rule.get("checkedAt")):
        problems.append(f"{field}: noLimit требует checkedAt в формате ГГГГ-ММ-ДД")
    if not rule.get("note"):
        problems.append(f"{field}: noLimit требует note — что именно смотрели")
    if rule.get("definedBy") is not None:
        problems.append(f"{field}: noLimit и definedBy вместе — это разные утверждения")
    if rule.get("notMeasured") is not None:
        problems.append(
            f"{field}: noLimit и notMeasured вместе — это противоположные утверждения: "
            "первое говорит «требования нет», второе «требование есть»"
        )

    return problems


def _check_delegated(field: str, rule: dict) -> list[str]:
    """Правило, которое отсылает к принимающему вузу.

    Цитата здесь обязательна, в отличие от подписи человека: это не
    утверждение об отсутствии требования, а пересказ того, что написано
    в источнике. И значений быть не может — если бы порог был известен,
    он бы и записывался, а не отсылка.
    """
    problems = []

    if rule.get("definedBy") != "institution":
        problems.append(
            f"{field}: definedBy знает только значение 'institution', "
            f"а не {rule.get('definedBy')!r}"
        )
    present = sorted(VALUE_KEYS & set(rule))
    if present:
        problems.append(
            f"{field}: definedBy не может стоять вместе со значениями "
            f"({', '.join(present)}) — либо порог известен, либо его задаёт вуз"
        )
    return problems


def _check_not_measured(field: str, rule: dict) -> list[str]:
    """Требование есть, но инструмент его не считает.

    Цитата обязательна, и это главное: пометка говорит «требование
    названо в источнике», значит источник должен его называть. Без этой
    проверки состояние превратилось бы в удобную отговорку — им можно
    было бы объявить требованием что угодно, не показав ни строчки.

    Значений быть не может: если требование выражается числом, его надо
    записать числом, а не прятать за пометкой.
    """
    problems = []

    if rule.get("notMeasured") is not True:
        problems.append(
            f"{field}: notMeasured знает только значение true, "
            f"а не {rule.get('notMeasured')!r}"
        )
    present = sorted(VALUE_KEYS & set(rule))
    if present:
        problems.append(
            f"{field}: notMeasured не может стоять вместе со значениями "
            f"({', '.join(present)}) — число записывается числом"
        )
    if rule.get("noLimit") is not None:
        problems.append(f"{field}: notMeasured и noLimit вместе — это противоположные утверждения")
    return problems


def _check_rule_shape(field: str, rule: dict) -> list[str]:
    problems = []

    if field in ("citizenship", "schoolCountry"):
        allow = rule.get("allow")
        if allow != "*" and not isinstance(allow, list):
            problems.append(f"{field}: allow должно быть '*' или списком")
        codes = list(rule.get("deny") or [])
        if isinstance(allow, list):
            codes += allow
        for code in codes:
            if not is_country_code(code):
                problems.append(f"{field}: неверный код страны — {code!r}")

    if field == "age":
        for bound in ("min", "max", "maxExclusive"):
            value = rule.get(bound)
            if value is not None and not (MIN_AGE <= value <= MAX_AGE):
                problems.append(
                    f"age: возраст {value} вне разумных границ {MIN_AGE}-{MAX_AGE}"
                )
        if rule.get("max") is not None and rule.get("maxExclusive") is not None:
            problems.append(
                "age: max и maxExclusive вместе — верхняя граница должна быть одна"
            )
        # asOf разрешено не указывать: источник часто не говорит, на какой
        # момент считается возраст, а придумывать дату нельзя. Движок тогда
        # считает на дату закрытия приёма и честно отмечает пограничные случаи.
        problems.extend(_check_as_of(rule.get("asOf")))

    if field == "graduationYear":
        relative = rule.get("maxRelative")
        if relative is not None:
            if relative not in RELATIVE_BOUNDS:
                problems.append(
                    f"graduationYear: неизвестная относительная граница — {relative!r}"
                )
            if rule.get("max") is not None:
                problems.append(
                    "graduationYear: max и maxRelative вместе — граница должна быть одна"
                )

    if field == "gpa":
        scale = rule.get("scale")
        if scale not in SCALES:
            problems.append(f"gpa: неизвестная шкала — {scale!r}")

    if field == "exam":
        # Порога у SAT/ACT часто нет: «пришли один из двух» — тоже правило,
        # тогда min = null. Экзамен, который программа не требует
        # (test-optional), записывается как optional: true с цитатой.
        if "optional" in rule and rule["optional"] is not True:
            problems.append("exam: optional знает только значение true")
        for requirement in rule.get("anyOf") or []:
            test = requirement.get("test")
            if test not in EXAM_TESTS:
                problems.append(
                    f"exam: экзамена {test!r} анкета не знает — одно из {', '.join(sorted(EXAM_TESTS))}"
                )
                continue
            minimum = requirement.get("min")
            low, high = EXAM_LIMITS[test]
            if minimum is not None and not (low <= minimum <= high):
                problems.append(f"exam: порог {test} {minimum} вне границ {low}-{high}")
        if rule.get("optional") is True and not (rule.get("anyOf") or []):
            problems.append("exam: optional без anyOf — непонятно, о каких экзаменах речь")
        if "alternative" in rule and rule["alternative"] is not True:
            problems.append("exam: alternative знает только значение true")
        if rule.get("alternative") is True:
            if not (rule.get("anyOf") or []):
                problems.append("exam: alternative без anyOf — не с чем сравнивать другой путь")
            if rule.get("optional") is True:
                problems.append("exam: alternative вместе с optional — экзамен не может быть и необязательным, и заменяемым")

    if field == "language":
        for requirement in rule.get("anyOf") or []:
            if "test" not in requirement or "min" not in requirement:
                problems.append("language: в требовании нет test или min")
            elif requirement["test"] not in LANGUAGE_TESTS:
                problems.append(
                    f"language: экзамена {requirement['test']!r} анкета не знает — "
                    f"одно из {', '.join(sorted(LANGUAGE_TESTS))}"
                )
            # Флаг говорит «общего балла мало, есть ещё минимумы по
            # частям». Числа по частям сюда писать нельзя: анкета их не
            # спрашивает, и записанное число выглядело бы проверенным,
            # не будучи проверкой. Сами числа живут текстовым условием.
            if "parts" in requirement and requirement["parts"] is not True:
                problems.append(
                    f"language: parts у {requirement.get('test')!r} — только true; "
                    "числа по частям идут текстовым условием"
                )

    return problems


def _check_as_of(as_of) -> list[str]:
    """На какой момент считается возраст.

    Кроме отсутствия, 'deadline' и явной даты есть четвёртая форма:
    дата, считаемая из года приёма. Венгрия меряет возраст на 31 августа
    года заезда, MEXT — на 1 апреля; записанные числом, такие даты
    устаревают через цикл и молча ошибаются на пограничных людях.
    """
    if as_of is None or as_of == "deadline" or _is_iso_date(as_of):
        return []

    if isinstance(as_of, dict):
        problems = []
        if as_of.get("relativeTo") != "applicationYear":
            problems.append(
                "age: asOf.relativeTo знает только 'applicationYear', "
                f"а не {as_of.get('relativeTo')!r}"
            )
        month_day = as_of.get("monthDay")
        if not isinstance(month_day, str) or not MONTH_DAY.match(month_day):
            problems.append(f"age: asOf.monthDay должно быть ММ-ДД, а не {month_day!r}")
        return problems

    return [
        "age: asOf должно быть 'deadline', датой ГГГГ-ММ-ДД, "
        "объектом с relativeTo и monthDay или отсутствовать"
    ]


def _check_deadline(deadline: dict) -> list[str]:
    problems = []
    opens, closes = deadline.get("opens"), deadline.get("closes")
    for name, value in (("opens", opens), ("closes", closes)):
        if value is not None and not _is_iso_date(value):
            problems.append(f"deadline.{name}: не дата в формате ГГГГ-ММ-ДД")
    if opens and closes and closes < opens:
        problems.append("deadline: дата закрытия раньше даты открытия")
    if deadline.get("confidence") not in ("confirmed", "expected"):
        problems.append("deadline.confidence: должно быть confirmed или expected")
    return problems


def _is_iso_date(value) -> bool:
    if not isinstance(value, str) or len(value) != 10:
        return False
    parts = value.split("-")
    return len(parts) == 3 and all(part.isdigit() for part in parts)


def _check_fee(number: int, condition: dict, haystack: str) -> list[str]:
    """Разметка платы за подачу: число обязано стоять в собственной цитате.

    Без этого сумма в плане выглядела бы проверенной, а держалась бы на
    пересказе. Ноль — «платы нет» — числом в цитате не подтверждается:
    вместо него цитата должна прямо говорить об отсутствии платы.
    """
    fee = condition.get("fee")
    if fee is None:
        return []
    where = f"условие {number}: fee"
    problems = []
    amount = fee.get("amount")
    if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount < 0:
        problems.append(f"{where}.amount: нужно неотрицательное число")
    if fee.get("currency") not in FEE_CURRENCIES and not (amount == 0 and fee.get("currency") is None):
        problems.append(f"{where}.currency: неизвестная валюта {fee.get('currency')!r}")
    if "source" in fee:
        source = fee["source"]
        if not isinstance(source, dict):
            problems.append(f"{where}.source: нужен объект источника")
        else:
            url = source.get("url")
            if not isinstance(url, str) or urlparse(url).scheme != "https" or not urlparse(url).hostname:
                problems.append(f"{where}.source.url: нужен HTTPS-адрес")
            verified = source.get("lastVerified")
            try:
                if not isinstance(verified, str) or date.fromisoformat(verified).isoformat() != verified:
                    raise ValueError
            except ValueError:
                problems.append(f"{where}.source.lastVerified: нужна настоящая дата")
            if not re.fullmatch(r"sha256:[0-9a-f]{64}", str(source.get("contentHash", ""))):
                problems.append(f"{where}.source.contentHash: нужен SHA-256 снимка")
    if fee.get("waivedForAid") not in (None, True):
        problems.append(f"{where}.waivedForAid: только значение true")
    if "unconditional" in fee and (type(fee["unconditional"]) is not bool or amount != 0):
        problems.append(f"{where}.unconditional: boolean только для нулевого взноса")
    quote = fee.get("evidence")
    if not quote:
        return problems + [f"{where}: нет собственной цитаты"]
    if '\ufffd' in quote:
        problems.append(f"{where}: повреждённая UTF-8 цитата содержит U+FFFD")
    if normalize(quote) not in haystack:
        problems.append(f"{where}: цитата не найдена в тексте источника — {quote!r}")
    elif amount == 0:
        if not re.search(r"\b(no|not|without|free)\b", quote, re.IGNORECASE):
            problems.append(f"{where}: ноль без слов об отсутствии платы в цитате")
    elif isinstance(amount, (int, float)) and not isinstance(amount, bool):
        # Разделители тысяч — запятая или пробел: «10,000», «30 000». PDF
        # с растянутыми буквами даёт «150 , 000» — запятая в пробелах.
        numbers = {
            float(re.sub(r"[,\s]", "", raw))
            for raw in re.findall(r"\d+(?:(?:\s*,\s*|\s)\d{3})*(?:\.\d+)?", quote)
        }
        if float(amount) not in numbers:
            problems.append(f"{where}.amount: числа {amount} нет в цитате")
    if fee.get("waivedForAid") and "waive" not in (quote or "").lower():
        problems.append(f"{where}.waivedForAid: в цитате нет слова о снятии платы")
    return problems


def _check_condition_tags(number: int, condition: dict, required: bool) -> list[str]:
    problems = []
    kind = condition.get("kind")
    field = condition.get("field")
    if kind is None:
        if required:
            problems.append(f"условие {number}: нет kind — непонятно, что человеку с ним делать")
    elif kind not in CONDITION_KINDS:
        problems.append(f"условие {number}: неизвестный kind {kind!r}")
    if field is not None and field not in FIELDS:
        problems.append(f"условие {number}: field {field!r} — не поле анкеты")
    if kind == "workaround" and not field:
        problems.append(f"условие {number}: обходной путь без field — непонятно, что он обходит")
    if any(key in condition for key in ('docVariant', 'docTitle', 'docExtras')) and 'doc' not in condition:
        problems.append(f'условие {number}: разметка документа без doc')
    if 'doc' in condition:
        from tools.documents import CODE, action_title
        code = condition['doc']
        if kind != 'documents' or 'test' in condition or not isinstance(code, str) or not CODE.fullmatch(code):
            problems.append(f'условие {number}: неверный код документа или его kind')
        if not action_title(condition.get('docTitle')):
            problems.append(f'условие {number}: docTitle — действие до 80 знаков')
        variant = condition.get('docVariant')
        if variant is not None and (not isinstance(variant, str) or not CODE.fullmatch(variant)):
            problems.append(f'условие {number}: неверный docVariant')
        extras = condition.get('docExtras', [])
        if not isinstance(extras, list):
            problems.append(f'условие {number}: docExtras — список')
        else:
            for extra in extras:
                if not isinstance(extra, dict) or not isinstance(extra.get('code'), str) or not CODE.fullmatch(extra['code']) or not action_title(extra.get('title')) or not isinstance(extra.get('variant'), str) or not CODE.fullmatch(extra['variant']):
                    problems.append(f'условие {number}: неверное дополнительное действие документа')
    if "test" in condition:
        tag = condition["test"]
        if kind != "documents" or not isinstance(tag, dict):
            problems.append(f"условие {number}: test — объект разметки документа-экзамена")
        else:
            if set(tag) != {"group", "title"} or not isinstance(tag.get("group"), str) or tag.get("group") not in {
                "english", "standard", "chinese", "csca", "language"
            }:
                problems.append(f"условие {number}: неизвестная группа или поля test")
            title = tag.get("title")
            if not isinstance(title, str) or not title.strip() or len(title) > 80:
                problems.append(f"условие {number}: test.title — непустое действие до 80 знаков")
    return problems

"""Слежение за «ручными» программами: их страницы тоже можно скачать.

Источник помечен ручным, если файл кладёт человек: сайт отдавал
программе 412, прятал документ за формой или рисовался скриптом. Но
слежение из-за этого пропускало все 128 таких программ целиком, хотя
у большинства сами адреса открываются обычной загрузкой.

Сравнить скачанную страницу с хешем из карточки нельзя: файл в manual/
мог быть пересохранён браузером или набран из окна. Поэтому у ручных
программ своя точка отсчёта: хеши первой удачной загрузки, в
watch/live-hashes.json. Первая загрузка ничего не сообщает, а каждая
следующая сообщает об изменении один раз и сдвигает точку отсчёта.

Страница, которая меняется сама по себе (счётчики, «сегодня»), при
первой загрузке скачивается дважды: если хеши разные, она помечается
как нестабильная и не сторожится. Иначе робот краснел бы каждый день.
"""

import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from tools.fetch import page_to_text
from tools.snapshot import sha256_of_text, strip_volatile

UNSTABLE = "unstable"


def load_state(path) -> dict:
    path = Path(path)
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_state(path, state: dict) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")


def _hash(fetcher, url: str, volatile: list) -> str:
    return sha256_of_text(strip_volatile(page_to_text(fetcher(url)), volatile))


def _fresh(fetcher, url: str, volatile: list, known):
    """(хеш, второй хеш для первой загрузки) или None, если страница недоступна."""
    try:
        first = _hash(fetcher, url, volatile)
    except Exception:
        return None
    if known is not None:
        return first, first
    try:
        return first, _hash(fetcher, url, volatile)
    except Exception:
        return first, None


def watch_pages(urls: list, volatile: list, previous: dict, fetcher):
    """Сверяет страницы ручной программы с прошлой загрузкой.

    Возвращает (новые хеши, изменившиеся адреса, недоступные адреса).
    Недоступная страница оставляет прежний хеш: сайт мог лежать час.
    Страницы качаются параллельно: их сотни, и по одной прогон шёл бы часами.
    """
    hashes = dict(previous)
    changed, unreachable = [], []
    with ThreadPoolExecutor(6) as pool:
        results = list(pool.map(lambda u: _fresh(fetcher, u, volatile, previous.get(u)), urls))
    for url, result in zip(urls, results):
        if result is None:
            unreachable.append(url)
            continue
        fresh, again = result
        known = hashes.get(url)
        if known is None:
            hashes[url] = fresh if again == fresh else UNSTABLE
        elif known == UNSTABLE:
            continue
        elif known != fresh:
            changed.append(url)
            hashes[url] = fresh
    return hashes, changed, unreachable

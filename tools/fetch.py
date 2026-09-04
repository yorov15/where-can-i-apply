"""Скачивание снимков утверждённых страниц.

Снимок кладётся текстом с датой в имени папки. Текст, а не HTML: он
нужен, чтобы проверка цитат работала не только в момент скачивания, но и
через полгода, когда кто-то спросит, откуда взялось число.

fetcher передаётся аргументом, а не берётся из urllib внутри: так шаг
проверяется тестом без сети, а сеть живёт ровно в одном месте.
"""

import json
import shutil
import sys
import time
import urllib.request
from datetime import date
from pathlib import Path

from tools.pdf import pdf_to_text
from tools.snapshot import html_to_text, sha256_of_text, strip_volatile
from tools.sources import check_sources, load_sources

# Только ASCII: значения заголовков HTTP кодируются в latin-1, и кириллица
# роняет запрос в http.client ещё до отправки, с UnicodeEncodeError.
USER_AGENT = "eligibility-tool/0.1 (educational project; collecting admission requirements)"
TIMEOUT_SECONDS = 30

PDF_MAGIC = b"%PDF-"


def kind_of(raw: bytes) -> str:
    """Что нам прислали — страницу или PDF.

    Тип определяется по самому файлу, а не по адресу и не по заголовку
    ответа: ссылка без .pdf в конце может отдавать PDF, и наоборот.
    """
    return "pdf" if raw[: len(PDF_MAGIC)] == PDF_MAGIC else "html"


def page_to_text(raw: bytes) -> str:
    """Превращает скачанное в текст, откуда бы оно ни пришло.

    После этого шага PDF перестаёт быть особенным: проверка цитат,
    подписи человека и слежение работают с ним ровно так же, как со
    страницей.
    """
    if kind_of(raw) == "pdf":
        return pdf_to_text(raw)
    return html_to_text(raw.decode("utf-8", errors="replace"))


RETRIES = 3
RETRY_PAUSE_SECONDS = 3


def with_retries(fetcher, attempts: int = RETRIES, pause: float = RETRY_PAUSE_SECONDS, sleep=time.sleep):
    """Повторяет скачивание несколько раз, прежде чем сдаться.

    Связь рвётся не только у нас: она рвётся у всех, кто сидит на
    мобильном интернете, а это вся аудитория инструмента. Одна неудачная
    попытка не повод бросать работу.
    """
    def fetch(url):
        last = None
        for attempt in range(1, attempts + 1):
            try:
                return fetcher(url)
            except Exception as error:
                last = error
                if attempt < attempts:
                    print(f"   попытка {attempt} не удалась ({type(error).__name__}), повтор")
                    sleep(pause)
        raise last

    return fetch


def latest_snapshot(root, program_id: str):
    """Последний снимок, доведённый до конца.

    Признак законченности — meta.json: он пишется после всех страниц.
    Папка без него осталась от прерванного скачивания, и брать её за
    снимок нельзя: цитаты проверялись бы по обрубку текста.
    """
    folder = Path(root) / "raw" / program_id
    if not folder.exists():
        return None
    finished = [
        path
        for path in sorted(folder.iterdir())
        if path.is_dir() and (path / "meta.json").exists()
    ]
    return finished[-1] if finished else None


def snapshot_paths(root, program_id: str, today: str) -> Path:
    return Path(root) / "raw" / program_id / today


def save_snapshots(
    root, program_id: str, urls, today: str, fetcher, volatile=(), files=()
) -> dict:
    """Сохраняет текст страниц и считает их хеши.

    Текст сохраняется целиком: по нему проверяются цитаты. Хеш же
    считается без изменчивых кусков (volatile) — счётчик просмотров на
    странице растёт при каждом заходе, и без этой чистки слежение
    сообщало бы об изменении требований после каждой проверки.
    """
    folder = snapshot_paths(root, program_id, today)
    folder.mkdir(parents=True, exist_ok=True)

    # Сначала то, что скачивается, потом то, что человек сохранил сам.
    # Дальше по конвейеру разницы нет: тот же текст, тот же хеш, та же
    # проверка цитат — источник помечен только для слежения.
    incoming = [(url, None) for url in urls]
    incoming += [(item["url"], Path(root) / item["path"]) for item in files]

    pages = []
    for number, (url, path) in enumerate(incoming):
        raw = path.read_bytes() if path is not None else fetcher(url)
        text = page_to_text(raw)
        name = f"{number:02d}.txt"
        (folder / name).write_text(text, encoding="utf-8")
        stable = strip_volatile(text, volatile)
        pages.append(
            {
                "url": url,
                "file": name,
                "kind": kind_of(raw),
                "origin": "manual" if path is not None else "web",
                "contentHash": sha256_of_text(stable),
            }
        )

    meta = {"programId": program_id, "fetchedAt": today, "pages": pages}
    (folder / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return meta


def http_fetch(url: str) -> bytes:
    """Отдаёт байты, а не строку: в строку PDF не помещается."""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return response.read()


def chosen(raw: dict, wanted) -> tuple[dict, list[str]]:
    """Оставляет только названные программы. Возвращает их и незнакомые имена."""
    if not wanted:
        return raw, []
    unknown = [name for name in wanted if name not in raw]
    return {name: raw[name] for name in wanted if name in raw}, unknown


def main(argv=None) -> int:
    # Качать все семь программ, чтобы добавить одну, — это лишние два
    # десятка обращений к чужим серверам и новые снимки там, где ничего
    # не менялось.
    wanted = [arg for arg in (argv if argv is not None else sys.argv[1:]) if not arg.startswith("-")]

    root = Path(__file__).resolve().parent.parent
    raw = load_sources(root / "tools" / "sources.toml")

    problems = check_sources(raw)
    if problems:
        for problem in problems:
            print(problem)
        return 1

    if not raw:
        print("В tools/sources.toml нет ни одного источника. Вписывать их — работа человека.")
        return 1

    raw, unknown = chosen(raw, wanted)
    if unknown:
        print("Нет таких программ в tools/sources.toml: " + ", ".join(unknown))
        return 1

    today = date.today().isoformat()
    fetcher = with_retries(http_fetch)
    failed = []

    for program_id, entry in raw.items():
        try:
            meta = save_snapshots(
                root,
                program_id,
                entry.get("urls", []),
                today,
                fetcher,
                entry.get("volatile", []),
                entry.get("files", []),
            )
            print(f"{program_id}: снято страниц {len(meta['pages'])}")
        except Exception as error:
            # Одна недоступная страница не повод бросать остальные
            # программы. Незаконченную папку убираем: без meta.json она
            # обрубок, и следующий шаг не должен принять её за снимок.
            failed.append(program_id)
            shutil.rmtree(snapshot_paths(root, program_id, today), ignore_errors=True)
            print(f"{program_id}: НЕ СНЯТО — {error}")

    if failed:
        print("\nНе снято: " + ", ".join(failed))
        print("Прошлые снимки этих программ целы, работать можно на них.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

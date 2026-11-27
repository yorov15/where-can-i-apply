"""Сообщить Bing, Яндексу и другим участникам IndexNow о новых и изменённых страницах.

Запускать ПОСЛЕ выкладки на Vercel: поисковик проверяет ключ по живому адресу.
Без --send только печатает, что отправил бы.

    python -m tools.indexnow --since 2026-11-27 --send
    python -m tools.indexnow --prefix countries/ --prefix topics/ --send
    python -m tools.indexnow --all --send
"""
import argparse
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlsplit

from tools.seo import ORIGIN

ENDPOINT = "https://api.indexnow.org/indexnow"
LIMIT = 10_000  # предел протокола на один запрос
ROOT = Path(__file__).resolve().parent.parent


def find_key(root: Path):
    """Ключ — файл <ключ>.txt в корне сайта, внутри тот же ключ."""
    for path in sorted(root.glob("*.txt")):
        if re.fullmatch(r"[0-9a-f]{32}", path.stem) and path.read_text(encoding="utf-8").strip() == path.stem:
            return path.stem
    raise SystemExit("Нет файла ключа IndexNow (<32 hex>.txt) в корне сайта")


def sitemap_entries(root: Path):
    tree = ET.parse(root / "sitemap.xml").getroot()
    for node in tree.findall("{*}url"):
        loc = node.findtext("{*}loc")
        lastmod = node.findtext("{*}lastmod")
        if loc:
            yield loc.strip(), (lastmod or "").strip() or None


def select(entries, since=None, prefixes=(), everything=False):
    chosen = []
    for loc, lastmod in entries:
        if not loc.startswith(ORIGIN + "/"):
            continue
        path = loc[len(ORIGIN) + 1:]
        if everything or (since and lastmod and lastmod >= since) or any(path.startswith(p) for p in prefixes):
            chosen.append(loc)
    return list(dict.fromkeys(chosen))


def payload(urls, key):
    host = urlsplit(ORIGIN).hostname
    return {"host": host, "key": key, "keyLocation": f"{ORIGIN}/{key}.txt", "urlList": urls}


def send(body):
    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.status


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--since", help="страницы с lastmod не раньше этой даты (ГГГГ-ММ-ДД)")
    parser.add_argument("--prefix", action="append", default=[], help="путь страницы начинается с… (можно несколько)")
    parser.add_argument("--all", action="store_true", help="все адреса из sitemap.xml")
    parser.add_argument("--send", action="store_true", help="действительно отправить; без флага только список")
    args = parser.parse_args(argv)
    if args.since and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.since):
        parser.error("--since: дата в виде ГГГГ-ММ-ДД")
    if not (args.since or args.prefix or args.all):
        parser.error("укажи --since, --prefix или --all")
    key = find_key(ROOT)
    urls = select(sitemap_entries(ROOT), args.since, tuple(args.prefix), args.all)
    print(f"Адресов к отправке: {len(urls)}")
    for url in urls[:20]:
        print("  " + url)
    if len(urls) > 20:
        print(f"  … и ещё {len(urls) - 20}")
    if not urls or not args.send:
        return 0
    for start in range(0, len(urls), LIMIT):
        status = send(payload(urls[start:start + LIMIT], key))
        # 200 и 202 — приняли; это не значит «проиндексировали».
        print(f"IndexNow ответил {status}")
        if status not in (200, 202):
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Аудит ссылок: что в данных и на страницах не открывается или переехало.

Обходит все адреса из data/programs/*.json (applyUrl, source.url,
source.pages) и из статических страниц сайта (*.html). Для каждого
записывает код ответа и цепочку перенаправлений. Ничего не правит:
переехавший адрес чинит человек, сверив новую страницу с цитатами.

    python -m tools.links                 — отчёт по всем
    python -m tools.links --only-apply    — только applyUrl
    python -m tools.links --json out.json — ещё и в файл

Код выхода 1, если нашлась хоть одна мёртвая ссылка (4xx/5xx или обрыв).
Перенаправления — предупреждение, а не ошибка: адрес рабочий, но запись
лучше перевести на конечный.
"""

import json
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from tools.fetch import TIMEOUT_SECONDS, USER_AGENT, tls_context

URL_RE = re.compile(r"https?://[^\s\"'<>)\\]+")
TRAILING = ".,;:"


class _Trace(urllib.request.HTTPRedirectHandler):
    """Запоминает каждый шаг цепочки перенаправлений."""

    def __init__(self):
        super().__init__()
        self.hops = []

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.hops.append((code, newurl))
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def urls_in_text(text: str) -> set[str]:
    return {match.rstrip(TRAILING) for match in URL_RE.findall(text)}


def collect(root: Path, only_apply: bool = False) -> dict[str, list[str]]:
    """адрес -> где он встречается."""
    found: dict[str, list[str]] = {}

    def add(url, where):
        found.setdefault(url, []).append(where)

    for path in sorted((root / "data" / "programs").glob("*.json")):
        program = json.loads(path.read_text(encoding="utf-8"))
        if program.get("applyUrl"):
            add(program["applyUrl"], f"{path.stem}.applyUrl")
        if only_apply:
            continue
        source = program.get("source") or {}
        if source.get("url"):
            add(source["url"], f"{path.stem}.source.url")
        for page in source.get("pages") or []:
            add(page["url"], f"{path.stem}.source.pages")
    if not only_apply:
        for path in sorted(root.glob("*.html")):
            for url in urls_in_text(path.read_text(encoding="utf-8")):
                add(url, path.name)
    return found


def probe(url: str) -> dict:
    """Один запрос. GET, а не HEAD: часть сайтов отвечает на HEAD ошибкой."""
    trace = _Trace()
    opener = urllib.request.build_opener(
        trace, urllib.request.HTTPSHandler(context=tls_context())
    )
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    result = {"url": url, "status": None, "final": url, "hops": [], "error": None}
    try:
        with opener.open(request, timeout=TIMEOUT_SECONDS) as response:
            response.read(2048)
            result["status"] = response.status
            result["final"] = response.geturl()
    except urllib.error.HTTPError as error:
        result["status"] = error.code
        result["final"] = error.geturl() or url
    except Exception as error:
        result["error"] = f"{type(error).__name__}: {error}"
    result["hops"] = [{"code": code, "to": target} for code, target in trace.hops]
    return result


def classify(result: dict) -> str:
    if result["error"] or result["status"] is None or result["status"] >= 400:
        return "DEAD"
    if result["hops"] and result["final"].rstrip("/") != result["url"].rstrip("/"):
        return "MOVED"
    return "OK"


def main(argv=None) -> int:
    args = list(argv if argv is not None else sys.argv[1:])
    only_apply = "--only-apply" in args
    out = args[args.index("--json") + 1] if "--json" in args else None

    root = Path(__file__).resolve().parent.parent
    found = collect(root, only_apply)
    print(f"Адресов: {len(found)}")

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(probe, sorted(found)))

    report = []
    for result in results:
        result["state"] = classify(result)
        result["where"] = found[result["url"]]
        report.append(result)

    for state in ("DEAD", "MOVED"):
        rows = [r for r in report if r["state"] == state]
        if not rows:
            continue
        print(f"\n{state}: {len(rows)}")
        for r in rows:
            code = r["error"] or r["status"]
            print(f"  [{code}] {r['url']}")
            if state == "MOVED":
                print(f"      -> {r['final']}   ({', '.join(str(h['code']) for h in r['hops'])})")
            print(f"      в: {', '.join(sorted(set(r['where'])))}")
    print(f"\nОК: {sum(r['state'] == 'OK' for r in report)} из {len(report)}")

    if out:
        Path(out).write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    return 1 if any(r["state"] == "DEAD" for r in report) else 0


if __name__ == "__main__":
    sys.exit(main())

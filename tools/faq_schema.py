"""FAQPage-разметка для faq.html.

Источник — сами вопросы на странице, поэтому текст не дублируется руками и не
расходится при правках. Скрипт идемпотентен: повторный запуск даёт тот же файл.

    python -m tools.faq_schema
"""
import base64
import hashlib
import html
import json
import re
from pathlib import Path

START = "<!-- faq-schema:start -->"
END = "<!-- faq-schema:end -->"
ORIGIN = "https://nerio-app.vercel.app"
PAGE_URL = ORIGIN + "/faq.html"

DETAILS = re.compile(r"<details[^>]*>\s*<summary>(.*?)</summary>(.*?)</details>", re.S)
TAGS = re.compile(r"<[^>]+>")
SPACES = re.compile(r"\s+")
CSP_SCRIPT = re.compile(r"(<meta http-equiv=\"Content-Security-Policy\" content=\"[^\"]*?script-src 'self')(?: 'sha256-[^']+')?(;)")


def plain(value: str) -> str:
    return SPACES.sub(" ", html.unescape(TAGS.sub(" ", value))).strip()


def pairs(source: str) -> list[tuple[str, str]]:
    found = []
    for match in DETAILS.finditer(source):
        question = plain(match.group(1))
        answer = plain(match.group(2))
        if question and answer:
            found.append((question, answer))
    return found


def block(items: list[tuple[str, str]]) -> tuple[str, str]:
    data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "url": PAGE_URL,
        "inLanguage": "ru",
        "mainEntity": [
            {"@type": "Question", "name": question, "acceptedAnswer": {"@type": "Answer", "text": answer}}
            for question, answer in items
        ],
    }
    content = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    digest = base64.b64encode(hashlib.sha256(content.encode()).digest()).decode()
    return f'{START}<script type="application/ld+json">{content}</script>{END}', f"'sha256-{digest}'"


def render(source: str) -> str:
    items = pairs(source)
    if not items:
        raise ValueError("faq.html: не найдено ни одного вопроса")
    fragment, digest = block(items)
    stripped = re.sub(r"\n?" + re.escape(START) + r".*?" + re.escape(END), "", source, flags=re.S)
    updated, replaced = CSP_SCRIPT.subn(lambda m: m.group(1) + " " + digest + m.group(2), stripped, count=1)
    if not replaced:
        raise ValueError("faq.html: не нашёл script-src в Content-Security-Policy")
    return updated.replace("</head>", fragment + "\n</head>", 1)


def write(root: Path) -> int:
    path = root / "faq.html"
    source = path.read_text(encoding="utf-8")
    updated = render(source)
    if updated != source:
        path.write_text(updated, encoding="utf-8")
    return len(pairs(updated))


if __name__ == "__main__":
    print(write(Path(__file__).resolve().parents[1]))

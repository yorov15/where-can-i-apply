"""Checked document instructions. No guessed issuing times or unsafe sharing."""
import json
import re
from pathlib import Path
from tools.route import _is_http, _is_iso_day

CODE = re.compile(r"^[a-z][a-z0-9-]{0,79}$")
ACTION = re.compile(r"^(Подготовить|Запросить|Получить|Попросить|Написать|Заполнить|Проверить|Заказать|Подписать|Выбрать|Решить|Описать|Скачать|Перевести),?\s")

def action_title(value):
    return isinstance(value, str) and len(value) <= 80 and bool(ACTION.search(value))

def load_documents(programs: list[dict], directory: Path):
    documents, problems = {}, []
    published = {p['id']: p for p in programs if p.get('status') == 'published'}
    if not directory.exists():
        return documents, problems
    for path in sorted(directory.glob('*.json')):
        try:
            item = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, ValueError) as error:
            problems.append(f'{path.name}: invalid document JSON: {error}')
            continue
        if not isinstance(item, dict):
            problems.append(f'{path.name}: expected document object')
            continue
        code = item.get('code')
        if not isinstance(code, str) or not CODE.fullmatch(code) or code != path.stem:
            problems.append(f'{path.name}: invalid document code')
            continue
        if not action_title(item.get('title')):
            problems.append(f'{path.name}: action title required, at most 80 characters')
        for key in ('where', 'who'):
            if not isinstance(item.get(key), str) or not item[key].strip():
                problems.append(f'{path.name}: {key} required')
        source = item.get('source')
        if not isinstance(source, dict):
            problems.append(f'{path.name}: source required')
        else:
            owner = published.get(source.get('program'), {}) if isinstance(source.get('program'), str) else {}
            quote = source.get('quote')
            pages = owner.get('source', {}).get('pages', [])
            if not _is_http(source.get('url')) or not _is_iso_day(source.get('lastVerified')):
                problems.append(f'{path.name}: source URL and verified date required')
            if not isinstance(source.get('contentHash'), str) or not re.fullmatch(r'sha256:[0-9a-f]{64}', source['contentHash']):
                problems.append(f'{path.name}: source SHA-256 required')
            if not quote or quote not in [c.get('evidence') for c in owner.get('textConditions', [])]:
                problems.append(f'{path.name}: quote must belong to a published source condition')
            if not any(p.get('url') == source.get('url') and p.get('contentHash') == source.get('contentHash') for p in pages):
                problems.append(f'{path.name}: source hash must match an approved page')
        wait = item.get('waitDays')
        if wait is not None:
            wait_source = item.get('waitSource', {})
            if isinstance(wait, bool) or not isinstance(wait, int) or wait < 0 or item.get('estimate') is not True:
                problems.append(f'{path.name}: waitDays must be a labelled nonnegative estimate or null')
            if not isinstance(wait_source, dict) or not _is_http(wait_source.get('url')) or not isinstance(wait_source.get('quote'), str) or not wait_source['quote'].strip() or not _is_iso_day(wait_source.get('lastVerified')) or not isinstance(wait_source.get('contentHash'), str) or not re.fullmatch(r'sha256:[0-9a-f]{64}', wait_source['contentHash']):
                problems.append(f'{path.name}: wait estimate requires its own source')
        documents[code] = item
    return documents, problems

def check_document_refs(programs, prepared_ids, documents):
    problems = []
    for program in programs:
        for index, condition in enumerate(program.get('textConditions', [])):
            if condition.get('kind') != 'documents' or condition.get('test'):
                continue
            code = condition.get('doc')
            where = f"{program['id']} condition {index + 1}"
            if program['id'] in prepared_ids and documents and not code:
                problems.append(f'{where}: prepared document needs doc classification')
            if code and code not in documents:
                problems.append(f'{where}: unknown doc {code}')
            if code and not action_title(condition.get('docTitle', documents.get(code, {}).get('title'))):
                problems.append(f'{where}: invalid document action title')
            extras = condition.get('docExtras', [])
            if not isinstance(extras, list):
                problems.append(f'{where}: docExtras must be a list')
                continue
            for extra in extras:
                if not isinstance(extra, dict) or not isinstance(extra.get('code'), str) or extra.get('code') not in documents or not action_title(extra.get('title')):
                    problems.append(f'{where}: invalid extra document action')
    return problems

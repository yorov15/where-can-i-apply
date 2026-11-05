"""Проверенные условия снятия взноса, независимо от свежести остальных правил вуза."""
import hashlib
import json
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit
from tools.sources import load_sources


def load_fee_waivers(root: Path) -> list[dict]:
    value = json.loads((root / 'data/fee-waivers.json').read_text(encoding='utf-8'))
    if value.get('version') != 1 or not isinstance(value.get('programs'), list):
        raise ValueError('fee-waivers: неизвестная версия или нет списка программ')
    sources = load_sources(root / 'tools/sources.toml')
    added = json.loads((root / 'tools/fee-waiver-sources.json').read_text(encoding='utf-8'))
    checked = []
    ids = set()
    for entry in value['programs']:
        program_id = entry.get('programId')
        if program_id in ids or program_id not in sources:
            raise ValueError(f'fee-waivers: неизвестный или повторный id {program_id}')
        ids.add(program_id)
        known = sources[program_id]
        hosts = {urlsplit(url).hostname for url in known.get('urls', [])}
        hosts.update(urlsplit(item['url']).hostname for item in known.get('files', []))
        source = entry.get('source', {})
        url = urlsplit(source.get('url', ''))
        approval = added.get(url.hostname, {})
        if url.scheme != 'https' or url.username or url.password or not url.hostname:
            raise ValueError(f'{program_id}: неверный адрес источника')
        if url.hostname not in hosts and not (approval.get('approvedBy') == 'Murod' and approval.get('approval')):
            raise ValueError(f'{program_id}: домен источника не одобрен')
        if entry.get('mode') not in {'request', 'automatic', 'unavailable'} or entry.get('scope') not in {'international', 'allApplicants', 'notSpecified'}:
            raise ValueError(f'{program_id}: неверные режим или аудитория')
        if entry['mode'] == 'automatic' and entry['scope'] == 'notSpecified':
            raise ValueError(f'{program_id}: автоматическое снятие не подтверждено для аудитории')
        for field in ('ru', 'action'):
            if not isinstance(entry.get(field), str) or not entry[field].strip() or len(entry[field]) > 1000:
                raise ValueError(f'{program_id}: нет текста {field}')
        verified = date.fromisoformat(source.get('lastVerified', ''))
        if verified > date.today() or source.get('verifiedBy') != 'assistant':
            raise ValueError(f'{program_id}: неверная дата или подпись проверки')
        snapshot = source.get('snapshot', '')
        if snapshot != f'raw/fee-waivers/{program_id}.txt':
            raise ValueError(f'{program_id}: неверный путь снимка')
        # Хеш считаем по UTF-8/LF, чтобы checkout Windows не менял доказательство.
        content = (root / snapshot).read_text(encoding='utf-8').replace('\r\n', '\n')
        digest = 'sha256:' + hashlib.sha256(content.encode('utf-8')).hexdigest()
        if source.get('contentHash') != digest:
            raise ValueError(f'{program_id}: хеш снимка не совпал')
        evidence = entry.get('evidence')
        if not isinstance(evidence, list) or not evidence or any(not isinstance(q, str) or not q.strip() or q not in content for q in evidence):
            raise ValueError(f'{program_id}: цитата не найдена в снимке')
        checked.append(entry)
    return checked


def attach_fee_waivers(details: dict, entries: list[dict]) -> None:
    for entry in entries:
        target = details['programs'].get(entry['programId'])
        if target is None:
            raise ValueError(f"fee-waivers: нет опубликованной программы {entry['programId']}")
        target['feeWaiver'] = {key: entry[key] for key in ('mode', 'scope', 'ru', 'action')}
        target['feeWaiver']['source'] = {key: entry['source'][key] for key in ('url', 'lastVerified')}

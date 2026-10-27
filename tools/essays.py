"""Validate essay requirements against excerpts of approved programme pages."""
import hashlib
import re
from pathlib import Path
from tools.snapshot import normalize


def source_problems(source, program, root: Path):
    from tools.route import _is_http, _is_iso_day
    if not isinstance(source, dict):
        return ['essay source required']
    errors = []
    if not _is_http(source.get('url')) or not _is_iso_day(source.get('lastVerified')):
        errors.append('essay source URL/date required')
    if not any(page.get('url') == source.get('url') and page.get('contentHash') == source.get('pageHash')
               for page in program.get('source', {}).get('pages', [])):
        errors.append('essay source must match an approved programme page')
    try:
        path = (root / source['snapshot']).resolve()
        if not path.is_relative_to((root / 'raw/essays').resolve()) or path.stat().st_size > 32768:
            raise ValueError('snapshot path/size')
        body = path.read_bytes().replace(b'\r\n', b'\n')
        if 'sha256:' + hashlib.sha256(body).hexdigest() != source.get('contentHash'):
            errors.append('essay snapshot hash mismatch')
        quotes = source.get('quotes')
        if not isinstance(quotes, list) or not quotes or any(not isinstance(q, str) or not q.strip()
                or normalize(q) not in normalize(body.decode('utf-8')) for q in quotes):
            errors.append('essay quote absent from snapshot')
    except (OSError, ValueError, KeyError, TypeError):
        errors.append('invalid essay source snapshot')
    return errors


def validate_essays(prep, program, root):
    if 'essays' not in prep and 'essayPolicy' not in prep:
        return []
    essays, policy = prep.get('essays'), prep.get('essayPolicy')
    if not isinstance(essays, list) or not 1 <= len(essays) <= 12:
        return ['essays must be a nonempty list of at most 12 fields']
    errors, ids = [], set()
    if not isinstance(policy, dict) or policy.get('review') not in ('unknown', 'blocked'):
        errors.append('essay policy required; silence does not mean AI permission')
    elif policy['review'] == 'blocked':
        errors += source_problems(policy.get('source'), program, root)
        if not isinstance(policy.get('note'), str) or not policy['note'].strip():
            errors.append('blocked essay review needs an explanation')
    for item in essays:
        if not isinstance(item, dict):
            errors.append('invalid essay'); continue
        ident = item.get('id')
        if not isinstance(ident, str) or not re.fullmatch('[a-z0-9-]{1,60}', ident) or ident in ids:
            errors.append('invalid or duplicate essay id')
        else:
            ids.add(ident)
        if not isinstance(item.get('title'), str) or not 1 <= len(item['title']) <= 80:
            errors.append('essay title required, at most 80 characters')
        prompt = item.get('prompt')
        source = item.get('source')
        errors += source_problems(source, program, root)
        quotes = source.get('quotes', []) if isinstance(source, dict) else []
        text = ' '.join(q for q in quotes if isinstance(q, str))
        if prompt is not None and (not isinstance(prompt, str) or not 1 <= len(prompt) <= 4000
                or normalize(prompt) not in normalize(text)):
            errors.append('essay prompt must be quoted from the source, or null')
        requirements = item.get('requirements')
        if not isinstance(requirements, list) or not requirements or any(not isinstance(r, str) or not 1 <= len(r) <= 1500 for r in requirements):
            errors.append('essay requirements required')
        for unit in ('characters', 'bytes'):
            value = item.get(unit)
            if value is not None:
                if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 10000:
                    errors.append(f'invalid essay {unit}')
                elif not re.search(rf'\b{value}\s+{unit}\b', text.replace(',', '')):
                    errors.append(f'essay {unit} bound absent from source')
        words = item.get('words')
        if words is not None:
            if not isinstance(words, dict) or not words or set(words) - {'min', 'max'} or any(isinstance(v, bool) or not isinstance(v, int) or not 1 <= v <= 10000 for v in words.values()):
                errors.append('invalid essay word range')
            elif words.get('min', 0) > words.get('max', 10000):
                errors.append('inverted essay word range')
            elif not re.search(r'\bwords?\b', text) or any(not re.search(rf'\b{v}\b', text) for v in words.values()):
                errors.append('essay word range absent from source')
    return errors

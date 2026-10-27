"""Validation of sourced exam timing; unknown dates never become defaults."""
import hashlib
import re
from pathlib import Path
from tools.snapshot import normalize

def source_problems(source, root, label):
    from tools.route import _is_http, _is_iso_day
    if not isinstance(source, dict): return [f'{label}: source required']
    errors = []
    if not _is_http(source.get('url')) or not _is_iso_day(source.get('lastVerified')): errors.append(f'{label}: URL/date required')
    for key in ('contentHash', 'pageHash'):
        if not isinstance(source.get(key), str) or not re.fullmatch(r'sha256:[0-9a-f]{64}', source[key]): errors.append(f'{label}: {key} required')
    snapshot = source.get('snapshot')
    try:
        path = (root / snapshot).resolve() if isinstance(snapshot, str) else None
        if path is None or not path.is_relative_to((root/'raw/exams').resolve()) or path.stat().st_size > 65536:
            raise ValueError('invalid snapshot path')
        # Git on Windows may check out text as CRLF; excerpts are hashed as LF.
        body = path.read_bytes().replace(b'\r\n', b'\n')
        if 'sha256:'+hashlib.sha256(body).hexdigest() != source.get('contentHash'): errors.append(f'{label}: snapshot hash mismatch')
        quotes = source.get('quotes')
        if not isinstance(quotes, list) or not quotes or any(not isinstance(q, str) or not q.strip() or normalize(q) not in normalize(body.decode('utf-8')) for q in quotes): errors.append(f'{label}: quote absent from snapshot')
    except (OSError, ValueError, TypeError): errors.append(f'{label}: invalid source snapshot')
    return errors

def validate_per_part(per_part, program):
    from tools.route import _is_iso_day
    errors = []
    if not isinstance(per_part, dict): return ['invalid perPart']
    for test, requirement in per_part.items():
        if not isinstance(test, str) or not isinstance(requirement, dict):
            errors.append('invalid perPart entry')
            continue
        values, source = requirement.get('minimums'), requirement.get('source')
        if not isinstance(values, dict) or not values or any(not isinstance(k,str) or not isinstance(v,(int,float)) or isinstance(v,bool) or not 0<=v<=1000 for k,v in values.items()): errors.append('invalid perPart minimums')
        evidence = program.get('eligibility', {}).get('language', {}).get('evidence')
        pages = program.get('source', {}).get('pages', [])
        if not isinstance(source,dict) or source.get('quote') != evidence or not _is_iso_day(source.get('lastVerified')) or not any(p.get('url')==source.get('url') and p.get('contentHash')==source.get('contentHash') for p in pages): errors.append('perPart source does not match approved programme evidence')
    return errors

def validate_timing(track, root: Path):
    from tools.route import _is_iso_day
    errors = []
    def numeric(value): return isinstance(value, (int,float)) and not isinstance(value,bool) and 0 <= value <= 365
    def interval(value): return isinstance(value,list) and len(value)==2 and all(numeric(x) for x in value) and value[0]<=value[1]
    parts = track.get('parts', [])
    if not isinstance(parts, list) or any(not isinstance(p,dict) or not isinstance(p.get('code'),str) or not isinstance(p.get('name'),str) for p in parts): errors.append('invalid exam parts')
    elif parts: errors += source_problems(track.get('partsSource'),root,'parts')
    results = track.get('resultDays')
    if results is not None:
        if not isinstance(results,dict) or not results or any(not isinstance(k,str) or not interval(v) for k,v in results.items()): errors.append('invalid resultDays')
        errors += source_problems(track.get('resultSource'),root,'results')
    if track.get('reportDays') is not None:
        if not interval(track['reportDays']): errors.append('invalid reportDays')
        errors += source_problems(track.get('reportSource') or track.get('resultSource'),root,'report')
    rule = track.get('retakeRule')
    if rule is not None:
        if not isinstance(rule,dict) or not numeric(rule.get('minDays')) or not isinstance(rule.get('text'),str): errors.append('invalid retakeRule')
        else: errors += source_problems(rule.get('source'),root,'retake')
    sessions = track.get('sessions', [])
    if not isinstance(sessions,list): errors.append('invalid sessions')
    else:
        for session in sessions:
            if not isinstance(session,dict) or not _is_iso_day(session.get('date')) or not _is_iso_day(session.get('result')) or session['result'] < session['date']: errors.append('invalid session dates')
        if sessions: errors += source_problems(track.get('sessionsSource'),root,'sessions')
    return errors

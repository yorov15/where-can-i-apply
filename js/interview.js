// Репетиция собеседования: вопросы, таймер и хранение ответов. Чистые
// функции — экран лежит в interview-view.js, тесты читают этот файл.
//
// Что у программы есть собеседование, решает сборка (tools/interview.py):
// она кладёт в data/interview.json дословные цитаты-основания. Здесь их
// только проверяют и показывают; собственных фактов о программах тут нет.

export const THINK_CHOICES = [15, 30, 60, 90];
export const ANSWER_CHOICES = [60, 120, 180, 300];
export const DEFAULT_SETTINGS = Object.freeze({ thinkSec: 30, answerSec: 120 });
export const MAX_ANSWERS = 60;
export const MAX_CUSTOM = 30;
export const MAX_ANSWER_TEXT = 3000;
export const MAX_QUESTION_TEXT = 300;

export const CHECKS = [
  ['answered', 'Ответил именно на вопрос'],
  ['example', 'Привёл один конкретный пример'],
  ['lesson', 'Сказал, что из этого вынес'],
  ['time', 'Уложился во время'],
  ['natural', 'Говорил своими словами, без заученных фраз'],
];
const CHECK_KEYS = new Set(CHECKS.map(([key]) => key));

// Общие вопросы для тренировки. Это не факты о программах, поэтому без
// цитат; экран подписывает их как «не от программы».
export const GENERAL_QUESTIONS = [
  ['about', 'Расскажи о себе.', 'Tell me about yourself.'],
  ['why-program', 'Почему ты выбрал эту программу?', 'Why did you choose this program?'],
  ['why-subject', 'Почему ты хочешь изучать эту специальность?', 'Why do you want to study this subject?'],
  ['why-country', 'Почему ты хочешь учиться именно в этой стране?', 'Why do you want to study in this country?'],
  ['challenge', 'Расскажи о трудности, которую ты преодолел.', 'Tell me about a challenge you have overcome.'],
  ['proud', 'Каким своим делом ты гордишься больше всего?', 'What achievement are you most proud of?'],
  ['reading', 'Какая книга, статья или видео недавно тебя зацепили? Чем?', 'What book, article or video has interested you recently, and why?'],
  ['team', 'Расскажи о работе в команде. Что сделал именно ты?', 'Tell me about a time you worked in a team. What was your part?'],
  ['mistake', 'Расскажи об ошибке и о том, что ты из неё вынес.', 'Tell me about a mistake you made and what you learned from it.'],
  ['strengths', 'Какая у тебя сильная сторона и какая слабая?', 'What are your strengths and weaknesses?'],
  ['outside', 'Чем ты занимаешься вне уроков?', 'What do you do outside of class?'],
  ['future', 'Кем ты видишь себя через пять лет после учёбы?', 'Where do you see yourself five years after graduating?'],
  ['home', 'Как ты используешь то, чему научишься, у себя дома?', 'How will you use what you learn in your home country?'],
  ['community', 'Что ты принесёшь в жизнь университета?', 'What will you bring to our university community?'],
  ['questions', 'Какие у тебя есть вопросы к нам?', 'Do you have any questions for us?'],
].map(([id, ru, en]) => ({ id: `g:${id}`, ru, en, from: 'general' }));

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeId = value => typeof value === 'string' && /^[a-z0-9:._-]{1,200}$/i.test(value)
  && !['__proto__', 'constructor', 'prototype'].includes(value);
const isDay = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
const seconds = (value, max) => Number.isInteger(value) && value >= 0 && value <= max ? value : null;

// ——— цитата-основание ———

// Запись программы из data/interview.json или null. Запись без цитаты,
// с пустой цитатой или с чужой ссылкой не годится: кнопка «Потренировать
// собеседование» без основания была бы фактом из ниоткуда.
export function interviewFor(data, id) {
  const entry = object(data?.programs) && Object.hasOwn(data.programs, id) ? data.programs[id] : null;
  if (!object(entry) || !Array.isArray(entry.quotes)) return null;
  const pick = item => object(item) && typeof item.evidence === 'string' && item.evidence.trim()
    ? { evidence: item.evidence.trim(), ru: typeof item.ru === 'string' ? item.ru : '' } : null;
  const quotes = entry.quotes.map(pick).filter(Boolean);
  if (!quotes.length) return null;
  const url = typeof entry.url === 'string' && /^https?:\/\//.test(entry.url) ? entry.url : null;
  return {
    quotes,
    topics: (Array.isArray(entry.topics) ? entry.topics : []).map(pick).filter(Boolean),
    url,
    lastVerified: isDay(entry.lastVerified) ? entry.lastVerified : null,
  };
}

// Язык цитаты — для атрибута lang: экранный диктор прочтёт её правильно.
export function quoteLang(value) {
  if (/[가-힣]/.test(value)) return 'ko';
  if (/[぀-ヿ]/.test(value)) return 'ja';
  if (/[一-鿿]/.test(value)) return 'zh';
  if (/[а-яё]/i.test(value)) return 'ru';
  return 'en';
}

// ——— вопросы ———

// Сначала то, что сказала программа (с цитатой), потом общие, потом свои.
export function questionsFor(programId, entry, state) {
  const program = (entry?.topics ?? []).map((topic, index) => ({
    id: `p:${programId}:${index}`, ru: topic.ru || topic.evidence, evidence: topic.evidence, from: 'program',
  }));
  const custom = (interviewOf(state).custom ?? []).map(item => ({ id: item.id, ru: item.text, from: 'custom' }));
  return { program, general: GENERAL_QUESTIONS, custom };
}

// ——— таймер ———
// Сессия — обычный объект с отметками времени, а не тикающий счётчик:
// если вкладку усыпили или экран перерисовали, остаток считается заново
// от часов, и таймер не «отстаёт».

export function startSession(settings, now) {
  const { thinkSec, answerSec } = cleanSettings(settings);
  return { phase: 'think', since: now, thinkSec, answerSec, usedSec: null };
}

export function advance(session, now) {
  let next = session;
  if (next.phase === 'think' && now - next.since >= next.thinkSec * 1000) {
    next = { ...next, phase: 'answer', since: next.since + next.thinkSec * 1000 };
  }
  if (next.phase === 'answer' && now - next.since >= next.answerSec * 1000) {
    next = { ...next, phase: 'review', since: next.since + next.answerSec * 1000, usedSec: next.answerSec };
  }
  return next;
}

// «Начать отвечать» и «Закончить ответ»: пропустить остаток фазы.
export function skip(session, now) {
  const current = advance(session, now);
  if (current.phase === 'think') return { ...current, phase: 'answer', since: now };
  if (current.phase === 'answer') {
    const used = Math.max(0, Math.round((now - current.since) / 1000));
    return { ...current, phase: 'review', since: now, usedSec: Math.min(used, current.answerSec) };
  }
  return current;
}

export function remaining(session, now) {
  const total = session.phase === 'think' ? session.thinkSec : session.phase === 'answer' ? session.answerSec : 0;
  return Math.max(0, Math.ceil(total - (now - session.since) / 1000));
}

// Что сказать экранному диктору. Не каждую секунду, а только на рубежах:
// начало фазы, «осталась минута», «осталось 10 секунд», конец. Экран
// объявляет, только когда ключ сменился.
export function milestone(session, now) {
  const left = remaining(session, now);
  if (session.phase === 'review') return { key: 'review', text: 'Ответ закончен. Отметь самопроверку.' };
  if (session.phase === 'think') {
    if (left <= 10 && session.thinkSec > 20) return { key: 'think:10', text: 'Осталось 10 секунд на обдумывание.' };
    return { key: 'think', text: `Обдумай ответ: ${spoken(session.thinkSec)}.` };
  }
  if (left <= 10 && session.answerSec > 20) return { key: 'answer:10', text: 'Осталось 10 секунд.' };
  if (left <= 60 && session.answerSec > 90) return { key: 'answer:60', text: 'Осталась минута.' };
  return { key: 'answer', text: `Отвечай: ${spoken(session.answerSec)}.` };
}

export function formatClock(total) {
  const value = Math.max(0, Math.round(total));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export function spoken(total) {
  if (total < 60) return `${total} ${plural(total, 'секунда', 'секунды', 'секунд')}`;
  const minutes = Math.floor(total / 60), rest = total % 60;
  return `${minutes} ${plural(minutes, 'минута', 'минуты', 'минут')}${rest ? ` ${rest} ${plural(rest, 'секунда', 'секунды', 'секунд')}` : ''}`;
}

function plural(n, one, few, many) {
  const tail = n % 100;
  if (tail >= 11 && tail <= 14) return many;
  if (n % 10 === 1) return one;
  return [2, 3, 4].includes(n % 10) ? few : many;
}

// ——— хранение ———
// Ответы и свои вопросы лежат в состоянии маршрута под ключом interview.
// Версия схемы та же: старый файл без ключа читается как раньше, а пустую
// запись не храним, чтобы экспорт без репетиций остался прежним.

export function cleanSettings(value) {
  return {
    thinkSec: THINK_CHOICES.includes(value?.thinkSec) ? value.thinkSec : DEFAULT_SETTINGS.thinkSec,
    answerSec: ANSWER_CHOICES.includes(value?.answerSec) ? value.answerSec : DEFAULT_SETTINGS.answerSec,
  };
}

function cleanAnswer(value) {
  if (!object(value) || !safeId(value.id) || !safeId(value.questionId) || !isDay(value.date)) return null;
  const answerSec = ANSWER_CHOICES.includes(value.answerSec) ? value.answerSec : null;
  const usedSec = seconds(value.usedSec, 3600);
  return {
    id: value.id,
    questionId: value.questionId,
    question: text(value.question, MAX_QUESTION_TEXT),
    ...(safeId(value.programId) ? { programId: value.programId } : {}),
    date: value.date,
    text: text(value.text, MAX_ANSWER_TEXT),
    ...(usedSec === null ? {} : { usedSec }),
    ...(answerSec === null ? {} : { answerSec }),
    checks: [...new Set(Array.isArray(value.checks) ? value.checks.filter(key => CHECK_KEYS.has(key)) : [])],
  };
}

// Битая запись не должна ронять весь маршрут: плохие ответы отбрасываются
// по одному, остальное сохраняется. null — хранить нечего.
export function normalizeInterview(value) {
  if (!object(value)) return null;
  const settings = cleanSettings(value.settings);
  const seen = new Set();
  const unique = item => item && !seen.has(item.id) && seen.add(item.id);
  const answers = (Array.isArray(value.answers) ? value.answers : []).map(cleanAnswer).filter(unique).slice(-MAX_ANSWERS);
  const custom = (Array.isArray(value.custom) ? value.custom : [])
    .map(item => object(item) && safeId(item.id) && item.id.startsWith('c:') && typeof item.text === 'string' && item.text.trim()
      ? { id: item.id, text: item.text.trim().slice(0, MAX_QUESTION_TEXT) } : null)
    .filter(unique).slice(0, MAX_CUSTOM);
  const customSettings = settings.thinkSec !== DEFAULT_SETTINGS.thinkSec || settings.answerSec !== DEFAULT_SETTINGS.answerSec;
  if (!answers.length && !custom.length && !customSettings) return null;
  return { ...(customSettings ? { settings } : {}), answers, custom };
}

export function interviewOf(state) {
  return normalizeInterview(state?.interview) ?? { answers: [], custom: [] };
}

function withInterview(state, interview) {
  const next = { ...state };
  const clean = normalizeInterview(interview);
  if (clean) next.interview = clean;
  else delete next.interview;
  return next;
}

export function settingsOf(state) {
  return cleanSettings(interviewOf(state).settings);
}

export function setSettings(state, settings) {
  return withInterview(state, { ...interviewOf(state), settings: cleanSettings({ ...settingsOf(state), ...settings }) });
}

// Ответ сохраняется сразу после конца фазы ответа: если человек закроет
// вкладку на самопроверке, текст не пропадёт.
export function saveAnswer(state, answer) {
  const clean = cleanAnswer(answer);
  if (!clean) return null;
  const current = interviewOf(state);
  const answers = current.answers.some(item => item.id === clean.id)
    ? current.answers.map(item => item.id === clean.id ? clean : item)
    : [...current.answers, clean];
  return withInterview(state, { ...current, answers: answers.slice(-MAX_ANSWERS) });
}

export function setChecks(state, answerId, checks) {
  const current = interviewOf(state);
  const old = current.answers.find(item => item.id === answerId);
  return old ? saveAnswer(state, { ...old, checks }) : state;
}

export function removeAnswer(state, answerId) {
  const current = interviewOf(state);
  return withInterview(state, { ...current, answers: current.answers.filter(item => item.id !== answerId) });
}

export function addQuestion(state, id, value) {
  const current = interviewOf(state);
  const clean = typeof value === 'string' ? value.trim().slice(0, MAX_QUESTION_TEXT) : '';
  if (!clean || !safeId(id) || !id.startsWith('c:') || current.custom.length >= MAX_CUSTOM) return null;
  if (current.custom.some(item => item.text === clean)) return state;
  return withInterview(state, { ...current, custom: [...current.custom, { id, text: clean }] });
}

export function removeQuestion(state, id) {
  const current = interviewOf(state);
  return withInterview(state, { ...current, custom: current.custom.filter(item => item.id !== id) });
}

export function answersFor(state, questionId) {
  return interviewOf(state).answers.filter(item => item.questionId === questionId);
}

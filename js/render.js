// Единственный файл, который трогает DOM. Правила и вердикт про него
// не знают — поэтому их можно переписать, не сломав страницу.
import { evaluate } from './verdict.js';
import { deadlineState } from './lib/deadline.js';

const VERDICT_TEXT = {
  yes: 'Подходишь',
  no: 'Не подходишь',
  check: 'Надо проверить самому',
};

const DEADLINE_TEXT = {
  open: 'Приём идёт',
  upcoming: 'Приём ещё не начался',
  closed: 'Приём закрыт',
  unknown: 'Даты приёма неизвестны',
};

const ORDER = { no: 0, check: 1, yes: 2 };

// Как называть поля профиля в тексте карточки.
const FIELD_NAMES = {
  citizenship: 'гражданство',
  schoolCountry: 'страну школы',
  schoolYears: 'годы школы',
  graduationYear: 'год выпуска',
  age: 'возраст',
  gpa: 'средний балл',
  language: 'язык',
};

export function renderResults(node, profile, programs, today) {
  node.textContent = '';

  if (!programs.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Программ пока нет. Данные собираются.';
    node.append(p);
    return;
  }

  const rows = programs.map((program) => ({
    program,
    verdict: evaluate(profile, program, today),
    deadline: deadlineState(program.deadline, today),
  }));

  // Закрытый приём уезжает вниз, но не краснеет: опоздать и не пройти
  // по возрасту — разные вещи с разными действиями.
  rows.sort((a, b) => {
    const closed = (a.deadline === 'closed') - (b.deadline === 'closed');
    if (closed !== 0) return closed;
    return ORDER[a.verdict.status] - ORDER[b.verdict.status];
  });

  for (const row of rows) node.append(card(row));
}

function card({ program, verdict, deadline }) {
  const el = document.createElement('article');
  el.className = `card ${verdict.status}${deadline === 'closed' ? ' closed' : ''}`;

  const title = document.createElement('h3');
  title.textContent = program.name?.ru ?? program.id;
  el.append(title);

  const status = document.createElement('p');
  status.className = 'verdict';
  status.textContent = VERDICT_TEXT[verdict.status];
  el.append(status);

  const when = document.createElement('p');
  when.className = 'hint';
  when.textContent = DEADLINE_TEXT[deadline];
  if (deadline !== 'unknown' && program.deadline?.closes) {
    when.textContent += ` — до ${program.deadline.closes}`;
    // Не «по прошлому году»: у многих программ окно просто повторяется
    // каждый год, а объявления на новый цикл ещё нет.
    if (program.deadline.confidence !== 'confirmed') when.textContent += ' (дата пока не подтверждена)';
  }
  el.append(when);

  if (verdict.reasons.length) {
    const list = document.createElement('ul');
    list.className = 'reasons';
    for (const reason of verdict.reasons) {
      const li = document.createElement('li');
      li.textContent = reason.message;
      list.append(li);
    }
    el.append(list);
  }

  // За этой строкой стоит подпись человека, а не цитата из источника,
  // поэтому формулировка про страницу, а не про программу: «не сказано»,
  // а не «нет ограничений».
  //
  // На красной карточке её нет: человеку, который не проходит, важна
  // причина отказа, а не перечень того, о чём страница молчит.
  if (verdict.status !== 'no' && verdict.attested?.length) {
    const names = verdict.attested.map((field) => FIELD_NAMES[field] ?? field);
    const note = document.createElement('p');
    note.className = 'attested';
    note.textContent = `На странице программы не сказано ничего про ${names.join(', ')}`;
    el.append(note);
  }

  return el;
}

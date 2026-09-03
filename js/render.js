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
    verdict: evaluate(profile, program),
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
    if (program.deadline.confidence !== 'confirmed') when.textContent += ' (дата по прошлому году)';
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

  return el;
}

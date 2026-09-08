// Единственный файл, который трогает DOM. Правила и вердикт про него
// не знают — поэтому их можно переписать, не сломав страницу.
import { evaluate } from './verdict.js';
import { deadlineState } from './lib/deadline.js';

// «Подходишь» обещает то, чего инструмент не знает: возьмут или нет,
// решает отбор. Он отвечает на другой вопрос — пустят ли подавать.
const VERDICT_TEXT = {
  yes: 'Можешь подавать',
  no: 'Подать не получится',
  check: 'Можешь подавать, но проверь сам',
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

// Отдельной функцией, потому что это единственная фраза на карточке,
// которую легко написать так, что она будет означать обратное.
export function notLimitedLine(fields) {
  const names = fields.map((field) => FIELD_NAMES[field] ?? field);
  return `Программа не ограничивает: ${names.join(', ')} — проверено по её страницам`;
}

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

  // Главное содержание карточки, а не примечание. Семь полей анкеты
  // отвечают на вопрос «пустят ли подавать», и у большинства программ
  // ответ «да» — а настоящая работа описана здесь: экзамены, выдвижение
  // школой, документы о доходах, отдельные заявки и сроки.
  //
  // Показывается на любой карточке, включая красную: именно там чаще
  // всего и лежит обходной путь.
  const conditions = (program.textConditions ?? []).filter((c) => c.ru);
  if (conditions.length) {
    const title = document.createElement('p');
    title.className = 'conditions-title';
    title.textContent = 'Что потребуется помимо анкеты:';
    el.append(title);

    const list = document.createElement('ul');
    list.className = 'conditions';
    for (const condition of conditions) {
      const li = document.createElement('li');
      li.textContent = condition.ru;
      list.append(li);
    }
    el.append(list);
  }

  // Раньше здесь стояло «на странице не сказано ничего про...». Формально
  // верно, читается как «данных нет» — и на большинстве карточек это была
  // единственная строка между вердиктом и списком условий. Но за ней
  // стоит проверка человека, и означает она обратное: перечисленное не
  // мешает. Так и написано теперь.
  //
  // На красной карточке её нет: человеку, который не проходит, важна
  // причина отказа, а не перечень того, что ему не мешает.
  if (verdict.status !== 'no' && verdict.attested?.length) {
    const note = document.createElement('p');
    note.className = 'attested';
    note.textContent = notLimitedLine(verdict.attested);
    el.append(note);
  }

  return el;
}

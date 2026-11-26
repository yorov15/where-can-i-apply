import { plural } from './lib/format.js';

// Первый проход использует настоящие цели и работы, отдельного учебного профиля нет.
export function startWork(state) {
  return state?.portfolio?.experiences?.find(entry => entry.workPlan
    && !entry.workPlan.paused && entry.workPlan.steps.some(step => !step.done))??null;
}
export function startStage(state) {
  if (startWork(state)) return 'task';
  return state?.goals?.length ? 'work' : 'goal';
}

const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node;};
function button(text,run,primary=false){const node=el('button',primary?'button':'button button-quiet',text);node.type='button';node.addEventListener('click',run);return node;}

// Суть сайта одной фразой, объём каталога — строкой ниже. Числа берём из
// данных: каталог растёт, а цифра в тексте не должна устаревать.
export const VALUE_TITLE = 'Узнай, куда за границу ты можешь подать документы';
export function catalogLine(programs) {
  const n = programs?.length ?? 0;
  const tail = 'Условия и сроки — с официальных сайтов программ.';
  if (!n) return `Университеты и стипендии за границей. ${tail}`;
  const c = new Set(programs.map((program) => program.hostCountry).filter(Boolean)).size;
  return `${n} ${plural(n, 'программа', 'программы', 'программ')} — университеты и стипендии в ${c} ${plural(c, 'стране', 'странах', 'странах')}. ${tail}`;
}
// Что человек получит, сколько это займёт и что держать под рукой —
// до кнопки, а не после (образец — стартовые страницы GOV.UK).
export const ENTRY_STEPS = [
  ['5 шагов, 2–3 минуты.', 'Школа, оценки, экзамены.'],
  ['Получишь', 'список: куда уже можно подать и до какого срока.'],
  ['Баллов не знаешь —', 'пропусти, ответ всё равно будет.'],
];

const link = (text, run) => { const node = button(text, run); node.className = 'link-button'; return node; };

// Один главный шаг на экран; остальное — тихие ссылки одной строкой.
export function renderStart(root,{state,programs,hasTask,handlers}) {
  // Главный путь — два шага: цель, затем дела поступления. Работа в портфолио — по желанию.
  const stage=startStage(state),number={goal:1,work:2}[stage];
  root.replaceChildren();root.dataset.stage=stage;
  const box=el('section','start-question');
  if(number)box.append(el('p','route-detail',`Шаг ${number} из 2`));
  const more=el('div','start-more');
  if(stage==='goal'){
    box.append(el('h2',null,VALUE_TITLE),el('p',null,catalogLine(programs)),
      button('Начать проверку',handlers.onProfile,true));
    more.append(link('Я уже знаю программу',handlers.onCatalog),link('Начать с портфолио',handlers.onWork));
  }else if(stage==='work'){
    const names=state.goals.map(id=>{const name=programs.find(item=>item.id===id)?.name;return name?.ru??(typeof name==='string'?name:id);});
    box.append(el('h2',null,'Цель выбрана. Теперь — дела поступления.'),el('p',null,`В твоём плане: ${names.join('; ')}.`),
      button('Перейти к делам поступления',handlers.onFinish,true),
      el('p','route-detail','Работа в портфолио пригодится, если программа просит портфолио или эссе.'));
    more.append(link('Добавить работу в портфолио',handlers.onWork));
  }else{
    box.append(el('h2',null,'Работа сохранена. Можно начинать.'),
      el('p',null,hasTask?'На «Сегодня» уже есть шаг твоей работы: что сделать и какой результат записать.':'В твоей работе уже есть шаги и ожидаемый результат. Открой её, чтобы начать.'),
      button(hasTask?'Открыть мой первый шаг':'Открыть мою работу',handlers.onFinish,true));
  }
  more.append(link('Без подсказок',handlers.onSkip));
  box.append(more);
  root.append(box);
}

export function renderStartGuide(root,{active,screen,workPath,onExit}){
  root.replaceChildren();root.hidden=!active||screen==='start'||screen==='today'||screen==='profile'||(screen==='route'&&!workPath);
  if(root.hidden)return;
  const work=screen==='route';
  root.append(el('strong',null,work?'Добавим твою первую работу':'Шаг 1 из 2. Выбери программу'),
    el('p',null,work?'Выбери тип работы и тему. После сохранения мы покажем, с какого действия начать.':'Нажми «В мой путь» у программы, которая тебе интересна. Потом покажем, что делать и к какому сроку.'));
  const exit=button('Скрыть подсказку',onExit);exit.className='link-button';root.append(exit);
}

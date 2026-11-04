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

// Суть сайта одной фразой. Число берём из данных: каталог растёт, а цифра в тексте не должна устаревать.
export function valueTitle(count) {
  const n = Number(count);
  if (!Number.isInteger(n) || n <= 0) return 'Проверь, в какие программы ты можешь подать документы';
  return `Проверь, в какие из ${n} ${plural(n, 'программы', 'программ', 'программ')} ты можешь подать документы`;
}
export const VALUE_LEAD = 'Ответь на вопросы о школе и экзаменах. Покажем, куда можно подать и что сделать до дедлайна.';

const link = (text, run) => { const node = button(text, run); node.className = 'link-button'; return node; };

// Один главный шаг на экран; остальное — тихие ссылки одной строкой.
export function renderStart(root,{state,programs,hasTask,handlers}) {
  const stage=startStage(state),number={goal:1,work:2,task:3}[stage];
  root.replaceChildren();root.dataset.stage=stage;
  const box=el('section','start-question');
  box.append(el('p','route-detail',`Шаг ${number} из 3`));
  const more=el('div','start-more');
  if(stage==='goal'){
    box.append(el('h2',null,valueTitle(programs?.length)),el('p',null,VALUE_LEAD),
      button('Ответить на вопросы',handlers.onProfile,true));
    more.append(link('Я уже знаю программу',handlers.onCatalog),link('Начать с портфолио',handlers.onWork));
  }else if(stage==='work'){
    const names=state.goals.map(id=>{const name=programs.find(item=>item.id===id)?.name;return name?.ru??(typeof name==='string'?name:id);});
    box.append(el('h2',null,'Цель выбрана. Теперь — твой опыт.'),el('p',null,`В твоём плане: ${names.join('; ')}.`),
      el('p',null,'Начни небольшую работу по интересной тебе теме. Nerio разобьёт её на шаги; результаты будут сохраняться в портфолио.'),
      button('Добавить первую работу',handlers.onWork,true));
    more.append(link('Сначала перейти к делам поступления',handlers.onFinish));
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
  root.replaceChildren();root.hidden=!active||screen==='start'||screen==='today'||(screen==='route'&&!workPath);
  if(root.hidden)return;
  const work=screen==='route';
  root.append(el('strong',null,work?'Добавим твою первую работу':'Выберем цель поступления'),
    el('p',null,work?'Выбери тип работы и тему. После сохранения мы покажем, с какого действия начать.':screen==='profile'?'Ответь на вопросы о школе и гражданстве. Затем выбери программу из каталога.':'Найди интересную программу и нажми «Выбрать эту цель». После этого перейдём к твоему портфолио.'));
  const exit=button('Продолжить без подсказок',onExit);exit.className='link-button';root.append(exit);
}

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

export function renderStart(root,{state,programs,hasTask,handlers}) {
  const stage=startStage(state),number={goal:0,work:1,task:2}[stage];
  root.replaceChildren();root.dataset.stage=stage;
  const progress=el('ol','start-progress');progress.setAttribute('aria-label','Первые шаги');
  for(const [index,title] of ['Выбрать цель','Добавить работу','Начать первый шаг'].entries()){
    const item=el('li',null,title);if(index===number)item.setAttribute('aria-current','step');progress.append(item);
  }
  root.append(progress);
  const box=el('section','start-question');
  if(stage==='goal'){
    box.append(el('h2',null,'Ты уже знаешь, куда хочешь поступать?'),
      el('p',null,'Сначала выберем программу. Затем добавим твой опыт и перейдём к первому делу. Цель можно будет поменять.'));
    box.append(button('Да — найти мою программу',handlers.onCatalog,true),button('Пока нет — подобрать по анкете',handlers.onProfile));
    const portfolio=button('Хочу начать с портфолио без программы',handlers.onWork);portfolio.className='link-button';box.append(portfolio);
  }else if(stage==='work'){
    const names=state.goals.map(id=>{const name=programs.find(item=>item.id===id)?.name;return name?.ru??(typeof name==='string'?name:id);});
    box.append(el('h2',null,'Цель выбрана. Теперь — твой опыт.'),el('p',null,`В твоём плане: ${names.join('; ')}.`),
      el('p',null,'Начни небольшую работу по интересной тебе теме. Nerio разобьёт её на шаги; результаты будут сохраняться в портфолио.'));
    box.append(button('Добавить первую работу',handlers.onWork,true),button('Сначала перейти к делам поступления',handlers.onFinish));
  }else{
    box.append(el('h2',null,'Работа сохранена. Можно начинать.'),
      el('p',null,hasTask?'На «Сегодня» уже есть шаг твоей работы: что сделать и какой результат записать.':'В твоей работе уже есть шаги и ожидаемый результат. Открой её, чтобы начать.'));
    box.append(button(hasTask?'Открыть мой первый шаг':'Открыть мою работу',handlers.onFinish,true));
  }
  root.append(box);
  const skip=button('Разобраться самостоятельно',handlers.onSkip);skip.className='link-button';root.append(skip);
}

export function renderStartGuide(root,{active,screen,workPath,onExit}){
  root.replaceChildren();root.hidden=!active||screen==='start'||screen==='today'||(screen==='route'&&!workPath);
  if(root.hidden)return;
  const work=screen==='route';
  root.append(el('strong',null,work?'Добавим твою первую работу':'Выберем цель поступления'),
    el('p',null,work?'Выбери тип работы и тему. После сохранения мы покажем, с какого действия начать.':screen==='profile'?'Ответь на вопросы о школе и гражданстве. Затем выбери программу из каталога.':'Найди интересную программу и нажми «Выбрать эту цель». После этого перейдём к твоему портфолио.'));
  const exit=button('Продолжить без подсказок',onExit);exit.className='link-button';root.append(exit);
}

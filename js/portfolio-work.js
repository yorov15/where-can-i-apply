import { normalizeLearning } from './portfolio-learning.js';
// Собственные учебные примеры Nerio. Это не требования программ и не
// обещания поступления, публикации или результата за заданное число часов.
export const WORK_TEMPLATES = [
  {id:'data',kind:'study',name:'Разобраться в данных',
    description:'Выбери вопрос, на который можно ответить с помощью доступных данных. Подойдут открытая таблица или собственные неперсональные наблюдения.',
    smaller:'Если данных или знаний не хватает, возьми маленькую таблицу и один вопрос. Не делай вывод за пределами этой выборки.',
    output:'Таблица, расчёты или код с объяснением метода, результата и ограничений.',
    steps:[
      {id:'question',title:'Сформулируй вопрос и выбери данные',expected:'Один вопрос, источник данных и объяснение, что по этим данным можно проверить.'},
      {id:'draft',title:'Сделай первый анализ',expected:'Расчёты или код, первая таблица либо график и описание своих действий.'},
      {id:'check',title:'Проверь расчёты и ограничения',expected:'Проверка примеров, возможные ошибки и объяснение, чего данные не показывают. Если доступен учитель, обсуди с ним спорное место.'},
      {id:'revise',title:'Доработай анализ и объясни вывод',expected:'Исправленная работа, собственный вывод и список оставшихся ограничений.'},
    ]},
  {id:'prototype',kind:'project',name:'Сделать полезный прототип',
    description:'Возьми понятную проблему из учёбы или повседневной жизни. Сделай небольшое решение и проверь, помогает ли оно.',
    smaller:'Начни с бумажного макета, таблицы или одного сценария. Большая команда, деньги и массовый запуск не обязательны.',
    output:'Прототип, описание своей роли, результаты проверки и изменения после неё.',
    steps:[
      {id:'problem',title:'Опиши проблему и способ проверки',expected:'Кому и в какой ситуации нужно решение, что сейчас мешает и как заметить улучшение.'},
      {id:'draft',title:'Собери небольшую первую версию',expected:'Макет, таблица, программа или другая пробная версия и описание личного вклада.'},
      {id:'check',title:'Проверь решение на реальной задаче',expected:'Описание проверки, наблюдения или доступная обратная связь. Не добавляй в записи чужие личные данные.'},
      {id:'revise',title:'Исправь решение по результатам проверки',expected:'Доработанная версия, объяснение изменений и того, что пока не получилось.'},
    ]},
  {id:'creative',kind:'creative',name:'Развить творческую работу',
    description:'Выбери тему и сделай несколько проб: рисунки, фотографии, текст, музыку или другую доступную форму.',
    smaller:'Ограничь тему, материал или число работ. Важны собственные решения и доработка, а не дорогие инструменты.',
    output:'Отобранные работы, промежуточные варианты и объяснение творческих решений.',
    steps:[
      {id:'theme',title:'Выбери тему и границы работы',expected:'Тема, выбранная форма и объяснение того, что хочешь выразить или попробовать.'},
      {id:'draft',title:'Сделай несколько проб',expected:'Эскизы или варианты с заметками о том, какие решения ты принимал.'},
      {id:'check',title:'Сравни варианты и найди, что улучшить',expected:'Собственные наблюдения или доступный отзыв; объяснение выбора и список правок.'},
      {id:'revise',title:'Доработай и собери подборку',expected:'Итоговый отбор и объяснение, что изменилось относительно первых проб.'},
    ]},
  {id:'episodes',kind:'other',name:'Разобрать свой жизненный опыт',
    description:'Вспомни настоящую ситуацию ответственности, адаптации, совместной работы или разногласия. Это материал для собственных ответов и интервью.',
    smaller:'Начни с одного обычного эпизода. Не нужно придумывать достижения или превращать повседневную помощь в руководящую должность.',
    output:'Точные заметки о ситуации, своих действиях, последствиях и выводах; связь с выбранной целью, если она уже есть.',
    steps:[
      {id:'episode',title:'Выбери настоящий эпизод',expected:'Когда и что происходило, кто участвовал и за что отвечал лично ты.'},
      {id:'actions',title:'Разбери свои действия и последствия',expected:'Что ты решил и сделал, что получилось и что зависело от других людей.'},
      {id:'check',title:'Проверь точность и найди вывод',expected:'Разделение фактов и своей интерпретации, трудность и то, чему ситуация научила.'},
      {id:'revise',title:'Объясни опыт своими словами',expected:'Короткие заметки для ответа или интервью: действия, вывод и что теперь сделал бы иначе.'},
    ]},
];

export const WORK_REVIEW_FIELDS = [['ownership','Что сделал лично ты?'],['method','Почему выбрал такой способ?'],
  ['evidence','Чем подтверждён результат?'],['changes','Что изменил после проверки?'],
  ['limits','Чего результат не показывает?'],['relevance','Как работа связана с твоим интересом или целью?']];

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const text = (value,max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;

export function normalizeWorkPlan(value) {
  if(!object(value)||value.version!==1||!identifier(value.id)||!identifier(value.templateId)
    ||!text(value.aim,1000)||!text(value.expectedResult,1000)||!Array.isArray(value.steps)||!value.steps.length||value.steps.length>8)return null;
  const steps=[];
  for(const item of value.steps){
    if(!object(item)||typeof item.id!=='string'||!/^[a-z0-9-]{1,40}$/.test(item.id)||!text(item.title,160)||!text(item.expected,1000)
      ||typeof item.done!=='boolean'||item.done&&(!day(item.completedOn)||steps.some(step=>!step.done)))return null;
    steps.push({id:item.id,title:item.title.trim(),expected:item.expected.trim(),done:item.done,...(item.done?{completedOn:item.completedOn}:{})});
  }
  if(new Set(steps.map(step=>step.id)).size!==steps.length)return null;
  const sessionMinutes=value.sessionMinutes??60;
  if(![15,30,45,60,90,120].includes(sessionMinutes))return null;
  const next={version:1,id:value.id,templateId:value.templateId,aim:value.aim.trim(),expectedResult:value.expectedResult.trim(),sessionMinutes,paused:value.paused===true,steps};
  if(Object.hasOwn(value,'review')){
    if(!object(value.review)||!day(value.review.checkedOn))return null;
    const fields=Object.fromEntries(WORK_REVIEW_FIELDS.map(([name])=>[name,value.review[name]??'']));
    if(Object.values(fields).some(value=>typeof value!=='string'||value.length>1000))return null;
    next.review={...fields,checkedOn:value.review.checkedOn};
  }
  if(Object.hasOwn(value,'learning')){next.learning=normalizeLearning(value.learning);if(!next.learning)return null;}
  return next;
}

export const workTaskId = (plan,step) => `work:${plan.id}:${step.id}`;

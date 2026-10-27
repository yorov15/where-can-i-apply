// Календарь сроков для экрана ответа.
//
// Инструмент не знает, куда человека возьмут: в данных есть страна,
// деньги, сроки и условия допуска — и ничего про конкурс. Поэтому
// наверх идёт не «лучшее», а ближайшее по времени: даты взяты с сайтов
// программ и подтверждены цитатой, в отличие от любой оценки шансов.
//
// Горизонт считается от сегодня, а не по календарным месяцам: «до конца
// месяца» 30 сентября значит один день, а 1 сентября — тридцать.
import { daysBetween } from './lib/format.js';
import { bucketOf } from './wording.js';

const HORIZONS = [
  { key: 'soon', title: 'Закрывается в ближайший месяц', within: 30 },
  { key: 'quarter', title: 'Следующие три месяца', within: 90 },
  { key: 'later', title: 'Позже', within: Infinity },
];

const UNKNOWN = { key: 'unknown', title: 'Срок пока не объявлен' };

export function horizonOf(program, today) {
  const closes = program.deadline?.closes;
  if (!closes) return UNKNOWN.key;
  const days = daysBetween(today, closes);
  if (days < 0) return UNKNOWN.key;
  return HORIZONS.find((h) => days <= h.within).key;
}

export function agenda(rows, today) {
  const open = rows.filter((row) => row.deadline !== 'closed' && bucketOf(row.verdict) === 'yes');

  return [...HORIZONS, UNKNOWN]
    .map(({ key, title }) => ({
      key,
      title,
      rows: open
        .filter((row) => horizonOf(row.program, today) === key)
        .sort((a, b) => (a.program.deadline?.closes ?? '') < (b.program.deadline?.closes ?? '') ? -1 : 1),
    }))
    .filter((group) => group.rows.length);
}

const validDay = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
const shift = (day,days) => new Date(Date.parse(`${day}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);

// Dates inferred from the application window are planning targets. They must
// never be presented as separately announced document or payment deadlines.
export function scheduleRoute(route, plans, documents, today) {
  const steps=route.steps.map(step => {
    const goals=route.goals.filter(goal=>step.programIds.includes(goal.id) && validDay(goal.deadline.closes) && goal.deadline.closes>=today)
      .sort((a,b)=>a.deadline.closes.localeCompare(b.deadline.closes));
    const goal=goals[0], closes=goal?.deadline.closes;
    const expected=goal?.deadline.confidence!=='confirmed';
    if (step.kind==='test') {
      const plan=plans[step.id];
      const due=plan?.booked && !plan.pastBooking ? plan.booked : plan?.lastDate;
      return {...step,due:due??null,dueKind:plan?.booked&&!plan.pastBooking?'booked':'exam-plan',dueExpected:plan?.expectedDeadline??true};
    }
    if (step.kind==='apply') return {...step,dueKind:'application',dueExpected:expected};
    if (!closes || step.phase==='after') return {...step,due:null};
    const wait=step.documentCode ? documents[step.documentCode]?.waitDays : null;
    return {...step,due:closes,dueKind:'planning',dueExpected:expected,
      startBy:Number.isInteger(wait)&&wait>=0?shift(closes,-wait):null,
      scheduleGoal:goal.name};
  });
  return {...route,steps,week:route.week.map(step=>steps.find(item=>item.id===step.id)??step)};
}

export function routeCalendarEvents(route, plans, tracks, urls, today) {
  const result=[];
  for (const step of route.steps.filter(step=>!step.done)) {
    const names=step.members.map(member=>member.name).join('; ');
    const note=step.dueKind==='application'?'Срок подачи программы.'
      :step.dueKind==='booked'?'Дата экзамена, которую ты указал.'
        :step.dueKind==='exam-plan'?'Расчётная дата сдачи. Учитывает опубликованное время результата и выбранный запас; места и доставку баллов проверь отдельно.'
          :'Твоя цель подготовки по ближайшему сроку подачи. Отдельный срок документа или платежа не подтверждён; уточни его у вуза.';
    const url=step.kind==='test'?tracks[step.track]?.register:step.docSource?.url??urls[step.programIds[0]];
    if(validDay(step.due)&&step.due>=today) result.push({id:`route-${step.id}`,date:step.due,
      title:`${step.dueKind==='planning'?'План: ':step.dueKind==='exam-plan'?'Ориентир: ':''}${step.title}`,
      description:[note,step.dueExpected?'Срок подачи ожидаемый — сверь на сайте.':'',`Цели: ${names}`,step.detail].filter(Boolean).join('\n'),url});
    if(validDay(step.startBy)&&step.startBy>=today) result.push({id:`route-start-${step.id}`,date:step.startBy,title:`План: начать — ${step.title}`,description:'Дата рассчитана по оценке времени изготовления. Уточни реальное ожидание у того, кто выдаёт документ.',url});
    const plan=plans[step.id];
    if(step.kind==='test'&&plan?.booked&&validDay(plan.lastDate)&&plan.lastDate>=today&&plan.lastDate!==step.due) result.push({id:`route-bound-${step.id}`,date:plan.lastDate,title:`Ориентир для сдачи: ${tracks[step.track]?.name??step.title}`,description:'Расчёт по сроку подачи, времени результата и выбранному запасу. Не гарантия мест, получения или доставки баллов.',url});
  }
  return result;
}

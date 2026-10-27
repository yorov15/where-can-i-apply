// Minutes allocate the user's own budget. They do not predict score growth.
const stamp = day => Date.parse(`${day}T00:00:00Z`);
const shift = (day, amount) => new Date(stamp(day) + amount*86400000).toISOString().slice(0,10);
export const mondayOf = day => shift(day, -((new Date(`${day}T00:00:00Z`).getUTCDay()+6)%7));
export function weekKey(day) {
  const thursday = shift(mondayOf(day),3);
  const year = Number(thursday.slice(0,4));
  const first = mondayOf(`${year}-01-04`);
  return `${year}-W${String(1+Math.round((stamp(mondayOf(day))-stamp(first))/604800000)).padStart(2,'0')}`;
}
export function buildStudyPlan({ steps, tracks, plans, state, today }) {
  const start = mondayOf(state.studyStarted && state.studyStarted<=today ? state.studyStarted : today);
  const current = mondayOf(today);
  const active = steps.filter(step => !step.done && step.target?.test && tracks[step.track]?.weekTemplates?.length && !plans[step.id]?.historicalScale)
    .map(step => {
      const plan=plans[step.id], track=tracks[step.track];
      const end=plan.booked && !plan.pastBooking && (!plan.lastDate || plan.booked<=plan.lastDate) ? plan.booked : plan.lastDate;
      const parts=Object.entries(plan.recent?.parts ?? {}).filter(([,score]) => Number.isFinite(score));
      const weak=parts.sort((a,b) => a[1]-b[1])[0]?.[0] ?? null;
      return { step, plan, track, end, weak };
    }).filter(item => !item.plan.expired && (!item.end || item.end>=today));
  if (!active.length) return { weeks:[], active:[], minutes:state.hoursPerWeek*60 };
  const end = active.map(item => item.end ?? shift(current,6)).sort().at(-1);
  const minutes=state.hoursPerWeek*60;
  const weeks=[];
  for (let day=current, index=1+Math.round((stamp(current)-stamp(start))/604800000), count=0; day<=end && count<105; day=shift(day,7),index++,count++) {
    const exams=active.filter(item => !item.end ? day===current : day<=item.end);
    if (!exams.length) continue;
    const key=weekKey(day), candidates=[];
    for (const item of exams) {
      const { step,plan,track,weak }=item;
      const mock=index%3===0 || (day===current && plan.current==null);
      if (mock) candidates.push({ code:plan.code, test:plan.test, template:'mock', kind:'mock', title:`Поработать с пробником ${track.name}`, url:track.practice.url, weight:2 });
      track.weekTemplates.forEach((template,rank) => candidates.push({ ...template, rank, code:plan.code, test:plan.test, template:template.id, kind:'practice', weight:template.part===weak ? 2:1 }));
    }
    // Rotate parts between weeks while preserving the scheduled mock sessions.
    const mocks=candidates.filter(item => item.kind==='mock').slice(0,4);
    const exercises=candidates.filter(item => item.kind!=='mock').sort((a,b)=>a.rank-b.rank);
    const offset=((index-1)*4)%exercises.length;
    const rotated=[...exercises.slice(offset),...exercises.slice(0,offset)];
    const selected=[...mocks,...rotated.slice(0,4-mocks.length)];
    while (selected.length<3 && exercises.length) selected.push({ ...exercises[selected.length%exercises.length], template:`${exercises[selected.length%exercises.length].template}-review`, title:'Разобрать ошибки предыдущих заданий' });
    const totalWeight=selected.reduce((sum,item) => sum+item.weight,0);
    let remaining=minutes;
    const tasks=selected.map((item,i) => {
      const allocated=i===selected.length-1 ? remaining : Math.floor(minutes*item.weight/totalWeight/5)*5;
      remaining-=allocated;
      const id=`study:${day}:${item.code}:${item.template}`;
      const saved=state.weekPlan[key]?.find(task => task.taskId===id);
      return { ...item, id, minutes:allocated, done:saved?.done===true };
    });
    weeks.push({ key, start:day, end:shift(day,6)<end ? shift(day,6) : end, index, tasks, minutes:tasks.reduce((sum,task) => sum+task.minutes,0) });
  }
  return { weeks, active, minutes };
}

export function studyAdvice(item, state) {
  const { plan,track,weak }=item;
  const history=(state.scores[plan.code] ?? []).filter(score => score.date<=plan.recent?.date && (!plan.test || score.test===plan.test)).sort((a,b)=>a.date.localeCompare(b.date));
  const latest=history.at(-1), previous=history.at(-2);
  const weakName=track.parts.find(part => part.code===weak)?.name;
  const focus=weakName ? ` Больше времени отведено на ${weakName}.` : '';
  if (!latest) return `Добавь результат пробника, чтобы выбрать слабую часть.${focus}`;
  if (plan.target!=null && latest.overall>=plan.target) return `Пробник достиг общего ${plan.recommended ? 'рекомендуемого балла' : 'порога'}. Проверь минимумы по частям; для подачи нужен результат, который принимает вуз.${focus}`;
  if (previous && latest.overall<=previous.overall) return `Балл пока не вырос. Разбери ошибки${state.hoursPerWeek<10 ? ' и, если можешь, увеличь часы в анкете' : ''}. Срок экзамена сверь выше.${focus}`;
  return `${previous ? 'Балл вырос, целевой уровень ещё не достигнут.' : 'Пробник сохранён; следующий поможет сравнить результаты.'}${focus}`;
}

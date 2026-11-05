// Собственные факты ученика. Не содержат требований вузов и не отправляются в сеть.
export const STORY_PROMPTS = [
  ['initiative','Когда удалось начать что-то самостоятельно?'],
  ['responsibility','За что приходилось отвечать дома, в школе или на работе?'],
  ['mistake','Какая ошибка заставила изменить свои действия?'],
  ['learning','Как удалось разобраться в трудной теме?'],
  ['team','Как удалось договориться с другими людьми?'],
  ['helping','Когда твоя помощь оказалась кому-то полезна?'],
];
export const STORY_FIELDS = [
  ['title','Как назвать этот случай?',160],
  ['context','Что происходило и когда?',2000],
  ['actions','Какие действия предпринял именно ты?',2000],
  ['result','Что получилось? Какие факты это подтверждают?',2000],
  ['lesson','Что ты понял и что изменил после этого?',2000],
  ['useFor','Для какого эссе, письма или вопроса пригодится? · необязательно',500],
];
export const SCHOOL_FIELDS = [
  ['name','Название школы','School name',200],
  ['nameLatin','Название школы латиницей · если известно','School name in Latin script',200],
  ['location','Город и страна','City and country',200],
  ['language','Язык обучения','Language of instruction',100],
  ['years','Общая длительность школьного обучения, лет','Length of school education, years',2],
  ['scale','Шкала оценок и проходная оценка','Grading scale and passing grade',1000],
  ['classSize','Число учеников в выпуске · если известно','Graduating class size',5],
  ['graduation','Дата выпуска · если известна','Graduation date',10],
  ['rank','Место в выпуске или «школа не рассчитывает» · если известно','Class rank or school ranking policy',200],
  ['contact','Контакт школы для уточнений · необязательно','School contact',300],
];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const key = value => typeof value === 'string' && value.length > 0 && value.length <= 200 && !['__proto__','constructor','prototype'].includes(value);
const text = (value,max) => value == null ? '' : typeof value === 'string' && value.length <= max ? value.trim() : null;
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
const blank = () => ({version:1,stories:[]});
function story(value) {
  if (!object(value) || !key(value.id) || !day(value.createdOn) || !day(value.updatedOn)
    || !STORY_PROMPTS.some(([id]) => id === value.prompt)) return null;
  const fields = Object.fromEntries(STORY_FIELDS.map(([id,,max]) => [id,text(value[id],max)]));
  const experienceTitle = text(value.experienceTitle,160);
  return fields.title && !Object.values(fields).includes(null) && experienceTitle !== null
    ? {id:value.id,prompt:value.prompt,...fields,...(experienceTitle?{experienceTitle}:{}),createdOn:value.createdOn,updatedOn:value.updatedOn} : null;
}
function school(value) {
  if (!object(value) || !day(value.updatedOn)) return null;
  const fields = Object.fromEntries(SCHOOL_FIELDS.map(([id,,,max]) => [id,text(value[id],max)]));
  if (Object.values(fields).includes(null)) return null;
  if (fields.years && (!/^\d{1,2}$/.test(fields.years) || Number(fields.years)<1 || Number(fields.years)>20)) return null;
  if (fields.classSize && (!/^\d{1,5}$/.test(fields.classSize) || Number(fields.classSize)<1)) return null;
  if (fields.graduation && !day(fields.graduation)) return null;
  return {...fields,updatedOn:value.updatedOn};
}
export function normalizeApplicationNotes(value) {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.stories) || value.stories.length > 20) return null;
  const stories = value.stories.map(story);
  if (stories.includes(null) || new Set(stories.map(item=>item.id)).size !== stories.length) return null;
  const next = {version:1,stories};
  if (Object.hasOwn(value,'school')) { next.school=school(value.school);if(!next.school)return null; }
  return new TextEncoder().encode(JSON.stringify(next)).length <= 200_000 ? next : null;
}
export const applicationNotesOf = state => normalizeApplicationNotes(state?.applicationNotes) ?? blank();
export function saveStory(state,input,today) {
  if (!object(input) || !day(today)) return null;
  const notes=applicationNotesOf(state),old=notes.stories.find(item=>item.id===input.id);
  const entry=story({...old,...input,createdOn:old?.createdOn??today,updatedOn:today});
  if (!entry) return null;
  notes.stories=old?notes.stories.map(item=>item.id===entry.id?entry:item):[...notes.stories,entry];
  const checked=normalizeApplicationNotes(notes);
  return checked?{...state,applicationNotes:checked}:null;
}
export function removeStory(state,id) {
  if (!key(id)) return null;
  const notes=applicationNotesOf(state);notes.stories=notes.stories.filter(item=>item.id!==id);
  return {...state,applicationNotes:notes};
}
export function saveSchool(state,input,today) {
  if (!object(input) || !day(today)) return null;
  const entry=school({...input,updatedOn:today});if(!entry)return null;
  const notes=applicationNotesOf(state);
  if (SCHOOL_FIELDS.some(([id])=>entry[id])) notes.school=entry;else delete notes.school;
  return {...state,applicationNotes:notes};
}
export function storyText(entry) {
  return [entry.title,...STORY_FIELDS.slice(1).filter(([id])=>entry[id]).map(([id,label])=>`${label.replace(' · необязательно','')}\n${entry[id]}`),
    ...(entry.experienceTitle?[`Из записи опыта: ${entry.experienceTitle}`]:[])].join('\n\n');
}
export function schoolText(entry) {
  if (!entry) return '';
  return ['Сведения о школе / School details',
    'Черновик со слов ученика. Школа должна подтвердить сведения перед отправкой. / Student-prepared draft. Ask the school to confirm before submission.',
    ...SCHOOL_FIELDS.filter(([id])=>entry[id]).map(([id,ru,en])=>`${ru.replace(/ · .*/,'')} / ${en}\n${entry[id]}`)].join('\n\n');
}

// Шаг 1 портфолио «Что у меня уже есть»: опрос по категориям вместо пустой формы.
// «Да» создаёт черновик записи (название, роль, период), «нет» убирает вопрос.
// Вопросы — правило Nerio, не требование вузов.
import { portfolioOf } from './portfolio.js';

export const INVENTORY = [
  {id:'teach',kind:'community',question:'Ты кого-то учил или объяснял?',hint:'Младшим братьям, одноклассникам перед контрольной, в кружке или онлайн.',title:'Например: Учу младших математике'},
  {id:'family',kind:'family',question:'Ты отвечаешь за что-то дома или в семейном деле каждый день?',hint:'Уход за родственником, младшие, магазин или мастерская семьи, хозяйство.',title:'Например: Помогаю отцу в мастерской'},
  {id:'made',kind:'project',question:'Ты сделал руками или на компьютере что-то, чем пользуется кто-то ещё?',hint:'Сайт, бот, таблица, ремонт, поделка, видео для школы.',title:'Например: Бот с расписанием для класса'},
  {id:'award',kind:'study',question:'Есть грамота или диплом за последние три года?',hint:'Олимпиада, конкурс, соревнование: школьный, районный, республиканский уровень.',title:'Например: Районная олимпиада по физике, 2 место'},
  {id:'selfstudy',kind:'study',question:'Ты сам выучил что-то сверх школы?',hint:'Язык, программирование, предмет по курсам или книгам.',title:'Например: Выучил Python по курсу CS50'},
  {id:'work',kind:'work',question:'Ты работал или подрабатывал?',hint:'За деньги или без: помощник в магазине, репетитор, курьер, сезонная работа.',title:'Например: Продавец в магазине дяди летом'},
  {id:'community',kind:'community',question:'Ты что-то организовал для других?',hint:'Событие в школе, сбор помощи, клуб, субботник, команда.',title:'Например: Организовал шахматный клуб в школе'},
  {id:'creative',kind:'creative',question:'Ты регулярно что-то создаёшь?',hint:'Музыка, рисунки, тексты, фото, видео, блог.',title:'Например: Веду блог о книгах'},
  {id:'sport',kind:'sport',question:'Ты занимаешься спортом регулярно?',hint:'Секция, сборная школы, соревнования, тренировки младших.',title:'Например: Футбол, сборная школы'},
];

// Следующий вопрос без ответа. skipped — вопросы, отложенные в этом сеансе.
export function nextQuestion(portfolio, skipped = new Set()) {
  const answered = portfolio?.survey ?? {};
  return INVENTORY.find(item => !answered[item.id] && !skipped.has(item.id)) ?? null;
}

export function surveyProgress(portfolio) {
  const answered = portfolio?.survey ?? {};
  return {answered: INVENTORY.filter(item => answered[item.id]).length, total: INVENTORY.length};
}

// Черновик — запись, где есть только название, роль и период.
export function recordStatus(entry) {
  const draft = !entry.actions && !entry.result && !entry.reflection && !entry.workPlan;
  const proof = Boolean(entry.url) || Boolean(entry.proof && entry.proof !== 'none');
  return {draft, proof};
}

export function inventoryOf(state) {
  const portfolio = portfolioOf(state);
  return {portfolio, records: portfolio.experiences.map(entry => ({entry, ...recordStatus(entry)}))};
}

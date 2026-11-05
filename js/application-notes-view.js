import { applicationNotesOf, STORY_PROMPTS, STORY_FIELDS, SCHOOL_FIELDS, saveStory, removeStory, saveSchool, storyText, schoolText } from './application-notes.js';
import { portfolioOf } from './portfolio.js';
import { printSheet } from './spotlight-view.js';

const drafts=new Map();
export const clearApplicationNotesDrafts=()=>drafts.clear();
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node;};
const button=(text,run,quiet=true)=>{const node=el('button',quiet?'button button-quiet':'button',text);node.type='button';node.addEventListener('click',run);return node;};
const anchor=(text,href)=>{const node=el('a','link-button',text);node.href=href;return node;};
const status=()=>{const node=el('p','route-status');node.setAttribute('role','status');return node;};
function field(form,id,label,value,max,type='textarea') {
  const row=el('label',null,label),input=el(type==='textarea'?'textarea':'input');
  input.name=id;input.value=value??'';input.maxLength=max;
  if(type==='textarea')input.rows=id==='title'?2:3;else input.type=type;
  input.autocomplete='off';row.append(input);form.append(row);return input;
}
const read=form=>Object.fromEntries(new FormData(form));
globalThis.addEventListener?.('beforeprint',()=>{
  if(document.body.classList.contains('is-parent-print'))return;
  const page=document.querySelector('[data-school-preview]');
  if(location.hash!=='#route/school'||!page)return;
  if(page.dataset.printReady==='true'){printSheet(page);return;}
  const notice=el('article');notice.append(el('h2',null,'Есть несохранённые сведения о школе'),
    el('p',null,'Новые изменения не включены в этот лист. Вернись к форме и сохрани сведения перед печатью.'));
  if(page.textContent.trim())notice.append(page.cloneNode(true));
  printSheet(notice);
});
function copyButton(value,say,box) {
  return button('Скопировать текст',async()=>{
    try { await navigator.clipboard.writeText(value());say.textContent='Текст скопирован.'; }
    catch { box.querySelector('[data-notes-copy]')?.remove();const area=el('textarea');area.dataset.notesCopy='';area.readOnly=true;area.rows=8;
      area.setAttribute('aria-label','Текст для копирования');area.value=value();box.append(area);area.select();say.textContent='Выдели текст и скопируй его.'; }
  });
}
function printButton(page) { return button('Печать / PDF',()=>{const cleanup=printSheet(page);try{window.print();}catch{cleanup();}}); }
function schoolView(box,props) {
  const {handlers,today}=props,initial=applicationNotesOf(handlers.getRouteState()).school;
  const form=el('form','journey-form');form.dataset.schoolForm='';
  box.append(el('h2',null,'Сведения о школе'),el('p','journey-meta','Заполни известные факты один раз. Скопируй их в заявку или передай школе на проверку. Пустые поля можно оставить на потом.'));
  const value=drafts.get('school')??initial??{};
  for(const [id,ru,,max] of SCHOOL_FIELDS){
    const input=field(form,id,ru,value[id],max,['years','classSize'].includes(id)?'text':id==='graduation'?'date':['scale','rank'].includes(id)?'textarea':'text');
    if(['years','classSize'].includes(id))input.inputMode='numeric';
  }
  const say=status(),save=el('button','button','Сохранить сведения');save.type='submit';form.append(save,say);box.append(form);
  box.append(el('p','route-detail','Записывай шкалу школы как есть. Укажи название латиницей по документам, если оно есть. Для официальной справки и перевода обратись в школу.'));
  const preview=el('article','journey-reference');preview.dataset.schoolPreview='';
  const exports=el('div','journey-actions'),copy=copyButton(()=>schoolText(applicationNotesOf(handlers.getRouteState()).school),say,box),print=printButton(preview);
  exports.append(copy,print);box.append(exports,preview);
  function refresh(dirty=false){
    const saved=applicationNotesOf(handlers.getRouteState()).school;
    copy.disabled=print.disabled=dirty||!saved;
    preview.dataset.printReady=String(!dirty&&Boolean(saved));
    preview.replaceChildren();
    if(saved){preview.append(el('h3',null,'Сохранённые сведения'),el('p','journey-copy',schoolText(saved)));}
  }
  form.addEventListener('input',()=>{drafts.set('school',read(form));say.textContent='Есть изменения. Нажми «Сохранить сведения». ';refresh(true);});
  form.addEventListener('submit',event=>{event.preventDefault();
    const response=handlers.onSaveApplicationNotes(saveSchool(handlers.getRouteState(),read(form),today),'Сведения сохранены на устройстве.');
    say.textContent=response.message;if(response.ok){drafts.delete('school');refresh();}
  });
  refresh(drafts.has('school'));
  box.append(button('Удалить сохранённые сведения о школе',()=>{
    if(!confirm('Удалить сведения о школе с этого устройства? Сохранённые раньше файлы не изменятся.'))return;
    const response=handlers.onSaveApplicationNotes(saveSchool(handlers.getRouteState(),{},today),'Сведения о школе удалены.');say.textContent=response.message;
    if(response.ok){drafts.delete('school');form.reset();for(const input of form.querySelectorAll('input,textarea'))input.value='';refresh();}
  }));
  if(drafts.has('school'))say.textContent='Восстановлен несохранённый ввод. Нажми «Сохранить сведения».';
}
function storiesView(box,props) {
  const {handlers,today}=props;
  box.append(el('h2',null,'Банк историй'),el('p','journey-meta','Сохрани конкретные случаи из своей жизни. Позже выберешь подходящие для эссе, рекомендаций и собеседования. Можно писать на удобном тебе языке.'));
  const prompts=el('details','journey-edit');prompts.append(el('summary',null,'Шесть вопросов, чтобы вспомнить свой опыт'));
  for(const [,question] of STORY_PROMPTS)prompts.append(el('p','route-detail',question));box.append(prompts);
  const list=el('div'),editor=el('div');box.append(list,editor);
  const say=status();box.append(say);
  let editing=null;
  function edit(entry=null,from=null){
    editing=entry?.id??'new';editor.replaceChildren();
    const draftKey=`story:${editing}`,value=drafts.get(draftKey)??entry??(from?{
      title:from.title,context:[from.period,from.role].filter(Boolean).join('\n'),actions:from.actions,result:from.result,lesson:from.reflection,experienceTitle:from.title
    }:{});
    const form=el('form','journey-form');form.dataset.storyForm=editing;
    form.append(el('h3',null,entry?'Изменить историю':'Новая история'));
    if(drafts.has(draftKey))form.append(button('Сбросить несохранённый ввод',()=>{if(confirm('Сбросить изменения в этой форме? Сохранённая история останется.')){drafts.delete(draftKey);edit(entry,from);}}));
    const label=el('label',null,'Какой вопрос помогает рассказать этот случай?'),select=el('select');select.name='prompt';
    for(const [id,title] of STORY_PROMPTS){const option=el('option',null,title);option.value=id;select.append(option);}select.value=value.prompt??'initiative';label.append(select);form.append(label);
    for(const [id,title,max] of STORY_FIELDS){const input=field(form,id,title,value[id],max,id==='title'?'text':'textarea');if(id==='title')input.required=true;}
    if(value.experienceTitle)form.append(el('p','route-detail',`Взято из записи «${value.experienceTitle}». Изменения здесь сохраняются в этой истории.`));
    const result=status(),save=el('button','button','Сохранить историю');save.type='submit';form.append(save,
      button('Закрыть форму',()=>{drafts.set(draftKey,{...read(form),experienceTitle:value.experienceTitle??''});editor.replaceChildren();editing=null;say.textContent='Несохранённый ввод доступен до перезагрузки. Открой историю, чтобы продолжить.';}),result);
    const remember=()=>{drafts.set(draftKey,{...read(form),experienceTitle:value.experienceTitle??''});result.textContent='Есть изменения. Нажми «Сохранить историю».';};
    form.addEventListener('input',remember);form.addEventListener('change',remember);
    form.addEventListener('submit',event=>{event.preventDefault();const input={...read(form),id:entry?.id??crypto.randomUUID(),experienceTitle:value.experienceTitle??''};
      const response=handlers.onSaveApplicationNotes(saveStory(handlers.getRouteState(),input,today),'История сохранена на устройстве.');result.textContent=response.message;
      if(response.ok){drafts.delete(draftKey);editor.replaceChildren();editing=null;draw();say.textContent=response.message;list.querySelector(`[data-story-id="${CSS.escape(input.id)}"] summary`)?.focus();}
    });editor.append(form);
    if(drafts.has(draftKey))result.textContent='Восстановлен несохранённый ввод.';
    form.querySelector('input')?.focus({preventScroll:true});
  }
  function draw(){
    list.replaceChildren();const notes=applicationNotesOf(handlers.getRouteState());
    const add=button('Добавить историю',()=>{if(editing){say.textContent='Сначала сохрани или закрой открытую форму.';editor.querySelector('input')?.focus();return;}edit();},false);
    add.disabled=notes.stories.length>=20;list.append(add,el('p','route-detail',`Сохранено ${notes.stories.length} из 20 историй. Сохранённые записи входят в файл маршрута.`));
    const experiences=portfolioOf(handlers.getRouteState()).experiences;
    if(experiences.length){const pick=el('details','journey-edit');pick.append(el('summary',null,'Начать с записи из «Моих работ»'));
      for(const entry of experiences)pick.append(button(entry.title,()=>{if(editing){say.textContent='Сначала сохрани или закрой открытую форму.';return;}edit(null,entry);}));list.append(pick);}
    for(const entry of [...notes.stories].reverse()){
      const card=el('details','journey-card');card.dataset.storyId=entry.id;card.append(el('summary',null,entry.title),el('p','journey-copy',storyText(entry)));
      card.append(button('Изменить историю',()=>{if(editing&&editing!==entry.id){say.textContent='Сначала сохрани или закрой открытую форму.';return;}edit(entry);}),copyButton(()=>storyText(entry),say,box),
        button('Удалить историю',()=>{if(!confirm(`Удалить историю «${entry.title}»?`))return;
          const response=handlers.onSaveApplicationNotes(removeStory(handlers.getRouteState(),entry.id),'История удалена.');say.textContent=response.message;
          if(response.ok){drafts.delete(`story:${entry.id}`);if(editing===entry.id){editor.replaceChildren();editing=null;}draw();list.querySelector('button')?.focus();}
        }));list.append(card);
    }
    if(!notes.stories.length)list.append(el('p','journey-empty','Начни с одного случая. Достижение может быть небольшим: важны твои действия и то, чему ты научился.'));
  }
  draw();
}
// Форму сохраняем при фоновых загрузках индекса и требований: ввод и фокус остаются на месте.
export function renderApplicationNotes(root,props) {
  const hash=location.hash;if(!['#route/stories','#route/school'].includes(hash)){delete root.dataset.notesView;return false;}
  if(root.dataset.notesView===hash&&root.querySelector('[data-application-notes]'))return true;
  root.replaceChildren();root.dataset.notesView=hash;root.dataset.layer='notes';
  const box=el('section','journey-panel');box.dataset.applicationNotes=hash.slice(7);
  const nav=el('nav','path-nav');nav.setAttribute('aria-label','Материалы для заявки');
  nav.append(anchor('← Подготовка','#route/preparation'));
  for(const [id,title] of [['stories','Банк историй'],['school','Сведения о школе']]){const link=anchor(title,`#route/${id}`);if(hash===link.getAttribute('href'))link.setAttribute('aria-current','page');nav.append(link);}
  box.append(nav);(hash.endsWith('/school')?schoolView:storiesView)(box,props);
  box.append(el('p','route-detail','Сохранённое остаётся в этом браузере. Для переноса сохрани файл в разделе «Файл и данные». Несохранённый ввод исчезнет после перезагрузки.'));
  root.append(box);return true;
}

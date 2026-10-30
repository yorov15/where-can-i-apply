const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
// Сверка прошлых недель: что сделано, что переносим. Нужна и на «Сегодня», и в маршруте.
export function renderWeekReview(review,handlers) {
  if(!review.weeks.length)return null;
  const reviewBox=el('div','route-warn');reviewBox.dataset.weekReview='';
  reviewBox.append(el('p',null,`Сверим прошлые недели: сделано ${review.done}, осталось ${review.unfinished.length}. Отметь, что переносим.`));
  for(const task of review.unfinished){const p=el('p'),label=el('label','row'),check=el('input');check.type='checkbox';check.checked=true;check.value=task.taskId;label.append(check,task.title);p.append(label);reviewBox.append(p);}
  const button=el('button','button button-quiet','Завершить сверку');button.type='button';button.addEventListener('click',()=>handlers.onReview([...reviewBox.querySelectorAll('input:checked')].map(input=>input.value)));reviewBox.append(button);
  return reviewBox;
}

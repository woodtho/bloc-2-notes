const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const dataCode=fs.readFileSync(path.join(root,'assets/data.js'),'utf8');
const appCode=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');

class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.handlers={};this.dataset={};this.attributes={};this.hidden=false;this.disabled=false;this.checked=false;this.value='';this.textContent='';this.className='';this.classList={add:()=>{}};}
  append(...items){for(const i of items){if(i&&typeof i==='object'){if(i.parentNode)i.parentNode.children=i.parentNode.children.filter(x=>x!==i);i.parentNode=this;}this.children.push(i);}}
  insertBefore(item,before){const index=this.children.indexOf(before);assert(index>=0);item.parentNode=this;this.children.splice(index,0,item);}
  querySelector(selector){return selector==='summary'?this.children.find(x=>x.tagName==='SUMMARY'):null;}
  replaceChildren(...items){this.children=[];this.append(...items);}
  addEventListener(event,fn){(this.handlers[event]??=[]).push(fn);}
  setAttribute(k,v){this.attributes[k]=v;}
  focus(){this.focused=true;}
  fire(event){if(event==='click'&&this.disabled)return;for(const fn of this.handlers[event]||[])fn({preventDefault(){},target:this});}
  get allText(){return [this.textContent,...this.children.map(x=>x?.allText??String(x))].join(' ');}
}
function runtime(page='none',failStorage=false,search='',initialStorage){
  const ids={};
  const inlineParent=new Element('section'),inlineQuestions=[];
  if(page==='lesson')for(let i=0;i<3;i++){
    const detail=new Element('details'),summary=new Element('summary'),answer=new Element('p');
    detail.dataset.questionId=`09-09-source-${String(i+1).padStart(3,'0')}`;
    summary.textContent=`Question ${i+1}`;answer.textContent=`Model ${i+1}`;
    detail.append(summary,answer);inlineParent.append(detail);inlineQuestions.push(detail);
  }
  const names={
    quizzes:['quiz-setup','quiz-topic','quiz-lesson','quiz-length','quiz-available','quiz-start','quiz-play','quiz-results','quiz-position','quiz-score','quiz-progress','quiz-kind','quiz-prompt','quiz-lesson-link','quiz-answer','quiz-check','quiz-next','quiz-feedback','self-buttons','answer-form','quiz-yes','quiz-no','quiz-end','quiz-result-title','quiz-result-detail','quiz-retry','quiz-review','quiz-new'],
    cards:['card-setup','card-topic','card-lesson','card-kind','card-unlearned','card-available','card-start','card-length','card-play','card-results','card-position','card-session-score','card-direction','card-label','card-front','card-back','flashcard','card-hint','card-again','card-known','card-lesson-link','card-result-title','card-result-detail','card-repeat','card-new','card-end','clear-mastery'],
    lessons:['lesson-grid','lesson-search','lesson-order','topic-pills','library-count'],
    home:['lesson-grid','lesson-search','lesson-order','topic-pills','library-count']
  };
  (names[page]||[]).forEach(id=>ids[id]=new Element(id.includes('topic')||id.includes('lesson')||id.includes('length')||id.includes('direction')||id==='card-kind'?'select':'div'));
  ['quiz-topic','quiz-lesson','card-topic','card-lesson','card-kind'].forEach(id=>{if(ids[id])ids[id].value='all';});
  if(ids['quiz-length'])ids['quiz-length'].value='5';
  if(ids['card-length'])ids['card-length'].value='10';
  if(ids['card-direction'])ids['card-direction'].value='forward';
  if(ids['lesson-order'])ids['lesson-order'].value='course';
  if(ids['card-play'])ids['card-play'].hidden=true;
  if(ids['quiz-play'])ids['quiz-play'].hidden=true;
  const storage=initialStorage||{};
  const context={window:{},document:{body:new Element('body'),getElementById:id=>ids[id]||null,
    createElement:tag=>new Element(tag),querySelectorAll:selector=>selector==='details.source-question, details.lesson-question'?inlineQuestions:[],addEventListener(){}},
    location:{pathname:'/'+(page==='home'?'index':page)+'.html',search},URLSearchParams,
    localStorage:{getItem:k=>{if(failStorage)throw Error('unavailable');return storage[k]||null;},
      setItem:(k,v)=>{if(failStorage)throw Error('unavailable');storage[k]=v;}},console,Math,Map,Set};
  context.window.confirm=()=>true;
  vm.createContext(context);vm.runInContext(dataCode,context);vm.runInContext(appCode,context);
  return {ctx:context,ids,storage,$:id=>ids[id],data:context.window.FRENCH_STUDY,inlineParent,inlineQuestions};
}

test('inline lesson questions reveal answers, preserve drafts and filter review status',()=>{
  const r=runtime('lesson');
  function descendants(el){return [el,...el.children.filter(x=>x instanceof Element).flatMap(descendants)];}
  const all=()=>descendants(r.inlineParent);
  const button=(text,scope=r.inlineParent)=>descendants(scope).find(x=>x.tagName==='BUTTON'&&x.textContent===text);
  const progress=all().find(x=>x.className==='question-progress');
  const filter=all().find(x=>x.id==='lesson-question-filter');
  const first=r.inlineQuestions[0],nodes=descendants(first);
  const input=nodes.find(x=>x.tagName==='TEXTAREA'),answer=nodes.find(x=>x.className==='lesson-answer');
  const ratings=nodes.find(x=>x.className==='question-rating');
  assert.equal(progress.textContent,'0 / 3 known');assert(answer.hidden);assert(ratings.hidden);
  input.value='My draft';button('Show answer',first).fire('click');
  assert(!answer.hidden);assert(!ratings.hidden);button('I got it',first).fire('click');
  assert.equal(progress.textContent,'1 / 3 known');
  filter.value='known';filter.fire('change');assert(!first.hidden);assert(r.inlineQuestions[1].hidden);
  button('Review again',first).fire('click');assert(first.hidden);assert.equal(progress.textContent,'0 / 3 known');
  assert(!all().find(x=>x.className==='empty-state').hidden);
  filter.value='review';filter.fire('change');assert(r.inlineQuestions.every(x=>!x.hidden));
  button('Show all answers').fire('click');assert(r.inlineQuestions.every(x=>x.open));
  assert(all().filter(x=>x.className==='lesson-answer').every(x=>!x.hidden));
  button('Hide all answers').fire('click');assert(r.inlineQuestions.every(x=>!x.open));
  assert(all().filter(x=>x.className==='lesson-answer').every(x=>x.hidden));assert.equal(input.value,'My draft');
});

test('answer drafts and review ratings survive reload and are shared with quizzes',()=>{
  function descendants(el){return [el,...el.children.filter(x=>x instanceof Element).flatMap(descendants)];}
  const first=r=>descendants(r.inlineQuestions[0]);
  const field=r=>first(r).find(x=>x.tagName==='TEXTAREA');
  const action=(r,label)=>first(r).find(x=>x.tagName==='BUTTON'&&x.textContent===label);
  const progress=r=>descendants(r.inlineParent).find(x=>x.className==='question-progress');
  const a=runtime('lesson');field(a).value='J’en ai étudié trois.';field(a).fire('input');
  action(a,'Show answer').fire('click');action(a,'I got it').fire('click');
  const b=runtime('lesson',false,'',a.storage);
  assert.equal(field(b).value,'J’en ai étudié trois.');assert.equal(progress(b).textContent,'1 / 3 known');
  const quiz=runtime('quizzes',false,'',a.storage);
  quiz.data.questions.splice(0,quiz.data.questions.length,{id:'09-09-source-001',lesson:'09-09',topics:['Numbers'],prompt:'Test',answer:'trois',accepted:['trois'],mode:'typed'});
  quiz.$('quiz-start').fire('click');assert.equal(quiz.$('quiz-answer').value,'J’en ai étudié trois.');
  quiz.$('quiz-answer').value='trois';quiz.$('quiz-answer').fire('input');quiz.$('answer-form').fire('submit');
  const c=runtime('lesson',false,'',a.storage);assert.equal(field(c).value,'trois');
  action(c,'Show answer').fire('click');action(c,'Review again').fire('click');
  field(c).value='';field(c).fire('input');
  const d=runtime('lesson',false,'',a.storage);assert.equal(field(d).value,'');assert.equal(progress(d).textContent,'0 / 3 known');
});

test('blocked or malformed answer storage does not prevent practice',()=>{
  const r=runtime('lesson',true);
  const walk=el=>[el,...el.children.filter(x=>x instanceof Element).flatMap(walk)];
  const all=walk(r.inlineParent),field=all.find(x=>x.tagName==='TEXTAREA');
  assert(all.some(x=>x.textContent==='Answers cannot be saved in this browser.'&&!x.hidden));
  field.value='Still usable';assert.doesNotThrow(()=>field.fire('input'));
  const s=runtime('lesson',false,'',{'bloc-2-notes-question-progress-v1':'broken JSON'});
  const input=walk(s.inlineParent).find(x=>x.tagName==='TEXTAREA');input.value='Recovered';input.fire('input');
  const reload=runtime('lesson',false,'',s.storage);
  assert.equal(walk(reload.inlineParent).find(x=>x.tagName==='TEXTAREA').value,'Recovered');
});

test('19 complete lessons and valid practice references',()=>{
  const r=runtime();assert.equal(r.data.lessons.length,19);assert.equal(r.data.questions.length,932);assert.equal(r.data.cards.length,2503);
  assert.equal(r.data.questions.filter(q=>q.origin==='reviewed original self-test').length,622);
  assert.equal(r.data.cards.filter(c=>c.kind==='Examples').length,419);
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'review/source-manifest.json'),'utf8'));
  for(const m of manifest){
    const sourceItems=r.data.questions.filter(q=>q.lesson===m.lesson&&q.origin==='reviewed original self-test');
    assert.equal(sourceItems.length,m.original_self_test_questions);
    assert.deepEqual(Array.from(sourceItems,q=>q.source_item),Array.from({length:m.original_self_test_questions},(_,i)=>i+1));
    const source=fs.readFileSync(path.join(root,'lesson-'+m.lesson+'.Rmd'),'utf8');
    assert.equal((source.match(/class="source-question"/g)||[]).length,m.original_self_test_questions);
    assert(source.includes('## Vocabulary reference'));
  }
  const dates=new Set(r.data.lessons.map(l=>l.date));const ids=new Set();
  for(const q of r.data.questions){assert(dates.has(q.lesson));assert(q.answer.trim());assert(q.accepted.includes(q.answer));assert(!ids.has(q.id));ids.add(q.id);}
  for(const c of r.data.cards){assert(dates.has(c.lesson));assert(c.front.trim());assert(c.back.trim());assert(!ids.has(c.id));ids.add(c.id);}
  for(const l of r.data.lessons){assert(fs.existsSync(path.join(root,l.slug+'.Rmd')));assert(l.topics.length);}
});
test('short-answer matcher accepts formatting but preserves meaningful accents',()=>{
  const {ctx}=runtime();const c=ctx.window.FrenchStudyCore.correct;
  assert(c("  J'EN AI UNE ! ",['J’en ai une.']));
  assert(c('QUATRE-VINGT-UN',['quatre-vingt-un']));
  assert(!c('nee',['née']));assert(!c('en',['au']));
});
test('lesson preselection, intersection filters and no-match protection',()=>{
  const r=runtime('quizzes',false,'?lesson=11-16');assert.equal(r.$('quiz-lesson').value,'11-16');
  assert.equal(r.$('quiz-available').textContent,`${r.data.questions.filter(q=>q.lesson==='11-16').length} questions match your selection.`);
  r.$('quiz-topic').value='Demonstratives';r.$('quiz-topic').fire('change');assert(r.$('quiz-start').disabled);
  assert.match(r.$('quiz-available').textContent,/0 questions/);
});
test('quiz grading, blank protection and results count only answered questions',()=>{
  const r=runtime('quizzes');r.data.questions.splice(0,r.data.questions.length,
    {id:'test',lesson:'09-09',topics:['Numbers'],prompt:'Test',answer:'un milliard',accepted:['un milliard'],mode:'typed'});
  r.$('quiz-start').fire('click');assert(r.$('quiz-setup').hidden);assert(!r.$('quiz-play').hidden);
  assert(r.$('quiz-next').disabled);r.$('answer-form').fire('submit');assert(r.$('quiz-next').disabled);
  r.$('quiz-answer').value='UN MILLIARD!';r.$('answer-form').fire('submit');assert(!r.$('quiz-next').disabled);
  assert.match(r.$('quiz-feedback').allText,/Correct/);r.$('answer-form').fire('submit');
  r.$('quiz-next').fire('click');assert.match(r.$('quiz-result-title').textContent,/1 of 1/);
  assert.match(r.$('quiz-result-detail').textContent,/1 automatically checked · 0 self-assessed/);
});
test('open questions require explicit self-assessment and can be retried',()=>{
  const r=runtime('quizzes');r.data.questions.splice(0,r.data.questions.length,
    {id:'test',lesson:'09-09',topics:['Questions'],prompt:'Explain',answer:'A model.',accepted:['A model.'],mode:'self'});
  r.$('quiz-start').fire('click');r.$('quiz-answer').value='My response';r.$('answer-form').fire('submit');
  assert(!r.$('self-buttons').hidden);assert(r.$('quiz-next').disabled);
  r.$('quiz-no').fire('click');r.$('quiz-next').fire('click');assert.match(r.$('quiz-result-title').textContent,/0 of 1/);
  assert.match(r.$('quiz-result-detail').textContent,/0 automatically checked · 1 self-assessed/);
  assert(!r.$('quiz-retry').disabled);r.$('quiz-retry').fire('click');assert(!r.$('quiz-play').hidden);
  r.$('quiz-end').fire('click');assert.match(r.$('quiz-result-detail').textContent,/1 unanswered/);
});
test('cards stay hidden until flipped; learning cards reappear and known state persists',()=>{
  const r=runtime('cards');r.data.cards.splice(0,r.data.cards.length,
    {id:'test-card',lesson:'09-09',topics:['Numbers'],front:'cent',back:'one hundred',kind:'Vocabulary'});
  r.$('card-start').fire('click');assert(r.$('card-back').hidden);assert(r.$('card-known').disabled);
  r.$('flashcard').fire('click');assert(!r.$('card-back').hidden);assert(!r.$('card-again').disabled);
  r.$('card-again').fire('click');assert(!r.$('card-play').hidden);assert.equal(r.$('card-front').textContent,'cent');
  r.$('flashcard').fire('click');r.$('card-known').fire('click');assert(!r.$('card-results').hidden);
  assert.match(r.$('card-result-title').textContent,/1 of 1/);assert.equal(JSON.parse(r.storage['french-understood-mastery-v1'])['test-card'],true);
  r.$('card-unlearned').checked=true;r.$('card-unlearned').fire('change');assert(r.$('card-start').disabled);
});
test('reverse direction affects vocabulary, not rule cards; blocked storage does not break practice',()=>{
  const r=runtime('cards',true);r.data.cards.splice(0,r.data.cards.length,
    {id:'v',lesson:'09-09',topics:['Numbers'],front:'cent',translation:'one hundred',back:'one hundred — multiplied cent takes s when final',kind:'Vocabulary'});
  r.$('card-direction').value='reverse';r.$('card-start').fire('click');assert.equal(r.$('card-front').textContent,'one hundred');
  r.$('flashcard').fire('click');assert.equal(r.$('card-back').textContent,'cent');r.$('card-known').fire('click');
  assert.match(r.$('card-result-detail').textContent,/storage is unavailable/);
  r.$('card-new').fire('click');r.data.cards.splice(0,1,{id:'g',lesson:'09-09',topics:['Questions'],front:'Explain the rule',back:'Model answer',kind:'Rules & patterns'});
  r.$('card-start').fire('click');assert.equal(r.$('card-front').textContent,'Explain the rule');
});
test('library search and sorting render the expected lesson subset',()=>{
  const r=runtime('lessons');assert.equal(r.$('lesson-grid').children.length,19);
  r.$('lesson-search').value='imparfait';r.$('lesson-search').fire('input');assert.equal(r.$('lesson-grid').children.length,1);
  assert.match(r.$('lesson-grid').allText,/Passé composé/);
  r.$('lesson-search').value='no such material';r.$('lesson-search').fire('input');assert.match(r.$('lesson-grid').allText,/No lessons match/);
});
test('home opens the searchable lesson list',()=>{
  const r=runtime('home');assert.equal(r.$('lesson-grid').children.length,19);
  r.$('lesson-search').value='imparfait';r.$('lesson-search').fire('input');
  assert.equal(r.$('lesson-grid').children.length,1);
  assert.match(r.$('lesson-grid').allText,/Passé composé/);
});

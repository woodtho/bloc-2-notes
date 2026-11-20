const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const bank=fs.readFileSync(path.join(root,'assets/exam-data.js'),'utf8');
const script=fs.readFileSync(path.join(root,'assets/exam.js'),'utf8');
const key='bloc-2-notes-exam-v1';

class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.handlers={};this.attributes={};this.textContent='';this.className='';this.value='';this.hidden=false;this.disabled=false;this.checked=false;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
  setAttribute(name,value){this.attributes[name]=value;}
  focus(){this.focused=true;}
  fire(name){if(name==='click'&&this.disabled)return;for(const fn of this.handlers[name]||[])fn({preventDefault(){},target:this});}
  get allText(){return [this.textContent,...this.children.map(x=>x.allText||'')].join(' ');}
}
function runtime(storage={},blocked=false,search='') {
  const names=['setup','topic','length','available','start','play','position','score','progress','topic-label','prompt','form','choices','check','feedback','lesson','end','next','results','result-title','result-detail','breakdown','retry','new','review','storage-note'];
  const ids=Object.fromEntries(names.map(id=>['exam-'+id,new Element()]));
  const ctx={window:{},location:{search,href:'exam-prep.html'},URLSearchParams,document:{getElementById:id=>ids[id]||null,createElement:tag=>new Element(tag)},Math,Map,Set,JSON,
    localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return storage[k]||null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');storage[k]=v;}}};
  vm.createContext(ctx);vm.runInContext(bank,ctx);vm.runInContext(script,ctx);
  const state=()=>JSON.parse(storage[key]);
  const q=()=>ctx.window.FRENCH_EXAM.questions.find(q=>q.prompt===ids['exam-prompt'].textContent);
  const select=id=>{
    const input=ids['exam-choices'].children.flatMap(label=>label.children).find(el=>el.tagName==='INPUT'&&el.value===id);
    assert(input);input.checked=true;input.fire('change');
  };
  return {ctx,storage,$:id=>ids['exam-'+id],core:ctx.window.FrenchExamCore,data:ctx.window.FRENCH_EXAM,state,q,select};
}

test('search question practice preserves the main exam attempt and its own feedback',()=>{
  const saved={};let r=runtime(saved);r.$('start').fire('click');
  r.select(r.q().correct);r.$('form').fire('submit');r.$('next').fire('click');
  const original=saved[key],id=r.data.questions[20].id;
  r=runtime(saved,false,'?question='+id);assert.equal(r.q().id,id);
  assert.match(r.$('position').textContent,/1.*1/);assert.equal(saved[key],original);
  r.select(r.q().correct);r.$('form').fire('submit');r.$('next').fire('click');
  r=runtime(saved,false,'?question='+id);assert(!r.$('results').hidden);
  assert.equal(r.$('review').children.length,1);assert.equal(saved[key],original);
  r.$('new').fire('click');assert.equal(r.ctx.location.href,'exam-prep.html');
  r=runtime(saved);assert.equal(r.state().index,1);assert.equal(r.core.summarize(r.state()).correct,1);
  assert.equal(saved[key],original);
});

test('78 multiple-choice items cover all 13 checklist topics with valid lesson links',()=>{
  const r=runtime(),data=r.data;assert.equal(data.topics.length,13);assert.equal(data.questions.length,78);
  const seen=new Set(),lessons=JSON.parse(fs.readFileSync(path.join(root,'assets/data.js'),'utf8').replace(/^window.FRENCH_STUDY = /,'').replace(/;\s*$/,'')).lessons;
  for(const t of data.topics)assert.equal(data.questions.filter(q=>q.topic===t.id).length,6,t.id);
  for(const q of data.questions){
    assert(!seen.has(q.id));seen.add(q.id);assert.equal(q.options.length,4);
    assert.equal(new Set(q.options.map(o=>o.id)).size,4);assert.equal(new Set(q.options.map(o=>o.text)).size,4);
    assert.equal(q.options.filter(o=>o.id===q.correct).length,1);assert(q.explanation.trim());
    assert(data.topics.some(t=>t.id===q.topic));assert(lessons.some(l=>l.date===q.lesson));
  }
});

test('short mixed sessions remain balanced and topic practice stays within its topic',()=>{
  const r=runtime(),s=r.core.session('all','26',()=>0.3),q=new Map(r.data.questions.map(q=>[q.id,q]));
  assert.equal(s.queue.length,26);assert.equal(new Set(s.queue).size,26);
  for(const t of r.data.topics)assert.equal(s.queue.filter(id=>q.get(id).topic===t.id).length,2);
  assert.equal(new Set(s.queue.slice(0,13).map(id=>q.get(id).topic)).size,13);
  const single=r.core.session('numbers','all');assert.equal(single.queue.length,6);
  assert(single.queue.every(id=>q.get(id).topic==='numbers'));
  assert.equal(r.core.session('all','all').queue.length,78);
});

test('a choice must be selected and submitted; checking twice cannot double-score',()=>{
  const r=runtime();r.$('start').fire('click');assert.equal(r.$('feedback').hidden,true);assert(r.$('next').disabled);
  r.$('form').fire('submit');assert.equal(r.core.summarize(r.state()).answered,0);
  const q=r.q();r.select(q.correct);assert.equal(r.core.summarize(r.state()).answered,0);assert(!r.$('check').disabled);
  r.$('form').fire('submit');r.$('form').fire('submit');const score=r.core.summarize(r.state());
  assert.equal(score.answered,1);assert.equal(score.correct,1);assert.match(r.$('feedback').allText,/Correct/);
  assert(r.$('feedback').allText.includes(q.explanation));assert(r.$('check').disabled);assert(!r.$('next').disabled);
  assert(r.$('choices').children.every(label=>label.children[0].disabled));
});

test('incorrect choices reveal the right answer and feedback without awarding a point',()=>{
  const r=runtime();r.$('start').fire('click');const q=r.q(),wrong=q.options.find(o=>o.id!==q.correct);
  r.select(wrong.id);r.$('form').fire('submit');assert.equal(r.core.summarize(r.state()).correct,0);
  assert.match(r.$('feedback').allText,/Incorrect/);assert(r.$('feedback').allText.includes(q.options.find(o=>o.id===q.correct).text));
  assert.equal(r.$('choices').children.filter(x=>x.className.includes('is-correct')).length,1);
  assert.equal(r.$('choices').children.filter(x=>x.className.includes('is-wrong')).length,1);
});

test('pending choices, option order, checked feedback and position survive reload',()=>{
  const saved={};let r=runtime(saved);r.$('topic').value='contractions';r.$('topic').fire('change');r.$('start').fire('click');
  const first=r.q();r.select(first.correct);const before=r.state();r=runtime(saved);
  assert.equal(r.q().id,first.id);assert.deepEqual(r.state().orders,before.orders);assert.equal(r.$('feedback').hidden,true);
  assert(r.$('choices').children.some(label=>label.children[0].checked));
  r.$('form').fire('submit');r=runtime(saved);assert.equal(r.$('feedback').hidden,false);assert(r.$('check').disabled);
  r.$('next').fire('click');const second=r.q().id;r=runtime(saved);assert.equal(r.q().id,second);assert.equal(r.state().index,1);
});

test('results count unanswered items, persist and retry only missed or unsubmitted items',()=>{
  const saved={};let r=runtime(saved);r.$('topic').value='numbers';r.$('topic').fire('change');r.$('start').fire('click');
  const correctId=r.q().id;r.select(r.q().correct);r.$('form').fire('submit');r.$('next').fire('click');
  r.select(r.q().options.find(o=>o.id!==r.q().correct).id);r.$('form').fire('submit');r.$('end').fire('click');
  assert.match(r.$('result-title').textContent,/1 \/ 6 correct \(17%\)/);assert.match(r.$('result-detail').textContent,/2 answered · 4 unanswered/);
  assert.equal(r.$('review').children.length,5);assert.equal(r.$('breakdown').children.length,1);
  r=runtime(saved);assert(!r.$('results').hidden);assert.match(r.$('result-title').textContent,/1 \/ 6/);
  r.$('retry').fire('click');assert.equal(r.state().queue.length,5);assert(!r.state().queue.includes(correctId));assert.equal(r.core.summarize(r.state()).answered,0);
});

test('a complete correct attempt finishes with no retry and can start a new session',()=>{
  const r=runtime();r.$('topic').value='time';r.$('topic').fire('change');r.$('start').fire('click');
  for(let i=0;i<6;i++){r.select(r.q().correct);r.$('form').fire('submit');r.$('next').fire('click');}
  assert(!r.$('results').hidden);assert.match(r.$('result-title').textContent,/6 \/ 6 correct \(100%\)/);assert(r.$('retry').disabled);
  r.$('new').fire('click');assert(!r.$('setup').hidden);assert.equal(r.$('topic').value,'time');assert.equal(r.state().queue.length,0);
});

test('blocked, malformed or obsolete saved data cannot break the exam runner',()=>{
  const blocked=runtime({},true);assert(!blocked.$('storage-note').hidden);blocked.$('start').fire('click');
  blocked.select(blocked.q().correct);blocked.$('form').fire('submit');assert.match(blocked.$('feedback').allText,/Correct/);
  const malformed=runtime({[key]:'{broken'});malformed.$('start').fire('click');assert(malformed.$('storage-note').hidden);
  const r=runtime();const s=r.core.session('all','13');s.queue[0]='removed-question';assert.equal(r.core.restore(s).stage,'setup');
  const unknown=r.core.restore({version:1,stage:'setup',filter:'unknown',size:'999'});assert.equal(unknown.filter,'all');assert.equal(unknown.size,'all');
});

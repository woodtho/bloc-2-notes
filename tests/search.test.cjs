const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};vm.createContext(ctx);
for(const file of ['search.js','search-index.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),ctx);
const core=ctx.window.FrenchSearchCore,index=ctx.window.FRENCH_SEARCH_INDEX,engine=core.createEngine(index);
const ids=results=>Array.from(results,r=>r.entry.id);

test('search ignores case, accents, punctuation and ligatures',()=>{
  assert.equal(core.fold('ŒUVRE, reçu!'),'oeuvre recu');
  assert.deepEqual(ids(engine.search('PASSÉ COMPOSÉ')),ids(engine.search('passe compose')));
  assert(engine.search('recoit').some(r=>core.fold(r.entry.title+' '+r.entry.text).includes('recoit')));
});
test('fuzzy search tolerates swapped letters, omissions and joined words',()=>{
  assert.equal(core.distance('imparfiat','imparfait',2),1);
  assert(engine.search('imparfiat').some(r=>r.entry.kind==='notes'&&/imparfait/i.test(r.entry.title)));
  assert(engine.search('contrations').some(r=>/contractions/i.test(r.entry.title)));
  assert(engine.search('passecompose').some(r=>core.fold(r.entry.title).includes('passe compose')));
});
test('short French pronouns stay searchable and multiple terms must all match',()=>{
  for(const query of ['en','y']){
    const results=engine.search(query);assert(results.length);
    assert(results.every(r=>core.fold([r.entry.title,r.entry.text,r.entry.context].join(' ')).split(' ').includes(query)));
  }
  assert(engine.search('preceding direct object').length);
  assert.equal(engine.search('zzzxqvvv').length,0);assert.equal(engine.search('  ').length,0);
});
test('filters retain direct practice links for cards merged with lesson references',()=>{
  assert(engine.search('contractions','notes').every(r=>r.entry.kind==='notes'));
  assert(engine.search('aller','exam').every(r=>r.entry.kind==='exam'));
  const merged=index.documents.find(d=>d.practice&&d.kind!=='cards');assert(merged);
  assert(engine.search(merged.title,'cards').some(r=>r.entry.id===merged.id));
  assert(engine.search('aller','cards').every(r=>r.entry.practice||r.entry.url.startsWith('cards.html?')));
});
test('index covers all material and safe excerpts retain matching context',()=>{
  assert.equal(index.coverage.lessons,20);assert.equal(index.coverage.lesson_questions,969);
  assert.equal(index.coverage.flashcards,2647);assert.equal(index.coverage.exam_questions,78);
  assert.equal(index.documents.filter(d=>d.kind==='questions').length,970);
  assert.equal(index.documents.filter(d=>d.kind==='exam').length,79);
  assert.equal(new Set(index.documents.map(d=>d.id)).size,index.documents.length);
  const excerpt=core.excerpt('begin '.repeat(80)+'imparfait '+'end '.repeat(80),['imparfait']);
  assert(excerpt.includes('imparfait'));assert(excerpt.length<=228);
});

/* Multiple-choice exam practice; saved only in this browser. */
(function () {
  'use strict';
  const B=window.FRENCH_EXAM;
  if(!B)return;
  const questions=new Map(B.questions.map(q=>[q.id,q]));
  const topics=new Map(B.topics.map(t=>[t.id,t.label]));
  const linkedId=typeof location!=='undefined'?new URLSearchParams(location.search||'').get('question'):null;
  const linkedQuestion=questions.get(linkedId);
  const key=linkedQuestion?'bloc-2-notes-exam-search-v1':'bloc-2-notes-exam-v1';
  function shuffled(items,random=Math.random) {
    const result=[...items];
    for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  }
  function fresh(filter='all',size='all') {
    return {version:1,stage:'setup',filter:topics.has(filter)?filter:'all',size:['13','26','all'].includes(size)?size:'all',queue:[],orders:{},answers:{},index:0};
  }
  function session(filter,size,random=Math.random,ids) {
    const s=fresh(filter,size);
    if(ids) s.queue=shuffled(ids,random);
    else {
      // One question from each topic per round keeps shorter mixed sessions balanced.
      const topicIds=s.filter==='all'?shuffled([...topics.keys()],random):[s.filter];
      const pools=topicIds.map(t=>shuffled(B.questions.filter(q=>q.topic===t).map(q=>q.id),random));
      for(let round=0;pools.some(pool=>pool.length>round);round++)
        pools.forEach(pool=>{if(pool[round])s.queue.push(pool[round]);});
      if(s.size!=='all')s.queue=s.queue.slice(0,Number(s.size));
    }
    for(const id of s.queue)s.orders[id]=shuffled(questions.get(id).options.map(o=>o.id),random);
    s.stage=s.queue.length?'play':'setup';return s;
  }
  function restore(raw) {
    if(!raw||typeof raw!=='object'||raw.version!==1)return fresh();
    const s=fresh(raw.filter,raw.size);
    if(!['play','results'].includes(raw.stage))return s;
    if(!Array.isArray(raw.queue)||!raw.queue.length||raw.queue.length>B.questions.length||new Set(raw.queue).size!==raw.queue.length||raw.queue.some(id=>!questions.has(id)))return s;
    s.queue=[...raw.queue];s.stage=raw.stage;
    s.index=Number.isInteger(raw.index)?Math.max(0,Math.min(raw.index,s.queue.length-1)):0;
    for(const id of s.queue) {
      const valid=questions.get(id).options.map(o=>o.id),order=raw.orders&&raw.orders[id];
      s.orders[id]=Array.isArray(order)&&order.length===valid.length&&new Set(order).size===valid.length&&order.every(x=>valid.includes(x))?[...order]:valid;
      const a=raw.answers&&raw.answers[id];
      if(a&&valid.includes(a.selected))s.answers[id]={selected:a.selected,checked:a.checked===true};
    }
    if(s.stage==='play')for(let i=0;i<s.index;i++)if(!s.answers[s.queue[i]]?.checked){s.index=i;break;}
    return s;
  }
  function grade(id,choice) {return questions.has(id)&&questions.get(id).correct===choice;}
  function summarize(s) {
    let correct=0,answered=0;const missed=[];
    const byTopic=B.topics.map(t=>({id:t.id,label:t.label,correct:0,total:0}));
    for(const id of s.queue) {
      const q=questions.get(id),a=s.answers[id];
      const row=byTopic.find(t=>t.id===q.topic);row.total++;
      if(a?.checked)answered++;
      if(a?.checked&&grade(id,a.selected)){correct++;row.correct++;}else missed.push(id);
    }
    return {correct,answered,total:s.queue.length,missed,byTopic:byTopic.filter(t=>t.total)};
  }
  window.FrenchExamCore={fresh,session,restore,grade,summarize};
  const $=id=>document.getElementById(id);
  if(!$('exam-setup'))return;
  const make=(tag,className,text)=>{
    const el=document.createElement(tag);if(className)el.className=className;
    if(text!==undefined)el.textContent=text;return el;
  };
  const visible=(id,yes)=>$(id).hidden=!yes;
  let state=fresh(),storageWorks=true;
  try {state=restore(JSON.parse(localStorage.getItem(key)||'null'));}catch(_){storageWorks=false;}
  if(linkedQuestion&&(state.queue.length!==1||state.queue[0]!==linkedId))state=session(linkedQuestion.topic,'all',Math.random,[linkedId]);
  function persist() {
    try{localStorage.setItem(key,JSON.stringify(state));storageWorks=true;}catch(_){storageWorks=false;}
    $('exam-storage-note').hidden=storageWorks;
  }
  $('exam-storage-note').hidden=storageWorks;
  if(linkedQuestion){persist();$('exam-new').textContent='Return to exam prep';}
  for(const [value,label] of [['all','All topics'],...B.topics.map(t=>[t.id,t.label])]) {
    const option=make('option','',label);option.value=value;$('exam-topic').append(option);
  }
  $('exam-topic').value=state.filter;$('exam-length').value=state.size;
  function available() {
    const filter=$('exam-topic').value;
    const count=B.questions.filter(q=>filter==='all'||q.topic===filter).length;
    const total=filter==='all'?topics.size:1;
    const selected=$('exam-length').value==='all'?count:Math.min(count,Number($('exam-length').value));
    $('exam-available').textContent=`${selected===count?count:selected+' of '+count} questions · ${total} ${total===1?'topic':'topics'}`;
  }
  function showStage(stage) {
    for(const name of ['setup','play','results'])visible('exam-'+name,name===stage);
  }
  function start(ids) {
    state=session($('exam-topic').value,$('exam-length').value,Math.random,ids);
    persist();render();
  }
  function renderPlay() {
    const id=state.queue[state.index],q=questions.get(id),a=state.answers[id]||{};
    const result=summarize(state),checked=a.checked===true;
    $('exam-position').textContent=`Question ${state.index+1} of ${state.queue.length}`;
    $('exam-score').textContent=`${result.correct} / ${result.answered} correct`;
    $('exam-progress').max=state.queue.length;$('exam-progress').value=state.index+(checked?1:0);
    $('exam-topic-label').textContent=topics.get(q.topic);$('exam-prompt').textContent=q.prompt;
    $('exam-lesson').href=`lesson-${q.lesson}.html`;
    const refs=[];
    $('exam-choices').replaceChildren(...state.orders[id].map(oid=>{
      const option=q.options.find(o=>o.id===oid);
      const label=make('label','exam-choice'),input=make('input');
      input.type='radio';input.name='exam-choice';input.value=oid;input.checked=a.selected===oid;input.disabled=checked;
      label.append(input,make('span','',option.text));
      if(checked&&oid===q.correct){label.className+=' is-correct';label.append(make('span','exam-choice-note','Correct answer'));}
      else if(checked&&oid===a.selected){label.className+=' is-wrong';label.append(make('span','exam-choice-note','Your answer'));}
      refs.push(input);
      input.addEventListener('change',()=>{
        if(state.answers[id]?.checked||state.stage!=='play')return;
        refs.forEach(other=>other.checked=other===input);
        state.answers[id]={selected:oid,checked:false};$('exam-check').disabled=false;persist();
      });
      return label;
    }));
    $('exam-check').disabled=checked||!a.selected;$('exam-next').disabled=!checked;
    $('exam-next').textContent=state.index===state.queue.length-1?'See results':'Next question';
    const feedback=$('exam-feedback');feedback.replaceChildren();visible('exam-feedback',checked);
    if(checked) {
      const correct=grade(id,a.selected);feedback.className='answer-feedback'+(correct?'':' wrong');
      feedback.append(make('strong','',correct?'Correct':'Incorrect'),make('span','',q.options.find(o=>o.id===q.correct).text),make('p','',q.explanation));
    }
    $('exam-prompt').focus();
  }
  function renderResults() {
    const result=summarize(state);
    const percentage=result.total?Math.round(result.correct/result.total*100):0;
    $('exam-result-title').textContent=`${result.correct} / ${result.total} correct (${percentage}%)`;
    $('exam-result-detail').textContent=`${result.answered} answered · ${result.total-result.answered} unanswered`;
    $('exam-breakdown').replaceChildren(...result.byTopic.map(t=>{
      const row=make('li');row.append(make('span','',t.label),make('span','',`${t.correct} / ${t.total}`));return row;
    }));
    $('exam-retry').disabled=!result.missed.length;
    $('exam-review').replaceChildren(...(linkedQuestion?state.queue:result.missed).map(id=>{
      const q=questions.get(id),a=state.answers[id],item=make('section','review-item');
      const selected=a?.checked?q.options.find(o=>o.id===a.selected).text:'Not submitted';
      item.append(make('h3','',q.prompt),make('p','',`Your answer: ${selected}`),make('p','',`Correct answer: ${q.options.find(o=>o.id===q.correct).text}`),make('p','',q.explanation));
      const link=make('a','small-link','Review lesson');link.href=`lesson-${q.lesson}.html`;item.append(link);return item;
    }));
    $('exam-results').focus();
  }
  function render() {
    showStage(state.stage);available();
    if(state.stage==='play')renderPlay();else if(state.stage==='results')renderResults();
  }
  $('exam-start').addEventListener('click',()=>start());
  for(const id of ['exam-topic','exam-length'])$(id).addEventListener('change',()=>{
    state.filter=$('exam-topic').value;state.size=$('exam-length').value;available();persist();
  });
  $('exam-form').addEventListener('submit',event=>{
    event.preventDefault();if(state.stage!=='play')return;
    const id=state.queue[state.index],a=state.answers[id];if(!a||a.checked)return;
    a.checked=true;persist();renderPlay();$('exam-next').focus();
  });
  $('exam-next').addEventListener('click',()=>{
    if(state.stage!=='play'||!state.answers[state.queue[state.index]]?.checked)return;
    if(state.index===state.queue.length-1)state.stage='results';else state.index++;
    persist();render();
  });
  $('exam-end').addEventListener('click',()=>{if(state.stage!=='play')return;state.stage='results';persist();render();});
  $('exam-retry').addEventListener('click',()=>{const missed=summarize(state).missed;if(missed.length)start(missed);});
  $('exam-new').addEventListener('click',()=>{if(linkedQuestion){location.href='exam-prep.html';return;}state=fresh(state.filter,state.size);persist();render();$('exam-topic').focus();});
  render();
})();

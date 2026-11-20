/* Browser-local study tools. No network, account, or build-time service required. */
(function () {
  'use strict';
  const D = window.FRENCH_STUDY;
  if (!D) return;
  const $ = id => document.getElementById(id);
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const show = (id, yes = true) => { if ($(id)) $(id).hidden = !yes; };
  const topics = [...new Set(D.lessons.flatMap(l => l.topics))].sort();
  const byDate = new Map(D.lessons.map(l => [l.date, l]));
  const params = new URLSearchParams(location.search);
  const path = location.pathname.split('/').pop() || 'index.html';
  const progressKey = 'bloc-2-notes-question-progress-v1';
  const savedProgress = Object.create(null), storageNotices=[];
  let canSaveProgress=true;
  try {
    const stored=JSON.parse(localStorage.getItem(progressKey)||'{}');
    if(stored && typeof stored==='object' && !Array.isArray(stored)) {
      for(const [id,entry] of Object.entries(stored)) {
        if(!entry || typeof entry!=='object')continue;
        savedProgress[id]={};
        if(typeof entry.draft==='string')savedProgress[id].draft=entry.draft;
        if(typeof entry.known==='boolean')savedProgress[id].known=entry.known;
      }
    }
  } catch (_) { canSaveProgress=false; }
  function saveProgress(id,patch) {
    savedProgress[id]={...(savedProgress[id]||{}),...patch};
    try {localStorage.setItem(progressKey,JSON.stringify(savedProgress));canSaveProgress=true;}
    catch (_) {canSaveProgress=false;}
    storageNotices.forEach(notice=>notice.hidden=canSaveProgress);
  }
  function storageNotice(parent) {
    const notice=make('p','small-note','Answers cannot be saved in this browser.');
    notice.setAttribute('role','status');notice.hidden=canSaveProgress;
    storageNotices.push(notice);parent.append(notice);
  }
  if (path.startsWith('lesson-')) document.body.classList.add('lesson-page');
  const nav = path.startsWith('lesson-') || path === 'index.html' ? 'lessons' : path.replace('.html', '');
  document.querySelectorAll('[data-nav]').forEach(a => {
    if (a.dataset.nav === nav) a.setAttribute('aria-current', 'page');
  });
  // Tables remain usable on small screens without overflowing the page.
  document.querySelectorAll('table').forEach(table => {
    const wrapper = make('div', 'table-wrap');
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Scrollable reference table');
    table.parentNode.insertBefore(wrapper, table);
    wrapper.append(table);
  });

  // Keep the readable <details> answers as the no-JavaScript fallback.
  const lessonQuestions = [...document.querySelectorAll('details.source-question, details.lesson-question')];
  if (lessonQuestions.length) {
    const states = new Map();
    const toolbar = make('section', 'question-controls');
    toolbar.setAttribute('aria-label', 'Question controls');
    const progress = make('p', 'question-progress');
    progress.setAttribute('role', 'status');
    const filterLabel = make('label', '', 'Show');
    const filter = make('select'); filter.id = 'lesson-question-filter';
    filterLabel.htmlFor = filter.id;
    [['all','All questions'],['review','To review'],['known','Known']].forEach(([value,label]) => {
      const option = make('option','',label); option.value = value; filter.append(option);
    });
    filterLabel.append(filter);
    const showAll = make('button','button secondary','Show all answers'); showAll.type='button';
    const hideAll = make('button','button secondary','Hide all answers'); hideAll.type='button';
    toolbar.append(progress, filterLabel, showAll, hideAll);
    storageNotice(toolbar);
    lessonQuestions[0].parentNode.insertBefore(toolbar,lessonQuestions[0]);
    const empty = make('p','empty-state','No questions match this filter.'); empty.hidden=true;
    toolbar.parentNode.insertBefore(empty,lessonQuestions[0]);
    const controls=[];
    function updateQuestions() {
      let known=0, visible=0;
      lessonQuestions.forEach(detail => {
        const isKnown=states.get(detail)===true;
        if(isKnown)known++;
        detail.hidden=filter.value==='known'?!isKnown:filter.value==='review'?isKnown:false;
        if(!detail.hidden)visible++;
      });
      progress.textContent=`${known} / ${lessonQuestions.length} known`;
      empty.hidden=visible>0;
    }
    lessonQuestions.forEach((detail,index) => {
      const progressId=detail.dataset.questionId||`${path}:${index+1}`;
      const restored=savedProgress[progressId]||{};
      if(typeof restored.known==='boolean')states.set(detail,restored.known);
      detail.classList.add('question-item');
      const summary=detail.querySelector('summary');
      const state=make('span','question-state');summary.append(state);
      const answer=make('div','lesson-answer');answer.id=`lesson-model-${index+1}`;answer.hidden=true;
      const modelNodes=[...detail.children].filter(node=>node!==summary);
      answer.append(make('p','answer-label','Model answer'),...modelNodes);
      const label=make('label','question-answer-label','Your answer');
      const input=make('textarea');input.id=`lesson-draft-${index+1}`;input.rows=2;input.spellcheck=false;
      input.value=restored.draft||'';
      input.addEventListener('input',()=>saveProgress(progressId,{draft:input.value}));
      label.htmlFor=input.id;
      const reveal=make('button','button secondary','Show answer');reveal.type='button';
      reveal.setAttribute('aria-controls',answer.id);reveal.setAttribute('aria-expanded','false');
      const ratings=make('div','question-rating');ratings.hidden=true;
      const known=make('button','button secondary','I got it');known.type='button';known.setAttribute('aria-pressed','false');
      const review=make('button','button secondary','Review again');review.type='button';review.setAttribute('aria-pressed','false');
      ratings.append(known,review);
      if(typeof restored.known==='boolean') {
        known.setAttribute('aria-pressed',String(restored.known));review.setAttribute('aria-pressed',String(!restored.known));
        state.textContent=restored.known?'Known':'To review';
      }
      const editor=make('div','question-editor');editor.append(label,input,reveal,answer,ratings);detail.append(editor);
      function toggleAnswer(visible) {
        answer.hidden=!visible;ratings.hidden=!visible;
        reveal.textContent=visible?'Hide answer':'Show answer';
        reveal.setAttribute('aria-expanded',String(visible));
      }
      function rate(value) {
        states.set(detail,value);
        saveProgress(progressId,{draft:input.value,known:value});
        known.setAttribute('aria-pressed',String(value));review.setAttribute('aria-pressed',String(!value));
        state.textContent=value?'Known':'To review';
        updateQuestions();if(detail.hidden)filter.focus();
      }
      reveal.addEventListener('click',()=>toggleAnswer(answer.hidden));
      known.addEventListener('click',()=>rate(true));review.addEventListener('click',()=>rate(false));
      controls.push({detail,toggleAnswer});
    });
    showAll.addEventListener('click',()=>controls.forEach(({detail,toggleAnswer})=>{if(!detail.hidden){detail.open=true;toggleAnswer(true);}}));
    hideAll.addEventListener('click',()=>controls.forEach(({detail,toggleAnswer})=>{toggleAnswer(false);detail.open=false;}));
    filter.addEventListener('change',updateQuestions);updateQuestions();
    function revealLinkedQuestion(hash=location.hash){
      let target='';try{target=decodeURIComponent((hash||'').slice(1));}catch(_){}
      const linked=lessonQuestions.find(detail=>detail.id===target&&target);
      if(linked){filter.value='all';updateQuestions();linked.open=true;linked.scrollIntoView?.({block:'start'});}
    }
    revealLinkedQuestion();
    window.addEventListener?.('hashchange',()=>revealLinkedQuestion());
    document.addEventListener('click',event=>{
      if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button>0)return;
      const link=event.target.closest?.('a[href]');
      if(link&&link.pathname===location.pathname&&link.search===location.search)revealLinkedQuestion(link.hash);
    });
  }
  function shuffle(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function option(select, value, label) {
    const o = make('option', '', label); o.value = value; select.append(o);
  }
  function fillFilters(prefix) {
    option($(prefix + '-topic'), 'all', 'All topics');
    topics.forEach(t => option($(prefix + '-topic'), t, t));
    option($(prefix + '-lesson'), 'all', 'All lessons');
    D.lessons.forEach(l => option($(prefix + '-lesson'), l.date,
      `${String(l.order).padStart(2, '0')} · ${l.title}`));
    if (byDate.has(params.get('lesson'))) $(prefix + '-lesson').value = params.get('lesson');
    if (topics.includes(params.get('topic'))) $(prefix + '-topic').value = params.get('topic');
  }
  function matches(item, prefix) {
    const t = $(prefix + '-topic').value, l = $(prefix + '-lesson').value;
    return (t === 'all' || item.topics.includes(t)) && (l === 'all' || item.lesson === l);
  }
  function tile(l) {
    const card = make('article', 'lesson-tile');
    const meta = make('div', 'tile-meta');
    meta.append(make('span', '', `Lesson ${String(l.order).padStart(2, '0')}`),
      make('span', '', `${l.date.slice(0,2)} / ${l.date.slice(3)} · 2026`));
    const h = make('h3'), a = make('a', '', l.title); a.href = l.slug + '.html'; h.append(a);
    const tags = make('div', 'tile-tags'); l.topics.forEach(t => tags.append(make('span', 'tag', t)));
    const links = make('div', 'tile-actions');
    [['Read lesson', l.slug + '.html'], ['Quiz', `quizzes.html?lesson=${l.date}`],
      ['Cards', `cards.html?lesson=${l.date}`]].forEach(([text, href]) => {
        const link = make('a', '', text); link.href = href; links.append(link);
      });
    card.append(meta, h, make('p', '', l.summary), tags, links); return card;
  }
  if ($('lesson-grid')) {
    let topic = params.get('topic') || 'all';
    if (!topics.includes(topic)) topic = 'all';
    ['all', ...topics].forEach(t => {
      const b = make('button', '', t === 'all' ? 'All topics' : t); b.type = 'button';
      b.dataset.topic = t; b.addEventListener('click', () => { topic = t; render(); });
      $('topic-pills').append(b);
    });
    const render = () => {
      const search = $('lesson-search').value.trim().toLocaleLowerCase('en');
      let ls = D.lessons.filter(l => (topic === 'all' || l.topics.includes(topic)) &&
        `${l.title} ${l.summary} ${l.topics.join(' ')} ${l.date}`.toLocaleLowerCase('en').includes(search));
      if ($('lesson-order').value === 'recent') ls.sort((a,b) => b.order - a.order);
      if ($('lesson-order').value === 'title') ls.sort((a,b) => a.title.localeCompare(b.title));
      $('lesson-grid').replaceChildren(...ls.map(tile));
      if (!ls.length) $('lesson-grid').append(make('p','empty-state','No lessons match. Try another topic or a shorter search.'));
      $('library-count').textContent = `${ls.length} of ${D.lessons.length} lessons`;
      document.querySelectorAll('[data-topic]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.topic === topic)));
    };
    $('lesson-search').addEventListener('input', render);
    $('lesson-order').addEventListener('change', render); render();
  }
  function normalize(s) {
    return s.normalize('NFC').toLocaleLowerCase('fr').replace(/[’‘`]/g, "'")
      .replace(/[\p{P}\p{Z}\s]/gu, '').trim();
  }
  // Export only the pure matcher for meaningful automated checking.
  window.FrenchStudyCore = {normalize, correct: (value, accepted) => accepted.some(a => normalize(value) === normalize(a))};

  if ($('quiz-setup')) {
    fillFilters('quiz');
    storageNotice($('quiz-setup'));
    let queue = [], index = 0, responses = [], answered = false, revealed = false;
    const pool = () => D.questions.filter(q => matches(q, 'quiz'));
    function available() {
      const n = pool().length; $('quiz-available').textContent = `${n} questions match your selection.`;
      $('quiz-start').disabled = n === 0;
    }
    ['quiz-topic','quiz-lesson'].forEach(id => $(id).addEventListener('change',available)); available();
    function start(items) {
      const n = $('quiz-length').value; queue = shuffle(items).slice(0,n === 'all' ? items.length : Number(n));
      if (!queue.length) return;
      index = 0; responses = []; show('quiz-setup',false); show('quiz-results',false); show('quiz-play'); render();
    }
    function render() {
      const q = queue[index]; answered = false; revealed = false;
      $('quiz-position').textContent = `Question ${index+1} of ${queue.length}`;
      $('quiz-score').textContent = `${responses.filter(r => r.correct).length} correct so far`;
      $('quiz-progress').max = queue.length; $('quiz-progress').value = index;
      $('quiz-kind').textContent = q.mode === 'self' ? 'Open question · self-assessment' : 'Short answer · automatic check';
      $('quiz-prompt').textContent = q.prompt;
      $('quiz-lesson-link').href = byDate.get(q.lesson).slug + '.html';
      $('quiz-lesson-link').textContent = `Lesson ${byDate.get(q.lesson).order}: ${byDate.get(q.lesson).title}`;
      $('quiz-answer').value = savedProgress[q.id]?.draft||''; $('quiz-answer').disabled = false;
      $('quiz-check').disabled = false; $('quiz-check').textContent = q.mode === 'self' ? 'Reveal model answer' : 'Check answer';
      $('quiz-next').disabled = true; $('quiz-next').textContent = index+1 === queue.length ? 'See results →' : 'Next question →';
      show('quiz-feedback',false); show('self-buttons',false); $('quiz-answer').focus();
    }
    function record(correct) {
      if (answered) return;
      answered = true;
      const q = queue[index]; responses.push({q,correct,answer:$('quiz-answer').value,self:q.mode === 'self'});
      saveProgress(q.id,{draft:$('quiz-answer').value,known:correct});
      $('quiz-answer').disabled = true; $('quiz-check').disabled = true; $('quiz-next').disabled = false;
      $('quiz-score').textContent = `${responses.filter(r => r.correct).length} / ${responses.length} correct`;
      $('quiz-progress').value = index + 1; show('self-buttons',false); $('quiz-next').focus();
    }
    $('answer-form').addEventListener('submit', e => {
      e.preventDefault(); if (answered || revealed) return;
      const q = queue[index], value = $('quiz-answer').value.trim();
      if (!value) { $('quiz-answer').focus(); return; }
      saveProgress(q.id,{draft:$('quiz-answer').value});
      revealed = true;
      const feedback = $('quiz-feedback'); feedback.replaceChildren(); show('quiz-feedback');
      if (q.mode === 'self') {
        feedback.className = 'answer-feedback';
        feedback.append(make('strong','','Model answer'), make('span','',q.answer));
        show('self-buttons'); $('quiz-check').disabled = true; $('quiz-answer').disabled = true; $('quiz-yes').focus();
      } else {
        const correct = window.FrenchStudyCore.correct(value,q.accepted);
        feedback.className = 'answer-feedback' + (correct ? '' : ' wrong');
        feedback.append(make('strong','',correct ? 'Correct' : 'Expected answer'),make('span','',q.answer));
        if (!correct) feedback.append(make('p','small-note','If your phrasing differs, compare the grammar in the lesson. This checker recognizes the listed answer forms.'));
        record(correct);
      }
    });
    $('quiz-answer').addEventListener('input',()=>{if(queue[index])saveProgress(queue[index].id,{draft:$('quiz-answer').value});});
    $('quiz-yes').addEventListener('click',()=>record(true)); $('quiz-no').addEventListener('click',()=>record(false));
    $('quiz-next').addEventListener('click',()=>{if(!answered)return;index++;if(index>=queue.length)finish();else render();});
    function finish() {
      show('quiz-play',false);show('quiz-results');
      const correct = responses.filter(r=>r.correct).length, self = responses.filter(r=>r.self).length;
      $('quiz-result-title').textContent = responses.length ? `${correct} of ${responses.length} answers recalled.` : 'No answers submitted';
      $('quiz-result-detail').textContent = `${responses.length-self} automatically checked · ${self} self-assessed · ${queue.length-responses.length} unanswered.`;
      const missed = responses.filter(r=>!r.correct).map(r=>r.q);
      $('quiz-retry').disabled = missed.length === 0;
      $('quiz-review').replaceChildren(...responses.map(r=>{
        const item=make('div','review-item');item.append(make('h3','',`${r.correct?'✓':'↻'} ${r.q.prompt}`),
          make('p','',`Your answer: ${r.answer}`),make('p','',`Model: ${r.q.answer}`));
        const a=make('a','small-link','Review the lesson');a.href=byDate.get(r.q.lesson).slug+'.html';item.append(a);return item;
      }));
      $('quiz-results').focus();
    }
    $('quiz-start').addEventListener('click',()=>start(pool()));
    $('quiz-end').addEventListener('click',finish);
    $('quiz-retry').addEventListener('click',()=>start(responses.filter(r=>!r.correct).map(r=>r.q)));
    $('quiz-new').addEventListener('click',()=>{show('quiz-results',false);show('quiz-setup');available();$('quiz-start').focus();});
    const linked=D.questions.find(q=>q.id===params.get('question'));
    if(linked){$('quiz-lesson').value=linked.lesson;available();start([linked]);}
  }

  if ($('card-setup')) {
    fillFilters('card');
    const key='french-understood-mastery-v1';
    let mastery={},persist=true;
    try { const raw=localStorage.getItem(key); const parsed=raw?JSON.parse(raw):{}; if(parsed && typeof parsed==='object' && !Array.isArray(parsed))mastery=parsed; } catch (_) { persist=false; }
    function save() { if(persist)try{localStorage.setItem(key,JSON.stringify(mastery));}catch(_){persist=false;} }
    let queue=[],seen=0,ratings=[],flipped=false,againCount=new Map(),pending=[];
    const pool=()=>D.cards.filter(c=>matches(c,'card') && ($('card-kind').value==='all'||c.kind===$('card-kind').value) && (!$('card-unlearned').checked || mastery[c.id]!==true));
    function available(){const n=pool().length;$('card-available').textContent=`${n.toLocaleString('en')} cards match · ${Object.values(mastery).filter(v=>v===true).length} marked known overall.`;$('card-start').disabled=!n;}
    ['card-topic','card-lesson','card-kind','card-unlearned'].forEach(id=>$(id).addEventListener('change',available));available();
    function start(items,repeat=false){
      const n=$('card-length').value; queue=shuffle(items).slice(0,repeat||n==='all'?items.length:Number(n));
      if(!queue.length)return;
      seen=0;ratings=[];pending=[];againCount=new Map();show('card-setup',false);show('card-results',false);show('card-play');render();
    }
    function render(){
      if(!queue.length){finish();return;}
      flipped=false;const c=queue[0],reverse=$('card-direction').value==='reverse'&&c.kind==='Vocabulary';
      $('card-position').textContent=`${seen+1} · ${queue.length} cards left in this session`;
      $('card-session-score').textContent=`${ratings.filter(r=>r.known).length} marked known`;
      $('card-label').textContent=`${c.kind} · Lesson ${String(byDate.get(c.lesson).order).padStart(2,'0')}`;
      $('card-front').textContent=reverse?(c.translation||c.back):c.front;$('card-back').textContent=reverse?c.front:c.back;
      $('card-front').lang=c.kind==='Vocabulary'&&!reverse?'fr':'en';$('card-back').lang=c.kind==='Vocabulary'&&reverse?'fr':'en';
      show('card-back',false);$('flashcard').setAttribute('aria-pressed','false');$('flashcard').setAttribute('aria-label','Reveal answer');
      $('card-hint').textContent='Reveal answer';$('card-again').disabled=true;$('card-known').disabled=true;
      $('card-lesson-link').href=byDate.get(c.lesson).slug+'.html';$('card-lesson-link').textContent=`${byDate.get(c.lesson).title}`;
      $('flashcard').focus();
    }
    function flip(){if(!queue.length)return;flipped=!flipped;show('card-back',flipped);$('flashcard').setAttribute('aria-pressed',String(flipped));$('flashcard').setAttribute('aria-label',flipped?'Hide answer':'Reveal answer');$('card-hint').textContent=flipped?'':'Reveal answer';$('card-again').disabled=!flipped;$('card-known').disabled=!flipped;}
    function rate(known){
      if(!flipped||!queue.length)return;
      const c=queue.shift();ratings.push({c,known});mastery[c.id]=known;save();seen++;
      pending=pending.filter(x=>x.id!==c.id);
      if(!known){pending.push(c);const count=againCount.get(c.id)||0;if(count<1){queue.push(c);againCount.set(c.id,count+1);}}
      render();
    }
    function finish(){
      show('card-play',false);show('card-results');
      const rated=new Map(ratings.map(r=>[r.c.id,r]));
      const known=[...rated.values()].filter(r=>r.known).length;
      pending=[...rated.values()].filter(r=>!r.known).map(r=>r.c);
      $('card-result-title').textContent=`${known} of ${rated.size} reviewed cards marked known.`;
      $('card-result-detail').textContent=`${pending.length} cards still learning. ${queue.length} cards left unreviewed.${persist?'':' Browser storage is unavailable; ratings last for this page session.'}`;
      $('card-repeat').disabled=!pending.length;available();$('card-results').focus();
    }
    $('card-start').addEventListener('click',()=>start(pool()));$('flashcard').addEventListener('click',flip);
    $('card-again').addEventListener('click',()=>rate(false));$('card-known').addEventListener('click',()=>rate(true));
    $('card-end').addEventListener('click',finish);$('card-repeat').addEventListener('click',()=>start(pending,true));
    $('card-new').addEventListener('click',()=>{show('card-results',false);show('card-setup');available();$('card-start').focus();});
    $('clear-mastery').addEventListener('click',()=>{if(window.confirm('Reset the flashcard ratings saved in this browser?')){mastery={};save();available();const message=make('p','session-message','Card progress reset.');$('clear-mastery').parentNode.append(message);}});
    document.addEventListener('keydown',e=>{
      if($('card-play').hidden||e.ctrlKey||e.altKey||e.metaKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;
      if(e.code==='Space'&&!/^(BUTTON|A)$/.test(e.target.tagName)){e.preventDefault();flip();}
      if(e.key==='1'&&flipped){e.preventDefault();rate(false);}
      if(e.key==='2'&&flipped){e.preventDefault();rate(true);}
    });
    const linked=D.cards.find(c=>c.id===params.get('card'));
    if(linked){$('card-lesson').value=linked.lesson;$('card-kind').value=linked.kind;available();start([linked],true);}
  }
})();

/* Accent-insensitive fuzzy search. The generated index loads on demand, including file://. */
(function(){
  'use strict';
  const types={all:'All material',notes:'Lessons & notes',vocabulary:'Vocabulary',questions:'Questions',cards:'Flashcards',exam:'Exam prep'};
  const fold=text=>String(text||'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/œ/g,'oe').replace(/Œ/g,'OE').replace(/æ/g,'ae').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
  const words=text=>fold(text).split(' ').filter(Boolean);
  const ignored=new Set('the a an is are was were how what when where why to of for with and or in on vs explain please l d j c n s t m'.split(' '));
  function queryWords(query){const all=[...new Set(words(query))],useful=all.filter(w=>!ignored.has(w));return useful.length?useful:all;}
  function distance(a,b,max){
    if(Math.abs(a.length-b.length)>max)return max+1;
    let before=null,previous=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      const row=[i];let lowest=i;
      for(let j=1;j<=b.length;j++){
        row[j]=Math.min(previous[j]+1,row[j-1]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
        if(before&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])row[j]=Math.min(row[j],before[j-2]+1);
        lowest=Math.min(lowest,row[j]);
      }
      if(lowest>max)return max+1;
      before=previous;previous=row;
    }
    return previous[b.length];
  }
  function createEngine(index){
    const entries=index.documents,lexicon=new Map();
    const normalized=entries.map(entry=>({title:fold(entry.title),text:fold(entry.text),context:fold(entry.context)}));
    function add(word,id,weight){
      if(!word)return;let postings=lexicon.get(word);if(!postings){postings=new Map();lexicon.set(word,postings);}
      postings.set(id,Math.max(postings.get(id)||0,weight));
    }
    entries.forEach((entry,id)=>{
      for(const [field,weight] of [['title',6],['text',2]])for(const word of new Set(words(entry[field])))add(word,id,weight);
      const title=words(entry.title);
      for(let i=0;i<title.length-1;i++){const joined=title[i]+title[i+1];if(joined.length>=6)add(joined,id,4);}
    });
    const vocabulary=[...lexicon.keys()],matchCache=new Map();
    function matching(token){
      if(matchCache.has(token))return matchCache.get(token);
      const matches=[],max=token.length>=7?2:token.length>=4?1:0;
      for(const word of vocabulary){
        let similarity=0;
        if(word===token)similarity=1;
        else if(token.length>=3&&word.startsWith(token))similarity=0.8+0.1*token.length/word.length;
        else if(max&&Math.abs(word.length-token.length)<=max){const edits=distance(token,word,max);if(edits<=max)similarity=0.75*(1-edits/Math.max(token.length,word.length));}
        if(similarity)matches.push([word,similarity]);
      }
      if(matchCache.size>=80)matchCache.delete(matchCache.keys().next().value);
      matchCache.set(token,matches);return matches;
    }
    function allowed(entry,type){return type==='all'||entry.kind===type||(type==='cards'&&(entry.practice||entry.url.startsWith('cards.html?')));}
    function search(query,type='all'){
      const tokens=queryWords(query).slice(0,12);if(!tokens.length)return [];
      const scores=new Map();
      for(const token of tokens){
        const matched=new Map();
        for(const [word,similarity] of matching(token)){
          for(const [id,weight] of lexicon.get(word)){
            if(!allowed(entries[id],type))continue;
            const value=weight*similarity;
            if(value>(matched.get(id)?.score||0))matched.set(id,{score:value,word});
          }
        }
        for(const [id,match] of matched){let s=scores.get(id);if(!s){s={score:0,hits:0,words:[]};scores.set(id,s);}s.score+=match.score;s.hits++;s.words.push(match.word);}
      }
      const phrase=' '+fold(query)+' ',results=[];
      for(const [id,score] of scores){
        if(score.hits!==tokens.length)continue;
        if((' '+normalized[id].title+' ').includes(phrase))score.score+=12;
        else if((' '+normalized[id].text+' ').includes(phrase))score.score+=3;
        if(entries[id].kind==='notes')score.score+=4;
        score.score+=2*tokens.length/(words(entries[id].title).length+1);
        results.push({entry:entries[id],score:score.score,words:score.words});
      }
      return results.sort((a,b)=>b.score-a.score||a.entry.title.localeCompare(b.entry.title)||a.entry.id.localeCompare(b.entry.id));
    }
    return {search};
  }
  function excerpt(text,matches,length=220){
    text=String(text||'').replace(/\s+/g,' ').trim();if(text.length<=length)return text;
    const normalized=fold(text);let at=-1;
    for(const word of [...matches].sort((a,b)=>b.length-a.length)){
      const found=normalized.indexOf(word);if(found>=0){at=found;break;}
    }
    let start=Math.max(0,at-65);if(start>0){const space=text.indexOf(' ',start);if(space>=0)start=space+1;}
    let end=Math.min(text.length,start+length);if(end<text.length){const space=text.lastIndexOf(' ',end);if(space>start)end=space;}
    return (start?'… ':'')+text.slice(start,end)+(end<text.length?' …':'');
  }
  window.FrenchSearchCore={fold,queryWords,distance,createEngine,excerpt};
  if(typeof document==='undefined')return;
  const indexURL=document.currentScript?.getAttribute('data-search-index')||'assets/search-index.js';
  const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  let engine,loading;
  function load(){
    if(engine)return Promise.resolve(engine);
    if(window.FRENCH_SEARCH_INDEX){engine=createEngine(window.FRENCH_SEARCH_INDEX);return Promise.resolve(engine);}
    if(!loading)loading=new Promise((resolve,reject)=>{
      const script=make('script');script.src=indexURL;script.async=true;
      script.onload=()=>{if(window.FRENCH_SEARCH_INDEX){engine=createEngine(window.FRENCH_SEARCH_INDEX);resolve(engine);}else reject(Error('Missing search index'));};
      script.onerror=()=>reject(Error('Search index unavailable'));document.head.append(script);
    }).catch(error=>{loading=null;throw error;});
    return loading;
  }
  function mount(ui,page=false){
    for(const [value,label] of Object.entries(types)){const option=make('option','',label);option.value=value;ui.select.append(option);}
    ui.select.value='all';let results=[],limit=20,timer,request=0;
    function render(){
      ui.list.replaceChildren(...results.slice(0,limit).map(result=>{
        const e=result.entry,item=make('li','search-result'),link=make('a','search-result-title',e.title);
        link.href=ui.select.value==='cards'&&e.practice?e.practice:e.url;
        item.append(link,make('p','search-result-meta',`${types[ui.select.value==='cards'?'cards':e.kind]} · ${e.context}`),make('p','search-excerpt',excerpt(e.text,result.words)));
        if(e.practice&&ui.select.value!=='cards'){const practice=make('a','small-link','Practise card');practice.href=e.practice;item.append(practice);}
        return item;
      }));
      ui.more.hidden=results.length<=limit;
      ui.status.textContent=results.length?(results.length>limit?`Showing ${Math.min(limit,results.length)} of ${results.length} results`:`${results.length} ${results.length===1?'result':'results'}`):'No matches. Try a shorter phrase or another word.';
    }
    async function run(){
      clearTimeout(timer);const serial=++request,query=ui.input.value.trim();limit=20;
      const params=new URLSearchParams();if(query)params.set('q',query);if(ui.select.value!=='all')params.set('type',ui.select.value);
      if(ui.permalink)ui.permalink.href='search.html'+(params.size?'?'+params.toString():'');
      if(page&&typeof history!=='undefined')history.replaceState(null,'','search.html'+(params.size?'?'+params.toString():''));
      if(!query){results=[];ui.list.replaceChildren();ui.status.textContent='';ui.more.hidden=true;return;}
      ui.status.textContent='Loading search…';
      try{const ready=await load();if(serial!==request)return;results=ready.search(query,ui.select.value);render();}
      catch(_){if(serial===request){ui.list.replaceChildren();ui.more.hidden=true;ui.status.textContent='Search could not load. Try again.';}}
    }
    ui.input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(run,140);});
    ui.form.addEventListener('submit',event=>{event.preventDefault();run();});
    ui.select.addEventListener('change',run);
    ui.more.addEventListener('click',()=>{limit+=20;render();});
    return {run};
  }
  const pageForm=document.getElementById('site-search-form');let pageUI;
  if(pageForm){
    pageUI={form:pageForm,input:document.getElementById('site-search-input'),select:document.getElementById('site-search-type'),status:document.getElementById('site-search-status'),list:document.getElementById('site-search-results'),more:document.getElementById('site-search-more')};
    const controller=mount(pageUI,true),params=new URLSearchParams(location.search||'');
    pageUI.input.value=params.get('q')||'';pageUI.select.value=types[params.get('type')]?params.get('type'):'all';controller.run();
  }
  const trigger=document.getElementById('global-search-trigger');if(!trigger)return;
  trigger.setAttribute('aria-keyshortcuts','Control+k Meta+k /');
  let dialog,modal,controller,previousFocus;
  function open(){
    if(pageUI){pageUI.input.focus();return;}
    if(!dialog){
      dialog=make('dialog','search-dialog');dialog.id='global-search-dialog';dialog.setAttribute('aria-labelledby','global-search-title');
      if(typeof dialog.showModal!=='function'){dialog=null;location.href='search.html';return;}
      trigger.setAttribute('aria-haspopup','dialog');
      const top=make('div','search-dialog-top'),title=make('h2','','Search'),close=make('button','text-button','Close');title.id='global-search-title';close.type='button';close.setAttribute('aria-label','Close search');top.append(title,close);
      const form=make('form','search-form');form.setAttribute('role','search');
      const label=make('label','','Search all material'),input=make('input');input.type='search';input.id='global-search-input';input.autocomplete='off';input.spellcheck=false;label.htmlFor=input.id;label.append(input);
      const filter=make('label','','Material'),select=make('select');select.id='global-search-type';filter.htmlFor=select.id;filter.append(select);form.append(label,filter);
      const status=make('p','small-note');status.setAttribute('role','status');
      const scroll=make('div','search-results-wrap'),list=make('ol','search-results'),more=make('button','button secondary','Show more');more.type='button';more.hidden=true;scroll.append(list,more);
      const permalink=make('a','small-link','Open search page');permalink.href='search.html';
      dialog.append(top,form,status,scroll,permalink);document.body.append(dialog);
      modal={form,input,select,status,list,more,permalink};controller=mount(modal);
      close.addEventListener('click',()=>dialog.close());
      dialog.addEventListener('close',()=>{if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus({preventScroll:true});else trigger.focus({preventScroll:true});});
      dialog.addEventListener('click',event=>{
        if(!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&!(event.button>0)&&event.target.closest('a[href]'))dialog.close();
      });
    }
    if(!dialog.open){previousFocus=document.activeElement;dialog.showModal();}
    modal.input.focus();controller.run();
  }
  trigger.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button>0)return;event.preventDefault();open();});
  document.addEventListener('keydown',event=>{
    const editing=/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)||event.target.isContentEditable;
    if(((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k')||(event.key==='/'&&!editing&&!event.ctrlKey&&!event.metaKey&&!event.altKey)){event.preventDefault();open();}
  });
})();

"""Audit the built site with only the Python standard library."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,re,os,unicodedata,html,hashlib

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'docs'
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.links=[];self.ids=[];self.scripts=[];self.text=[];self.lang=None;self.titles=0;self.containers=0;self.section_headings=0;self.browser_title=False;self.title_text=''
  self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag=='html':self.lang=a.get('lang')
  if tag=='h1':self.titles+=1
  if tag in ('h2','h3','h4','h5','h6'):self.section_headings+=1
  if tag=='title':self.browser_title=True
  if a.get('class')=='main-container':self.containers+=1
  for key in ('href','src'):
   if key in a:self.links.append((tag,key,a[key]))
  if tag=='script' and a.get('src'):self.scripts.append(urlsplit(a['src']).path)
 def handle_endtag(self,tag):
  if tag=='title':self.browser_title=False
 def handle_data(self,data):
  self.text.append(data)
  if self.browser_title:self.title_text+=data

pages={p.name:Page(p.read_text(encoding='utf-8')) for p in SITE.glob('*.html')}
assert len(pages)==27,(len(pages),'expected 27 HTML pages')
assert 'about.html' not in pages,'Study guide page was not removed'
broken=[]
for name,page in pages.items():
 assert page.lang=='en',(name,page.lang)
 assert len(page.ids)==len(set(page.ids)),(name,'duplicate id')
 assert page.titles==1,(name,page.titles,'expected one main heading')
 assert page.containers==1,(name,'missing or duplicate layout wrapper')
 assert 'Bloc 2 notes' in re.sub(r'\s+',' ',page.title_text),(name,'missing site name in browser title')
 if name.startswith('lesson-'):
  source=(ROOT/(Path(name).stem+'.Rmd')).read_text(encoding='utf-8')
  expected=len(re.findall(r'^#{2,6}\s',source,re.M))
  assert page.section_headings==expected,(name,'Markdown headings did not render',page.section_headings,expected)
  assert '<details class="source-question"' in source or '<details class="lesson-question"' in source,(name,'missing inline questions')
 for tag,key,url in page.links:
  u=urlsplit(url)
  if u.scheme in ('http','https'):
   assert tag=='a',(name,'unexpected external resource',url)
   continue
  if u.scheme:continue
  target=unquote(u.path)
  f=(SITE/target) if target else SITE/name
  if not f.exists():broken.append((name,url))
  if u.fragment and f.suffix=='.html' and f.name in pages:
   if unquote(u.fragment) not in pages[f.name].ids:broken.append((name,url))
 for script in ('assets/data.js','assets/app.js','assets/search.js'):
  assert script in page.scripts,(name,'missing practice script',script)
 assert 'global-search-trigger' in page.ids,(name,'missing global search')
assert not broken,broken
text='\n'.join(' '.join(p.text) for p in pages.values())+(ROOT/'assets/data.js').read_text(encoding='utf-8')
text+=(ROOT/'assets/exam-data.js').read_text(encoding='utf-8')
text+=(ROOT/'assets/search-index.js').read_text(encoding='utf-8')
for removed in ('French notes for English-speaking learners','French lessons explained in English, with examples, vocabulary, quizzes and flashcards.','Study guide','Examples are fictional or generic. Names, personal routes and identifying details have been removed. Explanations are in English.'):
 assert removed not in text,('removed site copy remains',removed)
# Optional local-only source-name patterns are never committed with the site.
private_patterns=os.environ.get('BLOC2_PRIVACY_PATTERNS_FILE')
if private_patterns:
 blocked=Path(private_patterns).read_text(encoding='utf-8').strip()
 public='\n'.join(p.read_text(encoding='utf-8') for p in ROOT.rglob('*') if p.is_file() and '.git' not in p.parts and p.suffix in ('.Rmd','.js','.md','.json','.html','.py','.cjs','.yml'))
 assert not re.search(blocked,public,re.I),'source personal name or route leaked'
assert not re.search(r'\b(?:\d{3}[- ])?\d{3}[- ]\d{4}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}',text,re.I),'contact detail leaked'
raw=(ROOT/'assets/data.js').read_text(encoding='utf-8')
data=json.loads(raw[raw.index('{'):raw.rindex(';')])
manifest=json.loads((ROOT/'review/source-manifest.json').read_text(encoding='utf-8'))
assert len(manifest)==21
assert sum(m['quiz_questions'] for m in manifest)==len(data['questions'])==1006
assert sum(m['original_self_test_questions'] for m in manifest)==696
assert sum(m['original_example_bank_entries'] for m in manifest)==462
assert sum(m['original_vocabulary_entries'] for m in manifest)==1302
assert len(data['cards'])==2828
assert not list(SITE.glob('*Summary*')),'raw export included in output'
print(json.dumps({'html_pages':len(pages),'broken_local_links':len(broken),'quiz_questions':len(data['questions']),'flashcards':len(data['cards']),'privacy_scan':'passed','page_structure':'passed'},indent=2))

# Every source example and vocabulary entry retains a location within its lesson.
def norm(s):
 return re.sub(r'[^\w]+','',unicodedata.normalize('NFC',s).casefold())
ledger=json.loads((ROOT/'review/consolidation-ledger.json').read_text(encoding='utf-8'))
assert len(ledger)==21
assert sum(len(x['examples']) for x in ledger)==462
assert sum(len(x['vocabulary']) for x in ledger)==1302
question_ids=[]
for item in ledger:
 source=(ROOT/f"lesson-{item['lesson']}.Rmd").read_text(encoding='utf-8')
 reference=source[:re.search(r'^## Questions\s*$',source,re.M).start()]
 for entry in item['examples']+item['vocabulary']:
  forms=entry.get('paradigm_forms',[entry['french']])
  assert all(norm(form) in norm(reference) for form in forms),(item['lesson'],entry,'missing source material')
 examples=re.search(r'^## Examples\n(.*?)(?=^## Vocabulary reference)',source,re.M|re.S)
 if examples:
  keys=[norm(line.split('|')[1]) for line in examples[1].splitlines() if line.startswith('|')][2:]
  assert len(keys)==len(set(keys)),(item['lesson'],'duplicate reference example')
  notes=source[:examples.start()]
  assert not any(key in norm(notes) for key in keys),(item['lesson'],'example repeated in notes and reference')
 question_ids+=re.findall(r'data-question-id="([^"]+)"',source)
assert len(question_ids)==744 and len(set(question_ids))==744
assert set(question_ids)<=set(q['id'] for q in data['questions'])
print(json.dumps({'source_examples_retained':462,'source_vocabulary_retained':1302,'stable_inline_question_ids':len(question_ids),'consolidation_coverage':'passed'},indent=2))

# The new source flashcards all map to usable practice cards after consolidation.
new_lesson=next(x for x in ledger if x['lesson']=='11-18')
assert len(new_lesson['flashcards'])==39
assert all(entry['card_id'] in {c['id'] for c in data['cards']} for entry in new_lesson['flashcards'])

new_source=(ROOT/'lesson-11-18.Rmd').read_text(encoding='utf-8')
for q in (q for q in data['questions'] if q['lesson']=='11-18'):
 assert f'<span>{q["source_item"]}. {html.escape(q["prompt"])}</span>' in new_source,('inline/quiz prompt mismatch',q['id'])
 assert f'<p>{html.escape(q["answer"])}</p>' in new_source,('inline/quiz answer mismatch',q['id'])

latest=next(x for x in ledger if x['lesson']=='11-20')
assert len(latest['flashcards'])==45
assert all(entry['card_id'] in {c['id'] for c in data['cards']} for entry in latest['flashcards'])
latest_source=(ROOT/'lesson-11-20.Rmd').read_text(encoding='utf-8')
for q in (q for q in data['questions'] if q['lesson']=='11-20'):
 assert f'<span>{q["source_item"]}. {html.escape(q["prompt"])}</span>' in latest_source,('inline/quiz prompt mismatch',q['id'])
 assert f'<p>{html.escape(q["answer"])}</p>' in latest_source,('inline/quiz answer mismatch',q['id'])

# The new standalone exam scripts must be present and match their editable source.
assert 'exam-prep.html' in pages
for asset in ['exam-data.js','exam.js']:
 assert 'assets/'+asset in pages['exam-prep.html'].scripts
 assert (ROOT/'assets'/asset).read_text(encoding='utf-8')==(SITE/'assets'/asset).read_text(encoding='utf-8'),asset
exam_raw=(ROOT/'assets/exam-data.js').read_text(encoding='utf-8')
exam=json.loads(exam_raw[exam_raw.index('{'):exam_raw.rindex(';')])
assert len(exam['topics'])==13 and len(exam['questions'])==78
assert all((SITE/f"lesson-{q['lesson']}.html").exists() for q in exam['questions'])

# Search targets must resolve to the exact curated note, question or card.
search_raw=(ROOT/'assets/search-index.js').read_text(encoding='utf-8')
assert search_raw==(SITE/'assets/search-index.js').read_text(encoding='utf-8')
search=json.loads(search_raw[search_raw.index('{'):search_raw.rindex(';')])
assert search['coverage']==dict(lessons=21,lesson_questions=1006,flashcards=2828,exam_questions=78)
from urllib.parse import parse_qs
question_ids={q['id'] for q in data['questions']}
card_ids={c['id'] for c in data['cards']}
exam_ids={q['id'] for q in exam['questions']}
for entry in search['documents']:
 for url in [entry['url']]+([entry['practice']] if entry.get('practice') else []):
  u=urlsplit(url);assert not u.scheme and not u.netloc and '..' not in u.path
  assert u.path in pages,(entry['id'],url)
  if u.fragment:assert unquote(u.fragment) in pages[u.path].ids,(entry['id'],url)
  query=parse_qs(u.query)
  if u.path=='quizzes.html' and query:assert query['question'][0] in question_ids
  if u.path=='cards.html' and query:assert query['card'][0] in card_ids
  if u.path=='exam-prep.html' and query:assert query['question'][0] in exam_ids
version=hashlib.sha256(search_raw.encode('utf-8')).hexdigest()[:12]
for name in pages:
 assert f'data-search-index="assets/search-index.js?v={version}"' in (SITE/name).read_text(encoding='utf-8')
assert not (SITE/'build_search.py').exists()
print(json.dumps({'search_entries':len(search['documents']),'search_targets':'passed','index_cache_version':version},indent=2))

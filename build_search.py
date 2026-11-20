"""Build the offline search index and stable HTML targets using the standard library."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import quote
import hashlib, html, json, re, unicodedata

ROOT=Path(__file__).resolve().parent
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Node:
 def __init__(self,tag='',attrs=(),start='',parent=None):
  self.tag=tag;self.attrs=dict(attrs);self.start=start;self.end='';self.parent=parent;self.children=[]
 def walk(self):
  yield self
  for child in self.children:
   if isinstance(child,Node):yield from child.walk()
 def text(self):
  if self.tag in {'script','style','nav','noscript'}:return ''
  return ' '.join(child.text() if isinstance(child,Node) else html.unescape(child) for child in self.children)
 def render(self):
  return self.start+''.join(child.render() if isinstance(child,Node) else child for child in self.children)+self.end
 def identify(self,value):
  if self.attrs.get('id'):return self.attrs['id']
  self.start=self.start[:-1]+' id="'+html.escape(value,quote=True)+'">';self.attrs['id']=value;return value

class Document(HTMLParser):
 def __init__(self,source):
  super().__init__(convert_charrefs=False);self.root=Node();self.stack=[self.root];self.feed(source);self.close()
  assert self.root.render()==source,'HTML round-trip changed the document'
 def handle_starttag(self,tag,attrs):
  n=Node(tag,attrs,self.get_starttag_text(),self.stack[-1]);self.stack[-1].children.append(n)
  if tag not in VOID:self.stack.append(n)
 def handle_startendtag(self,tag,attrs):self.stack[-1].children.append(Node(tag,attrs,self.get_starttag_text(),self.stack[-1]))
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==tag:self.stack[i].end='</'+tag+'>';del self.stack[i:];return
  self.stack[-1].children.append('</'+tag+'>')
 def handle_data(self,value):self.stack[-1].children.append(value)
 def handle_entityref(self,value):self.handle_data('&'+value+';')
 def handle_charref(self,value):self.handle_data('&#'+value+';')
 def handle_decl(self,value):self.handle_data('<!'+value+'>')
 def handle_comment(self,value):self.handle_data('<!--'+value+'-->')
 def handle_pi(self,value):self.handle_data('<?'+value+'>')

def clean(value):return re.sub(r'\s+',' ',value).strip()
def norm(value):
 value=unicodedata.normalize('NFKD',value.casefold()).replace('œ','oe').replace('æ','ae')
 return ''.join(c for c in value if c.isalnum() and not unicodedata.combining(c))
def load_js(name):
 raw=(ROOT/'assets'/name).read_text(encoding='utf-8');return json.loads(raw[raw.index('{'):raw.rindex(';')])
def section(node):return node.tag=='div' and 'section' in node.attrs.get('class','').split()
def heading(node):return next((c for c in node.children if isinstance(c,Node) and re.fullmatch(r'h[1-6]',c.tag)),None)
def ancestor_section(node):
 p=node.parent
 while p is not None:
  if section(p):return p
  p=p.parent
 return None

def build():
 study=load_js('data.js');exam=load_js('exam-data.js');documents=[];inline={};rows={};qdocs={}
 def add(ident,kind,title,context,text,url):
  entry={'id':ident,'kind':kind,'title':clean(title),'context':context,'text':clean(text),'url':url};documents.append(entry);return entry
 for lesson in study['lessons']:
  date=lesson['date'];path=ROOT/'docs'/(lesson['slug']+'.html');source=path.read_text(encoding='utf-8');tree=Document(source)
  context=f"Lesson {lesson['order']:02} · {lesson['title']}"
  add('lesson:'+date,'notes',lesson['title'],f"Lesson {lesson['order']:02} · {date}",lesson['summary']+' · '+' '.join(lesson['topics']),path.name)
  used={n.attrs['id'] for n in tree.root.walk() if n.attrs.get('id')}
  def identify(node,prefix,text):
   if node.attrs.get('id'):return node.attrs['id']
   base=prefix+'-'+hashlib.sha256(text.encode('utf-8')).hexdigest()[:12];target=base;counter=2
   while target in used:target=base+'-'+str(counter);counter+=1
   used.add(target);return node.identify(target)
  for node in list(tree.root.walk()):
   if node.tag=='details' and node.attrs.get('data-question-id'):
    qid=node.attrs['data-question-id'];target=node.identify(qid);inline[qid]=path.name+'#'+quote(target,safe='-_')
   if section(node):
    h=heading(node)
    if not h:continue
    title=clean(h.text())
    if title in {'Questions','Vocabulary reference','Examples'}:continue
    content=[]
    for child in node.children:
     if not isinstance(child,Node) or child is h:continue
     if section(child) or child.tag in {'nav','details'} or child.attrs.get('class')=='lesson-actions':continue
     content.append(child.text())
    body=clean(' '.join(content))
    if body:add('note:'+date+':'+node.attrs.get('id',norm(title)),'notes',title,context,body,path.name+'#'+quote(node.attrs['id'],safe='-_'))
   if node.tag=='tr':
    cells=[c for c in node.children if isinstance(c,Node) and c.tag=='td']
    parent=ancestor_section(node);h=heading(parent) if parent else None
    title=clean(h.text()) if h else ''
    if len(cells)<2 or title not in {'Vocabulary reference','Examples'}:continue
    french=clean(cells[0].text());text=clean(node.text());kind='vocabulary' if title=='Vocabulary reference' else 'notes'
    target=identify(node,'vocab' if kind=='vocabulary' else 'example',text)
    entry=add('row:'+date+':'+target,kind,french,context+(' · Examples' if title=='Examples' else ''),text,path.name+'#'+target)
    rows.setdefault((date,norm(french)),[]).append(entry)
  path.write_text(tree.root.render(),encoding='utf-8')
 for q in study['questions']:
  lesson=next(l for l in study['lessons'] if l['date']==q['lesson']);qid=q['id']
  url=inline.get(qid,'quizzes.html?question='+quote(qid,safe='-_'))
  entry=add(qid,'questions',q['prompt'],f"Lesson {lesson['order']:02} · {lesson['title']}",q['prompt']+' '+q['answer'],url)
  qdocs.setdefault((q['lesson'],norm(q['prompt']),norm(q['answer'])),entry)
 for card in study['cards']:
  lesson=next(l for l in study['lessons'] if l['date']==card['lesson'])
  practice='cards.html?card='+quote(card['id'],safe='-_')
  entry=qdocs.get((card['lesson'],norm(card['front']),norm(card['back'])))
  if entry is None:
   matches=rows.get((card['lesson'],norm(card['front'])),[])
   if matches:entry=matches[0]
  if entry is not None:
   entry.setdefault('practice',practice)
   if norm(card['back']) not in norm(entry['text']):entry['text']+=' '+card['back']
  else:
   add('card:'+card['id'],'vocabulary' if card['kind']=='Vocabulary' else 'cards',card['front'],f"Lesson {lesson['order']:02} · {lesson['title']}",card['front']+' '+card['back'],practice)
 for q in exam['questions']:
  topic=next(t['label'] for t in exam['topics'] if t['id']==q['topic'])
  add(q['id'],'exam',q['prompt'],topic,q['prompt']+' '+' '.join(o['text'] for o in q['options'])+' '+q['explanation'],'exam-prep.html?question='+quote(q['id'],safe='-_'))
 add('page:exam','exam','Final exam prep','Practice','Multiple-choice questions: '+'; '.join(t['label'] for t in exam['topics']),'exam-prep.html')
 add('page:quizzes','questions','Quizzes','Practice','Questions by lesson and topic.','quizzes.html')
 add('page:cards','cards','Flashcards','Practice','Vocabulary, rules, patterns and worked examples by lesson and topic.','cards.html')
 assert len({d['id'] for d in documents})==len(documents)
 payload={'documents':documents,'coverage':{'lessons':len(study['lessons']),'lesson_questions':len(study['questions']),'flashcards':len(study['cards']),'exam_questions':len(exam['questions'])}}
 output='window.FRENCH_SEARCH_INDEX = '+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n'
 for folder in [ROOT/'assets',ROOT/'docs/assets']:(folder/'search-index.js').write_text(output,encoding='utf-8')
 version=hashlib.sha256(output.encode('utf-8')).hexdigest()[:12]
 for path in [ROOT/'assets/footer.html',ROOT/'docs/assets/footer.html',*sorted((ROOT/'docs').glob('*.html'))]:
  content=path.read_text(encoding='utf-8')
  content=re.sub(r'(?<=data-search-index=")[^"]*','assets/search-index.js?v='+version,content)
  path.write_text(content,encoding='utf-8')
 print(f"Indexed {len(documents)} search results ({len(output.encode('utf-8')):,} bytes); stable lesson targets generated.")

if __name__=='__main__':build()

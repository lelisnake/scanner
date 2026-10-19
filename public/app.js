import {terminal,stateName,parseKeywords,parseDomains,validateDomains,scopeDescription,groupProblems,filterRecords,csvText,progressState} from './ui-core.js';
const $=id=>document.getElementById(id), fields=['domains','max','mode','include','exclude','imageThreshold'];
const state={task:'urls',keywords:[],last:null,id:null,view:'overview',timer:null,polling:false,cancelling:false,finished:null,filters:{},rowCache:new Map(),groupCache:new Map()};
const defaults=()=>({search:'',priority:'',category:'',kind:'',sort:'default',page:0,size:50});
const filter=()=>state.filters[state.view]||(state.filters[state.view]=defaults());
const store={get(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}},remove(key){try{localStorage.removeItem(key);}catch{}}};
const lines=id=>$(id).value.split(/\n/).map(s=>s.trim()).filter(Boolean);
function showNotice(message){$('notice').textContent=message;$('notice').hidden=!message;}
function error(field,message,target=field){const node=$(field+'Error');node.textContent=message;node.hidden=!message;$(target).setAttribute('aria-invalid',String(Boolean(message)));if(message){$(target).closest('details')?.setAttribute('open','');$(target).focus();}}
function mode(task){state.task=task;for(const [id,value] of [['urlsTab','urls'],['keywordsTab','keywords']])$(id).setAttribute('aria-pressed',String(task===value));$('keywordFields').hidden=task!=='keywords';saveDraft();}
function draft(){return {task:state.task,keywords:state.keywords,...Object.fromEntries(fields.map(id=>[id,$(id).value])),seoAudit:$('seoAudit').checked,imageAudit:$('imageAudit').checked};}
function saveDraft(){store.set('scanner-draft-v3',draft());}
function restoreDraft(){const saved=store.get('scanner-draft-v3');if(!saved)return;for(const id of fields)if(saved[id]!==undefined)$(id).value=saved[id];state.keywords=Array.isArray(saved.keywords)?saved.keywords.slice(0,30):[];$('seoAudit').checked=Boolean(saved.seoAudit);$('imageAudit').checked=Boolean(saved.imageAudit);mode(saved.task==='keywords'?'keywords':'urls');}
function chip(label,onRemove){const span=document.createElement('span');span.className='chip';span.append(document.createTextNode(label));const button=document.createElement('button');button.type='button';button.textContent='×';button.setAttribute('aria-label',label+' entfernen');button.onclick=onRemove;span.append(button);return span;}
function renderKeywords(){$('keywordChips').replaceChildren(...state.keywords.map(word=>chip(word,()=>{state.keywords=state.keywords.filter(k=>k!==word);renderKeywords();saveDraft();}))); }
function addKeywords(value){const keys=[...new Set([...state.keywords,...parseKeywords(value)])];if(keys.length>30||keys.some(k=>k.length>100)){error('keyword','Maximal 30 Keywords mit jeweils höchstens 100 Zeichen.','keywordInput');return false;}state.keywords=keys;$('keywordInput').value='';error('keyword','','keywordInput');renderKeywords();saveDraft();return true;}
function scope(){const domains=parseDomains($('domains').value);$('scope').textContent=domains.length?domains.map(scopeDescription).join(' '):'Eine Domain prüft die gesamte Website. Eine URL mit Pfad prüft nur diese Seite und ihre Unterseiten.';$('imageSettings').hidden=!$('imageAudit').checked;}
$('urlsTab').onclick=()=>mode('urls');$('keywordsTab').onclick=()=>mode('keywords');
$('addKeyword').onclick=()=>addKeywords($('keywordInput').value);
$('keywordInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addKeywords(e.target.value);}};
$('keywordInput').onpaste=e=>{const text=e.clipboardData?.getData('text');if(text&&/[\n,;]/.test(text)){e.preventDefault();addKeywords(text);}};
$('settings').oninput=()=>{scope();saveDraft();};
$('newScan').onclick=()=>{$('setup').hidden=false;$('domains').focus();$('setup').scrollIntoView({behavior:'smooth',block:'start'});};
function configuration(){
 error('domain','','domains');error('keyword','','keywordInput');error('max','');error('image','','imageThreshold');
 const domains=parseDomains($('domains').value),domainError=validateDomains(domains);if(domainError){error('domain',domainError,'domains');return null;}
 if(state.task==='keywords'){if(!addKeywords($('keywordInput').value))return null;if(!state.keywords.length){error('keyword','Bitte mindestens ein Keyword hinzufügen.','keywordInput');return null;}}
 const maxPages=Number($('max').value);if(!Number.isInteger(maxPages)||maxPages<1||maxPages>5000){error('max','Bitte eine ganze Zahl zwischen 1 und 5000 eingeben.');return null;}
 const imageThresholdKb=Number($('imageThreshold').value);if($('imageAudit').checked&&(!Number.isFinite(imageThresholdKb)||imageThresholdKb<10||imageThresholdKb>10000)){error('image','Bitte 10 bis 10000 KB eingeben.','imageThreshold');return null;}
 const include=lines('include'),exclude=lines('exclude');if(include.length+exclude.length>100||[...include,...exclude].some(p=>p.length>500)){showNotice('Bitte höchstens 100 URL-Filter mit jeweils maximal 500 Zeichen verwenden.');$('include').closest('details').open=true;$('include').focus();return null;}
 return {task:state.task,domains,keywords:state.task==='keywords'?state.keywords:[],seoAudit:$('seoAudit').checked,imageAudit:$('imageAudit').checked,imageThresholdKb:$('imageAudit').checked?imageThresholdKb:200,maxPages,mode:$('mode').value,include,exclude};
}
$('scanForm').onsubmit=async e=>{
 e.preventDefault();if(state.id&&!terminal(state.last))return;const data=configuration();if(!data)return;showNotice('');saveDraft();$('scan').disabled=true;$('settings').disabled=true;
 try{const response=await fetch('/api/scans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),body=await response.json();if(!response.ok)throw Error(body.error||'Der Scan konnte nicht gestartet werden.');
 clearTimeout(state.timer);state.id=body.id;state.cancelling=false;state.finished=null;state.filters={};state.rowCache.clear();state.groupCache.clear();state.view='overview';store.set('scanner-current-v3',body.id);
 state.last={id:body.id,status:'queued',phase:'queued',task:data.task,configuration:data,seoAudit:data.seoAudit,imageAudit:data.imageAudit,imageThresholdKb:data.imageThresholdKb,include:data.include,exclude:data.exclude,stats:[],pages:[],results:[],problems:[],images:[],logs:[],createdAt:new Date().toISOString()};
 $('setup').hidden=true;render();$('runTitle').focus();await poll();
 }catch(err){showNotice(err.message);}finally{$('scan').disabled=false;$('settings').disabled=false;}
};
async function poll(){
 if(!state.id||state.polling)return;state.polling=true;clearTimeout(state.timer);const id=state.id;
 try{const response=await fetch('/api/scans/'+encodeURIComponent(id)),body=await response.json();
 if(response.status===404){store.remove('scanner-current-v3');state.id=null;showNotice('Der letzte Scan ist nicht mehr verfügbar. Er ist abgelaufen oder der Server wurde neu gestartet. Du kannst mit den gespeicherten Einstellungen neu starten.');$('setup').hidden=false;$('cancel').hidden=true;if(!state.last)$('run').hidden=true;else{state.last={...state.last,status:'failed',phase:'done',completedAt:new Date().toISOString(),error:'Serverergebnis nicht mehr verfügbar. Die angezeigten Daten sind ein lokales Teilergebnis.'};render();}return;}
 if(!response.ok)throw Error(body.error||'Server nicht erreichbar');if(state.id!==id)return;
 state.last=body;$('connection').hidden=true;render();if(terminal(body)){state.cancelling=false;if(state.finished!==id){state.finished=id;if(!$('results').contains(document.activeElement))$('resultTitle').focus({preventScroll:true});}}else state.timer=setTimeout(poll,1500);
 }catch(err){$('connectionText').textContent='Verbindung unterbrochen. Dein Scan kann auf dem Server weiterlaufen. '+err.message;$('connection').hidden=false;state.timer=setTimeout(poll,5000);}
 finally{state.polling=false;}
}
$('retry').onclick=()=>poll();
$('cancel').onclick=async()=>{if(!state.id||state.cancelling)return;state.cancelling=true;$('cancel').disabled=true;$('cancel').textContent='Wird gestoppt …';try{const response=await fetch('/api/scans/'+encodeURIComponent(state.id)+'/cancel',{method:'POST'});if(!response.ok)throw Error('Stoppen fehlgeschlagen');await poll();}catch(err){state.cancelling=false;$('cancel').disabled=false;$('cancel').textContent='Scan stoppen';showNotice(err.message);}};
function badge(text,priority){const node=document.createElement('span');node.className='badge'+(priority==='Hoch'?' high':priority==='Mittel'?' medium':'');node.textContent=text;return node;}
function link(url,text=url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.className='url';a.textContent=text;return a;}
function text(tag,value,className){const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;}
function details(label){const el=document.createElement('details');el.append(text('summary',label));return el;}
function sources(parent,urls){const list=[...new Set(urls||[])];if(!list.length){parent.append(text('p',!terminal(state.last)?'Quellseiten werden nach dem Seiten-Crawl ausgewertet.':'Keine verlinkende Quellseite im geprüften Bereich gefunden.','muted small'));return;}const el=details(list.length+' verlinkende Quellseite(n)');for(const url of list)el.append(link(url));parent.append(el);}
function definition(parent,values){const dl=document.createElement('dl');for(const [label,value] of values){dl.append(text('dt',label),text('dd',value===null||value===undefined||value===''?'–':Array.isArray(value)?value.join('\n'):String(value)));}parent.append(dl);}
function view(name){state.view=name;filter();applyFilters();renderView();}
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>view(button.dataset.view);
const viewLabels={overview:'Übersicht',problems:'SEO-Aufgaben',pages:'URLs & SEO',keywords:'Keyword-Treffer',http:'HTTP & Weiterleitungen',images:'Bilder'};
function render(){
 const j=state.last;if(!j)return;$('run').hidden=false;$('results').hidden=false;$('cancel').hidden=terminal(j);$('cancel').disabled=state.cancelling;$('cancel').textContent=state.cancelling?'Wird gestoppt …':'Scan stoppen';$('newScan').hidden=!terminal(j);
 $('runMode').textContent=(j.task==='keywords'?'Keyword-Scan':'URL-Crawl')+' · '+stateName(j.status);
 $('runTitle').textContent=(j.configuration?.domains||j.stats?.map(s=>s.startUrl||s.domain)||[]).join(' · ')||'Dein Scan';
 $('runConfig').textContent=[j.seoAudit?'SEO-Prüfung':'Ohne SEO-Prüfung',j.imageAudit?'Mit Bilderprüfung':'Ohne Bilderprüfung','Max. '+(j.configuration?.maxPages||5000)+' geprüfte Seiten je Domain',...(j.configuration?.keywords?.length?['Keywords: '+j.configuration.keywords.join(', ')]:[])].join(' · ');
 const progress=progressState(j);$('phase').textContent=progress.label;$('progressDetail').textContent=progress.detail;if(progress.percent===null)$('progress').removeAttribute('value');else $('progress').value=progress.percent;
 const seconds=Math.max(0,Math.floor(((j.completedAt?Date.parse(j.completedAt):Date.now())-Date.parse(j.createdAt))/1000));$('elapsed').textContent=Math.floor(seconds/60)+' Min '+seconds%60+' Sek';
 $('scanWarning').hidden=!(progress.partial||j.error);const limits=[];if(j.status==='cancelled')limits.push('Scan wurde gestoppt');for(const stat of j.stats||[]){if(stat.state==='limit')limits.push('Seitenlimit erreicht: '+stat.domain);if(stat.imageLimit)limits.push('Limit von 500 Bild-URLs erreicht: '+stat.domain);if(stat.state==='error')limits.push('Website nicht erreichbar: '+stat.domain);if(stat.blocked)limits.push(stat.blocked+' URLs durch robots.txt blockiert');if(stat.errors)limits.push(stat.errors+' Abruffehler');}$('scanWarning').textContent=j.error||'Teilergebnis: '+limits.join(' · ')+'. Die Auswertung kann unvollständig sein.';
 for(const button of document.querySelectorAll('[data-view]')){button.hidden=button.dataset.view==='keywords'&&j.task!=='keywords'||button.dataset.view==='images'&&!j.imageAudit;}
 if(state.view==='keywords'&&j.task!=='keywords'||state.view==='images'&&!j.imageAudit)state.view='overview';
 $('resultTitle').textContent='Ergebnisse · '+(j.task==='keywords'?'Keyword-Scan':'URL-Crawl');
 $('logs').textContent=(j.logs||[]).map(x=>x.time+' · '+x.type+' · '+x.url+' · '+x.message).join('\n')||'Noch keine Protokolleinträge.';
 renderOverview(progress);renderView();
}
function renderOverview(progress){
 const j=state.last,stats=j.stats||[],sum=key=>stats.reduce((n,s)=>n+(s[key]||0),0),problems=j.problems||[],affected=new Set(problems.map(p=>p.url)).size;
 const cards=[['Gefundene URLs',sum('discovered'),'pages'],['Geprüfte Seiten',sum('checked'),'pages'],['Befunde',terminal(j)?problems.length:'Noch offen','problems'],['Betroffene URLs',terminal(j)?affected:'Noch offen','problems']];
 $('metrics').replaceChildren(...cards.map(([name,value,target])=>{const div=document.createElement('div');div.className='metric';div.append(text('strong',String(value)));const button=text('button',name);button.onclick=()=>view(target);div.append(button);return div;}));
 $('assessment').textContent=!terminal(j)?'Auswertung läuft':progress.partial?'Ergebnisse mit Einschränkungen':problems.length?'Hier solltest du zuerst hinschauen':'Keine Befunde in den gewählten Prüfungen';
 $('assessmentText').textContent=!terminal(j)?'Die Aufgabenübersicht wird erst nach Abschluss erstellt. Live-Daten findest du bereits unter URLs.':progress.partial?'Prüfe zuerst die Einschränkungen und Abruffehler. Eine leere Aufgabenliste bedeutet hier nicht automatisch, dass alles in Ordnung ist.':problems.length+' Befunde auf '+affected+' URLs. Zusammengehörige Befunde sind als Aufgaben gruppiert.';
 $('auditLimits').textContent=j.imageAudit?'Bilder: maximal 500 Bild-URLs je Domain; img-, Lazy-Loading- und srcset-Quellen, keine CSS-Hintergrundbilder. Leerer Alt-Text kann bei dekorativen Bildern korrekt sein. Größen ohne vollständigen Download sind Mindestwerte.':'Die Bilderprüfung war für diesen Scan deaktiviert.';
 const top=groupProblems(problems).slice(0,4),signature=JSON.stringify(top);
 if($('topIssues').dataset.signature!==signature){$('topIssues').dataset.signature=signature;$('topIssues').replaceChildren(...top.map(g=>{const button=document.createElement('button');button.className='secondary';button.textContent=g.priority+' · '+g.issue+' · '+g.affected+' URLs';button.onclick=()=>{state.filters.problems={...defaults(),search:g.issue,priority:g.priority,category:g.category};view('problems');};return button;}));}
}
const help={problems:'Gleiche Befunde werden gruppiert. Prioritäten sind Prüfhinweise; bewusste Weiterleitungen und leere Alt-Texte können korrekt sein.',pages:'Kompakte Seitenübersicht. SEO-Angaben und Quellseiten stehen in den Details. Klicktiefe zählt ab der eingegebenen Start-URL.',keywords:'Eine Zeile je Keyword und Seite. Die Trefferzahl zählt Vorkommen im Seitentext.',http:'Nur interne Seiten im gewählten Crawl-Bereich. Details zeigen Weiterleitungsschritte und tatsächlich verlinkende Quellseiten.',images:'Größenschwelle: '+''};
function allRows(){const j=state.last||{};return state.view==='problems'?j.problems||[]:state.view==='keywords'?j.results||[]:state.view==='images'?j.images||[]:j.pages||[];}
function selectedRows(){
 const f=filter();let rows=filterRecords(allRows(),f.search);
 if(state.view==='problems')rows=rows.filter(p=>(!f.priority||p.priority===f.priority)&&(!f.category||p.category===f.category));
 if(f.kind)rows=rows.filter(p=>f.kind==='errors'?['error','http-error','not-image'].includes(p.status)||p.finalStatusCode>=400:f.kind==='redirects'?p.redirects?.length:f.kind==='missing'?p.missingAltSources?.length:f.kind==='empty'?p.emptyAltSources?.length:f.kind==='large'?p.bytes>(state.last.imageThresholdKb||200)*1024:true);
 if(f.sort!=='default')rows=[...rows].sort((a,b)=>f.sort==='url'?a.url.localeCompare(b.url):f.sort==='title'?(a.title||'').localeCompare(b.title||''):['bytes','count'].includes(f.sort)?(b[f.sort]??-1)-(a[f.sort]??-1):(a[f.sort]??Infinity)-(b[f.sort]??Infinity));return rows;
}
function applyFilters(){
 const f=filter(),sorts=[['default','Standard'],['url','URL A–Z']];
 if(['pages','http','images'].includes(state.view))sorts.push(['statusCode','HTTP-Code']);
 if(state.view==='pages')sorts.push(['title','Seitentitel A–Z'],['depth','Klicktiefe']);
 if(state.view==='images')sorts.push(['bytes','Bildgröße (absteigend)']);
 if(state.view==='keywords')sorts.push(['count','Vorkommen (absteigend)']);
 $('sort').replaceChildren(...sorts.map(([value,label])=>{const option=text('option',label);option.value=value;return option;}));
 for(const id of ['search','priority','category','sort'])$(id).value=f[id];
 const kinds=state.view==='http'?[['','Alle Seiten'],['errors','HTTP-/Abruffehler'],['redirects','Weiterleitungen']]:state.view==='images'?[['','Alle Bilder'],['missing','Alt-Attribut fehlt'],['empty','Alt-Text leer'],['large','Große Bilder'],['errors','Fehler / kein Bildtyp']]:[];
 $('kind').replaceChildren(...kinds.map(([value,label])=>{const option=text('option',label);option.value=value;return option;}));$('kind').value=f.kind;$('pageSize').value=String(f.size);
}
function renderView(){
 const j=state.last;if(!j)return;
 for(const button of document.querySelectorAll('[data-view]'))button.setAttribute('aria-pressed',String(button.dataset.view===state.view));
 const overview=state.view==='overview';$('overview').hidden=!overview;$('dataPanel').hidden=overview;$('exportToggle').disabled=overview;if(overview){$('exportMenu').hidden=true;return;}
 const f=filter();$('viewTitle').textContent=viewLabels[state.view];$('viewHelp').textContent=state.view==='images'?'Große Bilder ab '+(j.imageThresholdKb||200)+' KB. Fehlende und leere Alt-Attribute sind getrennt aufgeführt.':help[state.view];
 $('priorityField').hidden=$('categoryField').hidden=state.view!=='problems';$('kindField').hidden=!['http','images'].includes(state.view);
 if($('dataPanel').dataset.view!==state.view){$('dataPanel').dataset.view=state.view;state.rowCache.clear();state.groupCache.clear();$('rows').replaceChildren();$('groups').replaceChildren();applyFilters();}
 const rows=selectedRows(),grouped=state.view==='problems',records=grouped?groupProblems(rows):rows,pages=Math.max(1,Math.ceil(records.length/f.size));f.page=Math.max(0,Math.min(f.page,pages-1));
 $('rowCount').textContent=grouped?rows.length+' Befunde in '+records.length+' Gruppen · '+new Set(rows.map(p=>p.url)).size+' betroffene URLs':rows.length+' von '+allRows().length+' Ergebnissen';
 $('pageInfo').textContent='Seite '+(f.page+1)+' von '+pages;$('prev').disabled=f.page===0;$('next').disabled=f.page>=pages-1;
 $('tableWrap').hidden=grouped||!records.length;$('groups').hidden=!grouped||!records.length;$('empty').hidden=Boolean(records.length);$('pagination').hidden=!records.length;
 if(!records.length){const active=f.search||f.priority||f.category||f.kind;$('emptyTitle').textContent=!terminal(j)&&grouped?'Noch nicht ausgewertet':active?'Keine Ergebnisse für diese Filter':'Keine Ergebnisse';$('emptyText').textContent=!terminal(j)&&grouped?'Die Aufgaben werden nach Abschluss des Scans erstellt.':active?'Entferne einzelne Filter oder setze alle Filter zurück.':progressState(j).partial?'Die Prüfung ist unvollständig. Beachte die Einschränkungen oben.':!terminal(j)?'Dieser Bereich füllt sich im Verlauf des Scans.':'Für den gewählten Prüfumfang wurden hier keine Ergebnisse gefunden.';}
 $('exportFiltered').disabled=!rows.length;$('exportAll').disabled=!allRows().length;
 const chips=[];for(const id of ['search','priority','category','kind'])if(f[id])chips.push(chip((id==='kind'?$('kind').selectedOptions[0]?.textContent:f[id])||f[id],()=>{f[id]='';f.page=0;applyFilters();renderView();}));$('filterChips').replaceChildren(...chips);$('resetFilters').disabled=!chips.length&&f.sort==='default';
 const visible=records.slice(f.page*f.size,(f.page+1)*f.size);if(grouped)renderGroups(visible);else renderTable(visible);
}
function renderGroups(groups){
 const parent=$('groups'),desired=[];
 for(const group of groups){const signature=JSON.stringify(group),cached=state.groupCache.get(group.key);let el=cached?.element;
 if(!cached||cached.signature!==signature){const open=el?.open;el=details('');el.className='issue-group';el.open=Boolean(open);el.firstChild.replaceChildren(badge(group.priority,group.priority),text('span',group.issue),text('span',group.affected+' URLs · '+group.items.length+' Befunde','muted small'));
 el.append(text('p',group.recommendation,'muted small'));for(const p of group.items){const task=document.createElement('div');task.className='task';task.append(link(p.url));sources(task,p.sources);el.append(task);}state.groupCache.set(group.key,{signature,element:el});}
 desired.push(el);
 }syncChildren(parent,desired);
}
function syncChildren(parent,desired){for(const node of [...parent.children])if(!desired.includes(node))node.remove();for(let i=0;i<desired.length;i++)if(parent.children[i]!==desired[i])parent.insertBefore(desired[i],parent.children[i]||null);}
const headerSets={pages:['URL / Details','HTTP','Seitentitel','Befunde','Klicktiefe'],keywords:['Seite','Keyword','Vorkommen','Textausschnitt'],http:['URL / Details','HTTP Start → Ende','Ziel','Quellseiten'],images:['Bild / Details','HTTP','Dateigröße','Alt-Text-Prüfung']};
function renderTable(records){
 const headers=headerSets[state.view],signature=headers.join('|');if($('columns').dataset.signature!==signature){$('columns').dataset.signature=signature;const tr=document.createElement('tr');for(const h of headers){const th=text('th',h);th.scope='col';tr.append(th);}$('columns').replaceChildren(tr);$('caption').textContent=viewLabels[state.view];}
 const desired=[];let restoreFocus=null;
 for(const p of records){const key=p.url+'|'+(p.keyword||''),sig=JSON.stringify(p)+'|'+terminal(state.last),cached=state.rowCache.get(key);let tr=cached?.element;
 if(!cached||cached.signature!==sig){const focusIndex=tr?[...tr.querySelectorAll('a,summary,button')].indexOf(document.activeElement):-1;const openIndexes=[...(tr?.querySelectorAll('details')||[])].map((e,i)=>e.open?i:-1);tr=document.createElement('tr');const td=(index,value)=>{const el=text('td',value??'–');el.dataset.label=headers[index];tr.append(el);return el;};
 const first=td(0,'');first.append(link(p.url),text('span',stateName(p.status),'muted small'));const detail=details(state.view==='images'?'Bildvorschau & Details':'Details & Quellseiten');
 if(state.view==='pages'){td(1,httpCode(p));td(2,p.title||(!jSeo()?'Nicht angefordert':'–'));td(3,(p.issues||[]).join(', ')||(!terminal(state.last)?'Noch offen':'–'));td(4,p.depth??'Unbekannt');definition(detail,[['Title',p.title],['Meta-Description',p.description],['H1',p.h1],['Canonical',p.canonical],['Indexierbarkeit',p.indexability],['Robots',p.robots],['Eingehende / ausgehende Seiten',(p.incomingCount||0)+' / '+(p.outgoingCount||0)]]);sources(detail,p.sourceUrls||p.incoming);}
 if(state.view==='keywords'){first.lastChild.remove();td(1,p.keyword);td(2,p.count);td(3,p.snippet);}
 if(state.view==='http'){td(1,httpCode(p));td(2,p.finalUrl||'–');td(3,(p.sourceUrls||[]).length);definition(detail,[['Weiterleitungskette',(p.redirects||[]).map(h=>h.statusCode+' '+h.url+' → '+h.target)],['Abruffehler',p.requestError]]);sources(detail,p.sourceUrls);}
 if(state.view==='images'){td(1,p.statusCode??'–');td(2,p.bytes==null?'Noch unbekannt':Math.ceil(p.bytes/1024)+' KB'+(p.sizeExact?'':' oder mehr'));td(3,'Fehlt auf '+(p.missingAltSources||[]).length+' · Leer auf '+(p.emptyAltSources||[]).length+' Seite(n)');definition(detail,[['Prüfstatus',stateName(p.status)],['Abruffehler',p.error],['Endgültige URL',p.finalUrl],['Alt-Attribut fehlt auf',p.missingAltSources],['Alt-Text leer auf',p.emptyAltSources]]);
 if(p.status==='checked'){const button=text('button','Vorschau laden','secondary');button.onclick=()=>{const img=document.createElement('img');img.src=p.url;img.alt='Vorschau des geprüften Bildes';img.referrerPolicy='no-referrer';img.className='preview';img.loading='lazy';img.onerror=()=>{img.remove();button.textContent='Vorschau nicht verfügbar';};button.replaceWith(img);};detail.append(button);}sources(detail,p.sources);}
 if(state.view!=='keywords')first.append(detail);
 const detailsNow=[...tr.querySelectorAll('details')];for(const i of openIndexes)if(detailsNow[i])detailsNow[i].open=true;
 if(focusIndex>=0)restoreFocus=[...tr.querySelectorAll('a,summary,button')][focusIndex];state.rowCache.set(key,{signature:sig,element:tr});}
 desired.push(tr);
 }syncChildren($('rows'),desired);restoreFocus?.focus({preventScroll:true});
}
function jSeo(){return Boolean(state.last?.seoAudit);}
function httpCode(p){const code=p.statusCode;if(!code)return 'Noch unbekannt';const labels={200:'OK',301:'Dauerhaft umgeleitet',302:'Vorübergehend umgeleitet',403:'Zugriff verweigert',404:'Nicht gefunden',500:'Serverfehler',503:'Nicht verfügbar'};return code+(labels[code]?' – '+labels[code]:'')+(p.finalStatusCode&&p.finalStatusCode!==code?' → '+p.finalStatusCode:'');}
for(const id of ['search','priority','category','kind','sort'])$(id).oninput=()=>{filter()[id]=$(id).value;filter().page=0;renderView();};
$('resetFilters').onclick=()=>{state.filters[state.view]=defaults();applyFilters();renderView();};
$('prev').onclick=()=>{filter().page--;renderView();};$('next').onclick=()=>{filter().page++;renderView();};$('pageSize').onchange=()=>{filter().size=Number($('pageSize').value);filter().page=0;renderView();};
$('exportToggle').onclick=()=>{$('exportMenu').hidden=!$('exportMenu').hidden;$('exportToggle').setAttribute('aria-expanded',String(!$('exportMenu').hidden));};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('exportMenu').hidden=true;$('exportToggle').setAttribute('aria-expanded','false');}});
document.addEventListener('click',e=>{if(!e.target.closest('.export-wrap')){$('exportMenu').hidden=true;$('exportToggle').setAttribute('aria-expanded','false');}});
const columns={problems:['priority','category','issue','url','statusCode','sources','recommendation'],pages:['url','status','statusCode','finalStatusCode','title','description','h1','canonical','indexability','issues','depth','incomingCount','outgoingCount','sourceUrls'],keywords:['domain','url','title','keyword','count','snippet'],http:['url','status','statusCode','finalStatusCode','finalUrl','redirects','requestError','sourceUrls'],images:['url','status','statusCode','finalUrl','bytes','sizeExact','error','sources','missingAltSources','emptyAltSources']};
function download(rows,keys,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csvText(rows,keys)],{type:'text/csv;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$('exportMenu').hidden=true;$('exportToggle').setAttribute('aria-expanded','false');}
$('exportFiltered').onclick=()=>download(selectedRows(),columns[state.view],'scanner-'+state.view+'-gefiltert.csv');
$('exportAll').onclick=()=>download(allRows(),columns[state.view],'scanner-'+state.view+'-alle.csv');
$('exportLinks').onclick=()=>{const rows=new Map();for(const page of state.last?.pages||[])for(const source of page.sourceUrls||[])rows.set(source+'|'+page.url,{source,target:page.url});download([...rows.values()],['source','target'],'interne-links.csv');};
$('exportLog').onclick=()=>download(state.last?.logs||[],['time','domain','url','type','message'],'scan-protokoll.csv');
restoreDraft();renderKeywords();scope();
const savedId=store.get('scanner-current-v3');if(typeof savedId==='string'&&/^[a-f0-9-]{36}$/.test(savedId)){state.id=savedId;$('setup').hidden=true;$('run').hidden=false;$('phase').textContent='Letzten Scan wiederherstellen …';$('cancel').hidden=true;poll();}

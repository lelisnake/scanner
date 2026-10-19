import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
const UA='DomainKeywordScanner/3.1',MAX_LINKS=5000;
const filePattern=/\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|csv|txt|mp[34]|webm|ogg|wav)(?:$)/i;
const imagePattern=/\.(?:png|jpe?g|gif|webp|svg|ico|avif|bmp)(?:$)/i;
export function safeLink(raw,base){try{const u=new URL(raw,base||undefined);if(!/^https?:$/.test(u.protocol)||u.username||u.password||u.port&&!['80','443'].includes(u.port))return null;u.hash='';return u.href;}catch{return null;}}
export function linkKind(url){const path=new URL(url).pathname;return imagePattern.test(path)?'Bild':filePattern.test(path)?'Datei':'Seite';}
export function soft404(body){
 const $=typeof body==='string'?cheerio.load(body):body;
 const heading=/^(?:(?:fehler|error)\s*[:–—-]?\s*)?(?:404(?:\s*[:–—|-]\s*(?:seite\s+nicht\s+gefunden|page\s+not\s+found|not\s+found))?|(?:die\s+)?seite\s+(?:wurde\s+)?nicht\s+gefunden|page\s+not\s+found|not\s+found|seite\s+(?:existiert\s+nicht|nicht\s+verfügbar))(?:\s*\|.*|\s+[–—-]\s+.*)?$/i;
 const reasons=[];for(const [label,value] of [['Seitentitel',$('title').first().text()],['H1',$('h1').first().text()]]){const text=value.replace(/\s+/g,' ').trim();if(heading.test(text))reasons.push(label+' deutet auf eine Fehlerseite hin: '+text.slice(0,180));}
 const content=$('body').clone();content.find('script,style,noscript,nav,header,footer').remove();const text=content.text().replace(/\s+/g,' ').trim();
 if(!reasons.length&&text.length>0&&text.length<600&&/^(?:leider\s+)?(?:die\s+)?(?:angeforderte\s+)?(?:seite|page)\s+(?:wurde\s+nicht\s+gefunden|existiert\s+nicht|konnte\s+nicht\s+gefunden\s+werden|not\s+found)[.!\s]/i.test(text))reasons.push('Kurzer Haupttext enthält eine eindeutige Nicht-gefunden-Meldung.');
 return reasons;
}
function classify(record){
 const code=record.finalStatusCode??record.statusCode;record.issue='';record.priority='';record.recommendation='';
 if(record.status==='queued')return;
 if(record.status==='blocked'||record.status==='excluded'){record.issue='Nicht geprüft: '+(record.error||'Prüfung eingeschränkt');record.priority='Hinweis';record.recommendation='Prüfumfang bzw. robots.txt kontrollieren; kein bestätigter defekter Link.';}
 else if(code===404||code===410){record.issue='HTTP '+code+(record.redirects?.length?' nach Weiterleitung':'');record.priority='Hoch';record.recommendation='Quellseite öffnen und Verweis korrigieren oder entfernen. Nur bei passendem Ersatz eine Weiterleitung einrichten.';}
 else if(code>=400){record.issue='HTTP '+code;record.priority=[401,403,429].includes(code)?'Mittel':'Hoch';record.recommendation='Erreichbarkeit und Zugriff prüfen. Zugriffs- oder Rate-Limit-Antworten bestätigen keinen gelöschten Inhalt.';}
 else if(record.status==='error'){record.issue=record.failureType==='redirect-loop'?'Weiterleitungsschleife':'Nicht prüfbar: '+(record.error||'Abruffehler');record.priority=record.failureType==='redirect-loop'?'Hoch':'Mittel';record.recommendation='Ziel, Weiterleitungen und Serverzugriff manuell prüfen.';}
 else if(record.soft404){record.issue='Soft-404-Verdacht (HTTP '+code+')';record.priority='Hinweis';record.recommendation='Ziel manuell prüfen: Wird eine Fehlerseite mit erfolgreichem HTTP-Status ausgeliefert? Keine automatische Fehlerbestätigung.';}
 else if(record.kind==='Bild'&&record.contentType&&!/^image\//i.test(record.contentType)){record.issue='Bildziel liefert keinen Bildtyp';record.priority='Hoch';record.recommendation='Bild-URL und Antworttyp prüfen.';}
 else if(record.kind==='Datei'&&/html/i.test(record.contentType||'')){record.issue='Dateiziel liefert HTML statt Datei';record.priority='Hinweis';record.recommendation='Prüfen, ob eine beabsichtigte Vorschau oder eine Fehler-/Anmeldeseite geliefert wird.';}
}
export function createLinkAudit(job,{check,get}){
 const records=new Map(),pageCache=new Map(),robots=new Map();
 function add(raw,source,text='',kind=null,{imported=false,eligible=true,via='Link'}={}){
  if(!job.brokenAudit||!raw)return;
  const url=safeLink(raw,source);if(!url)return;
  let r=records.get(url);
  if(!r){if(records.size>=MAX_LINKS){job.linkLimit=true;return;}const pathname=new URL(url).pathname;
   r={url,kind:kind||(imagePattern.test(pathname)?'Bild':filePattern.test(pathname)?'Datei':'Seite'),external:false,imported,eligible,discoveredVia:[],occurrences:[],sources:[],linkTexts:[],status:'queued',statusCode:null,finalStatusCode:null,redirects:[],soft404:false,reasons:[]};records.set(url,r);job.brokenLinks.push(r);
  }
  r.imported||=imported;r.eligible||=eligible;
  if(!r.discoveredVia.includes(via))r.discoveredVia.push(via);
  if(source&&!r.occurrences.some(o=>o.source===source&&o.text===text)){r.occurrences.push({source,text});if(!r.sources.includes(source))r.sources.push(source);if(text&&!r.linkTexts.includes(text))r.linkTexts.push(text);}
  return r;
 }
 function page(record,body){pageCache.set(record.url,record);if(body&&record.finalStatusCode>=200&&record.finalStatusCode<300)record.soft404Reasons=soft404(body);}
 async function permitted(url){
  const origin=new URL(url).origin;if(!robots.has(origin)){let body='';try{body=(await get(origin+'/robots.txt',new URL(origin).hostname,true)).body;}catch{}robots.set(origin,robotsParser(origin+'/robots.txt',body));}
  return robots.get(origin).isAllowed(url,UA)!==false;
 }
 const hosts=new Set((job.configuration?.domains||[]).map(value=>{try{return new URL(/^https?:\/\//i.test(value)?value:'https://'+value).hostname.replace(/^www\./,'');}catch{return '';}}));
 const internal=url=>hosts.has(new URL(url).hostname.replace(/^www\./,''));
 async function inspect(r){
  r.external=job.task==='links'?false:!internal(r.url);
  if(!r.imported&&!r.eligible){r.status='excluded';r.error='Seite außerhalb des Crawl-Bereichs';return;}
  if(r.external&&!job.externalLinks&&!r.imported){r.status='excluded';r.error='Externe Linkprüfung deaktiviert';return;}
  const cachedImage=r.kind==='Bild'&&(job.images||[]).find(image=>image.url===r.url&&image.status!=='queued');
  if(cachedImage){Object.assign(r,{status:cachedImage.status,statusCode:cachedImage.statusCode,finalStatusCode:cachedImage.statusCode,finalUrl:cachedImage.finalUrl,error:cachedImage.error,contentType:cachedImage.status==='not-image'?'text/html':'image/*',checkedFromCache:true});return;}
  const cached=pageCache.get(r.url);
  if(cached&&cached.status!=='queued'&&!r.imported){Object.assign(r,{checkedFromCache:true,status:cached.status,statusCode:cached.statusCode,finalStatusCode:cached.finalStatusCode,finalUrl:cached.finalUrl,redirects:cached.redirects||[],failureType:cached.failureType,error:cached.requestError,soft404:Boolean(cached.soft404Reasons?.length),reasons:cached.soft404Reasons||[]});if(r.status==='excluded')r.error||='Weiterleitungsziel außerhalb des Crawl-Bereichs';if(r.status==='blocked')r.error||='robots.txt';return;}
  if(cached?.status==='queued'&&!r.imported){r.status='excluded';r.error='Seitenlimit oder Scan-Abbruch';return;}
  let url=r.url;const seen=new Set();
  for(let hop=0;hop<11;hop++){
   if(job.cancel)return;
   if(seen.has(url)){r.failureType='redirect-loop';throw Error('Weiterleitungsschleife');}seen.add(url);
   await check(url,new URL(url).hostname);
   if(!r.imported&&!internal(url)&&!job.externalLinks){r.status='excluded';r.error='Externes Weiterleitungsziel, externe Prüfung deaktiviert';return;}
   if(!await permitted(url)){r.status='blocked';r.error='robots.txt';return;}
   const response=await fetch(url,{redirect:'manual',headers:{'User-Agent':UA,Accept:'*/*'},signal:AbortSignal.timeout(12000)});
   r.statusCode??=response.status;r.finalStatusCode=response.status;r.finalUrl=url;r.contentType=response.headers.get('content-type')||'';
   if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();const target=location&&safeLink(location,url);if(!target)throw Error('Ungültiges Weiterleitungsziel');r.redirects.push({url,statusCode:response.status,target});if(hop===10)throw Error('Zu viele Weiterleitungen');url=target;continue;}
   r.status='checked';
   if(response.ok&&/html/i.test(r.contentType)){const reader=response.body?.getReader();let size=0,chunks=[];if(reader){while(size<=2000000){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000){await reader.cancel();r.bodyTruncated=true;break;}chunks.push(value);}}
    r.reasons=soft404(Buffer.concat(chunks).toString('utf8'));r.soft404=r.reasons.length>0;
   }else await response.body?.cancel();
   return;
  }
 }
 async function run(){
  if(!job.brokenAudit)return;job.phase='links';job.linkProgress={total:records.size,checked:0};
  for(const r of records.values()){if(job.cancel)break;try{await inspect(r);}catch(e){r.status='error';r.error=e.cause?.code||e.message;}classify(r);job.linkProgress.checked++;if(!r.checkedFromCache&&!['blocked','excluded'].includes(r.status))await new Promise(resolve=>setTimeout(resolve,80));}
 }
 function finalize(){
  for(const image of job.images||[]){if(!records.has(image.url))add(image.url,null,'','Bild',{via:'Bild'});}
  for(const r of records.values())classify(r);
 }
 function discover($,base,source,inScope,host){
  $('a[href]').each((_,el)=>{const node=$(el),url=safeLink(node.attr('href'),base);if(!url)return;const kind=linkKind(url),same=new URL(url).hostname.replace(/^www\./,'')===host.replace(/^www\./,'');const label=node.text().replace(/\s+/g,' ').trim()||node.find('img').attr('alt')||'[Ohne Linktext]';add(url,source,label,kind,{eligible:!same||kind!=='Seite'||inScope(url)});});
  $('img').each((_,el)=>{const node=$(el),candidates=['src','data-src','data-lazy-src'].map(attr=>node.attr(attr));for(const attr of ['srcset','data-srcset']){const value=node.attr(attr)||'';if(!value.startsWith('data:'))for(const entry of value.split(','))candidates.push(entry.trim().split(/\s+/)[0]);}for(const raw of new Set(candidates.filter(Boolean)))add(safeLink(raw,base),source,node.attr('alt')||'[Bild ohne Alt-Text]','Bild',{via:'Bild'});});
 }
 return {add,page,run,finalize,records,discover};
}

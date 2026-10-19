const unique=values=>[...new Set(values)];
const host=url=>{try{return new URL(url).hostname;}catch{return 'Unbekannt';}};
const codes=(value)=>value==null?['unknown']:[String(value)];
const stateLabels={checked:'Geprüft',queued:'Wartend',blocked:'Blockiert',excluded:'Außerhalb des Prüfumfangs',error:'Abruffehler','http-error':'HTTP-Fehler','not-image':'Kein Bildtyp'};
const seoLabels=['Title fehlt','Description fehlt','H1 fehlt','Mehrere H1','Title doppelt','Description doppelt'];
const options=items=>items.map(([value,label])=>({value,label}));
function group(id,label,getValues,items){return {id,label,getValues,options:items?options(items):null};}
const outcome=r=>[r.status||'unknown'];
const http=r=>codes(r.statusCode),finalHttp=r=>codes(r.finalStatusCode??r.statusCode);
const baseBrokenIssue=r=>r.status==='queued'||['excluded','blocked'].includes(r.status)?['unchecked']:r.status==='error'?['network']:[404,410].includes(r.finalStatusCode??r.statusCode)?[String(r.finalStatusCode??r.statusCode)]:r.soft404?['soft']:(r.finalStatusCode??r.statusCode)>=400?['http-other']:r.issue?['filetype']:['ok'];
const brokenIssue=r=>{const values=baseBrokenIssue(r);return values.some(v=>!['unchecked','ok'].includes(v))?[...values,'findings']:values;};
export const brokenDefaults=['findings'];
export function defaultFacets(view){return view==='broken'?{finding:[...brokenDefaults]}:{};}
export function filterDefinitions(view,rows,job={}){
 const defs=[];
 const domain=group('domain','Domain',r=>[host(r.url)]);
 const status=group('status','Prüfstatus',outcome);
 const first=group('http','HTTP-Status beim Aufruf',http);
 const last=group('finalHttp','HTTP-Status am Ziel',finalHttp);
 if(view==='pages'){
  defs.push(first,status);
  if(job.seoAudit){defs.push(group('seo','SEO-Befund',r=>r.status!=='checked'||!['completed','cancelled','failed'].includes(job.status)?['pending']:(r.issues?.length?r.issues:['none']),[...seoLabels.map(s=>[s,s]),['none','Keine erfassten SEO-Befunde'],['pending','Noch nicht ausgewertet / nicht geprüft']]));
  defs.push(group('index','Indexierbarkeit',r=>[r.status==='blocked'?'blocked':r.status!=='checked'?'unknown':r.indexability==='noindex'?'noindex':r.indexability==='Potenziell indexierbar'?'indexable':'unknown'],[['indexable','Potenziell indexierbar'],['noindex','noindex'],['blocked','robots.txt blockiert'],['unknown','Nicht geprüft / unbekannt']]));}
  defs.push(group('depth','Klicktiefe',r=>[r.depth==null?'unknown':r.depth===0?'0':r.depth<=2?'1-2':'3+'],[['0','0 – Start-URL'],['1-2','1 bis 2 Klicks'],['3+','Ab 3 Klicks'],['unknown','Unbekannt']]));
 }
 if(view==='keywords'){
  const words=unique([...(job.configuration?.keywords||[]),...rows.map(r=>r.keyword).filter(Boolean)]).sort((a,b)=>a.localeCompare(b,'de'));
  defs.push(group('keyword','Keyword',r=>[r.keyword],words.map(s=>[s,s])));
  defs.push(group('count','Vorkommen je Seite',r=>[r.count===1?'1':r.count<=5?'2-5':'6+'],[['1','1 Vorkommen'],['2-5','2 bis 5 Vorkommen'],['6+','Ab 6 Vorkommen']]));
 }
 if(view==='problems')defs.push(group('priority','Priorität',r=>[r.priority],[['Hoch','Hoch'],['Mittel','Mittel'],['Hinweis','Hinweis']]),group('category','Kategorie',r=>[r.category]),group('issue','Befund',r=>[r.issue]));
 if(view==='http'){
  defs.push(first,last,status,group('redirect','Weiterleitungen',r=>[r.failureType==='redirect-loop'?'loop':!r.redirects?.length?'none':r.redirects.length===1?'single':'chain'],[['none','Ohne Weiterleitung'],['single','Eine Weiterleitung'],['chain','Weiterleitungskette'],['loop','Weiterleitungsschleife']]));
 }
 if(view==='images'){
  defs.push(group('imageFinding','Bildbefund',r=>{const values=[];if(r.missingAltSources?.length)values.push('missing');if(r.emptyAltSources?.length)values.push('empty');if(r.bytes>(job.imageThresholdKb||200)*1024)values.push('large');if(r.statusCode>=400||['error','http-error','not-image'].includes(r.status))values.push('broken');if(['queued','blocked'].includes(r.status))values.push('pending');return values.length?values:['none'];},[['missing','Alt-Attribut fehlt'],['empty','Alt-Text leer'],['large','Über eingestellter Größenschwelle'],['broken','HTTP-/Abruffehler oder falscher Bildtyp'],['none','Keine erfassten Bildbefunde'],['pending','Noch nicht / nicht prüfbar']]),first,status);
  defs.push(group('size','Dateigröße',r=>[r.bytes==null?'unknown':!r.sizeExact?'minimum':r.bytes<=200*1024?'small':r.bytes<=1024*1024?'medium':'large'],[['small','Bis 200 KB'],['medium','Über 200 KB bis 1 MB'],['large','Über 1 MB'],['minimum','Nur Mindestgröße bekannt'],['unknown','Unbekannt']]));
 }
 if(view==='broken'){
  defs.push(group('finding','Befund',brokenIssue,[['findings','Alle Befunde / Verdachtsfälle'],['404','HTTP 404'],['410','HTTP 410'],['soft','Soft-404-Verdacht'],['http-other','Andere HTTP-Fehler'],['network','Abruffehler / Schleifen'],['filetype','Datei-/Bildtyp-Hinweise'],['unchecked','Nicht geprüft'],['ok','Kein Befund']]),last,group('type','Zieltyp',r=>[r.kind],[['Seite','Seiten'],['Datei','Dateien / PDFs'],['Bild','Bilder']]),group('location','Zielherkunft',r=>[r.imported?'import':r.external?'external':'internal'],[['internal','Intern entdeckt'],['external','Extern entdeckt'],['import','Direkt importiert']]));
 }
 defs.push(domain);
 return defs.map(def=>{
  if(def.options)return def;
  const vals=unique(rows.flatMap(def.getValues).filter(v=>v!==undefined));
  vals.sort((a,b)=>['http','finalHttp'].includes(def.id)?(Number(a)||Infinity)-(Number(b)||Infinity):String(a).localeCompare(String(b),'de'));
  return {...def,options:vals.map(value=>({value,label:value==='unknown'?'Nicht bekannt':def.id==='status'?stateLabels[value]||value:String(value)}))};
 });
}
export function applyTabFilters(rows,definitions,facets={},excludeGroup=null){
 return rows.filter(row=>definitions.every(def=>def.id===excludeGroup||!facets[def.id]?.length||def.getValues(row).some(value=>facets[def.id].includes(value))));
}
export function facetOptions(rows,definitions,facets,definition){
 const candidates=applyTabFilters(rows,definitions,facets,definition.id),counts=new Map();
 for(const row of candidates)for(const value of unique(definition.getValues(row)))counts.set(value,(counts.get(value)||0)+1);
 const opts=[...definition.options];
 for(const value of facets[definition.id]||[])if(!opts.some(o=>o.value===value))opts.push({value,label:value});
 return opts.map(o=>({...o,count:counts.get(o.value)||0}));
}

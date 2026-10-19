export const terminal = job => ['completed','cancelled','failed'].includes(job?.status);
export const stateName = value => ({queued:'Wartend',running:'Läuft',checked:'Geprüft',blocked:'Blockiert',excluded:'Außerhalb des Bereichs',error:'Abruffehler','http-error':'HTTP-Fehler','not-image':'Kein Bildtyp','skipped':'Nicht geprüft',completed:'Abgeschlossen',cancelled:'Gestoppt',failed:'Fehlgeschlagen',done:'Abgeschlossen'}[value]||value||'Noch nicht geprüft');
export function parseKeywords(value){return [...new Set(value.split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean))];}
export function parseDomains(value){return [...new Set(value.split(/\n/).map(s=>s.trim()).filter(Boolean))];}
export function validateDomains(values){if(!values.length||values.length>5)return 'Bitte 1 bis 5 Domains oder Start-URLs eingeben.';try{for(const value of values){const u=new URL(/^https?:\/\//i.test(value)?value:'https://'+value);if(!/^https?:$/.test(u.protocol)||u.username||u.password||u.port||!u.hostname.includes('.')||u.hostname==='localhost')throw Error();}}catch{return 'Bitte eine gültige öffentliche Domain oder HTTP(S)-URL eingeben.';}return '';}
export function scopeDescription(value){try{const u=new URL(/^https?:\/\//i.test(value)?value:'https://'+value),path=u.pathname.replace(/\/+$/,'');return path?'Nur '+u.hostname+path+' und die darunterliegenden Seiten.':'Gesamte Website '+u.hostname+' (einschließlich www-Variante).';}catch{return 'Der Crawl-Bereich wird automatisch aus deiner Eingabe ermittelt.';}}
export function groupProblems(problems){const groups=new Map();for(const p of problems){const key=p.priority+'|'+p.category+'|'+p.issue;if(!groups.has(key))groups.set(key,{key,...p,items:[]});groups.get(key).items.push(p);}return [...groups.values()].map(g=>({...g,affected:new Set(g.items.map(p=>p.url)).size}));}
export function filterRecords(records,query){const needle=query.trim().toLocaleLowerCase('de');return needle?records.filter(r=>JSON.stringify(r).toLocaleLowerCase('de').includes(needle)):records;}
export function csvText(items,keys){const scalar=value=>{let text=Array.isArray(value)?value.map(x=>typeof x==='object'?JSON.stringify(x):x).join(' | '):String(value??'');if(/^[=+@\-\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};return '\ufeff'+[keys,...items.map(item=>keys.map(k=>item[k]))].map(row=>row.map(scalar).join(';')).join('\r\n');}
export function progressState(job){
 const stats=job?.stats||[],sum=key=>stats.reduce((a,s)=>a+(s[key]||0),0);
 const partial=job?.linkLimit||Boolean(job?.brokenAudit&&(job.brokenLinks||[]).some(r=>['queued','blocked','error'].includes(r.status)||r.bodyTruncated))||job?.status==='cancelled'||job?.status==='failed'||stats.some(s=>['limit','error'].includes(s.state)||s.imageLimit||s.errors||s.blocked);
 if(terminal(job))return {label:stateName(job.status)+(partial?' · Prüfung unvollständig':''),percent:100,partial,detail:job.task==='links'?(job.linkProgress?.checked||0)+' von '+(job.linkProgress?.total||0)+' Linkzielen bearbeitet':sum('checked')+' Seiten geprüft · '+sum('errors')+' Abruffehler · '+sum('blocked')+' blockiert'};
 const phase=job?.phase||'discovering';
 if(phase==='links')return {label:'Linkziele prüfen',percent:job.linkProgress?.total?Math.floor(100*job.linkProgress.checked/job.linkProgress.total):null,detail:(job.linkProgress?.checked||0)+' von '+(job.linkProgress?.total||0)+' Linkzielen bearbeitet'};
 if(phase==='images')return {label:'Bilder prüfen',percent:sum('imagesTotal')?Math.floor(100*sum('imagesChecked')/sum('imagesTotal')):null,detail:sum('imagesChecked')+' von '+sum('imagesTotal')+' Bildern geprüft'};
 if(phase==='analysis')return {label:'Ergebnisse auswerten',percent:null,detail:'Linkstruktur und SEO-Befunde werden zusammengeführt.'};
 if(phase==='pages')return {label:'Seiten prüfen',percent:null,detail:sum('processed')+' URLs bearbeitet · '+sum('discovered')+' bisher entdeckt · '+sum('queued')+' warten'};
 return {label:'URLs ermitteln',percent:null,detail:sum('discovered')+' URLs gefunden · Sitemaps werden gelesen'};
}

export function faviconCandidates(input,declared){try{const root=new URL(/^https?:\/\//i.test(input)?input:'https://'+input),urls=[];if(declared){const icon=new URL(declared,root);if(/^https?:$/.test(icon.protocol)&&icon.hostname.replace(/^www\./,'')===root.hostname.replace(/^www\./,'')&&!icon.username&&!icon.password&&!icon.port)urls.push(icon.href);}urls.push(root.origin+'/favicon.ico');return [...new Set(urls)];}catch{return [];}}

export function parseURLImport(input){
 input=input.replace(/^\uFEFF/,'');const rows=[];let row=[],value='',quoted=false;
 for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===';'||c===',')){row.push(value.trim());value='';}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&input[i+1]==='\n')i++;row.push(value.trim());if(row.some(Boolean))rows.push(row);row=[];value='';}else value+=c;}
 row.push(value.trim());if(row.some(Boolean))rows.push(row);
 const first=rows[0]||[],column=first.findIndex(c=>/^(url|ziel[-_ ]?url|target[-_ ]?url|address)$/i.test(c));
 const values=column>=0?rows.slice(1).map(r=>r[column]||''):input.split(/\r?\n/).filter(s=>s.trim()).map(s=>s.trim().replace(/^"(.*)"$/,'$1'));
 const urls=[];let invalid=quoted?1:0;for(const raw of values){try{if(!/^https?:\/\//i.test(raw)||/\s/.test(raw))throw Error();const u=new URL(raw);if(u.username||u.password||u.port&&!['80','443'].includes(u.port))throw Error();u.hash='';urls.push(u.href);}catch{invalid++;}}
 return {urls:[...new Set(urls)],invalid};
}

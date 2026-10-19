import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=3197,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'ignore'});
let browser;
const id='12345678-1234-1234-1234-123456789012';
const root='https://www.bonava.de/immobilien/finkengarten';
const pageRecord={url:root,status:'checked',title:'Projekt Finkengarten',description:'Wohnen in Wildau',h1:['Finkengarten'],canonical:root,indexability:'Potenziell indexierbar',statusCode:200,finalStatusCode:200,sourceUrls:[root+'/nachbar'],incomingCount:1,outgoingCount:3,depth:0,issues:['Description doppelt']};
let job={id,status:'running',phase:'pages',task:'keywords',configuration:{domains:[root],keywords:['Segeln','Natur'],maxPages:5000,mode:'hybrid'},seoAudit:true,imageAudit:true,stats:[{startUrl:root,domain:'www.bonava.de',discovered:2,processed:1,checked:1,queued:1,state:'pages'}],pages:[pageRecord],results:[{url:root,keyword:'Natur',count:2,snippet:'Natur genießen',title:'Projekt'}],images:[],problems:[],logs:[],createdAt:new Date().toISOString()};
let body,gets=0,expired=false,networkFailure=false;
try{
 for(let i=0;i<100;i++){try{if((await fetch(origin+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,30));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/scans',async route=>{body=route.request().postDataJSON();await route.fulfill({status:202,json:{id}});});
 await page.route('**/api/scans/'+id,async route=>{gets++;if(networkFailure){await route.abort();return;}await route.fulfill({status:expired?404:200,json:expired?{error:'Scan nicht gefunden'}:job});});
 await page.route('**/api/scans/'+id+'/cancel',async route=>{job={...job,status:'cancelled',phase:'done',completedAt:new Date().toISOString()};await route.fulfill({json:{ok:true}});});
 await page.route('**/favicon.ico',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGNkYPjPQApgIkn1qIZRDUNKAwA+MAEfWiW9ygAAAABJRU5ErkJggg==','base64')}));
 await page.goto(origin);
 await page.getByRole('button',{name:'Scan starten',exact:true}).click();
 await page.locator('#domainError').waitFor({state:'visible'});assert.equal(await page.locator('#domains').getAttribute('aria-invalid'),'true');
 await page.locator('#domains').fill(root);await page.locator('#scope').filter({hasText:'Nur'}).waitFor();
 await page.locator('#keywordsTab').click();
 await page.locator('#keywordInput').fill('Segeln,Natur');await page.locator('#keywordInput').press('Enter');
 assert.equal(await page.locator('#keywordChips .chip').count(),2);
 await page.locator('#seoAudit').check();await page.locator('#imageAudit').check();
 await page.getByRole('button',{name:'Scan starten',exact:true}).click();
 await page.locator('#phase').filter({hasText:'Seiten prüfen'}).waitFor();
 assert.equal(await page.locator('#runTitle img').getAttribute('src'),'https://www.bonava.de/favicon.ico');assert.equal(await page.locator('#runTitle img').getAttribute('alt'),'');assert.equal(await page.locator('#runTitle img').getAttribute('width'),'24');await page.locator('#runTitle img').dispatchEvent('error');assert.equal(await page.locator('#runTitle img').isVisible(),false);assert((await page.locator('#runTitle').innerText()).includes(root));
 assert.deepEqual(body.keywords,['Segeln','Natur']);assert.equal(body.imageAudit,true);
 assert.equal(await page.locator('#setup').isVisible(),false);
 await page.locator('[data-view="pages"]').click();
 await page.locator('#rows details').first().locator(':scope > summary').click();
 const element=await page.locator('#rows details').first().elementHandle();
 const before=gets;while(gets===before)await new Promise(r=>setTimeout(r,100));
 assert(await element.evaluate(el=>el.isConnected&&el.open),'open details must persist across polls');
 await page.locator('#rows details > summary').first().focus();
 job={...job,pages:[{...pageRecord,description:'Neue Beschreibung',sourceUrls:[root+'/nachbar',root+'/quelle']}]};
 const beforeChange=gets;while(gets===beforeChange)await new Promise(r=>setTimeout(r,100));
 await page.waitForFunction(()=>document.querySelector('#rows dd')&&document.querySelector('#rows').textContent.includes('Neue Beschreibung'));
 assert(await page.locator('#rows details > summary').first().evaluate(el=>el===document.activeElement&&el.parentElement.open),'changed row must preserve open details and keyboard focus');
 job={...job,status:'completed',phase:'done',completedAt:new Date().toISOString(),stats:[{discovered:2,processed:2,checked:2,queued:0,state:'done'}],problems:[{priority:'Hoch',category:'HTTP',issue:'HTTP 404',url:root+'/1',sources:[root],recommendation:'Link korrigieren'},{priority:'Hoch',category:'HTTP',issue:'HTTP 404',url:root+'/2',sources:[root],recommendation:'Link korrigieren'}],images:[{url:'https://example.com/pic.png',status:'checked',statusCode:200,bytes:300000,sizeExact:true,missingAltSources:[root],sources:[root]}]};

 job.brokenAudit=true;job.brokenLinks=[
 {url:root+'/expose.pdf',kind:'Datei',status:'checked',statusCode:404,finalStatusCode:404,issue:'HTTP 404',priority:'Hoch',recommendation:'Link korrigieren',sources:[root,root+'/zweite'],occurrences:[{source:root,text:'Exposé herunterladen'},{source:root+'/zweite',text:'Preisliste'}],linkTexts:['Exposé herunterladen','Preisliste'],redirects:[],reasons:[]},
 {url:root+'/soft',kind:'Seite',status:'checked',statusCode:200,finalStatusCode:200,issue:'Soft-404-Verdacht (HTTP 200)',priority:'Hinweis',soft404:true,reasons:['H1: Seite nicht gefunden'],sources:[root],occurrences:[{source:root,text:'Wohnung'}]},
 {url:root+'/ok',kind:'Seite',status:'checked',statusCode:200,finalStatusCode:200,issue:'',sources:[],occurrences:[]}
 ];
 await page.locator('#phase').filter({hasText:'Abgeschlossen'}).waitFor();
 await page.locator('[data-view="problems"]').click();
 assert.equal(await page.locator('#groups details.issue-group').count(),1);
 await page.locator('#groups summary').first().click();
 assert((await page.locator('#groups').innerText()).includes(root+'/2'));
 await page.locator('#priority').selectOption('Mittel');await page.locator('#emptyTitle').filter({hasText:'Keine Ergebnisse für diese Filter'}).waitFor();
 await page.locator('#resetFilters').click();assert.equal(await page.locator('#groups details.issue-group').count(),1);
 await page.locator('[data-view="pages"]').click();
 await page.locator('#search').fill('not-found');assert.equal(await page.locator('#exportToggle').isEnabled(),true);
 await page.locator('#exportToggle').click();assert.equal(await page.locator('#exportFiltered').isEnabled(),false);assert.equal(await page.locator('#exportAll').isEnabled(),true);
 await page.keyboard.press('Escape');await page.locator('#resetFilters').click();
 await page.locator('#exportToggle').click();const downloadPromise=page.waitForEvent('download');await page.locator('#exportFiltered').click();const download=await downloadPromise;
 const csv=await readFile(await download.path(),'utf8');assert(csv.includes(root));assert(csv.includes('Projekt Finkengarten'));

 await page.locator('[data-view="broken"]').click();assert.equal(await page.locator('#rows > tr').count(),2);
 await page.locator('#kind').selectOption('404');assert.equal(await page.locator('#rows > tr').count(),1);
 await page.locator('#rows details > summary').first().click();assert((await page.locator('#rows').innerText()).includes('Exposé herunterladen'));assert((await page.locator('#rows').innerText()).includes('Preisliste'));
 await page.locator('#exportToggle').click();const brokenDownloadPromise=page.waitForEvent('download');await page.locator('#exportFiltered').click();const brokenDownload=await brokenDownloadPromise;
 const brokenCSV=await readFile(await brokenDownload.path(),'utf8');assert(brokenCSV.includes('Exposé herunterladen'));assert(brokenCSV.includes('Preisliste'));assert.equal(brokenCSV.split('\r\n').length,3);
 await page.locator('#kind').selectOption('soft');assert.equal(await page.locator('#rows > tr').count(),1);
 await page.locator('#kind').selectOption('');assert.equal(await page.locator('#rows > tr').count(),3);
 await page.locator('#newScan').click();await page.locator('#urlsTab').click();
 assert((await page.locator('#resultTitle').innerText()).includes('Keyword-Scan'),'draft mode must not relabel previous results');
 await page.reload();await page.locator('#phase').filter({hasText:'Abgeschlossen'}).waitFor();
 assert.equal(await page.locator('#setup').isVisible(),false);
 await mkdir('/tmp/scanner-qa',{recursive:true});
 await page.screenshot({path:'/tmp/scanner-qa/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.locator('[data-view="pages"]').click();
 await page.screenshot({path:'/tmp/scanner-qa/mobile-debug.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile page must not overflow horizontally');
 await page.screenshot({path:'/tmp/scanner-qa/mobile.png',fullPage:true});
 expired=true;await page.reload();await page.locator('#notice').filter({hasText:'nicht mehr verfügbar'}).waitFor();assert(await page.locator('#setup').isVisible());

 await page.setViewportSize({width:320,height:740});await page.locator('#keywordsTab').click();await page.screenshot({path:'/tmp/scanner-qa/setup-mobile-debug.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320px setup must fit');
 await page.screenshot({path:'/tmp/scanner-qa/setup-mobile.png',fullPage:true});
 expired=false;job={...job,status:'running',phase:'images',completedAt:null,stats:[{checked:2,discovered:2,imagesChecked:1,imagesTotal:2,state:'images'}]};
 await page.locator('#scan').click();await page.locator('#phase').filter({hasText:'Bilder prüfen'}).waitFor();assert.equal(await page.locator('#progress').getAttribute('value'),'50');
 networkFailure=true;await page.reload();await page.locator('#connection').waitFor({state:'visible'});
 networkFailure=false;await page.locator('#retry').click();await page.locator('#connection').waitFor({state:'hidden'});
 await page.locator('#cancel').click();await page.locator('#phase').filter({hasText:'Gestoppt'}).waitFor();assert((await page.locator('#scanWarning').innerText()).includes('Teilergebnis'));
 job={...job,status:'running',phase:'pages',completedAt:null};await page.locator('#newScan').click();await page.locator('#scan').click();await page.locator('#phase').filter({hasText:'Seiten prüfen'}).waitFor();
 expired=true;await page.locator('#phase').filter({hasText:'Fehlgeschlagen'}).waitFor();assert((await page.locator('#scanWarning').innerText()).includes('lokales Teilergebnis'));

 expired=false;
 await page.locator('#linksTab').click();assert.equal(await page.locator('#domainFields').isVisible(),false);
 await page.locator('#importFile').setInputFiles({name:'alte-urls.csv',mimeType:'text/csv',buffer:Buffer.from('URL;Notiz\nhttps://example.com/old;Alt\nhttps://example.com/expose.pdf;PDF')});
 await page.locator('#importCount').filter({hasText:'2 gültige URLs'}).waitFor();
 job={...job,task:'links',status:'completed',phase:'done',configuration:{domains:[],keywords:[],maxPages:5000},importedUrls:['https://example.com/old','https://example.com/expose.pdf'],stats:[],pages:[],results:[],seoAudit:false,imageAudit:false,completedAt:new Date().toISOString()};
 await page.locator('#scan').click();await page.locator('#phase').filter({hasText:'Abgeschlossen'}).waitFor();
 assert.equal(body.task,'links');assert.equal(body.importedUrls.length,2);assert.deepEqual(body.domains,[]);assert.equal(body.imageAudit,false);
 assert((await page.locator('#resultTitle').innerText()).includes('URL-Listenprüfung'));
 console.log('PASS: broken-link tab, 404/soft filters, paired source/link-text CSV and file-import-only workflow');
 assert.deepEqual(errors,[]);
 console.log('PASS: real Chromium desktop/mobile, inline validation, keyword chips, optional audits, stable details during polling, grouped tasks, filter reset, filtered CSV, draft/result separation, resume/expiry, connection recovery and cancellation');
}finally{await browser?.close();server.kill();}

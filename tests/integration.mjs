import dns from 'node:dns/promises';
import assert from 'node:assert/strict';
dns.lookup=async()=>[{address:'93.184.216.34',family:4}];
const realFetch=globalThis.fetch,requests=[];
const html=(body,headers={})=>new Response(body,{headers:{'content-type':'text/html',...headers}});
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('http://127.0.0.1:'))return realFetch(url,options);
 const u=new URL(url);requests.push(u.href);
 if(u.pathname==='/robots.txt')return new Response('User-agent: *\nDisallow: /private',{headers:{'content-type':'text/plain'}});
 if(u.pathname==='/sitemap.xml')return new Response('<sitemapindex><sitemap><loc>https://example.com/child.xml</loc></sitemap></sitemapindex>',{headers:{'content-type':'application/xml'}});
 if(u.pathname==='/child.xml')return new Response('<urlset>'+['/project/sitemap-only','/project-2','/parent','/orphan','/deep','/only/a','/only/a?x=1','/only/skip','/only/redir'].map(p=>'<url><loc>https://example.com'+p+'</loc></url>').join('')+'</urlset>',{headers:{'content-type':'application/xml'}});
 if(u.pathname==='/sitemap_index.xml')return new Response('',{status:404});
 if(u.pathname==='/project'||u.pathname==='/project/')return html('<title>Project</title><body>Segeln<a href="/project/child">Child</a><a href="/project-2">Sibling prefix</a><a href="/">Home</a><a href="/parent">Parent</a><a href="/project/redirect">Redirect</a><link rel="canonical" href="/outside"></body>');
 if(u.pathname==='/project/child')return html('<h1>Child</h1><a href="/project/child/grandchild">Grandchild</a>');
 if(u.pathname==='/project/redirect')return new Response('',{status:302,headers:{location:'https://example.com/outside'}});
 if(u.pathname==='/only/redir')return new Response('',{status:302,headers:{location:'https://example.com/outside'}});
 if(u.pathname==='/')return html('<title>Home</title><meta name="description" content="Home desc"><body><h1>Home</h1>Segeln segeln<a href="/linked#part">Link</a><a href="/linked">Duplicate</a><a href="/private">Private</a><a href="https://other.com/out">External</a></body>');
 if(u.pathname==='/linked')return html('<title>Duplicate title</title><meta name="description" content="Duplicate desc"><h1>First</h1><h1>Second</h1><a href="/deep">Deep</a><a href="/deep">Duplicate link</a>');
 if(u.pathname==='/deep')return html('<title>Duplicate title</title><meta name="description" content="Duplicate desc"><meta name="robots" content="noindex, follow"><link rel="canonical" href="/linked"><h1>Deep</h1>');
 if(u.pathname==='/orphan')return html('<body>No metadata</body>',{'x-robots-tag':'noindex'});
 return html('<title>Other</title><h1>Other</h1>');
};
process.env.PORT='3127';await import('../server.js');
const post=body=>realFetch('http://127.0.0.1:3127/api/scans',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
async function job(body){let response=await post(body);assert.equal(response.status,202);let {id}=await response.json();for(let i=0;i<300;i++){let j=await (await realFetch('http://127.0.0.1:3127/api/scans/'+id)).json();if(j.status==='completed')return j;await new Promise(r=>setTimeout(r,30));}throw Error('Timeout');}
try{
 assert.equal((await post({domains:['example.com']})).status,400);
 assert.equal((await post({task:'invalid',domains:['example.com']})).status,400);
 assert.equal((await post({task:'urls',domains:['example.com'],include:'bad'})).status,400);
 let urls=await job({task:'urls',domains:['example.com'],mode:'standard'});
 assert.equal(new Set(urls.results.map(x=>x.url)).size,urls.results.length);
 const page=path=>urls.pages.find(x=>x.url==='https://example.com'+path);
 assert.equal(page('/').depth,0);assert.equal(page('/linked').depth,1);assert.equal(page('/deep').depth,2);assert.equal(page('/orphan').depth,null);
 assert.deepEqual(page('/deep').incoming,['https://example.com/linked']);assert.equal(page('/linked').incomingCount,1);
 assert.equal(page('/linked').outgoingCount,1);assert.equal(page('/linked').h1.length,2);
 assert.equal(page('/deep').canonical,'https://example.com/linked');assert.equal(page('/deep').indexability,'noindex');assert.equal(page('/orphan').indexability,'noindex');
 assert(page('/linked').issues.includes('Title doppelt'));assert(page('/deep').issues.includes('Description doppelt'));assert(page('/linked').issues.includes('Mehrere H1'));
 for(const issue of ['Title fehlt','Description fehlt','H1 fehlt'])assert(page('/orphan').issues.includes(issue));
 assert.equal(page('/private').status,'blocked');assert(!urls.pages.some(x=>x.url.includes('other.com')));
 requests.length=0;
 const filtered=await job({task:'urls',domains:['example.com'],mode:'standard',include:['/only/'],exclude:['/only/skip','*?*']});
 assert(filtered.pages.some(x=>x.url.endsWith('/only/a')));assert(filtered.pages.every(x=>new URL(x.url).pathname.startsWith('/only/')));
 assert(!filtered.pages.some(x=>x.url.includes('?')||x.url.endsWith('/skip')));
 assert(!requests.some(x=>x.endsWith('/outside')||x.endsWith('/skip')||x.includes('?')||x==='https://example.com/'));
 assert(filtered.pages.every(x=>x.depth===null));
 const fullUrl=await job({task:'urls',domains:['example.com'],mode:'standard',include:['https://example.com/only/a'],exclude:['*?*']});assert.equal(fullUrl.pages.length,1);
 let limited=await job({task:'urls',domains:['example.com'],maxPages:1,mode:'standard'});assert.equal(limited.stats[0].state,'limit');assert.equal(limited.stats[0].checked,1);
 let keywords=await job({domains:['example.com'],keywords:['Segeln'],maxPages:1,mode:'standard'});assert.equal(keywords.results[0].count,2);assert.equal(keywords.pages[0].title,'Home');

 for(const start of ['https://example.com/project','https://example.com/project/']){
 requests.length=0;
 const scoped=await job({task:'urls',domains:[start],mode:'standard'});
 assert(scoped.pages.length>=5);
 assert(scoped.pages.every(p=>{const path=new URL(p.url).pathname;return path==='/project'||path.startsWith('/project/');}));
 assert(scoped.pages.some(p=>p.url.endsWith('/project/sitemap-only')));
 assert.equal(scoped.pages.find(p=>p.url===start).depth,0);
 assert.equal(scoped.pages.find(p=>p.url.endsWith('/project/child')).depth,1);
 assert.equal(scoped.pages.find(p=>p.url.endsWith('/project/child/grandchild')).depth,2);
 assert(!requests.some(url=>['/','/outside','/parent','/project-2'].includes(new URL(url).pathname)));
 }
 requests.length=0;
 const scopedKeyword=await job({domains:['example.com/project#section'],keywords:['Segeln'],mode:'standard'});
 assert.equal(scopedKeyword.results.length,1);assert.equal(scopedKeyword.results[0].url,'https://example.com/project');
 assert(!requests.some(url=>new URL(url).pathname==='/'));
 const narrowed=await job({task:'urls',domains:['example.com/project'],exclude:['/project/child'],mode:'standard'});
 assert(!narrowed.pages.some(p=>p.url.includes('/child')));
 console.log('PASS: SEO metadata, missing/duplicate fields, meta/header noindex, real link depths, sitemap orphans, unique incoming/outgoing links, robots, include/exclude/wildcards, redirect scope, page limits keyword regression and automatic subpath boundaries (both modes, trailing slash, redirects, sitemap and canonical)');
 process.exit(0);
}catch(e){console.error(e);process.exit(1);}

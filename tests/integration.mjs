import dns from 'node:dns/promises';
import assert from 'node:assert/strict';
dns.lookup=async()=>[{address:'93.184.216.34',family:4}];
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('http://127.0.0.1:'))return realFetch(url,options);
 const u=new URL(url);
 if(u.pathname==='/robots.txt')return new Response('User-agent: *\nDisallow: /private',{headers:{'content-type':'text/plain'}});
 if(u.pathname==='/sitemap.xml')return new Response('<sitemapindex><sitemap><loc>https://example.com/child.xml</loc></sitemap></sitemapindex>',{headers:{'content-type':'application/xml'}});
 if(u.pathname==='/child.xml')return new Response('<urlset><url><loc>https://example.com/map-page</loc></url></urlset>',{headers:{'content-type':'application/xml'}});
 if(u.pathname==='/sitemap_index.xml')return new Response('',{status:404});
 return new Response('<title>Test</title><body>Segeln segeln<a href="/linked#part">Link</a><a href="/linked">Duplicate</a><a href="/private">Private</a><a href="https://other.com/out">External</a></body>',{headers:{'content-type':'text/html'}});
};
process.env.PORT='3127';
await import('../server.js');
const post=body=>realFetch('http://127.0.0.1:3127/api/scans',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
async function job(body){let response=await post(body);assert.equal(response.status,202);let {id}=await response.json();for(let i=0;i<100;i++){let j=await (await realFetch('http://127.0.0.1:3127/api/scans/'+id)).json();if(j.status==='completed')return j;await new Promise(r=>setTimeout(r,30));}throw Error('Timeout');}
try{
 assert.equal((await post({domains:['example.com']})).status,400);
 assert.equal((await post({task:'invalid',domains:['example.com']})).status,400);
 let urls=await job({task:'urls',domains:['example.com'],mode:'standard'});
 assert.equal(urls.task,'urls');assert.equal(new Set(urls.results.map(x=>x.url)).size,urls.results.length);
 for(let path of ['/','/map-page','/linked','/private'])assert(urls.results.some(x=>x.url==='https://example.com'+path));
 assert(!urls.results.some(x=>x.url.includes('other.com')));assert.equal(urls.stats[0].blocked,1);
 let limited=await job({task:'urls',domains:['example.com'],maxPages:1,mode:'standard'});assert.equal(limited.stats[0].state,'limit');assert.equal(limited.stats[0].checked,1);
 let keywords=await job({domains:['example.com'],keywords:['Segeln'],maxPages:1,mode:'standard'});assert.equal(keywords.results[0].count,2);
 console.log('PASS: URL-only API, recursive sitemap, links, deduplication, domain scope, robots, page limit, keyword regression');
 process.exit(0);
}catch(e){console.error(e);process.exit(1);}

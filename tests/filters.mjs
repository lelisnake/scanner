import assert from 'node:assert/strict';
import {filterDefinitions,applyTabFilters,facetOptions,defaultFacets} from '../public/filters.js';
const job={status:'completed',seoAudit:true,imageThresholdKb:200,configuration:{keywords:['Natur','Segeln','Ohne Treffer']}};
const pages=[
 {url:'https://a.example/one',status:'checked',statusCode:200,finalStatusCode:200,issues:['Title fehlt'],depth:0,indexability:'noindex'},
 {url:'https://a.example/two',status:'checked',statusCode:301,finalStatusCode:404,issues:['Description fehlt'],depth:2,indexability:'Potenziell indexierbar'},
 {url:'https://b.example/three',status:'error',statusCode:404,finalStatusCode:404,issues:[],depth:null}
];
let defs=filterDefinitions('pages',pages,job);
assert.equal(applyTabFilters(pages,defs,{http:['200','404']}).length,2);
assert.equal(applyTabFilters(pages,defs,{http:['200','404'],domain:['a.example']}).length,1);
assert.equal(applyTabFilters(pages,defs,{seo:['Title fehlt','Description fehlt']}).length,2);
assert.equal(applyTabFilters(pages,defs,{index:['noindex']}).length,1);
assert.equal(applyTabFilters(pages,defs,{depth:['unknown']})[0].url,pages[2].url);
let opts=facetOptions(pages,defs,{domain:['a.example']},defs.find(d=>d.id==='http'));assert.equal(opts.find(o=>o.value==='404').count,0);
const keywords=[{url:pages[0].url,keyword:'Natur',count:1},{url:pages[1].url,keyword:'Segeln',count:3},{url:pages[2].url,keyword:'Natur',count:7}];
defs=filterDefinitions('keywords',keywords,job);
assert.equal(applyTabFilters(keywords,defs,{keyword:['Natur','Segeln'],count:['2-5']}).length,1);
assert.equal(facetOptions(keywords,defs,{},defs[0]).find(o=>o.value==='Ohne Treffer').count,0);
const http=[{...pages[1],redirects:[{},{},{}]},{...pages[0],redirects:[]}];defs=filterDefinitions('http',http,job);
assert.equal(applyTabFilters(http,defs,{finalHttp:['404'],redirect:['chain']}).length,1);
const images=[{url:pages[0].url,status:'checked',statusCode:200,bytes:300000,sizeExact:true,missingAltSources:['source'],emptyAltSources:[]},{url:pages[1].url,status:'checked',statusCode:200,bytes:300000,sizeExact:false,emptyAltSources:['source']}];
defs=filterDefinitions('images',images,job);assert.equal(applyTabFilters(images,defs,{imageFinding:['missing'],size:['medium']}).length,1);
assert.equal(applyTabFilters(images,defs,{size:['minimum']}).length,1);
const broken=[{...pages[2],status:'checked',kind:'Datei',external:true,issue:'HTTP 404'},{...pages[0],kind:'Seite',soft404:true,issue:'Soft-404'},{...pages[0],kind:'Bild',issue:''}];
defs=filterDefinitions('broken',broken,job);
assert.equal(applyTabFilters(broken,defs,defaultFacets('broken')).length,2);
assert.equal(applyTabFilters(broken,defs,{finding:['404','soft']}).length,2);
assert.equal(applyTabFilters(broken,defs,{finding:['404','soft'],type:['Datei'],location:['external']}).length,1);
const tasks=[{url:pages[0].url,priority:'Hoch',category:'SEO',issue:'Title fehlt'},{url:pages[1].url,priority:'Mittel',category:'HTTP',issue:'HTTP 403'}];defs=filterDefinitions('problems',tasks,job);
assert.equal(applyTabFilters(tasks,defs,{priority:['Hoch','Mittel'],category:['HTTP']}).length,1);
console.log('PASS: per-tab facets, OR within groups / AND across groups, counts, unknown/live data and keyword/no-hit filters');

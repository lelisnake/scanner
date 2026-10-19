import assert from 'node:assert/strict';
import {parseKeywords,validateDomains,scopeDescription,groupProblems,filterRecords,csvText,progressState,faviconCandidates,parseURLImport} from '../public/ui-core.js';
assert.deepEqual(parseKeywords('Segeln\nUmwelt,Segeln;Grün'),['Segeln','Umwelt','Grün']);
assert(validateDomains(['bad input']));assert(validateDomains([]));assert(validateDomains(['http://user:pass@example.com']));
assert.equal(validateDomains(['bonava.de','https://www.bonava.de/project']), '');
assert(scopeDescription('https://www.bonava.de/project').includes('Nur'));assert(scopeDescription('bonava.de').includes('Gesamte'));
const items=[{priority:'Hoch',category:'HTTP',issue:'HTTP 404',url:'https://example.com/1'},{priority:'Hoch',category:'HTTP',issue:'HTTP 404',url:'https://example.com/2'}];
assert.equal(groupProblems(items).length,1);assert.equal(groupProblems(items)[0].affected,2);
assert.equal(filterRecords(items,'/2').length,1);
assert(csvText([{title:'=1+1'}],['title']).includes("'=1+1"));assert(csvText([{title:'a"b'}],['title']).includes('a""b'));
assert.equal(progressState({phase:'pages',stats:[{discovered:10,processed:5}]}).percent,null);
assert.equal(progressState({phase:'images',stats:[{imagesChecked:2,imagesTotal:4}]}).percent,50);
assert.equal(progressState({status:'completed',stats:[{checked:5,errors:2,blocked:3}]}).percent,100);
assert.equal(progressState({status:'completed',stats:[{checked:5,errors:2}]}).partial,true);
assert.equal(progressState({status:'cancelled',stats:[]}).partial,true);
assert.equal(progressState({status:'completed',stats:[{checked:5,state:'done'}]}).partial,false);
console.log('PASS: scope preview, keyword lists, validation, grouped tasks, filters, CSV safety, phase progress and partial results');

assert.deepEqual(faviconCandidates('https://www.bonava.de/project','/custom.png'),['https://www.bonava.de/custom.png','https://www.bonava.de/favicon.ico']);
assert.deepEqual(faviconCandidates('bonava.de','https://tracker.example/icon'),['https://bonava.de/favicon.ico']);
assert.deepEqual(faviconCandidates('bonava.de','javascript:alert(1)'),['https://bonava.de/favicon.ico']);

assert.deepEqual(parseURLImport('URL;Description\n"https://example.com/old";"Text mit\nZeilenumbruch"\n"https://example.com/file.pdf";"PDF"').urls,['https://example.com/old','https://example.com/file.pdf']);
assert.equal(parseURLImport('URL\nhttps://example.com/old\nhttps://example.com/old#section').urls.length,1);
assert.equal(parseURLImport('https://example.com/ok\nftp://example.com/bad').invalid,1);
assert.equal(progressState({phase:'links',linkProgress:{checked:1,total:2}}).percent,50);

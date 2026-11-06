import assert from 'node:assert/strict';
import {keywordMatches,ownedText} from '../keyword-search.js';
assert.deepEqual(keywordMatches('ImmoViewer immoviewer',['immoviewer']).map(m=>m.count),[2]);
assert.deepEqual(keywordMatches('no match',['','immoviewer']),[]);
assert.equal(ownedText('ä € ⛵'), 'ä € ⛵');
assert(global.gc,'Run with --expose-gc');
global.gc();const baseline=process.memoryUsage().heapUsed,results=[];
for(let i=0;i<500;i++){
 const body=Buffer.alloc(900000,65+i%20).toString()+' immoviewer <script>example</script>';
 results.push(...keywordMatches(body,['immoviewer']));
}
global.gc();const retained=process.memoryUsage().heapUsed-baseline;
assert.equal(results.length,500);assert(results.every(r=>r.count===1&&r.snippet.includes('immoviewer')));
assert(retained<30*1024*1024,'500 snippets must not retain 450 MB HTML: '+Math.round(retained/1024/1024)+' MB retained');
console.log('PASS: 500 large source pages retain only '+Math.round(retained/1024/1024)+' MB for keyword snippets; case-insensitive counts and UTF-8 preserved');

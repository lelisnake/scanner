import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
class Element{
 constructor(){this.children=[];this.style={};this.value='';this.disabled=false;this.textContent='';}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(k,v){this[k]=v;}
 click(){}
}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const context=vm.createContext({document:{getElementById:get,createElement:()=>new Element(),createTextNode:x=>x},Blob,URL,setTimeout,clearInterval,setInterval,console});
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
vm.runInContext(html.split('<script>')[1].split('</script>')[0],context);
vm.runInContext("last={task:'urls',stats:[],logs:[],pages:[{url:'https://example.com/',status:'checked',h1:['Home'],incoming:['https://example.com/a'],depth:0}],results:[{url:'https://example.com/',status:'checked',h1:['Home'],incoming:['https://example.com/a'],depth:0}]};render()",context);
assert.equal(get('rows').children.length,1);assert.equal(get('rows').children[0].children.length,6);
assert.equal(get('seoexport').disabled,false);assert.equal(get('linkexport').disabled,false);
get('filter').value='missing';get('filter').oninput();assert.equal(get('rows').children.length,0);
get('keywordsTab').onclick();assert.equal(get('keywordFields').hidden,false);
vm.runInContext("last={task:'keywords',stats:[],logs:[],pages:[{url:'https://example.com/',h1:[],incoming:[]}],results:[{url:'https://example.com/',keyword:'test',count:1,snippet:'found'}]};",context);
get('filter').value='';vm.runInContext('render()',context);assert.equal(get('rows').children[0].children.length,4);assert.equal(get('keywordAudit').hidden,false);
console.log('PASS: UI menu, SEO/link table rendering, keyword view, filtering and export availability');

// URL hierarchy: directory edges deliberately do not represent hyperlinks.
export function buildTree(pages,problems=[],evaluated=false){
 const nodes=new Map(),severity=new Map(),rank={unknown:0,ok:1,hint:2,medium:3,high:4};
 for(const p of problems){const s=p.priority==='Hoch'?'high':p.priority==='Mittel'?'medium':'hint';if(rank[s]>rank[severity.get(p.url)||'unknown'])severity.set(p.url,s);}
 const add=(id,label,parent)=>{if(!nodes.has(id))nodes.set(id,{id,label,parent,children:[],pages:[],severity:'unknown'});return nodes.get(id);};
 for(const p of pages){let u;try{u=new URL(p.url);if(!/^https?:$/.test(u.protocol))continue;}catch{continue;}
  let parent='dir:'+u.origin+'/';add(parent,u.host,null);
  const parts=u.pathname.split('/').filter(Boolean),dirs=u.pathname.endsWith('/')?parts:parts.slice(0,-1);let path='';
  for(const part of dirs){path+='/'+part;const id='dir:'+u.origin+path+'/';add(id,decodeLabel(part)+'/',parent);parent=id;}
  const id='page:'+u.href,node=add(id,(u.pathname.endsWith('/')?'(Index)':decodeLabel(parts.at(-1)||'/'))+u.search,parent);
  node.page=p;node.pages=[p];node.severity=severity.get(p.url)||(evaluated&&p.status==='checked'?(p.issues?.length?'medium':'ok'):'unknown');
 }
 for(const n of nodes.values())if(n.parent)nodes.get(n.parent).children.push(n);
 const roots=[...nodes.values()].filter(n=>!n.parent);
 function roll(n){n.children.sort((a,b)=>a.label.localeCompare(b.label,'de'));for(const c of n.children){roll(c);n.pages.push(...c.pages);if(rank[c.severity]>rank[n.severity])n.severity=c.severity;}}
 roots.forEach(roll);return {nodes,roots};
}
function decodeLabel(s){try{return decodeURIComponent(s);}catch{return s;}}
const colors={high:'#bd263b',medium:'#bb7000',hint:'#4268bc',ok:'#218153',unknown:'#718096'};
const labels={high:'Hohe Priorität',medium:'Mittlere Priorität',hint:'Hinweis',ok:'Keine erfassten Befunde',unknown:'Nicht ausgewertet'};
const NS='http://www.w3.org/2000/svg';
export function createStructure(panel){
 const $=id=>panel.querySelector('#'+id),svg=$('structureSvg'),world=document.createElementNS(NS,'g');svg.append(world);
 let tree={nodes:new Map(),roots:[]},signature='',collapsed=new Set(),limits=new Map(),positions=new Map(),visible=[],edges=[],selected=null,frame=0,tick=0,scale=1,tx=450,ty=280,drag=null,active=false;
 const search=$('structureSearch'),finding=$('structureFinding');
 function element(tag,attrs={}){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;}
 function transform(){world.setAttribute('transform',`translate(${tx} ${ty}) scale(${scale})`);}
 function details(n){selected=n.id;const box=$('structureDetails');box.replaceChildren();const title=document.createElement('h4');title.textContent=n.page?.title||n.label;box.append(title);
 const p=document.createElement('p');p.textContent=labels[n.severity]+' · '+(n.page?'Seite':n.pages.length+' URLs in diesem Verzeichnis');box.append(p);
 if(n.page){const a=document.createElement('a');a.href=n.page.url;a.textContent=n.page.url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);const info=document.createElement('p');info.textContent=['HTTP '+(n.page.statusCode??'unbekannt'),...(n.page.issues||[])].join(' · ');box.append(info);}
 else {const note=document.createElement('p');note.textContent='Verzeichnisknoten aus URL-Pfaden, kein Nachweis einer erreichbaren Seite. Farbe: höchste Priorität im Teilbaum.';box.append(note);}
 if(n.children.length){const b=document.createElement('button');b.className='secondary';b.textContent=collapsed.has(n.id)?'Teilbaum aufklappen':'Teilbaum einklappen';b.onclick=()=>{collapsed.has(n.id)?collapsed.delete(n.id):collapsed.add(n.id);draw();details(n);};box.append(b);
 if(!collapsed.has(n.id)&&(limits.get(n.id)||40)<n.children.length){const more=document.createElement('button');more.className='secondary';more.textContent='Weitere 40 Einträge anzeigen';more.onclick=()=>{limits.set(n.id,(limits.get(n.id)||40)+40);draw();details(n);};box.append(more);}}
 }
 function draw(){cancelAnimationFrame(frame);visible=[];edges=[];world.replaceChildren();const query=search.value.trim().toLowerCase(),value=finding.value,allowed=new Set();
 for(const n of tree.nodes.values())if(n.page&&(!query||[n.page.url,n.page.title].some(s=>s?.toLowerCase().includes(query)))&&(!value||n.severity===value)){let p=n;while(p){allowed.add(p.id);p=tree.nodes.get(p.parent);}}
 function walk(n,depth=0){if(!allowed.has(n.id)||visible.length>=600)return;let pos=positions.get(n.id);if(!pos){const angle=visible.length*2.4;pos={x:Math.cos(angle)*(60+depth*65),y:Math.sin(angle)*(60+depth*65),vx:0,vy:0};positions.set(n.id,pos);}n.pos=pos;visible.push(n);
 if(!collapsed.has(n.id)){for(const c of n.children.filter(c=>allowed.has(c.id)).slice(0,query?600:limits.get(n.id)||40)){const before=visible.length;walk(c,depth+1);if(visible.length>before)edges.push({a:n,b:c});}}
 }tree.roots.forEach(n=>walk(n));
 $('structureCount').textContent=visible.filter(n=>n.page).length+' Seitenknoten · '+visible.length+' sichtbare Knoten · '+[...tree.nodes.values()].filter(n=>n.page).length+' URLs insgesamt. '+(visible.length>=600?'Anzeigelimit 600: Suche/Filter verwenden oder Teilbäume einklappen.':'Verzeichnisse aufklappen für weitere Seiten.');
 for(const edge of edges){edge.el=element('line',{stroke:'#b7c6d8','stroke-width':1.4});world.append(edge.el);}
 for(const n of visible){const g=element('g',{tabindex:0,role:'button','aria-label':n.label+', '+labels[n.severity]+(n.children.length?', Verzeichnis':''),'data-node':n.id});g.style.cursor='grab';
 const circle=element('circle',{r:n.page?7:12,fill:colors[n.severity],stroke:n.id===selected?'#111':'white','stroke-width':2});const title=element('title');title.textContent=n.page?.url||n.id.slice(4);g.append(title,circle);
 const text=element('text',{x:16,y:4,'font-size':12,fill:'#24364a',stroke:'#f8faff','stroke-width':3,'paint-order':'stroke'});text.textContent=n.label.slice(0,42)+(n.children.length?' ['+n.pages.length+']'+(collapsed.has(n.id)?' +':' −'):'');g.append(text);world.append(g);n.el=g;
 g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();details(n);}if(e.key==='ArrowRight'&&n.children.length){collapsed.delete(n.id);draw();details(n);}if(e.key==='ArrowLeft'&&n.children.length){collapsed.add(n.id);draw();details(n);}};
 g.onpointerdown=e=>{e.stopPropagation();drag={n,x:e.clientX,y:e.clientY,moved:false};svg.setPointerCapture(e.pointerId);};
 }tick=0;transform();step();
 }
 function step(){if(!active)return;
 for(let i=0;i<visible.length;i++){const a=visible[i].pos;if(drag?.n?.pos===a)continue;a.vx-=a.x*.0009;a.vy-=a.y*.0009;for(let j=i+1;j<visible.length;j++){const b=visible[j].pos,dx=a.x-b.x||.1,dy=a.y-b.y||.1,d2=Math.max(80,dx*dx+dy*dy),f=500/d2;a.vx+=dx*f/Math.sqrt(d2);a.vy+=dy*f/Math.sqrt(d2);b.vx-=dx*f/Math.sqrt(d2);b.vy-=dy*f/Math.sqrt(d2);if(Math.abs(dy)<25&&Math.abs(dx)<180){const push=(25-Math.abs(dy))*.05*(dy<0?-1:1);a.vy+=push;b.vy-=push;}}}
 for(const e of edges){const a=e.a.pos,b=e.b.pos,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,f=(d-100)*.012;a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;}
 for(const n of visible){const p=n.pos;if(drag?.n!==n){p.x+=Math.max(-15,Math.min(15,p.vx));p.y+=Math.max(-15,Math.min(15,p.vy));}p.vx*=.72;p.vy*=.72;n.el.setAttribute('transform',`translate(${p.x} ${p.y})`);}
 for(const e of edges)for(const [k,v] of Object.entries({x1:e.a.pos.x,y1:e.a.pos.y,x2:e.b.pos.x,y2:e.b.pos.y}))e.el.setAttribute(k,v);
 if(++tick<(matchMedia('(prefers-reduced-motion: reduce)').matches?1:220)||drag)frame=requestAnimationFrame(step);
 }
 function restart(){cancelAnimationFrame(frame);tick=0;step();}
 svg.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,moved:false};svg.setPointerCapture(e.pointerId);};
 svg.onpointermove=e=>{if(!drag)return;const rect=svg.getBoundingClientRect(),dx=(e.clientX-drag.x)*900/rect.width,dy=(e.clientY-drag.y)*560/rect.height;if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;if(drag.n){drag.n.pos.x+=dx/scale;drag.n.pos.y+=dy/scale;drag.n.pos.vx=drag.n.pos.vy=0;restart();}else{tx+=dx;ty+=dy;transform();}drag.x=e.clientX;drag.y=e.clientY;};
 svg.onpointerup=()=>{if(drag?.n&&!drag.moved)details(drag.n);drag=null;};svg.onpointercancel=()=>{drag=null;};
 function zoom(f){scale=Math.max(.15,Math.min(5,scale*f));transform();}
 svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.12:1/1.12);},{passive:false});
 $('structureZoomIn').onclick=()=>zoom(1.3);$('structureZoomOut').onclick=()=>zoom(1/1.3);
 $('structureFit').onclick=()=>{if(!visible.length)return;const xs=visible.map(n=>n.pos.x),ys=visible.map(n=>n.pos.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);scale=Math.max(.15,Math.min(2,740/(maxX-minX+160),440/(maxY-minY+80)));tx=450-(maxX+minX)/2*scale;ty=280-(maxY+minY)/2*scale;transform();};
 $('structureCollapse').onclick=()=>{for(const n of tree.nodes.values())if(n.parent&&n.children.length)collapsed.add(n.id);draw();};
 search.oninput=()=>{if(search.value.trim())for(const n of tree.nodes.values())if(n.page&&[n.page.url,n.page.title].some(s=>s?.toLowerCase().includes(search.value.trim().toLowerCase()))){let p=tree.nodes.get(n.parent);while(p){collapsed.delete(p.id);p=tree.nodes.get(p.parent);}}draw();};finding.onchange=()=>draw();
 return {update(job,show){active=show;panel.hidden=!show;if(!show){cancelAnimationFrame(frame);return;}const sig=JSON.stringify([job.pages,job.problems,job.status,job.seoAudit]);if(sig!==signature){const first=!signature;signature=sig;tree=buildTree(job.pages||[],job.problems||[],job.seoAudit&&['completed','cancelled','failed'].includes(job.status));if(first&&tree.nodes.size>120)for(const n of tree.nodes.values())if(n.parent&&n.children.length)collapsed.add(n.id);if(selected&&tree.nodes.has(selected))details(tree.nodes.get(selected));draw();}else restart();},reset(){signature='';collapsed.clear();positions.clear();limits.clear();selected=null;search.value='';finding.value='';$('structureDetails').textContent='Klicke auf einen Knoten für Details.';}};
}

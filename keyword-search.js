// V8 substrings can retain the entire HTML response. Copy only data we keep.
export const ownedText=value=>Buffer.from(String(value??''),'utf8').toString('utf8');
export function keywordMatches(text,keywords){
 const lower=text.toLocaleLowerCase('de'),matches=[];
 for(const keyword of keywords){const needle=keyword.toLocaleLowerCase('de');if(!needle)continue;let pos=0,count=0,first=-1;
  while((pos=lower.indexOf(needle,pos))!==-1){if(first<0)first=pos;count++;pos+=needle.length;}
  if(count)matches.push({keyword,count,snippet:ownedText(text.slice(Math.max(0,first-80),first+needle.length+110))});
 }
 return matches;
}

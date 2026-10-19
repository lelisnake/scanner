/** Consolidate machine findings into reviewable tasks; no ranking guarantees. */
export function buildProblems(job){
 const problems=[];
 const add=(priority,category,issue,url,sources,recommendation,statusCode=null)=>problems.push({priority,category,issue,url,statusCode,sources:[...new Set(sources||[])],recommendation});
 for(const page of job.pages){
  const sources=page.sourceUrls||[];
  if(job.seoAudit!==false&&page.indexability==='noindex')add('Hinweis','SEO','noindex gesetzt',page.url,sources,'Prüfen, ob der Ausschluss aus dem Suchindex beabsichtigt ist.',page.statusCode);
  if(job.seoAudit!==false&&page.status==='blocked')add('Hinweis','SEO','Durch robots.txt blockiert',page.url,sources,'Prüfen, ob der Crawl-Ausschluss beabsichtigt ist.',page.statusCode);
  if(page.finalStatusCode>=400)add('Hoch','HTTP','HTTP '+page.finalStatusCode,page.url,sources,'Linkziel reparieren, Link aktualisieren oder bewusst entfernen.',page.finalStatusCode);
  else if(page.failureType==='redirect-loop')add('Hoch','Weiterleitung','Weiterleitungsschleife',page.url,sources,'Weiterleitungen so ändern, dass eine erreichbare Zielseite entsteht.',page.statusCode);
  else if(page.failureType==='redirect-limit')add('Hoch','Weiterleitung','Zu viele Weiterleitungen',page.url,sources,'Weiterleitungskette verkürzen und Ziel prüfen.',page.statusCode);
  else if(page.failureType==='redirect-location')add('Hoch','Weiterleitung','Weiterleitung ohne gültiges Ziel',page.url,sources,'Location-Header korrigieren.',page.statusCode);
  else if(page.status==='error'&&page.failureType!=='scope'&&page.failureType!=='robots')add('Mittel','HTTP','Seite nicht prüfbar: '+page.requestError,page.url,sources,'Erreichbarkeit, Antworttyp und Serverzugriff prüfen.',page.statusCode);
  if(page.failureType==='scope')add('Hinweis','Weiterleitung','Weiterleitungsziel außerhalb des Crawl-Bereichs',page.url,sources,'Ziel bei Bedarf in einem eigenen Crawl prüfen.',page.statusCode);
  if(page.redirects?.length)add(page.redirects.length>1?'Mittel':'Hinweis','Weiterleitung',page.redirects.length>1?'Weiterleitungskette ('+page.redirects.length+' Schritte)':'Weiterleitung',page.url,sources,'Interne Links möglichst direkt auf das endgültige Ziel setzen.',page.statusCode);
  for(const issue of page.issues||[]){const priority=issue==='Title fehlt'?'Hoch':issue==='Mehrere H1'?'Hinweis':'Mittel';add(priority,'SEO',issue,page.url,sources,issue.includes('doppelt')?'Inhalt und Zweck der Seiten prüfen; individuelle Angaben formulieren.':issue.includes('Description')?'Passende Meta-Description ergänzen.':issue.includes('Title')?'Aussagekräftigen Seitentitel ergänzen.':'Überschriftenstruktur und Seiteninhalt prüfen.',page.statusCode);}
 }
 for(const image of job.images||[]){
  if(image.missingAltSources?.length)add('Mittel','Bild','Alt-Attribut fehlt',image.url,image.missingAltSources,'Sinnvollen Alternativtext ergänzen; rein dekorative Bilder mit alt="" kennzeichnen.',image.statusCode);
  if(image.emptyAltSources?.length)add('Hinweis','Bild','Leerer Alt-Text – dekorativ?',image.url,image.emptyAltSources,'Prüfen, ob das Bild dekorativ ist; andernfalls beschreibenden Alt-Text vergeben.',image.statusCode);
  if(image.statusCode>=400)add('Hoch','Bild','Defektes Bild: HTTP '+image.statusCode,image.url,image.sources,'Bilddatei oder Bildverweis reparieren.',image.statusCode);
  else if(image.status==='not-image')add('Hoch','Bild','Bild-URL liefert keinen Bildtyp',image.url,image.sources,'URL und Content-Type der Bilddatei prüfen.',image.statusCode);
  else if(image.status==='error')add('Mittel','Bild','Bild nicht prüfbar: '+image.error,image.url,image.sources,'Erreichbarkeit und Zugriffsrechte prüfen.',image.statusCode);
  if(image.bytes!==null&&image.bytes>job.imageThresholdKb*1024)add('Mittel','Bild','Große Bilddatei ('+Math.ceil(image.bytes/1024)+' KB'+(image.sizeExact?'':'+')+')',image.url,image.sources,'Bildformat, Kompression und passende Ausgabegröße optimieren.',image.statusCode);
 }
 const order={Hoch:0,Mittel:1,Hinweis:2};return problems.sort((a,b)=>order[a.priority]-order[b.priority]||a.url.localeCompare(b.url));
}

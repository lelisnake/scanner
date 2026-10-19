# Domain Keyword Scanner 2.0

Hybrid-Crawler für öffentliche Websites mit rekursiven XML-Sitemaps, HTML-Linksuche, optionalem Playwright-Rendering, Live-Status, Fehlerprotokoll und CSV-Export.

## Deployment auf Render

Render Blueprint mit `render.yaml` erstellen oder bestehenden Web Service auf **Docker** umstellen. Dockerfile im Repository-Root. Health-Check `/api/health`. Der Blueprint nutzt den kostenpflichtigen Starter-Tarif.

## Nutzung

1–5 Domains, 1–30 Keywords, bis 5000 geprüfte Seiten je Domain. Scan manuell starten, Status wird alle 1,5 Sekunden aktualisiert. Die Scan-Daten liegen nur im Arbeitsspeicher und verschwinden bei Neustart oder nach einer Stunde.

## Grenzen

Nur öffentlich erreichbare und durch robots.txt erlaubte Seiten. Kein Anspruch auf vollständige Erfassung nicht verlinkter URLs. Bis 150 Sitemaps und 25.000 entdeckte URLs pro Domain. Große Scans benötigen ausreichend RAM und Laufzeit. JS-Rendering im Hybrid-Modus nur bei wenigen statischen Links.

## Sicherheit

Nur für vertrauenswürdige Bediener bereitstellen; vor öffentlicher Freigabe Authentifizierung und Rate-Limiting ergänzen. DNS/IP-Validierung schützt nicht vollständig vor DNS-Rebinding. Crawling nur mit Erlaubnis und Rücksicht auf fremde Server durchführen.


## Hauptmenü (2.1)

**URLs crawlen:** Domain eingeben, Crawl starten und gefundene Seiten-URLs filtern oder als CSV exportieren. Keywords sind nicht erforderlich. Standardlimit: 5000 geprüfte Seiten. Die Liste enthält auch entdeckte, noch nicht geprüfte URLs; sie ist keine Garantie für Erreichbarkeit oder Vollständigkeit.

**Keyword scannen:** Bisherige Keyword-Suche mit Trefferzahl und Textausschnitten. Beide Modi nutzen denselben Crawler und respektieren robots.txt.

## SEO, interne Links und Crawl-Bereiche (2.2)

Beide Modi erfassen für jede gefundene URL Title, Meta-Description, alle H1, Canonical, Robots-Angaben und eine vorläufige Indexierbarkeitsbewertung. Fehlende Titles, Descriptions und H1 sowie doppelte Titles/Descriptions und mehrere H1 werden markiert. Duplikate werden am Scanende unter den geprüften Seiten ermittelt. noindex wird aus Robots-/Googlebot-Meta und X-Robots-Tag gelesen. Die Bewertung bestätigt keine tatsächliche Suchmaschinenindexierung.

Die Linkanalyse zeigt eindeutige eingehende Quellseiten, ausgehende Zielseiten und die kürzeste gefundene Klicktiefe von der Domain-Startseite (0). Sitemap- und Canonical-Einträge zählen nicht als interne Verlinkung. Weiterleitungen werden für die Pfadberechnung zusammengeführt. Auch nofollow-Links werden gezählt. Bei nicht gefundener Verbindung bleibt die Tiefe unbekannt. Linkwerte werden am Ende des Domain-Crawls berechnet; bei eingeschränkten oder abgebrochenen Scans sind sie unvollständig.

Unter „Crawl eingrenzen“ können bis zu 100 Ein-/Ausschlussmuster eingetragen werden, eines pro Zeile. Pfade oder vollständige URLs gelten als Präfix, * steht für beliebige Zeichen. Beispiel: nur /segelkurse/; ausschließen /kalender/ und *?* (alle URLs mit Parametern). Ausschlüsse haben Vorrang. Seiten außerhalb des Bereichs werden auch nach Weiterleitungen nicht geladen; Sitemap- und robots.txt-Abfragen sind zur Ermittlung weiterhin erforderlich. Ohne Verbindung zur ausgeschlossenen Startseite ist keine Klicktiefe bekannt.

SEO CSV exportiert alle gefundenen Seiten mit Metadaten, Prüfstatus, Hinweisen, Tiefe und verlinkenden Quellen. Interne Links CSV exportiert eindeutige Quell-/Zielpaare. Die URL-Ansicht ist auf 100 Ergebnisse pro Seite aufgeteilt; im Keyword-Modus zeigt die zusätzliche SEO-Tabelle eine Vorschau der ersten 100 gefilterten Seiten. CSV enthält die vollständigen Daten.

Prüfung: npm run check und npm test (lokale Testwebsite mit simulierten HTTP-/DNS-Antworten; UI-Logiktest ohne Browser).

## Automatischer Unterseitenbereich (2.2.1)

Eine Start-URL mit Pfad beschränkt beide Scan-Modi automatisch auf diese Seite und alle darunterliegenden Pfade. Beispiel: https://www.bonava.de/immobilien/berliner-umland/wildau/finkengarten erfasst die Projektseite und /finkengarten/...; Elternseiten, andere Projekte und /finkengarten-2 werden ausgeschlossen. Dies gilt für Sitemap-Funde, HTML-Links, Canonicals und Seitenweiterleitungen. Mit und ohne abschließenden Schrägstrich gilt derselbe Bereich. Zusätzliche Ein-/Ausschlussfilter können ihn weiter einschränken. Die reine Domain crawlt weiterhin die gesamte Website. Sitemap- und robots.txt-Dateien dürfen zur Ermittlung außerhalb des Seitenbereichs gelesen werden.

Die Klicktiefe wird jetzt relativ zur eingegebenen Start-URL berechnet (0), beim Domain-Crawl weiterhin relativ zur Startseite. Der Fortschritt nennt die Start-URL.

## HTTP, priorisierte Aufgaben und Bilder (2.3.0)

Neue Bereiche unter den Crawl-Ergebnissen, in beiden Modi:

- **HTTP & Weiterleitungen**: erster und letzter HTTP-Status, endgültige URL, vollständige Weiterleitungsschritte, Schleifen, fehlende Location-Header und Abruffehler. Quellseiten beziehen sich auf das tatsächlich verlinkte Ziel vor Weiterleitungen. Es werden interne Seiten im gewählten Crawl-Bereich geprüft; externe Seitenlinks und ausgeschlossene Seiten bleiben unberührt. Seitenweiterleitungen prüfen robots.txt für jeden Schritt.
- **SEO-Aufgaben nach Priorität**: Hoch / Mittel / Hinweis, Kategorie, betroffene URL, Quellseiten und konkrete Prüf-/Korrekturmaßnahme. HTTP- und Bildfehler, Weiterleitungsketten sowie vorhandene SEO-Befunde werden zusammengeführt. noindex, robots.txt und leere Alt-Texte sind Hinweise zur manuellen Prüfung, keine pauschalen Fehler. Filter nach Priorität, Kategorie und Suchtext; Export der gefilterten Aufgaben als CSV.
- **Bilderprüfung**: img/src, data-src, data-lazy-src, srcset und data-srcset. Unterscheidet fehlendes Alt-Attribut und leeren Alt-Text; speichert pro Befund die betroffenen Seiten. Öffentliche CDN-Bilder und Assets außerhalb des Seitenpfads sind erlaubt, weiterhin mit IP-/Protokollprüfung und robots.txt. CSS-Hintergrundbilder und data:-Bilder werden nicht erfasst. Status und Content-Type werden geprüft; keine Prüfung auf beschädigte Bildpixel oder tatsächliche Darstellung.
- Große Bilder: einstellbare Schwelle von 10 bis 10000 KB, Standard 200 KB. Dateigröße aus Content-Length; ohne Größenheader wird bis ca. 2 MB gelesen, danach abgebrochen und die ermittelte Größe als Mindestwert markiert. Es werden maximal 500 eindeutige Bild-URLs pro Domain geprüft; ein erreichtes Bildlimit wird sichtbar gemeldet. Die Bildprüfung folgt auf den Seiten-Crawl und kann abgebrochen werden.
- Alle drei Bereiche besitzen Filter, Seitenaufteilung (100 Zeilen) und CSV-Exporte. CSV-Zellen mit möglichen Tabellenformeln werden als Text exportiert.

Problemübersicht und Quellseiten sind bei Abbruch oder Seitenlimits unvollständig. Vollständige Link- und SEO-Auswertung erfolgt am Scanende. Prioritäten sind heuristische Arbeitshinweise; sie garantieren weder SEO-Wirkung noch tatsächliche Indexierung.

## Oberfläche und Prüfumfang (3.0)

- Einrichtung und laufender/abgeschlossener Scan sind getrennt. Neue Einstellungen ändern niemals die Beschriftung vorhandener Ergebnisse.
- Domain- und Pfadbereich werden vor dem Start erklärt. Keywords können als Chips eingegeben oder als Liste eingefügt werden. Eingabefehler erscheinen direkt am Feld.
- Standardmäßig sammelt die Oberfläche URLs und HTTP-/Linkdaten. SEO- und Bilderprüfungen sind separat zuschaltbar. Die API bleibt für ältere Clients kompatibel: Ohne Optionsfelder gelten beide Prüfungen weiterhin als aktiviert.
- Erweiterte Einstellungen sind eingeklappt, Exportfunktionen stehen bei Ergebnissen. Bildgrößen-Einstellungen erscheinen nur bei gewählter Bilderprüfung.
- Fortschritt wird als Phase angezeigt: URL-Ermittlung, Seiten, Bilder und Auswertung. Bei unbekannter Gesamtzahl gibt es keine irreführende Prozentangabe. Abschluss wird von Vollständigkeit getrennt; Blockaden, Abruffehler, Abbruch und Limits werden als Einschränkung gemeldet.
- Ergebnisreiter: Übersicht, gruppierte Aufgaben, URLs, Keywords (nur Keyword-Scans), HTTP und Bilder (bei gewählter Prüfung). Tabellen aktualisieren nur geänderte Zeilen; unveränderte offene Details bleiben bestehen.
- Aufgaben zählen Befunde und betroffene URLs getrennt. Gleiche Befunde werden gruppiert; Filter lassen sich einzeln oder vollständig zurücksetzen. Live-Aufgaben zeigen bis zum Abschluss „Noch nicht ausgewertet“.
- Sortierbare Ansichten, anpassbare Seitengröße und Exporte der aktuellen Auswahl oder sämtlicher Zeilen. Link- und Protokollexporte sind zusätzlich verfügbar. Übersicht und Protokoll zeigen keine leeren Scheinergebnisse.
- Mobile Darstellung als kompakte Ergebniskarten; Desktop-Tabellen mit festen Köpfen und erster Spalte. Bildvorschau wird erst auf Anforderung geladen. Durchgehend deutsche Statusbezeichnungen.
- Entwürfe und die letzte Scan-ID werden lokal im Browser gespeichert. Ein Neuladen kann den Scan wiederherstellen, solange er serverseitig existiert. Das ist keine dauerhafte Crawl-Historie: Ergebnisse verschwinden bei Serverneustart oder nach der Aufbewahrungszeit. Verbindungsfehler werden mit Wiederholungsmöglichkeit erklärt.

Prüfung: `npm test` für API und Oberflächen-Hilfsfunktionen. `npm run test:browser` prüft mit lokal installiertem Playwright-Chromium die Bedienabläufe bei Desktop- und Mobilbreite (vorher `npx playwright install chromium`). Es werden simulierte API-Antworten benutzt; die Tests starten keine Scans fremder Websites. Bildschirmaufnahmen für die lokale Layoutprüfung liegen unter `/tmp/scanner-qa/`.

## Favicon am Scan-Titel (3.0.1)

Neben jeder eingegebenen Start-URL erscheint nach dem Start deren Favicon. Zunächst wird /favicon.ico auf der Domain verwendet; nach dem ersten erfolgreichen Seitenabruf wird ein im HTML angegebenes Icon berücksichtigt (Domain einschließlich www-Variante). Externe Icon-Dienste werden nicht verwendet. Nicht ladbare Icons werden ausgeblendet. Bei mehreren Domains erhält jede URL ein eigenes Icon.

## Defekte Links und URL-Listen (3.1)

- Neuer Ergebnisreiter **Defekte Links**: Zieltyp (Seite, Datei, Bild), ursprünglicher/finaler HTTP-Status, Weiterleitungen, Quellseiten und jeweils zugehöriger Linktext. „Befunde / Verdachtsfälle“ ist die Standardansicht; zusätzliche Filter für 404/410, Soft-404, Dateien/PDFs, Bilder, externe und nicht prüfbare Ziele. Erfolgreiche Ziele stehen unter „Alle Linkziele“.
- In der Einrichtung ist **Defekte Links prüfen** standardmäßig aktiviert. Externe Ziele sind separat zuschaltbar und werden niemals rekursiv gecrawlt. Die API bleibt kompatibel: Ohne brokenAudit-Feld bleibt die zusätzliche Linkprüfung deaktiviert; importedUrls bzw. task=links aktivieren sie.
- Datei- und Bildziele auf gecrawlten Seiten können außerhalb des Seitenpfads liegen. HTML-Seiten außerhalb des gewählten Bereichs werden weiterhin ausgeschlossen, sofern sie nicht ausdrücklich importiert wurden. Mailto-/Telefon-/JavaScript-/Daten-URLs werden nicht abgerufen.
- Mit **URL-Liste prüfen** werden ausschließlich die importierten Ziele geprüft, ohne Website-Crawl, Sitemaps oder rekursive Verfolgung. Bis 1000 absolute HTTP(S)-URLs, direkt eingefügt oder aus einer TXT-/CSV-Datei bis 2 MB. CSV benötigt eine Spalte URL (alternativ Ziel-URL oder target_url); Anführungszeichen, Semikolon/Komma und mehrzeilige andere Spalten werden unterstützt. Duplikate und Fragmente werden bereinigt. Der URL-Listen-Import ist auch ergänzend zu einem Domain-Crawl möglich.
- Ausdrücklich importierte URLs werden unabhängig vom Startpfad und der Option für entdeckte externe Links geprüft. Sie haben keine erfundene Quellseite. Anfragen an private IPs, ungültige Protokolle und unsichere Weiterleitungsziele werden blockiert; robots.txt wird berücksichtigt.
- Soft-404 ist **nur ein Verdacht**: Bei erfolgreichem HTTP-Status werden klare Nicht-gefunden-Meldungen in Title/H1 bzw. sehr kurzem Haupttext gesucht. Keine automatische Statusänderung, keine sichere Aussage über Googles Soft-404-Einstufung. Die Import-/Datei-/Externprüfung liest HTTP-HTML ohne zusätzliches JavaScript-Rendering; gecrawlte Seiten verwenden das im Crawl gewählte Rendering. Individuelle Fehlerseiten ohne typische Formulierungen können unerkannt bleiben.
- 401/403/429 und Abruffehler sind keine Bestätigung gelöschter Inhalte. Sie werden getrennt mit Prüfempfehlung angezeigt. Nicht geprüfte Ziele (robots.txt, Scope, deaktivierte externe Prüfung, Limits) werden ausdrücklich gekennzeichnet.
- Die CSV-Aufgabenliste exportiert **eine Zeile je Ziel/Quellseite/Linktext-Zuordnung**, mit Priorität, Befund, HTTP-Codes, Empfehlung, Soft-404-Begründung und Weiterleitungen. Filterexport und Gesamtexport stehen wie in anderen Reitern bereit.
- Maximal 5000 eindeutige Linkziele je Scan; erreichte Limits und Abbrüche werden gemeldet. Seitenantworten werden wiederverwendet, statt sie erneut abzurufen. Datei-/Bildantworten werden ohne Voll-Download geprüft; HTML wird bis 2 MB gelesen.

## Auswertungsfilter mit Mehrfachauswahl (3.2)

Alle Datenreiter erhalten aufklappbare Filtergruppen mit Checkboxen. Mehrere Werte innerhalb einer Gruppe werden mit ODER kombiniert, verschiedene Gruppen mit UND; die Textsuche gilt zusätzlich. Keine Auswahl bedeutet alle Werte. Zahlen neben den Optionen zählen Ergebnisse unter den übrigen aktiven Filtern. Werte mit null Treffern bleiben auswählbar. Einzelne Werte können über Chips entfernt, sämtliche Filter mit „Filter zurücksetzen“ gelöscht werden.

- URLs: HTTP-Status beim Aufruf, Prüfstatus, SEO-Befund und Indexierbarkeit (bei aktivierter SEO-Prüfung), Klicktiefe, Domain.
- Keywords: Keyword-Auswahl einschließlich eingegebener Begriffe ohne Treffer, Vorkommen je Seite (1 / 2–5 / ab 6), Domain.
- Aufgaben: Priorität, Kategorie, konkreter Befund, Domain.
- HTTP: Status beim Aufruf und am Ziel getrennt, Prüfstatus, keine/eine/mehrere Weiterleitungen oder Schleife, Domain.
- Bilder: fehlendes/leeres Alt-Attribut, überschrittene individuelle Größenschwelle, Abruf-/Bildtypfehler, HTTP-Status, Prüfstatus, Dateigrößenklassen, Domain. Mindestgrößen bleiben von exakten Größen getrennt.
- Defekte Links: 404, 410, Soft-404, andere HTTP-/Abruffehler, nicht geprüfte und erfolgreiche Ziele; finaler HTTP-Code, Zieltyp, intern/extern/importiert, Domain. Die Standardauswahl „Alle Befunde / Verdachtsfälle“ lässt sich entfernen; Zurücksetzen zeigt sämtliche Linkziele.

Filter und ihre offenen Gruppen bleiben im laufenden Browser beim Reiterwechsel erhalten. Ein erfolgreich gestarteter neuer Scan setzt sie zurück. Nach einem Neuladen beginnt die Filterauswahl neu. Gefilterte CSV-Exporte enthalten genau die durch alle Filter und Suche ausgewählten Ergebnisse. Nicht ausgewertete SEO-Daten werden ausdrücklich als unbekannt/ausstehend behandelt.

## Website-Struktur (3.3)

Der neue Reiter zeigt einen lokal berechneten, kräftebasierten SVG-Verzeichnisbaum aus den URLs des aktuellen Crawls. Verzeichnisse werden bei Bedarf synthetisch ergänzt und ausdrücklich als solche gekennzeichnet; Kanten stellen URL-Pfade dar, keine internen Links. Jede vollständige URL bleibt ein eigener Seitenknoten, einschließlich Query- und Slash-Varianten. Farben entsprechen der höchsten Befundpriorität; unbekannte/nicht angeforderte Prüfungen bleiben grau. Verzeichnisfarben aggregieren den gesamten Teilbaum.

Zoomen, Ansicht und Knoten ziehen, Einpassen, Titel-/URL-Suche, Prioritätsfilter, Seitendetails und separate Seitenlinks sind verfügbar. Teilbäume lassen sich in den Details sowie per Pfeiltaste rechts/links ein- und ausklappen, Enter öffnet Details. Große Bäume starten eingeklappt; Verzeichnisse zeigen zunächst bis zu 40 Kinder, weitere lassen sich nachladen. Maximal 600 Knoten werden gleichzeitig dargestellt, mit sichtbarem Hinweis. Alle Crawl-URLs bleiben im Datenmodell enthalten. Filter und Positionen bleiben beim Reiterwechsel erhalten und werden beim neuen Scan zurückgesetzt. Keine externe Visualisierungsbibliothek und keine Datenübertragung an Dritte.

Die Auswertungsfilter schließen bei Klick außerhalb sowie mit Esc; die Auswahl bleibt erhalten.

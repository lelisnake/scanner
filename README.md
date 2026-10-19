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

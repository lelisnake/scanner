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

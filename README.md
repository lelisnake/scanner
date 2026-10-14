# Domain Keyword Scanner

WebApp für manuelle Keyword-Scans öffentlich zugänglicher Websites.

## Start

Node.js 20+ installieren, dann:

```bash
npm install
npm start
```

Öffne http://localhost:3000.

## Online bereitstellen

Repository zu GitHub hochladen und auf Render als **Web Service** verbinden. Build Command: `npm install`, Start Command: `npm start`. Render setzt `PORT` automatisch. Alternativ auf jedem Node.js-Host betreiben.

## Grenzen der ersten Version

- Maximal 5 Domains, 30 Keywords, 100 Seiten pro Domain und Scan.
- Scannt HTML-Text, keine PDF-Inhalte oder nur clientseitig gerenderte Inhalte.
- Findet Unterseiten über interne Links und die Standard-Sitemap `/sitemap.xml`; verschachtelte Sitemap-Indizes werden noch nicht aufgelöst.
- robots.txt wird berücksichtigt. Keine Anmeldung, kein Scheduler, keine dauerhafte Speicherung.
- Server muss ausgehende HTTP(S)-Verbindungen erlauben. Bei langen Scans kann ein Hosting-Timeout greifen.
- SSRF-Schutz: nur öffentliche DNS-Ziele und gleiche Domain; für öffentlich zugänglichen Produktivbetrieb zusätzlich Egress-Firewall, Rate-Limits und Login empfehlen.

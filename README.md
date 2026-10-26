# PanemCraft

PanemCraft ist ein deutschsprachiger, responsiver Planungs-Leitstand für ein großes **Panem-Bauprojekt in Minecraft Java Survival**.

> Fan-made Planungsprojekt, nicht offiziell mit „Die Tribute von Panem“ verbunden. Die Karte ist schematisch; Koordinaten sind frei konfigurierbare Projektkoordinaten. Die Bauwerk- und Materialmengen sind Schätzungen, keine verifizierten Block-für-Block-Schemata.

## Starten

Es ist kein Build-Schritt und keine Installation nötig. Öffne `index.html` direkt im aktuellen Browser. Für lokale Entwicklung kann ein beliebiger statischer Webserver verwendet werden, beispielsweise:

```bash
python -m http.server 8000
```

Öffne dann `http://localhost:8000`.

## Enthalten

- Interaktive schematische Panem-Karte mit Kapitol, 13 Distrikten und zwei Arena-Markern
- Regionenauswahl mit editierbaren X/Z-Projektkoordinaten
- 13 Distriktkarten mit Landschafts-, Industrie- und Wohnkonzepten
- Konzepte der 74. und 75. Arena inklusive Funktionszonen
- Bahn- und Straßen-Netzwerk, Routenplanung und Distanzberechnung aus den Projektkoordinaten
- Bauwerkkatalog mit Region, Abmessungen, Status, Notiz und editierbaren Materialschätzungen
- Materialrechner, Baufortschritt und Statusfilter
- JSON-Export und -Import für Projekt-Backups bzw. Team-Austausch
- Lokale Speicherung im Browser per `localStorage`

## Bedienung

1. Wähle ein Gebiet auf der Karte oder in den Distriktkarten.
2. Passe die X/Z-Projektkoordinaten an. Streckendistanzen werden aus diesen Koordinaten berechnet.
3. Aktualisiere den Bauzustand einzelner Bauwerke und Verbindungen.
4. Lege eigene Gebäude und Verbindungen an. Materialien im Format `Material:Menge` eintragen, pro Zeile ein Material.
5. Exportiere regelmäßig eine JSON-Sicherung und teile sie mit deinem Team.

## Projektstruktur

- `index.html` – App-Struktur und Bereiche
- `styles.css` – responsives dunkles UI
- `app.js` – Regions-, Bauwerks-, Routen-, Material- und Speicherlogik

## Datenstatus / nächste Ausbaustufen

Die 13 Distrikte, Arenen und Verkehrsverbindungen sind als **Planungsentwürfe** angelegt. Ein genauer Block-für-Block-Plan benötigt pro Bauwerk Grundrissraster, Höhenebenen, Blocklisten und Prüfschritte; das ist nicht für jedes Bauwerk bereits enthalten. Es gibt aktuell keine Cloud-Synchronisierung, Benutzerkonten, serverseitige Datenbank oder Live-Multiplayer-Funktionen.

## GitHub Pages

Das Repository kann über **Settings → Pages** als statische Website veröffentlicht werden: wähle die Branch `main` und den Root-Ordner. Keine Build-Action notwendig.

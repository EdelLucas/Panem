# PanemCraft – Panem aus Blöcken

PanemCraft ist eine **begehbare 3D-Blockwelt von ganz Panem** im Minecraft-Stil, die direkt im Browser läuft – ohne Installation, ohne Build-Schritt.

> Inoffizielles Fan-Projekt. Nicht verbunden mit Suzanne Collins, Lionsgate, Mojang oder Microsoft. Es werden **keine Original-Minecraft-Texturen** verwendet: Alle Blockgrafiken werden beim Laden prozedural erzeugt.

## Was ist enthalten?

- **Ganz Panem als eine Welt:** 768 × 416 Blöcke Grundfläche, bis zu 128 Blöcke hoch, rund 9 Millionen Blöcke. Die Geografie folgt der verbreiteten Fan-Karte auf Basis Nordamerikas nach dem Anstieg des Meeresspiegels: Rocky Mountains, Kaskaden, Appalachen, Große Seen, Mississippi, Colorado River, Küsten, Wüsten, Prärien und Wälder.
- **Das Kapitol** in den Rocky Mountains: Präsidentenpalast mit Säulengang, Goldkuppel und Rosengarten, Stadtkreis mit Springbrunnen, gläsernes Trainingscenter, Hauptbahnhof, Allee der Tribute und bunte Wolkenkratzer.
- **Alle 13 Distrikte** mit typischen Bauwerken, z. B. Villen und Edelsteinatelier (D1), die „Nuss“ und der Steinbruch (D2), Elektronikwerke (D3), Hafen und Leuchtturm (D4), Staudamm und Kühlturm (D5), Rangierbahnhof (D6), Riesenfichtenwald und Sägewerk (D7), Webereien (D8), Weizenfelder, Silos und Windmühle (D9), Ranches mit Rindern (D10), Plantagen mit Zaun und Wachtürmen (D11), der Saum, das Dorf der Sieger und die Kohlemine (D12) sowie Ruinen mit einem geheimen, begehbaren Bunker (D13).
- **Die Arenen** der 74. Spiele (Waldarena mit goldenem Füllhorn unter einer Kraftfeld-Kuppel) und der 75. Spiele (Ziffernblatt-Insel im Golf).
- **Bahnnetz** vom Kapitol in alle Distrikte, mit Brücken, Tunneln und Bahnsteigen.

## Bedienung

- **Übersichtskarte:** Ziehen dreht, Rechtsklick bzw. zwei Finger verschieben, Mausrad zoomt. Klick auf ein Gebiet oder ein Namensschild zeigt Infos.
- **Welt erkunden:** `W` `A` `S` `D` laufen, Maus umsehen, `Leertaste` springen, `F` oder doppelt `Leertaste` fliegen, `Strg` sprinten, Linksklick abbauen, Rechtsklick setzen, `1`–`9`/Mausrad Hotbar, `E` Inventar, `M` Karte & Teleport, `Esc` Menü.
- **Touch:** virtueller Joystick links, rechts ziehen zum Umsehen, Knöpfe für Springen/Fliegen, Abbauen und Setzen.
- Eigene Bauten werden lokal im Browser gespeichert (`localStorage`) und können im Spielmenü zurückgesetzt werden.

## Starten

Öffne `index.html` über einen beliebigen statischen Webserver, zum Beispiel:

```bash
python -m http.server 8000
```

Dann `http://localhost:8000` öffnen. Benötigt wird ein Browser mit **WebGL 2** und Internetzugang (Three.js wird vom jsDelivr-CDN geladen, die Pixel-Schriften von Google Fonts). Die Welt wird beim Laden in wenigen Sekunden erzeugt.

## Projektstruktur

- `index.html`, `mc.css` – Oberfläche im Blockspiel-Stil (Titelmenü, HUD, Hotbar, Karte, Panels)
- `src/main.js` – Rendering mit Three.js, Übersichtskarte, Erkundungsmodus mit Physik, Bauen, Teleport, Minimap
- `src/data.js` – Regionen von Panem, Koordinaten, Beschreibungen, Bahnlinien
- `src/terrain.js` – Küstenumriss, Gebirge, Flüsse, Seen, Biome, Vegetation
- `src/structures.js` – alle Bauwerke von Kapitol, Distrikten, Arenen und dem Bahnnetz
- `src/mesher.js` – Greedy-Meshing mit Umgebungsverdeckung (AO) pro 32×32-Chunk
- `src/textures.js`, `src/blocks.js` – prozedurale 16×16-Texturen und Blockdefinitionen
- `planer.html`, `app.js`, `styles.css`, `world3d.js` – der frühere Bauplaner (Distrikte, Materialien, Verkehrsnetz) für ein echtes Minecraft-Survival-Projekt

## Maßstab

Ein echter 1:1-Nachbau eines Kontinents wäre mit Milliarden Blöcken nicht im Browser darstellbar. Die **Landschaft** ist daher auf etwa 7–8 km pro Block verkleinert, die **Städte und Bauwerke** sind dagegen im Blockmaßstab gebaut, damit man sie zu Fuß erkunden kann.

## Veröffentlichung mit GitHub Pages

Der Workflow `.github/workflows/pages.yml` veröffentlicht die Seite bei Änderungen an `main`. Einmalig unter **Settings → Pages** als Quelle **GitHub Actions** auswählen. Danach ist die Seite unter `https://<benutzer>.github.io/<repository>/` erreichbar.

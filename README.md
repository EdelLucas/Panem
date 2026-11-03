# PanemCraft – Bauanleitung für Panem in Minecraft (1:1)

Eine Website, die beim Nachbauen von Panem in **Minecraft Java** hilft – im Maßstab **1:1 (1 Block = 1 Meter)**. Sie ist kein Spiel, sondern ein Bauplan-Werkzeug.

> Inoffizielles Fan-Projekt. Es gibt keine offiziellen Baupläne von Panem. Maße und Aufbau sind eine Nachbildung in realer Gebäudegröße nach Buch- und Filmbeschreibungen. Keine Original-Minecraft-Texturen: alle Blockgrafiken werden prozedural erzeugt.

## Funktionen

- **Lageplan** des Kapitols mit allen Gebäuden und ihren echten Weltkoordinaten. Du gibst einmal den Ursprung (Mitte des Stadtkreises) ein, alle Koordinaten werden daraus berechnet.
- **Gebäude in Einzelteilen** (in Bau-Reihenfolge): z. B. beim Palast Sockel, Freitreppe, Außenwände, Decken, Fenster, Gesimse, Säulenportikus, Giebel, Dach, Kuppel, Banner. Teile ein-/ausblenden, „Nur dieses Teil“, „Bis hier gebaut“ und Explosionsansicht.
- **3D-Ansicht** zum Drehen und Zoomen, optional nur bis zur aktuellen Schicht geschnitten.
- **Schichtplan**: jede Y-Ebene von oben als Raster mit Blocktexturen, Weltkoordinaten an den Achsen, Schicht darunter blass eingeblendet, Koordinate und Block beim Überfahren. Schichten als „gebaut“ abhaken (Fortschritt wird gespeichert).
- **Materialliste** für das ganze Gebäude, sichtbare Bauteile, die aktuelle Schicht oder alles noch nicht Gebaute – mit Java-ID, Stacks und Shulkerkisten.
- **Export als `.schem`** (Sponge Schematic v2) für WorldEdit/FAWE und Litematica – ganzes Gebäude oder nur sichtbare Bauteile.

## Enthalten (Gebiet: Das Kapitol)

| Gebäude | Maße (B × H × T) |
|---|---|
| Stadtkreis mit Paradering, Brunnen, Laternen und Tribünen | 201 × 10 × 201 |
| Präsidentenpalast mit Portikus und Goldkuppel | 121 × 48 × 91 |
| Rosengarten | 80 × 4 × 40 |
| Trainingscenter (Untergeschoss, Lobby, 12 Distrikt-Etagen, Penthouse, Dachgarten) | 34 × 95 × 34 |
| Hauptbahnhof mit Glas-Tonnendach und Zug | 100 × 29 × 46 |
| Vier bunte Wohntürme (Vorlage) | 24 × 72 × 24 |

Weitere Gebiete (Distrikte, Arenen) folgen nach demselben Muster in `src/`.

## Starten

Über einen statischen Webserver öffnen, z. B. `python -m http.server 8000` → `http://localhost:8000`. Benötigt WebGL 2 und Internet (Three.js von jsDelivr).

## Projektstruktur

- `index.html`, `bau.css`, `src/main.js` – Oberfläche: Lageplan, 3D, Schichtplan, Bauteile, Material, Export
- `src/capitol.js` – alle Kapitol-Gebäude mit Bauteilen und Lage
- `src/structure.js` – Bauplan-Datenstruktur (Blockraster + Bauteil je Block)
- `src/schem.js` – `.schem`-Export (NBT + gzip)
- `src/smesh.js`, `src/textures.js`, `src/blocks.js` – 3D-Mesh, Texturen, Blöcke mit Java-IDs
- `planer.html`, `app.js`, `styles.css`, `world3d.js` – der Projektplaner (Status, Verkehrsnetz, Materialschätzungen)

## GitHub Pages

Der Workflow `.github/workflows/pages.yml` veröffentlicht die Seite bei Änderungen an `main`. Einmalig unter **Settings → Pages** die Quelle **GitHub Actions** wählen.

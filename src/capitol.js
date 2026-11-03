// Das Kapitol im Maßstab 1:1 (1 Block = 1 m). Jedes Gebäude ist in Bauteile in Bau-Reihenfolge gegliedert.
// Hinweis: Es gibt keine offiziellen Pläne. Maße und Aufbau sind eine Nachbildung nach Buch- und Filmbeschreibungen
// in realistischer Gebäudegröße.
import { Structure } from "./structure.js";
import { B } from "./blocks.js";

// ---------------------------------------------------------------------------
// Präsidentenpalast
function palast() {
  const s = new Structure(121, 48, 91);
  const Q = B.QUARTZ, SQ = B.SMOOTH_QUARTZ, P = B.QUARTZ_PILLAR;

  s.beginPart("Sockel & Terrasse", "3 Blöcke hoher Sockel: zwei Lagen polierter Andesit, oben glatter Quarz. Trägt alle weiteren Bauteile.");
  s.fill(0, 0, 8, 120, 1, 86, B.POLISHED_ANDESITE);
  s.fill(0, 2, 8, 120, 2, 86, SQ);

  s.beginPart("Freitreppe", "Zwei Stufen vor dem Säulenportikus, 41 Blöcke breit.");
  s.fill(40, 0, 87, 80, 1, 87, SQ);
  s.fill(40, 0, 88, 80, 0, 88, SQ);

  s.beginPart("Hauptbau – Außenwände", "Mittelbau 57 × 51 m, Wände 26 m hoch (drei Geschosse à 8 m). Ecken als 2 × 2 Quarzsäulen.");
  s.walls(32, 3, 20, 88, 28, 70, Q);
  for (const [x, z] of [[32, 20], [87, 20], [32, 69], [87, 69]]) s.fill(x, 3, z, x + 1, 28, z + 1, P);

  s.beginPart("Seitenflügel – Außenwände", "Zwei Flügel je 30 × 51 m, Wände 18 m hoch (zwei Geschosse).");
  s.walls(2, 3, 26, 31, 20, 76, Q);
  s.walls(89, 3, 26, 118, 20, 76, Q);
  for (const [x, z] of [[2, 26], [30, 75], [2, 75], [117, 26], [117, 75], [89, 75]]) s.fill(x, 3, z, x + 1, 20, z + 1, P);

  s.beginPart("Geschossdecken", "Decken aus glattem Stein auf lokaler Höhe 11 und 19. Im Hauptbau bleibt eine 21 × 21 m große Eingangshalle über alle Geschosse offen.");
  for (const y of [11, 19]) {
    s.fill(33, y, 21, 87, y, 69, B.SMOOTH_STONE);
    s.fill(50, y, 35, 70, y, 55, 0);
  }
  s.fill(3, 11, 27, 30, 11, 75, B.SMOOTH_STONE);
  s.fill(90, 11, 27, 117, 11, 75, B.SMOOTH_STONE);

  s.beginPart("Fenster & Türen", "Fenster 2 breit × 5 hoch im 5-m-Raster. Haupteingang 9 × 7 m, Seiteneingänge 3 × 4 m.");
  const winX = (xa, xb, z, floors) => { for (let x = xa + 3; x <= xb - 3; x++) if ((x - xa) % 5 === 2 || (x - xa) % 5 === 3) for (const yb of floors) s.fill(x, yb + 2, z, x, yb + 6, z, B.GLASS); };
  const winZ = (za, zb, x, floors) => { for (let z = za + 3; z <= zb - 3; z++) if ((z - za) % 5 === 2 || (z - za) % 5 === 3) for (const yb of floors) s.fill(x, yb + 2, z, x, yb + 6, z, B.GLASS); };
  winX(32, 88, 70, [3, 11, 19]); winX(32, 88, 20, [3, 11, 19]);
  winX(2, 31, 76, [3, 11]); winX(2, 31, 26, [3, 11]); winX(89, 118, 76, [3, 11]); winX(89, 118, 26, [3, 11]);
  winZ(26, 76, 2, [3, 11]); winZ(26, 76, 118, [3, 11]);
  s.fill(56, 3, 70, 64, 9, 70, 0);
  s.fill(15, 3, 76, 17, 6, 76, 0); s.fill(103, 3, 76, 105, 6, 76, 0);

  s.beginPart("Gesimse & Pilaster", "Umlaufende Gesimsbänder (1 Block vorstehend) auf Deckenhöhe und am Dachrand, Pilaster zwischen den Fenstern der Hauptfassade.");
  for (const y of [11, 19]) { s.fill(31, y, 71, 89, y, 71, SQ); s.fill(31, y, 19, 89, y, 19, SQ); }
  s.ring(31, 29, 19, 89, 71, SQ);
  for (const [x0, x1] of [[1, 31], [89, 119]]) { s.fill(x0, 11, 77, x1, 11, 77, SQ); s.ring(x0, 21, 25, x1, 77, SQ); }
  for (let x = 34; x <= 86; x++) if ((x - 32) % 5 === 0 && (x < 55 || x > 65)) for (const [a, b] of [[3, 10], [12, 18], [20, 28]]) s.fill(x, a, 71, x, b, 71, P);

  s.beginPart("Säulenportikus", "9 Säulen aus je 2 × 2 Quarzsäulen (22 m Schaft), mit Basis aus glattem Quarz und Kapitell aus gemeißeltem Quarz. Achsabstand 6 m.");
  for (let k = 0; k < 9; k++) {
    const x = 35 + 6 * k;
    s.fill(x - 1, 3, 75, x + 2, 3, 78, SQ);
    s.fill(x, 4, 76, x + 1, 25, 77, P);
    s.fill(x - 1, 26, 75, x + 2, 26, 78, B.CHISELED_QUARTZ);
  }

  s.beginPart("Gebälk & Giebel", "Querbalken (2 Blöcke) über den Säulen und dreieckiger Giebel in 3er-Stufen mit goldener Kante und Spitze.");
  s.fill(33, 27, 71, 87, 28, 79, Q);
  for (let k = 0; ; k++) {
    const x0 = 33 + 3 * k, x1 = 87 - 3 * k;
    if (x0 > x1) break;
    s.fill(x0, 29 + k, 71, x1, 29 + k, 79, Q);
    s.set(x0, 29 + k, 79, B.GOLD); s.set(x1, 29 + k, 79, B.GOLD);
    if (x1 - x0 < 6) s.fill(x0, 29 + k, 79, x1, 29 + k, 79, B.GOLD);
  }

  s.beginPart("Dach & Balustrade", "Flachdächer aus glattem Quarz. Balustrade: Säulen im Wechsel mit Lücken, darüber ein durchgehender Handlauf.");
  s.fill(33, 29, 21, 87, 29, 69, SQ);
  s.fill(3, 21, 27, 30, 21, 75, SQ); s.fill(90, 21, 27, 117, 21, 75, SQ);
  const balustrade = (x0, y, z0, x1, z1) => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue;
      const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
      if ((x + z) % 2 === 0 || corner) s.set(x, y, z, P);
    }
    s.ring(x0, y + 1, z0, x1, z1, SQ);
  };
  balustrade(32, 30, 20, 88, 70);
  balustrade(2, 22, 26, 31, 76); balustrade(89, 22, 26, 118, 76);

  s.beginPart("Kuppel", "Tambour (Ø 19 m, 6 m hoch) mit 8 Fensterbändern, goldene Kuppel (Radius 9) und gläserne Laterne mit Goldspitze.");
  s.cyl(60, 45, 9, 30, 35, Q, true);
  for (let dz = -9; dz <= 9; dz++) for (let dx = -9; dx <= 9; dx++) {
    if (s.get(60 + dx, 31, 45 + dz) !== Q) continue;
    const seg = Math.floor(((Math.atan2(dz, dx) + Math.PI) / (Math.PI * 2)) * 16);
    if (seg % 2 === 0) s.fill(60 + dx, 31, 45 + dz, 60 + dx, 34, 45 + dz, B.GLASS);
  }
  s.cyl(60, 45, 10, 36, 36, SQ);
  s.dome(60, 36, 45, 9, B.GOLD);
  s.fill(59, 46, 44, 61, 46, 46, B.GLASS);
  s.set(60, 47, 45, B.GOLD);

  s.beginPart("Banner", "Rote Banner aus roter Wolle (2 breit, 12 hoch) an der Hauptfassade und den Flügeln.");
  for (const x of [39, 80]) s.fill(x, 12, 71, x + 1, 24, 71, B.RED_WOOL);
  for (const x of [9, 110]) s.fill(x, 7, 77, x + 1, 17, 77, B.RED_WOOL);
  return s;
}

// ---------------------------------------------------------------------------
// Rosengarten hinter dem Palast
function rosengarten() {
  const s = new Structure(80, 4, 40);
  s.beginPart("Rasenfläche", "Grasblöcke auf Geländehöhe (ersetzen die oberste Bodenschicht).");
  s.fill(0, 0, 0, 79, 0, 39, B.GRASS);
  s.beginPart("Wege", "Kieswege: Rundweg innen an der Hecke und ein Wegkreuz durch die Mitte (je 2–4 Blöcke breit).");
  s.ring(2, 0, 2, 77, 37, B.GRAVEL); s.ring(3, 0, 3, 76, 36, B.GRAVEL);
  s.fill(0, 0, 18, 79, 0, 21, B.GRAVEL); s.fill(38, 0, 0, 41, 0, 39, B.GRAVEL);
  s.beginPart("Hecken", "Außenhecke 2 Blöcke hoch (Eichenlaub, nicht verrottend) mit Durchgängen; niedrige Hecken (1 Block) um die vier Beete.");
  s.ring(0, 1, 0, 79, 39, B.OAK_LEAVES); s.ring(0, 2, 0, 79, 39, B.OAK_LEAVES);
  s.fill(38, 1, 0, 41, 2, 0, 0); s.fill(38, 1, 39, 41, 2, 39, 0);
  const beds = [[5, 5, 36, 16], [43, 5, 74, 16], [5, 23, 36, 34], [43, 23, 74, 34]];
  for (const [x0, z0, x1, z1] of beds) s.ring(x0, 1, z0, x1, z1, B.OAK_LEAVES);
  s.beginPart("Rosenbeete", "Blumenreihen auf Gras, jede zweite Reihe. Weiße Tulpen stehen für Snows weiße Rosen; alternativ Rosenbüsche (2 Blöcke hoch).");
  for (const [x0, z0, x1, z1] of beds) for (let z = z0 + 2; z <= z1 - 2; z += 2) for (let x = x0 + 2; x <= x1 - 2; x++) s.set(x, 1, z, (x % 9 === 0) ? B.POPPY : B.WHITE_TULIP);
  s.beginPart("Brunnen", "8 × 8 Becken mit Quarzrand, Wasser und Mittelsäule mit Seelaterne.");
  s.fill(36, 0, 16, 43, 0, 23, B.SMOOTH_QUARTZ);
  s.ring(36, 1, 16, 43, 23, B.QUARTZ);
  s.fill(37, 1, 17, 42, 1, 22, B.WATER);
  s.fill(39, 1, 19, 40, 2, 20, B.QUARTZ_PILLAR);
  s.fill(39, 3, 19, 40, 3, 20, B.SEA_LANTERN);
  return s;
}

// ---------------------------------------------------------------------------
// Stadtkreis (City Circle)
function stadtkreis() {
  const N = 201, c = 100;
  const s = new Structure(N, 10, N);
  const each = (fn) => { for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { const dx = x - c, dz = z - c; fn(x, z, Math.hypot(dx, dz), Math.atan2(dz, dx)); } };
  s.beginPart("Platz – Pflaster", "Innerer Platz (Radius 60): Ringe aus weißem Beton und glattem Quarz im 4-m-Wechsel, gelber Zierring bei Radius 56–58.");
  each((x, z, d) => { if (d < 60) s.set(x, 0, z, d >= 56 && d < 58 ? B.C_YELLOW : (Math.floor(d / 4) % 2 ? B.SMOOTH_QUARTZ : B.C_WHITE)); });
  s.beginPart("Fahrbahnring", "Ring für die Wagenparade der Tribute (Radius 60–78) aus grauem Beton mit gestrichelter Mittellinie.");
  each((x, z, d, a) => { if (d >= 60 && d < 78) s.set(x, 0, z, Math.abs(d - 69) < 0.55 && Math.floor((a + Math.PI) * 30) % 2 === 0 ? B.C_WHITE : B.C_GRAY); });
  s.beginPart("Bordstein", "Außenkante (Radius 78–80) aus Steinziegeln, äußerer Ring 1 Block hoch.");
  each((x, z, d) => { if (d >= 78 && d < 80.5) { s.set(x, 0, z, B.STONE_BRICKS); if (d >= 79.3) s.set(x, 1, z, B.STONE_BRICKS); } });
  s.beginPart("Brunnen", "Becken Radius 14 mit Prismarinboden, Quarzrand (2 hoch) und zweistufiger Mittelsäule mit Seelaterne.");
  each((x, z, d) => { if (d < 14) s.set(x, 0, z, B.PRISMARINE); });
  s.cyl(c, c, 14, 1, 2, B.QUARTZ, true);
  each((x, z, d) => { if (d < 13.2 && s.get(x, 1, z) === 0) s.set(x, 1, z, B.WATER); });
  s.cyl(c, c, 4, 1, 4, B.SMOOTH_QUARTZ);
  s.cyl(c, c, 2, 5, 7, B.QUARTZ);
  s.set(c, 8, c, B.SEA_LANTERN);
  s.beginPart("Laternen", "24 Laternen (Pfosten aus poliertem Andesit, 4 hoch, mit Seelaterne) im Abstand von 15° auf Radius 54.");
  for (let k = 0; k < 24; k++) {
    const a = k / 24 * Math.PI * 2, x = Math.round(c + Math.cos(a) * 54), z = Math.round(c + Math.sin(a) * 54);
    s.fill(x, 1, z, x, 4, z, B.POLISHED_ANDESITE); s.set(x, 5, z, B.SEA_LANTERN);
  }
  s.beginPart("Tribünen", "Zuschauertribünen im Osten und Westen (je 70° breit), 7 Stufen à 2 m Tiefe und 1 m Höhe, Sitzkanten farbig.");
  each((x, z, d, a) => {
    if (d < 82 || d >= 96) return;
    const east = Math.abs(a) < 0.61, west = Math.abs(Math.abs(a) - Math.PI) < 0.61;
    if (!east && !west) return;
    const row = Math.floor((d - 82) / 2);
    s.set(x, 0, z, B.SMOOTH_STONE);
    s.fill(x, 1, z, x, row, z, B.C_WHITE);
    s.set(x, row + 1, z, row % 2 ? B.C_WHITE : (east ? B.C_MAGENTA : B.C_CYAN));
  });
  return s;
}

// ---------------------------------------------------------------------------
// Trainingscenter
const DISTRICT_COLORS = [B.C_YELLOW, B.C_GRAY, B.C_CYAN, B.C_BLUE, B.C_LIME, B.C_ORANGE, B.C_GREEN, B.C_RED, B.C_BROWN, B.C_PINK, B.C_PURPLE, B.C_BLACK];
function trainingscenter() {
  const s = new Structure(34, 95, 34);
  const core = (y) => s.fill(14, y, 14, 19, y, 19, 0);
  const facade = (y0, y1, mull = B.C_LIGHT_GRAY) => {
    s.walls(0, y0, 0, 33, y1, 33, B.GLASS);
    for (let k = 0; k <= 33; k += 4) for (const [x, z] of [[k, 0], [k, 33], [0, k], [33, k]]) s.fill(x, y0, z, x, y1, z, mull);
    for (const [x, z] of [[0, 0], [33, 0], [0, 33], [33, 33]]) s.fill(x, y0, z, x, y1, z, mull);
  };
  s.beginPart("Untergeschoss – Trainingshalle", "Liegt komplett unter der Erde: Boden aus glattem Stein, Wände aus grauem Beton, Decke mit Seelaternen. Mit Bogenschießstand, Kletterwand und Strohpuppen.");
  s.fill(0, 0, 0, 33, 0, 33, B.SMOOTH_STONE);
  s.walls(0, 1, 0, 33, 9, 33, B.C_GRAY);
  s.fill(0, 10, 0, 33, 10, 33, B.C_WHITE); core(10);
  for (let x = 3; x <= 30; x += 6) for (let z = 3; z <= 30; z += 6) s.set(x, 10, z, B.SEA_LANTERN);
  for (let z = 4; z <= 10; z += 3) { s.set(32, 3, z, B.TARGET); s.set(32, 4, z, B.TARGET); }
  s.fill(1, 1, 22, 1, 9, 31, B.COBBLE);
  for (let x = 24; x <= 30; x += 3) { s.set(x, 1, 28, B.HAY); s.set(x, 2, 28, B.HAY); }
  s.fill(4, 1, 4, 9, 1, 9, B.C_RED);
  s.beginPart("Erdgeschoss – Lobby", "9 m hohe Glaslobby, Eingang im Süden (4 breit), Empfangstresen aus Quarz. Der Boden liegt auf Geländehöhe.");
  facade(11, 19, B.IRON);
  s.fill(15, 11, 33, 18, 15, 33, 0);
  s.fill(11, 11, 25, 22, 11, 26, B.QUARTZ);
  for (let e = 1; e <= 12; e++) {
    const y = 20 + 5 * (e - 1);
    s.beginPart(`Etage ${e} – Distrikt ${e}`, `Decke aus weißem Beton mit umlaufendem Farbband (Kennfarbe Distrikt ${e}, frei gewählt), 4 m hohe Glasfassade mit Pfosten alle 4 m.`);
    s.fill(0, y, 0, 33, y, 33, B.C_WHITE);
    s.ring(0, y, 0, 33, 33, DISTRICT_COLORS[e - 1]);
    core(y);
    facade(y + 1, y + 4);
  }
  s.beginPart("Penthouse", "Oberstes Geschoss für die Mentoren: Decke mit Goldrand, 6 m hohe Glasfassade.");
  s.fill(0, 80, 0, 33, 80, 33, B.C_WHITE); s.ring(0, 80, 0, 33, 33, B.GOLD); core(80);
  facade(81, 86, B.QUARTZ_PILLAR);
  s.fill(0, 87, 0, 33, 87, 33, B.SMOOTH_QUARTZ); s.ring(0, 87, 0, 33, 33, B.GOLD); core(87);
  s.beginPart("Kern – Aufzüge & Treppen", "Massiver Kern 8 × 8 m aus grauem Beton über die ganze Höhe, mit Aufzugstüren nach Süden auf jeder Etage.");
  s.walls(13, 1, 13, 20, 92, 20, B.C_GRAY);
  for (const yb of [1, 11, ...Array.from({ length: 12 }, (_, i) => 21 + 5 * i), 81, 88]) s.fill(16, yb, 20, 17, yb + 2, 20, 0);
  s.fill(13, 93, 13, 20, 93, 20, B.C_GRAY);
  s.beginPart("Dachgarten", "Rasen mit Hecken und Blumen, Glasbrüstung (2 hoch) am Rand, Antenne auf dem Kern.");
  s.fill(1, 88, 1, 32, 88, 32, B.GRASS);
  s.walls(0, 88, 0, 33, 89, 33, B.GLASS);
  for (const [x, z] of [[4, 4], [27, 4], [4, 27], [27, 27]]) { s.fill(x, 89, z, x + 2, 90, z + 2, B.OAK_LEAVES); }
  for (let x = 3; x <= 30; x += 2) { s.set(x, 89, 10, B.WHITE_TULIP); s.set(x, 89, 23, B.POPPY); }
  s.fill(16, 94, 16, 16, 94, 16, B.IRON_BARS);
  return s;
}

// ---------------------------------------------------------------------------
// Hauptbahnhof
function bahnhof() {
  const W = 100, Dp = 46, s = new Structure(W, 29, Dp);
  s.beginPart("Bodenplatte", "Bodenplatte aus glattem Stein auf Geländehöhe.");
  s.fill(0, 0, 0, W - 1, 0, Dp - 1, B.SMOOTH_STONE);
  // Bahnsteige (5) und Gleise (3) im Wechsel
  const segs = []; for (let z = 2; z + 4 <= Dp - 3;) { segs.push(["P", z, z + 4]); z += 5; if (z + 2 <= Dp - 3) { segs.push(["T", z, z + 2]); z += 3; } }
  s.beginPart("Gleise", "Gleisbett aus Kies (3 breit), Schiene in der Mitte. Die Gleise laufen nach Osten aus der Halle hinaus.");
  for (const [t, a, b] of segs) if (t === "T") { s.fill(12, 0, a, W - 1, 0, b, B.GRAVEL); s.fill(12, 1, a + 1, W - 1, 1, a + 1, B.RAIL_X); }
  s.beginPart("Bahnsteige", "Bahnsteige 5 breit, 1 Block erhöht, mit gelber Sicherheitskante.");
  for (const [t, a, b] of segs) if (t === "P") { s.fill(12, 1, a, W - 1, 1, b, B.SMOOTH_STONE); s.fill(12, 1, a, W - 1, 1, a, B.C_YELLOW); s.fill(12, 1, b, W - 1, 1, b, B.C_YELLOW); }
  s.beginPart("Stützen", "Stützen aus hellgrauem Beton auf jedem Bahnsteig, alle 10 m, 15 m hoch.");
  for (const [t, a, b] of segs) if (t === "P") for (let x = 22; x < W; x += 10) s.fill(x, 2, Math.round((a + b) / 2), x, 16, Math.round((a + b) / 2), B.C_LIGHT_GRAY);
  s.beginPart("Seitenwände", "Glaswände an den Längsseiten mit Pfeilern alle 10 m.");
  for (const z of [0, Dp - 1]) { s.fill(12, 1, z, W - 1, 16, z, B.GLASS); for (let x = 12; x < W; x += 10) s.fill(x, 1, z, x, 16, z, B.C_LIGHT_GRAY); }
  s.beginPart("Glasdach (Tonnengewölbe)", "Gewölbtes Glasdach (Radius 30) von 16 m am Rand bis 27 m in der Mitte, Rippen alle 10 m.");
  const R = 30, mid = (Dp - 1) / 2, base = Math.sqrt(R * R - mid * mid);
  const yr = z => 16 + Math.round(Math.sqrt(Math.max(0, R * R - (z - mid) ** 2)) - base);
  for (let z = 0; z < Dp; z++) {
    const top = yr(z), lo = Math.min(top, z > 0 ? yr(z - 1) + 1 : top, z < Dp - 1 ? yr(z + 1) + 1 : top);
    for (let x = 12; x < W; x++) s.fill(x, lo, z, x, top, z, (x - 12) % 10 === 0 ? B.C_LIGHT_GRAY : B.GLASS);
  }
  s.beginPart("Empfangsgebäude", "Kopfbau im Westen (12 × 46 m, 22 m hoch) aus Quarz mit großem Rundbogenfenster, Eingang und Uhr.");
  s.fill(0, 1, 0, 11, 1, Dp - 1, B.SMOOTH_QUARTZ);
  s.walls(0, 1, 0, 11, 22, Dp - 1, B.QUARTZ);
  s.fill(0, 23, 0, 11, 23, Dp - 1, B.SMOOTH_QUARTZ);
  for (let z = 0; z < Dp; z++) for (let y = 4; y <= 19; y++) { const dz = z - mid, dy = y - 11; if (Math.abs(dz) <= 9 && (dy <= 0 || Math.hypot(dz, dy) <= 9)) s.set(0, y, z, B.GLASS); }
  s.fill(0, 2, 19, 0, 6, 26, 0);
  s.fill(11, 2, 3, 11, 15, Dp - 4, 0);
  s.fill(0, 19, 20, 0, 23, 25, B.C_BLACK); s.fill(0, 20, 21, 0, 22, 24, B.CHISELED_QUARTZ); s.set(0, 21, 22, B.C_BLACK); s.set(0, 22, 22, B.C_BLACK); s.set(0, 21, 23, B.C_BLACK);
  for (const z of [0, Dp - 1]) s.fill(0, 1, z, 0, 23, z, B.QUARTZ_PILLAR);
  s.beginPart("Hochgeschwindigkeitszug", "Dekorativer Zug auf Gleis 1: 60 m lang, 3 breit, 3 hoch, mit Fensterband und spitzer Nase.");
  const t1 = segs.find(sg => sg[0] === "T");
  if (t1) {
    const [, a, b] = t1;
    s.fill(20, 2, a, 79, 4, b, B.C_WHITE);
    for (let x = 20; x <= 79; x++) if ((x - 20) % 15 !== 7) { s.set(x, 3, a, B.C_BLACK); s.set(x, 3, b, B.C_BLACK); }
    s.fill(80, 2, a, 81, 3, b, B.C_WHITE); s.fill(82, 2, a + 1, 82, 2, a + 1, B.C_WHITE); s.fill(80, 3, a + 1, 81, 3, a + 1, B.C_BLACK);
    s.fill(20, 2, a, 79, 2, b, B.C_GRAY);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Kapitol-Wohnturm (Vorlage für die bunten Hochhäuser)
function wohnturm(colA, colB) {
  return () => {
    const s = new Structure(24, 72, 24);
    s.beginPart("Bodenplatte & Lobby", "Bodenplatte aus poliertem Andesit, 5 m hohe Glaslobby mit Eingang im Süden.");
    s.fill(0, 0, 0, 23, 0, 23, B.POLISHED_ANDESITE);
    s.walls(0, 1, 0, 23, 5, 23, B.GLASS);
    s.fill(10, 1, 23, 13, 3, 23, 0);
    s.beginPart("Tragwerk & Decken", "Eckstützen 2 × 2 aus Quarzsäulen, Decken aus weißem Beton alle 4 m (15 Etagen).");
    for (const [x, z] of [[0, 0], [22, 0], [0, 22], [22, 22]]) s.fill(x, 1, z, x + 1, 66, z + 1, B.QUARTZ_PILLAR);
    for (let y = 6; y <= 62; y += 4) s.fill(1, y, 1, 22, y, 22, B.C_WHITE);
    s.beginPart("Glasfassade", "Glas zwischen den Decken, 3 Blöcke hoch je Etage.");
    for (let y = 7; y <= 63; y += 4) { s.walls(0, y, 0, 23, y + 2, 23, B.GLASS); for (const [x, z] of [[0, 0], [22, 0], [0, 22], [22, 22]]) s.fill(x, y, z, x + 1, y + 2, z + 1, B.QUARTZ_PILLAR); }
    s.beginPart("Farbbänder", "Umlaufende Farbbänder auf jeder Deckenkante, Farben abwechselnd.");
    for (let y = 6; y <= 62; y += 4) s.ring(0, y, 0, 23, 23, ((y - 6) / 4) % 2 ? colB : colA);
    s.beginPart("Dachkrone", "Gestufte Krone aus Gold und Farbe mit Seelaterne an der Spitze.");
    s.fill(0, 66, 0, 23, 66, 23, colA);
    for (let k = 0; k < 4; k++) s.ring(2 + k * 2, 67 + k, 2 + k * 2, 21 - k * 2, 21 - k * 2, k % 2 ? colB : B.GOLD);
    s.fill(11, 67, 11, 12, 70, 12, B.GOLD); s.set(11, 71, 11, B.SEA_LANTERN);
    return s;
  };
}

// ---------------------------------------------------------------------------
// Gebäudeliste mit Lage. at = [x, z] der Nordwest-Ecke relativ zum Ursprung (Mitte des Stadtkreises).
// sink = Anzahl der Blockschichten unterhalb der Geländeoberfläche (Oberfläche selbst zählt mit).
export const REGION = { id: "kapitol", name: "Das Kapitol" };
export const BUILDINGS = [
  { id: "stadtkreis", name: "Stadtkreis (City Circle)", make: stadtkreis, at: [-100, -100], sink: 1, desc: "Der runde Hauptplatz des Kapitols (Ø 160 m Platz, Ø 200 m mit Tribünen). Hier fährt die Wagenparade der Tribute; im Norden liegt der Präsidentenpalast." },
  { id: "palast", name: "Präsidentenpalast", make: palast, at: [-60, -175], sink: 0, desc: "Klassizistischer Palast nördlich des Stadtkreises: Mittelbau mit drei Geschossen, zwei Seitenflügel, Säulenportikus mit Giebel und goldene Kuppel. Front nach Süden zum Stadtkreis." },
  { id: "rosengarten", name: "Rosengarten", make: rosengarten, at: [-40, -217], sink: 1, desc: "Der Rosengarten des Präsidenten direkt hinter (nördlich) dem Palast, mit Heckenrahmen, vier Beeten und Brunnen." },
  { id: "trainingscenter", name: "Trainingscenter", make: trainingscenter, at: [110, -17], sink: 11, desc: "Turm der Tribute östlich des Stadtkreises: Trainingshalle im Untergeschoss, Lobby, eine Etage pro Distrikt (1–12), Penthouse und Dachgarten. Gesamthöhe 84 m über Gelände." },
  { id: "bahnhof", name: "Hauptbahnhof", make: bahnhof, at: [-50, 110], sink: 1, desc: "Kopfbahnhof südlich des Stadtkreises mit vier Gleisen, Glas-Tonnendach und Empfangsgebäude. Die Gleise verlassen die Halle nach Osten." },
  { id: "turm1", name: "Wohnturm Magenta/Türkis", make: wohnturm(B.C_MAGENTA, B.C_CYAN), at: [-175, -60], sink: 1, desc: "Typischer bunter Kapitol-Wohnturm (24 × 24 m, 71 m hoch). Vorlage – beliebig oft im Stadtgebiet einsetzbar." },
  { id: "turm2", name: "Wohnturm Gelb/Orange", make: wohnturm(B.C_YELLOW, B.C_ORANGE), at: [-175, 30], sink: 1, desc: "Bunter Kapitol-Wohnturm in Gelb und Orange." },
  { id: "turm3", name: "Wohnturm Violett/Rosa", make: wohnturm(B.C_PURPLE, B.C_PINK), at: [150, 50], sink: 1, desc: "Bunter Kapitol-Wohnturm in Violett und Rosa." },
  { id: "turm4", name: "Wohnturm Hellgrün/Hellblau", make: wohnturm(B.C_LIME, B.C_LIGHTBLUE), at: [150, -95], sink: 1, desc: "Bunter Kapitol-Wohnturm in Hellgrün und Hellblau." }
];

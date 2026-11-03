// Geografie und Regionen von Panem (Fan-Interpretation auf Basis Nordamerikas).
export const W = 768, D = 416, H = 128, SEA = 20;
export const toX = lon => Math.round((lon + 127) * 12);
export const toZ = lat => Math.round((54 - lat) * 13.87);
export const lonOf = x => x / 12 - 127;
export const latOf = z => 54 - z / 13.87;

// icon = Block-ID-Schlüssel für das Menü-Icon
export const REGIONS = [
  {
    id: "capitol", short: "Kapitol", name: "Das Kapitol", industry: "Hauptstadt & Regierung", lon: -107.5, lat: 40, r: 40,
    icon: "gold", inspo: "Rocky Mountains (ehem. Colorado)",
    desc: "Die prunkvolle Hauptstadt liegt hoch in den Rocky Mountains. Bunte Türme umringen den Stadtkreis mit dem Präsidentenpalast, das gläserne Trainingscenter überragt alles, und am Hauptbahnhof laufen die Bahnlinien aus allen Distrikten zusammen.",
    landmarks: ["Präsidentenpalast mit Rosengarten", "Stadtkreis mit Springbrunnen", "Trainingscenter (Glasturm)", "Hauptbahnhof", "Allee der Tribute"]
  },
  {
    id: "d1", short: "D1", name: "Distrikt 1", industry: "Luxusgüter", lon: -112, lat: 45.5, r: 26, icon: "diamond",
    inspo: "Nördliche Rockies (ehem. Idaho/Montana)",
    desc: "Hier entstehen Schmuck, Edelsteine und Luxuswaren für das Kapitol. Weiße Villen mit goldenen Dächern, ein Edelsteinatelier und ein prächtiges Justizgebäude prägen den reichen Distrikt.",
    landmarks: ["Justizgebäude mit Säulen", "Villen mit Gärten und Pools", "Edelsteinatelier", "Goldener Brunnenplatz"]
  },
  {
    id: "d2", short: "D2", name: "Distrikt 2", industry: "Steinbruch & Friedenswächter", lon: -105, lat: 35.5, r: 28, icon: "stone_bricks",
    inspo: "Südliche Rockies (ehem. New Mexico)",
    desc: "Der Gebirgsdistrikt nahe dem Kapitol liefert Stein und bildet Friedenswächter aus. Wahrzeichen ist die „Nuss“ – eine in den Berg gehauene Festung – neben einem gewaltigen Terrassen-Steinbruch.",
    landmarks: ["Die „Nuss“ (Bergfestung)", "Terrassen-Steinbruch", "Kasernen der Friedenswächter", "Exerzierplatz"]
  },
  {
    id: "d3", short: "D3", name: "Distrikt 3", industry: "Technologie", lon: -98, lat: 40.5, r: 26, icon: "iron",
    inspo: "Great Plains (ehem. Nebraska/Kansas)",
    desc: "Fabriken für Elektronik und Maschinen: Werkhallen aus Eisen und Glas, rauchende Schornsteine, Funkmasten und schlichte Arbeiterwohnungen.",
    landmarks: ["Elektronikwerke", "Funkmast", "Schornsteine", "Arbeiterquartier"]
  },
  {
    id: "d4", short: "D4", name: "Distrikt 4", industry: "Fischerei", lon: -123.2, lat: 41, r: 24, icon: "prismarine",
    inspo: "Pazifikküste (ehem. Nordkalifornien/Oregon)",
    desc: "Der Küstendistrikt am Pazifik lebt vom Meer: Holzstege, Fischerboote mit weißen Segeln, ein bunter Fischmarkt und ein rot-weißer Leuchtturm.",
    landmarks: ["Hafen mit Stegen", "Fischerboote", "Leuchtturm", "Fischmarkt"]
  },
  {
    id: "d5", short: "D5", name: "Distrikt 5", industry: "Energie", lon: -114.6, lat: 36.2, r: 26, icon: "lamp",
    inspo: "Colorado-Schlucht (ehem. Nevada)",
    desc: "Ein gewaltiger Staudamm in einer Felsschlucht, Kraftwerke, ein Kühlturm und Hochspannungsmasten liefern Strom für ganz Panem.",
    landmarks: ["Staudamm mit Stausee", "Kraftwerk", "Kühlturm", "Hochspannungsmasten"]
  },
  {
    id: "d6", short: "D6", name: "Distrikt 6", industry: "Transport", lon: -95.5, lat: 36.5, r: 26, icon: "rail_x",
    inspo: "Südliche Prärie (ehem. Oklahoma)",
    desc: "Der Knotenpunkt des Bahnnetzes: Rangierbahnhof mit vielen Gleisen, Lokdepot, Wasserturm, Lagerhallen und abgestellte Züge.",
    landmarks: ["Rangierbahnhof", "Lokdepot", "Wasserturm", "Lagerhallen"]
  },
  {
    id: "d7", short: "D7", name: "Distrikt 7", industry: "Holz & Papier", lon: -121.5, lat: 46.5, r: 26, icon: "spruce_log",
    inspo: "Pazifischer Nordwesten (ehem. Washington)",
    desc: "Riesige Nadelwälder so weit das Auge reicht. Im Zentrum liegen Sägewerk, Holzstapel und Blockhütten der Holzfäller.",
    landmarks: ["Riesenfichtenwald", "Sägewerk", "Holzlager", "Blockhütten"]
  },
  {
    id: "d8", short: "D8", name: "Distrikt 8", industry: "Textilien", lon: -85.5, lat: 40.2, r: 26, icon: "wool_red",
    inspo: "Mittlerer Westen (ehem. Indiana/Ohio)",
    desc: "Eine dichte Industriestadt: Backstein-Webereien mit Sheddächern, Färbereien mit bunten Stoffballen und graue Wohnblöcke.",
    landmarks: ["Webereien mit Sheddächern", "Färberei", "Wohnblöcke", "Schornsteine"]
  },
  {
    id: "d9", short: "D9", name: "Distrikt 9", industry: "Getreide", lon: -99, lat: 45.5, r: 28, icon: "hay",
    inspo: "Nördliche Prärie (ehem. Dakota)",
    desc: "Weite Weizenfelder mit Bewässerungsgräben, silberne Silos, Windmühlen und Heuballen – die Kornkammer Panems.",
    landmarks: ["Weizenfelder", "Silos", "Windmühle", "Heuballen"]
  },
  {
    id: "d10", short: "D10", name: "Distrikt 10", industry: "Viehzucht", lon: -99.5, lat: 31.5, r: 26, icon: "wool_brown",
    inspo: "Texanisches Grasland",
    desc: "Endlose Weiden mit Holzzäunen, rote Scheunen, Ranchhäuser und Rinderherden.",
    landmarks: ["Rote Scheunen", "Weiden mit Rindern", "Ranchhaus", "Futtersilo"]
  },
  {
    id: "d11", short: "D11", name: "Distrikt 11", industry: "Landwirtschaft", lon: -84, lat: 32.5, r: 28, icon: "apple_leaves",
    inspo: "Der Süden (ehem. Georgia)",
    desc: "Riesige Obstplantagen und Felder, umgeben von einem hohen Zaun mit Wachtürmen. Die Arbeiter wohnen in einfachen Hütten.",
    landmarks: ["Obstplantagen", "Hoher Zaun mit Wachtürmen", "Felder", "Arbeiterhütten"]
  },
  {
    id: "d12", short: "D12", name: "Distrikt 12", industry: "Kohlebergbau", lon: -81.8, lat: 37.6, r: 28, icon: "coal_ore",
    inspo: "Appalachen (ehem. West Virginia/Kentucky)",
    desc: "Der ärmste Distrikt in den Appalachen: der Saum mit seinen grauen Hütten, das Dorf der Sieger, der Förderturm der Kohlemine und der Zaun – dahinter liegen Wiese, See und Wald.",
    landmarks: ["Der Saum", "Dorf der Sieger", "Kohlemine mit Förderturm", "Justizgebäude & Platz", "Zaun, Wiese & Wald"]
  },
  {
    id: "d13", short: "D13", name: "Distrikt 13", industry: "Graphit & Verteidigung", lon: -74.5, lat: 45.5, r: 26, icon: "obsidian",
    inspo: "Nordosten (ehem. Neuengland/Québec)",
    desc: "Offiziell zerstört – an der Oberfläche sind nur Trümmer und Krater zu sehen. Darunter liegt jedoch ein riesiger Bunker. Tipp: Suche den Schacht mit der Wendeltreppe!",
    landmarks: ["Ruinen & Krater", "Landeplatz für Hovercrafts", "Geheimer Schacht", "Unterirdischer Bunker"]
  },
  {
    id: "arena74", short: "Arena 74", name: "Arena der 74. Spiele", industry: "Wald-Arena", lon: -110, lat: 33.5, r: 34, icon: "oak_leaves", arena: true,
    inspo: "Wüste im Südwesten – unter einer Kraftfeld-Kuppel",
    desc: "Eine Waldarena unter einer gläsernen Kraftfeld-Kuppel: in der Mitte das goldene Füllhorn mit den Startplattformen, dazu ein See, Felsrücken und dichter Wald.",
    landmarks: ["Goldenes Füllhorn", "24 Startplattformen", "See", "Kraftfeld-Kuppel"]
  },
  {
    id: "arena75", short: "Arena 75", name: "Arena der 75. Spiele", industry: "Insel-Arena", lon: -90.5, lat: 26.5, r: 30, icon: "sand", arena: true,
    inspo: "Golf von Mexiko",
    desc: "Eine runde Insel wie ein Ziffernblatt: zwölf Sandwege teilen den Dschungel in Sektoren, in der Mitte liegt das Füllhorn in einer Lagune.",
    landmarks: ["Ziffernblatt-Insel mit 12 Sektoren", "Lagune mit Füllhorn", "Dschungel", "Blitzbaum"]
  }
].map((r, i) => ({ ...r, index: i, x: toX(r.lon), z: toZ(r.lat) }));

export const REGION = Object.fromEntries(REGIONS.map(r => [r.id, r]));

export const RAILS = [
  ...["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10", "d11", "d12", "d13"].map(d => ["capitol", d]),
  ["d12", "d13"], ["d11", "d12"], ["d6", "d10"], ["d4", "d7"], ["d3", "d9"]
];

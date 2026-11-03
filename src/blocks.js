// Block- und Texturdefinitionen für PanemCraft.
// Alle Texturen werden prozedural in textures.js erzeugt (keine Original-Minecraft-Dateien).

export const TILES = [
  "grass_top", "grass_side", "dirt", "stone", "cobble", "sand", "gravel", "snow", "snow_side",
  "oak_log", "oak_log_top", "oak_planks", "oak_leaves", "spruce_log", "spruce_log_top", "spruce_leaves",
  "spruce_planks", "quartz", "quartz_pillar", "quartz_pillar_top", "gold", "glass", "coal_ore", "iron",
  "bricks", "stone_bricks", "wool_white", "wool_red", "hay_side", "hay_top", "crops", "terracotta",
  "red_sand", "water", "rail_x", "rail_z", "diamond", "obsidian", "lamp", "coal_block",
  "c_gray", "c_cyan", "c_magenta", "c_yellow", "c_lime", "c_purple", "c_black", "c_white", "c_lightblue", "c_orange",
  "sandstone", "sandstone_top", "dark_planks", "mossy_cobble", "prismarine", "cactus", "cactus_top",
  "iron_bars", "wool_brown", "wool_blue", "apple_leaves"
];
export const TILE_INDEX = Object.fromEntries(TILES.map((t, i) => [t, i]));

// [key, Anzeigename, oben, seite, unten, flags]
const DEFS = [
  ["air", "Luft"],
  ["grass", "Grasblock", "grass_top", "grass_side", "dirt"],
  ["dirt", "Erde", "dirt"],
  ["stone", "Stein", "stone"],
  ["cobble", "Bruchstein", "cobble"],
  ["sand", "Sand", "sand"],
  ["gravel", "Kies", "gravel"],
  ["snowy_grass", "Verschneiter Rasen", "snow", "snow_side", "dirt"],
  ["oak_log", "Eichenstamm", "oak_log_top", "oak_log", "oak_log_top"],
  ["oak_planks", "Eichenholzbretter", "oak_planks"],
  ["oak_leaves", "Eichenlaub", "oak_leaves", null, null, "cutout"],
  ["spruce_log", "Fichtenstamm", "spruce_log_top", "spruce_log", "spruce_log_top"],
  ["spruce_leaves", "Fichtennadeln", "spruce_leaves", null, null, "cutout"],
  ["spruce_planks", "Fichtenholzbretter", "spruce_planks"],
  ["quartz", "Quarzblock", "quartz"],
  ["quartz_pillar", "Quarzsäule", "quartz_pillar_top", "quartz_pillar", "quartz_pillar_top"],
  ["gold", "Goldblock", "gold"],
  ["glass", "Glas", "glass", null, null, "cutout"],
  ["coal_ore", "Steinkohle", "coal_ore"],
  ["iron", "Eisenblock", "iron"],
  ["bricks", "Ziegelsteine", "bricks"],
  ["stone_bricks", "Steinziegel", "stone_bricks"],
  ["wool_white", "Weiße Wolle", "wool_white"],
  ["wool_red", "Rote Wolle", "wool_red"],
  ["hay", "Strohballen", "hay_top", "hay_side", "hay_top"],
  ["crops", "Weizenfeld", "crops", "dirt", "dirt"],
  ["terracotta", "Terrakotta", "terracotta"],
  ["red_sand", "Roter Sand", "red_sand"],
  ["water", "Wasser", "water", null, null, "fluid"],
  ["rail_x", "Gleis (Ost-West)", "rail_x", "gravel", "gravel"],
  ["rail_z", "Gleis (Nord-Süd)", "rail_z", "gravel", "gravel"],
  ["diamond", "Diamantblock", "diamond"],
  ["obsidian", "Obsidian", "obsidian"],
  ["lamp", "Leuchtblock", "lamp"],
  ["coal_block", "Kohleblock", "coal_block"],
  ["c_gray", "Grauer Beton", "c_gray"],
  ["c_cyan", "Türkiser Beton", "c_cyan"],
  ["c_magenta", "Magenta Beton", "c_magenta"],
  ["c_yellow", "Gelber Beton", "c_yellow"],
  ["c_lime", "Hellgrüner Beton", "c_lime"],
  ["c_purple", "Violetter Beton", "c_purple"],
  ["c_black", "Schwarzer Beton", "c_black"],
  ["c_white", "Weißer Beton", "c_white"],
  ["c_lightblue", "Hellblauer Beton", "c_lightblue"],
  ["c_orange", "Oranger Beton", "c_orange"],
  ["sandstone", "Sandstein", "sandstone_top", "sandstone", "sandstone_top"],
  ["dark_planks", "Schwarzeichenbretter", "dark_planks"],
  ["mossy_cobble", "Bemooster Bruchstein", "mossy_cobble"],
  ["prismarine", "Prismarin", "prismarine"],
  ["cactus", "Kaktus", "cactus_top", "cactus", "cactus_top"],
  ["iron_bars", "Eisengitter", "iron_bars", null, null, "cutout"],
  ["wool_brown", "Braune Wolle", "wool_brown"],
  ["wool_blue", "Blaue Wolle", "wool_blue"],
  ["apple_leaves", "Apfelbaumlaub", "apple_leaves", null, null, "cutout"],
  ["snow_block", "Schneeblock", "snow"]
];

export const B = {};
export const BLOCKS = DEFS.map((d, id) => {
  const [key, name, top, side, bottom, flag] = d;
  B[key.toUpperCase()] = id;
  const t = top ? TILE_INDEX[top] : 0;
  const s = side ? TILE_INDEX[side] : t;
  const b = bottom ? TILE_INDEX[bottom] : t;
  return { id, key, name, tiles: [t, s, b], cutout: flag === "cutout", fluid: flag === "fluid", air: id === 0 };
});

// Lookup-Tabellen für den Mesher und die Physik
export const OPAQUE = new Uint8Array(256);
export const SOLID = new Uint8Array(256);
export const CUTOUT = new Uint8Array(256);
BLOCKS.forEach(b => {
  OPAQUE[b.id] = !b.air && !b.cutout && !b.fluid ? 1 : 0;
  SOLID[b.id] = !b.air && !b.fluid ? 1 : 0;
  CUTOUT[b.id] = b.cutout ? 1 : 0;
});

// Blöcke, die im Inventar zum Bauen angeboten werden
export const PLACEABLE = BLOCKS.filter(b => !b.air && !b.fluid).map(b => b.id);
export const DEFAULT_HOTBAR = [B.GRASS, B.STONE, B.OAK_PLANKS, B.COBBLE, B.GLASS, B.QUARTZ, B.BRICKS, B.GOLD, B.LAMP];

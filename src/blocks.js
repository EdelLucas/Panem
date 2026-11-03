// Blockdefinitionen mit Minecraft-Java-IDs. Texturen werden in textures.js prozedural erzeugt.

export const TILES = [
  "grass_top", "grass_side", "dirt", "stone", "cobble", "sand", "gravel",
  "oak_log", "oak_log_top", "oak_planks", "oak_leaves", "dark_planks",
  "quartz", "quartz_pillar", "quartz_pillar_top", "smooth_quartz", "chiseled_quartz",
  "gold", "glass", "iron", "iron_bars", "bricks", "stone_bricks", "smooth_stone", "polished_andesite",
  "wool_red", "water", "rail_x", "rail_z", "sea_lantern", "prismarine",
  "c_white", "c_light_gray", "c_gray", "c_black", "c_cyan", "c_magenta", "c_yellow", "c_lime",
  "c_purple", "c_lightblue", "c_orange", "c_red", "c_blue", "c_pink", "c_green", "c_brown",
  "white_tulip", "poppy", "hay_side", "hay_top", "target_side", "target_top"
];
export const TILE_INDEX = Object.fromEntries(TILES.map((t, i) => [t, i]));

// [key, Anzeigename, Java-Blockzustand, oben, seite, unten, flag]
const DEFS = [
  ["air", "Luft", "minecraft:air"],
  ["grass", "Grasblock", "minecraft:grass_block", "grass_top", "grass_side", "dirt"],
  ["dirt", "Erde", "minecraft:dirt", "dirt"],
  ["stone", "Stein", "minecraft:stone", "stone"],
  ["cobble", "Bruchstein", "minecraft:cobblestone", "cobble"],
  ["sand", "Sand", "minecraft:sand", "sand"],
  ["gravel", "Kies", "minecraft:gravel", "gravel"],
  ["oak_log", "Eichenstamm", "minecraft:oak_log[axis=y]", "oak_log_top", "oak_log", "oak_log_top"],
  ["oak_planks", "Eichenholzbretter", "minecraft:oak_planks", "oak_planks"],
  ["oak_leaves", "Eichenlaub (Hecke)", "minecraft:oak_leaves[persistent=true]", "oak_leaves", null, null, "cutout"],
  ["dark_planks", "Schwarzeichenbretter", "minecraft:dark_oak_planks", "dark_planks"],
  ["quartz", "Quarzblock", "minecraft:quartz_block", "quartz"],
  ["quartz_pillar", "Quarzsäule", "minecraft:quartz_pillar[axis=y]", "quartz_pillar_top", "quartz_pillar", "quartz_pillar_top"],
  ["smooth_quartz", "Glatter Quarzblock", "minecraft:smooth_quartz", "smooth_quartz"],
  ["chiseled_quartz", "Gemeißelter Quarzblock", "minecraft:chiseled_quartz_block", "chiseled_quartz"],
  ["gold", "Goldblock", "minecraft:gold_block", "gold"],
  ["glass", "Glas", "minecraft:glass", "glass", null, null, "cutout"],
  ["iron", "Eisenblock", "minecraft:iron_block", "iron"],
  ["iron_bars", "Eisengitter", "minecraft:iron_bars", "iron_bars", null, null, "cutout"],
  ["bricks", "Ziegelsteine", "minecraft:bricks", "bricks"],
  ["stone_bricks", "Steinziegel", "minecraft:stone_bricks", "stone_bricks"],
  ["smooth_stone", "Glatter Stein", "minecraft:smooth_stone", "smooth_stone"],
  ["polished_andesite", "Polierter Andesit", "minecraft:polished_andesite", "polished_andesite"],
  ["red_wool", "Rote Wolle", "minecraft:red_wool", "wool_red"],
  ["water", "Wasser", "minecraft:water", "water", null, null, "fluid"],
  ["rail_x", "Schiene (Ost–West)", "minecraft:rail[shape=east_west]", "rail_x", "gravel", "gravel", "flat"],
  ["rail_z", "Schiene (Nord–Süd)", "minecraft:rail[shape=north_south]", "rail_z", "gravel", "gravel", "flat"],
  ["sea_lantern", "Seelaterne", "minecraft:sea_lantern", "sea_lantern", null, null, "light"],
  ["prismarine", "Prismarin", "minecraft:prismarine", "prismarine"],
  ["c_white", "Weißer Beton", "minecraft:white_concrete", "c_white"],
  ["c_light_gray", "Hellgrauer Beton", "minecraft:light_gray_concrete", "c_light_gray"],
  ["c_gray", "Grauer Beton", "minecraft:gray_concrete", "c_gray"],
  ["c_black", "Schwarzer Beton", "minecraft:black_concrete", "c_black"],
  ["c_cyan", "Türkiser Beton", "minecraft:cyan_concrete", "c_cyan"],
  ["c_magenta", "Magenta Beton", "minecraft:magenta_concrete", "c_magenta"],
  ["c_yellow", "Gelber Beton", "minecraft:yellow_concrete", "c_yellow"],
  ["c_lime", "Hellgrüner Beton", "minecraft:lime_concrete", "c_lime"],
  ["c_purple", "Violetter Beton", "minecraft:purple_concrete", "c_purple"],
  ["c_lightblue", "Hellblauer Beton", "minecraft:light_blue_concrete", "c_lightblue"],
  ["c_orange", "Oranger Beton", "minecraft:orange_concrete", "c_orange"],
  ["c_red", "Roter Beton", "minecraft:red_concrete", "c_red"],
  ["c_blue", "Blauer Beton", "minecraft:blue_concrete", "c_blue"],
  ["c_pink", "Rosa Beton", "minecraft:pink_concrete", "c_pink"],
  ["c_green", "Grüner Beton", "minecraft:green_concrete", "c_green"],
  ["c_brown", "Brauner Beton", "minecraft:brown_concrete", "c_brown"],
  ["white_tulip", "Weiße Tulpe (für Snows weiße Rosen)", "minecraft:white_tulip", "white_tulip", null, null, "cutout"],
  ["poppy", "Mohn", "minecraft:poppy", "poppy", null, null, "cutout"],
  ["hay", "Strohballen", "minecraft:hay_block[axis=y]", "hay_top", "hay_side", "hay_top"],
  ["target", "Zielblock", "minecraft:target", "target_top", "target_side", "target_top"]
];

export const B = {};
export const BLOCKS = DEFS.map((d, id) => {
  const [key, name, java, top, side, bottom, flag] = d;
  B[key.toUpperCase()] = id;
  const t = top ? TILE_INDEX[top] : 0;
  const s = side ? TILE_INDEX[side] : t;
  const b = bottom ? TILE_INDEX[bottom] : t;
  return { id, key, name, java, tiles: [t, s, b], cutout: flag === "cutout" || flag === "flat", fluid: flag === "fluid", light: flag === "light", air: id === 0 };
});
export const OPAQUE = new Uint8Array(256);
BLOCKS.forEach(b => { OPAQUE[b.id] = !b.air && !b.cutout && !b.fluid ? 1 : 0; });

// Prozedurale 16×16-Pixeltexturen im Blockstil. Liefert ein RGBA-Array für eine Textur-Array-Ebene je Kachel.
import { TILES } from "./blocks.js";
import { mulberry32 } from "./noise.js";

export const TILE = 16;

const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const sc = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

class Px {
  constructor() { this.p = new Uint8ClampedArray(TILE * TILE * 4); }
  set(x, y, c, a = 255) { const i = ((y & 15) * 16 + (x & 15)) * 4; this.p[i] = c[0]; this.p[i + 1] = c[1]; this.p[i + 2] = c[2]; this.p[i + 3] = a; }
  get(x, y) { const i = ((y & 15) * 16 + (x & 15)) * 4; return [this.p[i], this.p[i + 1], this.p[i + 2]]; }
  alpha(x, y, a) { this.p[((y & 15) * 16 + (x & 15)) * 4 + 3] = a; }
}

function noiseFill(t, r, base, amp) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.set(x, y, sc(base, 1 + (r() - 0.5) * amp));
}
function speckle(t, r, color, chance, amp = 0.15) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (r() < chance) t.set(x, y, sc(color, 1 + (r() - 0.5) * amp));
}
// Kachelbares Worley-Muster für Bruchstein, Kies usw.
function worley(t, r, n, cellColor, edgeColor, edge = 1.1, amp = 0.12) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([r() * 16, r() * 16, cellColor(i, r)]);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let d1 = 1e9, d2 = 1e9, c = null;
    for (const p of pts) for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) {
      const d = Math.hypot(x + 0.5 - p[0] - ox, y + 0.5 - p[1] - oy);
      if (d < d1) { d2 = d1; d1 = d; c = p[2]; } else if (d < d2) d2 = d;
    }
    t.set(x, y, d2 - d1 < edge ? sc(edgeColor, 1 + (r() - 0.5) * amp) : sc(c, 1 + (r() - 0.5) * amp));
  }
}
function boards(t, r, base) {
  for (let y = 0; y < 16; y++) {
    const row = y >> 2, seam = (row * 7 + 3) % 16;
    for (let x = 0; x < 16; x++) {
      let c = sc(base, 0.92 + r() * 0.14 + (row % 2 ? -0.04 : 0.03));
      if (y % 4 === 3) c = sc(base, 0.68);
      else if (x === seam) c = sc(base, 0.75);
      t.set(x, y, c);
    }
  }
}
function bevel(t, r, base, amp = 0.05) {
  noiseFill(t, r, base, amp);
  for (let i = 0; i < 16; i++) {
    t.set(i, 0, sc(base, 1.18)); t.set(0, i, sc(base, 1.12));
    t.set(i, 15, sc(base, 0.72)); t.set(15, i, sc(base, 0.78));
  }
  for (let i = 3; i < 7; i++) t.set(i, i - 1, sc(base, 1.25));
}
function logSide(t, r, a, b) {
  for (let x = 0; x < 16; x++) {
    const col = (x % 3 === 0 || r() < 0.25) ? b : a;
    for (let y = 0; y < 16; y++) t.set(x, y, sc(col, 0.9 + r() * 0.2));
  }
}
function logTop(t, r, bark, l1, l2) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    const c = d > 6.6 ? bark : (Math.floor(d) % 2 ? l1 : l2);
    t.set(x, y, sc(c, 0.93 + r() * 0.12));
  }
}
function leaves(t, r, base, holes, extra) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (r() < holes) t.set(x, y, [0, 0, 0], 0);
    else t.set(x, y, sc(base, 0.7 + r() * 0.45));
  }
  if (extra) extra();
}
function wool(t, r, base) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const f = ((x + y) % 4 === 0 ? 0.9 : 1) * (0.95 + r() * 0.1);
    t.set(x, y, sc(base, f));
  }
}
function bricksPattern(t, r, mortar, brick, bw, bh, off) {
  for (let y = 0; y < 16; y++) {
    const row = Math.floor(y / bh), o = row % 2 ? off : 0;
    for (let x = 0; x < 16; x++) {
      const bx = Math.floor((x + o) / bw);
      const isM = y % bh === bh - 1 || (x + o) % bw === bw - 1;
      const shade = 0.88 + ((bx * 31 + row * 17) % 7) / 30;
      t.set(x, y, isM ? sc(mortar, 0.95 + r() * 0.1) : sc(brick, shade + (r() - 0.5) * 0.08));
    }
  }
}

const STONE = hex("#7d7d7d"), DIRT = hex("#866043"), GRASS = hex("#62a03c");
const DRAW = {
  grass_top: (t, r) => { noiseFill(t, r, GRASS, 0.32); speckle(t, r, sc(GRASS, 0.75), 0.12); },
  dirt: (t, r) => { noiseFill(t, r, DIRT, 0.22); speckle(t, r, hex("#6a4a33"), 0.14); speckle(t, r, hex("#9c7756"), 0.07); },
  grass_side: (t, r) => {
    DRAW.dirt(t, r);
    for (let x = 0; x < 16; x++) {
      const g = 3 + (r() < 0.5 ? 1 : 0) + (r() < 0.3 ? 1 : 0);
      for (let y = 0; y < g; y++) t.set(x, y, sc(GRASS, 0.82 + r() * 0.3));
    }
  },
  stone: (t, r) => {
    noiseFill(t, r, STONE, 0.16);
    for (let i = 0; i < 9; i++) { const x = Math.floor(r() * 16), y = Math.floor(r() * 16), l = 2 + Math.floor(r() * 3); for (let k = 0; k < l; k++) t.set(x + k, y, sc(STONE, 0.8)); }
  },
  cobble: (t, r) => worley(t, r, 8, () => sc(STONE, 0.82 + r() * 0.35), hex("#4f4f4f"), 1.0),
  sand: (t, r) => { noiseFill(t, r, hex("#dbcf8e"), 0.12); speckle(t, r, hex("#c9b979"), 0.1); },
  gravel: (t, r) => {
    const cs = ["#857f7a", "#635e5b", "#9a8f86", "#73685f"].map(hex);
    worley(t, r, 12, () => cs[Math.floor(r() * cs.length)], hex("#4e4a48"), 0.7);
  },
  snow: (t, r) => noiseFill(t, r, hex("#f1f8fa"), 0.06),
  snow_side: (t, r) => {
    DRAW.dirt(t, r);
    for (let x = 0; x < 16; x++) { const g = 3 + (r() < 0.5 ? 1 : 0) + (r() < 0.25 ? 1 : 0); for (let y = 0; y < g; y++) t.set(x, y, sc(hex("#f1f8fa"), 0.95 + r() * 0.05)); }
  },
  oak_log: (t, r) => logSide(t, r, hex("#6b5232"), hex("#4f3c24")),
  oak_log_top: (t, r) => logTop(t, r, hex("#5c4529"), hex("#b18e57"), hex("#9a7a47")),
  oak_planks: (t, r) => boards(t, r, hex("#a2834f")),
  oak_leaves: (t, r) => leaves(t, r, hex("#3f7f2a"), 0.2),
  spruce_log: (t, r) => logSide(t, r, hex("#3d2c1a"), hex("#2c1f12")),
  spruce_log_top: (t, r) => logTop(t, r, hex("#3d2c1a"), hex("#7a5a36"), hex("#664a2c")),
  spruce_leaves: (t, r) => leaves(t, r, hex("#2f5a35"), 0.16),
  spruce_planks: (t, r) => boards(t, r, hex("#735534")),
  quartz: (t, r) => noiseFill(t, r, hex("#ece6df"), 0.04),
  quartz_pillar: (t, r) => { noiseFill(t, r, hex("#ece6df"), 0.04); for (let y = 0; y < 16; y++) { t.set(1, y, hex("#cdc6bc")); t.set(14, y, hex("#cdc6bc")); t.set(6, y, hex("#ddd6cd")); } },
  quartz_pillar_top: (t, r) => { noiseFill(t, r, hex("#ece6df"), 0.04); for (let i = 2; i < 14; i++) { t.set(i, 2, hex("#cdc6bc")); t.set(i, 13, hex("#cdc6bc")); t.set(2, i, hex("#cdc6bc")); t.set(13, i, hex("#cdc6bc")); } },
  gold: (t, r) => bevel(t, r, hex("#f5cf3f")),
  glass: (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      t.set(x, y, edge ? hex("#d7ecf1") : [255, 255, 255], edge ? 255 : 0);
    }
    for (let i = 0; i < 3; i++) { t.set(3 + i, 6 - i, hex("#f4fbfd")); t.set(4 + i, 6 - i, hex("#f4fbfd")); }
  },
  coal_ore: (t, r) => {
    DRAW.stone(t, r);
    for (let c = 0; c < 4; c++) { const cx = 2 + Math.floor(r() * 12), cy = 2 + Math.floor(r() * 12); for (let k = 0; k < 5; k++) t.set(cx + Math.floor(r() * 3) - 1, cy + Math.floor(r() * 3) - 1, sc(hex("#262626"), 0.8 + r() * 0.4)); }
  },
  iron: (t, r) => { bevel(t, r, hex("#dcdcdc"), 0.04); for (let i = 1; i < 15; i++) { t.set(i, 5, hex("#c4c4c4")); t.set(i, 10, hex("#c4c4c4")); } },
  bricks: (t, r) => bricksPattern(t, r, hex("#a59d94"), hex("#985040"), 8, 4, 4),
  stone_bricks: (t, r) => {
    bricksPattern(t, r, hex("#555555"), hex("#7c7c7c"), 16, 8, 8);
    for (let y = 0; y < 16; y++) if (y % 8 === 0) for (let x = 0; x < 16; x++) if ((x + (y ? 8 : 0)) % 16 !== 15) t.set(x, y, hex("#8e8e8e"));
  },
  wool_white: (t, r) => wool(t, r, hex("#e9ecec")),
  wool_red: (t, r) => wool(t, r, hex("#a12722")),
  wool_brown: (t, r) => wool(t, r, hex("#724728")),
  wool_blue: (t, r) => wool(t, r, hex("#35399d")),
  hay_side: (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.set(x, y, sc(hex("#c4a52d"), (x % 2 ? 0.92 : 1.05) * (0.9 + r() * 0.18)));
    for (let x = 0; x < 16; x++) { [2, 3, 12, 13].forEach(y => t.set(x, y, sc(hex("#8a4b22"), 0.9 + r() * 0.2))); }
  },
  hay_top: (t, r) => { noiseFill(t, r, hex("#c4a52d"), 0.3); speckle(t, r, hex("#9c7f1d"), 0.15); },
  crops: (t, r) => {
    noiseFill(t, r, hex("#5a3c26"), 0.2);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (x % 3 !== 0 && r() < 0.75) t.set(x, y, sc(r() < 0.6 ? hex("#c8b04a") : hex("#8fa83a"), 0.85 + r() * 0.3));
  },
  terracotta: (t, r) => noiseFill(t, r, hex("#a1532a"), 0.07),
  red_sand: (t, r) => { noiseFill(t, r, hex("#b9631f"), 0.12); speckle(t, r, hex("#9c5019"), 0.1); },
  water: (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const w = Math.sin((x * 0.9 + y * 0.45)) + Math.sin(y * 1.3 - x * 0.3);
      t.set(x, y, sc(mix(hex("#2f64c8"), hex("#4f8de6"), w > 1.1 ? 1 : w > 0.4 ? 0.45 : 0), 0.95 + r() * 0.08));
    }
  },
  rail_x: (t, r) => {
    DRAW.gravel(t, r);
    for (let x = 0; x < 16; x++) for (let y = 2; y < 14; y++) if (x % 4 === 1 || x % 4 === 2) t.set(x, y, sc(hex("#6e4f2d"), 0.9 + r() * 0.2));
    for (let x = 0; x < 16; x++) { t.set(x, 3, hex("#bdbdbd")); t.set(x, 4, hex("#7a7a7a")); t.set(x, 11, hex("#bdbdbd")); t.set(x, 12, hex("#7a7a7a")); }
  },
  rail_z: (t, r) => { DRAW.rail_x(t, r); const c = new Px(); c.p.set(t.p); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.set(x, y, c.get(y, x)); },
  diamond: (t, r) => bevel(t, r, hex("#62ded6")),
  obsidian: (t, r) => { noiseFill(t, r, hex("#15111e"), 0.3); speckle(t, r, hex("#3e2a63"), 0.12, 0.3); },
  lamp: (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const edge = x % 8 === 0 || y % 8 === 0;
      t.set(x, y, edge ? sc(hex("#b77a2d"), 0.9 + r() * 0.2) : sc(hex("#ffe08a"), 0.9 + r() * 0.15));
    }
  },
  coal_block: (t, r) => noiseFill(t, r, hex("#1c1c1c"), 0.35),
  c_gray: (t, r) => noiseFill(t, r, hex("#3e4247"), 0.05),
  c_cyan: (t, r) => noiseFill(t, r, hex("#157788"), 0.05),
  c_magenta: (t, r) => noiseFill(t, r, hex("#a9309f"), 0.05),
  c_yellow: (t, r) => noiseFill(t, r, hex("#f0af15"), 0.05),
  c_lime: (t, r) => noiseFill(t, r, hex("#5ea918"), 0.05),
  c_purple: (t, r) => noiseFill(t, r, hex("#64209c"), 0.05),
  c_black: (t, r) => noiseFill(t, r, hex("#0b0d12"), 0.12),
  c_white: (t, r) => noiseFill(t, r, hex("#cfd5d6"), 0.04),
  c_lightblue: (t, r) => noiseFill(t, r, hex("#2489c7"), 0.05),
  c_orange: (t, r) => noiseFill(t, r, hex("#e06100"), 0.05),
  sandstone: (t, r) => {
    noiseFill(t, r, hex("#d8cb99"), 0.06);
    for (let x = 0; x < 16; x++) { t.set(x, 0, hex("#e6dbae")); t.set(x, 1, hex("#e2d6a6")); t.set(x, 4, hex("#bfb07e")); t.set(x, 12, hex("#c6b787")); t.set(x, 15, hex("#b6a676")); }
  },
  sandstone_top: (t, r) => noiseFill(t, r, hex("#ddd0a1"), 0.05),
  dark_planks: (t, r) => boards(t, r, hex("#4a3018")),
  mossy_cobble: (t, r) => { DRAW.cobble(t, r); speckle(t, r, hex("#5e7d3a"), 0.3, 0.3); },
  prismarine: (t, r) => worley(t, r, 6, () => sc(hex("#63a194"), 0.85 + r() * 0.3), hex("#3f7b75"), 0.8),
  cactus: (t, r) => {
    noiseFill(t, r, hex("#558f33"), 0.1);
    for (let y = 0; y < 16; y++) [0, 5, 10, 15].forEach(x => t.set(x, y, hex("#2f6b21")));
    for (let i = 0; i < 6; i++) t.set(Math.floor(r() * 16), Math.floor(r() * 16), hex("#d9e6b0"));
  },
  cactus_top: (t, r) => { noiseFill(t, r, hex("#6aa13e"), 0.08); for (let i = 3; i < 13; i++) { t.set(i, 3, hex("#2f6b21")); t.set(i, 12, hex("#2f6b21")); t.set(3, i, hex("#2f6b21")); t.set(12, i, hex("#2f6b21")); } },
  iron_bars: (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.set(x, y, [0, 0, 0], 0);
    for (let y = 0; y < 16; y++) [1, 5, 9, 13].forEach(x => { t.set(x, y, hex("#a8a8a8")); t.set(x + 1, y, hex("#6f6f6f")); });
    for (let x = 0; x < 16; x++) { t.set(x, 0, hex("#9a9a9a")); t.set(x, 8, hex("#8a8a8a")); }
  },
  apple_leaves: (t, r) => leaves(t, r, hex("#3f7f2a"), 0.18, () => {
    for (let i = 0; i < 4; i++) { const x = 1 + Math.floor(r() * 13), y = 1 + Math.floor(r() * 13); t.set(x, y, hex("#c8221d")); t.set(x + 1, y, hex("#d93a2b")); t.set(x, y + 1, hex("#9e1915")); t.set(x + 1, y + 1, hex("#c8221d")); }
  })
};

// Erzeugt alle Kacheln. `rows` enthält die Kacheln in Bildrichtung (Zeile 0 = oben) für Icons/CSS,
// `data` ist für ein Textur-Array gepackt (Zeile 0 = unten, damit v nach oben zeigt).
export function generateTextures() {
  const n = TILES.length;
  const data = new Uint8Array(n * TILE * TILE * 4);
  const rows = [];
  const avg = [];
  TILES.forEach((name, layer) => {
    const t = new Px();
    const r = mulberry32(1000 + layer * 7919);
    (DRAW[name] || ((tt) => noiseFill(tt, r, [255, 0, 255], 0)))(t, r);
    rows.push(t.p);
    let sr = 0, sg = 0, sb = 0, cnt = 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const src = (y * 16 + x) * 4, dst = layer * 1024 + ((15 - y) * 16 + x) * 4;
      for (let k = 0; k < 4; k++) data[dst + k] = t.p[src + k];
      if (t.p[src + 3] > 0) { sr += t.p[src]; sg += t.p[src + 1]; sb += t.p[src + 2]; cnt++; }
    }
    avg.push(cnt ? [sr / cnt, sg / cnt, sb / cnt] : [200, 220, 230]);
  });
  return { data, rows, avg, count: n };
}

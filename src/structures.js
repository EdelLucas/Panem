// Bauwerke von Panem: Kapitol, 13 Distrikte, zwei Arenen und das Bahnnetz – alles aus Blöcken.
import { B, OPAQUE } from "./blocks.js";
import { mulberry32, hash2, noise2 } from "./noise.js";
import { W, D, H, SEA, REGIONS, REGION, RAILS } from "./data.js";
import { oakTree, spruceTree } from "./terrain.js";

let w; // aktuelle Welt
const put = (x, y, z, id) => w.put(x, y, z, id);
const get = (x, y, z) => w.get(x, y, z);
const fill = (x0, y0, z0, x1, y1, z1, id) => w.fill(x0, y0, z0, x1, y1, z1, id);
const hAt = (x, z) => (x < 0 || z < 0 || x >= W || z >= D) ? SEA : w.height[x + z * W];

function walls(x0, y0, z0, x1, y1, z1, id) {
  fill(x0, y0, z0, x1, y1, z0, id); fill(x0, y0, z1, x1, y1, z1, id);
  fill(x0, y0, z0, x0, y1, z1, id); fill(x1, y0, z0, x1, y1, z1, id);
}
function cyl(cx, cz, r, y0, y1, id, hollow = false) {
  for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) {
    const d = Math.hypot(dx, dz);
    if (d > r + 0.35) continue;
    if (hollow && d < r - 0.75) continue;
    fill(cx + dx, y0, cz + dz, cx + dx, y1, cz + dz, id);
  }
}
function disc(cx, cz, r, y, id) { cyl(cx, cz, r, y, y, id); }
function line3(x0, y0, z0, x1, y1, z1, id) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1);
  for (let i = 0; i <= n; i++) put(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), Math.round(z0 + (z1 - z0) * i / n), id);
}
function windows(x0, y0, z0, x1, y1, z1, id, step = 2, rowStep = 2) {
  for (let y = y0; y <= y1; y += rowStep) {
    for (let x = x0 + 1; x < x1; x += step) { put(x, y, z0, id); put(x, y, z1, id); }
    for (let z = z0 + 1; z < z1; z += step) { put(x0, y, z, id); put(x1, y, z, id); }
  }
}
// Einfaches Haus mit Satteldach. door: "n" | "s" | "e" | "w"
function house(x0, z0, wd, dp, y, h, o = {}) {
  const wall = o.wall ?? B.OAK_PLANKS, roof = o.roof ?? B.DARK_PLANKS, floor = o.floor ?? B.OAK_PLANKS, win = o.win ?? B.GLASS;
  const x1 = x0 + wd - 1, z1 = z0 + dp - 1;
  fill(x0, y, z0, x1, y, z1, floor);
  fill(x0, y + 1, z0, x1, y + h + 8, z1, 0);
  walls(x0, y + 1, z0, x1, y + h, z1, wall);
  if (o.corner) { [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].forEach(([cx, cz]) => fill(cx, y + 1, cz, cx, y + h, cz, o.corner)); }
  if (win) for (let yy = y + 2; yy <= y + h - 1; yy += 3) windows(x0, yy, z0, x1, yy, z1, win, 2, 3);
  const door = o.door ?? "s", mx = Math.floor((x0 + x1) / 2), mz = Math.floor((z0 + z1) / 2);
  if (door === "s") fill(mx, y + 1, z1, mx, y + 2, z1, 0);
  if (door === "n") fill(mx, y + 1, z0, mx, y + 2, z0, 0);
  if (door === "e") fill(x1, y + 1, mz, x1, y + 2, mz, 0);
  if (door === "w") fill(x0, y + 1, mz, x0, y + 2, mz, 0);
  if (o.flat) { fill(x0, y + h + 1, z0, x1, y + h + 1, z1, roof); if (o.trim) walls(x0, y + h + 2, z0, x1, y + h + 2, z1, o.trim); return; }
  // Satteldach entlang der längeren Achse
  const alongX = wd >= dp;
  const span = alongX ? dp : wd;
  for (let k = 0; k <= Math.ceil(span / 2); k++) {
    const yy = y + h + 1 + k;
    if (alongX) { if (z0 - 1 + k > z1 + 1 - k) break; fill(x0 - 1, yy, z0 - 1 + k, x1 + 1, yy, z1 + 1 - k, roof); }
    else { if (x0 - 1 + k > x1 + 1 - k) break; fill(x0 - 1 + k, yy, z0 - 1, x1 + 1 - k, yy, z1 + 1, roof); }
  }
}
function lampPost(x, y, z, post = B.DARK_PLANKS, h = 3) { fill(x, y + 1, z, x, y + h, z, post); put(x, y + h + 1, z, B.LAMP); }

// Gelände für eine Region einebnen und als reserviert markieren
function prepareSite(reg, level, opts = {}) {
  const { x: cx, z: cz, r } = reg;
  const blend = opts.blend ?? 12, top = opts.top ?? B.GRASS, under = opts.under ?? B.DIRT;
  const R = r + blend;
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const x = cx + dx, z = cz + dz;
    if (x < 1 || z < 1 || x >= W - 1 || z >= D - 1) continue;
    const d = Math.hypot(dx, dz) + 2.5 * noise2(x / 7, z / 7, 99);
    if (d > R) continue;
    const i = x + z * W, h0 = w.height[i];
    let target = level;
    if (d > r) {
      const t = (d - r) / blend, s = t * t * (3 - 2 * t);
      target = Math.round(level + (h0 - level) * s);
    }
    if (opts.keepWater && h0 < SEA && d > r) continue;
    // Säule neu aufbauen
    fill(x, target + 1, z, x, Math.min(H - 1, Math.max(h0, target) + 24), z, 0);
    if (target > h0) fill(x, h0, z, x, target - 1, z, target - h0 > 3 ? B.STONE : under);
    if (target >= SEA) { fill(x, target - 3, z, x, target - 1, z, under); put(x, target, z, d <= r ? top : (target <= SEA + 1 ? B.SAND : top)); }
    else { put(x, target, z, B.SAND); fill(x, target + 1, z, x, SEA, z, B.WATER); }
    w.height[i] = target;
    if (d <= r + blend * 0.6) w.reserved[i] = reg.index + 1;
  }
}
function averageHeight(cx, cz, r) {
  let s = 0, n = 0;
  for (let dz = -r; dz <= r; dz += 2) for (let dx = -r; dx <= r; dx += 2) {
    if (dx * dx + dz * dz > r * r) continue;
    const x = cx + dx, z = cz + dz; if (x < 0 || z < 0 || x >= W || z >= D) continue;
    s += Math.max(SEA + 2, w.height[x + z * W]); n++;
  }
  return Math.round(s / Math.max(1, n));
}
function groundTop(x, z) { // oberster undurchsichtiger Block (für Masten, Pfeiler)
  for (let y = H - 2; y > 0; y--) { const b = get(x, y, z); if (OPAQUE[b] && b !== B.OAK_LOG && b !== B.SPRUCE_LOG) return y; if (b === B.WATER) return y; }
  return 0;
}

// --- Kapitol ----------------------------------------------------------------
function buildCapitol(reg, L, r) {
  const { x: cx, z: cz } = reg, R = reg.r;
  const mod = (a, n) => ((a % n) + n) % n;
  // Straßenraster, Alleen und Gehwege
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const d = Math.hypot(dx, dz); if (d > R) continue;
    const x = cx + dx, z = cz + dz;
    const avenue = Math.abs(dx) <= 2 || Math.abs(dz) <= 2;
    const street = mod(dx + 1, 12) < 3 || mod(dz + 1, 12) < 3;
    if (avenue) put(x, L, z, (Math.abs(dx) === 2 || Math.abs(dz) === 2) ? B.GOLD : B.QUARTZ);
    else if (street) put(x, L, z, B.C_GRAY);
    else if (mod(dx + 1, 12) === 3 || mod(dx + 1, 12) === 11 || mod(dz + 1, 12) === 3 || mod(dz + 1, 12) === 11) put(x, L, z, B.STONE_BRICKS);
  }
  // Stadtkreis
  for (let dz = -14; dz <= 14; dz++) for (let dx = -14; dx <= 14; dx++) {
    const d = Math.hypot(dx, dz); if (d > 14) continue;
    put(cx + dx, L, cz + dz, Math.abs(d - 11) < 0.6 ? B.GOLD : ((dx + dz) & 1 ? B.QUARTZ : B.C_WHITE));
  }
  cyl(cx, cz, 5, L + 1, L + 1, B.QUARTZ); cyl(cx, cz, 4.2, L + 1, L + 1, B.WATER);
  fill(cx, L + 1, cz, cx, L + 4, cz, B.PRISMARINE); put(cx, L + 5, cz, B.LAMP);
  for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2; lampPost(cx + Math.round(Math.cos(ang) * 13), L, cz + Math.round(Math.sin(ang) * 13), B.QUARTZ_PILLAR, 3); }
  // Präsidentenpalast im Norden
  const px0 = cx - 13, px1 = cx + 13, pz0 = cz - 30, pz1 = cz - 17;
  fill(px0 - 2, L, pz0 - 2, px1 + 2, L, pz1 + 3, B.QUARTZ);
  fill(px0, L + 1, pz0, px1, L + 22, pz1, 0);
  walls(px0, L + 1, pz0, px1, L + 11, pz1, B.QUARTZ);
  for (let y = L + 2; y <= L + 10; y += 3) for (let x = px0 + 1; x < px1; x++) if ((x - px0) % 3) { put(x, y, pz1, B.GLASS); put(x, y, pz0, B.GLASS); }
  for (let y = L + 2; y <= L + 10; y += 3) for (let z = pz0 + 1; z < pz1; z++) if ((z - pz0) % 3) { put(px0, y, z, B.GLASS); put(px1, y, z, B.GLASS); }
  fill(px0, L + 12, pz0, px1, L + 12, pz1, B.QUARTZ); walls(px0, L + 13, pz0, px1, L + 13, pz1, B.GOLD);
  fill(px0, L + 6, pz0, px1, L + 6, pz1, B.QUARTZ);
  for (let x = px0; x <= px1; x += 2) fill(x, L + 1, pz1 + 2, x, L + 11, pz1 + 2, B.QUARTZ_PILLAR);  // Säulengang
  fill(px0, L + 12, pz1 + 1, px1, L + 12, pz1 + 3, B.QUARTZ);
  for (let k = 0; k < 5; k++) fill(cx - 9 + k * 2, L + 13 + k, pz1 + 2, cx + 9 - k * 2, L + 13 + k, pz1 + 2, k === 4 ? B.GOLD : B.QUARTZ); // Giebel
  for (let dy = 0; dy <= 6; dy++) cyl(cx, Math.round((pz0 + pz1) / 2), Math.sqrt(Math.max(0, 36 - dy * dy)), L + 13 + dy, L + 13 + dy, B.GOLD, dy < 5);
  fill(cx - 1, L + 1, pz1, cx + 1, L + 4, pz1, 0);
  [px0 + 4, px1 - 4].forEach(x => fill(x, L + 4, pz1 + 3, x, L + 10, pz1 + 3, B.WOOL_RED));
  // Rosengarten
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
    const gx = cx + sx * (6 + i * 2);
    for (let z = pz1 + 5; z <= cz - 16; z++) { put(gx, L + 1, z, B.OAK_LEAVES); if ((z + i) % 2 === 0) put(gx, L + 2, z, B.WOOL_RED); }
  }
  // Trainingscenter (höchster Turm)
  const tx = cx + 18, tz = cz - 8;
  fill(tx - 4, L + 1, tz - 4, tx + 4, L + 54, tz + 4, B.GLASS);
  fill(tx - 3, L + 1, tz - 3, tx + 3, L + 53, tz + 3, 0);
  [[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach(([a, b]) => fill(tx + a, L + 1, tz + b, tx + a, L + 56, tz + b, B.IRON));
  for (let y = L + 5; y <= L + 54; y += 5) walls(tx - 4, y, tz - 4, tx + 4, y, tz + 4, B.IRON);
  fill(tx - 4, L + 50, tz - 4, tx + 4, L + 54, tz + 4, B.GOLD); fill(tx - 3, L + 51, tz - 4, tx + 3, L + 53, tz - 4, B.GLASS);
  fill(tx, L + 55, tz, tx, L + 62, tz, B.IRON); put(tx, L + 63, tz, B.LAMP);
  fill(tx, L + 1, tz + 4, tx, L + 3, tz + 4, 0);
  // Hauptbahnhof im Osten
  const sx0 = cx + 25, sx1 = cx + 39, sz0 = cz - 9, sz1 = cz + 9;
  fill(sx0, L, sz0, sx1, L, sz1, B.STONE_BRICKS);
  for (let z = sz0; z <= sz1; z += 3) for (let x = sx0; x <= sx1; x += 14) fill(x, L + 1, z, x, L + 8, z, B.IRON);
  for (let k = 0; k <= 4; k++) fill(sx0, L + 9 + k, sz0 + k * 2, sx1, L + 9 + k, sz1 - k * 2, k === 4 ? B.IRON : B.GLASS);
  for (let z = sz0 + 2; z <= sz1 - 2; z += 4) fill(sx0, L, z, sx1, L, z, B.RAIL_X);
  fill(sx0 - 1, L + 7, cz - 2, sx0 - 1, L + 8, cz + 2, B.C_BLACK);
  // Wolkenkratzer auf den Baufeldern
  const schemes = [
    [B.QUARTZ, B.GLASS, B.GOLD], [B.C_WHITE, B.C_CYAN, B.GLASS], [B.C_MAGENTA, B.GLASS, B.C_WHITE], [B.GLASS, B.IRON, B.C_LIGHTBLUE],
    [B.C_YELLOW, B.C_WHITE, B.GLASS], [B.C_PURPLE, B.GLASS, B.GOLD], [B.QUARTZ, B.C_LIME, B.GLASS], [B.C_ORANGE, B.QUARTZ, B.GLASS]
  ];
  for (let i = -4; i <= 3; i++) for (let j = -4; j <= 3; j++) {
    const lx = cx + 6 + i * 12, lz = cz + 6 + j * 12;
    const dist = Math.hypot(lx - cx, lz - cz);
    if (dist > R - 6) continue;
    if (dist < 17) continue;
    if (lz < cz - 13 && lz > cz - 36 && Math.abs(lx - cx) < 20) continue;      // Palast
    if (Math.abs(lx - tx) < 9 && Math.abs(lz - tz) < 9) continue;              // Trainingscenter
    if (lx > cx + 20 && Math.abs(lz - cz) < 16) continue;                      // Bahnhof
    const s = schemes[Math.floor(r() * schemes.length)];
    const hh = Math.round(10 + r() * 22 + Math.max(0, 30 - dist) * 0.9);
    const type = r();
    if (type < 0.3) { // runder Turm mit Goldkuppel
      cyl(lx, lz, 3.6, L + 1, L + hh, s[0], true);
      for (let y = L + 2; y < L + hh; y += 2) cyl(lx, lz, 3.6, y, y, s[1], true);
      cyl(lx, lz, 2.6, L + hh + 1, L + hh + 1, s[2]); cyl(lx, lz, 1.5, L + hh + 2, L + hh + 2, s[2]); put(lx, L + hh + 3, lz, B.LAMP);
    } else if (type < 0.65) { // gestufter Turm
      let x0 = lx - 3, x1 = lx + 3, z0 = lz - 3, z1 = lz + 3, y = L + 1;
      const steps = [Math.round(hh * 0.5), Math.round(hh * 0.3), Math.round(hh * 0.2)];
      steps.forEach((st, k) => {
        fill(x0, y, z0, x1, y + st - 1, z1, s[k % 2]);
        for (let yy = y + 1; yy < y + st; yy += 2) walls(x0, yy, z0, x1, yy, z1, s[1]);
        y += st; x0++; x1--; z0++; z1--;
        if (x0 >= x1) return;
      });
      put(lx, y, lz, s[2]); fill(lx, y + 1, lz, lx, y + 4, lz, B.IRON); put(lx, y + 5, lz, B.LAMP);
    } else { // Glaskubus mit farbigen Bändern
      fill(lx - 3, L + 1, lz - 3, lx + 3, L + hh, lz + 3, s[1] === B.GLASS ? B.GLASS : s[0]);
      for (let y = L + 1; y <= L + hh; y += 3) walls(lx - 3, y, lz - 3, lx + 3, y, lz + 3, s[1]);
      [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(([a, b]) => fill(lx + a, L + 1, lz + b, lx + a, L + hh + 1, lz + b, s[2]));
      fill(lx - 2, L + hh + 1, lz - 2, lx + 2, L + hh + 1, lz + 2, s[2]);
    }
  }
  // Laternen an den Alleen
  for (let k = 16; k <= R - 2; k += 6) for (const [a, b] of [[k, 3], [-k, 3], [k, -3], [-k, -3]]) { lampPost(cx + a, L, cz + b, B.QUARTZ_PILLAR, 3); lampPost(cx + b, L, cz + a, B.QUARTZ_PILLAR, 3); }
  // Ein Hochgeschwindigkeitszug im Bahnhof
  for (let x = sx0 + 1; x <= sx1 - 1; x++) { put(x, L + 1, cz - 3, x === sx0 + 1 ? B.C_BLACK : B.QUARTZ); put(x, L + 2, cz - 3, x % 3 ? B.C_BLACK : B.QUARTZ); }
}

// --- Distrikte --------------------------------------------------------------
function buildD1(reg, L, r) {
  const { x: cx, z: cz } = reg;
  disc(cx, cz, 7, L, B.QUARTZ); disc(cx, cz, 2.5, L + 1, B.GOLD); cyl(cx, cz, 1.6, L + 1, L + 1, B.WATER); fill(cx, L + 1, cz, cx, L + 3, cz, B.GOLD); put(cx, L + 4, cz, B.DIAMOND);
  // Justizgebäude
  house(cx - 9, cz - 20, 19, 10, L, 8, { wall: B.QUARTZ, roof: B.QUARTZ, floor: B.QUARTZ, flat: true, trim: B.GOLD, door: "s" });
  for (let x = cx - 9; x <= cx + 9; x += 2) fill(x, L + 1, cz - 9, x, L + 8, cz - 9, B.QUARTZ_PILLAR);
  fill(cx - 9, L + 9, cz - 11, cx + 9, L + 9, cz - 9, B.QUARTZ);
  for (let k = 0; k < 4; k++) fill(cx - 7 + k * 2, L + 10 + k, cz - 9, cx + 7 - k * 2, L + 10 + k, cz - 9, B.GOLD);
  // Villen im Kreis
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2 + 0.4, vx = cx + Math.round(Math.cos(a) * 17) - 4, vz = cz + Math.round(Math.sin(a) * 17) - 4;
    if (vz < cz - 12 && Math.abs(vx + 4 - cx) < 12) continue;
    house(vx, vz, 9, 8, L, 5, { wall: B.QUARTZ, roof: B.GOLD, floor: B.QUARTZ, corner: B.QUARTZ_PILLAR });
    fill(vx + 1, L, vz + 9, vx + 6, L, vz + 11, B.PRISMARINE); fill(vx + 2, L, vz + 10, vx + 5, L, vz + 10, B.WATER);
    for (let z = vz - 1; z <= vz + 9; z++) put(vx + 10, L + 1, z, B.OAK_LEAVES);
  }
  // Edelsteinatelier
  const gx = cx + 8, gz = cz + 4;
  house(gx, gz, 9, 7, L, 5, { wall: B.GLASS, roof: B.QUARTZ, floor: B.QUARTZ, flat: true, corner: B.GOLD, win: null });
  for (let i = 0; i < 3; i++) { put(gx + 2 + i * 2, L + 1, gz + 3, [B.DIAMOND, B.C_LIME, B.WOOL_RED][i]); put(gx + 2 + i * 2, L + 2, gz + 3, B.GLASS); }
}

function buildD2(reg, L, r) {
  const { x: cx, z: cz } = reg;
  // Die Nuss – Berg mit Festung
  const nx = cx - 10, nz = cz - 8;
  for (let dz = -18; dz <= 18; dz++) for (let dx = -18; dx <= 18; dx++) {
    const d = Math.hypot(dx, dz); if (d > 18) continue;
    const hh = Math.round(30 * Math.pow(1 - d / 18, 1.2) + 2 * noise2((nx + dx) / 4, (nz + dz) / 4, 5));
    if (hh > 0) { fill(nx + dx, L + 1, nz + dz, nx + dx, L + hh, nz + dz, B.STONE); put(nx + dx, L + hh, nz + dz, hh > 22 ? B.SNOW_BLOCK : (hh > 8 ? B.STONE : B.GRASS)); }
  }
  for (let k = -1; k <= 1; k++) { // Tunneleingänge
    const ex = nx + k * 7, ez = nz + Math.round(18 * 0.55);
    fill(ex - 1, L + 1, ez - 12, ex + 1, L + 4, ez + 4, 0);
    walls(ex - 2, L + 1, ez + 3, ex + 2, L + 5, ez + 3, B.OBSIDIAN); fill(ex - 1, L + 1, ez + 3, ex + 1, L + 4, ez + 3, 0);
    put(ex - 2, L + 6, ez + 3, B.LAMP); put(ex + 2, L + 6, ez + 3, B.LAMP);
  }
  fill(nx - 8, L + 1, nz - 6, nx + 8, L + 7, nz + 4, 0); // Halle innen
  for (let x = nx - 8; x <= nx + 8; x += 4) put(x, L + 7, nz - 1, B.LAMP);
  fill(nx - 8, L, nz - 6, nx + 8, L, nz + 4, B.C_GRAY);
  for (let x = nx - 4; x <= nx + 4; x += 2) fill(x, L + 14, nz + 9, x, L + 15, nz + 9, B.GLASS); // Fensterband
  // Terrassen-Steinbruch
  const qx = cx + 12, qz = cz + 10;
  for (let k = 0; k < 6; k++) {
    const rad = 11 - k * 1.7;
    for (let dz = -12; dz <= 12; dz++) for (let dx = -12; dx <= 12; dx++) {
      if (Math.hypot(dx, dz * 1.2) > rad) continue;
      fill(qx + dx, L - k * 2 - 1, qz + dz, qx + dx, L + 1, qz + dz, 0);
      put(qx + dx, L - k * 2 - 2, qz + dz, B.STONE);
    }
  }
  for (let i = 0; i < 6; i++) { const bx = qx - 6 + i * 2; put(bx, L - 7, qz + (i % 3), B.COBBLE); put(bx, L - 6, qz + (i % 3), B.COBBLE); }
  line3(qx - 10, L + 1, qz - 9, qx - 10, L + 12, qz - 9, B.IRON); line3(qx - 10, L + 12, qz - 9, qx, L + 12, qz, B.IRON); fill(qx, L + 6, qz, qx, L + 11, qz, B.IRON_BARS);
  // Kasernen und Exerzierplatz
  for (let k = 0; k < 3; k++) house(cx + 4, cz - 22 + k * 8, 20, 6, L, 4, { wall: B.C_WHITE, roof: B.C_GRAY, floor: B.STONE_BRICKS, flat: true, trim: B.C_GRAY, door: "w" });
  fill(cx - 4, L, cz + 6, cx + 1, L, cz + 22, B.GRAVEL);
  for (let i = 0; i < 4; i++) { const tz = cz + 8 + i * 4; put(cx - 3, L + 1, tz, B.HAY); put(cx - 3, L + 2, tz, B.WOOL_RED); }
  for (let k = 0; k < 5; k++) house(cx - 26 + k * 6, cz + 14, 5, 5, L, 3, { wall: B.STONE_BRICKS, roof: B.COBBLE, floor: B.COBBLE, door: "n" });
}

function buildD3(reg, L, r) {
  const { x: cx, z: cz } = reg;
  fill(cx - 22, L, cz - 2, cx + 22, L, cz + 2, B.C_GRAY); fill(cx - 2, L, cz - 22, cx + 2, L, cz + 22, B.C_GRAY);
  const halls = [[-21, -20], [5, -20], [-21, 6], [5, 6]];
  halls.forEach(([ox, oz], k) => {
    const x0 = cx + ox, z0 = cz + oz;
    house(x0, z0, 16, 12, L, 7, { wall: B.IRON, roof: B.GLASS, floor: B.C_GRAY, flat: true, trim: B.IRON, win: B.C_CYAN, door: k < 2 ? "s" : "n" });
    for (let x = x0 + 2; x < x0 + 15; x += 4) fill(x, L + 8, z0, x, L + 8, z0 + 11, B.IRON);
    fill(x0 + 13, L + 1, z0 + 2, x0 + 14, L + 18, z0 + 3, B.BRICKS); fill(x0 + 13, L + 19, z0 + 2, x0 + 14, L + 19, z0 + 3, B.COAL_BLOCK);
    for (let x = x0 + 3; x < x0 + 12; x += 3) put(x, L + 1, z0 + 6, B.LAMP);
  });
  fill(cx, L + 1, cz, cx, L + 34, cz, B.IRON);
  for (let y = L + 6; y <= L + 30; y += 8) { fill(cx - 2, y, cz, cx + 2, y, cz, B.IRON_BARS); fill(cx, y, cz - 2, cx, y, cz + 2, B.IRON_BARS); }
  put(cx, L + 35, cz, B.LAMP); put(cx, L + 34, cz, B.WOOL_RED);
  for (let k = 0; k < 6; k++) house(cx - 22 + k * 7, cz + 21, 6, 4, L, 3, { wall: B.C_GRAY, roof: B.C_GRAY, floor: B.STONE_BRICKS, flat: true, win: B.GLASS, door: "n" });
  for (let k = -20; k <= 20; k += 8) { lampPost(cx + k, L, cz + 3, B.IRON); lampPost(cx + 3, L, cz + k, B.IRON); }
}

function buildD4(reg, L, r) {
  const { z: cz } = reg; const cx = reg.x;
  // Küstenlinie westlich des Zentrums suchen
  let coast = cx; while (coast > 2 && w.height[coast + cz * W] >= SEA) coast--;
  const deckY = SEA + 1;
  for (let k = -2; k <= 2; k++) {
    const pz = cz + k * 7;
    let start = cx; while (start > 2 && w.height[start + pz * W] >= SEA) start--;
    for (let x = start + 3; x >= start - 16; x--) {
      put(x, deckY, pz, B.OAK_PLANKS); put(x, deckY, pz + 1, B.OAK_PLANKS);
      if ((start - x) % 4 === 0) { const g = groundTop(x, pz - 1); fill(x, g, pz - 1, x, deckY + 1, pz - 1, B.OAK_LOG); }
    }
    lampPost(start - 16, deckY, pz - 1, B.OAK_LOG, 2);
    // Fischerboot
    const bx = start - 10, bz = pz + 3;
    fill(bx - 3, SEA, bz, bx + 3, SEA, bz + 2, B.SPRUCE_PLANKS); walls(bx - 3, SEA + 1, bz, bx + 3, SEA + 1, bz + 2, B.SPRUCE_PLANKS); fill(bx - 2, SEA + 1, bz + 1, bx + 2, SEA + 1, bz + 1, 0);
    fill(bx, SEA + 1, bz + 1, bx, SEA + 7, bz + 1, B.OAK_LOG); fill(bx + 1, SEA + 3, bz + 1, bx + 3, SEA + 7, bz + 1, B.WOOL_WHITE);
  }
  // Leuchtturm
  const lx = coast - 2, lz = cz - 22;
  const g = Math.max(SEA, groundTop(lx, lz));
  cyl(lx, lz, 3.4, g - 6, g, B.STONE);
  for (let y = g + 1; y <= g + 18; y++) cyl(lx, lz, 2.4, y, y, Math.floor((y - g) / 3) % 2 ? B.WOOL_RED : B.WOOL_WHITE, true);
  cyl(lx, lz, 2.4, g + 19, g + 21, B.GLASS, true); cyl(lx, lz, 1.2, g + 19, g + 21, B.LAMP); cyl(lx, lz, 3, g + 22, g + 22, B.QUARTZ); put(lx, g + 23, lz, B.WOOL_RED);
  // Fischmarkt
  const colors = [B.WOOL_RED, B.WOOL_BLUE, B.C_YELLOW, B.WOOL_WHITE, B.C_CYAN, B.C_ORANGE];
  for (let k = 0; k < 6; k++) {
    const mx = cx + 2 + (k % 3) * 5, mz = cz - 6 + Math.floor(k / 3) * 6;
    [[0, 0], [3, 0], [0, 3], [3, 3]].forEach(([a, b]) => fill(mx + a, L + 1, mz + b, mx + a, L + 3, mz + b, B.OAK_LOG));
    fill(mx, L + 4, mz, mx + 3, L + 4, mz + 3, colors[k]); put(mx + 1, L + 1, mz + 1, B.PRISMARINE); put(mx + 2, L + 1, mz + 2, B.HAY);
  }
  for (let k = 0; k < 8; k++) {
    const hx = cx + 4 + (k % 4) * 6, hz = cz + (k < 4 ? -18 : 12);
    house(hx, hz, 5, 5, L, 3, { wall: B.OAK_PLANKS, roof: k % 2 ? B.C_LIGHTBLUE : B.WOOL_BLUE, floor: B.SPRUCE_PLANKS, door: k < 4 ? "s" : "n" });
  }
}

function buildD5(reg, L, r) {
  const { x: cx, z: cz } = reg;
  const floor = Math.max(SEA + 2, L - 12);
  // Schlucht Nord-Süd
  for (let dz = -r + 3; dz <= r - 3; dz++) for (let dx = -6; dx <= 6; dx++) {
    const wdt = 4 + Math.round(1.5 * noise2((cz + dz) / 6, 3, 8));
    if (Math.abs(dx) > wdt) continue;
    const depth = floor + Math.max(0, (Math.abs(dx) - 2)) * 2;
    fill(cx + dx, depth + 1, cz + dz, cx + dx, L + 2, cz + dz, 0); put(cx + dx, depth, cz + dz, B.STONE);
  }
  // Stausee (Norden) und Fluss (Süden)
  for (let dz = -r + 3; dz <= -2; dz++) for (let dx = -6; dx <= 6; dx++) for (let y = floor + 1; y <= L - 2; y++) if (get(cx + dx, y, cz + dz) === 0) put(cx + dx, y, cz + dz, B.WATER);
  for (let dz = 2; dz <= r - 3; dz++) for (let dx = -1; dx <= 1; dx++) put(cx + dx, floor + 1, cz + dz, B.WATER);
  // Staumauer
  for (let dx = -8; dx <= 8; dx++) { const bow = Math.round((dx * dx) / 22); fill(cx + dx, floor - 1, cz - 1 - bow, cx + dx, L + 1, cz + 1 - bow, B.C_WHITE); put(cx + dx, L + 2, cz - 1 - bow, B.C_GRAY); put(cx + dx, L + 2, cz + 1 - bow, B.C_GRAY); }
  for (let dx = -6; dx <= 6; dx += 3) put(cx + dx, L + 3, cz, B.LAMP);
  // Krafthaus unten
  house(cx - 3, cz + 3, 7, 6, floor, 4, { wall: B.C_GRAY, roof: B.C_GRAY, floor: B.C_GRAY, flat: true, trim: B.LAMP, win: B.C_YELLOW, door: "s" });
  fill(cx - 1, floor + 1, cz + 9, cx + 1, floor + 1, cz + 12, B.WATER);
  // Kraftwerk und Kühlturm
  house(cx + 10, cz - 6, 12, 9, L, 6, { wall: B.C_GRAY, roof: B.IRON, floor: B.C_GRAY, flat: true, win: B.C_YELLOW, door: "w" });
  const kx = cx + 15, kz = cz + 12;
  for (let y = 0; y <= 20; y++) { const rad = 6 - 2.2 * Math.sin(Math.min(1, y / 15) * Math.PI * 0.9); cyl(kx, kz, rad, L + 1 + y, L + 1 + y, y % 5 === 4 ? B.C_GRAY : B.C_WHITE, true); }
  for (let k = 0; k < 4; k++) { const sx = cx - 22 + (k % 2) * 6, sz = cz - 14 + Math.floor(k / 2) * 8; fill(sx, L + 1, sz, sx + 3, L + 1, sz + 5, B.C_BLACK); fill(sx, L + 2, sz, sx + 3, L + 2, sz, B.IRON); }
  // Hochspannungsmasten nach Osten
  let prevTop = null;
  for (let k = 0; k < 4; k++) {
    const px = cx - 3, pz = cz - reg.r - 2 - k * 11;
    if (pz < 2) break;
    const g = groundTop(px, pz);
    fill(px, g + 1, pz, px, g + 12, pz, B.IRON); fill(px - 3, g + 11, pz, px + 3, g + 11, pz, B.IRON);
    if (prevTop) { line3(px - 3, prevTop[1], prevTop[0], px - 3, g + 11, pz, B.IRON_BARS); line3(px + 3, prevTop[1], prevTop[0], px + 3, g + 11, pz, B.IRON_BARS); }
    prevTop = [pz, g + 11];
  }
}

function buildD6(reg, L, r) {
  const { x: cx, z: cz } = reg;
  fill(cx - 24, L, cz - 10, cx + 24, L, cz + 6, B.GRAVEL);
  for (let k = 0; k < 8; k++) fill(cx - 24, L, cz - 9 + k * 2, cx + 24, L, cz - 9 + k * 2, B.RAIL_X);
  const trainCols = [[B.C_BLACK, B.WOOL_RED], [B.IRON, B.C_ORANGE], [B.C_GRAY, B.TERRACOTTA], [B.C_BLACK, B.C_YELLOW]];
  [0, 2, 3, 5, 7].forEach((t, k) => {
    const z = cz - 9 + t * 2, len = 10 + Math.floor(r() * 18), x0 = cx - 22 + Math.floor(r() * 10);
    const [a, b] = trainCols[k % trainCols.length];
    for (let x = x0; x < x0 + len; x++) { put(x, L + 1, z, (x - x0) % 5 === 4 ? B.C_BLACK : b); put(x, L + 2, z, x === x0 ? a : ((x - x0) % 5 === 4 ? 0 : (x - x0) % 2 ? B.GLASS : b)); }
    put(x0, L + 3, z, B.C_BLACK);
  });
  // Lokdepot
  house(cx - 22, cz - 24, 30, 10, L, 7, { wall: B.BRICKS, roof: B.DARK_PLANKS, floor: B.GRAVEL, door: "s" });
  for (let k = 0; k < 5; k++) { const dx = cx - 19 + k * 6; fill(dx, L + 1, cz - 15, dx + 2, L + 5, cz - 15, 0); fill(dx + 1, L, cz - 23, dx + 1, L, cz - 11, B.RAIL_Z); }
  // Wasserturm
  const wx = cx + 14, wz = cz - 18;
  [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([a, b]) => fill(wx + a, L + 1, wz + b, wx + a, L + 9, wz + b, B.IRON));
  cyl(wx, wz, 3.4, L + 10, L + 15, B.SPRUCE_PLANKS); cyl(wx, wz, 2.2, L + 16, L + 16, B.DARK_PLANKS); put(wx, L + 17, wz, B.DARK_PLANKS);
  // Lagerhallen
  for (let k = 0; k < 4; k++) house(cx - 22 + k * 12, cz + 10, 10, 8, L, 5, { wall: k % 2 ? B.TERRACOTTA : B.BRICKS, roof: B.C_GRAY, floor: B.C_GRAY, door: "n" });
}

function buildD7(reg, L, r) {
  const { x: cx, z: cz } = reg;
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = 13 + r() * (reg.r - 13);
    const tx = cx + Math.round(Math.cos(a) * d), tz = cz + Math.round(Math.sin(a) * d);
    if (get(tx, L + 1, tz) !== 0 || get(tx + 1, L + 1, tz + 1) !== 0) continue;
    spruceTree(w, tx, L, tz, r, true);
  }
  fill(cx - 12, L, cz - 2, cx + 12, L, cz + 2, B.DIRT);
  house(cx - 8, cz - 12, 16, 9, L, 6, { wall: B.SPRUCE_PLANKS, roof: B.SPRUCE_LOG, floor: B.SPRUCE_PLANKS, corner: B.SPRUCE_LOG, door: "s" });
  fill(cx + 7, L + 1, cz - 10, cx + 7, L + 3, cz - 6, 0); cyl(cx + 9, cz - 8, 1.5, L + 1, L + 1, B.IRON);
  for (let k = 0; k < 5; k++) { const sx = cx - 10 + k * 4; fill(sx, L + 1, cz + 4, sx + 2, L + 1 + (k % 3), cz + 7, k % 2 ? B.OAK_LOG : B.SPRUCE_LOG); }
  for (let k = 0; k < 4; k++) house(cx - 11 + k * 6, cz + 9, 5, 5, L, 3, { wall: B.SPRUCE_LOG, roof: B.SPRUCE_PLANKS, floor: B.SPRUCE_PLANKS, door: "n" });
}

function buildD8(reg, L, r) {
  const { x: cx, z: cz } = reg;
  for (let dz = -reg.r; dz <= reg.r; dz++) for (let dx = -reg.r; dx <= reg.r; dx++) if (Math.hypot(dx, dz) <= reg.r && (dx % 10 === 0 || dz % 10 === 0)) put(cx + dx, L, cz + dz, B.COBBLE);
  [[-20, -18], [2, -18], [-20, 2]].forEach(([ox, oz]) => {
    const x0 = cx + ox, z0 = cz + oz;
    house(x0, z0, 17, 14, L, 7, { wall: B.BRICKS, roof: B.BRICKS, floor: B.STONE_BRICKS, flat: true, door: "s" });
    for (let k = 0; k < 7; k++) { const sx = x0 + k * 2 + 1; fill(sx, L + 8, z0, sx, L + 9, z0 + 13, B.GLASS); fill(sx + 1, L + 8, z0, sx + 1, L + 8, z0 + 13, B.DARK_PLANKS); }
    fill(x0 + 15, L + 1, z0 + 1, x0 + 16, L + 20, z0 + 2, B.BRICKS);
  });
  // Färberei: bunte Stoffballen
  const dyes = [B.WOOL_RED, B.WOOL_BLUE, B.C_YELLOW, B.C_MAGENTA, B.C_CYAN, B.C_LIME, B.C_PURPLE, B.WOOL_WHITE];
  for (let k = 0; k < 16; k++) { const bx = cx + 4 + (k % 8) * 2, bz = cz + 4 + Math.floor(k / 8) * 3; fill(bx, L + 1, bz, bx, L + 1 + (k % 3), bz + 1, dyes[k % dyes.length]); }
  for (let k = 0; k < 6; k++) {
    const tx = cx + 3 + (k % 3) * 7, tz = cz + 11 + Math.floor(k / 3) * 7;
    if (Math.hypot(tx - cx, tz - cz) > reg.r - 4) continue;
    const hh = 9 + (k * 3) % 6;
    house(tx, tz, 6, 6, L, hh, { wall: k % 2 ? B.C_GRAY : B.STONE_BRICKS, roof: B.C_GRAY, floor: B.COBBLE, flat: true, door: "n" });
  }
}

function buildD9(reg, L, r) {
  const { x: cx, z: cz } = reg;
  for (let dz = -reg.r; dz <= reg.r; dz++) for (let dx = -reg.r; dx <= reg.r; dx++) {
    if (Math.hypot(dx, dz) > reg.r) continue;
    const x = cx + dx, z = cz + dz;
    if (Math.abs(dx) < 8 && Math.abs(dz) < 8) continue;
    if (dz % 9 === 0) put(x, L, z, B.WATER);
    else if (dx % 13 === 0) put(x, L, z, B.DIRT);
    else put(x, L, z, hash2(Math.floor(dx / 13), Math.floor(dz / 9), 5) < 0.18 ? B.GRASS : B.CROPS);
  }
  for (let k = 0; k < 4; k++) { const sx = cx - 5 + (k % 2) * 7, sz = cz - 5 + Math.floor(k / 2) * 7; fill(sx - 3, L, sz - 3, sx + 3, L, sz + 3, B.C_GRAY); cyl(sx, sz, 2.6, L + 1, L + 15, B.IRON); for (let dy = 0; dy < 3; dy++) cyl(sx, sz, 2.6 - dy, L + 16 + dy, L + 16 + dy, B.QUARTZ); }
  // Windmühle
  const mx = cx + 16, mz = cz - 16;
  fill(mx - 1, L + 1, mz - 1, mx + 1, L + 12, mz + 1, B.OAK_PLANKS); fill(mx - 1, L + 13, mz - 1, mx + 1, L + 13, mz + 1, B.DARK_PLANKS); put(mx, L + 14, mz, B.DARK_PLANKS);
  for (let i = -6; i <= 6; i++) { put(mx + i, L + 11 + i, mz + 2, B.WOOL_WHITE); put(mx + i, L + 11 - i, mz + 2, B.WOOL_WHITE); }
  put(mx, L + 11, mz + 2, B.DARK_PLANKS);
  for (let k = 0; k < 10; k++) { const hx = cx - 20 + Math.floor(r() * 40), hz = cz - 20 + Math.floor(r() * 40); if (Math.abs(hx - cx) < 9 && Math.abs(hz - cz) < 9) continue; put(hx, L + 1, hz, B.HAY); if (k % 3 === 0) put(hx, L + 2, hz, B.HAY); }
  house(cx - 4, cz + 9, 8, 6, L, 4, { wall: B.OAK_PLANKS, roof: B.WOOL_RED, floor: B.OAK_PLANKS, door: "n", corner: B.OAK_LOG });
}

function cow(x, y, z, r) {
  const body = r() < 0.5 ? B.WOOL_BROWN : B.WOOL_WHITE, spot = body === B.WOOL_WHITE ? B.C_BLACK : B.WOOL_WHITE;
  [[0, 0], [2, 0], [0, 1], [2, 1]].forEach(([a, b]) => put(x + a, y + 1, z + b, B.WOOL_BROWN));
  fill(x, y + 2, z, x + 2, y + 2, z + 1, body); put(x + 1, y + 2, z, spot); put(x + 3, y + 3, z, body); put(x + 3, y + 2, z, body); put(x + 3, y + 3, z + 1, body);
}
function buildD10(reg, L, r) {
  const { x: cx, z: cz } = reg;
  const pens = [[-22, -20, 18, 16], [2, -22, 18, 14], [-22, 4, 16, 16], [4, 6, 18, 14]];
  pens.forEach(([ox, oz, wd, dp]) => {
    const x0 = cx + ox, z0 = cz + oz, x1 = x0 + wd, z1 = z0 + dp;
    walls(x0, L + 1, z0, x1, L + 1, z1, B.OAK_PLANKS);
    for (let x = x0; x <= x1; x += 3) { put(x, L + 2, z0, B.OAK_LOG); put(x, L + 2, z1, B.OAK_LOG); }
    put(x0 + 2, L + 1, z1, 0);
    for (let k = 0; k < 4; k++) cow(x0 + 2 + Math.floor(r() * (wd - 6)), L, z0 + 2 + Math.floor(r() * (dp - 4)), r);
  });
  [[-6, -6], [6, 22]].forEach(([ox, oz], k) => {
    const bx = cx + ox - 5, bz = cz + oz - 8;
    if (k === 1) return;
    house(bx, bz, 12, 9, L, 6, { wall: B.WOOL_RED, roof: B.DARK_PLANKS, floor: B.HAY, corner: B.WOOL_WHITE, win: null, door: "s" });
    fill(bx + 5, L + 1, bz + 8, bx + 6, L + 4, bz + 8, 0);
  });
  cyl(cx + 9, cz - 4, 2.4, L + 1, L + 11, B.IRON); cyl(cx + 9, cz - 4, 1.4, L + 12, L + 12, B.WOOL_RED);
  house(cx - 4, cz + 22, 9, 6, L, 4, { wall: B.OAK_PLANKS, roof: B.DARK_PLANKS, floor: B.OAK_PLANKS, door: "n", corner: B.OAK_LOG });
}

function buildD11(reg, L, r) {
  const { x: cx, z: cz } = reg, R = reg.r;
  for (let dz = -R + 3; dz <= R - 3; dz += 5) for (let dx = -R + 3; dx <= R - 3; dx += 5) {
    if (Math.hypot(dx, dz) > R - 4) continue;
    if (Math.abs(dx) < 9 && Math.abs(dz) < 9) continue;
    if (dx > 0 && dz > 0) { // Felder
      for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) put(cx + dx + a - 2, L, cz + dz + b - 2, b === 4 ? B.WATER : B.CROPS);
      continue;
    }
    oakTree(w, cx + dx, L, cz + dz, r, B.APPLE_LEAVES, 3);
  }
  // Hoher Zaun mit Wachtürmen
  for (let a = 0; a < 720; a++) {
    const ang = a / 720 * Math.PI * 2, x = cx + Math.round(Math.cos(ang) * (R - 1)), z = cz + Math.round(Math.sin(ang) * (R - 1));
    fill(x, L + 1, z, x, L + 5, z, B.IRON_BARS);
  }
  for (let k = 0; k < 8; k++) {
    const ang = k / 8 * Math.PI * 2, x = cx + Math.round(Math.cos(ang) * (R - 1)), z = cz + Math.round(Math.sin(ang) * (R - 1));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => fill(x + a, L + 1, z + b, x + a, L + 8, z + b, B.DARK_PLANKS));
    fill(x - 2, L + 9, z - 2, x + 2, L + 9, z + 2, B.OAK_PLANKS); walls(x - 2, L + 10, z - 2, x + 2, L + 10, z + 2, B.OAK_PLANKS); fill(x - 2, L + 12, z - 2, x + 2, L + 12, z + 2, B.DARK_PLANKS); put(x, L + 11, z, B.LAMP);
  }
  for (let k = 0; k < 8; k++) house(cx - 8 + (k % 4) * 4, cz - 8 + Math.floor(k / 4) * 13, 3, 3, L, 2, { wall: B.OAK_PLANKS, roof: B.DARK_PLANKS, floor: B.DIRT, win: null, door: k < 4 ? "s" : "n" });
  disc(cx, cz, 4, L, B.DIRT); house(cx - 3, cz - 2, 7, 5, L, 4, { wall: B.STONE_BRICKS, roof: B.DARK_PLANKS, floor: B.STONE_BRICKS, door: "s" });
}

function buildD12(reg, L, r) {
  const { x: cx, z: cz } = reg, R = reg.r;
  // Zaun um den Distrikt
  for (let a = 0; a < 760; a++) {
    const ang = a / 760 * Math.PI * 2, x = cx + Math.round(Math.cos(ang) * (R - 2)), z = cz + Math.round(Math.sin(ang) * (R - 2));
    if (Math.abs(ang - 4.0) < 0.03) continue; // die Lücke im Zaun
    fill(x, L + 1, z, x, L + 3, z, B.IRON_BARS);
  }
  // Platz und Justizgebäude
  disc(cx, cz, 7, L, B.COBBLE); fill(cx - 1, L + 1, cz - 1, cx + 1, L + 1, cz + 1, B.STONE_BRICKS);
  house(cx - 6, cz - 16, 13, 8, L, 7, { wall: B.STONE_BRICKS, roof: B.DARK_PLANKS, floor: B.STONE_BRICKS, door: "s", corner: B.COBBLE });
  fill(cx - 1, L + 12, cz - 9, cx + 1, L + 14, cz - 9, B.QUARTZ); put(cx, L + 13, cz - 8, B.C_BLACK);
  // Händlerviertel rund um den Platz
  for (let k = 0; k < 4; k++) house(cx + 9, cz - 10 + k * 5, 6, 4, L, 3, { wall: k % 2 ? B.BRICKS : B.OAK_PLANKS, roof: B.DARK_PLANKS, floor: B.OAK_PLANKS, door: "w" });
  // Der Saum (Südwesten)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const hx = cx - 24 + i * 6, hz = cz + 3 + j * 5;
    if (Math.hypot(hx + 2 - cx, hz + 2 - cz) > R - 5) continue;
    house(hx, hz, 4, 4, L, 2, { wall: hash2(i, j, 3) < 0.5 ? B.COBBLE : B.MOSSY_COBBLE, roof: B.DARK_PLANKS, floor: B.DIRT, win: null, door: "n" });
    fill(hx, L, hz - 1, hx + 4, L, hz - 1, B.GRAVEL);
  }
  // Dorf der Sieger (Nordosten)
  const vx = cx + 15, vz = cz - 16;
  disc(vx, vz, 3, L, B.GRASS); put(vx, L + 1, vz, B.OAK_LEAVES); put(vx, L + 2, vz, B.OAK_LEAVES);
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + 0.3, hx = vx + Math.round(Math.cos(a) * 9) - 3, hz = vz + Math.round(Math.sin(a) * 9) - 3;
    if (Math.hypot(hx + 3 - cx, hz + 3 - cz) > R - 6) continue;
    house(hx, hz, 6, 6, L, 4, { wall: B.C_WHITE, roof: B.DARK_PLANKS, floor: B.OAK_PLANKS, corner: B.QUARTZ_PILLAR, door: "s" });
  }
  // Kohlemine mit Förderturm (Südosten)
  const mx = cx + 14, mz = cz + 12;
  for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) { const d = Math.hypot(dx, dz); const hh = Math.round(6 - d); if (hh > 0) fill(mx + dx + 5, L + 1, mz + dz, mx + dx + 5, L + hh, mz + dz, hash2(dx, dz, 7) < 0.3 ? B.COAL_ORE : B.STONE); }
  fill(mx + 1, L + 1, mz - 1, mx + 6, L + 3, mz + 1, 0); walls(mx + 1, L + 1, mz - 2, mx + 1, L + 4, mz + 2, B.DARK_PLANKS); fill(mx + 1, L + 1, mz - 1, mx + 1, L + 3, mz + 1, 0);
  fill(mx - 12, L, mz, mx + 5, L, mz, B.RAIL_X);
  [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([a, b]) => line3(mx - 5 + a, L + 1, mz - 6 + b, mx - 5, L + 16, mz - 6, B.IRON));
  for (let a = 0; a < 24; a++) { const ang = a / 24 * Math.PI * 2; put(mx - 5 + Math.round(Math.cos(ang) * 3), L + 16 + Math.round(Math.sin(ang) * 3), mz - 6, B.C_BLACK); }
  for (let k = 0; k < 4; k++) { const px = mx - 10 + k * 3, pz = mz + 4; fill(px, L + 1, pz, px + 1, L + 1 + (k % 3), pz + 1, B.COAL_BLOCK); }
  // Wiese, Wald und See außerhalb des Zauns
  const lx = cx - R - 6, lz = cz - R + 4;
  cyl(lx, lz, 5, hAt(lx, lz) - 1, hAt(lx, lz), B.WATER);
  for (let i = 0; i < 40; i++) {
    const a = 3.2 + r() * 2.2, d = R + 4 + r() * 14, tx = cx + Math.round(Math.cos(a) * d), tz = cz + Math.round(Math.sin(a) * d);
    if (tx < 2 || tz < 2 || tx >= W - 2 || tz >= D - 2) continue;
    const g = groundTop(tx, tz); if (g <= SEA + 1 || get(tx, g, tz) === B.WATER || Math.hypot(tx - lx, tz - lz) < 7) continue;
    oakTree(w, tx, g, tz, r);
  }
}

function buildD13(reg, L, r) {
  const { x: cx, z: cz } = reg, R = reg.r;
  // Trümmerfeld
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    if (Math.hypot(dx, dz) > R) continue;
    const hv = hash2(cx + dx, cz + dz, 13);
    if (hv < 0.25) put(cx + dx, L, cz + dz, hv < 0.08 ? B.C_BLACK : B.GRAVEL);
    else if (hv > 0.96) put(cx + dx, L + 1, cz + dz, hv > 0.985 ? B.MOSSY_COBBLE : B.COBBLE);
  }
  // Krater
  [[-12, 8, 5], [10, -12, 4], [-4, -16, 3.5], [16, 10, 4.5]].forEach(([dx, dz, rad]) => {
    for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) { const d = Math.hypot(a, b); if (d > rad) continue; const dep = Math.round((rad - d) * 0.8); fill(cx + dx + a, L - dep, cz + dz + b, cx + dx + a, L + 2, cz + dz + b, 0); put(cx + dx + a, L - dep - 1, cz + dz + b, B.C_BLACK); }
  });
  // Ruinen des Justizgebäudes
  const rx = cx - 8, rz = cz - 6;
  for (let x = rx; x <= rx + 14; x++) for (const z of [rz, rz + 10]) { const hh = Math.floor(hash2(x, z, 2) * 7); if (hh) fill(x, L + 1, z, x, L + hh, z, hash2(x, z, 4) < 0.3 ? B.MOSSY_COBBLE : B.STONE_BRICKS); }
  for (let z = rz; z <= rz + 10; z++) for (const x of [rx, rx + 14]) { const hh = Math.floor(hash2(x, z, 6) * 6); if (hh) fill(x, L + 1, z, x, L + hh, z, B.STONE_BRICKS); }
  // Landeplatz
  const hx = cx + 12, hz = cz + 0;
  fill(hx - 5, L, hz - 5, hx + 5, L, hz + 5, B.C_GRAY);
  for (let k = -2; k <= 2; k++) { put(hx - 2, L, hz + k, B.C_YELLOW); put(hx + 2, L, hz + k, B.C_YELLOW); } put(hx - 1, L, hz, B.C_YELLOW); put(hx, L, hz, B.C_YELLOW); put(hx + 1, L, hz, B.C_YELLOW);
  [[-5, -5], [5, -5], [-5, 5], [5, 5]].forEach(([a, b]) => put(hx + a, L + 1, hz + b, B.LAMP));
  // Bunker unter der Erde
  const F = Math.max(4, L - 22);
  fill(cx - 22, F, cz - 15, cx + 22, F, cz + 15, B.C_GRAY);
  fill(cx - 22, F + 1, cz - 15, cx + 22, F + 7, cz + 15, 0);
  fill(cx - 23, F + 8, cz - 16, cx + 23, F + 8, cz + 16, B.STONE);
  for (let x = cx - 20; x <= cx + 20; x += 5) for (let z = cz - 13; z <= cz + 13; z += 5) put(x, F + 8, z, B.LAMP);
  for (let x = cx - 16; x <= cx + 16; x += 8) for (const z of [cz - 7, cz + 7]) fill(x, F + 1, z, x, F + 7, z, B.STONE_BRICKS);
  fill(cx - 22, F + 1, cz - 4, cx - 8, F + 4, cz - 4, B.C_WHITE); fill(cx - 15, F + 1, cz - 4, cx - 15, F + 3, cz - 4, 0);
  for (let k = 0; k < 6; k++) { const bx = cx - 21 + k * 2; put(bx, F + 1, cz - 14, B.WOOL_WHITE); put(bx, F + 1, cz - 13, B.WOOL_WHITE); put(bx, F + 3, cz - 14, B.WOOL_WHITE); put(bx, F + 3, cz - 13, B.WOOL_WHITE); put(bx, F + 2, cz - 14, B.IRON_BARS); }
  fill(cx - 4, F + 1, cz - 2, cx + 4, F + 1, cz + 2, B.C_BLACK); fill(cx - 4, F + 2, cz - 3, cx + 4, F + 4, cz - 3, B.C_BLACK);
  for (let x = cx - 3; x <= cx + 3; x += 2) put(x, F + 3, cz - 3, B.C_CYAN);
  put(cx, F + 2, cz, B.C_CYAN);
  for (let k = 0; k < 5; k++) fill(cx + 6 + k * 3, F + 1, cz + 10, cx + 7 + k * 3, F + 1 + (k % 3), cz + 12, B.SPRUCE_PLANKS);
  for (let k = 0; k < 4; k++) fill(cx - 20, F + 1, cz + 6 + k * 2, cx - 10, F + 1, cz + 6 + k * 2, B.OAK_PLANKS);
  // Schacht mit Wendeltreppe
  const sx = cx + 2, sz = cz + 14;
  fill(sx - 2, F + 1, sz - 2, sx + 2, L + 3, sz + 2, 0);
  walls(sx - 3, L + 1, sz - 3, sx + 3, L + 1, sz + 3, B.OBSIDIAN); fill(sx - 2, L + 1, sz - 3, sx + 2, L + 1, sz - 3, 0);
  fill(sx, F + 1, sz, sx, L + 1, sz, B.IRON);
  const ring = [];
  for (let i = -2; i <= 2; i++) ring.push([i, -2]); for (let i = -1; i <= 2; i++) ring.push([2, i]);
  for (let i = 1; i >= -2; i--) ring.push([i, 2]); for (let i = 1; i >= -1; i--) ring.push([-2, i]);
  for (let i = 0, y = L; y > F; i++, y--) { const [a, b] = ring[i % ring.length]; put(sx + a, y, sz + b, B.STONE_BRICKS); if (i % 6 === 0) put(sx + a, y + 3, sz + b, B.LAMP); }
  fill(sx - 2, F + 1, sz - 6, sx + 2, F + 4, sz - 1, 0);
}

// --- Arenen -----------------------------------------------------------------
function cornucopia(cx, y, cz, scale, dir = 1) {
  for (let t = 0; t <= 1.0001; t += 0.015) {
    const rad = (3.4 * (1 - t) + 0.6) * scale;
    const px = cx + dir * (-4 + 9 * t) * scale, py = y + 1 + 3.4 * scale + 3.2 * t * t * scale;
    for (let a = 0; a < Math.PI * 2; a += 0.12) {
      const yy = Math.round(py + rad * Math.cos(a)), zz = Math.round(cz + rad * Math.sin(a));
      if (yy > y) put(Math.round(px), yy, zz, B.GOLD);
    }
  }
}
function buildArena74(reg, L, r) {
  const { x: cx, z: cz } = reg, R = reg.r;
  // Hügeliges Innengelände
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const d = Math.hypot(dx, dz); if (d > R) continue;
    const x = cx + dx, z = cz + dz;
    let hh = d < 11 ? 0 : Math.round(3 * (noise2(x / 9, z / 9, 41) + 1) * Math.min(1, (d - 11) / 8));
    if (dx > 10 && dz < -4) hh += Math.round(Math.max(0, 8 - Math.hypot(dx - 20, dz + 14) * 0.6)); // Felsrücken
    if (hh > 0) { fill(x, L + 1, z, x, L + hh, z, hh > 6 ? B.STONE : B.DIRT); put(x, L + hh, z, hh > 6 ? B.STONE : B.GRASS); }
    w.height[x + z * W] = L + hh;
  }
  // See
  const lx = cx - 16, lz = cz + 14;
  for (let dz = -6; dz <= 6; dz++) for (let dx = -8; dx <= 8; dx++) { if (Math.hypot(dx / 8, dz / 6) > 1) continue; const x = lx + dx, z = lz + dz, h0 = w.height[x + z * W]; fill(x, L - 2, z, x, h0 + 6, z, 0); put(x, L - 3, z, B.SAND); fill(x, L - 2, z, x, L, z, B.WATER); }
  // Wald
  for (let i = 0; i < 160; i++) {
    const a = r() * Math.PI * 2, d = 13 + r() * (R - 15), tx = cx + Math.round(Math.cos(a) * d), tz = cz + Math.round(Math.sin(a) * d);
    if (Math.hypot(tx - lx, tz - lz) < 10) continue;
    const g = w.height[tx + tz * W]; if (get(tx, g, tz) !== B.GRASS || get(tx, g + 1, tz) !== 0) continue;
    if (r() < 0.45) spruceTree(w, tx, g, tz, r); else oakTree(w, tx, g, tz, r);
  }
  // Füllhorn und Startplattformen
  disc(cx, cz, 10, L, B.GRASS);
  cornucopia(cx, L, cz, 1.0, 1);
  for (let k = 0; k < 6; k++) { put(cx - 5 - (k % 3), L + 1, cz - 2 + k, [B.SPRUCE_PLANKS, B.WOOL_RED, B.WOOL_BLUE, B.C_LIME, B.SPRUCE_PLANKS, B.WOOL_BROWN][k]); }
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; put(cx + Math.round(Math.cos(a) * 9), L, cz + Math.round(Math.sin(a) * 9), B.IRON); }
  // Kraftfeld-Kuppel
  const RR = R + 2, cy = L - 6;
  for (let dz = -RR - 1; dz <= RR + 1; dz++) for (let dx = -RR - 1; dx <= RR + 1; dx++) for (let y = cy; y <= cy + RR + 1; y++) {
    const d = Math.hypot(dx, y - cy, dz);
    if (Math.abs(d - RR) > 0.5) continue;
    const x = cx + dx, z = cz + dz;
    if (get(x, y, z) === 0) put(x, y, z, B.GLASS);
  }
  fill(cx + RR - 2, L + 1, cz - 1, cx + RR + 2, L + 3, cz + 1, 0); // Eingang
}

function buildArena75(reg, L, r) {
  const { x: cx, z: cz } = reg, R = reg.r;
  for (let dz = -R - 2; dz <= R + 2; dz++) for (let dx = -R - 2; dx <= R + 2; dx++) {
    const d = Math.hypot(dx, dz), x = cx + dx, z = cz + dz;
    if (x < 1 || z < 1 || x >= W - 1 || z >= D - 1) continue;
    if (d > R) continue;
    const ang = (Math.atan2(dz, dx) + Math.PI * 2) % (Math.PI * 2), sector = ang / (Math.PI / 6), spoke = Math.abs(sector - Math.round(sector)) * d < 1.1;
    let top, hh;
    if (d < 2.6) { hh = SEA + 1; top = B.SAND; }
    else if (d < 10) { if (spoke) { hh = SEA + 1; top = B.SAND; } else { hh = SEA - 3; top = B.SAND; } }
    else if (d < 24) { hh = SEA + 2 + Math.round(3 * (noise2(x / 6, z / 6, 51) + 1) * Math.min(1, (24 - d) / 4)); top = spoke ? B.SAND : B.GRASS; }
    else { hh = SEA + 1; top = B.SAND; }
    fill(x, 1, z, x, H - 1, z, 0);
    fill(x, 1, z, x, hh - 1, z, B.SAND); put(x, hh, z, top);
    for (let y = hh + 1; y <= SEA; y++) put(x, y, z, B.WATER);
    w.height[x + z * W] = hh; w.reserved[x + z * W] = reg.index + 1;
  }
  // Dschungel
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2, d = 11 + r() * 12, tx = cx + Math.round(Math.cos(a) * d), tz = cz + Math.round(Math.sin(a) * d);
    const g = w.height[tx + tz * W]; if (get(tx, g, tz) !== B.GRASS || get(tx, g + 1, tz) !== 0) continue;
    oakTree(w, tx, g, tz, r, B.OAK_LEAVES, 5 + Math.floor(r() * 4));
  }
  cornucopia(cx, SEA + 1, cz, 0.55, -1);
  // Blitzbaum im 12-Uhr-Sektor
  const bx = cx + 2, bz = cz - 18, g = w.height[bx + bz * W];
  fill(bx, g + 1, bz, bx, g + 14, bz, B.OAK_LOG); put(bx, g + 15, bz, B.GOLD);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 - Math.PI / 2; put(cx + Math.round(Math.cos(a) * 27), SEA + 2, cz + Math.round(Math.sin(a) * 27), B.QUARTZ_PILLAR); put(cx + Math.round(Math.cos(a) * 27), SEA + 3, cz + Math.round(Math.sin(a) * 27), B.LAMP); }
}

const BUILDERS = { capitol: buildCapitol, d1: buildD1, d2: buildD2, d3: buildD3, d4: buildD4, d5: buildD5, d6: buildD6, d7: buildD7, d8: buildD8, d9: buildD9, d10: buildD10, d11: buildD11, d12: buildD12, d13: buildD13, arena74: buildArena74, arena75: buildArena75 };

// --- Bahnnetz ---------------------------------------------------------------
function buildRail(a, b) {
  const ang = Math.atan2(b.z - a.z, b.x - a.x);
  const x0 = Math.round(a.x + Math.cos(ang) * (a.r - 3)), z0 = Math.round(a.z + Math.sin(ang) * (a.r - 3));
  const x1 = Math.round(b.x - Math.cos(ang) * (b.r - 3)), z1 = Math.round(b.z - Math.sin(ang) * (b.r - 3));
  // 4-zusammenhängende Linie
  const pts = [];
  let x = x0, z = z0; const dx = Math.abs(x1 - x0), dz = Math.abs(z1 - z0), sx = x0 < x1 ? 1 : -1, sz = z0 < z1 ? 1 : -1;
  pts.push([x, z]);
  for (let ix = 0, iz = 0; ix < dx || iz < dz;) {
    if ((0.5 + ix) / dx < (0.5 + iz) / dz) { x += sx; ix++; } else { z += sz; iz++; }
    pts.push([x, z]);
  }
  const alongX = dx >= dz;
  const ground = pts.map(([px, pz]) => Math.max(SEA + 2, hAt(px, pz)));
  // Höhenprofil glätten und Steigung begrenzen
  let p = ground.map((g, i) => { let s = 0, n = 0; for (let k = -10; k <= 10; k++) { const j = i + k; if (j >= 0 && j < ground.length) { s += ground[j]; n++; } } return s / n; });
  p[0] = a.level; p[p.length - 1] = b.level;
  const maxS = 0.35;
  for (let it = 0; it < 2; it++) {
    for (let i = 1; i < p.length; i++) p[i] = Math.max(p[i - 1] - maxS, Math.min(p[i - 1] + maxS, p[i]));
    p[p.length - 1] = b.level;
    for (let i = p.length - 2; i >= 0; i--) p[i] = Math.max(p[i + 1] - maxS, Math.min(p[i + 1] + maxS, p[i]));
    p[0] = a.level;
  }
  pts.forEach(([px, pz], i) => {
    if (px < 1 || pz < 1 || px >= W - 1 || pz >= D - 1) return;
    const y = Math.round(p[i]), g = hAt(px, pz);
    const side = alongX ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
    fill(px, y + 1, pz, px, y + (g > y + 4 ? 3 : 10), pz, 0);
    for (const [ox, oz] of side) { if (g > y + 4) fill(px + ox, y + 1, pz + oz, px + ox, y + 3, pz + oz, 0); }
    put(px, y, pz, alongX ? B.RAIL_X : B.RAIL_Z);
    for (const [ox, oz] of side) put(px + ox, y, pz + oz, y > g ? B.STONE_BRICKS : B.GRAVEL);
    if (g > y + 4) { // Tunneldecke
      for (const [ox, oz] of [[0, 0], ...side]) put(px + ox, y + 4, pz + oz, B.STONE_BRICKS);
    }
    if (y > g) {
      put(px, y - 1, pz, B.STONE_BRICKS);
      if (i % 7 === 0) { const gt = Math.min(y - 1, Math.max(0, g)); fill(px, gt, pz, px, y - 1, pz, B.STONE_BRICKS); for (const [ox, oz] of side) fill(px + ox, gt, pz + oz, px + ox, y - 1, pz + oz, B.STONE_BRICKS); }
    }
    if (i % 24 === 12 && y >= g) for (const [ox, oz] of side) { put(px + ox * 2, y + 1, pz + oz * 2, B.IRON); put(px + ox * 2, y + 2, pz + oz * 2, B.LAMP); }
    for (let ox = -2; ox <= 2; ox++) for (let oz = -2; oz <= 2; oz++) { const nx = px + ox, nz = pz + oz; if (nx >= 0 && nz >= 0 && nx < W && nz < D && !w.reserved[nx + nz * W]) w.reserved[nx + nz * W] = 255; }
  });
  // Bahnsteig am Distriktende
  const n = pts.length;
  for (let i = Math.max(0, n - 12); i < n - 1; i++) {
    const [px, pz] = pts[i], y = Math.round(p[i]);
    const [ox, oz] = alongX ? [0, 2] : [2, 0];
    fill(px + ox, y, pz + oz, px + ox * 1.5, y + 1, pz + oz * 1.5, B.STONE_BRICKS);
    if (i % 4 === 0) { put(px + ox * 2, y + 2, pz + oz * 2, B.IRON); put(px + ox * 2, y + 3, pz + oz * 2, B.LAMP); }
  }
}

// --- Gesamtaufbau -----------------------------------------------------------
export function prepareSites(world) {
  w = world;
  for (const reg of REGIONS) {
    if (reg.id === "arena75") { reg.level = SEA + 1; continue; }
    let level = averageHeight(reg.x, reg.z, reg.r);
    if (reg.id === "capitol") level += 2;
    if (reg.id === "d4") level = SEA + 3;
    if (reg.id === "d5") level = Math.max(level, SEA + 16);
    if (reg.id === "d13") level = Math.max(level, SEA + 8);
    reg.level = Math.max(SEA + 2, Math.min(H - 70, level));
    prepareSite(reg, reg.level, {
      top: reg.id === "arena74" ? B.GRASS : (reg.id === "d13" ? B.DIRT : B.GRASS),
      blend: reg.id === "capitol" ? 16 : 12,
      keepWater: reg.id === "d4"
    });
  }
}
export function buildRails(world) {
  w = world;
  RAILS.forEach(([a, b]) => buildRail(REGION[a], REGION[b]));
}
export function buildStructures(world, seed = 7) {
  w = world;
  for (const reg of REGIONS) {
    const r = mulberry32(seed * 1000 + reg.index * 97);
    BUILDERS[reg.id](reg, reg.level, r);
    reg.top = reg.level + 12;
  }
  REGION.capitol.top = REGION.capitol.level + 66;
}

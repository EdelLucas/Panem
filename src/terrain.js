// Geländeerzeugung: Nordamerika-Umriss (nach dem Anstieg des Meeresspiegels), Gebirge, Flüsse, Seen, Biome.
import { B } from "./blocks.js";
import { fbm, ridged, noise2, hash2 } from "./noise.js";
import { W, D, H, SEA, toX, toZ, lonOf, latOf } from "./data.js";

const P = pts => pts.map(([lon, lat]) => [toX(lon), toZ(lat)]);

// Grober Küstenverlauf (lon, lat) im Uhrzeigersinn
const COAST = P([
  [-127, 54], [-127, 51], [-125.5, 49.6], [-124.7, 48.3], [-124.1, 46.5], [-124, 44], [-124.4, 42.3], [-123.8, 40], [-122.6, 37.8],
  [-121.9, 36.6], [-120.6, 34.6], [-118.5, 34], [-117.1, 32.6], [-116.5, 31.5], [-115.6, 30], [-114.2, 28.4], [-112.6, 26.6], [-110.4, 24],
  [-109.6, 24], [-111.2, 26.4], [-112.8, 29], [-114.6, 31.3], [-113.2, 31.2], [-112, 29], [-110.4, 27.2], [-109, 25.6], [-107.6, 24],
  [-97.7, 24], [-97.5, 25.6], [-97.3, 27.6], [-96, 28.6], [-94.7, 29.4], [-93.3, 29.8], [-91.5, 29.4], [-90, 29.1], [-89.3, 29.4],
  [-89.6, 30.2], [-88, 30.4], [-86.5, 30.4], [-85.4, 29.7], [-84, 30.1], [-83, 29.1], [-82.7, 28.1], [-81.8, 27.3], [-80.4, 27.5],
  [-80.6, 28.5], [-81.3, 30.3], [-81.2, 31.5], [-80, 32.6], [-78.6, 33.8], [-77, 34.6], [-75.6, 35.3], [-75.8, 36.8], [-75.3, 38.2],
  [-74.4, 39.4], [-74, 40.6], [-72, 41], [-70, 41.6], [-70.6, 42.4], [-70.7, 43.1], [-69.5, 43.9], [-67, 44.7], [-66, 45.2], [-64.6, 45.6],
  [-64.8, 47], [-66.5, 48.6], [-68.5, 49.1], [-66, 49.9], [-63, 50.2], [-63, 54], [-78, 54], [-79.2, 52.2], [-80.5, 51.3], [-82.2, 52.6], [-83, 54]
]);

const LAKES = [
  // lon, lat, radius x (lon), radius z (lat), rotation
  [-87.6, 47.6, 3.4, 0.85, -0.12], [-87, 43.9, 0.65, 2.1, 0], [-82.4, 44.9, 1.1, 1.3, 0.3], [-81.2, 42.2, 1.9, 0.42, -0.35],
  [-77.8, 43.6, 1.3, 0.38, 0], [-112.5, 41.1, 0.45, 0.6, 0], [-98, 51.8, 1.2, 2.2, 0.2], [-96.6, 53.2, 1.4, 0.8, 0]
].map(([lon, lat, rx, ry, rot]) => ({ x: toX(lon), z: toZ(lat), rx: rx * 12, rz: ry * 13.87, rot }));

const RIVERS = [
  { w: 3, pts: P([[-95, 47.6], [-93.2, 45], [-91.2, 43.5], [-91, 40.5], [-90.2, 38.6], [-89.2, 37], [-90.1, 35], [-91.1, 32.4], [-91.4, 31], [-90.1, 29.6]]) },
  { w: 2, pts: P([[-111, 47.5], [-104, 48], [-100.5, 46.5], [-96.5, 42.5], [-94.6, 39.1], [-90.2, 38.7]]) },
  { w: 2, pts: P([[-80, 40.5], [-82.6, 38.7], [-85.7, 38.2], [-89.1, 37]]) },
  { w: 2, pts: P([[-106.2, 40.2], [-109.5, 38.6], [-111.5, 36.8], [-113.9, 36.1], [-114.6, 35], [-114.7, 32.2], [-114.8, 31.6]]) },
  { w: 2, pts: P([[-117, 49.5], [-119.3, 46.2], [-121.5, 45.6], [-124.1, 46.2]]) },
  { w: 2, pts: P([[-106.8, 37.8], [-106.6, 34.5], [-106.5, 31.8], [-104.5, 29.6], [-101.4, 29.8], [-99.5, 27.5], [-97.3, 25.9]]) },
  { w: 2, pts: P([[-76.4, 44.1], [-73.5, 45.6], [-70.5, 47], [-68, 48.8]]) }
];

const RIDGES = [
  { amp: 40, w: 25, pts: P([[-118, 54], [-114.5, 49], [-111.5, 46], [-109, 43], [-106.8, 40.5], [-106, 38], [-105.7, 35.5], [-106.2, 32.8]]) },
  { amp: 26, w: 11, pts: P([[-121.6, 50.5], [-121.4, 46], [-122, 43], [-121.6, 40.5], [-119.6, 37.5], [-118.2, 35.3]]) },
  { amp: 8, w: 7, pts: P([[-123.8, 48], [-123.6, 44], [-123.5, 41], [-122.2, 37.2], [-120.3, 34.8]]) },
  { amp: 17, w: 17, pts: P([[-86.5, 33.6], [-84, 35.5], [-81.5, 37], [-79.5, 38.8], [-77.5, 40.5], [-75, 42], [-73, 43.6], [-71.5, 44.8], [-69, 46.2]]) },
  { amp: 22, w: 15, pts: P([[-110.5, 31.2], [-107.4, 27.4], [-105.5, 24]]) },
  { amp: 12, w: 10, pts: P([[-101.5, 28], [-100, 24.5]]) },
  { amp: 9, w: 15, pts: P([[-76, 47.6], [-71, 48.4], [-67, 49]]) },
  { amp: 6, w: 14, pts: P([[-93.5, 36.6], [-91.5, 36]]) },
  { amp: 10, w: 9, pts: P([[-110.6, 44.9], [-109.6, 44]]) }
];

function insidePoly(x, z, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins;
  }
  return ins;
}
function distPolyline(x, z, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    let t = l2 ? ((x - ax) * dx + (z - az) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - ax - t * dx, z - az - t * dz);
    if (d < best) best = d;
  }
  return best;
}
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function isDesert(x, z) {
  const lon = lonOf(x) + noise2(x / 30, z / 30, 9) * 1.4, lat = latOf(z) + noise2(x / 30, z / 30, 10) * 1.2;
  return (lon > -117.5 && lon < -103 && lat > 29 && lat < 37.6) || (lon > -110 && lon < -100.5 && lat < 29.5);
}

function elevation(x, z) {
  let e = 2.5 + 2.5 * fbm(x / 80, z / 80, 1);
  e += 9 * smooth(384, 270, x);                                                  // Hochebenen westlich der Prärie
  e += 6 * smooth(70, 110, x) * smooth(290, 250, x) * smooth(80, 110, z) * smooth(310, 280, z); // Great Basin
  const rough = ridged(x / 26, z / 26, 3);
  for (const r of RIDGES) {
    const d = distPolyline(x, z, r.pts);
    if (d < r.w * 2.6) e += r.amp * Math.exp(-(d * d) / (r.w * r.w)) * (0.5 + 0.6 * rough);
  }
  e += 2.2 * fbm(x / 14, z / 14, 5);
  return e;
}

export function generateTerrain(world) {
  const { data, height } = world;
  const layer = W * D;
  // 1) Höhenkarte
  const land = new Uint8Array(W * D);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const wx = x + 7 * noise2(x / 22, z / 22, 11), wz = z + 7 * noise2(x / 22, z / 22, 12);
    const isLand = insidePoly(wx, wz, COAST);
    let h;
    if (isLand) {
      h = SEA + 1 + Math.round(elevation(x, z));
      for (const l of LAKES) {
        const dx = x - l.x, dz = z - l.z, c = Math.cos(l.rot), s = Math.sin(l.rot);
        const q = Math.hypot((dx * c - dz * s) / l.rx, (dx * s + dz * c) / l.rz) + 0.12 * noise2(x / 8, z / 8, 13);
        if (q < 1) h = SEA - 2 - Math.round(3 * (1 - q));
        else if (q < 1.5) h = Math.min(h, SEA + Math.round((q - 1) * 2 * (h - SEA)));
      }
      for (const r of RIVERS) {
        const d = distPolyline(x, z, r.pts) + 0.8 * noise2(x / 6, z / 6, 14);
        if (d < r.w) h = SEA - 1;
        else if (d < r.w + 60) h = Math.min(h, SEA + Math.floor((d - r.w) * 1.25));
      }
      land[x + z * W] = h > SEA ? 1 : 0;
    } else {
      h = SEA - 3 - Math.round(4 * Math.abs(fbm(x / 30, z / 30, 15)));
    }
    height[x + z * W] = Math.max(2, Math.min(H - 40, h));
  }
  // 2) Säulen füllen
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const i = x + z * W, h = height[i];
    let slope = 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = Math.min(W - 1, Math.max(0, x + dx)), nz = Math.min(D - 1, Math.max(0, z + dz));
      slope = Math.max(slope, Math.abs(height[nx + nz * W] - h));
    }
    let nearWater = false;
    if (h <= SEA + 2) for (let dz = -2; dz <= 2 && !nearWater; dz++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, nz = z + dz;
      if (nx >= 0 && nz >= 0 && nx < W && nz < D && height[nx + nz * W] < SEA) { nearWater = true; break; }
    }
    const desert = isDesert(x, z), lat = latOf(z);
    let top = B.GRASS, under = B.DIRT;
    if (h < SEA) { top = h < SEA - 4 ? B.GRAVEL : (hash2(x, z, 3) < 0.6 ? B.SAND : B.DIRT); under = B.SAND; }
    else if (nearWater && h <= SEA + 2) { top = B.SAND; under = B.SAND; }
    else if (h > SEA + 46 || (h > SEA + 38 && slope < 2)) { top = B.SNOW_BLOCK; under = B.STONE; }
    else if (slope >= 3 && h > SEA + 16) { top = B.STONE; under = B.STONE; }
    else if (desert) {
      if (h > SEA + 14 && slope >= 2) { top = B.TERRACOTTA; under = B.TERRACOTTA; }
      else { top = noise2(x / 12, z / 12, 21) > 0.25 ? B.RED_SAND : B.SAND; under = B.SANDSTONE; }
    }
    else if (lat > 50.3 || h > SEA + 33) { top = B.SNOWY_GRASS; }
    const base = x + W * z;
    for (let y = 0; y <= h; y++) {
      let b = B.STONE;
      if (y === h) b = top; else if (y >= h - 3) b = under;
      else if (y > 4 && hash2(x * 3 + y, z * 7 - y, 4) < 0.012) b = B.COAL_ORE;
      if (desert && y < h && y >= h - 8 && h > SEA + 6) b = (y % 3 === 0) ? B.TERRACOTTA : (y % 3 === 1 ? B.RED_SAND : B.SANDSTONE);
      data[base + layer * y] = b;
    }
    for (let y = h + 1; y <= SEA; y++) data[base + layer * y] = B.WATER;
  }
  return land;
}

// --- Vegetation -------------------------------------------------------------
export function oakTree(world, x, y, z, r, leaf = B.OAK_LEAVES, trunk = 4) {
  const h = trunk + Math.floor(r() * 3);
  for (let i = 1; i <= h; i++) world.put(x, y + i, z, B.OAK_LOG);
  for (let dy = h - 2; dy <= h + 1; dy++) {
    const rad = dy >= h ? 1 : 2;
    for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
      if (Math.abs(dx) === rad && Math.abs(dz) === rad && (dy === h + 1 || r() < 0.5)) continue;
      if (world.get(x + dx, y + dy, z + dz) === 0) world.put(x + dx, y + dy, z + dz, leaf);
    }
  }
}
export function spruceTree(world, x, y, z, r, big = false) {
  const h = (big ? 13 : 6) + Math.floor(r() * (big ? 7 : 4));
  const tw = big ? 2 : 1;
  for (let i = 1; i <= h; i++) for (let a = 0; a < tw; a++) for (let b = 0; b < tw; b++) world.put(x + a, y + i, z + b, B.SPRUCE_LOG);
  const start = big ? 5 : 2;
  for (let dy = start; dy <= h + 1; dy++) {
    const k = h + 1 - dy;
    let rad = Math.min(big ? 5 : 3, 1 + Math.floor(k / (big ? 2.6 : 2)));
    if (k % 2 === 1 && rad > 1) rad--;
    if (dy === h + 1) rad = 0;
    for (let dx = -rad; dx <= rad + tw - 1; dx++) for (let dz = -rad; dz <= rad + tw - 1; dz++) {
      const ex = dx < 0 ? -dx : dx > tw - 1 ? dx - tw + 1 : 0, ez = dz < 0 ? -dz : dz > tw - 1 ? dz - tw + 1 : 0;
      if (ex + ez > rad + 0.5) continue;
      if (world.get(x + dx, y + dy, z + dz) === 0) world.put(x + dx, y + dy, z + dz, B.SPRUCE_LEAVES);
    }
  }
}
function cactus(world, x, y, z, r) { const h = 1 + Math.floor(r() * 3); for (let i = 1; i <= h; i++) world.put(x, y + i, z, B.CACTUS); }

export function plantVegetation(world, r) {
  const { height, reserved } = world;
  for (let z = 2; z < D - 2; z++) for (let x = 2; x < W - 2; x++) {
    const i = x + z * W;
    if (reserved[i]) continue;
    const h = height[i];
    if (h <= SEA + 1) continue;
    const top = world.get(x, h, z);
    if (top !== B.GRASS && top !== B.SNOWY_GRASS && top !== B.SAND && top !== B.RED_SAND) continue;
    const lon = lonOf(x), lat = latOf(z), hv = hash2(x, z, 77), forest = fbm(x / 40, z / 40, 31);
    if (top === B.SAND || top === B.RED_SAND) {
      if (isDesert(x, z) && hv < 0.004) cactus(world, x, h, z, r);
      continue;
    }
    let p = 0, kind = "oak";
    if (h > SEA + 40) continue;
    if (lon < -116 && lat > 41.5) { p = 0.05 + 0.03 * forest; kind = "spruce"; }
    else if (lat > 48.5) { p = 0.025 + 0.02 * forest; kind = "spruce"; }
    else if (h > SEA + 17 && lon < -103) { p = 0.016; kind = "spruce"; }
    else if (lon > -95.5) { p = Math.max(0, 0.018 + 0.03 * forest); kind = lat > 44 && hv < 0.3 ? "spruce" : "oak"; }
    else if (lon > -104) p = 0.0025;
    else p = 0.004;
    if (hv < p) {
      // Nicht direkt neben Gleisen oder anderen Stämmen
      if (reserved[i + 1] || reserved[i - 1] || reserved[i + W] || reserved[i - W]) continue;
      if (kind === "spruce") spruceTree(world, x, h, z, r); else oakTree(world, x, h, z, r);
    }
  }
}

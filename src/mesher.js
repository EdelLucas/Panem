// Greedy-Mesher mit Umgebungsverdeckung (AO) im Blockstil.
// Liefert pro Chunk reine Arrays (Position, UV, Textur-Ebene, Helligkeit), unabhängig von Three.js.
import { BLOCKS, OPAQUE, CUTOUT, B } from "./blocks.js";
import { CHUNK } from "./world.js";

const TILES_OF = BLOCKS.map(b => b.tiles);
const AO_CURVE = [0.5, 0.68, 0.84, 1.0];
// Grundhelligkeit pro Achse/Richtung: x, y, z
const FACE_SHADE = [[0.62, 0.62], [0.5, 1.0], [0.8, 0.8]];

class Buf {
  constructor() { this.pos = []; this.uv = []; this.layer = []; this.shade = []; this.idx = []; this.n = 0; }
}

export function meshChunk(world, cx, cz) {
  const { W, H, D, data } = world;
  const ci = cx + cz * world.ncx;
  let minY = world.chunkMin[ci];
  for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = cx + ox, nz = cz + oz;
    if (nx >= 0 && nz >= 0 && nx < world.ncx && nz < world.ncz) minY = Math.min(minY, world.chunkMin[nx + nz * world.ncx]);
  }
  const x0 = cx * CHUNK, z0 = cz * CHUNK, y0 = Math.max(0, minY - 1);
  const y1 = Math.min(H - 1, world.chunkMax[ci] + 1);
  const size = [Math.min(CHUNK, W - x0), y1 - y0 + 1, Math.min(CHUNK, D - z0)];
  const origin = [x0, y0, z0];
  const layerStride = W * D;
  const g = (x, y, z) => {
    if (x < 0 || z < 0 || x >= W || z >= D || y >= H) return 0;
    if (y < 0) return B.STONE;
    return data[x + W * z + layerStride * y];
  };
  const opaque = new Buf(), water = new Buf();
  const p = [0, 0, 0], q = [0, 0, 0];

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, v = (d + 2) % 3;
    const su = size[u], sv = size[v];
    const mask = new Int32Array(su * sv);
    const wmask = new Int32Array(su * sv);
    for (const dir of [-1, 1]) {
      for (let s = 0; s < size[d]; s++) {
        let any = false, wany = false;
        for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) {
          p[d] = s; p[u] = i; p[v] = j;
          const gx = p[0] + x0, gy = p[1] + y0, gz = p[2] + z0;
          const b = g(gx, gy, gz);
          const k = i + j * su;
          mask[k] = 0; wmask[k] = 0;
          if (b === 0) continue;
          q[0] = gx; q[1] = gy; q[2] = gz; q[d] += dir;
          const n = g(q[0], q[1], q[2]);
          if (b === B.WATER) {
            // Wasser unterhalb/auf Meeresniveau übernimmt die Wasserfläche
            if (gy > world.SEA && (n === 0 || (CUTOUT[n] && n !== B.WATER))) { wmask[k] = 1; wany = true; }
            continue;
          }
          let vis;
          if (n === 0 || n === B.WATER) vis = true;
          else if (OPAQUE[n]) vis = false;
          else vis = n !== b;
          if (!vis) continue;
          // AO an den vier Ecken
          // Nachbarn in der Ebene vor der Fläche: n8[0..7] = (-u), (+u), (-v), (+v), (-u-v), (+u-v), (+u+v), (-u+v)
          let key = 0;
          const qu = q[u], qv = q[v];
          q[u] = qu - 1; const um = OPAQUE[g(q[0], q[1], q[2])];
          q[u] = qu + 1; const up = OPAQUE[g(q[0], q[1], q[2])];
          q[u] = qu; q[v] = qv - 1; const vm = OPAQUE[g(q[0], q[1], q[2])];
          q[v] = qv + 1; const vp = OPAQUE[g(q[0], q[1], q[2])];
          q[u] = qu - 1; q[v] = qv - 1; const mm = OPAQUE[g(q[0], q[1], q[2])];
          q[u] = qu + 1; const pm = OPAQUE[g(q[0], q[1], q[2])];
          q[v] = qv + 1; const pp = OPAQUE[g(q[0], q[1], q[2])];
          q[u] = qu - 1; const mp = OPAQUE[g(q[0], q[1], q[2])];
          q[u] = qu; q[v] = qv;
          if (um | up | vm | vp | mm | pm | pp | mp) {
            const ao0 = um && vm ? 0 : 3 - (um + vm + mm);
            const ao1 = up && vm ? 0 : 3 - (up + vm + pm);
            const ao2 = up && vp ? 0 : 3 - (up + vp + pp);
            const ao3 = um && vp ? 0 : 3 - (um + vp + mp);
            key = (ao0 << 8) | (ao1 << 10) | (ao2 << 12) | (ao3 << 14);
          } else key = (3 << 8) | (3 << 10) | (3 << 12) | (3 << 14);
          const tl = TILES_OF[b];
          const tile = d === 1 ? (dir > 0 ? tl[0] : tl[2]) : tl[1];
          mask[k] = (tile + 1) | key;
          any = true;
        }
        if (any) greedy(mask, su, sv, d, u, v, s, dir, opaque, origin, false);
        if (wany) greedy(wmask, su, sv, d, u, v, s, dir, water, origin, true);
      }
    }
  }
  return { opaque: pack(opaque), water: pack(water) };
}

function greedy(mask, su, sv, d, u, v, s, dir, buf, origin, isWater) {
  for (let j = 0; j < sv; j++) {
    for (let i = 0; i < su;) {
      const key = mask[i + j * su];
      if (!key) { i++; continue; }
      let wdt = 1;
      while (i + wdt < su && mask[i + wdt + j * su] === key) wdt++;
      let hgt = 1;
      outer: while (j + hgt < sv) {
        for (let k = 0; k < wdt; k++) if (mask[i + k + (j + hgt) * su] !== key) break outer;
        hgt++;
      }
      emit(buf, key, d, u, v, s, dir, i, j, wdt, hgt, origin, isWater);
      for (let b = 0; b < hgt; b++) for (let a = 0; a < wdt; a++) mask[i + a + (j + b) * su] = 0;
      i += wdt;
    }
  }
}

function emit(buf, key, d, u, v, s, dir, i, j, wdt, hgt, origin, isWater) {
  const tile = isWater ? 33 : (key & 255) - 1;
  const ao = isWater ? [3, 3, 3, 3] : [(key >> 8) & 3, (key >> 10) & 3, (key >> 12) & 3, (key >> 14) & 3];
  const base = [0, 0, 0];
  base[d] = s + (dir > 0 ? 1 : 0); base[u] = i; base[v] = j;
  const corners = [[0, 0], [wdt, 0], [wdt, hgt], [0, hgt]];
  const sAxis = d === 0 ? 2 : 0, tAxis = d === 1 ? 2 : 1;
  const fs = FACE_SHADE[d][dir > 0 ? 1 : 0];
  const n0 = buf.n;
  for (let c = 0; c < 4; c++) {
    const pt = base.slice(); pt[u] += corners[c][0]; pt[v] += corners[c][1];
    let y = pt[1] + origin[1];
    if (isWater && d === 1 && dir > 0) y -= 0.12;
    buf.pos.push(pt[0] + origin[0], y, pt[2] + origin[2]);
    buf.uv.push(pt[sAxis], pt[tAxis]);
    buf.layer.push(tile);
    buf.shade.push(Math.round(255 * fs * AO_CURVE[ao[c]]));
  }
  const flip = ao[0] + ao[2] < ao[1] + ao[3];
  let tri = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];
  if (dir < 0) tri = [tri[0], tri[2], tri[1], tri[3], tri[5], tri[4]];
  for (const t of tri) buf.idx.push(n0 + t);
  buf.n += 4;
}

function pack(b) {
  if (!b.n) return null;
  return {
    position: new Float32Array(b.pos), uv: new Float32Array(b.uv),
    layer: new Uint8Array(b.layer), shade: new Uint8Array(b.shade),
    index: b.n > 65535 ? new Uint32Array(b.idx) : new Uint16Array(b.idx), count: b.n
  };
}

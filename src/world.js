// Voxel-Speicher der Welt: ein großes Uint8Array, in 32×32-Chunks gerendert.
import { OPAQUE, B } from "./blocks.js";

export const CHUNK = 32;

export class World {
  constructor(W, H, D, sea) {
    this.W = W; this.H = H; this.D = D; this.SEA = sea;
    this.data = new Uint8Array(W * H * D);
    this.height = new Int16Array(W * D);      // Geländeoberkante (ohne Bäume)
    this.reserved = new Uint8Array(W * D);    // 0 = frei, sonst Region-Index + 1 bzw. 255 = Gleis
    this.ncx = Math.ceil(W / CHUNK); this.ncz = Math.ceil(D / CHUNK);
    this.chunkMin = new Int16Array(this.ncx * this.ncz);
    this.chunkMax = new Int16Array(this.ncx * this.ncz);
    this.dirty = new Set();
  }
  idx(x, y, z) { return x + this.W * (z + this.D * y); }
  inside(x, y, z) { return x >= 0 && z >= 0 && y >= 0 && x < this.W && z < this.D && y < this.H; }
  get(x, y, z) {
    if (x < 0 || z < 0 || x >= this.W || z >= this.D || y >= this.H) return 0;
    if (y < 0) return B.STONE;
    return this.data[x + this.W * (z + this.D * y)];
  }
  // Schnelles Setzen während der Generierung (ohne Chunk-Verwaltung)
  put(x, y, z, id) {
    if (x < 0 || z < 0 || y < 0 || x >= this.W || z >= this.D || y >= this.H) return;
    this.data[x + this.W * (z + this.D * y)] = id;
  }
  fill(x0, y0, z0, x1, y1, z1, id) {
    const ax = Math.max(0, Math.min(x0, x1)), bx = Math.min(this.W - 1, Math.max(x0, x1));
    const ay = Math.max(0, Math.min(y0, y1)), by = Math.min(this.H - 1, Math.max(y0, y1));
    const az = Math.max(0, Math.min(z0, z1)), bz = Math.min(this.D - 1, Math.max(z0, z1));
    for (let y = ay; y <= by; y++) for (let z = az; z <= bz; z++) {
      const base = this.W * (z + this.D * y);
      for (let x = ax; x <= bx; x++) this.data[base + x] = id;
    }
  }
  // Setzen im Spiel: aktualisiert Chunk-Grenzen und markiert Chunks zum Neuaufbau
  set(x, y, z, id) {
    if (!this.inside(x, y, z)) return false;
    this.data[this.idx(x, y, z)] = id;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK), ci = cx + cz * this.ncx;
    if (id !== 0 && y > this.chunkMax[ci]) this.chunkMax[ci] = y;
    if (!OPAQUE[id] && y < this.chunkMin[ci]) this.chunkMin[ci] = y;
    this.dirty.add(ci);
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    if (lx === 0 && cx > 0) this.dirty.add(ci - 1);
    if (lx === CHUNK - 1 && cx < this.ncx - 1) this.dirty.add(ci + 1);
    if (lz === 0 && cz > 0) this.dirty.add(ci - this.ncx);
    if (lz === CHUNK - 1 && cz < this.ncz - 1) this.dirty.add(ci + this.ncx);
    return true;
  }
  // Oberster fester Block einer Säule (inkl. Bauwerke/Bäume)
  top(x, z) {
    if (x < 0 || z < 0 || x >= this.W || z >= this.D) return 0;
    for (let y = this.H - 1; y > 0; y--) { const b = this.data[x + this.W * (z + this.D * y)]; if (b !== 0) return y; }
    return 0;
  }
  computeChunkBounds() {
    const { W, D, H, data } = this;
    this.chunkMin.fill(H); this.chunkMax.fill(0);
    const layer = W * D;
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const ci = Math.floor(x / CHUNK) + Math.floor(z / CHUNK) * this.ncx;
      const col = x + W * z;
      let top = 0;
      for (let y = H - 1; y >= 0; y--) if (data[col + layer * y] !== 0) { top = y; break; }
      let low = top + 1;
      for (let y = 0; y <= top; y++) if (!OPAQUE[data[col + layer * y]]) { low = y; break; }
      if (top > this.chunkMax[ci]) this.chunkMax[ci] = top;
      if (low < this.chunkMin[ci]) this.chunkMin[ci] = low;
    }
  }
}

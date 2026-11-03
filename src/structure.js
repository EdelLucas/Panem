// Ein Bauplan: Blockraster (1 Block = 1 m) plus Zuordnung jedes Blocks zu einem Bauteil.
// Lokale Achsen wie in Minecraft: +X = Osten, +Y = oben, +Z = Süden.
export class Structure {
  constructor(w, h, d) {
    this.w = w; this.h = h; this.d = d;
    this.data = new Uint8Array(w * h * d);
    this.part = new Uint8Array(w * h * d);
    this.parts = [];
    this.cur = 0;
  }
  // Reihenfolge wie im Sponge-Schematic-Format: x + z*W + y*W*L
  i(x, y, z) { return x + this.w * (z + this.d * y); }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d; }
  get(x, y, z) { return this.inside(x, y, z) ? this.data[this.i(x, y, z)] : 0; }
  beginPart(name, note = "") { this.parts.push({ name, note }); this.cur = this.parts.length - 1; return this; }
  set(x, y, z, id) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    if (!this.inside(x, y, z)) return;
    const k = this.i(x, y, z);
    this.data[k] = id; this.part[k] = this.cur;
  }
  fill(x0, y0, z0, x1, y1, z1, id) {
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1), az = Math.min(z0, z1), bz = Math.max(z0, z1);
    for (let y = ay; y <= by; y++) for (let z = az; z <= bz; z++) for (let x = ax; x <= bx; x++) this.set(x, y, z, id);
  }
  // Nur die vier Außenwände eines Quaders
  walls(x0, y0, z0, x1, y1, z1, id) {
    this.fill(x0, y0, z0, x1, y1, z0, id); this.fill(x0, y0, z1, x1, y1, z1, id);
    this.fill(x0, y0, z0, x0, y1, z1, id); this.fill(x1, y0, z0, x1, y1, z1, id);
  }
  // Rand (Ring) einer Ebene
  ring(x0, y, z0, x1, z1, id) { this.walls(x0, y, z0, x1, y, z1, id); }
  // Zylinder um (cx, cz); hollow = nur Mantel (1 Block dick)
  cyl(cx, cz, r, y0, y1, id, hollow = false) {
    const R = Math.ceil(r);
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const dd = Math.hypot(dx, dz);
      if (dd > r + 0.4) continue;
      if (hollow && this._inner(dx, dz, r)) continue;
      this.fill(cx + dx, y0, cz + dz, cx + dx, y1, cz + dz, id);
    }
  }
  _inner(dx, dz, r) { // Block liegt innen, wenn alle 4 Nachbarn ebenfalls im Kreis liegen
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => Math.hypot(dx + a, dz + b) <= r + 0.4);
  }
  // Halbkugel-Schale (Kuppel) mit Mittelpunkt (cx, cy, cz)
  dome(cx, cy, cz, r, id) {
    const R = Math.ceil(r);
    for (let y = 0; y <= R; y++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, y, dz);
      if (d > r + 0.4) continue;
      const inner = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]].every(([a, b, c]) => Math.hypot(dx + a, y + b, dz + c) <= r + 0.4);
      if (!inner) this.set(cx + dx, cy + y, cz + dz, id);
    }
  }
  // Statistik
  counts(filter) {
    const c = new Map();
    for (let k = 0; k < this.data.length; k++) {
      const id = this.data[k];
      if (!id || (filter && !filter(k))) continue;
      c.set(id, (c.get(id) || 0) + 1);
    }
    return c;
  }
  partCounts() {
    const n = new Array(this.parts.length).fill(0);
    for (let k = 0; k < this.data.length; k++) if (this.data[k]) n[this.part[k]]++;
    return n;
  }
}

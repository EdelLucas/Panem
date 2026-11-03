// Einfacher Mesher für Baupläne: sichtbare Flächen pro Bauteil, optional nur bis zu einer Schicht (yMax).
import { BLOCKS, OPAQUE } from "./blocks.js";

const FACES = [
  // Richtung, Ecken (Einheitswürfel), Helligkeit, Textur-Index (0 oben, 1 Seite, 2 unten), UV-Achsen
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.7, t: 1 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.7, t: 1 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0, t: 0 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.5, t: 2 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.85, t: 1 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.85, t: 1 }
];
const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];

// Liefert pro Bauteil ein Array-Paket für eine BufferGeometry
export function meshStructure(s, { yMax = Infinity, visible = null } = {}) {
  const { w, h, d, data, part } = s;
  const out = s.parts.map(() => ({ pos: [], uv: [], layer: [], shade: [], idx: [], n: 0 }));
  const top = Math.min(h - 1, yMax);
  const at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w || z >= d || y > top) ? -1 : x + w * (z + d * y);
  for (let y = 0; y <= top; y++) for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
    const k = x + w * (z + d * y), id = data[k];
    if (!id) continue;
    const p = part[k];
    if (visible && !visible[p]) continue;
    const tiles = BLOCKS[id].tiles, buf = out[p];
    for (const f of FACES) {
      const nk = at(x + f.n[0], y + f.n[1], z + f.n[2]);
      if (nk >= 0) {
        const nb = data[nk];
        // Fläche verdeckt, wenn der Nachbar undurchsichtig ist und zum selben (sichtbaren) Bauteil gehört
        if (nb && part[nk] === p && (OPAQUE[nb] || nb === id)) continue;
      }
      const n0 = buf.n;
      for (let c = 0; c < 4; c++) {
        buf.pos.push(x + f.c[c][0], y + f.c[c][1], z + f.c[c][2]);
        buf.uv.push(UV[c][0], UV[c][1]);
        buf.layer.push(tiles[f.t]);
        buf.shade.push(Math.round(255 * f.s));
      }
      buf.idx.push(n0, n0 + 1, n0 + 2, n0, n0 + 2, n0 + 3);
      buf.n += 4;
    }
  }
  return out.map(b => b.n ? {
    position: new Float32Array(b.pos), uv: new Float32Array(b.uv), layer: new Uint8Array(b.layer), shade: new Uint8Array(b.shade),
    index: b.n > 65535 ? new Uint32Array(b.idx) : new Uint16Array(b.idx)
  } : null);
}

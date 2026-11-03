// Export als Sponge-Schematic v2 (.schem) – lesbar von WorldEdit, FAWE und Litematica.
import { BLOCKS } from "./blocks.js";

const DATA_VERSION = 3955; // Minecraft Java 1.21.1 (ältere/neuere Versionen werden von WorldEdit angepasst)

class NBTWriter {
  constructor() { this.buf = new Uint8Array(1 << 16); this.n = 0; }
  ensure(k) { if (this.n + k > this.buf.length) { let s = this.buf.length; while (s < this.n + k) s *= 2; const b = new Uint8Array(s); b.set(this.buf.subarray(0, this.n)); this.buf = b; } }
  u8(v) { this.ensure(1); this.buf[this.n++] = v & 255; }
  i16(v) { this.u8(v >> 8); this.u8(v); }
  i32(v) { this.u8(v >>> 24); this.u8(v >>> 16); this.u8(v >>> 8); this.u8(v); }
  str(s) { const b = new TextEncoder().encode(s); this.i16(b.length); this.bytes(b); }
  bytes(b) { this.ensure(b.length); this.buf.set(b, this.n); this.n += b.length; }
  tag(type, name) { this.u8(type); this.str(name); }
  result() { return this.buf.subarray(0, this.n); }
}

// mask(k) entscheidet, ob ein Block exportiert wird (z. B. nur sichtbare Bauteile)
export function buildSchem(structure, mask, meta = {}) {
  const { w, h, d, data } = structure;
  const palette = new Map([["minecraft:air", 0]]);
  const blockData = new NBTWriter();
  for (let k = 0; k < data.length; k++) {
    const id = data[k];
    let state = "minecraft:air";
    if (id && (!mask || mask(k))) state = BLOCKS[id].java;
    let p = palette.get(state);
    if (p === undefined) { p = palette.size; palette.set(state, p); }
    // VarInt
    let v = p;
    while (v >= 0x80) { blockData.u8((v & 0x7f) | 0x80); v >>>= 7; }
    blockData.u8(v);
  }
  const t = new NBTWriter();
  t.tag(10, "Schematic");
  t.tag(3, "Version"); t.i32(2);
  t.tag(3, "DataVersion"); t.i32(DATA_VERSION);
  t.tag(2, "Width"); t.i16(w);
  t.tag(2, "Height"); t.i16(h);
  t.tag(2, "Length"); t.i16(d);
  t.tag(11, "Offset"); t.i32(3); t.i32(0); t.i32(0); t.i32(0);
  t.tag(3, "PaletteMax"); t.i32(palette.size);
  t.tag(10, "Palette");
  for (const [state, idx] of palette) { t.tag(3, state); t.i32(idx); }
  t.u8(0);
  const bd = blockData.result();
  t.tag(7, "BlockData"); t.i32(bd.length); t.bytes(bd);
  t.tag(10, "Metadata");
  t.tag(8, "Name"); t.str(meta.name || "PanemCraft");
  t.tag(8, "Author"); t.str("PanemCraft Bauanleitung");
  t.tag(3, "WEOffsetX"); t.i32(0); t.tag(3, "WEOffsetY"); t.i32(0); t.tag(3, "WEOffsetZ"); t.i32(0);
  t.u8(0);
  t.u8(0);
  return t.result();
}

export async function gzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

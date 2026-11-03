// PanemCraft Bauanleitung: Lageplan, Bauteile, Schichtpläne, Materiallisten und .schem-Export.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { BLOCKS, TILE_INDEX } from "./blocks.js";
import { generateTextures } from "./textures.js";
import { BUILDINGS } from "./capitol.js";
import { meshStructure } from "./smesh.js";
import { buildSchem, gzip } from "./schem.js";

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString("de-DE");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* nicht verfügbar */ } }
};

// ---------------------------------------------------------------------------
// Texturen & Icons
const tex = generateTextures();
const tileCanvases = tex.rows.map(rows => {
  const c = document.createElement("canvas"); c.width = c.height = 16;
  c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(rows), 16, 16), 0, 0);
  return c;
});
function drawIcon(canvas, id) {
  const S = canvas.width, ctx = canvas.getContext("2d"), [top, side] = BLOCKS[id].tiles;
  ctx.clearRect(0, 0, S, S); ctx.imageSmoothingEnabled = false;
  const faces = [[tileCanvases[top], [S / 32, S / 64, -S / 32, S / 64, S / 2, 0], 0], [tileCanvases[side], [S / 32, S / 64, 0, S / 32, 0, S / 4], 0.25], [tileCanvases[side], [S / 32, -S / 64, 0, S / 32, S / 2, S / 2], 0.42]];
  for (const [img, m, dark] of faces) {
    ctx.setTransform(...m); ctx.drawImage(img, 0, 0, 16, 16);
    if (dark) { ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, 16, 16); ctx.globalCompositeOperation = "source-over"; }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
const iconCache = new Map();
function iconURL(id) {
  if (!iconCache.has(id)) { const c = document.createElement("canvas"); c.width = c.height = 32; drawIcon(c, id); iconCache.set(id, c.toDataURL()); }
  return iconCache.get(id);
}
const topColor = id => tex.avg[BLOCKS[id].tiles[0]];

// ---------------------------------------------------------------------------
// Zustand
const structures = new Map();
const getStructure = b => { if (!structures.has(b.id)) structures.set(b.id, b.make()); return structures.get(b.id); };
let origin = store.get("panemcraft.bau.origin", { x: 0, y: 64, z: 0 });
let done = store.get("panemcraft.bau.done", {});
let current = null, struct = null, visible = [], layer = 0, focusPart = -1;
const PART_COLORS = ["#e2c27d", "#8fc0a9", "#d98579", "#88a7d8", "#c49be0", "#e0a86b", "#7fd0d6", "#b5d17a", "#e48fb5", "#a3a3a3", "#d8d36a", "#6fb3a0", "#c7826b", "#8a8fe0", "#e6b0a0", "#9ed39e", "#d6a5d6"];

const abs = (b, x, y, z) => ({ x: origin.x + b.at[0] + x, y: origin.y + 1 + y - b.sink, z: origin.z + b.at[1] + z });
const xyz = p => `${p.x} / ${p.y} / ${p.z}`;

["ox", "oy", "oz"].forEach((id, i) => {
  const el = $(id); el.value = origin["xyz"[i]];
  el.addEventListener("input", () => { origin["xyz"[i]] = Math.round(Number(el.value) || 0); store.set("panemcraft.bau.origin", origin); refreshCoords(); });
});
function refreshCoords() { if (current) { renderFacts(); drawLayer(); } else renderSite(); }

// ---------------------------------------------------------------------------
// Gebäudeliste
function renderList() {
  const nav = $("buildingList");
  let html = `<a href="#lageplan" data-id="lageplan" class="${!current ? "active" : ""}"><canvas data-icon="map"></canvas><span><b>Lageplan</b><small>Übersicht & Koordinaten</small></span></a><div class="sep"></div>`;
  for (const b of BUILDINGS) {
    const s = getStructure(b);
    html += `<a href="#${b.id}" data-id="${b.id}" class="${current === b ? "active" : ""}"><img src="${iconURL(mainBlock(s))}" width="28" height="28" alt=""><span><b>${esc(b.name)}</b><small>${s.w} × ${s.h} × ${s.d} · ${s.parts.length} Bauteile</small></span></a>`;
  }
  nav.innerHTML = html;
  const mc = nav.querySelector("[data-icon=map]"); mc.width = mc.height = 28;
  const g = mc.getContext("2d"); g.fillStyle = "#3d6f45"; g.fillRect(2, 2, 24, 24); g.fillStyle = "#e2c27d"; g.fillRect(11, 11, 6, 6); g.strokeStyle = "#ddd"; g.strokeRect(2.5, 2.5, 23, 23);
}
function mainBlock(s) {
  const c = s.counts(); let best = 0, bn = 0;
  for (const [id, n] of c) if (n > bn && BLOCKS[id].key !== "polished_andesite" && BLOCKS[id].key !== "smooth_stone") { bn = n; best = id; }
  return best || 1;
}

// ---------------------------------------------------------------------------
// Lageplan
function renderSite() {
  let minX = 1e9, minZ = 1e9, maxX = -1e9, maxZ = -1e9;
  for (const b of BUILDINGS) { const s = getStructure(b); minX = Math.min(minX, b.at[0]); minZ = Math.min(minZ, b.at[1]); maxX = Math.max(maxX, b.at[0] + s.w); maxZ = Math.max(maxZ, b.at[1] + s.d); }
  const pad = 30; minX -= pad; minZ -= pad; maxX += pad; maxZ += pad;
  const sc = 2, c = $("siteCanvas"), W = (maxX - minX) * sc, Hh = (maxZ - minZ) * sc;
  c.width = W; c.height = Hh;
  const g = c.getContext("2d");
  g.fillStyle = "#3b5e3a"; g.fillRect(0, 0, W, Hh);
  // Raster alle 50 Blöcke
  g.font = "11px JetBrains Mono, monospace"; g.fillStyle = "#cfd6cc";
  for (let x = Math.ceil(minX / 50) * 50; x <= maxX; x += 50) { g.strokeStyle = x === 0 ? "#e2c27d88" : "#ffffff22"; g.beginPath(); g.moveTo((x - minX) * sc + .5, 0); g.lineTo((x - minX) * sc + .5, Hh); g.stroke(); g.fillText("X " + (origin.x + x), (x - minX) * sc + 3, 12); }
  for (let z = Math.ceil(minZ / 50) * 50; z <= maxZ; z += 50) { g.strokeStyle = z === 0 ? "#e2c27d88" : "#ffffff22"; g.beginPath(); g.moveTo(0, (z - minZ) * sc + .5); g.lineTo(W, (z - minZ) * sc + .5); g.stroke(); g.fillText("Z " + (origin.z + z), 3, (z - minZ) * sc - 3); }
  // Draufsicht der Gebäude
  const img = g.getImageData(0, 0, W, Hh);
  for (const b of BUILDINGS) {
    const s = getStructure(b);
    for (let z = 0; z < s.d; z++) for (let x = 0; x < s.w; x++) {
      let y = s.h - 1; while (y >= 0 && !s.data[s.i(x, y, z)]) y--;
      if (y < 0) continue;
      const col = topColor(s.data[s.i(x, y, z)]), f = 0.75 + 0.35 * (y / s.h);
      for (let a = 0; a < sc; a++) for (let bb = 0; bb < sc; bb++) {
        const px = (b.at[0] + x - minX) * sc + a, pz = (b.at[1] + z - minZ) * sc + bb, k = (pz * W + px) * 4;
        img.data[k] = Math.min(255, col[0] * f); img.data[k + 1] = Math.min(255, col[1] * f); img.data[k + 2] = Math.min(255, col[2] * f);
      }
    }
  }
  g.putImageData(img, 0, 0);
  g.font = "600 13px Inter, sans-serif"; g.textAlign = "center";
  for (const b of BUILDINGS) {
    const s = getStructure(b), cx = (b.at[0] + s.w / 2 - minX) * sc, cz = (b.at[1] + s.d / 2 - minZ) * sc;
    g.strokeStyle = "#000c"; g.lineWidth = 4; g.strokeText(b.name, cx, cz); g.fillStyle = "#fff"; g.fillText(b.name, cx, cz);
  }
  g.fillStyle = "#e2c27d"; g.beginPath(); g.arc(-minX * sc, -minZ * sc, 5, 0, Math.PI * 2); g.fill();
  g.textAlign = "left"; g.fillStyle = "#fff"; g.fillText(`Ursprung ${xyz(origin)}`, -minX * sc + 8, -minZ * sc - 8);
  g.fillText("N ↑", W - 40, 20);
  c.onclick = e => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W / sc + minX, z = (e.clientY - r.top) / r.height * Hh / sc + minZ;
    const hit = BUILDINGS.find(b => { const s = getStructure(b); return x >= b.at[0] && z >= b.at[1] && x < b.at[0] + s.w && z < b.at[1] + s.d; });
    if (hit) location.hash = hit.id;
  };
  $("siteTable").innerHTML = BUILDINGS.map(b => {
    const s = getStructure(b), n = s.partCounts().reduce((a, c) => a + c, 0);
    return `<tr><td><a href="#${b.id}">${esc(b.name)}</a></td><td class="num">${s.w} × ${s.h} × ${s.d}</td><td class="num">${fmt(n)}</td><td class="num">${xyz(abs(b, 0, 0, 0))}</td><td class="num">${xyz(abs(b, s.w - 1, s.h - 1, s.d - 1))}</td><td><a href="#${b.id}">Bauplan →</a></td></tr>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// 3D-Ansicht
THREE.ColorManagement.enabled = false;
const canvas3d = $("view3d");
const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
const scene = new THREE.Scene(); scene.background = new THREE.Color("#8fb3d9");
const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 5000);
const controls = new OrbitControls(camera, canvas3d); controls.enableDamping = true; controls.dampingFactor = 0.1;
const atlas = new THREE.DataArrayTexture(tex.data, 16, 16, tex.count);
atlas.magFilter = THREE.NearestFilter; atlas.minFilter = THREE.NearestMipmapLinearFilter; atlas.generateMipmaps = true;
atlas.wrapS = atlas.wrapT = THREE.RepeatWrapping; atlas.anisotropy = renderer.capabilities.getMaxAnisotropy(); atlas.needsUpdate = true;
const mat = new THREE.ShaderMaterial({
  uniforms: { atlas: { value: atlas }, cutY: { value: -1000 }, lightLayer: { value: TILE_INDEX.sea_lantern } },
  vertexShader: `attribute float layer; attribute float shade; varying vec2 vUv; varying float vLayer; varying float vShade; varying float vY;
    void main(){ vUv=uv; vLayer=layer; vShade=shade; vec4 wp = modelMatrix*vec4(position,1.0); vY = position.y; gl_Position = projectionMatrix*viewMatrix*wp; }`,
  fragmentShader: `precision highp float; precision highp sampler2DArray;
    uniform sampler2DArray atlas; uniform float cutY; uniform float lightLayer;
    varying vec2 vUv; varying float vLayer; varying float vShade; varying float vY;
    void main(){ vec4 c = texture(atlas, vec3(vUv, vLayer)); if (c.a < 0.5) discard;
      float s = abs(vLayer - lightLayer) < 0.5 ? 1.1 : vShade; vec3 col = c.rgb * s;
      if (vY > cutY - 0.01 && vY < cutY + 1.01) col = mix(col, vec3(1.0, 0.85, 0.35), 0.28);
      gl_FragColor = vec4(col, 1.0); }`
});
const root = new THREE.Group(); scene.add(root);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x4f7a45 }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);
const gridHelper = new THREE.GridHelper(1, 1, 0x000000, 0x000000); gridHelper.material.opacity = 0.15; gridHelper.material.transparent = true; scene.add(gridHelper);
let partGroups = [], partCenters = [], center = new THREE.Vector3();

function rebuildMeshes() {
  for (const g of partGroups) { g.traverse(o => o.geometry && o.geometry.dispose()); root.remove(g); }
  partGroups = [];
  const cut = $("cutToggle").checked;
  const meshes = meshStructure(struct, { yMax: cut ? layer : Infinity, visible });
  meshes.forEach((m, p) => {
    const g = new THREE.Group();
    if (m) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(m.position, 3));
      geo.setAttribute("uv", new THREE.BufferAttribute(m.uv, 2));
      geo.setAttribute("layer", new THREE.BufferAttribute(m.layer, 1));
      geo.setAttribute("shade", new THREE.BufferAttribute(m.shade, 1, true));
      geo.setIndex(new THREE.BufferAttribute(m.index, 1));
      geo.computeBoundingSphere();
      g.add(new THREE.Mesh(geo, mat));
    }
    root.add(g); partGroups.push(g);
  });
  mat.uniforms.cutY.value = layer;
  ground.visible = gridHelper.visible = !(cut && layer < current.sink - 1);
  applyExplode();
}
function computeCenters() {
  const sums = struct.parts.map(() => [0, 0, 0, 0]);
  const { w, d, h, data, part } = struct;
  for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) { const k = x + w * (z + d * y); if (data[k]) { const s = sums[part[k]]; s[0] += x; s[1] += y; s[2] += z; s[3]++; } }
  partCenters = sums.map(s => s[3] ? new THREE.Vector3(s[0] / s[3], s[1] / s[3], s[2] / s[3]) : new THREE.Vector3(w / 2, h / 2, d / 2));
  center.set(w / 2, h / 2, d / 2);
}
function applyExplode() {
  const f = Number($("explode").value) / 100;
  partGroups.forEach((g, p) => {
    const dir = partCenters[p].clone().sub(center).setY(0);
    g.position.copy(dir.multiplyScalar(f * 0.9)).add(new THREE.Vector3(0, p * f * Math.max(4, struct.h * 0.12), 0));
  });
}
function resetCamera() {
  const s = struct, r = Math.max(s.w, s.d, s.h);
  controls.target.set(s.w / 2, s.h * 0.35, s.d / 2);
  camera.position.set(s.w / 2 + r * 0.9, s.h * 0.6 + r * 0.6, s.d / 2 + r * 1.15);
  camera.near = 0.5; camera.far = r * 20; camera.updateProjectionMatrix(); controls.update();
}
function resize3d() {
  const box = canvas3d.parentElement, w = box.clientWidth, h = box.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize3d).observe(canvas3d.parentElement);
function loop() { if (current) { controls.update(); renderer.render(scene, camera); } requestAnimationFrame(loop); }

// ---------------------------------------------------------------------------
// Gebäude anzeigen
function openBuilding(b) {
  current = b; struct = getStructure(b);
  visible = struct.parts.map(() => true); focusPart = -1;
  layer = 0;
  computeCenters();
  ground.scale.set(struct.w + 40, struct.d + 40, 1); ground.position.set(struct.w / 2, b.sink - 0.02, struct.d / 2);
  gridHelper.scale.set(struct.w + 40, 1, struct.d + 40); gridHelper.position.set(struct.w / 2, b.sink + 0.01, struct.d / 2);
  $("bEyebrow").textContent = "Das Kapitol · Bauplan";
  $("bName").textContent = b.name; $("bDesc").textContent = b.desc;
  $("layerSlider").max = struct.h - 1; $("layerSlider").value = 0;
  const avail = $("gridScroll").clientWidth - MARGIN - 4;
  if (avail > 0) $("zoom").value = Math.max(4, Math.min(28, Math.floor(avail / struct.w)));
  renderFacts(); renderParts(); resize3d(); resetCamera(); rebuildMeshes(); setLayer(0, true);
}
function renderFacts() {
  const b = current, s = struct, total = s.partCounts().reduce((a, c) => a + c, 0);
  const lo = abs(b, 0, 0, 0), hi = abs(b, s.w - 1, s.h - 1, s.d - 1);
  const facts = [
    ["Maße (B × H × T)", `${s.w} × ${s.h} × ${s.d}`],
    ["Blöcke gesamt", fmt(total)],
    ["Nordwest-Ecke unten", xyz(lo)],
    ["Südost-Ecke oben", xyz(hi)],
    ["Geländehöhe im Plan", b.sink ? `Schicht ${b.sink - 1} = Y ${origin.y}` : `Gebäude steht auf Y ${origin.y}`],
    ["Stacks / Shulker", `${fmt(Math.ceil(total / 64))} / ${(total / 1728).toFixed(1)}`]
  ];
  $("bFacts").innerHTML = facts.map(([k, v]) => `<div class="fact"><small>${k}</small><b>${v}</b></div>`).join("");
}
function renderParts() {
  const n = struct.partCounts();
  $("partList").innerHTML = struct.parts.map((p, i) => `
    <li class="${visible[i] ? "" : "off"} ${focusPart === i ? "focus" : ""}">
      <input type="checkbox" data-vis="${i}" ${visible[i] ? "checked" : ""} aria-label="${esc(p.name)} anzeigen">
      <span class="num">${String(i + 1).padStart(2, "0")}</span>
      <span class="pname"><span class="swatch" style="display:inline-block;background:${PART_COLORS[i % PART_COLORS.length]}"></span> ${esc(p.name)}</span>
      <span class="pcount">${fmt(n[i])} Blöcke</span>
      <span class="pnote">${esc(p.note)}</span>
      <span class="pbtns"><button class="btn small" data-only="${i}">Nur dieses Teil</button><button class="btn small" data-upto="${i}">Bis hier gebaut</button><button class="btn small" data-matpart="${i}">Material</button></span>
    </li>`).join("");
}
$("partList").addEventListener("click", e => {
  const t = e.target;
  if (t.dataset.vis !== undefined) { visible[Number(t.dataset.vis)] = t.checked; focusPart = -1; }
  else if (t.dataset.only !== undefined) { const i = Number(t.dataset.only); visible = visible.map((_, k) => k === i); focusPart = i; }
  else if (t.dataset.upto !== undefined) { const i = Number(t.dataset.upto); visible = visible.map((_, k) => k <= i); focusPart = -1; }
  else if (t.dataset.matpart !== undefined) { const i = Number(t.dataset.matpart); visible = visible.map((_, k) => k === i); focusPart = i; $("matScope").value = "visible"; }
  else return;
  renderParts(); rebuildMeshes(); drawLayer(); renderMaterials();
});
$("allParts").addEventListener("click", () => { visible = visible.map(() => true); focusPart = -1; renderParts(); rebuildMeshes(); drawLayer(); renderMaterials(); });

// ---------------------------------------------------------------------------
// Schichtplan
const doneKey = () => current.id;
const isDone = y => (done[doneKey()] || []).includes(y);
function setLayer(y, force = false) {
  y = Math.max(0, Math.min(struct.h - 1, y));
  if (y === layer && !force) return;
  layer = y; $("layerSlider").value = y;
  const a = abs(current, 0, y, 0).y;
  const under = y === current.sink - 1 ? " (Geländeoberfläche)" : y < current.sink - 1 ? " (unter Gelände)" : "";
  $("layerLabel").textContent = `Schicht ${y + 1}/${struct.h} · Y = ${a}${under}`;
  $("layerDone").checked = isDone(y);
  drawLayer(); renderMaterials();
  if ($("cutToggle").checked) scheduleRemesh(); else mat.uniforms.cutY.value = layer;
}
let remeshPending = false;
function scheduleRemesh() { if (remeshPending) return; remeshPending = true; requestAnimationFrame(() => { remeshPending = false; rebuildMeshes(); }); }
const MARGIN = 26;
function drawLayer() {
  if (!current) return;
  const s = struct, cs = Number($("zoom").value), c = $("layerCanvas"), g = c.getContext("2d");
  c.width = s.w * cs + MARGIN; c.height = s.d * cs + MARGIN;
  g.fillStyle = "#0d0f10"; g.fillRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;
  g.save(); g.translate(MARGIN, MARGIN);
  g.fillStyle = "#1b1f22"; g.fillRect(0, 0, s.w * cs, s.d * cs);
  const vis = k => visible[s.part[k]];
  for (let z = 0; z < s.d; z++) for (let x = 0; x < s.w; x++) {
    const k = s.i(x, layer, z), id = s.data[k];
    if (id && vis(k)) { g.globalAlpha = 1; g.drawImage(tileCanvases[BLOCKS[id].tiles[0]], x * cs, z * cs, cs, cs); }
    else if (layer > 0) {
      const kb = s.i(x, layer - 1, z), ib = s.data[kb];
      if (ib && vis(kb)) { g.globalAlpha = 0.22; g.drawImage(tileCanvases[BLOCKS[ib].tiles[0]], x * cs, z * cs, cs, cs); }
    }
  }
  g.globalAlpha = 1;
  if (focusPart >= 0) { // Fokus-Teil umranden
    g.strokeStyle = PART_COLORS[focusPart % PART_COLORS.length]; g.lineWidth = Math.max(1, cs / 8);
    for (let z = 0; z < s.d; z++) for (let x = 0; x < s.w; x++) { const k = s.i(x, layer, z); if (s.data[k] && s.part[k] === focusPart) g.strokeRect(x * cs + 0.5, z * cs + 0.5, cs - 1, cs - 1); }
  }
  // Raster
  if (cs >= 6) {
    for (let x = 0; x <= s.w; x++) { g.strokeStyle = x % 10 === 0 ? "#ffffff66" : x % 5 === 0 ? "#ffffff38" : "#ffffff14"; g.lineWidth = 1; g.beginPath(); g.moveTo(x * cs + .5, 0); g.lineTo(x * cs + .5, s.d * cs); g.stroke(); }
    for (let z = 0; z <= s.d; z++) { g.strokeStyle = z % 10 === 0 ? "#ffffff66" : z % 5 === 0 ? "#ffffff38" : "#ffffff14"; g.beginPath(); g.moveTo(0, z * cs + .5); g.lineTo(s.w * cs, z * cs + .5); g.stroke(); }
  }
  g.restore();
  // Achsenbeschriftung mit Weltkoordinaten
  g.fillStyle = "#c9ccc7"; g.font = "10px JetBrains Mono, monospace"; g.textAlign = "center";
  const step = cs >= 10 ? 5 : 10;
  for (let x = 0; x < s.w; x += step) g.fillText(String(abs(current, x, 0, 0).x), MARGIN + x * cs + cs / 2, 16);
  g.textAlign = "right";
  for (let z = 0; z < s.d; z += step) g.fillText(String(abs(current, 0, 0, z).z), MARGIN - 3, MARGIN + z * cs + cs / 2 + 3);
  g.textAlign = "left"; g.fillStyle = "#e2c27d"; g.fillText("N↑", 2, 12);
  updateProgress();
}
function updateProgress() {
  const list = done[doneKey()] || [], n = list.length, H = struct.h;
  $("layerProgressBar").style.width = (n / H * 100) + "%";
  $("layerProgressText").textContent = `${n} von ${H} Schichten gebaut`;
}
$("layerCanvas").addEventListener("mousemove", e => {
  if (!current) return;
  const cs = Number($("zoom").value), r = e.target.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left - MARGIN) / cs), z = Math.floor((e.clientY - r.top - MARGIN) / cs);
  if (x < 0 || z < 0 || x >= struct.w || z >= struct.d) { $("cellInfo").textContent = "—"; return; }
  const k = struct.i(x, layer, z), id = struct.data[k], p = abs(current, x, layer, z);
  const txt = id && visible[struct.part[k]] ? `${BLOCKS[id].name} (${BLOCKS[id].java}) · Bauteil: ${struct.parts[struct.part[k]].name}` : "Luft";
  $("cellInfo").textContent = `X ${p.x}  Y ${p.y}  Z ${p.z}  ·  ${txt}`;
});
$("layerSlider").addEventListener("input", e => setLayer(Number(e.target.value)));
$("layerUp").addEventListener("click", () => setLayer(layer + 1));
$("layerDown").addEventListener("click", () => setLayer(layer - 1));
$("zoom").addEventListener("input", drawLayer);
$("layerDone").addEventListener("change", e => {
  const list = new Set(done[doneKey()] || []);
  if (e.target.checked) list.add(layer); else list.delete(layer);
  done[doneKey()] = [...list].sort((a, b) => a - b); store.set("panemcraft.bau.done", done);
  updateProgress(); renderMaterials();
});
addEventListener("keydown", e => {
  if (!current || ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName) && e.target.type !== "range" && e.target.type !== "checkbox") return;
  if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); setLayer(layer + 1); }
  if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); setLayer(layer - 1); }
});
$("cutToggle").addEventListener("change", rebuildMeshes);
$("explode").addEventListener("input", applyExplode);
$("resetCam").addEventListener("click", resetCamera);

// ---------------------------------------------------------------------------
// Materialliste
function renderMaterials() {
  if (!current) return;
  const s = struct, scope = $("matScope").value, plane = s.w * s.d, doneSet = new Set(done[doneKey()] || []);
  let filter;
  if (scope === "visible") filter = k => visible[s.part[k]];
  else if (scope === "layer") filter = k => Math.floor(k / plane) === layer && visible[s.part[k]];
  else if (scope === "remaining") filter = k => !doneSet.has(Math.floor(k / plane));
  const counts = [...s.counts(filter)].sort((a, b) => b[1] - a[1]);
  const total = counts.reduce((a, [, n]) => a + n, 0);
  const stacks = n => { const st = Math.floor(n / 64), r = n % 64; return st ? `${st} × 64${r ? " + " + r : ""}` : String(r); };
  $("matTable").innerHTML = counts.map(([id, n]) => `<tr><td><span class="blk"><img src="${iconURL(id)}" width="22" height="22" alt="">${esc(BLOCKS[id].name)}</span></td><td><code>${esc(BLOCKS[id].java.replace("minecraft:", ""))}</code></td><td class="num">${fmt(n)}</td><td class="num">${stacks(n)}</td><td class="num">${(n / 1728).toFixed(2)}</td></tr>`).join("")
    + `<tr class="sum"><td>Summe</td><td></td><td class="num">${fmt(total)}</td><td class="num">${fmt(Math.ceil(total / 64))} Stacks</td><td class="num">${(total / 1728).toFixed(1)}</td></tr>`;
}
$("matScope").addEventListener("change", renderMaterials);

// ---------------------------------------------------------------------------
// Export
async function exportSchem(onlyVisible) {
  const s = struct, mask = onlyVisible ? k => visible[s.part[k]] : null;
  const bytes = await gzip(buildSchem(s, mask, { name: current.name }));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
  a.download = `panem_${current.id}${onlyVisible ? "_teile" : ""}.schem`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$("exportAll").addEventListener("click", () => exportSchem(false));
$("exportVisible").addEventListener("click", () => exportSchem(true));
$("helpBtn").addEventListener("click", () => $("help").showModal());

// ---------------------------------------------------------------------------
// Routing
function route() {
  const id = location.hash.slice(1);
  const b = BUILDINGS.find(x => x.id === id);
  $("siteView").hidden = !!b; $("buildingView").hidden = !b;
  if (b) { if (current !== b) openBuilding(b); }
  else { current = null; renderSite(); }
  renderList();
  scrollTo(0, 0);
}
addEventListener("hashchange", route);
route();
loop();
window.bau = { BUILDINGS, getStructure, setLayer: y => setLayer(y), get struct() { return struct; } };

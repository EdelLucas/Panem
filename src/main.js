// PanemCraft – Hauptprogramm: Rendering, Übersichtskarte, Erkundungsmodus, Bauen, Teleport.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { BLOCKS, B, SOLID, PLACEABLE, DEFAULT_HOTBAR, TILE_INDEX } from "./blocks.js";
import { generateTextures } from "./textures.js";
import { generateWorld } from "./generate.js";
import { meshChunk } from "./mesher.js";
import { CHUNK } from "./world.js";
import { W, H, D, SEA, REGIONS, REGION, lonOf, latOf } from "./data.js";

const $ = id => document.getElementById(id);
const frame = () => new Promise(r => requestAnimationFrame(() => r()));
const EDITS_KEY = "panemcraft.edits.v1", HOTBAR_KEY = "panemcraft.hotbar.v1";
const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* Speicher nicht verfügbar */ } }
};

// ---------------------------------------------------------------------------
// Texturen, Icons und CSS-Hintergründe
const tex = generateTextures();
function tileCanvas(layer, scale = 1) {
  const c = document.createElement("canvas"); c.width = c.height = 16 * scale;
  const ctx = c.getContext("2d"); const img = new ImageData(new Uint8ClampedArray(tex.rows[layer]), 16, 16);
  if (scale === 1) { ctx.putImageData(img, 0, 0); return c; }
  const t = tileCanvas(layer); ctx.imageSmoothingEnabled = false; ctx.drawImage(t, 0, 0, c.width, c.height); return c;
}
const tileCache = {};
const tileC = l => tileCache[l] || (tileCache[l] = tileCanvas(l));
function drawIcon(canvas, blockId) {
  const S = canvas.width, ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, S, S); ctx.imageSmoothingEnabled = false;
  const [top, side] = BLOCKS[blockId].tiles;
  const faces = [
    [tileC(top), [S / 32, S / 64, -S / 32, S / 64, S / 2, 0], 0],
    [tileC(side), [S / 32, S / 64, 0, S / 32, 0, S / 4], 0.25],
    [tileC(side), [S / 32, -S / 64, 0, S / 32, S / 2, S / 2], 0.42]
  ];
  for (const [img, m, dark] of faces) {
    ctx.setTransform(...m); ctx.drawImage(img, 0, 0, 16, 16);
    if (dark) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.globalCompositeOperation = "source-atop"; ctx.fillRect(0, 0, 16, 16); ctx.globalCompositeOperation = "source-over"; }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function iconFor(blockId, size = 36) { const c = document.createElement("canvas"); c.width = c.height = size; drawIcon(c, blockId); return c; }
const css = document.documentElement.style;
css.setProperty("--tex-dirt", `url(${tileCanvas(TILE_INDEX.dirt, 4).toDataURL()})`);
css.setProperty("--tex-stone", `url(${tileCanvas(TILE_INDEX.stone, 4).toDataURL()})`);
css.setProperty("--tex-planks", `url(${tileCanvas(TILE_INDEX.oak_planks, 4).toDataURL()})`);
css.setProperty("--tex-cobble", `url(${tileCanvas(TILE_INDEX.cobble, 4).toDataURL()})`);

const SPLASHES = ["Block für Block!", "Möge das Glück stets mit dir sein!", "Jetzt mit 13 Distrikten!", "Auch Distrikt 13!", "Achtung, Jabberjays!", "Das Füllhorn ist aus Gold!", "Frisch aus dem Kapitol!", "100 % prozedural!", "Hier gibt es Kohle!", "Bring Brot mit!"];
$("splash").textContent = SPLASHES[Math.floor(Math.random() * SPLASHES.length)];

// ---------------------------------------------------------------------------
// Laden
const setLoading = (text, f) => { $("loadingText").textContent = text; $("loadingBar").style.width = Math.round(f * 100) + "%"; };
let world;
try {
  world = await generateWorld(async (label, f) => { setLoading(label, f * 0.55); await frame(); });
} catch (e) {
  console.error(e); $("loadingError").hidden = false; $("loadingError").textContent = "Fehler beim Erzeugen der Welt: " + e.message; throw e;
}
let edits = store.get(EDITS_KEY, {});
for (const [k, id] of Object.entries(edits)) { const i = Number(k); if (i >= 0 && i < world.data.length) world.data[i] = id; }
if (Object.keys(edits).length) world.computeChunkBounds();

// ---------------------------------------------------------------------------
// Three.js
THREE.ColorManagement.enabled = false;
const canvas = $("game");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
} catch (e) {
  $("loadingError").hidden = false; $("loadingError").textContent = "WebGL 2 wird von diesem Browser nicht unterstützt. Bitte einen aktuellen Browser verwenden.";
  throw e;
}
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.5));
const SKY = new THREE.Color("#86b4f2");
const scene = new THREE.Scene();
scene.background = SKY;
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 4000);
camera.rotation.order = "YXZ";

const atlas = new THREE.DataArrayTexture(tex.data, 16, 16, tex.count);
atlas.format = THREE.RGBAFormat; atlas.type = THREE.UnsignedByteType;
atlas.magFilter = THREE.NearestFilter; atlas.minFilter = THREE.NearestMipmapLinearFilter;
atlas.wrapS = atlas.wrapT = THREE.RepeatWrapping; atlas.generateMipmaps = true;
atlas.anisotropy = renderer.capabilities.getMaxAnisotropy();
atlas.needsUpdate = true;

const VERT = `
attribute float layer; attribute float shade;
varying vec2 vUv; varying float vLayer; varying float vShade; varying float vDepth;
uniform vec2 flow;
void main(){ vUv = uv + flow; vLayer = layer; vShade = shade; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`;
const FRAG = `
precision highp float; precision highp sampler2DArray;
uniform sampler2DArray atlas; uniform vec3 fogColor; uniform float fogNear; uniform float fogFar; uniform float opacity; uniform float lampLayer;
varying vec2 vUv; varying float vLayer; varying float vShade; varying float vDepth;
void main(){
  vec4 c = texture(atlas, vec3(vUv, vLayer));
  if (c.a < 0.5) discard;
  float s = abs(vLayer - lampLayer) < 0.5 ? 1.12 : vShade;
  vec3 col = c.rgb * s;
  float f = smoothstep(fogNear, fogFar, vDepth);
  gl_FragColor = vec4(mix(col, fogColor, f), opacity);
}`;
const fog = { color: { value: SKY.clone() }, near: { value: 700 }, far: { value: 1900 } };
function makeMat(opts = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { atlas: { value: atlas }, fogColor: fog.color, fogNear: fog.near, fogFar: fog.far, opacity: { value: opts.opacity ?? 1 }, lampLayer: { value: TILE_INDEX.lamp }, flow: { value: new THREE.Vector2() } },
    transparent: !!opts.transparent, depthWrite: !opts.transparent, side: opts.side ?? THREE.FrontSide
  });
}
const matOpaque = makeMat();
const matWater = makeMat({ opacity: 0.72, transparent: true, side: THREE.DoubleSide });

// Meeresfläche und Wasserkanten des Dioramas
function quadGeo(pts, uvs, layer, shade) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts.flat(), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs.flat(), 2));
  g.setAttribute("layer", new THREE.BufferAttribute(new Uint8Array(4).fill(layer), 1));
  g.setAttribute("shade", new THREE.BufferAttribute(new Uint8Array(4).fill(shade), 1, true));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}
const wy = SEA + 0.88, by = SEA - 9;
const seaMeshes = [
  quadGeo([[0, wy, 0], [0, wy, D], [W, wy, D], [W, wy, 0]], [[0, 0], [0, D], [W, D], [W, 0]], TILE_INDEX.water, 235),
  quadGeo([[0, by, D], [W, by, D], [W, wy, D], [0, wy, D]], [[0, 0], [W, 0], [W, 10], [0, 10]], TILE_INDEX.water, 150),
  quadGeo([[0, by, 0], [0, wy, 0], [W, wy, 0], [W, by, 0]], [[0, 0], [0, 10], [W, 10], [W, 0]], TILE_INDEX.water, 150),
  quadGeo([[0, by, 0], [0, by, D], [0, wy, D], [0, wy, 0]], [[0, 0], [D, 0], [D, 10], [0, 10]], TILE_INDEX.water, 130),
  quadGeo([[W, by, 0], [W, wy, 0], [W, wy, D], [W, by, D]], [[0, 0], [0, 10], [D, 10], [D, 0]], TILE_INDEX.water, 130)
].map(g => { const m = new THREE.Mesh(g, matWater); m.renderOrder = 2; scene.add(m); return m; });

// Blockige Wolken
const cloudCanvas = document.createElement("canvas"); cloudCanvas.width = cloudCanvas.height = 64;
{
  const c = cloudCanvas.getContext("2d");
  for (let i = 0; i < 26; i++) { const x = Math.floor(Math.random() * 60), y = Math.floor(Math.random() * 60), w = 3 + Math.floor(Math.random() * 9), h = 2 + Math.floor(Math.random() * 6); c.fillStyle = "#fff"; c.fillRect(x, y, w, h); c.fillRect((x + 64 - 64) % 64, y, w, h); }
}
const cloudTex = new THREE.CanvasTexture(cloudCanvas);
cloudTex.magFilter = THREE.NearestFilter; cloudTex.minFilter = THREE.NearestFilter; cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping; cloudTex.repeat.set(5, 3);
const clouds = new THREE.Mesh(new THREE.PlaneGeometry(W * 3, D * 3), new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.78, depthWrite: false, fog: false, side: THREE.DoubleSide }));
clouds.rotation.x = -Math.PI / 2; clouds.position.set(W / 2, H + 18, D / 2); clouds.renderOrder = 3; scene.add(clouds);

// Chunks
const chunkMeshes = new Array(world.ncx * world.ncz).fill(null);
function geoFrom(m) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(m.position, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(m.uv, 2));
  g.setAttribute("layer", new THREE.BufferAttribute(m.layer, 1));
  g.setAttribute("shade", new THREE.BufferAttribute(m.shade, 1, true));
  g.setIndex(new THREE.BufferAttribute(m.index, 1));
  g.computeBoundingSphere();
  return g;
}
function buildChunk(ci) {
  const old = chunkMeshes[ci];
  if (old) for (const m of old) { scene.remove(m); m.geometry.dispose(); }
  const cx = ci % world.ncx, cz = Math.floor(ci / world.ncx);
  const res = meshChunk(world, cx, cz);
  const out = [];
  if (res.opaque) { const m = new THREE.Mesh(geoFrom(res.opaque), matOpaque); scene.add(m); out.push(m); }
  if (res.water) { const m = new THREE.Mesh(geoFrom(res.water), matWater); m.renderOrder = 1; scene.add(m); out.push(m); }
  chunkMeshes[ci] = out;
}
{
  const total = chunkMeshes.length;
  // von der Mitte nach außen bauen, damit der Hintergrund schnell sinnvoll aussieht
  const order = [...chunkMeshes.keys()].sort((a, b) => {
    const da = Math.hypot(a % world.ncx - world.ncx / 2, Math.floor(a / world.ncx) - world.ncz / 2);
    const db = Math.hypot(b % world.ncx - world.ncx / 2, Math.floor(b / world.ncx) - world.ncz / 2);
    return da - db;
  });
  let t0 = performance.now();
  for (let k = 0; k < total; k++) {
    buildChunk(order[k]);
    if (performance.now() - t0 > 40) { setLoading(`Blöcke werden zusammengesetzt … (${k + 1}/${total} Chunks)`, 0.55 + 0.45 * k / total); await frame(); t0 = performance.now(); }
  }
}
// Anzahl der Blöcke für den Titel
{
  let n = 0; const d = world.data; for (let i = 0; i < d.length; i++) if (d[i] !== 0 && d[i] !== B.WATER) n++;
  const sub = document.querySelector(".title-sub b"); if (sub) sub.textContent = (n / 1e6).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " Millionen Blöcken";
}

// ---------------------------------------------------------------------------
// Karten (Minimap & große Karte)
const mapCanvas = document.createElement("canvas"); mapCanvas.width = W; mapCanvas.height = D;
const mapImg = mapCanvas.getContext("2d").createImageData(W, D);
function mapColumn(x, z) {
  let y = H - 1; while (y > 0 && (world.data[x + W * (z + D * y)] === 0 || world.data[x + W * (z + D * y)] === B.GLASS)) y--;
  let b = world.data[x + W * (z + D * y)];
  let col;
  if (b === B.WATER) {
    let yy = y; while (yy > 0 && world.data[x + W * (z + D * yy)] === B.WATER) yy--;
    const depth = y - yy; const t = Math.min(1, depth / 8);
    col = [60 - 30 * t, 110 - 40 * t, 210 - 60 * t];
  } else {
    const a = tex.avg[BLOCKS[b].tiles[0]];
    const hw = x > 0 && z > 0 ? world.top(x - 1, z - 1) : y;
    const f = Math.max(0.55, Math.min(1.35, 0.85 + (y - SEA) / 110 + (y - hw) * 0.06));
    col = [a[0] * f, a[1] * f, a[2] * f];
  }
  const i = (x + z * W) * 4; mapImg.data[i] = col[0]; mapImg.data[i + 1] = col[1]; mapImg.data[i + 2] = col[2]; mapImg.data[i + 3] = 255;
}
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) mapColumn(x, z);
const refreshMap = () => mapCanvas.getContext("2d").putImageData(mapImg, 0, 0);
refreshMap();

function drawBigMap(marker) {
  const c = $("bigmap"), ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false; ctx.drawImage(mapCanvas, 0, 0);
  ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
  for (const r of REGIONS) {
    ctx.fillStyle = r.id === "capitol" ? "#ffdd33" : r.arena ? "#ff8855" : "#ffffff";
    ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r.x, r.z, r.id === "capitol" ? 6 : 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const label = r.id === "capitol" ? "KAPITOL" : r.short.toUpperCase();
    ctx.strokeText(label, r.x, r.z - 9); ctx.fillText(label, r.x, r.z - 9);
  }
  if (marker) { ctx.fillStyle = "#ff3333"; ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(marker.x, marker.z, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}

// ---------------------------------------------------------------------------
// Namensschilder
const labelEls = REGIONS.map(r => {
  const el = document.createElement("div");
  el.className = "nametag" + (r.id === "capitol" ? " capitol" : "") + (r.arena ? " arena" : "");
  el.innerHTML = `${r.id === "capitol" ? "Das Kapitol" : r.arena ? r.short : r.name}<small>${r.industry}</small>`;
  el.addEventListener("click", () => { if (mode === "overview") selectRegion(r, true); });
  $("labels").appendChild(el);
  return el;
});
let labelsOn = true;
const v3 = new THREE.Vector3();
function updateLabels() {
  const show = labelsOn && (mode === "overview" || mode === "explore");
  const wpx = innerWidth, hpx = innerHeight;
  REGIONS.forEach((r, i) => {
    const el = labelEls[i];
    if (!show) { el.style.display = "none"; return; }
    v3.set(r.x + 0.5, (r.top ?? r.level + 10) + 4, r.z + 0.5);
    const dist = v3.distanceTo(camera.position);
    if (mode === "explore" && (dist > 150 || r === lastRegion)) { el.style.display = "none"; return; }
    v3.project(camera);
    if (v3.z > 1 || v3.x < -1.2 || v3.x > 1.2 || v3.y < -1.2 || v3.y > 1.2) { el.style.display = "none"; return; }
    el.style.display = "";
    const s = mode === "explore" ? 1 : Math.max(0.6, Math.min(1.25, 420 / dist));
    el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * wpx}px, ${(-v3.y * 0.5 + 0.5) * hpx}px) translate(-50%, -100%) scale(${s.toFixed(3)})`;
    el.style.zIndex = String(10000 - Math.round(dist));
  });
}

// ---------------------------------------------------------------------------
// Modi und Kamera
let mode = "loading";
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = false;
controls.minDistance = 12; controls.maxDistance = 1300; controls.maxPolarAngle = 1.42;
controls.target.set(W / 2, SEA, D / 2 + 10);
camera.position.set(W / 2 - 40, 430, D / 2 + 470);
controls.update();
controls.enabled = false;
let tween = null;
function homeView() {
  tween = { from: { t: controls.target.clone(), p: camera.position.clone() }, to: { t: new THREE.Vector3(W / 2, SEA, D / 2 + 15), p: new THREE.Vector3(W / 2, 470, D / 2 + 400) }, t: 0 };
}
function flyTo(target, dist = 110, height = 0.75) {
  const from = { t: controls.target.clone(), p: camera.position.clone() };
  const dir = camera.position.clone().sub(controls.target).setY(0).normalize();
  if (!isFinite(dir.x) || dir.lengthSq() < 0.1) dir.set(0, 0, 1);
  const to = { t: target.clone(), p: target.clone().add(dir.multiplyScalar(dist)).add(new THREE.Vector3(0, dist * height, 0)) };
  tween = { from, to, t: 0 };
}
const panels = ["title", "overviewHud", "exploreHud", "pause", "districts", "inventory", "help", "about"];
let returnTo = "title";
function showOnly(...ids) { panels.forEach(p => { $(p).hidden = !ids.includes(p); }); }
function setMode(m) {
  const prev = mode; mode = m;
  document.body.className = "mode-" + m;
  if (m === "title") { showOnly("title"); controls.enabled = false; exitPointer(); setFog(700, 1900); camera.near = 0.5; camera.far = 4000; camera.updateProjectionMatrix(); }
  if (m === "overview") {
    showOnly("overviewHud"); exitPointer(); controls.enabled = true; setFog(800, 2200); camera.near = 0.5; camera.far = 4000; camera.updateProjectionMatrix();
    if (prev === "explore" || prev === "pause") { controls.target.copy(player.pos); camera.position.copy(player.pos).add(new THREE.Vector3(0, 60, 80)); controls.update(); }
  }
  if (m === "explore") {
    showOnly("exploreHud"); controls.enabled = false; setFog(120, 420); camera.near = 0.08; camera.far = 900; camera.updateProjectionMatrix();
    $("touch").hidden = !isTouch;
    if (!isTouch) { $("clickToPlay").hidden = false; requestPointer(); } else $("clickToPlay").hidden = true;
  }
  if (m === "pause") { showOnly("exploreHud", "pause"); }
}
function setFog(n, f) { fog.near.value = n; fog.far.value = f; }
function openPanel(id) {
  returnTo = mode === "explore" ? "pause" : mode;
  if (mode === "explore") { exitPointer(); mode = "pause"; document.body.className = "mode-pause"; }
  const keep = returnTo === "overview" ? ["overviewHud"] : returnTo === "pause" ? ["exploreHud"] : [];
  showOnly(...keep, id);
  if (id === "districts") drawBigMap(returnTo === "pause" ? { x: player.pos.x, z: player.pos.z } : null);
}
function closePanel() {
  if (returnTo === "pause") setMode("pause"); else if (returnTo === "overview") setMode("overview"); else setMode("title");
}

// ---------------------------------------------------------------------------
// Spieler & Physik
const player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: false, flying: false, inWater: false };
const PW = 0.3, PH = 1.8, EYE = 1.62;
const solidAt = (x, y, z) => SOLID[world.get(Math.floor(x), Math.floor(y), Math.floor(z))] === 1;
function collides(px, py, pz) {
  for (let x = Math.floor(px - PW); x <= Math.floor(px + PW); x++)
    for (let y = Math.floor(py); y <= Math.floor(py + PH - 0.01); y++)
      for (let z = Math.floor(pz - PW); z <= Math.floor(pz + PW); z++)
        if (SOLID[world.get(x, y, z)]) return true;
  return false;
}
function moveAxis(axis, delta) {
  const p = player.pos;
  p[axis] += delta;
  if (!collides(p.x, p.y, p.z)) return false;
  if (axis === "y") {
    if (delta < 0) { p.y = Math.floor(p.y) + 1; player.onGround = true; } else p.y = Math.floor(p.y + PH) - PH - 0.001;
  } else {
    // automatisches Hochsteigen um einen Block, wenn wir am Boden sind
    if (player.onGround && !collides(p.x, p.y + 1.01, p.z) && !player.flying) { p.y += 1.01; return false; }
    p[axis] -= delta;
  }
  player.vel[axis] = 0;
  return true;
}
function openSky(x, t, z) {
  for (let y = t + 1; y < Math.min(H, t + 24); y++) if (world.get(x, y, z) !== 0) return false;
  return true;
}
// Spawnpunkt: am Südrand der Region mit Blick auf das Zentrum
const SPAWN_OFFSET = { capitol: [0, 21], d2: [-12, 16], d4: [-9, 3], d5: [14, 4], d7: [0, 6], d9: [-14, 14], d3: [10, 12], d8: [20, -1], d12: [-2, 10], d13: [2, 20], arena74: [3, 4], arena75: [0, 26] };
function findSpawn(reg) {
  const [ox, oz] = SPAWN_OFFSET[reg.id] || [0, Math.round(reg.r * 0.55)];
  const sx = reg.x + ox, sz = reg.z + oz;
  for (let rad = 0; rad < reg.r; rad++) {
    for (let a = 0; a < Math.max(1, rad * 6); a++) {
      const ang = a / Math.max(1, rad * 6) * Math.PI * 2;
      const x = Math.round(sx + Math.cos(ang) * rad), z = Math.round(sz + Math.sin(ang) * rad);
      for (let t = reg.level + 1; t >= reg.level - 1; t--) {
        if (SOLID[world.get(x, t, z)] && !collides(x + 0.5, t + 1, z + 0.5) && openSky(x, t, z)) return new THREE.Vector3(x + 0.5, t + 1, z + 0.5);
      }
    }
  }
  return new THREE.Vector3(reg.x + 0.5, world.top(reg.x, reg.z) + 1.5, reg.z + 0.5);
}
function spawnAt(pos, yaw = null) {
  player.pos.copy(pos); player.vel.set(0, 0, 0); player.flying = false;
  if (yaw !== null) player.yaw = yaw;
  player.pitch = -0.15;
  lastRegion = null;
}
function spawnRegion(reg) {
  const p = findSpawn(reg);
  const dx = reg.x + 0.5 - p.x, dz = reg.z + 0.5 - p.z;
  const toCenter = Math.hypot(dx, dz) > 1 ? Math.atan2(-dx, -dz) : 0;
  // Blickrichtung mit möglichst freier Sicht, bevorzugt Richtung Zentrum
  let best = toCenter, bestScore = -1e9;
  for (let k = 0; k < 24; k++) {
    const yaw = toCenter + (k / 24) * Math.PI * 2, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let free = 0;
    while (free < 36 && !SOLID[world.get(Math.floor(p.x + fx * free), Math.floor(p.y + 1.6), Math.floor(p.z + fz * free))]) free += 0.5;
    const score = Math.min(free, 30) + 10 * Math.cos(yaw - toCenter);
    if (score > bestScore) { bestScore = score; best = yaw; }
  }
  spawnAt(p, best);
  setMode("explore");
}
function spawnXZ(x, z) {
  x = Math.max(1, Math.min(W - 2, Math.floor(x))); z = Math.max(1, Math.min(D - 2, Math.floor(z)));
  const t = Math.max(world.top(x, z), SEA);
  spawnAt(new THREE.Vector3(x + 0.5, t + 1.2, z + 0.5));
  if (world.get(x, t, z) === B.WATER || world.get(x, t, z) === 0) player.flying = true;
  setMode("explore");
}

const keys = new Set();
let lastSpace = 0;
const touchMove = { x: 0, y: 0 }, touchHeld = { up: false, down: false };
function updatePlayer(dt) {
  const sprint = keys.has("ControlLeft") || keys.has("ControlRight");
  const fwd = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) + (-touchMove.y);
  const strafe = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + touchMove.x;
  const up = keys.has("Space") || touchHeld.up, down = keys.has("ShiftLeft") || keys.has("ShiftRight") || touchHeld.down;
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  let mx = -sin * fwd + cos * strafe, mz = -cos * fwd - sin * strafe;
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const feet = world.get(Math.floor(player.pos.x), Math.floor(player.pos.y + 0.4), Math.floor(player.pos.z));
  player.inWater = feet === B.WATER;
  if (player.flying) {
    const sp = sprint ? 70 : 16;
    player.vel.x = mx * sp; player.vel.z = mz * sp;
    player.vel.y = (up ? 1 : 0) * sp * 0.7 - (down ? 1 : 0) * sp * 0.7;
  } else {
    const sp = player.inWater ? 2.6 : (sprint ? 6.2 : 4.4);
    const acc = player.onGround ? 14 : 4;
    player.vel.x += (mx * sp - player.vel.x) * Math.min(1, acc * dt);
    player.vel.z += (mz * sp - player.vel.z) * Math.min(1, acc * dt);
    if (player.inWater) { player.vel.y = Math.max(player.vel.y - 9 * dt, -2.5); if (up) player.vel.y = 3.2; }
    else { player.vel.y -= 30 * dt; if (player.vel.y < -55) player.vel.y = -55; if (up && player.onGround) player.vel.y = 9.2; }
  }
  // in kleinen Schritten bewegen
  const steps = Math.ceil(Math.max(Math.abs(player.vel.x), Math.abs(player.vel.y), Math.abs(player.vel.z)) * dt / 0.35) || 1;
  const wasGround = player.onGround; player.onGround = false;
  for (let i = 0; i < steps; i++) {
    moveAxis("x", player.vel.x * dt / steps);
    moveAxis("z", player.vel.z * dt / steps);
    moveAxis("y", player.vel.y * dt / steps);
  }
  if (!player.onGround && wasGround && player.vel.y <= 0 && !player.flying) {
    // kleine Toleranz, damit das Treppensteigen nicht flackert
    if (collides(player.pos.x, player.pos.y - 0.05, player.pos.z)) player.onGround = true;
  }
  if (player.flying && player.onGround && down) player.flying = false;
  player.pos.x = Math.max(0.4, Math.min(W - 0.4, player.pos.x)); player.pos.z = Math.max(0.4, Math.min(D - 0.4, player.pos.z));
  if (player.pos.y < -20) { player.pos.y = world.top(Math.floor(player.pos.x), Math.floor(player.pos.z)) + 2; player.vel.y = 0; }
  if (player.pos.y > H + 60) player.pos.y = H + 60;
  camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
}

// ---------------------------------------------------------------------------
// Blöcke anvisieren, abbauen, setzen
function raycast(o, d, maxD, stopWater = false) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
  const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
  let tx = sx > 0 ? (x + 1 - o.x) * tdx : (o.x - x) * tdx, ty = sy > 0 ? (y + 1 - o.y) * tdy : (o.y - y) * tdy, tz = sz > 0 ? (z + 1 - o.z) * tdz : (o.z - z) * tdz;
  let nx = 0, ny = 0, nz = 0, t = 0;
  while (t <= maxD) {
    const b = world.get(x, y, z);
    if (b !== 0 && (b !== B.WATER || stopWater) && y >= 0) return { x, y, z, nx, ny, nz, b, t };
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
    if (y < -1 || (y > H + 2 && sy > 0)) break;
  }
  return null;
}
const highlight = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }));
highlight.visible = false; scene.add(highlight);
let target = null;
const dirV = new THREE.Vector3();
function updateTarget() {
  camera.getWorldDirection(dirV);
  target = raycast(camera.position, dirV, 7);
  highlight.visible = !!target;
  if (target) highlight.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
}
let saveTimer = 0;
function recordEdit(x, y, z, id) {
  edits[world.idx(x, y, z)] = id;
  clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set(EDITS_KEY, edits), 600);
  mapColumn(x, z); mapDirty = true;
}
let mapDirty = false;
function breakBlock() {
  if (!target) return;
  const { x, y, z } = target;
  const id = y <= SEA && neighborsWater(x, y, z) ? B.WATER : 0;
  world.set(x, y, z, id); recordEdit(x, y, z, id);
}
function neighborsWater(x, y, z) { return [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].some(([a, b, c]) => world.get(x + a, y + b, z + c) === B.WATER); }
function placeBlock() {
  if (!target) return;
  const x = target.x + target.nx, y = target.y + target.ny, z = target.z + target.nz;
  if (!world.inside(x, y, z)) return;
  const cur = world.get(x, y, z); if (cur !== 0 && cur !== B.WATER) return;
  const id = hotbar[sel];
  // nicht in den Spieler bauen
  if (x + 1 > player.pos.x - PW && x < player.pos.x + PW && z + 1 > player.pos.z - PW && z < player.pos.z + PW && y + 1 > player.pos.y && y < player.pos.y + PH) return;
  world.set(x, y, z, id); recordEdit(x, y, z, id);
}
function pickBlock() { if (target && target.b !== B.WATER) { const id = target.b === B.CROPS ? B.HAY : target.b; const i = hotbar.indexOf(id); if (i >= 0) selectSlot(i); else { hotbar[sel] = id; saveHotbar(); renderHotbar(); selectSlot(sel); } } }

// Hotbar & Inventar
let hotbar = store.get(HOTBAR_KEY, DEFAULT_HOTBAR).slice(0, 9).map(v => (BLOCKS[v] && !BLOCKS[v].air ? v : B.STONE));
while (hotbar.length < 9) hotbar.push(B.STONE);
let sel = 0, nameTimer = 0;
const saveHotbar = () => store.set(HOTBAR_KEY, hotbar);
function renderHotbar() {
  const hb = $("hotbar"); hb.innerHTML = "";
  hotbar.forEach((id, i) => {
    const s = document.createElement("div"); s.className = "slot" + (i === sel ? " sel" : "");
    s.appendChild(iconFor(id, 36)); const n = document.createElement("span"); n.textContent = i + 1; s.appendChild(n);
    s.addEventListener("click", () => selectSlot(i));
    hb.appendChild(s);
  });
}
function selectSlot(i) {
  sel = (i + 9) % 9;
  [...$("hotbar").children].forEach((c, k) => c.classList.toggle("sel", k === sel));
  const bn = $("blockName"); bn.textContent = BLOCKS[hotbar[sel]].name; bn.classList.add("show");
  clearTimeout(nameTimer); nameTimer = setTimeout(() => bn.classList.remove("show"), 1400);
}
function renderInventory() {
  const g = $("invGrid"); g.innerHTML = "";
  PLACEABLE.forEach(id => {
    const b = document.createElement("button"); b.title = BLOCKS[id].name; b.setAttribute("aria-label", BLOCKS[id].name);
    b.appendChild(iconFor(id, 36));
    b.addEventListener("click", () => { hotbar[sel] = id; saveHotbar(); renderHotbar(); selectSlot(sel); closePanel(); });
    g.appendChild(b);
  });
}
renderHotbar(); renderInventory();

// ---------------------------------------------------------------------------
// Regionen: Auswahl, Infokarte, Liste
let selected = null;
function regionAt(x, z) {
  x = Math.floor(x); z = Math.floor(z);
  if (x < 0 || z < 0 || x >= W || z >= D) return null;
  const r = world.reserved[x + z * W];
  if (r && r !== 255) return REGIONS[r - 1];
  return null;
}
function nearestRegion(x, z, maxF = 2.2) {
  let best = null, bd = 1e9;
  for (const r of REGIONS) { const d = Math.hypot(r.x - x, r.z - z) / r.r; if (d < bd) { bd = d; best = r; } }
  return bd < maxF ? best : null;
}
function selectRegion(r, fly = false) {
  selected = r;
  $("infoCard").hidden = false;
  drawIcon($("infoIcon"), B[r.icon.toUpperCase()]);
  $("infoName").textContent = r.name;
  $("infoIndustry").textContent = r.industry;
  $("infoDesc").textContent = r.desc;
  $("infoLandmarks").innerHTML = r.landmarks.map(l => `<li>${l}</li>`).join("");
  $("infoInspo").textContent = `Lage: ${r.inspo} · Block X ${r.x}, Z ${r.z}`;
  if (fly) flyTo(new THREE.Vector3(r.x, r.level, r.z), r.id === "capitol" ? 150 : 95, r.id === "capitol" ? 0.8 : 0.7);
}
function renderDistrictList() {
  const list = $("districtList"); list.innerHTML = "";
  REGIONS.forEach(r => {
    const item = document.createElement("div"); item.className = "d-item"; item.tabIndex = 0;
    item.appendChild(iconFor(B[r.icon.toUpperCase()], 32));
    const t = document.createElement("div"); t.innerHTML = `<b>${r.name}</b><small>${r.industry}</small>`; item.appendChild(t);
    const go = document.createElement("div"); go.className = "go";
    const b1 = document.createElement("button"); b1.className = "mc-btn sm"; b1.textContent = "Karte"; b1.title = "In der Übersicht ansehen";
    b1.addEventListener("click", e => { e.stopPropagation(); setMode("overview"); selectRegion(r, true); });
    const b2 = document.createElement("button"); b2.className = "mc-btn sm"; b2.textContent = "Spawn"; b2.title = "Dort zu Fuß erkunden";
    b2.addEventListener("click", e => { e.stopPropagation(); spawnRegion(r); });
    go.append(b1, b2); item.appendChild(go);
    item.addEventListener("click", () => spawnRegion(r));
    item.addEventListener("keydown", e => { if (e.key === "Enter") spawnRegion(r); });
    list.appendChild(item);
  });
}
renderDistrictList();
$("bigmap").addEventListener("click", e => {
  const rect = e.target.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * W, z = (e.clientY - rect.top) / rect.height * D;
  const r = nearestRegion(x, z, 0.5);
  if (r) spawnRegion(r); else spawnXZ(x, z);
});

// ---------------------------------------------------------------------------
// Eingaben
function requestPointer() { if (!isTouch && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* ignorieren */ } } }
function exitPointer() { if (document.pointerLockElement) document.exitPointerLock(); }
document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === canvas;
  $("clickToPlay").hidden = locked || mode !== "explore" || isTouch;
  if (!locked && mode === "explore" && !isTouch) setMode("pause");
});
$("clickToPlay").addEventListener("click", requestPointer);

document.addEventListener("mousemove", e => {
  if (mode !== "explore" || document.pointerLockElement !== canvas) return;
  player.yaw -= e.movementX * 0.0024; player.pitch -= e.movementY * 0.0024;
  player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch));
});
canvas.addEventListener("mousedown", e => {
  if (mode !== "explore" || document.pointerLockElement !== canvas) return;
  if (e.button === 0) breakBlock(); else if (e.button === 2) placeBlock(); else if (e.button === 1) { e.preventDefault(); pickBlock(); }
});
canvas.addEventListener("contextmenu", e => e.preventDefault());
addEventListener("wheel", e => { if (mode === "explore") selectSlot(sel + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") return;
  if (mode === "explore") {
    keys.add(e.code);
    if (e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) { const now = performance.now(); if (now - lastSpace < 300) { player.flying = !player.flying; player.vel.y = 0; } lastSpace = now; }
    }
    if (e.code === "KeyF") { player.flying = !player.flying; player.vel.y = 0; }
    if (/^Digit[1-9]$/.test(e.code)) selectSlot(Number(e.code.slice(5)) - 1);
    if (e.code === "KeyE") openPanel("inventory");
    if (e.code === "KeyM") openPanel("districts");
    if (e.code === "KeyL") toggleLabels();
  } else if (e.code === "Escape") {
    if (!$("districts").hidden || !$("inventory").hidden || !$("help").hidden || !$("about").hidden) closePanel();
    else if (mode === "overview" && !$("infoCard").hidden) $("infoCard").hidden = true;
  } else if (mode === "pause" && (e.code === "KeyE" || e.code === "KeyM") && $("districts").hidden && $("inventory").hidden) {
    setMode("explore");
  }
});
addEventListener("keyup", e => keys.delete(e.code));
addEventListener("blur", () => keys.clear());

// Übersicht: Klick auf das Gelände
let downPos = null;
canvas.addEventListener("pointerdown", e => { downPos = [e.clientX, e.clientY]; });
canvas.addEventListener("pointerup", e => {
  if (mode !== "overview" || !downPos || Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) > 6) return;
  const ndc = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
  const hit = raycast(ray.ray.origin, ray.ray.direction, 3500, true);
  let px, pz;
  if (hit) { px = hit.x; pz = hit.z; }
  else { const t = (wy - ray.ray.origin.y) / ray.ray.direction.y; if (t <= 0) return; px = ray.ray.origin.x + ray.ray.direction.x * t; pz = ray.ray.origin.z + ray.ray.direction.z * t; }
  const r = regionAt(px, pz) || nearestRegion(px, pz, 1.6);
  if (r) selectRegion(r, true);
  else { $("infoCard").hidden = true; selected = null; flyTo(new THREE.Vector3(px, hit ? hit.y : SEA, pz), Math.max(60, camera.position.distanceTo(controls.target) * 0.7), 0.75); }
});

// Touch-Steuerung
if (isTouch) {
  const stick = $("stick"), knob = $("knob");
  let stickId = null, sc = null;
  stick.addEventListener("touchstart", e => { const t = e.changedTouches[0]; stickId = t.identifier; const r = stick.getBoundingClientRect(); sc = [r.left + r.width / 2, r.top + r.height / 2]; e.preventDefault(); }, { passive: false });
  addEventListener("touchmove", e => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        let dx = (t.clientX - sc[0]) / 55, dy = (t.clientY - sc[1]) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
        touchMove.x = dx; touchMove.y = dy; knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
      } else if (t.identifier === lookId) {
        player.yaw -= (t.clientX - lookLast[0]) * 0.006; player.pitch -= (t.clientY - lookLast[1]) * 0.006;
        player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch)); lookLast = [t.clientX, t.clientY];
      }
    }
  }, { passive: true });
  const endTouch = e => { for (const t of e.changedTouches) { if (t.identifier === stickId) { stickId = null; touchMove.x = touchMove.y = 0; knob.style.transform = ""; } if (t.identifier === lookId) lookId = null; } };
  addEventListener("touchend", endTouch); addEventListener("touchcancel", endTouch);
  let lookId = null, lookLast = [0, 0];
  canvas.addEventListener("touchstart", e => { if (mode !== "explore") return; const t = e.changedTouches[0]; if (lookId === null) { lookId = t.identifier; lookLast = [t.clientX, t.clientY]; } }, { passive: true });
  document.querySelectorAll("[data-touch]").forEach(btn => {
    const a = btn.dataset.touch;
    btn.addEventListener("touchstart", e => {
      e.preventDefault(); e.stopPropagation();
      if (a === "up") { touchHeld.up = true; }
      if (a === "down") touchHeld.down = true;
      if (a === "fly") { player.flying = !player.flying; btn.classList.toggle("on", player.flying); }
      if (a === "break") { updateTarget(); breakBlock(); }
      if (a === "place") { updateTarget(); placeBlock(); }
      if (a === "menu") setMode("pause");
    }, { passive: false });
    btn.addEventListener("touchend", e => { e.preventDefault(); if (a === "up") touchHeld.up = false; if (a === "down") touchHeld.down = false; });
  });
}

// Knöpfe
function toggleLabels() { labelsOn = !labelsOn; $("labelsBtn").textContent = "Namen: " + (labelsOn ? "an" : "aus"); }
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-action]"); if (!btn) return;
  const a = btn.dataset.action;
  if (a === "explore") {
    if (mode === "overview" && selected) spawnRegion(selected);
    else if (mode === "overview") spawnXZ(controls.target.x, controls.target.z);
    else spawnRegion(REGION.d12);
  }
  if (a === "overview") { const from = mode; setMode("overview"); if (from === "title" && !selected) homeView(); }
  if (a === "title") setMode("title");
  if (a === "districts") openPanel("districts");
  if (a === "help") openPanel("help");
  if (a === "about") openPanel("about");
  if (a === "back") closePanel();
  if (a === "resume") setMode("explore");
  if (a === "labels") toggleLabels();
  if (a === "home") { $("infoCard").hidden = true; selected = null; homeView(); }
  if (a === "closeInfo") { $("infoCard").hidden = true; selected = null; }
  if (a === "flyHere" && selected) selectRegion(selected, true);
  if (a === "spawnHere" && selected) spawnRegion(selected);
  if (a === "resetEdits") {
    if (confirm("Alle eigenen Bauten entfernen und die Welt neu laden?")) { store.set(EDITS_KEY, {}); location.reload(); }
  }
});

// ---------------------------------------------------------------------------
// HUD im Erkundungsmodus
let lastRegion = null, toastTimer = 0, hudTimer = 0;
const mm = $("minimap"), mmc = mm.getContext("2d");
function updateExploreHud(dt) {
  hudTimer -= dt;
  if (hudTimer > 0) return;
  hudTimer = 0.12;
  const p = player.pos;
  const reg = regionAt(p.x, p.z);
  const regName = reg ? reg.name : (world.reserved[Math.floor(p.x) + Math.floor(p.z) * W] === 255 ? "Bahnstrecke" : "Wildnis von Panem");
  const lon = lonOf(p.x), lat = latOf(p.z);
  $("debug").textContent = `PanemCraft\nXYZ: ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}\nGebiet: ${regName}\nUrsprung: ${Math.abs(lat).toFixed(1)}° N, ${Math.abs(lon).toFixed(1)}° W\n${player.flying ? "Flugmodus" : player.inWater ? "Schwimmen" : "Zu Fuß"}${target ? " · " + BLOCKS[target.b].name : ""}`;
  if (reg !== lastRegion) {
    lastRegion = reg;
    if (reg) { const t = $("regionToast"); t.innerHTML = `${reg.name}<small>${reg.industry}</small>`; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3200); }
  }
  // Minimap
  const mw = mm.width, mh = mm.height, zoom = 1.6;
  mmc.imageSmoothingEnabled = false; mmc.fillStyle = "#1d3c78"; mmc.fillRect(0, 0, mw, mh);
  mmc.drawImage(mapCanvas, p.x - mw / zoom / 2, p.z - mh / zoom / 2, mw / zoom, mh / zoom, 0, 0, mw, mh);
  mmc.save(); mmc.translate(mw / 2, mh / 2); mmc.rotate(-player.yaw);
  mmc.fillStyle = "#fff"; mmc.strokeStyle = "#000"; mmc.lineWidth = 1.5;
  mmc.beginPath(); mmc.moveTo(0, -7); mmc.lineTo(5, 5); mmc.lineTo(0, 2); mmc.lineTo(-5, 5); mmc.closePath(); mmc.fill(); mmc.stroke(); mmc.restore();
  mmc.font = "12px monospace"; mmc.fillStyle = "#fff";
  for (const r of REGIONS) {
    const sx = (r.x - p.x) * zoom + mw / 2, sy = (r.z - p.z) * zoom + mh / 2;
    if (sx < 0 || sy < 0 || sx > mw || sy > mh) continue;
    mmc.fillText(r.id === "capitol" ? "K" : r.short.replace("Arena ", "A"), sx - 6, sy);
  }
}

// ---------------------------------------------------------------------------
// Hauptschleife
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize();
let last = performance.now(), titleAngle = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (mode === "title") {
    titleAngle += dt * 0.045;
    const c = REGION.capitol;
    controls.target.set(c.x, c.level + 10, c.z);
    camera.position.set(c.x + Math.cos(titleAngle) * 170, c.level + 95, c.z + Math.sin(titleAngle) * 170);
    camera.lookAt(controls.target);
  } else if (mode === "overview") {
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 1.3);
      const e = tween.t < 0.5 ? 2 * tween.t * tween.t : 1 - Math.pow(-2 * tween.t + 2, 2) / 2;
      controls.target.lerpVectors(tween.from.t, tween.to.t, e);
      camera.position.lerpVectors(tween.from.p, tween.to.p, e);
      if (tween.t >= 1) tween = null;
    }
    controls.update();
  } else if (mode === "explore") {
    updatePlayer(dt);
    updateTarget();
    updateExploreHud(dt);
  }
  if (mode !== "explore") highlight.visible = mode === "pause" && highlight.visible;
  // Geänderte Chunks neu aufbauen
  if (world.dirty.size) { let n = 0; for (const ci of world.dirty) { buildChunk(ci); world.dirty.delete(ci); if (++n >= 6) break; } }
  if (mapDirty) { mapDirty = false; refreshMap(); }
  // Wasser und Wolken bewegen
  matWater.uniforms.flow.value.set(now * 0.00002, now * 0.00004);
  cloudTex.offset.x = now * 0.0000025;
  clouds.visible = camera.position.y < clouds.position.y - 2;
  updateLabels();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
$("loading").hidden = true;
setMode("title");
requestAnimationFrame(loop);
// Für Tests/Debugging
window.panem = { world, camera, setMode, spawnRegion, REGION, selectRegion, flyTo, THREE, player, controls, keys, step: updatePlayer };

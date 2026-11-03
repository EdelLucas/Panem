// Ablauf der Weltgenerierung (in Schritten, damit die Ladeanzeige aktualisiert werden kann).
import { World } from "./world.js";
import { W, H, D, SEA } from "./data.js";
import { generateTerrain, plantVegetation } from "./terrain.js";
import { prepareSites, buildRails, buildStructures } from "./structures.js";
import { mulberry32 } from "./noise.js";

export async function generateWorld(onStep = () => {}) {
  const world = new World(W, H, D, SEA);
  const steps = [
    ["Gelände von Panem formen …", () => generateTerrain(world)],
    ["Distrikte einebnen …", () => prepareSites(world)],
    ["Bahnnetz verlegen …", () => buildRails(world)],
    ["Wälder pflanzen …", () => plantVegetation(world, mulberry32(42))],
    ["Kapitol und Distrikte bauen …", () => buildStructures(world)],
    ["Chunks vorbereiten …", () => world.computeChunkBounds()]
  ];
  for (let i = 0; i < steps.length; i++) {
    await onStep(steps[i][0], i / steps.length);
    steps[i][1]();
  }
  return world;
}

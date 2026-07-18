// Smoke test das geometrias da Fase 2 — roda com: npx tsx smoke-test.ts
import { readFileSync } from "node:fs";
import { FontLoader } from "three-stdlib";
import {
  generateLithophaneGeometry,
  type Heightmap,
} from "./lib/geometry/lithophane";
import { generateSignGeometry, defaultSignParams } from "./lib/geometry/sign";
import { generateVaseGeometry, defaultVaseParams } from "./lib/geometry/vase";

// --- Lithophane: gradiente sintético 50x40 ---
const w = 50, h = 40;
const data = new Float32Array(w * h);
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) data[y * w + x] = x / (w - 1);
const hm: Heightmap = { width: w, height: h, data };

const litho = generateLithophaneGeometry(hm, {
  widthMM: 100,
  minThickness: 0.8,
  maxThickness: 3,
  frame: true,
  frameWidthMM: 4,
});
litho.computeBoundingBox();
const lb = litho.boundingBox!;
console.log(
  "LITHOPHANE: verts =", litho.attributes.position.count,
  "| tris =", litho.index!.count / 3,
  "| bbox mm =",
  [lb.max.x - lb.min.x, lb.max.y - lb.min.y, lb.max.z - lb.min.z].map((v) =>
    v.toFixed(1)
  ).join(" x ")
);
if (Math.abs(lb.max.z - 3) > 0.01 || Math.abs(lb.min.z) > 0.01)
  throw new Error("lithophane: espessura fora do esperado");

// --- Sign: fonte real, elevado + gravado + furos ---
const fontJson = JSON.parse(
  readFileSync("./public/fonts/droid_sans_regular.typeface.json", "utf8")
);
const font = new FontLoader().parse(fontJson);

const raised = generateSignGeometry(
  { ...defaultSignParams, text: "Ação São João", holes: true },
  font
);
raised.computeBoundingBox();
const rb = raised.boundingBox!;
console.log(
  "SIGN elevado (com acentos + furos): verts =",
  raised.attributes.position.count,
  "| z max =", rb.max.z.toFixed(1), "(esperado 6 = base 4 + relevo 2)"
);
if (Math.abs(rb.max.z - 6) > 0.01) throw new Error("sign elevado: altura errada");

const recessed = generateSignGeometry(
  { ...defaultSignParams, text: "Gravado", recessed: true },
  font
);
recessed.computeBoundingBox();
const cb = recessed.boundingBox!;
console.log(
  "SIGN gravado (camadas): verts =", recessed.attributes.position.count,
  "| z max =", cb.max.z.toFixed(1), "(esperado 4 = só a base)"
);
if (Math.abs(cb.max.z - 4) > 0.01) throw new Error("sign gravado: altura errada");

// --- Vase: regressão rápida ---
const vase = generateVaseGeometry(defaultVaseParams);
console.log("VASE: verts =", vase.attributes.position.count);

console.log("\n✓ todos os smoke tests passaram");

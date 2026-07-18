// Smoke test das geometrias da Fase 2 — roda com: npx tsx smoke-test.ts
import { readFileSync } from "node:fs";
import { FontLoader } from "three-stdlib";
import {
  generateLithophaneGeometry,
  type Heightmap,
} from "./lib/geometry/lithophane";
import { generateSignGeometry, defaultSignParams } from "./lib/geometry/sign";
import { generateVaseGeometry, defaultVaseParams } from "./lib/geometry/vase";
import { traceOutline, simplify } from "./lib/image/trace";
import { generateKeychainGeometry, defaultKeychainParams } from "./lib/geometry/keychain";
import { generateLaserBoxPanels, panelsToSVG, panelsToDXF, defaultLaserBoxParams } from "./lib/geometry/laserBox";
import { generateDeskOrganizerGeometry, defaultDeskOrganizerParams } from "./lib/geometry/deskOrganizer";

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

// --- Keychain: contorno sintético (círculo) ---
{
  const size = 60;
  const grid = new Uint8Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      grid[y * size + x] = dx * dx + dy * dy < 20 * 20 ? 1 : 0;
    }
  const raw = traceOutline({ width: size, height: size, data: grid });
  const simplified = simplify(raw, 1.2);
  const kc = generateKeychainGeometry(simplified, defaultKeychainParams);
  if (!kc) throw new Error("keychain: geometria nula");
  kc.computeBoundingBox();
  const kb = kc.boundingBox!;
  console.log(
    "KEYCHAIN: contorno bruto =", raw.length,
    "→ simplificado =", simplified.length,
    "| largura mm =", (kb.max.x - kb.min.x).toFixed(1),
    "| z =", (kb.max.z - kb.min.z).toFixed(1)
  );
  if (Math.abs(kb.max.z - kb.min.z - 4) > 0.01)
    throw new Error("keychain: espessura errada");
}

// --- Laser Box: painéis + SVG/DXF ---
{
  const panels = generateLaserBoxPanels(defaultLaserBoxParams);
  const svg = panelsToSVG(panels);
  const dxf = panelsToDXF(panels);
  console.log(
    "LASERBOX: painéis =", panels.map((p) => p.name).join(","),
    "| svg bytes =", svg.length,
    "| dxf bytes =", dxf.length
  );
  if (panels.length !== 5) throw new Error("laserbox: esperava 5 painéis (aberta)");
  const closed = generateLaserBoxPanels({ ...defaultLaserBoxParams, closedTop: true });
  if (closed.length !== 6) throw new Error("laserbox: esperava 6 painéis (fechada)");
  if (!svg.includes("<svg") || !dxf.includes("EOF"))
    throw new Error("laserbox: export inválido");
}

// --- Desk Organizer ---
{
  const org = generateDeskOrganizerGeometry(defaultDeskOrganizerParams);
  org.computeBoundingBox();
  const ob = org.boundingBox!;
  console.log(
    "ORGANIZER: verts =", org.attributes.position.count,
    "| bbox mm =",
    [ob.max.x - ob.min.x, ob.max.y - ob.min.y, ob.max.z - ob.min.z]
      .map((v) => v.toFixed(0))
      .join(" x ")
  );
  if (Math.abs(ob.max.z - 60) > 0.01) throw new Error("organizer: altura errada");
}

console.log("\n✓ todos os smoke tests passaram");

export interface LaserBoxParams {
  /** Largura externa da caixa em mm (eixo X) */
  widthMM: number;
  /** Altura externa em mm (eixo Z) */
  heightMM: number;
  /** Profundidade externa em mm (eixo Y) */
  depthMM: number;
  /** Espessura do material (MDF/acrílico) em mm */
  materialThickness: number;
  /** Largura alvo de cada dente do encaixe em mm */
  fingerWidth: number;
  /** Caixa com tampa (fechada) ou aberta em cima */
  closedTop: boolean;
}

export const defaultLaserBoxParams: LaserBoxParams = {
  widthMM: 100,
  heightMM: 60,
  depthMM: 80,
  materialThickness: 3,
  fingerWidth: 12,
  closedTop: false,
};

export interface Panel {
  name: string;
  /** Contorno fechado do painel em mm (primeiro ponto ≠ último; fechar no render) */
  outline: Array<[number, number]>;
  width: number;
  height: number;
}

type EdgeMode = "tabs" | "slots" | "flat";
type Pt = [number, number];

/** Quantidade ímpar de segmentos pro encaixe (mínimo 3) */
function fingerCount(length: number, fingerWidth: number): number {
  let n = Math.max(3, Math.round(length / fingerWidth));
  if (n % 2 === 0) n += 1;
  return n;
}

/**
 * Gera os pontos de uma aresta com dentes de encaixe (finger joint).
 * Percorre de p0 a p1 (sentido horário do painel); `outward` é a normal
 * unitária apontando pra fora. Segmentos alternam entre a linha da aresta
 * (dente) e o recuo de `t` pra dentro (vão). `tabs` começa/termina com dente;
 * `slots` é o complemento (começa/termina com vão) — arestas casadas usam
 * modos opostos e encaixam perfeitamente.
 */
function fingerEdge(
  p0: Pt,
  p1: Pt,
  outward: Pt,
  mode: EdgeMode,
  t: number,
  fingerWidth: number
): Pt[] {
  if (mode === "flat") return [p0, p1];

  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const n = fingerCount(len, fingerWidth);
  const seg = len / n;
  const dir: Pt = [(p1[0] - p0[0]) / len, (p1[1] - p0[1]) / len];
  const inset: Pt = [-outward[0] * t, -outward[1] * t];

  const at = (d: number, level: 0 | 1): Pt => [
    p0[0] + dir[0] * d + (level ? inset[0] : 0),
    p0[1] + dir[1] * d + (level ? inset[1] : 0),
  ];

  // tabs: segmentos pares no nível 0 (fora); slots: pares no nível 1 (dentro)
  const levelOf = (i: number): 0 | 1 =>
    mode === "tabs" ? ((i % 2) as 0 | 1) : (((i + 1) % 2) as 0 | 1);

  const pts: Pt[] = [at(0, levelOf(0))];
  for (let i = 0; i < n - 1; i++) {
    const d = seg * (i + 1);
    pts.push(at(d, levelOf(i)));
    pts.push(at(d, levelOf(i + 1)));
  }
  pts.push(at(len, levelOf(n - 1)));
  return pts;
}

/**
 * Monta o contorno de um painel retangular w×h aplicando um modo de encaixe
 * por aresta (ordem: baixo, direita, topo, esquerda — sentido horário com Y
 * pra cima). Quando duas arestas consecutivas terminam/começam recuadas,
 * insere o canto interno pra manter ângulos retos.
 */
function buildPanel(
  name: string,
  w: number,
  h: number,
  edges: [EdgeMode, EdgeMode, EdgeMode, EdgeMode],
  t: number,
  fingerWidth: number
): Panel {
  const corners: Pt[] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const outwards: Pt[] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  const outline: Pt[] = [];
  for (let e = 0; e < 4; e++) {
    const pts = fingerEdge(
      corners[e],
      corners[(e + 1) % 4],
      outwards[e],
      edges[e],
      t,
      fingerWidth
    );
    if (outline.length > 0) {
      const last = outline[outline.length - 1];
      const first = pts[0];
      const dx = first[0] - last[0];
      const dy = first[1] - last[1];
      // ambas recuadas no canto → adiciona o canto interno (ângulo reto)
      if (Math.abs(dx) > 1e-6 && Math.abs(dy) > 1e-6) {
        outline.push([
          outwards[e][0] !== 0 ? first[0] : last[0],
          outwards[e][1] !== 0 ? first[1] : last[1],
        ]);
      }
    }
    outline.push(...pts);
  }
  // remove ponto duplicado do fechamento
  const first = outline[0];
  const last = outline[outline.length - 1];
  if (Math.abs(first[0] - last[0]) < 1e-6 && Math.abs(first[1] - last[1]) < 1e-6) {
    outline.pop();
  }

  return { name, outline, width: w, height: h };
}

/**
 * Gera os painéis 2D da caixa com encaixes finger joint.
 * Convenção (estilo makercase/boxes.py): frente/trás têm dentes nas arestas
 * verticais; laterais têm os vãos correspondentes; o fundo (e a tampa, se
 * fechada) tem dentes nas 4 arestas e todas as paredes têm vãos embaixo/em cima.
 */
export function generateLaserBoxPanels(params: LaserBoxParams): Panel[] {
  const {
    widthMM: w,
    heightMM: h,
    depthMM: d,
    materialThickness: t,
    fingerWidth: f,
    closedTop,
  } = params;

  const topWall: EdgeMode = closedTop ? "slots" : "flat";
  const panels: Panel[] = [
    // arestas: [baixo, direita, topo, esquerda]
    buildPanel("frente", w, h, ["slots", "tabs", topWall, "tabs"], t, f),
    buildPanel("tras", w, h, ["slots", "tabs", topWall, "tabs"], t, f),
    buildPanel("esquerda", d, h, ["slots", "slots", topWall, "slots"], t, f),
    buildPanel("direita", d, h, ["slots", "slots", topWall, "slots"], t, f),
    buildPanel("fundo", w, d, ["tabs", "tabs", "tabs", "tabs"], t, f),
  ];
  if (closedTop) {
    panels.push(buildPanel("tampa", w, d, ["tabs", "tabs", "tabs", "tabs"], t, f));
  }
  return panels;
}

const GAP = 8; // espaço entre painéis no layout

/** Layout lado a lado dos painéis com offsets pra SVG/DXF. */
function layoutPanels(panels: Panel[]): Array<Panel & { ox: number; oy: number }> {
  let x = GAP;
  return panels.map((p) => {
    const placed = { ...p, ox: x, oy: GAP };
    x += p.width + GAP;
    return placed;
  });
}

/** Exporta os painéis como SVG (unidades em mm, traço fino pra corte). */
export function panelsToSVG(panels: Panel[]): string {
  const placed = layoutPanels(panels);
  const totalW = placed.reduce((m, p) => Math.max(m, p.ox + p.width), 0) + GAP;
  const totalH = placed.reduce((m, p) => Math.max(m, p.oy + p.height), 0) + GAP;

  const paths = placed
    .map((p) => {
      const pts = p.outline
        .map(
          // Y invertido: SVG cresce pra baixo
          ([px, py], i) =>
            `${i === 0 ? "M" : "L"}${(p.ox + px).toFixed(3)},${(
              totalH - (p.oy + py)
            ).toFixed(3)}`
        )
        .join(" ");
      return `  <path d="${pts} Z" fill="none" stroke="#ff0000" stroke-width="0.1"><title>${p.name}</title></path>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}mm" height="${totalH}mm" viewBox="0 0 ${totalW} ${totalH}">
${paths}
</svg>`;
}

/** Exporta os painéis como DXF R12 (POLYLINE fechada por painel). */
export function panelsToDXF(panels: Panel[]): string {
  const placed = layoutPanels(panels);
  const lines: string[] = ["0", "SECTION", "2", "ENTITIES"];

  for (const p of placed) {
    lines.push("0", "POLYLINE", "8", p.name, "66", "1", "70", "1");
    for (const [px, py] of p.outline) {
      lines.push(
        "0", "VERTEX", "8", p.name,
        "10", (p.ox + px).toFixed(3),
        "20", (p.oy + py).toFixed(3),
        "30", "0"
      );
    }
    lines.push("0", "SEQEND");
  }

  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}

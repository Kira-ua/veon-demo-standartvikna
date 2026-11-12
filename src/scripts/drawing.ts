// Window drawing for the calculator: pure functions that return SVG markup (used at build time and in the browser).
export const VB = { w: 560, h: 380 };
const BOX = { x0: 104, y0: 16, x1: 536, y1: 296 };

export type Kind = "fix" | "tt-l" | "tt-r" | "turn-l" | "turn-r" | "door-l" | "door-r";
export interface Leaf { f: number; k: Kind; h?: number }
export interface WinType { id: string; label: string; leaves: Leaf[]; mini: [number, number] }

export const TYPES: WinType[] = [
  { id: "fixed", label: "Глухе", leaves: [{ f: 1, k: "fix" }], mini: [40, 48] },
  { id: "single", label: "Одностулкове", leaves: [{ f: 1, k: "tt-r" }], mini: [40, 48] },
  { id: "double", label: "Двостулкове", leaves: [{ f: 1, k: "turn-l" }, { f: 1, k: "tt-r" }], mini: [54, 46] },
  { id: "triple", label: "Тристулкове", leaves: [{ f: 1, k: "turn-l" }, { f: 1.2, k: "fix" }, { f: 1, k: "tt-r" }], mini: [60, 44] },
  { id: "balcony", label: "З балконними дверима", leaves: [{ f: 0.62, k: "tt-l", h: 0.6 }, { f: 0.38, k: "door-r" }], mini: [54, 54] },
  { id: "door", label: "Балконні двері", leaves: [{ f: 1, k: "door-r" }], mini: [28, 54] },
];

export interface Geo { x: number; y: number; wp: number; hp: number; t: number }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const n = (v: number) => Math.round(v * 10) / 10;

export function layout(w: number, h: number): Geo {
  const bw = BOX.x1 - BOX.x0, bh = BOX.y1 - BOX.y0;
  const s = Math.min(bw / w, bh / h);
  const wp = w * s, hp = h * s;
  return { x: BOX.x0 + (bw - wp) / 2, y: BOX.y0 + (bh - hp) / 2, wp, hp, t: clamp(60 * s, 5, 14) };
}

function leafSvg(kind: Kind, x: number, y: number, w: number, h: number, st: number): string {
  const open = kind !== "fix";
  const inset = open ? st : Math.max(2, st * 0.45);
  const gx = x + inset, gy = y + inset, gw = w - 2 * inset;
  let gh = h - 2 * inset;
  let out = `<rect class="fr" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"/>`;
  const door = kind.startsWith("door");
  if (door) gh = (h - 2 * inset) * 0.66;
  out += `<rect class="gl" x="${n(gx)}" y="${n(gy)}" width="${n(gw)}" height="${n(gh)}"/>`;
  if (door) out += `<rect class="pn" x="${n(gx)}" y="${n(gy + gh + 3)}" width="${n(gw)}" height="${n(h - 2 * inset - gh - 3)}"/>`;
  const L = gx, R = gx + gw, T = gy, B = gy + gh, M = gy + gh / 2;
  const hingeL = kind.endsWith("-l") && kind !== "fix";
  if (kind.startsWith("turn") || kind.startsWith("tt") || door) {
    out += hingeL ? `<polyline class="op" points="${n(R)},${n(T)} ${n(L)},${n(M)} ${n(R)},${n(B)}"/>` : `<polyline class="op" points="${n(L)},${n(T)} ${n(R)},${n(M)} ${n(L)},${n(B)}"/>`;
  }
  if (kind.startsWith("tt")) out += `<polyline class="op op--tilt" points="${n(L)},${n(T)} ${n((L + R) / 2)},${n(B)} ${n(R)},${n(T)}"/>`;
  if (open) {
    const hx = hingeL ? x + w - inset * 0.75 : x + inset * 0.75;
    const hy = door ? y + h * 0.5 : y + h / 2;
    out += `<rect class="hd" x="${n(hx - 1.5)}" y="${n(hy - 6)}" width="3" height="12" rx="1.5"/>`;
  }
  return out;
}

/** Window shapes inside the rectangle (x, y, wp, hp). */
export function windowShapes(type: WinType, g: Geo): string {
  const { x, y, wp, hp, t } = g;
  const st = clamp(t * 0.75, 3, 10);
  let out = `<rect class="fr fr--outer" x="${n(x)}" y="${n(y)}" width="${n(wp)}" height="${n(hp)}"/>`;
  const iw = wp - 2 * t, ih = hp - 2 * t;
  const sum = type.leaves.reduce((a, l) => a + l.f, 0);
  let cx = x + t;
  for (const leaf of type.leaves) {
    const lw = (iw * leaf.f) / sum;
    const lh = ih * (leaf.h ?? 1);
    out += leafSvg(leaf.k, cx, y + t, lw, lh, st);
    if (leaf.h && leaf.h < 1) {
      out += `<rect class="wall" x="${n(cx)}" y="${n(y + t + lh)}" width="${n(lw)}" height="${n(ih - lh)}"/>`;
    }
    cx += lw;
  }
  return out;
}

export function windowSvg(type: WinType, g: Geo): string {
  return windowShapes(type, g);
}

/** Dimension lines (orange). The numbers themselves are HTML inputs placed on the lines. */
export function dimsSvg(g: Geo): { svg: string; wy: number; hx: number; cx: number; cy: number } {
  const { x, y, wp, hp } = g;
  const wy = y + hp + 40, hx = x - 56;
  const tick = (px: number, py: number) => `<line x1="${n(px - 5)}" y1="${n(py + 5)}" x2="${n(px + 5)}" y2="${n(py - 5)}"/>`;
  const svg =
    `<g class="dim-ext"><line x1="${n(x)}" y1="${n(y + hp + 6)}" x2="${n(x)}" y2="${n(wy + 8)}"/><line x1="${n(x + wp)}" y1="${n(y + hp + 6)}" x2="${n(x + wp)}" y2="${n(wy + 8)}"/>` +
    `<line x1="${n(x - 6)}" y1="${n(y)}" x2="${n(hx - 8)}" y2="${n(y)}"/><line x1="${n(x - 6)}" y1="${n(y + hp)}" x2="${n(hx - 8)}" y2="${n(y + hp)}"/></g>` +
    `<g class="dim-ln"><line x1="${n(x)}" y1="${n(wy)}" x2="${n(x + wp)}" y2="${n(wy)}"/>${tick(x, wy)}${tick(x + wp, wy)}` +
    `<line x1="${n(hx)}" y1="${n(y)}" x2="${n(hx)}" y2="${n(y + hp)}"/>${tick(hx, y)}${tick(hx, y + hp)}</g>`;
  return { svg, wy, hx, cx: x + wp / 2, cy: y + hp / 2 };
}

/** Small scheme for a type tile. */
export function miniSvg(type: WinType): string {
  const [mw, mh] = type.mini;
  const x = (64 - mw) / 2, y = (56 - mh) / 2 + 2;
  return `<svg class="mini" viewBox="0 0 64 60" aria-hidden="true" focusable="false">${windowShapes(type, { x, y, wp: mw, hp: mh, t: 3 })}</svg>`;
}

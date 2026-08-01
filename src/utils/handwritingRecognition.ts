import { Point } from "../types/whiteboard";

/**
 * $1 Unistroke Recognizer (Wobbrock, Wilson & Li — UIST 2007)
 * with an $N-style multi-stroke buffer.
 *
 * Covers: A–Z (uppercase), a–z (lowercase), 0–9, and common symbols.
 * Multiple written variants per glyph increase real-world accuracy.
 * Runs 100% locally — no API, no network, works offline.
 */

const NUM_POINTS = 64;
const SQUARE_SIZE = 250;
const ORIGIN: Point = { x: 0, y: 0 };
const DIAGONAL = Math.sqrt(SQUARE_SIZE * SQUARE_SIZE + SQUARE_SIZE * SQUARE_SIZE);
const HALF_DIAGONAL = 0.5 * DIAGONAL;
const ANGLE_RANGE = deg2Rad(45);
const ANGLE_PRECISION = deg2Rad(2);
const PHI = 0.5 * (-1 + Math.sqrt(5));

function deg2Rad(d: number) {
  return (d * Math.PI) / 180;
}
function distance(p1: Point, p2: Point) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}
function pathLength(points: Point[]) {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += distance(points[i - 1], points[i]);
  return d;
}
function centroid(points: Point[]): Point {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}
function boundingBox(points: Point[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function resample(points: Point[], n: number): Point[] {
  const I = pathLength(points) / (n - 1);
  let D = 0;
  const newPoints: Point[] = [points[0]];
  const pts = points.map((p) => ({ ...p }));
  for (let i = 1; i < pts.length; i++) {
    const d = distance(pts[i - 1], pts[i]);
    if (D + d >= I) {
      const qx = pts[i - 1].x + ((I - D) / d) * (pts[i].x - pts[i - 1].x);
      const qy = pts[i - 1].y + ((I - D) / d) * (pts[i].y - pts[i - 1].y);
      const q = { x: qx, y: qy };
      newPoints.push(q);
      pts.splice(i, 0, q);
      D = 0;
    } else {
      D += d;
    }
  }
  while (newPoints.length < n) newPoints.push({ ...pts[pts.length - 1] });
  return newPoints.slice(0, n);
}

function indicativeAngle(points: Point[]): number {
  const c = centroid(points);
  return Math.atan2(c.y - points[0].y, c.x - points[0].x);
}

function rotateBy(points: Point[], radians: number): Point[] {
  const c = centroid(points);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return points.map((p) => ({
    x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x,
    y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y,
  }));
}

function scaleTo(points: Point[], size: number): Point[] {
  const b = boundingBox(points);
  const w = b.width || 1;
  const h = b.height || 1;
  return points.map((p) => ({ x: (p.x * size) / w, y: (p.y * size) / h }));
}

function translateTo(points: Point[], pt: Point): Point[] {
  const c = centroid(points);
  return points.map((p) => ({ x: p.x + pt.x - c.x, y: p.y + pt.y - c.y }));
}

function pathDistance(pts1: Point[], pts2: Point[]): number {
  let d = 0;
  for (let i = 0; i < pts1.length; i++) d += distance(pts1[i], pts2[i]);
  return d / pts1.length;
}

function distanceAtAngle(points: Point[], template: Point[], radians: number): number {
  return pathDistance(rotateBy(points, radians), template);
}

function distanceAtBestAngle(points: Point[], template: Point[]): number {
  let a = -ANGLE_RANGE;
  let b = ANGLE_RANGE;
  let x1 = PHI * a + (1 - PHI) * b;
  let f1 = distanceAtAngle(points, template, x1);
  let x2 = (1 - PHI) * a + PHI * b;
  let f2 = distanceAtAngle(points, template, x2);
  while (Math.abs(b - a) > ANGLE_PRECISION) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = PHI * a + (1 - PHI) * b;
      f1 = distanceAtAngle(points, template, x1);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = (1 - PHI) * a + PHI * b;
      f2 = distanceAtAngle(points, template, x2);
    }
  }
  return Math.min(f1, f2);
}

function normalize(points: Point[]): Point[] {
  let pts = resample(points, NUM_POINTS);
  pts = rotateBy(pts, -indicativeAngle(pts));
  pts = scaleTo(pts, SQUARE_SIZE);
  pts = translateTo(pts, ORIGIN);
  return pts;
}

const P = (pairs: number[][]): Point[] => pairs.map(([x, y]) => ({ x, y }));

interface Template {
  char: string;
  strokes: Point[][];
  /** Aspect-ratio hint: tall (≈0.5), square (≈1), wide (≈1.6). */
  aspect?: number;
}

/* ══════════════════════════════════════════════════════════════════
   UPPERCASE  A – Z   (multiple written variants each)
══════════════════════════════════════════════════════════════════ */
const UPPERCASE: Template[] = [
  { char: "A", strokes: [P([[0,100],[50,0],[100,100]]), P([[20,62],[80,62]])] },
  { char: "A", strokes: [P([[8,100],[50,4],[92,100]]), P([[24,66],[76,66]])] },
  { char: "A", strokes: [P([[0,100],[50,0]]), P([[50,0],[100,100]]), P([[18,64],[82,64]])] },

  { char: "B", strokes: [P([[0,0],[0,100]]), P([[0,0],[62,6],[72,26],[58,48],[0,50]]), P([[0,50],[68,54],[78,78],[60,98],[0,100]])] },
  { char: "B", strokes: [P([[6,2],[6,98]]), P([[6,2],[60,8],[68,28],[54,48],[6,50],[66,56],[74,78],[56,96],[6,98]])] },

  { char: "C", strokes: [P([[94,16],[70,2],[36,0],[10,22],[0,54],[8,84],[36,100],[72,98],[94,84]])] },
  { char: "C", strokes: [P([[90,22],[58,4],[24,12],[4,42],[6,70],[26,92],[58,100],[88,88]])] },

  { char: "D", strokes: [P([[0,0],[0,100]]), P([[0,0],[52,4],[88,32],[90,66],[54,96],[0,100]])] },
  { char: "D", strokes: [P([[8,2],[8,98]]), P([[8,2],[56,8],[86,36],[86,64],[56,94],[8,98]])] },

  { char: "E", strokes: [P([[94,0],[0,0],[0,100],[94,100]]), P([[0,50],[68,50]])] },
  { char: "E", strokes: [P([[90,4],[6,2],[6,98],[92,98]]), P([[6,50],[64,50]])] },

  { char: "F", strokes: [P([[94,0],[0,0],[0,100]]), P([[0,48],[68,48]])] },
  { char: "F", strokes: [P([[88,4],[6,2],[6,100]]), P([[6,46],[64,46]])] },

  { char: "G", strokes: [P([[94,16],[64,0],[28,6],[4,34],[2,64],[22,90],[56,100],[86,90],[98,66],[98,56],[56,56]])] },
  { char: "G", strokes: [P([[90,20],[56,4],[22,14],[4,44],[10,74],[40,96],[74,94],[94,72],[94,58],[58,58]])] },

  { char: "H", strokes: [P([[0,0],[0,100]]), P([[100,0],[100,100]]), P([[0,50],[100,50]])] },
  { char: "H", strokes: [P([[6,2],[6,98]]), P([[94,2],[94,98]]), P([[6,48],[94,48]])] },

  { char: "I", strokes: [P([[50,0],[50,100]])], aspect: 0.25 },
  { char: "I", strokes: [P([[20,0],[80,0]]), P([[50,0],[50,100]]), P([[20,100],[80,100]])] },

  { char: "J", strokes: [P([[78,0],[78,72],[58,96],[26,98],[4,80]])] },
  { char: "J", strokes: [P([[30,0],[86,0]]), P([[70,0],[70,74],[48,96],[18,94],[2,76]])] },

  { char: "K", strokes: [P([[0,0],[0,100]]), P([[94,0],[4,52],[94,100]])] },
  { char: "K", strokes: [P([[8,2],[8,98]]), P([[90,4],[10,52]]), P([[10,52],[92,98]])] },

  { char: "L", strokes: [P([[0,0],[0,100],[90,100]])] },
  { char: "L", strokes: [P([[8,2],[8,96],[92,98]])] },

  { char: "M", strokes: [P([[0,100],[0,0],[50,58],[100,0],[100,100]])] },
  { char: "M", strokes: [P([[4,98],[6,4],[50,62],[94,4],[96,98]])] },

  { char: "N", strokes: [P([[0,100],[0,0],[100,100],[100,0]])] },
  { char: "N", strokes: [P([[6,98],[6,4],[94,96],[94,2]])] },

  { char: "O", strokes: [P([[50,0],[16,10],[0,45],[8,80],[42,100],[80,92],[100,56],[90,18],[54,0],[50,0]])] },
  { char: "O", strokes: [P([[46,2],[14,14],[2,48],[12,82],[48,98],[82,88],[96,54],[86,18],[50,2]])] },

  { char: "P", strokes: [P([[0,100],[0,0]]), P([[0,0],[64,6],[74,30],[60,52],[0,54]])] },
  { char: "P", strokes: [P([[8,98],[8,2]]), P([[8,2],[66,10],[72,32],[56,50],[8,52]])] },

  { char: "Q", strokes: [P([[50,0],[16,10],[0,45],[8,80],[42,98],[80,90],[100,56],[90,18],[54,0],[50,0]]), P([[62,68],[100,104]])] },

  { char: "R", strokes: [P([[0,100],[0,0]]), P([[0,0],[64,6],[74,30],[58,52],[0,54]]), P([[44,54],[98,100]])] },
  { char: "R", strokes: [P([[8,98],[8,2]]), P([[8,2],[68,10],[74,34],[60,52],[8,54]]), P([[46,54],[94,98]])] },
  { char: "R", strokes: [P([[6,100],[6,4],[66,10],[72,32],[56,52],[6,54],[44,56],[96,100]])] },

  { char: "S", strokes: [P([[92,14],[62,0],[26,4],[6,24],[18,48],[68,58],[92,76],[74,96],[32,100],[4,86]])] },
  { char: "S", strokes: [P([[88,18],[54,4],[24,12],[6,34],[16,56],[66,66],[88,80],[68,96],[28,98],[6,80]])] },
  { char: "S", strokes: [P([[90,10],[48,2],[18,14],[4,38],[14,60],[70,70],[90,84],[66,98],[24,96],[4,78]])] },

  { char: "T", strokes: [P([[0,0],[100,0]]), P([[50,0],[50,100]])] },
  { char: "T", strokes: [P([[4,4],[96,2]]), P([[50,2],[50,98]])] },

  { char: "U", strokes: [P([[0,0],[0,66],[20,94],[54,100],[86,90],[100,62],[100,0]])] },
  { char: "U", strokes: [P([[6,2],[6,68],[26,94],[56,98],[86,88],[96,64],[96,2]])] },

  { char: "V", strokes: [P([[0,0],[50,100],[100,0]])] },
  { char: "V", strokes: [P([[4,2],[50,98],[96,2]])] },

  { char: "W", strokes: [P([[0,0],[22,100],[50,42],[78,100],[100,0]])] },
  { char: "W", strokes: [P([[4,2],[26,98],[50,44],[74,98],[96,2]])] },

  { char: "X", strokes: [P([[0,0],[100,100]]), P([[100,0],[0,100]])] },
  { char: "X", strokes: [P([[6,2],[94,98]]), P([[94,2],[6,98]])] },

  { char: "Y", strokes: [P([[0,0],[50,52]]), P([[100,0],[50,52],[50,100]])] },
  { char: "Y", strokes: [P([[4,2],[50,50],[96,2]]), P([[50,50],[50,98]])] },

  { char: "Z", strokes: [P([[0,0],[100,0],[0,100],[100,100]])] },
  { char: "Z", strokes: [P([[6,4],[94,2],[8,96],[94,98]])] },
];

/* ══════════════════════════════════════════════════════════════════
   LOWERCASE  a – z
   x-height letters live in y≈35–100, ascenders start at y≈0,
   descenders reach y≈130 — the recogniser normalises scale anyway,
   but the relative proportions still help discrimination.
══════════════════════════════════════════════════════════════════ */
const LOWERCASE: Template[] = [
  { char: "a", strokes: [P([[86,40],[60,32],[30,36],[14,56],[18,84],[44,98],[72,92],[86,70],[86,36]]), P([[86,40],[86,98]])] },
  { char: "a", strokes: [P([[84,44],[56,34],[26,42],[14,62],[22,86],[50,98],[78,88],[86,66]]), P([[86,44],[88,96]])] },

  { char: "b", strokes: [P([[10,0],[10,100]]), P([[10,60],[34,40],[64,40],[84,58],[84,80],[64,98],[32,98],[10,80]])] },
  { char: "c", strokes: [P([[86,50],[60,36],[30,40],[12,60],[16,84],[40,98],[70,96],[88,84]])] },

  { char: "d", strokes: [P([[86,0],[86,100]]), P([[86,58],[62,38],[32,40],[12,60],[16,84],[42,98],[72,92],[86,76]])] },
  { char: "e", strokes: [P([[14,68],[84,66],[80,46],[52,36],[24,46],[12,68],[20,88],[48,98],[78,90]])] },

  { char: "f", strokes: [P([[70,4],[46,4],[34,20],[34,100]]), P([[12,40],[64,40]])] },
  { char: "g", strokes: [P([[84,44],[58,34],[28,40],[14,60],[20,84],[46,96],[76,88],[84,68]]), P([[84,40],[84,110],[62,128],[28,126],[10,112]])] },

  { char: "h", strokes: [P([[12,0],[12,100]]), P([[12,58],[38,40],[68,42],[84,62],[84,100]])] },
  { char: "i", strokes: [P([[50,10],[50,16]]), P([[50,40],[50,100]])] },
  { char: "i", strokes: [P([[50,40],[50,100]])], aspect: 0.3 },

  { char: "j", strokes: [P([[62,10],[62,16]]), P([[62,40],[62,110],[44,126],[18,122]])] },
  { char: "k", strokes: [P([[14,0],[14,100]]), P([[80,42],[18,74],[82,100]])] },

  { char: "l", strokes: [P([[46,0],[46,100]])], aspect: 0.22 },
  { char: "l", strokes: [P([[40,2],[40,90],[62,100]])] },

  { char: "m", strokes: [P([[8,100],[8,40]]), P([[8,52],[28,40],[46,50],[46,100]]), P([[46,52],[68,40],[88,50],[88,100]])] },
  { char: "n", strokes: [P([[12,100],[12,40]]), P([[12,56],[36,40],[66,42],[84,62],[84,100]])] },

  { char: "o", strokes: [P([[50,36],[24,44],[12,64],[20,86],[48,98],[76,90],[88,68],[80,46],[52,36]])] },
  { char: "p", strokes: [P([[12,40],[12,128]]), P([[12,58],[36,40],[66,40],[86,60],[84,82],[62,98],[32,96],[12,80]])] },

  { char: "q", strokes: [P([[86,40],[86,128]]), P([[86,58],[62,38],[32,40],[12,60],[16,84],[42,98],[72,92],[86,76]])] },
  { char: "r", strokes: [P([[16,100],[16,40]]), P([[16,58],[40,42],[72,40]])] },

  { char: "s", strokes: [P([[84,48],[56,36],[28,40],[18,56],[36,68],[70,74],[84,86],[62,98],[28,96],[12,84]])] },
  { char: "t", strokes: [P([[42,6],[42,86],[62,100],[82,94]]), P([[16,36],[70,36]])] },

  { char: "u", strokes: [P([[12,40],[12,80],[32,98],[62,98],[84,80],[84,40]]), P([[84,60],[84,100]])] },
  { char: "v", strokes: [P([[10,40],[50,100],[90,40]])] },

  { char: "w", strokes: [P([[8,40],[26,100],[50,58],[74,100],[92,40]])] },
  { char: "x", strokes: [P([[14,40],[86,100]]), P([[86,40],[14,100]])] },

  { char: "y", strokes: [P([[12,40],[50,96]]), P([[88,40],[46,110],[24,128],[6,124]])] },
  { char: "z", strokes: [P([[14,42],[86,40],[14,98],[88,98]])] },
];

/* ══════════════════════════════════════════════════════════════════
   DIGITS  0 – 9
══════════════════════════════════════════════════════════════════ */
const DIGITS: Template[] = [
  { char: "0", strokes: [P([[50,0],[16,12],[4,50],[16,88],[50,100],[84,88],[96,50],[84,12],[50,0]])] },
  { char: "0", strokes: [P([[48,2],[18,16],[8,50],[18,84],[48,98],[80,86],[92,52],[80,16],[48,2]])] },

  { char: "1", strokes: [P([[22,20],[50,0],[50,100]])] },
  { char: "1", strokes: [P([[18,24],[48,2],[48,98]]), P([[22,100],[78,100]])] },
  { char: "1", strokes: [P([[50,2],[50,98]])], aspect: 0.28 },

  { char: "2", strokes: [P([[6,22],[36,0],[74,8],[86,36],[54,66],[6,100],[92,100]])] },
  { char: "2", strokes: [P([[10,26],[40,4],[76,14],[84,40],[48,70],[8,98],[90,98]])] },

  { char: "3", strokes: [P([[8,10],[52,0],[86,18],[62,46],[26,50],[64,54],[92,74],[62,100],[14,94]])] },
  { char: "3", strokes: [P([[12,14],[54,2],[84,20],[60,46],[30,50],[66,56],[88,76],[58,98],[16,92]])] },

  { char: "4", strokes: [P([[70,100],[70,0],[0,68],[100,68]])] },
  { char: "4", strokes: [P([[68,2],[4,70],[96,70]]), P([[68,2],[68,98]])] },

  { char: "5", strokes: [P([[88,0],[16,0],[10,44],[52,38],[88,58],[78,92],[28,100],[4,86]])] },
  { char: "5", strokes: [P([[86,4],[18,2],[12,46],[56,40],[86,60],[76,90],[30,98],[8,84]])] },

  { char: "6", strokes: [P([[80,4],[36,10],[8,46],[6,80],[38,100],[74,92],[86,64],[60,48],[20,54],[8,74]])] },
  { char: "7", strokes: [P([[0,0],[100,0],[42,100]])] },
  { char: "7", strokes: [P([[4,4],[96,2],[40,98]]), P([[26,52],[74,50]])] },

  { char: "8", strokes: [P([[50,0],[18,10],[16,36],[50,50],[86,38],[84,10],[50,0]]), P([[50,50],[12,66],[16,92],[52,100],[88,90],[90,64],[50,50]])] },
  { char: "9", strokes: [P([[86,50],[52,58],[18,46],[16,18],[52,2],[86,16],[92,54],[70,92],[26,100]])] },
];

/* ══════════════════════════════════════════════════════════════════
   COMMON SYMBOLS
══════════════════════════════════════════════════════════════════ */
const SYMBOLS: Template[] = [
  { char: "+", strokes: [P([[50,10],[50,90]]), P([[10,50],[90,50]])] },
  { char: "-", strokes: [P([[10,50],[90,50]])], aspect: 3 },
  { char: "=", strokes: [P([[10,36],[90,36]]), P([[10,64],[90,64]])] },
  { char: "?", strokes: [P([[10,24],[34,2],[68,6],[82,28],[66,50],[48,62],[48,76]]), P([[48,94],[48,100]])] },
  { char: "!", strokes: [P([[50,0],[50,74]]), P([[50,92],[50,100]])] },
  { char: "*", strokes: [P([[50,10],[50,90]]), P([[16,30],[84,70]]), P([[84,30],[16,70]])] },
  { char: "/", strokes: [P([[90,0],[10,100]])] },
];

const ALL_TEMPLATES: Template[] = [...UPPERCASE, ...LOWERCASE, ...DIGITS, ...SYMBOLS];

/** Flatten multi-stroke templates into a single connected polyline. */
function flatten(strokes: Point[][]): Point[] {
  const out: Point[] = [];
  strokes.forEach((s) => out.push(...s));
  return out;
}

const NORMALIZED_TEMPLATES = ALL_TEMPLATES.map((t) => {
  const flat = flatten(t.strokes);
  const bb = boundingBox(flat);
  return {
    char: t.char,
    strokeCount: t.strokes.length,
    points: normalize(flat),
    aspect: t.aspect ?? (bb.height > 0 ? bb.width / bb.height : 1),
  };
});

export interface HandwritingResult {
  text: string;
  score: number;
  /** Runner-up suggestions, best first. */
  alternatives: { text: string; score: number }[];
}

/**
 * Recognize one or more strokes as a single character.
 * `strokes` — array of raw point arrays in canvas space.
 */
export function recognizeStrokes(strokes: Point[][]): HandwritingResult | null {
  const all = flatten(strokes);
  if (all.length < 6) return null;

  const bb = boundingBox(all);
  // Reject sprawling sketches (likely a drawing, not a glyph)
  if (bb.width > 1100 || bb.height > 1100) return null;

  const userAspect = bb.height > 0 ? bb.width / bb.height : 1;
  const candidate = normalize(all);

  const scored: { char: string; score: number }[] = [];
  for (const t of NORMALIZED_TEMPLATES) {
    const d = distanceAtBestAngle(candidate, t.points);
    let score = 1 - d / HALF_DIAGONAL;

    // Stroke-count agreement bonus
    if (t.strokeCount === strokes.length) score += 0.06;
    else if (Math.abs(t.strokeCount - strokes.length) === 1) score += 0.02;

    // Aspect-ratio agreement bonus (helps I vs O, l vs D, - vs =, …)
    const aspectDelta = Math.abs(Math.log((userAspect || 1) / (t.aspect || 1)));
    score += Math.max(-0.08, 0.05 - aspectDelta * 0.09);

    scored.push({ char: t.char, score });
  }

  // Best score per character (templates repeat per glyph)
  const bestPerChar = new Map<string, number>();
  for (const s of scored) {
    const prev = bestPerChar.get(s.char);
    if (prev === undefined || s.score > prev) bestPerChar.set(s.char, s.score);
  }

  const ranked = Array.from(bestPerChar.entries())
    .map(([text, score]) => ({ text, score }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) return null;

  // Threshold tuned so ordinary handwriting converts but sketches don't.
  if (best.score < 0.60) return null;

  return {
    text: best.text,
    score: best.score,
    alternatives: ranked.slice(1, 5),
  };
}

/** Backwards-compatible single-stroke entry point. */
export function recognizeHandwriting(points: Point[]): HandwritingResult | null {
  return recognizeStrokes([points]);
}

/** Combined bounding box of several strokes. */
export function strokesBounds(strokes: Point[][]) {
  return boundingBox(flatten(strokes));
}

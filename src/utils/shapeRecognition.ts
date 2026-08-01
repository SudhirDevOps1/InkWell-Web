import { Point, WbElement } from "../types/whiteboard";

export type RecognizedShape =
  | { kind: "circle" | "rounded-rect" | "triangle" | "diamond"; x: number; y: number; w: number; h: number }
  | { kind: "line" | "arrow"; x: number; y: number; w: number; h: number; points: Point[] }
  | null;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function perp(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (!dx && !dy) return dist(p, a);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / Math.hypot(dx, dy);
}

/** Ramer–Douglas–Peucker simplification. */
function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  let max = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perp(points[i], points[0], points[points.length - 1]);
    if (d > max) {
      max = d;
      index = i;
    }
  }
  if (max > epsilon) {
    const left = simplify(points.slice(0, index + 1), epsilon);
    const right = simplify(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

/** Turn angle (degrees) at vertex b between segments a→b and b→c. */
function turnAngle(a: Point, b: Point, c: Point): number {
  const v1x = b.x - a.x, v1y = b.y - a.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const m1 = Math.hypot(v1x, v1y), m2 = Math.hypot(v2x, v2y);
  if (m1 < 1e-6 || m2 < 1e-6) return 0;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI; // 0 = straight, 90 = right angle
}

/**
 * Detect "sharp" corners on a closed simplified polygon.
 * A rectangle/triangle/diamond has 3–4 sharp turns (>45°); a circle has none.
 */
function sharpCorners(poly: Point[]): Point[] {
  const out: Point[] = [];
  const n = poly.length;
  if (n < 3) return out;
  for (let i = 0; i < n; i++) {
    const a = poly[(i - 1 + n) % n];
    const b = poly[i];
    const c = poly[(i + 1) % n];
    // Ignore micro-segments (noise)
    if (dist(a, b) < 6 || dist(b, c) < 6) continue;
    if (turnAngle(a, b, c) > 45) out.push(b);
  }
  return out;
}

export function recognizeShape(pts: Point[], _color = "", _strokeWidth = 2): RecognizedShape {
  if (pts.length < 5) return null;

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const maxX = Math.max(...xs), maxY = Math.max(...ys);
  const w = Math.max(8, maxX - minX);
  const h = Math.max(8, maxY - minY);
  const diagonal = Math.hypot(w, h);
  if (diagonal < 24) return null; // too tiny to guess reliably

  const first = pts[0];
  const last = pts[pts.length - 1];
  const totalLen = pts.reduce((s, p, i) => (i ? s + dist(p, pts[i - 1]) : s), 0);
  const closed = dist(first, last) < Math.max(16, diagonal * 0.28);

  /* ── OPEN STROKE → straight line ───────────────────────────────── */
  if (!closed) {
    const lineLen = dist(first, last);
    if (lineLen > 12) {
      const avgDev = pts.reduce((s, p) => s + perp(p, first, last), 0) / pts.length;
      if (avgDev / lineLen < 0.11 && totalLen / lineLen < 1.35) {
        const dx = Math.abs(last.x - first.x);
        const dy = Math.abs(last.y - first.y);
        return {
          kind: "line",
          x: Math.min(first.x, last.x),
          y: Math.min(first.y, last.y),
          w: Math.max(8, dx),
          h: Math.max(8, dy),
          points: [
            { x: first.x <= last.x ? 0 : dx, y: first.y <= last.y ? 0 : dy },
            { x: first.x <= last.x ? dx : 0, y: first.y <= last.y ? dy : 0 },
          ],
        };
      }
    }
    return null;
  }

  /* ── CLOSED STROKE → polygon vs ellipse ────────────────────────── */
  // Simplify with a tolerance proportional to the shape size.
  const epsilon = Math.max(4, diagonal * 0.045);
  let poly = simplify([...pts, first], epsilon);
  // Remove the duplicated closing vertex
  if (poly.length > 1 && dist(poly[0], poly[poly.length - 1]) < epsilon) poly = poly.slice(0, -1);

  const corners = sharpCorners(poly);

  // Circularity: perimeter² / area ratio. A perfect circle ≈ 12.57, square ≈ 16.
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const radii = pts.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const meanR = radii.reduce((a, b) => a + b, 0) / radii.length;
  const radialSpread =
    radii.reduce((s, r) => s + Math.abs(r - meanR), 0) / radii.length / Math.max(1, meanR);
  const aspect = Math.max(w, h) / Math.min(w, h);

  // ── Corner-count decides the polygon family FIRST (fixes rect→circle bug)
  if (corners.length === 3) {
    return { kind: "triangle", x: minX, y: minY, w, h };
  }

  if (corners.length === 4) {
    // Diamond corners sit near edge midpoints; rectangle corners near bbox corners.
    const midHits = corners.filter((p) => {
      const nx = (p.x - minX) / w;
      const ny = (p.y - minY) / h;
      return (
        (Math.abs(nx - 0.5) < 0.26 && (ny < 0.26 || ny > 0.74)) ||
        (Math.abs(ny - 0.5) < 0.26 && (nx < 0.26 || nx > 0.74))
      );
    }).length;
    const cornerHits = corners.filter((p) => {
      const nx = (p.x - minX) / w;
      const ny = (p.y - minY) / h;
      return (nx < 0.28 || nx > 0.72) && (ny < 0.28 || ny > 0.72);
    }).length;
    if (midHits >= 3 && midHits > cornerHits) {
      return { kind: "diamond", x: minX, y: minY, w, h };
    }
    return { kind: "rounded-rect", x: minX, y: minY, w, h };
  }

  // 5–8 sharp corners with corner-ish placement → still a rectangle drawn shakily
  if (corners.length >= 5 && corners.length <= 8) {
    const cornerHits = corners.filter((p) => {
      const nx = (p.x - minX) / w;
      const ny = (p.y - minY) / h;
      return (nx < 0.3 || nx > 0.7) && (ny < 0.3 || ny > 0.7);
    }).length;
    if (cornerHits >= 3) return { kind: "rounded-rect", x: minX, y: minY, w, h };
  }

  // ── No sharp corners → ellipse / circle
  if (corners.length <= 2 && radialSpread < 0.26) {
    if (aspect < 1.28) {
      const r = Math.max(w, h) / 2;
      return { kind: "circle", x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
    }
    // Elongated smooth loop → ellipse (our circle type renders as ellipse)
    return { kind: "circle", x: minX, y: minY, w, h };
  }

  // Fallback: a closed shape we can't classify stays as freehand
  return null;
}

export function toElement(recognized: RecognizedShape, fallback: WbElement): WbElement {
  if (!recognized) return fallback;
  if (recognized.kind === "line" || recognized.kind === "arrow") {
    return {
      ...fallback,
      type: recognized.kind,
      x: recognized.x,
      y: recognized.y,
      w: recognized.w,
      h: recognized.h,
      points: recognized.points,
      brushStyle: undefined,
    };
  }
  return {
    ...fallback,
    type: recognized.kind,
    x: recognized.x,
    y: recognized.y,
    w: recognized.w,
    h: recognized.h,
    points: undefined,
    brushStyle: undefined,
  };
}

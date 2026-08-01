import { WbElement, WbConn, ShapeType } from "../types/whiteboard";
import { uid, getBranchStyle } from "./whiteboardUtils";

/**
 * Excalidraw interoperability (fixed rendering for dark canvas).
 *
 * - .excalidraw scene files
 * - .excalidrawlib library files (grouped, labeled grid)
 * - Dark-theme safe: Excalidraw defaults use near-black strokes (#1e1e1e)
 *   designed for a light canvas — invisible on our dark board, so we
 *   lighten them automatically.
 */

type ExcalidrawPoint = [number, number];

interface ExcalidrawElement {
  id?: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: string;
  strokeWidth?: number;
  strokeStyle?: string;
  roughness?: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: string;
  points?: ExcalidrawPoint[];
  groupIds?: string[];
  roundness?: { type: number; value?: number } | null;
  dataURL?: string;
  src?: string;
  containerId?: string;
}

/* ── Color helpers for dark-theme safety ─────────────────────────────── */
function hexLuminance(hex: string): number {
  let c = hex.replace("#", "").trim();
  // Bug #12 Fix: Expand 3-char shorthand hex (#fff → #ffffff) before computing
  // luminance. Without this, #fff returns 0.5 and is misclassified as dark.
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  if (c.length < 6) return 0.5;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Near-black Excalidraw strokes are unreadable on a dark canvas → lighten. */
function themeStroke(color: string | undefined, base: string): string {
  if (!color || color === "transparent") return base;
  if (color.startsWith("#") && hexLuminance(color) < 0.28) {
    return "#e2e8f0"; // light slate
  }
  return color;
}

/** White text on light pastel fills is unreadable → pick dark text. */
function readableTextColor(fill: string | undefined, stroke: string): string {
  if (!fill || fill === "transparent") return themeStroke(stroke, "#f8fafc");
  if (fill.startsWith("#") && hexLuminance(fill) > 0.55) return "#1e293b";
  if (fill.startsWith("rgba")) {
    const nums = fill.match(/[\d.]+/g) || [];
    if (nums.length >= 3 && nums[0] !== undefined && nums[1] !== undefined && nums[2] !== undefined) {
      const lum =
        0.2126 * (parseFloat(nums[0]) / 255) +
        0.7152 * (parseFloat(nums[1]) / 255) +
        0.0722 * (parseFloat(nums[2]) / 255);
      if (lum > 0.55) return "#1e293b";
    }
    return "#f8fafc";
  }
  if (fill === "transparent") return themeStroke(stroke, "#f8fafc");
  return "#f8fafc";
}

const EXCALI_FILLS: Record<string, string> = {
  "#a5d8ff": "rgba(165, 216, 255, 0.55)",
  "#b2f2bb": "rgba(178, 242, 187, 0.55)",
  "#ffc9c9": "rgba(255, 201, 201, 0.55)",
  "#ffec99": "rgba(255, 236, 153, 0.55)",
  "#d0bfff": "rgba(208, 191, 255, 0.55)",
  "#e599f7": "rgba(229, 153, 247, 0.45)",
  "#fff3bf": "rgba(255, 243, 191, 0.55)",
  "#ffdeeb": "rgba(255, 222, 235, 0.55)",
  "#d3f9d8": "rgba(211, 249, 216, 0.55)",
};

function normFill(bg: string | undefined, fillStyle: string | undefined): string {
  if (!bg || bg === "transparent") return "transparent";
  if (EXCALI_FILLS[bg]) return EXCALI_FILLS[bg];
  if (fillStyle === "solid") return bg;
  if (fillStyle === "cross-hatch") return bg.startsWith("#") ? `${bg}88` : bg;
  // hachure & others — soft alpha so dark strokes read over it
  return bg.startsWith("#") ? `${bg}55` : bg;
}

function mapType(ex: ExcalidrawElement): ShapeType | null {
  switch (ex.type) {
    case "rectangle":
      // Excalidraw roundness.type 3 = fully rounded pill
      if (ex.roundness && ex.roundness.type === 3) return "capsule";
      return "rounded-rect";
    case "ellipse":
      return "circle";
    case "diamond":
      return "diamond";
    case "text":
      return "text";
    case "line":
      return "line";
    case "arrow":
      return "arrow";
    case "freedraw":
      return "draw";
    case "image":
      // Only keep images that actually carry image data; otherwise they
      // render as empty boxes (the messy rectangle problem in libraries).
      return ex.dataURL || ex.src ? "image" : null;
    default:
      return null;
  }
}

function convertElements(
  elements: ExcalidrawElement[],
  offsetX = 0,
  offsetY = 0,
  groupId?: string
): { els: WbElement[]; idMap: Map<string, WbElement>; skippedExIds: Set<string> } {
  const result: WbElement[] = [];
  const idMap = new Map<string, WbElement>();
  const skippedExIds = new Set<string>();
  for (const ex of elements) {
    if (!ex || typeof ex.type !== "string") continue;
    const type = mapType(ex);
    if (!type) {
      if (ex.id) skippedExIds.add(ex.id);
      continue;
    }

    const w = Math.max(20, Math.abs(ex.width) || 100);
    const h = Math.max(12, Math.abs(ex.height) || 60);
    const stroke: string = themeStroke(ex.strokeColor, "#e2e8f0");
    const fill: string = normFill(ex.backgroundColor, ex.fillStyle);

    let opacity = 1;
    if (typeof ex.opacity === "number") {
      opacity = ex.opacity <= 1 ? Math.max(0.1, ex.opacity) : Math.max(0.1, ex.opacity / 100);
    }

    const el: WbElement = {
      id: uid(),
      type,
      x: (ex.x || 0) + offsetX,
      y: (ex.y || 0) + offsetY,
      w,
      h,
      label: ex.type === "text" ? ex.text || "" : "",
      color: stroke,
      fill,
      strokeWidth: Math.max(1, ex.strokeWidth || 2),
      strokeStyle:
        ex.strokeStyle === "dashed" ? "dashed" : ex.strokeStyle === "dotted" ? "dotted" : "solid",
      opacity,
      rotation: ex.angle ? Math.round((ex.angle * 180) / Math.PI) : 0,
      fontSize: Math.max(10, Math.round((ex.fontSize || 16) * 0.9)),
      textColor:
        ex.type === "text"
          ? themeStroke(ex.strokeColor, "#f8fafc")
          : readableTextColor(fill, stroke),
      textAlign: (ex.textAlign as any) || "center",
      fontFamily: ex.fontFamily === 2 ? "hand" : ex.fontFamily === 3 ? "mono" : "sans",
      groupId,
      imageSrc: type === "image" ? ex.dataURL || ex.src : undefined,
    };

    // Points-based geometries (freedraw / line / arrow) — normalize into
    // element-local coordinates so our polyline renderer draws them exactly.
    const pts = ex.points;
    if ((type === "draw" || type === "line" || type === "arrow") && Array.isArray(pts) && pts.length > 1) {
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const minPx = Math.min(...xs);
      const minPy = Math.min(...ys);
      const normPts = pts.map((p) => ({ x: p[0] - minPx, y: p[1] - minPy }));
      el.points = normPts;
      el.x = (ex.x || 0) + minPx + offsetX;
      el.y = (ex.y || 0) + minPy + offsetY;
      el.w = Math.max(10, Math.max(...xs) - minPx);
      el.h = Math.max(8, Math.max(...ys) - minPy);
      el.brushStyle = "pen";
    }

    result.push(el);
    if (ex.id) idMap.set(ex.id, el);
  }
  return { els: result, idMap, skippedExIds };
}

export interface ExcalidrawImportResult {
  els: WbElement[];
  conns: WbConn[];
  count: number;
}

export interface ParsedExcalidrawLibraryItem {
  id: string;
  title: string;
  elements: WbElement[];
  color: string;
}

/**
 * Parse a .excalidrawlib while preserving each original library item.
 * This powers the Excalidraw-style shelf: one thumbnail → one canvas insert.
 */
export function parseExcalidrawLibraryItems(
  raw: string
): ParsedExcalidrawLibraryItem[] | null {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const items: any[] = data?.libraryItems || data?.library || [];
  if (!Array.isArray(items) || items.length === 0) return null;

  const parsed: ParsedExcalidrawLibraryItem[] = [];
  items.forEach((item, index) => {
    const source: ExcalidrawElement[] = item?.elements || item;
    if (!Array.isArray(source) || source.length === 0) return;
    const minX = Math.min(...source.map((e) => e.x || 0));
    const minY = Math.min(...source.map((e) => e.y || 0));
    const gid = uid();
    const { els } = convertElements(source, -minX + 12, -minY + 12, gid);
    if (els.length === 0) return;

    // Merge bound text into the container for a clean thumbnail.
    const textByContainer = new Map<string, ExcalidrawElement>();
    source.forEach((ex) => {
      if (ex.type === "text" && ex.containerId && ex.text) {
        textByContainer.set(ex.containerId, ex);
      }
    });
    const sourceIdToConverted = new Map<string, WbElement>();
    let convertedIndex = 0;
    source.forEach((ex) => {
      if (!mapType(ex)) return;
      if (ex.id && els[convertedIndex]) sourceIdToConverted.set(ex.id, els[convertedIndex]);
      convertedIndex++;
    });
    textByContainer.forEach((txt, containerId) => {
      const parent = sourceIdToConverted.get(containerId);
      if (parent) {
        parent.label = txt.text || "";
        parent.fontSize = Math.max(9, Math.round((txt.fontSize || 16) * 0.8));
        parent.textColor = readableTextColor(parent.fill, parent.color);
      }
    });

    const visibleTexts = source.filter(
      (ex) => ex.type === "text" && ex.text && !ex.containerId
    );
    const title =
      item?.name ||
      item?.title ||
      visibleTexts[0]?.text?.split("\n")[0]?.slice(0, 32) ||
      `Library item ${index + 1}`;
    parsed.push({
      id: String(item?.id || `excali-item-${index}-${uid()}`),
      title,
      elements: els,
      color: els.find((el) => el.color)?.color || "#38bdf8",
    });
  });
  return parsed;
}

/** Parse a raw .excalidraw / .excalidrawlib JSON string. */
export function parseExcalidraw(raw: string): ExcalidrawImportResult | null {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;

  if (Array.isArray(data.elements)) {
    const rawElements = data.elements as ExcalidrawElement[];
    const { els, idMap } = convertElements(rawElements);

    // Fold container-bound text into its parent shape's label (Excalidraw
    // store shape text as separate text elements with a containerId).
    const textByContainer = new Map<string, ExcalidrawElement>();
    const boundTextIds = new Set<string>();
    rawElements.forEach((ex) => {
      if (ex.type === "text" && ex.containerId && ex.text) {
        textByContainer.set(ex.containerId, ex);
        if (ex.id) boundTextIds.add(ex.id);
      }
    });

    let finalEls = els;
    if (textByContainer.size > 0) {
      textByContainer.forEach((textEl, containerId) => {
        const parent = idMap.get(containerId);
        if (parent && textEl.text) {
          parent.label = textEl.text;
          parent.fontSize = Math.max(10, Math.round((textEl.fontSize || 16) * 0.85));
          parent.textAlign = (textEl.textAlign as any) || "center";
          parent.textColor = readableTextColor(parent.fill, parent.color);
        }
      });
      // Drop standalone bound-text elements (now merged into labels)
      finalEls = els.filter((el) => {
        for (const tid of boundTextIds) {
          if (idMap.get(tid) === el) return false;
        }
        return true;
      });
    }

    return { els: finalEls, conns: [], count: finalEls.length };
  }

  // Library file → grouped grid
  const items: any[] = data.libraryItems || data.library || [];
  if (Array.isArray(items) && items.length > 0) {
    const els: WbElement[] = [];
    let col = 0;
    let rowY = 100;
    const colGap = 360;
    let rowMaxH = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const elements: ExcalidrawElement[] = item.elements || item;
      if (!Array.isArray(elements) || elements.length === 0) continue;

      const minX = Math.min(...elements.map((e) => e.x || 0));
      const minY = Math.min(...elements.map((e) => e.y || 0));
      const maxY = Math.max(...elements.map((e) => (e.y || 0) + Math.abs(e.height || 60)));

      const itemGroupId = uid();
      const { els: converted } = convertElements(elements, col * colGap - minX + 100, rowY - minY, itemGroupId);
      els.push(...converted);
      rowMaxH = Math.max(rowMaxH, maxY - minY);

      // Section chip above each item
      const branch = getBranchStyle(i);
      els.push({
        id: uid(),
        type: "capsule",
        x: col * colGap + 100,
        y: rowY - 44,
        w: 130,
        h: 28,
        label: `Library item ${i + 1}`,
        color: branch.color,
        fill: branch.fill,
        strokeWidth: 1.5,
        strokeStyle: "solid",
        opacity: 1,
        fontSize: 11,
        bold: true,
        textColor: "#ffffff",
        textAlign: "center",
        groupId: itemGroupId,
      });

      col += 1;
      if (col >= 3) {
        col = 0;
        rowY += rowMaxH + 130;
        rowMaxH = 0;
      }
    }
    if (col !== 0) rowMaxH = 0;
    return { els, conns: [], count: els.length };
  }

  return null;
}

/** Export current Inkwell elements as a basic .excalidraw scene JSON. */
export function exportAsExcalidraw(els: WbElement[], title = "Inkwell board"): string {
  const elements = els.map((el) => {
    const base: any = {
      id: el.id,
      type:
        el.type === "rounded-rect" || el.type === "rect" || el.type === "frame" || el.type === "sticky" || el.type === "mind-map" || el.type === "capsule"
          ? "rectangle"
          : el.type === "circle"
          ? "ellipse"
          : el.type === "diamond"
          ? "diamond"
          : el.type === "text" || el.type === "stamp"
          ? "text"
          : el.type === "arrow"
          ? "arrow"
          : el.type === "draw" || el.type === "highlighter" || el.type === "line"
          ? "freedraw"
          : "rectangle",
      x: el.x,
      y: el.y,
      width: el.w,
      height: el.h,
      angle: ((el.rotation || 0) * Math.PI) / 180,
      strokeColor: el.color || "#ffffff",
      backgroundColor: el.fill && el.fill !== "transparent" ? el.fill : "transparent",
      fillStyle: "solid",
      strokeWidth: el.strokeWidth || 2,
      strokeStyle: el.strokeStyle || "solid",
      roughness: 0,
      opacity: Math.round((el.opacity ?? 1) * 100),
      groupIds: el.groupId ? [el.groupId] : [],
      seed: Math.floor(Math.random() * 1e8),
      versionNonce: Math.floor(Math.random() * 1e8),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: !!el.locked,
    };
    if (base.type === "text") {
      base.text = el.stampIcon || el.label || "";
      base.fontSize = el.fontSize || 16;
      base.fontFamily = 1;
      base.textAlign = el.textAlign || "center";
      base.verticalAlign = "middle";
    }
    if ((base.type === "freedraw" || base.type === "arrow") && el.points) {
      base.points = el.points.map((p) => [p.x, p.y]);
    }
    return base;
  });

  return JSON.stringify(
    {
      type: "excalidraw",
      version: 2,
      source: "https://inkwell.app",
      elements,
      appState: {
        gridSize: null,
        viewBackgroundColor: "#0b1120",
        name: title,
      },
      files: {},
    },
    null,
    2
  );
}

export async function fetchExcalidrawLibrary(
  input: string
): Promise<ExcalidrawImportResult | null> {
  let url = input.trim();

  try {
    const parsed = new URL(url, window.location.href);
    const token = parsed.searchParams.get("token");
    if (token && /excalidraw\.com/i.test(parsed.hostname)) {
      url = `https://libraries.excalidraw.com/libraries/${token}.excalidrawlib`;
    }
  } catch {
    // treat as raw URL / bare token
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `https://libraries.excalidraw.com/libraries/${url}.excalidrawlib`;
  }

  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const text = await res.text();
    return parseExcalidraw(text);
  } catch {
    return null;
  }
}

/** Fetch an actual .excalidrawlib URL with CORS proxy fallbacks. */
export async function fetchExcalidrawLibraryItems(
  input: string
): Promise<ParsedExcalidrawLibraryItem[] | null> {
  let url = input.trim();
  try {
    const parsed = new URL(url, window.location.href);
    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    const addLibrary = hashParams.get("addLibrary");
    if (addLibrary) url = decodeURIComponent(addLibrary);

    // Marketplace landing URLs only contain a session token, not the actual
    // downloadable library path. They cannot be resolved without clicking
    // "Add to Excalidraw". Return null with a clear local-file fallback.
    if (
      parsed.hostname === "libraries.excalidraw.com" &&
      parsed.pathname === "/" &&
      parsed.searchParams.has("token") &&
      !addLibrary
    ) {
      return null;
    }
  } catch {
    /* raw URL below */
  }

  if (!/^https?:\/\//i.test(url)) return null;
  const attempts = [
    url,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  ];
  for (const endpoint of attempts) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;
      const text = await res.text();
      const items = parseExcalidrawLibraryItems(text);
      if (items?.length) return items;
    } catch {
      // Try next endpoint.
    }
  }
  return null;
}

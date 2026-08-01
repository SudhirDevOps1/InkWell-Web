import { WbElement, WbConn, ShapeType } from "../types/whiteboard";
import { uid, getBranchStyle } from "./whiteboardUtils";

/**
 * Lightweight Mermaid → Inkwell converter (no external dependency).
 *
 * Supports the most common flowchart syntax:
 *   graph TD / flowchart LR
 *   A[Rectangle]  B(Rounded)  C{Diamond}  D((Circle))  E>Flag]  F[/Parallelogram/]
 *   A --> B          arrow
 *   A --- B          line
 *   A -.-> B         dashed arrow
 *   A ==> B          thick arrow
 *   A -->|label| B   labelled edge
 */

interface ParsedNode {
  id: string;
  label: string;
  shape: ShapeType;
}

interface ParsedEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  thick?: boolean;
  arrow: boolean;
}

function shapeFromBrackets(raw: string): { shape: ShapeType; label: string } {
  const t = raw.trim();
  const pairs: [RegExp, ShapeType][] = [
    [/^\(\((.*)\)\)$/s, "circle"],
    [/^\{\{(.*)\}\}$/s, "hexagon"],
    [/^\{(.*)\}$/s, "diamond"],
    [/^\(\[(.*)\]\)$/s, "capsule"],
    [/^\((.*)\)$/s, "rounded-rect"],
    [/^\[\/(.*)\/\]$/s, "parallelogram"],
    [/^\[\\(.*)\\\]$/s, "parallelogram"],
    [/^\[\[(.*)\]\]$/s, "rect"],
    [/^\[(.*)\]$/s, "rect"],
    [/^>(.*)\]$/s, "capsule"],
  ];
  for (const [re, shape] of pairs) {
    const m = t.match(re);
    if (m) return { shape, label: m[1].replace(/^["']|["']$/g, "").trim() };
  }
  return { shape: "rounded-rect", label: t.replace(/^["']|["']$/g, "") };
}

export function parseMermaid(src: string): { els: WbElement[]; conns: WbConn[] } | null {
  const lines = src
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("%%"));
  if (lines.length === 0) return null;

  const header = lines[0].toLowerCase();
  const isFlow = /^(graph|flowchart)\s+(td|tb|lr|rl|bt)?/.test(header);
  const direction = (header.match(/\b(td|tb|lr|rl|bt)\b/)?.[1] || "td").toLowerCase();
  const body = isFlow ? lines.slice(1) : lines;

  const nodes = new Map<string, ParsedNode>();
  const edges: ParsedEdge[] = [];

  const ensureNode = (token: string): string => {
    const m = token.trim().match(/^([A-Za-z0-9_.-]+)\s*(.*)$/s);
    if (!m) return token.trim();
    const id = m[1];
    const rest = m[2].trim();
    if (!nodes.has(id)) {
      const { shape, label } = rest ? shapeFromBrackets(rest) : { shape: "rounded-rect" as ShapeType, label: id };
      nodes.set(id, { id, label: label || id, shape });
    } else if (rest) {
      const { shape, label } = shapeFromBrackets(rest);
      const existing = nodes.get(id)!;
      if (label) existing.label = label;
      existing.shape = shape;
    }
    return id;
  };

  const EDGE_RE =
    /^(.+?)\s*(-{2,3}>|-{3,}|-\.->|-\.-|={2,}>|={2,})\s*(?:\|([^|]*)\|)?\s*(.+)$/;

  for (const raw of body) {
    const line = raw.replace(/;$/, "").trim();
    if (!line) continue;
    if (/^(subgraph|end|click|style|classDef|class|linkStyle|direction)\b/i.test(line)) continue;

    const m = line.match(EDGE_RE);
    if (m) {
      const from = ensureNode(m[1]);
      const connector = m[2];
      const label = m[3]?.trim();
      const to = ensureNode(m[4]);
      edges.push({
        from,
        to,
        label: label || undefined,
        dashed: connector.includes("."),
        thick: connector.includes("="),
        arrow: connector.includes(">"),
      });
      continue;
    }
    // Standalone node declaration
    if (/^[A-Za-z0-9_.-]+/.test(line)) ensureNode(line);
  }

  if (nodes.size === 0) return null;

  /* ── Layered layout (BFS depth) ─────────────────────────────────── */
  const ids = Array.from(nodes.keys());
  const incoming = new Map<string, number>(ids.map((id) => [id, 0]));
  edges.forEach((e) => incoming.set(e.to, (incoming.get(e.to) || 0) + 1));

  const level = new Map<string, number>();
  const queue: string[] = ids.filter((id) => (incoming.get(id) || 0) === 0);
  if (queue.length === 0) queue.push(ids[0]);
  queue.forEach((id) => level.set(id, 0));

  let guard = 0;
  while (queue.length && guard++ < 5000) {
    const cur = queue.shift()!;
    const curLevel = level.get(cur) || 0;
    edges
      .filter((e) => e.from === cur)
      .forEach((e) => {
        if (!level.has(e.to)) {
          level.set(e.to, curLevel + 1);
          queue.push(e.to);
        }
      });
  }
  ids.forEach((id) => {
    if (!level.has(id)) level.set(id, 0);
  });

  const byLevel = new Map<number, string[]>();
  ids.forEach((id) => {
    const l = level.get(id) || 0;
    if (!byLevel.has(l)) byLevel.set(l, []);
    byLevel.get(l)!.push(id);
  });

  const horizontal = direction === "lr" || direction === "rl";
  const NODE_W = 180;
  const NODE_H = 74;
  const GAP_MAIN = horizontal ? 260 : 150;
  const GAP_CROSS = horizontal ? 120 : 230;

  const elById = new Map<string, WbElement>();
  const els: WbElement[] = [];

  Array.from(byLevel.keys())
    .sort((a, b) => a - b)
    .forEach((lvl) => {
      const row = byLevel.get(lvl)!;
      row.forEach((id, i) => {
        const node = nodes.get(id)!;
        const branch = getBranchStyle(lvl);
        const offset = (i - (row.length - 1) / 2) * GAP_CROSS;
        const x = horizontal ? 120 + lvl * GAP_MAIN : 520 + offset;
        const y = horizontal ? 340 + offset : 110 + lvl * GAP_MAIN;
        const isDiamond = node.shape === "diamond";
        const el: WbElement = {
          id: uid(),
          type: node.shape,
          x,
          y,
          w: isDiamond ? NODE_W + 20 : NODE_W,
          h: isDiamond ? NODE_H + 26 : NODE_H,
          label: node.label,
          color: branch.color,
          fill: branch.fill,
          strokeWidth: 2,
          strokeStyle: "solid",
          opacity: 1,
          fontFamily: "sans",
          fontSize: 14,
          bold: lvl === 0,
          textColor: "#ffffff",
          textAlign: "center",
        };
        elById.set(id, el);
        els.push(el);
      });
    });

  const conns: WbConn[] = edges
    .filter((e) => elById.has(e.from) && elById.has(e.to))
    .map((e) => {
      const from = elById.get(e.from)!;
      const to = elById.get(e.to)!;
      const lvlColor = getBranchStyle(level.get(e.from) || 0).color;
      return {
        id: uid(),
        fromId: from.id,
        toId: to.id,
        fromAnchor: horizontal ? "right" : "bottom",
        toAnchor: horizontal ? "left" : "top",
        type: "orthogonal",
        color: lvlColor,
        strokeWidth: e.thick ? 3.5 : 2,
        strokeStyle: e.dashed ? "dashed" : "solid",
        label: e.label,
        arrowEnd: e.arrow,
      } as WbConn;
    });

  return { els, conns };
}

/** Very small Markdown outline → mind map (heading levels become branches). */
export function parseMarkdownOutline(src: string): { els: WbElement[]; conns: WbConn[] } | null {
  const lines = src.split(/\r?\n/).map((l) => l.replace(/\s+$/, "")).filter(Boolean);
  if (!lines.length) return null;

  type Item = { text: string; depth: number };
  const items: Item[] = [];
  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      items.push({ text: heading[2].trim(), depth: heading[1].length - 1 });
      continue;
    }
    const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (bullet) {
      const indent = Math.floor(bullet[1].length / 2);
      items.push({ text: bullet[2].trim(), depth: indent + 1 });
      continue;
    }
    const numbered = line.match(/^(\s*)\d+[.)]\s+(.*)$/);
    if (numbered) {
      const indent = Math.floor(numbered[1].length / 2);
      items.push({ text: numbered[2].trim(), depth: indent + 1 });
    }
  }
  if (!items.length) return null;

  const els: WbElement[] = [];
  const conns: WbConn[] = [];
  const parentStack: WbElement[] = [];
  const perDepthCount = new Map<number, number>();

  items.forEach((item, index) => {
    const count = (perDepthCount.get(item.depth) || 0) + 1;
    perDepthCount.set(item.depth, count);
    const branch = getBranchStyle(item.depth === 0 ? 0 : index);
    const isRoot = item.depth === 0;
    const el: WbElement = {
      id: uid(),
      type: isRoot ? "mind-map" : "capsule",
      x: 360 + item.depth * 260,
      y: 120 + count * 92,
      w: isRoot ? 210 : 190,
      h: isRoot ? 70 : 56,
      label: item.text,
      color: isRoot ? "#8b5cf6" : branch.color,
      fill: isRoot ? "rgba(139,92,246,0.25)" : branch.fill,
      strokeWidth: isRoot ? 3 : 2,
      strokeStyle: "solid",
      opacity: 1,
      fontFamily: "sans",
      fontSize: isRoot ? 16 : 13,
      bold: isRoot,
      textColor: "#ffffff",
      textAlign: "center",
    };
    els.push(el);

    parentStack.length = item.depth;
    // Bug #13 Fix: Find nearest defined parent by walking backwards through
    // the stack. Handles skipped heading levels (e.g. # → ###) gracefully.
    let parent: typeof els[0] | undefined;
    for (let d = item.depth - 1; d >= 0; d--) {
      if (parentStack[d]) { parent = parentStack[d]; break; }
    }
    if (parent) {
      conns.push({
        id: uid(),
        fromId: parent.id,
        toId: el.id,
        fromAnchor: "right",
        toAnchor: "left",
        type: "curved",
        color: el.color,
        strokeWidth: 2,
        strokeStyle: "solid",
        arrowEnd: false,
      });
    }
    parentStack[item.depth] = el;
  });

  return { els, conns };
}

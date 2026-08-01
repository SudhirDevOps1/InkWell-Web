import {
  WbElement,
  WbConn,
  AnchorPos,
  Point,
  ShapeType,
  TemplateOption,
} from "../types/whiteboard";

// ─── Safe UID Generator (works on HTTP, older browsers, and HTTPS) ──────────
export function uid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fallback below
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Color & Fill Constants ──────────────────────────────────────────────────
export const STROKE_COLORS = [
  "#38bdf8", // Sky
  "#818cf8", // Indigo
  "#c084fc", // Purple
  "#f472b6", // Pink
  "#4ade80", // Green
  "#facc15", // Yellow
  "#fb923c", // Orange
  "#f87171", // Red
  "#34d399", // Emerald
  "#60a5fa", // Blue
  "#ffffff", // White
  "#94a3b8", // Slate
];

export const FILL_COLORS = [
  "transparent",
  "rgba(56, 189, 248, 0.15)",  // Sky
  "rgba(129, 140, 248, 0.18)", // Indigo
  "rgba(192, 132, 252, 0.18)", // Purple
  "rgba(244, 114, 182, 0.15)", // Pink
  "rgba(74, 222, 128, 0.15)",  // Green
  "rgba(250, 204, 21, 0.15)",  // Yellow
  "rgba(251, 146, 60, 0.15)",  // Orange
  "rgba(248, 113, 113, 0.15)", // Red
  "rgba(15, 23, 42, 0.85)",    // Dark slate
  "#fef08a",                   // Sticky yellow
  "#fbcfe8",                   // Sticky pink
  "#bbf7d0",                   // Sticky mint
  "#bae6fd",                   // Sticky cyan
  "#e9d5ff",                   // Sticky lavender
];

// Vibrant palette used by mind-map nodes (matches the screenshot).
export const MINDMAP_PALETTE: { color: string; fill: string; gradient: [string, string] }[] = [
  { color: "#ec4899", fill: "rgba(236, 72, 153, 0.22)", gradient: ["#f472b6", "#db2777"] },  // Pink
  { color: "#10b981", fill: "rgba(16, 185, 129, 0.22)", gradient: ["#34d399", "#059669"] },  // Green
  { color: "#06b6d4", fill: "rgba(6, 182, 212, 0.22)",  gradient: ["#22d3ee", "#0891b2"] },  // Cyan
  { color: "#8b5cf6", fill: "rgba(139, 92, 246, 0.22)", gradient: ["#a78bfa", "#7c3aed"] },  // Purple
  { color: "#f97316", fill: "rgba(249, 115, 22, 0.22)", gradient: ["#fb923c", "#ea580c"] },  // Orange
  { color: "#ef4444", fill: "rgba(239, 68, 68, 0.22)",  gradient: ["#f87171", "#dc2626"] },  // Red
  { color: "#eab308", fill: "rgba(234, 179, 8, 0.22)",  gradient: ["#facc15", "#ca8a04"] },  // Yellow
  { color: "#3b82f6", fill: "rgba(59, 130, 246, 0.22)", gradient: ["#60a5fa", "#2563eb"] },  // Blue
  { color: "#14b8a6", fill: "rgba(20, 184, 166, 0.22)", gradient: ["#2dd4bf", "#0d9488"] },  // Teal
  { color: "#a855f7", fill: "rgba(168, 85, 247, 0.22)", gradient: ["#c084fc", "#9333ea"] },  // Violet
];

export function getBranchStyle(index: number) {
  return MINDMAP_PALETTE[Math.abs(index) % MINDMAP_PALETTE.length];
}

export const STAMP_LIBRARY = [
  { id: "react", label: "React", icon: "⚛️" },
  { id: "server", label: "Server", icon: "🖥️" },
  { id: "db", label: "Database", icon: "🗄️" },
  { id: "cloud", label: "Cloud", icon: "☁️" },
  { id: "docker", label: "Docker", icon: "🐳" },
  { id: "api", label: "API Gateway", icon: "⚡" },
  { id: "security", label: "Security", icon: "🛡️" },
  { id: "user", label: "User / Client", icon: "👤" },
  { id: "rocket", label: "Launch", icon: "🚀" },
  { id: "fire", label: "High Priority", icon: "🔥" },
  { id: "idea", label: "Idea", icon: "💡" },
  { id: "star", label: "Star", icon: "⭐️" },
  { id: "check", label: "Done", icon: "✅" },
  { id: "warn", label: "Alert", icon: "⚠️" },
  { id: "bug", label: "Bug", icon: "🐛" },
  { id: "flag", label: "Milestone", icon: "🚩" },
];

// ─── Geometry & Anchors ──────────────────────────────────────────────────────
export function getElCenter(el: WbElement): Point {
  return { x: el.x + el.w / 2, y: el.y + el.h / 2 };
}

export function getAnchorPoint(el: WbElement, anchor: AnchorPos = "center"): Point {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  switch (anchor) {
    case "top":
      return { x: cx, y: el.y };
    case "right":
      return { x: el.x + el.w, y: cy };
    case "bottom":
      return { x: cx, y: el.y + el.h };
    case "left":
      return { x: el.x, y: cy };
    default:
      return { x: cx, y: cy };
  }
}

export function findBestAnchor(fromEl: WbElement, toEl: WbElement): { fromAnchor: AnchorPos; toAnchor: AnchorPos } {
  const fc = getElCenter(fromEl);
  const tc = getElCenter(toEl);
  const dx = tc.x - fc.x;
  const dy = tc.y - fc.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return {
      fromAnchor: dx > 0 ? "right" : "left",
      toAnchor: dx > 0 ? "left" : "right",
    };
  } else {
    return {
      fromAnchor: dy > 0 ? "bottom" : "top",
      toAnchor: dy > 0 ? "top" : "bottom",
    };
  }
}

// ─── Connector Path Builders ────────────────────────────────────────────────
export function buildConnPath(fromEl: WbElement, toEl: WbElement, conn: WbConn): string {
  const p1 = getAnchorPoint(fromEl, conn.fromAnchor || "center");
  const p2 = getAnchorPoint(toEl, conn.toAnchor || "center");

  if (conn.type === "straight") {
    return `M ${p1.x},${p1.y} L ${p2.x},${p2.y}`;
  }

  if (conn.type === "orthogonal") {
    // Manhattan orthogonal elbow
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    if (conn.fromAnchor === "right" || conn.fromAnchor === "left") {
      return `M ${p1.x},${p1.y} L ${midX},${p1.y} L ${midX},${p2.y} L ${p2.x},${p2.y}`;
    } else {
      return `M ${p1.x},${p1.y} L ${p1.x},${midY} L ${p2.x},${midY} L ${p2.x},${p2.y}`;
    }
  }

  // Default: Curved Bezier
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const curveFactor = Math.min(Math.max(dist * 0.45, 50), 220);

  let c1x = p1.x, c1y = p1.y, c2x = p2.x, c2y = p2.y;

  if (conn.fromAnchor === "right") c1x += curveFactor;
  else if (conn.fromAnchor === "left") c1x -= curveFactor;
  else if (conn.fromAnchor === "top") c1y -= curveFactor;
  else if (conn.fromAnchor === "bottom") c1y += curveFactor;
  else c1x += dx * 0.5;

  if (conn.toAnchor === "right") c2x += curveFactor;
  else if (conn.toAnchor === "left") c2x -= curveFactor;
  else if (conn.toAnchor === "top") c2y -= curveFactor;
  else if (conn.toAnchor === "bottom") c2y += curveFactor;
  else c2x -= dx * 0.5;

  return `M ${p1.x},${p1.y} C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
}

export function getConnMidPoint(fromEl: WbElement, toEl: WbElement, conn: WbConn): Point {
  const p1 = getAnchorPoint(fromEl, conn.fromAnchor || "center");
  const p2 = getAnchorPoint(toEl, conn.toAnchor || "center");
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

// ─── Bounding Box & Marquee Selection ────────────────────────────────────────
export function getBoundingBox(els: WbElement[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (els.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of els) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.w);
    maxY = Math.max(maxY, el.y + el.h);
  }
  return { minX, minY, maxX, maxY };
}

export function isBoxOverlapping(
  box1: { x: number; y: number; w: number; h: number },
  box2: { x: number; y: number; w: number; h: number }
): boolean {
  return !(
    box1.x + box1.w < box2.x ||
    box2.x + box2.w < box1.x ||
    box1.y + box1.h < box2.y ||
    box2.y + box2.h < box1.y
  );
}

// ─── Auto-Layout Algorithms ──────────────────────────────────────────────────
export function layoutRadial(els: WbElement[], conns: WbConn[]): { els: WbElement[]; conns: WbConn[] } {
  if (els.length === 0) return { els, conns };

  // Find root (node with most outgoing or incoming conns, or first el)
  const counts: Record<string, number> = {};
  els.forEach((e) => (counts[e.id] = 0));
  conns.forEach((c) => {
    counts[c.fromId] = (counts[c.fromId] || 0) + 1;
    counts[c.toId] = (counts[c.toId] || 0) + 1;
  });

  let rootId = els[0].id;
  let maxC = -1;
  Object.entries(counts).forEach(([id, cnt]) => {
    if (cnt > maxC) {
      maxC = cnt;
      rootId = id;
    }
  });

  const root = els.find((e) => e.id === rootId) || els[0];
  const others = els.filter((e) => e.id !== root.id);

  const centerX = 800;
  const centerY = 500;
  const radius = Math.max(260, others.length * 45);

  const nextEls = els.map((el) => {
    if (el.id === root.id) {
      return { ...el, x: centerX - el.w / 2, y: centerY - el.h / 2 };
    }
    const idx = others.findIndex((o) => o.id === el.id);
    const angle = (idx * 2 * Math.PI) / Math.max(1, others.length) - Math.PI / 2;
    const nx = centerX + radius * Math.cos(angle) - el.w / 2;
    const ny = centerY + radius * Math.sin(angle) - el.h / 2;
    return { ...el, x: nx, y: ny };
  });

  // Update anchors automatically
  const nextConns = conns.map((c) => {
    const fromEl = nextEls.find((e) => e.id === c.fromId);
    const toEl = nextEls.find((e) => e.id === c.toId);
    if (!fromEl || !toEl) return c;
    const { fromAnchor, toAnchor } = findBestAnchor(fromEl, toEl);
    return { ...c, fromAnchor, toAnchor, type: "curved" as const };
  });

  return { els: nextEls, conns: nextConns };
}

export function layoutHierarchical(els: WbElement[], conns: WbConn[]): { els: WbElement[]; conns: WbConn[] } {
  if (els.length === 0) return { els, conns };

  // Calculate level depth from root
  const incoming: Record<string, number> = {};
  els.forEach((e) => (incoming[e.id] = 0));
  conns.forEach((c) => {
    incoming[c.toId] = (incoming[c.toId] || 0) + 1;
  });

  const roots = els.filter((e) => incoming[e.id] === 0);
  const startRoot = roots[0] || els[0];

  const levels: Record<string, number> = { [startRoot.id]: 0 };
  const queue = [startRoot.id];
  const visited = new Set<string>([startRoot.id]);

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const currLvl = levels[currId] || 0;
    const outConns = conns.filter((c) => c.fromId === currId);
    for (const c of outConns) {
      if (!visited.has(c.toId)) {
        levels[c.toId] = currLvl + 1;
        visited.add(c.toId);
        queue.push(c.toId);
      }
    }
  }

  // Any unvisited gets level 1
  els.forEach((e) => {
    if (levels[e.id] === undefined) levels[e.id] = 1;
  });

  const byLevel: Record<number, WbElement[]> = {};
  els.forEach((e) => {
    const lvl = levels[e.id];
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(e);
  });

  const startY = 160;
  const levelHeight = 180;
  const startX = 200;

  const nextEls: WbElement[] = [];
  Object.keys(byLevel)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((lvl) => {
      const row = byLevel[lvl];
      const totalWidth = row.reduce((sum, el) => sum + el.w, 0) + (row.length - 1) * 80;
      let currX = startX + Math.max(0, (1000 - totalWidth) / 2);
      row.forEach((el) => {
        nextEls.push({
          ...el,
          x: currX,
          y: startY + lvl * levelHeight,
        });
        currX += el.w + 80;
      });
    });

  const nextConns = conns.map((c) => {
    const fromEl = nextEls.find((e) => e.id === c.fromId);
    const toEl = nextEls.find((e) => e.id === c.toId);
    if (!fromEl || !toEl) return c;
    return { ...c, fromAnchor: "bottom" as AnchorPos, toAnchor: "top" as AnchorPos, type: "orthogonal" as const };
  });

  return { els: nextEls, conns: nextConns };
}

export function layoutHorizontal(els: WbElement[], conns: WbConn[]): { els: WbElement[]; conns: WbConn[] } {
  const result = layoutHierarchical(els, conns);
  // Swap X and Y coordinates
  const nextEls = result.els.map((el) => ({
    ...el,
    x: el.y,
    y: el.x * 0.75,
  }));

  const nextConns = result.conns.map((c) => ({
    ...c,
    fromAnchor: "right" as AnchorPos,
    toAnchor: "left" as AnchorPos,
    type: "curved" as const,
  }));

  return { els: nextEls, conns: nextConns };
}

// ─── Diagram Templates & Presets ─────────────────────────────────────────────
export const DIAGRAM_TEMPLATES: TemplateOption[] = [
  {
    id: "central-idea",
    title: "Central Idea Mind Map",
    category: "Brainstorm",
    description: "Screenshot-style hero mind map with a Central Idea and multi-color branches spreading left & right.",
    icon: "💡",
    nodeCount: 9,
  },
  {
    id: "brainstorm-star",
    title: "Brainstorm Starburst",
    category: "Brainstorm",
    description: "8 colorful branches radiating around a bold gradient central pill.",
    icon: "🌟",
    nodeCount: 9,
  },
  {
    id: "study-concept",
    title: "Study Concept Mind Map",
    category: "Study",
    description: "Radial concept map with 6 colorful branches around a central topic.",
    icon: "🧠",
    nodeCount: 7,
  },
  {
    id: "microservices",
    title: "Microservices Architecture",
    category: "Software",
    description: "API Gateway, Auth, Order Service, Database & Cache flowchart.",
    icon: "⚡",
    nodeCount: 7,
  },
  {
    id: "cloud-infra",
    title: "Cloud Infrastructure Map",
    category: "Software",
    description: "DNS, Load Balancer, Active Server Pool, Postgres DB, and Object Storage.",
    icon: "☁️",
    nodeCount: 6,
  },
  {
    id: "roadmap",
    title: "Product Roadmap & Sprint Board",
    category: "Software",
    description: "Structured workflow columns: Backlog, In Progress, Code Review, and Deployed.",
    icon: "🚀",
    nodeCount: 8,
  },
  {
    id: "kanban",
    title: "Kanban Sprint Board",
    category: "Software",
    description: "Todo, Doing, Review & Done sticky lanes with priority stamps.",
    icon: "📋",
    nodeCount: 9,
  },
  {
    id: "swot",
    title: "SWOT Analysis Board",
    category: "Business",
    description: "4-Quadrant colored sticky board for Strengths, Weaknesses, Opportunities & Threats.",
    icon: "📊",
    nodeCount: 5,
  },
  {
    id: "user-journey",
    title: "User Journey & Conversion Funnel",
    category: "Business",
    description: "Step-by-step user onboarding flow from Discovery to Retention.",
    icon: "🎯",
    nodeCount: 6,
  },
  {
    id: "business-canvas",
    title: "Business Model Canvas",
    category: "Business",
    description: "9-block Osterwalder canvas: Partners, Activities, Value Prop, Customers & Revenue.",
    icon: "🧩",
    nodeCount: 9,
  },
  {
    id: "empathy-map",
    title: "Empathy Map (UX Research)",
    category: "Business",
    description: "Says, Thinks, Does, Feels quadrants around your target persona.",
    icon: "💞",
    nodeCount: 5,
  },
  {
    id: "fishbone",
    title: "Fishbone / Ishikawa Diagram",
    category: "Business",
    description: "Cause & effect analysis with 6 categorized bones feeding a central problem.",
    icon: "🐟",
    nodeCount: 8,
  },
  {
    id: "okr-tree",
    title: "OKR / Goal Tree",
    category: "Business",
    description: "One Objective with 3 Key Results and drill-down initiatives beneath.",
    icon: "🎯",
    nodeCount: 8,
  },
  {
    id: "weekly-planner",
    title: "Weekly Priority Planner",
    category: "Study",
    description: "Mon–Sun sticky lanes with focus, tasks and reflection notes.",
    icon: "🗓️",
    nodeCount: 8,
  },
  {
    id: "flowchart",
    title: "Decision Flowchart",
    category: "Software",
    description: "Start ➜ Decision diamond ➜ Yes / No branches with terminator ends.",
    icon: "🔀",
    nodeCount: 6,
  },
  {
    id: "org-chart",
    title: "Team Org Chart",
    category: "Business",
    description: "CEO on top with Engineering, Design, Marketing & Support hierarchical tree.",
    icon: "🏢",
    nodeCount: 8,
  },
];

// Helper that builds a colored "mind-map" pill node.
export function makeMindMapNode(options: {
  label: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  branchIndex?: number;
  isRoot?: boolean;
}): WbElement {
  const w = options.w ?? (options.isRoot ? 180 : 150);
  const h = options.h ?? (options.isRoot ? 70 : 52);
  const branch = getBranchStyle(options.branchIndex ?? 0);
  return {
    id: uid(),
    type: "mind-map",
    x: options.x,
    y: options.y,
    w,
    h,
    label: options.label,
    color: options.isRoot ? "#8b5cf6" : branch.color,
    fill: options.isRoot ? "rgba(139, 92, 246, 0.28)" : branch.fill,
    strokeWidth: options.isRoot ? 3 : 2,
    strokeStyle: "solid",
    opacity: 1,
    fontFamily: "sans",
    fontSize: options.isRoot ? 16 : 14,
    textColor: "#ffffff",
    bold: true,
    textAlign: "center",
  };
}

// Builds the screenshot-style Central Idea mind map with symmetric branches.
export function generateCentralIdeaMindMap(
  centralLabel = "Central Idea",
  leftBranches = ["New Idea", "New Idea", "New Idea", "New Idea"],
  rightBranches = ["New Idea", "New Idea", "New Idea", "New Idea", "New Idea"],
  rightSubBranches: Record<number, string[]> = { 0: ["New Idea", "New Idea"], 1: ["New Idea"] }
): { els: WbElement[]; conns: WbConn[] } {
  const centerX = 640;
  const centerY = 340;
  const els: WbElement[] = [];
  const conns: WbConn[] = [];

  const root = makeMindMapNode({
    label: centralLabel,
    x: centerX - 90,
    y: centerY - 30,
    isRoot: true,
  });
  els.push(root);

  const leftGap = 90;
  const leftStartY = centerY - ((leftBranches.length - 1) * leftGap) / 2;
  leftBranches.forEach((label, i) => {
    const node = makeMindMapNode({
      label,
      x: centerX - 340,
      y: leftStartY + i * leftGap - 22,
      branchIndex: i,
    });
    els.push(node);
    conns.push({
      id: uid(),
      fromId: root.id,
      toId: node.id,
      fromAnchor: "left",
      toAnchor: "right",
      type: "curved",
      color: getBranchStyle(i).color,
      strokeWidth: 2.5,
      strokeStyle: "solid",
      arrowEnd: false,
    });
  });

  const rightGap = 82;
  const rightStartY = centerY - ((rightBranches.length - 1) * rightGap) / 2;
  rightBranches.forEach((label, i) => {
    const paletteIndex = i + leftBranches.length;
    const node = makeMindMapNode({
      label,
      x: centerX + 200,
      y: rightStartY + i * rightGap - 22,
      branchIndex: paletteIndex,
    });
    els.push(node);
    conns.push({
      id: uid(),
      fromId: root.id,
      toId: node.id,
      fromAnchor: "right",
      toAnchor: "left",
      type: "curved",
      color: getBranchStyle(paletteIndex).color,
      strokeWidth: 2.5,
      strokeStyle: "solid",
      arrowEnd: false,
    });

    const subs = rightSubBranches[i];
    if (subs && subs.length > 0) {
      const subGap = 70;
      const subStart = node.y + node.h / 2 - ((subs.length - 1) * subGap) / 2;
      subs.forEach((subLabel, j) => {
        const child = makeMindMapNode({
          label: subLabel,
          x: node.x + 220,
          y: subStart + j * subGap - 22,
          branchIndex: paletteIndex,
        });
        els.push(child);
        conns.push({
          id: uid(),
          fromId: node.id,
          toId: child.id,
          fromAnchor: "right",
          toAnchor: "left",
          type: "curved",
          color: getBranchStyle(paletteIndex).color,
          strokeWidth: 2,
          strokeStyle: "solid",
          arrowEnd: false,
        });
      });
    }
  });

  return { els, conns };
}

export function generateTemplateData(templateId: string): { els: WbElement[]; conns: WbConn[] } {
  const generateId = uid;

  if (templateId === "central-idea") {
    return generateCentralIdeaMindMap();
  }

  if (templateId === "brainstorm-star") {
    const centerX = 640;
    const centerY = 380;
    const root = makeMindMapNode({ label: "Big Idea", x: centerX - 90, y: centerY - 30, isRoot: true });
    const els: WbElement[] = [root];
    const conns: WbConn[] = [];
    const labels = ["Market", "Users", "Tech", "Design", "Growth", "Revenue", "Team", "Risks"];
    labels.forEach((label, i) => {
      const angle = (i * 2 * Math.PI) / labels.length - Math.PI / 2;
      const radius = 260;
      const node = makeMindMapNode({
        label,
        x: centerX + radius * Math.cos(angle) - 75,
        y: centerY + radius * Math.sin(angle) - 26,
        branchIndex: i,
      });
      els.push(node);
      conns.push({
        id: generateId(),
        fromId: root.id,
        toId: node.id,
        fromAnchor: "center",
        toAnchor: "center",
        type: "curved",
        color: getBranchStyle(i).color,
        strokeWidth: 2.5,
        strokeStyle: "solid",
        arrowEnd: false,
      });
    });
    return { els, conns };
  }

  if (templateId === "kanban") {
    const lanes = [
      { title: "📥 TODO", color: "#a855f7", fill: "#e9d5ff", cards: ["Research users\n• Interviews\n• Survey"] },
      { title: "🚧 DOING", color: "#3b82f6", fill: "#bae6fd", cards: ["Design v2 UI\n• Wireframes\n• Prototype"] },
      { title: "🔎 REVIEW", color: "#f59e0b", fill: "#fef08a", cards: ["Peer review PR\n• Backend API"] },
      { title: "✅ DONE", color: "#10b981", fill: "#bbf7d0", cards: ["Ship auth flow"] },
    ];
    const els: WbElement[] = [];
    const conns: WbConn[] = [];
    lanes.forEach((lane, i) => {
      const x = 120 + i * 240;
      els.push({
        id: generateId(),
        type: "rounded-rect",
        x, y: 100, w: 200, h: 42,
        label: lane.title,
        color: lane.color,
        fill: `${lane.color}22`,
        strokeWidth: 2, strokeStyle: "solid", opacity: 1,
        fontFamily: "sans", fontSize: 14, bold: true,
      });
      lane.cards.forEach((card, j) => {
        els.push({
          id: generateId(),
          type: "sticky",
          x, y: 170 + j * 160, w: 200, h: 140,
          label: card,
          color: lane.color,
          fill: lane.fill,
          strokeWidth: 1, strokeStyle: "solid", opacity: 1,
          fontFamily: "hand", fontSize: 15,
        });
      });
    });
    els.push({
      id: generateId(), type: "stamp", x: 140, y: 350, w: 60, h: 60,
      label: "🔥", stampIcon: "🔥",
      color: "#f87171", fill: "transparent",
      strokeWidth: 1, strokeStyle: "solid", opacity: 1,
    });
    return { els, conns };
  }

  if (templateId === "business-canvas") {
    const blocks = [
      { title: "🤝 Key Partners",   x: 80,  y: 100, w: 200, h: 220, color: "#8b5cf6" },
      { title: "⚙️ Key Activities", x: 300, y: 100, w: 200, h: 105, color: "#3b82f6" },
      { title: "🎁 Value Prop.",    x: 520, y: 100, w: 220, h: 220, color: "#ec4899" },
      { title: "🫱 Customer Rel.",  x: 760, y: 100, w: 200, h: 105, color: "#f59e0b" },
      { title: "🙋 Customer Segs.", x: 980, y: 100, w: 200, h: 220, color: "#10b981" },
      { title: "🧠 Key Resources",  x: 300, y: 215, w: 200, h: 105, color: "#3b82f6" },
      { title: "📣 Channels",       x: 760, y: 215, w: 200, h: 105, color: "#f59e0b" },
      { title: "💸 Cost Structure", x: 80,  y: 340, w: 540, h: 120, color: "#ef4444" },
      { title: "💰 Revenue Streams", x: 640, y: 340, w: 540, h: 120, color: "#22c55e" },
    ];
    const els = blocks.map((b) => ({
      id: generateId(),
      type: "rounded-rect" as ShapeType,
      x: b.x, y: b.y, w: b.w, h: b.h,
      label: b.title,
      color: b.color,
      fill: `${b.color}1f`,
      strokeWidth: 2, strokeStyle: "solid" as const, opacity: 1,
      fontFamily: "sans" as const, fontSize: 14, bold: true, textAlign: "left" as const,
    }));
    return { els, conns: [] };
  }

  if (templateId === "empathy-map") {
    const cx = 620, cy = 360;
    const persona = makeMindMapNode({ label: "🙂 Persona\nAva, 28\nProduct Designer", x: cx - 90, y: cy - 40, w: 180, h: 90, isRoot: true });
    const quads = [
      { label: "🗣️ SAYS\n\"I need this now\"\n\"Where is the export?\"", dx: -320, dy: -220, i: 0 },
      { label: "💭 THINKS\nAm I doing it right?\nIs it worth the cost?", dx: 180, dy: -220, i: 1 },
      { label: "🚶 DOES\nOpens on mobile\nSaves to Notion", dx: -320, dy: 90, i: 2 },
      { label: "❤️ FEELS\nExcited but overwhelmed\nProud of small wins", dx: 180, dy: 90, i: 3 },
    ];
    const els: WbElement[] = [persona];
    const conns: WbConn[] = [];
    quads.forEach((q) => {
      const node: WbElement = {
        id: generateId(), type: "sticky",
        x: cx + q.dx, y: cy + q.dy, w: 240, h: 150,
        label: q.label,
        color: getBranchStyle(q.i).color,
        fill: q.i === 0 ? "#bae6fd" : q.i === 1 ? "#e9d5ff" : q.i === 2 ? "#bbf7d0" : "#fbcfe8",
        strokeWidth: 1, strokeStyle: "solid", opacity: 1,
        fontFamily: "hand", fontSize: 16,
      };
      els.push(node);
      conns.push({
        id: generateId(), fromId: persona.id, toId: node.id,
        fromAnchor: "center", toAnchor: "center", type: "curved",
        color: getBranchStyle(q.i).color, strokeWidth: 2, strokeStyle: "dashed", arrowEnd: false,
      });
    });
    return { els, conns };
  }

  if (templateId === "fishbone") {
    const spineStart = { x: 120, y: 340 };
    const spineEnd = { x: 1080, y: 340 };
    const problem: WbElement = {
      id: generateId(), type: "rounded-rect",
      x: spineEnd.x - 40, y: spineEnd.y - 40, w: 200, h: 80,
      label: "⚠️ Problem\nHigh Churn",
      color: "#ef4444", fill: "rgba(239,68,68,0.2)",
      strokeWidth: 3, strokeStyle: "solid", opacity: 1,
      fontFamily: "sans", fontSize: 15, bold: true,
    };
    const spine: WbElement = {
      id: generateId(), type: "line",
      x: spineStart.x, y: spineStart.y, w: spineEnd.x - spineStart.x - 40, h: 0,
      label: "", color: "#94a3b8", fill: "transparent",
      strokeWidth: 3, strokeStyle: "solid", opacity: 1,
    };
    const els: WbElement[] = [spine, problem];
    const conns: WbConn[] = [];
    const bones = [
      { label: "People", side: "top", i: 0 },
      { label: "Process", side: "bottom", i: 1 },
      { label: "Tools", side: "top", i: 2 },
      { label: "Environment", side: "bottom", i: 3 },
      { label: "Method", side: "top", i: 4 },
      { label: "Measurement", side: "bottom", i: 5 },
    ];
    bones.forEach((b, idx) => {
      const step = Math.floor(idx / 2);
      const x = spineStart.x + 150 + step * 250;
      const y = b.side === "top" ? spineStart.y - 140 : spineStart.y + 80;
      const node = makeMindMapNode({ label: b.label, x, y, w: 150, h: 60, branchIndex: b.i });
      els.push(node);
      conns.push({
        id: generateId(), fromId: node.id, toId: problem.id,
        fromAnchor: b.side === "top" ? "bottom" : "top", toAnchor: "left",
        type: "straight", color: getBranchStyle(b.i).color,
        strokeWidth: 2, strokeStyle: "solid", arrowEnd: true,
      });
    });
    return { els, conns };
  }

  if (templateId === "okr-tree") {
    const objective = makeMindMapNode({ label: "🎯 Objective\nDelight Our Users", x: 470, y: 100, w: 240, h: 80, isRoot: true });
    const krs = [
      { label: "KR1: NPS ≥ 60", i: 0 },
      { label: "KR2: Retention +15%", i: 1 },
      { label: "KR3: Support < 24h", i: 2 },
    ];
    const initiatives = [
      ["Redesign onboarding", "Ship weekly digest"],
      ["Feature flag AB tests", "Loyalty rewards"],
      ["Chatbot triage", "Staff coverage"],
    ];
    const els: WbElement[] = [objective];
    const conns: WbConn[] = [];
    krs.forEach((kr, i) => {
      const krNode = makeMindMapNode({ label: kr.label, x: 200 + i * 340, y: 260, w: 220, h: 68, branchIndex: kr.i });
      els.push(krNode);
      conns.push({ id: generateId(), fromId: objective.id, toId: krNode.id, fromAnchor: "bottom", toAnchor: "top", type: "curved", color: getBranchStyle(kr.i).color, strokeWidth: 2.5, strokeStyle: "solid", arrowEnd: false });
      initiatives[i].forEach((init, j) => {
        const initNode = makeMindMapNode({ label: init, x: 210 + i * 340 + j * 30, y: 400 + j * 90, w: 200, h: 56, branchIndex: kr.i });
        els.push(initNode);
        conns.push({ id: generateId(), fromId: krNode.id, toId: initNode.id, fromAnchor: "bottom", toAnchor: "top", type: "curved", color: getBranchStyle(kr.i).color, strokeWidth: 2, strokeStyle: "dashed", arrowEnd: false });
      });
    });
    return { els, conns };
  }

  if (templateId === "weekly-planner") {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const els: WbElement[] = [];
    days.forEach((day, i) => {
      const branch = getBranchStyle(i);
      els.push({
        id: generateId(), type: "rounded-rect",
        x: 80 + i * 170, y: 100, w: 150, h: 40,
        label: day,
        color: branch.color, fill: `${branch.color}22`,
        strokeWidth: 2, strokeStyle: "solid", opacity: 1,
        fontFamily: "sans", fontSize: 14, bold: true,
      });
      els.push({
        id: generateId(), type: "sticky",
        x: 80 + i * 170, y: 160, w: 150, h: 230,
        label: `• Focus: ...\n• Task 1\n• Task 2\n• Reflection`,
        color: branch.color, fill: i % 2 === 0 ? "#fef08a" : "#bae6fd",
        strokeWidth: 1, strokeStyle: "solid", opacity: 1,
        fontFamily: "hand", fontSize: 15,
      });
    });
    return { els, conns: [] };
  }

  if (templateId === "flowchart") {
    const start: WbElement = { id: generateId(), type: "capsule", x: 480, y: 80, w: 200, h: 60, label: "▶ Start", color: "#10b981", fill: "rgba(16,185,129,0.22)", strokeWidth: 2, strokeStyle: "solid", opacity: 1, fontFamily: "sans", fontSize: 14, bold: true };
    const input: WbElement = { id: generateId(), type: "parallelogram", x: 460, y: 200, w: 240, h: 70, label: "Input data", color: "#3b82f6", fill: "rgba(59,130,246,0.2)", strokeWidth: 2, strokeStyle: "solid", opacity: 1, fontFamily: "sans", fontSize: 14 };
    const decision: WbElement = { id: generateId(), type: "diamond", x: 460, y: 330, w: 240, h: 130, label: "Valid?", color: "#f59e0b", fill: "rgba(245,158,11,0.22)", strokeWidth: 2, strokeStyle: "solid", opacity: 1, fontFamily: "sans", fontSize: 14, bold: true };
    const yes: WbElement = { id: generateId(), type: "rounded-rect", x: 220, y: 520, w: 200, h: 68, label: "✅ Save & notify", color: "#22c55e", fill: "rgba(34,197,94,0.22)", strokeWidth: 2, strokeStyle: "solid", opacity: 1, fontFamily: "sans", fontSize: 14 };
    const no: WbElement = { id: generateId(), type: "rounded-rect", x: 720, y: 520, w: 200, h: 68, label: "⚠️ Show errors", color: "#ef4444", fill: "rgba(239,68,68,0.22)", strokeWidth: 2, strokeStyle: "solid", opacity: 1, fontFamily: "sans", fontSize: 14 };
    const end: WbElement = { id: generateId(), type: "capsule", x: 480, y: 640, w: 200, h: 60, label: "⏹ End", color: "#94a3b8", fill: "rgba(148,163,184,0.2)", strokeWidth: 2, strokeStyle: "solid", opacity: 1, fontFamily: "sans", fontSize: 14, bold: true };
    const conns: WbConn[] = [
      { id: generateId(), fromId: start.id, toId: input.id, fromAnchor: "bottom", toAnchor: "top", type: "orthogonal", color: "#94a3b8", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
      { id: generateId(), fromId: input.id, toId: decision.id, fromAnchor: "bottom", toAnchor: "top", type: "orthogonal", color: "#94a3b8", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
      { id: generateId(), fromId: decision.id, toId: yes.id, fromAnchor: "bottom", toAnchor: "top", type: "orthogonal", color: "#22c55e", strokeWidth: 2, strokeStyle: "solid", label: "Yes", arrowEnd: true },
      { id: generateId(), fromId: decision.id, toId: no.id, fromAnchor: "bottom", toAnchor: "top", type: "orthogonal", color: "#ef4444", strokeWidth: 2, strokeStyle: "solid", label: "No", arrowEnd: true },
      { id: generateId(), fromId: yes.id, toId: end.id, fromAnchor: "bottom", toAnchor: "top", type: "orthogonal", color: "#94a3b8", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
      { id: generateId(), fromId: no.id, toId: end.id, fromAnchor: "bottom", toAnchor: "top", type: "orthogonal", color: "#94a3b8", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
    ];
    return { els: [start, input, decision, yes, no, end], conns };
  }

  if (templateId === "org-chart") {
    const ceo = makeMindMapNode({ label: "👑 CEO\nJane Doe", x: 500, y: 80, w: 200, h: 70, isRoot: true });
    const teams = [
      { label: "🛠️ VP Engineering", subs: ["Backend", "Frontend", "DevOps"] },
      { label: "🎨 VP Design", subs: ["Product", "Brand"] },
      { label: "📣 VP Marketing", subs: ["Content", "Growth"] },
    ];
    const els: WbElement[] = [ceo];
    const conns: WbConn[] = [];
    teams.forEach((t, i) => {
      const teamX = 160 + i * 350;
      const teamNode = makeMindMapNode({ label: t.label, x: teamX, y: 240, w: 220, h: 60, branchIndex: i });
      els.push(teamNode);
      conns.push({ id: generateId(), fromId: ceo.id, toId: teamNode.id, fromAnchor: "bottom", toAnchor: "top", type: "orthogonal", color: getBranchStyle(i).color, strokeWidth: 2, strokeStyle: "solid", arrowEnd: false });
      t.subs.forEach((sub, j) => {
        const subNode = makeMindMapNode({ label: sub, x: teamX + 10 + j * 20, y: 380 + j * 80, w: 190, h: 52, branchIndex: i });
        els.push(subNode);
        conns.push({ id: generateId(), fromId: teamNode.id, toId: subNode.id, fromAnchor: "bottom", toAnchor: "top", type: "orthogonal", color: getBranchStyle(i).color, strokeWidth: 2, strokeStyle: "dashed", arrowEnd: false });
      });
    });
    return { els, conns };
  }

  if (templateId === "microservices") {
    const client = {
      id: generateId(),
      type: "rounded-rect" as ShapeType,
      x: 100,
      y: 280,
      w: 140,
      h: 70,
      label: "Client App / Web",
      color: "#38bdf8",
      fill: "rgba(56, 189, 248, 0.18)",
      strokeWidth: 2,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "sans" as const,
      fontSize: 14,
    };
    const gateway = {
      id: generateId(),
      type: "hexagon" as ShapeType,
      x: 320,
      y: 280,
      w: 160,
      h: 80,
      label: "API Gateway (Kong / Nginx)",
      color: "#818cf8",
      fill: "rgba(129, 140, 248, 0.18)",
      strokeWidth: 2,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "sans" as const,
      fontSize: 14,
      bold: true,
    };
    const auth = {
      id: generateId(),
      type: "rounded-rect" as ShapeType,
      x: 580,
      y: 130,
      w: 150,
      h: 70,
      label: "Auth & OAuth Service",
      color: "#c084fc",
      fill: "rgba(192, 132, 252, 0.18)",
      strokeWidth: 2,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "sans" as const,
      fontSize: 14,
    };
    const orders = {
      id: generateId(),
      type: "rounded-rect" as ShapeType,
      x: 580,
      y: 285,
      w: 150,
      h: 70,
      label: "Order & Payment API",
      color: "#4ade80",
      fill: "rgba(74, 222, 128, 0.18)",
      strokeWidth: 2,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "sans" as const,
      fontSize: 14,
    };
    const search = {
      id: generateId(),
      type: "rounded-rect" as ShapeType,
      x: 580,
      y: 440,
      w: 150,
      h: 70,
      label: "Catalog & Search",
      color: "#fb923c",
      fill: "rgba(251, 146, 60, 0.18)",
      strokeWidth: 2,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "sans" as const,
      fontSize: 14,
    };
    const db = {
      id: generateId(),
      type: "circle" as ShapeType,
      x: 840,
      y: 285,
      w: 130,
      h: 70,
      label: "PostgreSQL Replica",
      color: "#facc15",
      fill: "rgba(250, 204, 21, 0.18)",
      strokeWidth: 2,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "mono" as const,
      fontSize: 13,
    };
    const cache = {
      id: generateId(),
      type: "rounded-rect" as ShapeType,
      x: 840,
      y: 130,
      w: 130,
      h: 70,
      label: "Redis Cache Cluster",
      color: "#f87171",
      fill: "rgba(248, 113, 113, 0.18)",
      strokeWidth: 2,
      strokeStyle: "dashed" as const,
      opacity: 1,
      fontFamily: "mono" as const,
      fontSize: 13,
    };

    const els = [client, gateway, auth, orders, search, db, cache];
    const conns: WbConn[] = [
      { id: generateId(), fromId: client.id, toId: gateway.id, fromAnchor: "right", toAnchor: "left", type: "straight", color: "#38bdf8", strokeWidth: 2, strokeStyle: "solid", label: "HTTPS / REST", arrowEnd: true },
      { id: generateId(), fromId: gateway.id, toId: auth.id, fromAnchor: "top", toAnchor: "left", type: "curved", color: "#818cf8", strokeWidth: 2, strokeStyle: "solid", label: "Verify JWT", arrowEnd: true },
      { id: generateId(), fromId: gateway.id, toId: orders.id, fromAnchor: "right", toAnchor: "left", type: "straight", color: "#818cf8", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
      { id: generateId(), fromId: gateway.id, toId: search.id, fromAnchor: "bottom", toAnchor: "left", type: "curved", color: "#818cf8", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
      { id: generateId(), fromId: orders.id, toId: db.id, fromAnchor: "right", toAnchor: "left", type: "orthogonal", color: "#4ade80", strokeWidth: 2, strokeStyle: "solid", label: "SQL Query", arrowEnd: true },
      { id: generateId(), fromId: auth.id, toId: cache.id, fromAnchor: "right", toAnchor: "left", type: "straight", color: "#f87171", strokeWidth: 2, strokeStyle: "dashed", label: "Session Check", arrowEnd: true },
    ];
    return { els, conns };
  }

  if (templateId === "swot") {
    const center = {
      id: generateId(),
      type: "rounded-rect" as ShapeType,
      x: 520,
      y: 280,
      w: 180,
      h: 60,
      label: "SWOT ANALYSIS matrix",
      color: "#38bdf8",
      fill: "rgba(56,189,248,0.25)",
      strokeWidth: 3,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "sans" as const,
      fontSize: 16,
      bold: true,
    };
    const strengths = {
      id: generateId(),
      type: "sticky" as ShapeType,
      x: 220,
      y: 80,
      w: 220,
      h: 170,
      label: "📌 STRENGTHS\n• Fast architecture\n• Strong team expertise\n• Modern tech stack\n• High customer retention",
      color: "#16a34a",
      fill: "#bbf7d0",
      strokeWidth: 1,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "hand" as const,
      fontSize: 17,
    };
    const weaknesses = {
      id: generateId(),
      type: "sticky" as ShapeType,
      x: 780,
      y: 80,
      w: 220,
      h: 170,
      label: "📌 WEAKNESSES\n• Limited marketing budget\n• Needs more E2E tests\n• Documentation backlog",
      color: "#dc2626",
      fill: "#fbcfe8",
      strokeWidth: 1,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "hand" as const,
      fontSize: 17,
    };
    const opportunities = {
      id: generateId(),
      type: "sticky" as ShapeType,
      x: 220,
      y: 380,
      w: 220,
      h: 170,
      label: "📌 OPPORTUNITIES\n• AI-powered automation\n• Expansion into Enterprise\n• Strategic partnerships",
      color: "#2563eb",
      fill: "#bae6fd",
      strokeWidth: 1,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "hand" as const,
      fontSize: 17,
    };
    const threats = {
      id: generateId(),
      type: "sticky" as ShapeType,
      x: 780,
      y: 380,
      w: 220,
      h: 170,
      label: "📌 THREATS\n• Aggressive competitors\n• Rapidly shifting AI tools\n• Hosting price increases",
      color: "#ca8a04",
      fill: "#fef08a",
      strokeWidth: 1,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "hand" as const,
      fontSize: 17,
    };

    const els = [center, strengths, weaknesses, opportunities, threats];
    const conns: WbConn[] = [
      { id: generateId(), fromId: center.id, toId: strengths.id, fromAnchor: "top", toAnchor: "bottom", type: "curved", color: "#4ade80", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
      { id: generateId(), fromId: center.id, toId: weaknesses.id, fromAnchor: "top", toAnchor: "bottom", type: "curved", color: "#f87171", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
      { id: generateId(), fromId: center.id, toId: opportunities.id, fromAnchor: "bottom", toAnchor: "top", type: "curved", color: "#38bdf8", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
      { id: generateId(), fromId: center.id, toId: threats.id, fromAnchor: "bottom", toAnchor: "top", type: "curved", color: "#facc15", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
    ];
    return { els, conns };
  }

  if (templateId === "roadmap") {
    const frame = {
      id: generateId(),
      type: "frame" as ShapeType,
      x: 80,
      y: 80,
      w: 1040,
      h: 460,
      label: "Sprint 24 Roadmap Board",
      frameTitle: "Sprint 24 Roadmap Board",
      color: "#38bdf8",
      fill: "rgba(15, 23, 42, 0.4)",
      strokeWidth: 2,
      strokeStyle: "dashed" as const,
      opacity: 1,
    };

    const col1 = {
      id: generateId(),
      type: "sticky" as ShapeType,
      x: 130,
      y: 150,
      w: 180,
      h: 130,
      label: "BACKLOG\n• Redesign MindMap UI\n• Add Export PNG\n• Realtime collab cursors",
      color: "#a855f7",
      fill: "#e9d5ff",
      strokeWidth: 1,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "hand" as const,
      fontSize: 15,
    };
    const col2 = {
      id: generateId(),
      type: "sticky" as ShapeType,
      x: 390,
      y: 150,
      w: 180,
      h: 130,
      label: "IN PROGRESS\n• Custom shape anchors\n• Sticky notes drag & edit\n• Shortcuts cheatsheet",
      color: "#3b82f6",
      fill: "#bae6fd",
      strokeWidth: 1,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "hand" as const,
      fontSize: 15,
    };
    const col3 = {
      id: generateId(),
      type: "sticky" as ShapeType,
      x: 650,
      y: 150,
      w: 180,
      h: 130,
      label: "REVIEW\n• Unit tests for Bezier\n• Mobile responsive pan",
      color: "#f59e0b",
      fill: "#fef08a",
      strokeWidth: 1,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "hand" as const,
      fontSize: 15,
    };
    const col4 = {
      id: generateId(),
      type: "sticky" as ShapeType,
      x: 900,
      y: 150,
      w: 180,
      h: 130,
      label: "DEPLOYED ✅\n• LocalStorage auto-save\n• Rich toolbar UI",
      color: "#10b981",
      fill: "#bbf7d0",
      strokeWidth: 1,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "hand" as const,
      fontSize: 15,
    };

    const stamp1 = {
      id: generateId(),
      type: "stamp" as ShapeType,
      x: 210,
      y: 340,
      w: 60,
      h: 60,
      label: "Idea",
      stampIcon: "💡",
      color: "#facc15",
      fill: "transparent",
      strokeWidth: 1,
      strokeStyle: "solid" as const,
      opacity: 1,
    };
    const stamp2 = {
      id: generateId(),
      type: "stamp" as ShapeType,
      x: 450,
      y: 340,
      w: 60,
      h: 60,
      label: "Priority",
      stampIcon: "🔥",
      color: "#f87171",
      fill: "transparent",
      strokeWidth: 1,
      strokeStyle: "solid" as const,
      opacity: 1,
    };

    const els = [frame, col1, col2, col3, col4, stamp1, stamp2];
    const conns: WbConn[] = [
      { id: generateId(), fromId: col1.id, toId: col2.id, fromAnchor: "right", toAnchor: "left", type: "curved", color: "#818cf8", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
      { id: generateId(), fromId: col2.id, toId: col3.id, fromAnchor: "right", toAnchor: "left", type: "curved", color: "#818cf8", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
      { id: generateId(), fromId: col3.id, toId: col4.id, fromAnchor: "right", toAnchor: "left", type: "curved", color: "#4ade80", strokeWidth: 2, strokeStyle: "solid", arrowEnd: true },
    ];
    return { els, conns };
  }

  // Default: study concept or fallback
  const root = {
    id: generateId(),
    type: "circle" as ShapeType,
    x: 540,
    y: 280,
    w: 140,
    h: 80,
    label: "Advanced Whiteboard System",
    color: "#38bdf8",
    fill: "rgba(56, 189, 248, 0.22)",
    strokeWidth: 3,
    strokeStyle: "solid" as const,
    opacity: 1,
    fontFamily: "sans" as const,
    fontSize: 15,
    bold: true,
  };

  const branches = [
    { label: "Vector Shape Engine", color: "#818cf8", fill: "rgba(129,140,248,0.18)" },
    { label: "Smart Sticky Notes", color: "#facc15", fill: "rgba(250,204,21,0.18)" },
    { label: "Bezier Connectors", color: "#c084fc", fill: "rgba(192,132,252,0.18)" },
    { label: "AI & OCR Generation", color: "#4ade80", fill: "rgba(74,222,128,0.18)" },
    { label: "Auto-Layout Layouts", color: "#f472b6", fill: "rgba(244,114,182,0.18)" },
    { label: "SVG/PNG Export Suite", color: "#fb923c", fill: "rgba(251,146,60,0.18)" },
  ];

  const els: WbElement[] = [root];
  const conns: WbConn[] = [];

  branches.forEach((b, i) => {
    const id = generateId();
    const ang = (i * 2 * Math.PI) / branches.length;
    const rad = 230;
    const nx = 540 + rad * Math.cos(ang) - 10;
    const ny = 280 + rad * Math.sin(ang);
    els.push({
      id,
      type: "rounded-rect" as ShapeType,
      x: nx,
      y: ny,
      w: 160,
      h: 64,
      label: b.label,
      color: b.color,
      fill: b.fill,
      strokeWidth: 2,
      strokeStyle: "solid" as const,
      opacity: 1,
      fontFamily: "sans" as const,
      fontSize: 14,
    });
    conns.push({
      id: generateId(),
      fromId: root.id,
      toId: id,
      fromAnchor: "center",
      toAnchor: "center",
      type: "curved",
      color: b.color,
      strokeWidth: 2,
      strokeStyle: "solid",
      arrowEnd: true,
    });
  });

  return { els, conns };
}

// ─── Convert Text Outline to Diagram ─────────────────────────────────────────
export function convertTextOutlineToDiagram(text: string): { els: WbElement[]; conns: WbConn[] } {
  const lines = text
    .split(/\r?\n|;|,/)
    .map((l) => l.trim().replace(/^[-*•0-9.)]+\s*/, ""))
    .filter((l) => l.length > 1 && l.length < 80);

  const topics = lines.slice(0, 10);
  if (topics.length === 0) {
    return generateTemplateData("study-concept");
  }

  const generateId = uid;
  const rootId = generateId();
  const root: WbElement = {
    id: rootId,
    type: "circle" as ShapeType,
    x: 540,
    y: 280,
    w: 160,
    h: 80,
    label: topics[0],
    color: "#38bdf8",
    fill: "rgba(56, 189, 248, 0.22)",
    strokeWidth: 3,
    strokeStyle: "solid",
    opacity: 1,
    fontFamily: "sans",
    fontSize: 15,
    bold: true,
  };

  const els: WbElement[] = [root];
  const conns: WbConn[] = [];

  const subTopics = topics.slice(1);
  subTopics.forEach((topic, i) => {
    const id = generateId();
    const ang = (i * 2 * Math.PI) / Math.max(1, subTopics.length);
    const rad = Math.max(220, subTopics.length * 36);
    const nx = 540 + rad * Math.cos(ang) - 10;
    const ny = 280 + rad * Math.sin(ang);
    const col = STROKE_COLORS[(i + 1) % (STROKE_COLORS.length - 2)];
    const fill = FILL_COLORS[(i + 1) % (FILL_COLORS.length - 6)];

    els.push({
      id,
      type: "rounded-rect" as ShapeType,
      x: nx,
      y: ny,
      w: 150,
      h: 66,
      label: topic,
      color: col,
      fill: fill,
      strokeWidth: 2,
      strokeStyle: "solid",
      opacity: 1,
      fontFamily: "sans",
      fontSize: 14,
    });

    conns.push({
      id: generateId(),
      fromId: rootId,
      toId: id,
      fromAnchor: "center",
      toAnchor: "center",
      type: "curved",
      color: col,
      strokeWidth: 2,
      strokeStyle: "solid",
      arrowEnd: true,
    });
  });

  return layoutRadial(els, conns);
}

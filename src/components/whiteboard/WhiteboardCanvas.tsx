import React, { useState, useEffect } from "react";
import {
  WbElement,
  WbConn,
  Point,
  ShapeType,
  ConnectorType,
  AnchorPos,
  GridType,
  BrushStyleType,
} from "../../types/whiteboard";
import {
  buildConnPath,
  findBestAnchor,
  getAnchorPoint,
  getConnMidPoint,
  isBoxOverlapping,
  STROKE_COLORS,
  uid,
} from "../../utils/whiteboardUtils";
import { recognizeShape, toElement } from "../../utils/shapeRecognition";
import { recognizeStrokes, strokesBounds } from "../../utils/handwritingRecognition";

interface WhiteboardCanvasProps {
  els: WbElement[];
  conns: WbConn[];
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  tool: string;
  setTool: (tool: any) => void;
  activeConnectorType: ConnectorType;
  zoom: number;
  pan: Point;
  onPanChange: (pan: Point) => void;
  gridType: GridType;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle: any;
  brushStyle: BrushStyleType;
  brushOpacity: number;
  pressureEnabled: boolean;
  stabilizer: number;
  selectedStamp: string;
  onAddElement: (el: WbElement) => void;
  onAddConnection: (conn: WbConn) => void;
  onUpdateElement: (id: string, patch: Partial<WbElement>) => void;
  onInteractionCommit: () => void;
  onDeleteElements: (ids: string[]) => void;
  selectedConnId: string | null;
  onSelectConnection: (id: string | null) => void;
  onImageFile: (file: File, point?: Point) => void;
  onZoomAt: (delta: number, screenPoint: Point) => void;
  onQuickSpawnChild: (fromId: string, direction: AnchorPos) => void;
  onStartInlineEdit: (el: WbElement) => void;
  showCollaborators: boolean;
  showToast: (msg: string) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  shapeRecognition: boolean;
  handwritingRecognition: boolean;
  recognitionMode: "off" | "shapes" | "handwriting" | "auto";
  connectorParticles: boolean;
  particleSpeed: number;
  glowConnectors: boolean;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  els,
  conns,
  selectedIds,
  onSelectIds,
  tool,
  setTool,
  activeConnectorType,
  zoom,
  pan,
  onPanChange,
  gridType,
  strokeColor,
  fillColor,
  strokeWidth,
  strokeStyle,
  brushStyle,
  brushOpacity,
  pressureEnabled,
  stabilizer,
  selectedStamp,
  onAddElement,
  onAddConnection,
  onUpdateElement,
  onInteractionCommit,
  onDeleteElements,
  selectedConnId,
  onSelectConnection,
  onImageFile,
  onZoomAt,
  onQuickSpawnChild,
  onStartInlineEdit,
  showCollaborators,
  showToast,
  svgRef,
  shapeRecognition,
  handwritingRecognition,
  recognitionMode,
  connectorParticles,
  particleSpeed,
  glowConnectors,
}) => {
  const [dragging, setDragging] = useState<{
    ids: string[];
    ox: number;
    oy: number;
    startPositions: { id: string; x: number; y: number }[];
  } | null>(null);

  const [resizing, setResizing] = useState<{
    id: string;
    startW: number;
    startH: number;
    startX: number;
    startY: number;
    startPoints?: Point[];
    startFontSize?: number;
  } | null>(null);

  const [rotating, setRotating] = useState<{
    id: string;
    center: Point;
    startAngle: number;
    startRotation: number;
  } | null>(null);

  // Group resize: scale every selected element from the selection bounding box
  const [groupResize, setGroupResize] = useState<{
    originX: number;
    originY: number;
    startW: number;
    startH: number;
    startPt: Point;
    snapshot: { id: string; x: number; y: number; w: number; h: number; fontSize?: number }[];
  } | null>(null);

  const [panning, setPanning] = useState<{
    sx: number;
    sy: number;
    px: number;
    py: number;
  } | null>(null);

  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  } | null>(null);

  // Free-form lasso selection path (Excalidraw-style)
  const [lassoPath, setLassoPath] = useState<Point[]>([]);

  // Handwriting: buffer several strokes so multi-stroke letters (A, K, R, T…)
  // are recognised together. Flushed after a short pause or on tool change.
  const hwBufferRef = React.useRef<{ strokes: Point[][]; elIds: string[] }>({
    strokes: [],
    elIds: [],
  });
  const hwTimerRef = React.useRef<number | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPts, setDrawPts] = useState<(Point & { pressure?: number })[]>([]);
  const lastDrawSampleRef = React.useRef<{ x: number; y: number; t: number } | null>(null);

  const [connFrom, setConnFrom] = useState<{
    id: string;
    anchor: AnchorPos;
  } | null>(null);
  const [connHoverPt, setConnHoverPt] = useState<Point | null>(null);

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [laserActive, setLaserActive] = useState(false);
  const [laserPts, setLaserPts] = useState<(Point & { createdAt: number })[]>([]);

  const getBrushConfig = (
    style: BrushStyleType,
    highlighter = false,
    pressure = 0.5
  ) => {
    const p = Math.min(1, Math.max(0.15, pressure));
    if (highlighter) {
      return {
        width: Math.max(strokeWidth * 4, 14) * (0.85 + p * 0.3),
        opacity: Math.min(0.5, brushOpacity * 0.55),
        dash: undefined as string | undefined,
        lineCap: "round" as const,
      };
    }
    switch (style) {
      case "pencil":
        return {
          width: Math.max(strokeWidth, 2) * (0.75 + p * 0.45),
          opacity: Math.min(1, brushOpacity * 0.78),
          dash: "1 5",
          lineCap: "round" as const,
        };
      case "marker":
        return {
          width: Math.max(strokeWidth * 2.2, 8) * (0.85 + p * 0.35),
          opacity: Math.min(1, brushOpacity * 0.92),
          dash: undefined as string | undefined,
          lineCap: "round" as const,
        };
      case "brush":
        return {
          width: Math.max(strokeWidth * 2.8, 10) * (0.65 + p * 0.9),
          opacity: Math.min(1, brushOpacity * 0.88),
          dash: undefined as string | undefined,
          lineCap: "round" as const,
        };
      case "calligraphy":
        return {
          width: Math.max(strokeWidth * 1.8, 5) * (0.55 + p * 1.15),
          opacity: Math.min(1, brushOpacity * 0.95),
          dash: undefined as string | undefined,
          lineCap: "round" as const,
        };
      case "technical":
        return {
          width: Math.max(strokeWidth, 1),
          opacity: brushOpacity,
          dash: undefined as string | undefined,
          lineCap: "square" as const,
        };
      default:
        return {
          width: strokeWidth * (0.85 + p * 0.3),
          opacity: brushOpacity,
          dash: undefined as string | undefined,
          lineCap: "round" as const,
        };
    }
  };

  const smoothPoint = (point: Point, previous?: Point) => {
    if (!previous || stabilizer <= 0) return point;
    const amount = Math.min(0.85, stabilizer / 10);
    return {
      x: previous.x * amount + point.x * (1 - amount),
      y: previous.y * amount + point.y * (1 - amount),
    };
  };

  const estimatePressure = (point: Point, event?: React.PointerEvent | React.MouseEvent) => {
    if (!pressureEnabled) return 0.55;
    const nativePressure = "pressure" in (event || {}) ? Number((event as React.PointerEvent).pressure || 0) : 0;
    if (nativePressure > 0.01) return nativePressure;

    const now = performance.now();
    const last = lastDrawSampleRef.current;
    lastDrawSampleRef.current = { x: point.x, y: point.y, t: now };
    if (!last) return 0.5;
    const dt = Math.max(1, now - last.t);
    const dist = Math.hypot(point.x - last.x, point.y - last.y);
    const velocity = dist / dt;
    // slower stroke = thicker; faster stroke = thinner (brush/calligraphy feel)
    return Math.min(1, Math.max(0.2, 1 - velocity * 1.8));
  };

  // Simulated collaborators movement
  const [simCursors, setSimCursors] = useState<{
    alex: Point;
    sarah: Point;
  }>({
    alex: { x: 380, y: 240 },
    sarah: { x: 620, y: 310 },
  });

  useEffect(() => {
    if (!showCollaborators) return;
    const int = setInterval(() => {
      setSimCursors((prev) => ({
        alex: {
          x: prev.alex.x + (Math.random() * 20 - 10),
          y: prev.alex.y + (Math.random() * 20 - 10),
        },
        sarah: {
          x: prev.sarah.x + (Math.random() * 20 - 10),
          y: prev.sarah.y + (Math.random() * 20 - 10),
        },
      }));
    }, 2500);
    return () => clearInterval(int);
  }, [showCollaborators]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === "Space" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        setSpacePressed(true);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePressed(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (laserPts.length === 0) return;
    const timer = window.setInterval(() => {
      const cutoff = Date.now() - 650;
      setLaserPts((points) => points.filter((point) => point.createdAt > cutoff));
    }, 60);
    return () => window.clearInterval(timer);
  }, [laserPts.length > 0]);

  // Coordinate conversion from screen to SVG world
  const getSvgPt = (clientX: number, clientY: number): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Proportional zoom: small trackpad deltas stay smooth, big wheel steps too
      const delta = -event.deltaY * 0.0022 * zoom;
      onZoomAt(Math.min(0.35, Math.max(-0.35, delta)), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      return;
    }

    onPanChange({
      x: pan.x - (event.shiftKey ? event.deltaY : event.deltaX),
      y: pan.y - (event.shiftKey ? 0 : event.deltaY),
    });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/"));
    if (file) onImageFile(file, getSvgPt(event.clientX, event.clientY));
  };

  // ── Full Touch support (mobile): pinch zoom, pan, draw, marquee ───────
  const touchStateRef = React.useRef<{
    lastDistance?: number;
    lastMidpoint?: Point;
    startPan?: Point;
    startTouch?: Point;
    mode?: "pan" | "draw" | "marquee" | null;
  }>({});

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      // Cancel any in-progress single-touch gesture before pinch
      if (isDrawing) { setIsDrawing(false); setDrawPts([]); }
      setMarquee(null);
      const [t1, t2] = [event.touches[0], event.touches[1]];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      touchStateRef.current.lastDistance = Math.hypot(dx, dy);
      touchStateRef.current.lastMidpoint = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      touchStateRef.current.mode = null;
      return;
    }

    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    const pt = getSvgPt(touch.clientX, touch.clientY);

    if (tool === "pan" || spacePressed) {
      touchStateRef.current.startPan = { x: pan.x, y: pan.y };
      touchStateRef.current.startTouch = { x: touch.clientX, y: touch.clientY };
      touchStateRef.current.mode = "pan";
      return;
    }

    // Freehand drawing with finger / stylus
    if (tool === "draw" || tool === "highlighter") {
      touchStateRef.current.mode = "draw";
      setIsDrawing(true);
      lastDrawSampleRef.current = { x: pt.x, y: pt.y, t: performance.now() };
      setDrawPts([{ ...pt, pressure: estimatePressure(pt) }]);
      return;
    }

    // Marquee selection with finger
    if (tool === "select") {
      const target = event.target as Element;
      const isCanvas =
        target === svgRef.current || target.tagName === "svg" || target.id === "grid-rect";
      if (isCanvas) {
        touchStateRef.current.mode = "marquee";
        onSelectIds([]);
        onSelectConnection(null);
        setMarquee({ startX: pt.x, startY: pt.y, currX: pt.x, currY: pt.y });
      }
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && touchStateRef.current.lastDistance) {
      event.preventDefault();
      const [t1, t2] = [event.touches[0], event.touches[1]];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const dist = Math.hypot(dx, dy);
      const midpoint = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      const delta = (dist - touchStateRef.current.lastDistance) * 0.005;
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        onZoomAt(delta, { x: midpoint.x - rect.left, y: midpoint.y - rect.top });
      }
      touchStateRef.current.lastDistance = dist;
      touchStateRef.current.lastMidpoint = midpoint;
      return;
    }

    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    const pt = getSvgPt(touch.clientX, touch.clientY);

    if (touchStateRef.current.mode === "pan" && touchStateRef.current.startPan && touchStateRef.current.startTouch) {
      event.preventDefault();
      onPanChange({
        x: touchStateRef.current.startPan.x + (touch.clientX - touchStateRef.current.startTouch.x),
        y: touchStateRef.current.startPan.y + (touch.clientY - touchStateRef.current.startTouch.y),
      });
      return;
    }

    if (touchStateRef.current.mode === "draw" && isDrawing) {
      event.preventDefault();
      setDrawPts((prev) => {
        const previous = prev[prev.length - 1];
        const smoothed = smoothPoint(pt, previous);
        const pressure = estimatePressure(smoothed);
        if (previous && Math.hypot(smoothed.x - previous.x, smoothed.y - previous.y) < 0.6) {
          return prev;
        }
        return [...prev, { ...smoothed, pressure }];
      });
      return;
    }

    if (touchStateRef.current.mode === "marquee") {
      event.preventDefault();
      setMarquee((prev) => (prev ? { ...prev, currX: pt.x, currY: pt.y } : null));
    }
  };

  const handleTouchEnd = () => {
    // Reuse the same completion logic as mouseup for draw + marquee
    if (isDrawing || marquee) {
      handleSvgUp();
    }
    touchStateRef.current = {};
  };

  // ─── Canvas Mouse Down ───────────────────────────────────────────────────
  const handleSvgDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (
      e.target !== svgRef.current &&
      (e.target as Element).tagName !== "svg" &&
      (e.target as Element).id !== "grid-rect"
    ) {
      return;
    }

    // Pan canvas with middle click, Space+click, or Hand tool
    if (e.button === 1 || tool === "pan" || spacePressed || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setPanning({ sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y });
      return;
    }

    const pt = getSvgPt(e.clientX, e.clientY);

    if (tool === "laser") {
      setLaserActive(true);
      setLaserPts([{ ...pt, createdAt: Date.now() }]);
      return;
    }

    // Freehand draw or highlighter
    if (tool === "draw" || tool === "highlighter") {
      setIsDrawing(true);
      lastDrawSampleRef.current = { x: pt.x, y: pt.y, t: performance.now() };
      setDrawPts([{ ...pt, pressure: estimatePressure(pt, e) }]);
      return;
    }

    // Free-form lasso selection
    if (tool === "lasso") {
      onSelectIds([]);
      onSelectConnection(null);
      setLassoPath([pt]);
      return;
    }

    // Selection marquee box
    if (tool === "select") {
      onSelectIds([]);
      onSelectConnection(null);
      setMarquee({
        startX: pt.x,
        startY: pt.y,
        currX: pt.x,
        currY: pt.y,
      });
      return;
    }

    // Connect mode: cancel if clicked empty space
    if (tool === "connect") {
      setConnFrom(null);
      return;
    }

    // Create Shape or Sticky or Text or Stamp
    let w = 150;
    let h = 70;
    let label = "Node";
    let type: ShapeType = "rounded-rect";

    if (tool === "rect") {
      type = "rect";
      w = 150;
      h = 80;
    } else if (tool === "rounded-rect") {
      type = "rounded-rect";
      w = 150;
      h = 75;
    } else if (tool === "circle") {
      type = "circle";
      w = 120;
      h = 120;
      label = "Concept";
    } else if (tool === "diamond") {
      type = "diamond";
      w = 150;
      h = 90;
      label = "Decision?";
    } else if (tool === "triangle") {
      type = "triangle";
      w = 130;
      h = 110;
      label = "Triangle";
    } else if (tool === "hexagon") {
      type = "hexagon";
      w = 150;
      h = 80;
      label = "Service";
    } else if (tool === "cloud") {
      type = "cloud";
      w = 160;
      h = 90;
      label = "Idea Cloud";
    } else if (tool === "star") {
      type = "star";
      w = 120;
      h = 120;
      label = "Key Point";
    } else if (tool === "line" || tool === "arrow") {
      type = tool;
      w = 180;
      h = 70;
      label = "";
    } else if (tool === "mind-map") {
      type = "mind-map";
      w = 160;
      h = 56;
      label = "New Idea";
    } else if (tool === "capsule") {
      type = "capsule";
      w = 180;
      h = 60;
      label = "Capsule";
    } else if (tool === "parallelogram") {
      type = "parallelogram";
      w = 200;
      h = 70;
      label = "Data";
    } else if (tool === "sticky") {
      type = "sticky";
      w = 200;
      h = 180;
      label = "📌 Important note:\n• Item 1\n• Item 2";
    } else if (tool === "text") {
      type = "text";
      w = 180;
      h = 50;
      label = "Double-click to edit text";
    } else if (tool === "stamp") {
      type = "stamp";
      w = 80;
      h = 80;
      label = "stamp";
    } else if (tool === "frame") {
      type = "frame";
      w = 400;
      h = 300;
      label = "Container Frame";
    }

    // Pick a vibrant colour for mind-map nodes so they look great by default.
    let nodeColor = type === "stamp" ? "transparent" : strokeColor;
    let nodeFill: string = fillColor;
    if (type === "mind-map") {
      const palette = [
        { color: "#ec4899", fill: "rgba(236,72,153,0.22)" },
        { color: "#10b981", fill: "rgba(16,185,129,0.22)" },
        { color: "#06b6d4", fill: "rgba(6,182,212,0.22)" },
        { color: "#8b5cf6", fill: "rgba(139,92,246,0.22)" },
        { color: "#f97316", fill: "rgba(249,115,22,0.22)" },
        { color: "#ef4444", fill: "rgba(239,68,68,0.22)" },
        { color: "#eab308", fill: "rgba(234,179,8,0.22)" },
      ];
      const pick = palette[Math.floor(Math.random() * palette.length)];
      nodeColor = pick.color;
      nodeFill = pick.fill;
    }

    const newEl: WbElement = {
      id: uid(),
      type,
      x: pt.x - w / 2,
      y: pt.y - h / 2,
      w,
      h,
      label,
      color: nodeColor,
      fill:
        type === "sticky"
          ? "#fef08a"
          : type === "text" || type === "stamp"
          ? "transparent"
          : nodeFill,
      strokeWidth: type === "mind-map" ? 2 : strokeWidth,
      strokeStyle,
      opacity: 1,
      fontFamily: type === "sticky" ? "hand" : "sans",
      fontSize: type === "sticky" ? 16 : type === "mind-map" ? 14 : 14,
      textColor: type === "sticky" ? "#0f172a" : "#ffffff",
      bold: type === "mind-map" ? true : undefined,
      textAlign: "center" as const,
      stampIcon: type === "stamp" ? selectedStamp : undefined,
      frameTitle: type === "frame" ? "Container Frame" : undefined,
    };

    onAddElement(newEl);
    onSelectIds([newEl.id]);
    setTool("select");
  };

  // ─── Canvas Mouse Move ───────────────────────────────────────────────────
  const handleSvgMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (panning) {
      onPanChange({
        x: panning.px + e.clientX - panning.sx,
        y: panning.py + e.clientY - panning.sy,
      });
      return;
    }

    const pt = getSvgPt(e.clientX, e.clientY);

    if (laserActive) {
      setLaserPts((points) => [...points.slice(-28), { ...pt, createdAt: Date.now() }]);
      return;
    }

    if (connFrom) {
      setConnHoverPt(pt);
      return;
    }

    if (isDrawing) {
      setDrawPts((prev) => {
        const previous = prev[prev.length - 1];
        const smoothed = smoothPoint(pt, previous);
        const pressure = estimatePressure(smoothed, e);
        // Keep dense samples for smoother freehand paths
        if (previous && Math.hypot(smoothed.x - previous.x, smoothed.y - previous.y) < 0.6) {
          return prev;
        }
        return [...prev, { ...smoothed, pressure }];
      });
      return;
    }

    if (resizing) {
      const el = els.find((x) => x.id === resizing.id);
      if (!el) return;
      const dx = pt.x - resizing.startX;
      const dy = pt.y - resizing.startY;
      const minW = el.type === "line" || el.type === "arrow" || el.type === "draw" ? 8 : 40;
      const minH = el.type === "line" || el.type === "arrow" || el.type === "draw" ? 8 : 30;
      const newW = Math.max(minW, resizing.startW + dx);
      const newH = Math.max(minH, resizing.startH + dy);
      const patch: Partial<WbElement> = { w: newW, h: newH };
      // Scale points-based geometry (freehand/line/arrow) so imported
      // Excalidraw items keep their exact shape while resizing.
      if (resizing.startPoints && resizing.startPoints.length > 0) {
        const sx = newW / Math.max(1, resizing.startW);
        const sy = newH / Math.max(1, resizing.startH);
        patch.points = resizing.startPoints.map((p) => ({ x: p.x * sx, y: p.y * sy }));
      }
      // Scale font size for text-bearing elements
      if (resizing.startFontSize) {
        const scale = Math.min(newW / Math.max(1, resizing.startW), newH / Math.max(1, resizing.startH));
        patch.fontSize = Math.max(8, Math.round(resizing.startFontSize * scale));
      }
      onUpdateElement(el.id, patch);
      return;
    }

    if (rotating) {
      const angle = Math.atan2(pt.y - rotating.center.y, pt.x - rotating.center.x) * (180 / Math.PI);
      const nextRotation = rotating.startRotation + angle - rotating.startAngle;
      onUpdateElement(rotating.id, { rotation: Math.round(nextRotation) });
      return;
    }

    if (groupResize) {
      const rawW = pt.x - groupResize.originX;
      const rawH = pt.y - groupResize.originY;
      const sx = Math.max(0.12, rawW / Math.max(1, groupResize.startW));
      const sy = Math.max(0.12, rawH / Math.max(1, groupResize.startH));
      // Shift keeps the aspect ratio locked
      const uniform = e.shiftKey ? Math.min(sx, sy) : 0;
      const fx = e.shiftKey ? uniform : sx;
      const fy = e.shiftKey ? uniform : sy;
      groupResize.snapshot.forEach((snap) => {
        onUpdateElement(snap.id, {
          x: groupResize.originX + (snap.x - groupResize.originX) * fx,
          y: groupResize.originY + (snap.y - groupResize.originY) * fy,
          w: Math.max(8, snap.w * fx),
          h: Math.max(8, snap.h * fy),
          ...(snap.fontSize
            ? { fontSize: Math.max(8, Math.round(snap.fontSize * Math.min(fx, fy))) }
            : {}),
        });
      });
      return;
    }

    if (dragging) {
      const dx = pt.x - dragging.ox;
      const dy = pt.y - dragging.oy;
      dragging.startPositions.forEach((sp) => {
        onUpdateElement(sp.id, {
          x: sp.x + dx,
          y: sp.y + dy,
        });
      });
      return;
    }

    if (lassoPath.length > 0) {
      setLassoPath((prev) => {
        const lastPt = prev[prev.length - 1];
        if (lastPt && Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) < 3) return prev;
        return [...prev, pt];
      });
      return;
    }

    if (marquee) {
      setMarquee((prev) => (prev ? { ...prev, currX: pt.x, currY: pt.y } : null));
    }
  };

  /**
   * Convert the buffered ink strokes into a clean text element.
   * Deletes the raw strokes and inserts one recognised character.
   */
  const flushHandwriting = React.useCallback(() => {
    if (hwTimerRef.current) {
      window.clearTimeout(hwTimerRef.current);
      hwTimerRef.current = null;
    }
    const { strokes, elIds } = hwBufferRef.current;
    hwBufferRef.current = { strokes: [], elIds: [] };
    if (strokes.length === 0) return;

    const result = recognizeStrokes(strokes);
    if (!result) return; // keep the ink as-is

    const b = strokesBounds(strokes);
    const height = Math.max(28, b.height);
    onDeleteElements(elIds);
    onAddElement({
      id: uid(),
      type: "text",
      x: b.x,
      y: b.y,
      w: Math.max(36, b.width),
      h: height,
      label: result.text,
      color: strokeColor,
      fill: "transparent",
      strokeWidth: 1,
      strokeStyle: "solid",
      opacity: 1,
      fontFamily: "hand",
      fontSize: Math.max(26, Math.min(96, height * 0.95)),
      bold: true,
      textColor: strokeColor,
      textAlign: "center",
    });
    showToast(`✍️ Recognised "${result.text}"`);
  }, [onAddElement, onDeleteElements, showToast, strokeColor]);

  // Flush pending handwriting when the tool changes or mode turns off.
  useEffect(() => {
    const wantsText = recognitionMode === "handwriting" || recognitionMode === "auto";
    if (!wantsText || tool !== "draw") {
      if (hwBufferRef.current.strokes.length > 0) flushHandwriting();
    }
    // reference legacy flags so they stay part of the API without warnings
    void shapeRecognition;
    void handwritingRecognition;
  }, [tool, recognitionMode, shapeRecognition, handwritingRecognition, flushHandwriting]);

  /** Point-in-polygon test for lasso selection. */
  const pointInPolygon = (pt: Point, poly: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect =
        yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // ─── Canvas Mouse Up ─────────────────────────────────────────────────────
  const handleSvgUp = () => {
    if (laserActive) {
      setLaserActive(false);
      return;
    }
    if (panning) {
      setPanning(null);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      if (drawPts.length > 2) {
        const avgPressure =
          drawPts.reduce((sum, p) => sum + (p.pressure ?? 0.55), 0) / drawPts.length;
        const brush = getBrushConfig(brushStyle, tool === "highlighter", avgPressure);
        const xs = drawPts.map((p) => p.x);
        const ys = drawPts.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        const baseEl: WbElement = {
          id: uid(),
          type: tool === "highlighter" ? "highlighter" : "draw",
          x: minX,
          y: minY,
          w: Math.max(20, maxX - minX),
          h: Math.max(20, maxY - minY),
          label: "",
          color: strokeColor,
          fill: "transparent",
          strokeWidth: Number(brush.width.toFixed(2)),
          strokeStyle: "solid",
          opacity: Number(brush.opacity.toFixed(3)),
          brushStyle: tool === "highlighter" ? "marker" : brushStyle,
          points: drawPts.map((p) => ({ x: p.x - minX, y: p.y - minY })),
        };

        const rawPts = drawPts.map((p) => ({ x: p.x, y: p.y }));
        let newEl: WbElement = baseEl;
        let handledByHandwriting = false;

        // Single, predictable recognition pipeline. Only ONE mode runs so
        // shapes and letters never fight each other.
        const canRecognize = tool !== "highlighter" && brushStyle === "pen" && drawPts.length >= 6;
        const wantShapes = recognitionMode === "shapes" || recognitionMode === "auto";
        const wantText = recognitionMode === "handwriting" || recognitionMode === "auto";

        // 1) Shapes first (auto & shapes modes) — a clear geometric stroke wins.
        let recognizedShapeEl: WbElement | null = null;
        if (canRecognize && wantShapes) {
          const recognized = recognizeShape(rawPts, strokeColor, brush.width);
          if (recognized) {
            recognizedShapeEl = toElement(recognized, {
              ...baseEl,
              type: recognized.kind,
              points: recognized.kind === "line" ? recognized.points : undefined,
              brushStyle: undefined,
            });
          }
        }

        if (recognizedShapeEl) {
          newEl = recognizedShapeEl;
        } else if (canRecognize && wantText) {
          // 2) Handwriting — buffer multi-stroke letters, recognise the group.
          const buf = hwBufferRef.current;
          if (buf.strokes.length > 0) {
            const b = strokesBounds(buf.strokes);
            const gapX = Math.max(0, Math.max(b.x - maxX, minX - (b.x + b.width)));
            const gapY = Math.max(0, Math.max(b.y - maxY, minY - (b.y + b.height)));
            if (gapX > 90 || gapY > 90) flushHandwriting();
          }
          hwBufferRef.current.strokes.push(rawPts);
          hwBufferRef.current.elIds.push(baseEl.id);
          onAddElement(baseEl); // show the ink immediately
          if (hwTimerRef.current) window.clearTimeout(hwTimerRef.current);
          hwTimerRef.current = window.setTimeout(flushHandwriting, 900);
          handledByHandwriting = true;
        }

        if (!handledByHandwriting) onAddElement(newEl);
      }
      setDrawPts([]);
      lastDrawSampleRef.current = null;
      return;
    }

    if (resizing) {
      setResizing(null);
      onInteractionCommit();
      return;
    }

    if (groupResize) {
      setGroupResize(null);
      onInteractionCommit();
      return;
    }

    if (rotating) {
      setRotating(null);
      onInteractionCommit();
      return;
    }

    if (dragging) {
      setDragging(null);
      onInteractionCommit();
      return;
    }

    if (lassoPath.length > 2) {
      // An element is selected when its centre OR any corner is inside the
      // lasso — much more forgiving than centre-only hit testing.
      const hits = els
        .filter((el) => {
          if (el.locked) return false;
          const probes: Point[] = [
            { x: el.x + el.w / 2, y: el.y + el.h / 2 },
            { x: el.x, y: el.y },
            { x: el.x + el.w, y: el.y },
            { x: el.x, y: el.y + el.h },
            { x: el.x + el.w, y: el.y + el.h },
            { x: el.x + el.w / 2, y: el.y },
            { x: el.x + el.w / 2, y: el.y + el.h },
            { x: el.x, y: el.y + el.h / 2 },
            { x: el.x + el.w, y: el.y + el.h / 2 },
          ];
          return probes.some((p) => pointInPolygon(p, lassoPath));
        })
        .map((el) => el.id);
      if (hits.length > 0) {
        onSelectIds(hits);
        showToast(`🎯 Lasso selected ${hits.length} item${hits.length === 1 ? "" : "s"}.`);
      } else {
        showToast("Lasso found nothing — draw fully around the items.");
      }
      setLassoPath([]);
      return;
    }
    if (lassoPath.length > 0) {
      setLassoPath([]);
      return;
    }

    if (marquee) {
      const x1 = Math.min(marquee.startX, marquee.currX);
      const y1 = Math.min(marquee.startY, marquee.currY);
      const w = Math.abs(marquee.currX - marquee.startX);
      const h = Math.abs(marquee.currY - marquee.startY);

      if (w > 10 && h > 10) {
        const box = { x: x1, y: y1, w, h };
        const found = els
          .filter((el) => isBoxOverlapping(box, { x: el.x, y: el.y, w: el.w, h: el.h }))
          .map((el) => el.id);
        onSelectIds(found);
      }
      setMarquee(null);
      return;
    }
  };

  // ─── Element Interactions ────────────────────────────────────────────────
  const handleElMouseDown = (el: WbElement, e: React.MouseEvent) => {
    e.stopPropagation();

    if (el.locked) {
      showToast("🔒 Item is locked. Unlock from properties panel.");
      return;
    }

    // Erase mode
    if (tool === "erase") {
      onDeleteElements([el.id]);
      return;
    }

    // Connect mode
    if (tool === "connect") {
      if (!connFrom) {
        setConnFrom({ id: el.id, anchor: "center" });
        showToast("Now click target node to connect →");
        return;
      }
      if (connFrom.id === el.id) {
        setConnFrom(null);
        return;
      }
      const fromEl = els.find((item) => item.id === connFrom.id);
      const anchors = fromEl
        ? findBestAnchor(fromEl, el)
        : { fromAnchor: connFrom.anchor, toAnchor: "center" as AnchorPos };
      const newConn: WbConn = {
        id: uid(),
        fromId: connFrom.id,
        toId: el.id,
        fromAnchor: anchors.fromAnchor,
        toAnchor: anchors.toAnchor,
        type: activeConnectorType,
        color: strokeColor,
        strokeWidth: 2,
        strokeStyle: "solid",
        arrowEnd: true,
      };
      onAddConnection(newConn);
      setConnFrom(null);
      showToast("✅ Connection created!");
      return;
    }

    const groupedIds = el.groupId
      ? els.filter((item) => item.groupId === el.groupId).map((item) => item.id)
      : [el.id];

    // Multi-select with Shift
    if (e.shiftKey) {
      if (groupedIds.every((id) => selectedIds.includes(id))) {
        onSelectIds(selectedIds.filter((id) => !groupedIds.includes(id)));
      } else {
        onSelectIds(Array.from(new Set([...selectedIds, ...groupedIds])));
      }
      return;
    }

    if (!groupedIds.every((id) => selectedIds.includes(id))) {
      onSelectIds(groupedIds);
    }

    const pt = getSvgPt(e.clientX, e.clientY);
    const targetIds = selectedIds.includes(el.id) ? selectedIds : groupedIds;

    // BUG FIX: exclude locked items from multi-drag so locks are respected.
    const movableIds = targetIds.filter((id) => {
      const item = els.find((x) => x.id === id);
      return item && !item.locked;
    });
    if (movableIds.length === 0) {
      showToast("🔒 Selected items are locked.");
      return;
    }

    const startPositions = movableIds
      .map((id) => {
        const item = els.find((x) => x.id === id);
        return item ? { id, x: item.x, y: item.y } : null;
      })
      .filter(Boolean) as { id: string; x: number; y: number }[];

    setDragging({
      ids: movableIds,
      ox: pt.x,
      oy: pt.y,
      startPositions,
    });
  };

  const handleElDoubleClick = (el: WbElement, e: React.MouseEvent) => {
    e.stopPropagation();
    onStartInlineEdit(el);
  };

  // ─── Render Shape Path / Geometry ─────────────────────────────────────────
  const renderShapeBody = (el: WbElement, isSel: boolean) => {
    const sw = isSel ? Math.max(el.strokeWidth, 3) : el.strokeWidth;
    const sc = isSel ? "#fff" : el.color;

    // Sticky Note
    if (el.type === "sticky") {
      return (
        <g>
          {/* Shadow */}
          <rect
            x="4"
            y="6"
            width={el.w}
            height={el.h}
            rx="4"
            fill="rgba(0,0,0,0.3)"
          />
          <rect
            width={el.w}
            height={el.h}
            rx="4"
            fill={el.fill || "#fef08a"}
            stroke={sc}
            strokeWidth={sw}
          />
          {/* Pin Icon Header */}
          <g transform={`translate(${el.w / 2 - 8}, 4)`}>
            <circle cx="8" cy="8" r="6" fill="#ef4444" opacity="0.8" />
            <circle cx="6.5" cy="6.5" r="2" fill="#ffffff" opacity="0.6" />
          </g>
        </g>
      );
    }

    // Frame / Container
    if (el.type === "frame") {
      return (
        <g>
          <rect
            width={el.w}
            height={el.h}
            rx="16"
            fill={el.fill || "rgba(15,23,42,0.4)"}
            stroke={sc}
            strokeWidth={sw}
            strokeDasharray="8 6"
          />
          <rect
            x="0"
            y="0"
            width={el.w}
            height="36"
            rx="16"
            fill="rgba(255,255,255,0.06)"
          />
        </g>
      );
    }

    if (el.type === "video") {
      return (
        <g>
          <rect width={el.w} height={el.h} rx="14" fill="#020617" stroke={sc} strokeWidth={sw} />
          <rect width={el.w} height="26" rx="14" fill="rgba(255,255,255,0.06)" />
          <circle cx="14" cy="13" r="4" fill="#f87171" />
          <circle cx="28" cy="13" r="4" fill="#facc15" />
          <circle cx="42" cy="13" r="4" fill="#4ade80" />
        </g>
      );
    }

    if (el.type === "image") {
      return (
        <g>
          <rect x="4" y="6" width={el.w} height={el.h} rx="12" fill="rgba(0,0,0,0.35)" />
          <image
            href={el.imageSrc}
            width={el.w}
            height={el.h}
            preserveAspectRatio="xMidYMid meet"
          />
          <rect
            width={el.w}
            height={el.h}
            rx="10"
            fill="none"
            stroke={sc}
            strokeWidth={sw}
          />
        </g>
      );
    }

    // Circle / Ellipse
    if (el.type === "circle") {
      return (
        <ellipse
          cx={el.w / 2}
          cy={el.h / 2}
          rx={el.w / 2}
          ry={el.h / 2}
          fill={el.fill || "transparent"}
          stroke={sc}
          strokeWidth={sw}
          strokeDasharray={
            el.strokeStyle === "dashed"
              ? "6 4"
              : el.strokeStyle === "dotted"
              ? "2 4"
              : undefined
          }
        />
      );
    }

    // Diamond
    if (el.type === "diamond") {
      const d = `M ${el.w / 2},0 L ${el.w},${el.h / 2} L ${el.w / 2},${
        el.h
      } L 0,${el.h / 2} Z`;
      return (
        <path
          d={d}
          fill={el.fill || "transparent"}
          stroke={sc}
          strokeWidth={sw}
          strokeLinejoin="round"
          strokeDasharray={
            el.strokeStyle === "dashed"
              ? "6 4"
              : el.strokeStyle === "dotted"
              ? "2 4"
              : undefined
          }
        />
      );
    }

    // Triangle
    if (el.type === "triangle") {
      const d = `M ${el.w / 2},0 L ${el.w},${el.h} L 0,${el.h} Z`;
      return (
        <path
          d={d}
          fill={el.fill || "transparent"}
          stroke={sc}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    }

    // Hexagon
    if (el.type === "hexagon") {
      const inset = el.w * 0.18;
      const d = `M ${inset},0 L ${el.w - inset},0 L ${el.w},${
        el.h / 2
      } L ${el.w - inset},${el.h} L ${inset},${el.h} L 0,${el.h / 2} Z`;
      return (
        <path
          d={d}
          fill={el.fill || "transparent"}
          stroke={sc}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    }

    // Cloud Shape
    if (el.type === "cloud") {
      const d = `M 24,${el.h * 0.7} 
                 C 5,${el.h * 0.7} 5,${el.h * 0.3} 30,${el.h * 0.3} 
                 C 35,5 75,5 85,${el.h * 0.25} 
                 C 110,5 150,20 145,${el.h * 0.55} 
                 C 160,${el.h * 0.75} 140,${el.h * 0.95} 115,${el.h * 0.88} 
                 L 30,${el.h * 0.88} 
                 C 10,${el.h * 0.95} 10,${el.h * 0.7} 24,${el.h * 0.7} Z`;
      return (
        <path
          d={d}
          fill={el.fill || "transparent"}
          stroke={sc}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    }

    // Star Shape
    if (el.type === "star") {
      const cx = el.w / 2;
      const cy = el.h / 2;
      const outerR = Math.min(el.w, el.h) / 2;
      const innerR = outerR * 0.45;
      let pts = "";
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        const x = cx + r * Math.cos(ang);
        const y = cy + r * Math.sin(ang);
        pts += `${x},${y} `;
      }
      return (
        <polygon
          points={pts}
          fill={el.fill || "transparent"}
          stroke={sc}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    }

    if (el.type === "line" || el.type === "arrow") {
      const markerId = `arr-${el.color.replace("#", "")}`;
      // Render true polyline geometry when points exist (Excalidraw import)
      const hasPts = Array.isArray(el.points) && el.points.length > 1;
      const d = hasPts
        ? `M ${el.points!.map((p) => `${p.x} ${p.y}`).join(" L ")}`
        : `M 0 0 L ${el.w} ${el.h}`;
      return (
        <g>
          <path
            d={d}
            stroke="transparent"
            strokeWidth={Math.max(16, sw + 10)}
            fill="none"
          />
          <path
            d={d}
            stroke={sc}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={el.strokeStyle === "dashed" ? "6 4" : el.strokeStyle === "dotted" ? "2 4" : undefined}
            markerEnd={el.type === "arrow" ? `url(#${markerId})` : undefined}
          />
        </g>
      );
    }

    // Text Standalone
    if (el.type === "text") {
      return (
        <rect
          width={el.w}
          height={el.h}
          rx="6"
          fill="transparent"
          stroke={isSel ? "rgba(255,255,255,0.4)" : "transparent"}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      );
    }

    // Mind-map pill (screenshot style) with gradient fill and glow.
    if (el.type === "mind-map") {
      const gradId = `mmgrad-${el.id}`;
      const shadowId = `mmshadow-${el.id}`;
      return (
        <g>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={el.color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={el.color} stopOpacity="0.15" />
            </linearGradient>
            <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feFlood floodColor={el.color} floodOpacity="0.35" />
              <feComposite in2="offsetblur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect
            width={el.w}
            height={el.h}
            rx={el.h / 2}
            fill={`url(#${gradId})`}
            stroke={sc}
            strokeWidth={sw}
            filter={`url(#${shadowId})`}
          />
        </g>
      );
    }

    // Capsule (rounded pill) shape for flowchart start/end.
    if (el.type === "capsule") {
      return (
        <rect
          width={el.w}
          height={el.h}
          rx={el.h / 2}
          fill={el.fill || "transparent"}
          stroke={sc}
          strokeWidth={sw}
          strokeDasharray={
            el.strokeStyle === "dashed" ? "6 4" : el.strokeStyle === "dotted" ? "2 4" : undefined
          }
        />
      );
    }

    // Parallelogram for flowchart input / output.
    if (el.type === "parallelogram") {
      const skew = 24;
      const d = `M ${skew} 0 L ${el.w} 0 L ${el.w - skew} ${el.h} L 0 ${el.h} Z`;
      return (
        <path
          d={d}
          fill={el.fill || "transparent"}
          stroke={sc}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    }

    // Default: Rectangle or Rounded Rect
    return (
      <rect
        width={el.w}
        height={el.h}
        rx={el.type === "rounded-rect" ? 14 : 4}
        fill={el.fill || "transparent"}
        stroke={sc}
        strokeWidth={sw}
        strokeDasharray={
          el.strokeStyle === "dashed"
            ? "6 4"
            : el.strokeStyle === "dotted"
            ? "2 4"
            : undefined
        }
      />
    );
  };

  return (
    <div
      className="flex-1 relative overflow-hidden select-none"
      onWheel={handleWheel}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: "none",
        cursor:
          tool === "pan"
            ? panning
              ? "grabbing"
              : "grab"
            : tool === "draw" || tool === "highlighter" || tool === "lasso"
            ? "crosshair"
            : tool === "erase"
            ? "not-allowed"
            : "default",
      }}
    >
      {/* Empty State Banner when canvas is clean */}
      {els.length === 0 && !isDrawing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none text-center px-4">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-4xl shadow-xl">
            🧠
          </div>
          <h3 className="text-base font-bold text-slate-300">
            Whiteboard Canvas is Ready
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Select any shape tool from the left palette to start drawing, or
            click <b className="text-cyan-400">Templates & AI</b> in the top
            bar for instant diagrams.
          </p>
        </div>
      )}

      {/* SVG Background Grid */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.35 }}
      >
        <defs>
          {/* Dot Grid */}
          <pattern
            id="grid-dots"
            width={24 * zoom}
            height={24 * zoom}
            x={pan.x % (24 * zoom)}
            y={pan.y % (24 * zoom)}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={12 * zoom} cy={12 * zoom} r="1" fill="#64748b" />
          </pattern>

          {/* Squares / Graph Paper */}
          <pattern
            id="grid-squares"
            width={32 * zoom}
            height={32 * zoom}
            x={pan.x % (32 * zoom)}
            y={pan.y % (32 * zoom)}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${32 * zoom} 0 L 0 0 0 ${32 * zoom}`}
              fill="none"
              stroke="#334155"
              strokeWidth="1"
            />
          </pattern>

          {/* Blueprint Grid */}
          <pattern
            id="grid-blueprint"
            width={40 * zoom}
            height={40 * zoom}
            x={pan.x % (40 * zoom)}
            y={pan.y % (40 * zoom)}
            patternUnits="userSpaceOnUse"
          >
            <rect width="100%" height="100%" fill="#0f172a" />
            <path
              d={`M ${40 * zoom} 0 L 0 0 0 ${40 * zoom}`}
              fill="none"
              stroke="#1e3a8a"
              strokeWidth="1.5"
            />
          </pattern>
        </defs>

        <rect
          id="grid-rect"
          width="100%"
          height="100%"
          fill={
            gridType === "squares"
              ? "url(#grid-squares)"
              : gridType === "blueprint"
              ? "url(#grid-blueprint)"
              : gridType === "blank"
              ? "transparent"
              : "url(#grid-dots)"
          }
          className="pointer-events-auto"
        />
      </svg>

      {/* Main Interactive SVG Workspace */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        onMouseDown={handleSvgDown}
        onMouseMove={handleSvgMove}
        onMouseUp={handleSvgUp}
        onMouseLeave={handleSvgUp}
      >
        <defs>
          <marker
            id="arrow-default"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="3.5"
            orient="auto-start-reverse"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,7 L9,3.5 z" fill="#94a3b8" />
          </marker>
          {STROKE_COLORS.map((col) => (
            <marker
              key={col}
              id={`arr-${col.replace("#", "")}`}
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3.5"
              orient="auto-start-reverse"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,7 L9,3.5 z" fill={col} />
            </marker>
          ))}
          <filter id="laser-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g data-world-root="true" transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* ── Connectors & Lines ─────────────────────────────────────── */}
          {conns.map((conn) => {
            const fromEl = els.find((e) => e.id === conn.fromId);
            const toEl = els.find((e) => e.id === conn.toId);
            if (!fromEl || !toEl) return null;

            const col = conn.color || "#94a3b8";
            const mId = `arr-${col.replace("#", "")}`;
            const pathD = buildConnPath(fromEl, toEl, conn);
            const midPt = getConnMidPoint(fromEl, toEl, conn);
            const fromPt = getAnchorPoint(fromEl, conn.fromAnchor || "center");
            const toPt = getAnchorPoint(toEl, conn.toAnchor || "center");
            const isSelected = selectedConnId === conn.id;

            return (
              <g
                key={conn.id}
                data-conn-from={conn.fromId}
                data-conn-to={conn.toId}
                className="group"
                onMouseDown={(event) => {
                  event.stopPropagation();
                  onSelectIds([]);
                  onSelectConnection(conn.id);
                }}
              >
                <path
                  d={pathD}
                  stroke="transparent"
                  strokeWidth="16"
                  fill="none"
                  className="cursor-pointer"
                />
                <path
                  d={pathD}
                  stroke={isSelected ? "#ffffff" : col}
                  strokeWidth={isSelected ? (conn.strokeWidth || 2) + 2 : conn.strokeWidth || 2}
                  fill="none"
                  strokeOpacity="0.85"
                  strokeDasharray={
                    conn.strokeStyle === "dashed"
                      ? "6 4"
                      : conn.strokeStyle === "dotted"
                      ? "2 4"
                      : undefined
                  }
                  markerEnd={conn.arrowEnd === false ? undefined : `url(#${mId})`}
                  markerStart={conn.arrowStart ? `url(#${mId})` : undefined}
                  className="pointer-events-none transition-all group-hover:stroke-white"
                  style={
                    glowConnectors
                      ? { filter: `drop-shadow(0 0 6px ${col}) drop-shadow(0 0 12px ${col}80)` }
                      : undefined
                  }
                />
                {/* Animated energy particles flowing along the connection */}
                {connectorParticles && (
                  <g className="pointer-events-none">
                    {[0, 1, 2].map((i) => (
                      <circle key={i} r={i === 0 ? 3.6 : 2.4} fill={col} opacity={i === 0 ? 0.95 : 0.55}>
                        <animateMotion
                          dur={`${Math.max(1.2, 7 - particleSpeed)}s`}
                          begin={`${i * (Math.max(1.2, 7 - particleSpeed) / 3)}s`}
                          repeatCount="indefinite"
                          path={pathD}
                          rotate="auto"
                        />
                        <animate
                          attributeName="opacity"
                          values="0;1;1;0"
                          dur={`${Math.max(1.2, 7 - particleSpeed)}s`}
                          begin={`${i * (Math.max(1.2, 7 - particleSpeed) / 3)}s`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    ))}
                    {/* Soft glow trail */}
                    <circle r="7" fill={col} opacity="0.18">
                      <animateMotion
                        dur={`${Math.max(1.2, 7 - particleSpeed)}s`}
                        repeatCount="indefinite"
                        path={pathD}
                      />
                    </circle>
                  </g>
                )}

                {/* Coloured dots at connector endpoints (screenshot style) */}
                <circle cx={fromPt.x} cy={fromPt.y} r="3.5" fill={col} className="pointer-events-none" />
                <circle cx={toPt.x} cy={toPt.y} r="3.5" fill={col} className="pointer-events-none" />
                {isSelected && (
                  <circle cx={midPt.x} cy={midPt.y} r="5" fill="#38bdf8" stroke="#fff" strokeWidth="2" />
                )}
                {/* Connector Text Label */}
                {conn.label && (
                  <foreignObject
                    x={midPt.x - 60}
                    y={midPt.y - 14}
                    width="120"
                    height="28"
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="bg-slate-900 border border-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg truncate max-w-[110px]">
                        {conn.label}
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Live Connector Arrow Preview while linking */}
          {connFrom && connHoverPt && (() => {
            const fromEl = els.find((e) => e.id === connFrom.id);
            if (!fromEl) return null;
            return (
              <line
                x1={fromEl.x + fromEl.w / 2}
                y1={fromEl.y + fromEl.h / 2}
                x2={connHoverPt.x}
                y2={connHoverPt.y}
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                markerEnd="url(#arr-38bdf8)"
                className="pointer-events-none animate-pulse"
              />
            );
          })()}

          {/* Live Freehand Draw Preview */}
          {isDrawing && drawPts.length > 1 && (() => {
            const lastPressure = drawPts[drawPts.length - 1]?.pressure ?? 0.55;
            const brush = getBrushConfig(brushStyle, tool === "highlighter", lastPressure);
            return (
              <path
                d={`M ${drawPts.map((p) => `${p.x} ${p.y}`).join(" L ")}`}
                stroke={strokeColor}
                strokeWidth={brush.width}
                strokeOpacity={brush.opacity}
                strokeDasharray={brush.dash}
                fill="none"
                strokeLinecap={brush.lineCap}
                strokeLinejoin="round"
              />
            );
          })()}

          {/* ── Elements & Shapes ─────────────────────────────────────── */}
          {els.map((el) => {
            const isSel = selectedIds.includes(el.id);
            const isHov = hoverId === el.id;
            const isFromConn = connFrom?.id === el.id;

            // Freehand / Highlighter path element
            if (
              (el.type === "draw" || el.type === "highlighter") &&
              el.points
            ) {
              const d = `M ${el.points
                .map((p) => `${p.x} ${p.y}`)
                .join(" L ")}`;
              return (
                <g
                  key={el.id}
                  data-el-id={el.id}
                  transform={`translate(${el.x}, ${el.y})`}
                  onMouseDown={(e) => handleElMouseDown(el, e)}
                  style={{ cursor: "pointer", opacity: el.opacity || 1 }}
                >
                  <path
                    d={d}
                    stroke={isSel ? "#fff" : el.color}
                    strokeWidth={isSel ? (el.strokeWidth || 3) + 1 : el.strokeWidth}
                    strokeDasharray={el.brushStyle === "pencil" ? "1 5" : undefined}
                    strokeOpacity={el.opacity || 1}
                    fill="none"
                    strokeLinecap={el.brushStyle === "technical" ? "square" : "round"}
                    strokeLinejoin="round"
                  />
                  {isSel && (
                    <rect
                      x="-6"
                      y="-6"
                      width={el.w + 12}
                      height={el.h + 12}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  )}
                </g>
              );
            }

            // Standard Vector Shape / Sticky / Stamp / Frame / Text
            return (
              <g
                key={el.id}
                data-el-id={el.id}
                transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0} ${el.w / 2} ${el.h / 2})`}
                onMouseDown={(e) => handleElMouseDown(el, e)}
                onDoubleClick={(e) => handleElDoubleClick(el, e)}
                onMouseEnter={() => setHoverId(el.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  cursor: el.locked
                    ? "not-allowed"
                    : tool === "erase"
                    ? "not-allowed"
                    : "move",
                  opacity: el.opacity || 1,
                }}
              >
                {/* Highlight Glow for selected / connection target */}
                {(isSel || isHov || isFromConn) && (
                  <rect
                    x="-6"
                    y="-6"
                    width={el.w + 12}
                    height={el.h + 12}
                    rx="12"
                    fill="none"
                    stroke={
                      isFromConn ? "#22d3ee" : isSel ? "#38bdf8" : "#94a3b8"
                    }
                    strokeWidth={isSel ? "2.5" : "1.5"}
                    strokeDasharray={isHov && !isSel ? "4 3" : undefined}
                    className={isFromConn ? "animate-pulse" : undefined}
                  />
                )}

                {/* Shape Body SVG */}
                {renderShapeBody(el, isSel)}

                {/* Embedded video / media player.
                    While unselected a transparent shield keeps the element
                    draggable; once selected the real player becomes interactive. */}
                {el.type === "video" && el.imageSrc && (
                  <foreignObject x="0" y="22" width={el.w} height={el.h - 22}>
                    <div style={{ width: "100%", height: "100%", position: "relative" }}>
                      {el.imageSrc.includes("youtube") ||
                      el.imageSrc.includes("youtu.be") ||
                      el.imageSrc.includes("vimeo") ? (
                        <iframe
                          src={el.imageSrc}
                          style={{
                            width: "100%",
                            height: "100%",
                            border: 0,
                            borderRadius: "0 0 14px 14px",
                            pointerEvents: isSel ? "auto" : "none",
                          }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          referrerPolicy="strict-origin-when-cross-origin"
                          title={el.label}
                        />
                      ) : el.imageSrc.endsWith(".gif") || el.imageSrc.includes("giphy.com") ? (
                        <img
                          src={el.imageSrc}
                          alt={el.label}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            borderRadius: "0 0 14px 14px",
                            background: "#000",
                            pointerEvents: "none",
                          }}
                        />
                      ) : (
                        <video
                          src={el.imageSrc}
                          controls={isSel}
                          playsInline
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "0 0 14px 14px",
                            background: "#000",
                            objectFit: "contain",
                            pointerEvents: isSel ? "auto" : "none",
                          }}
                        />
                      )}
                      {!isSel && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(2,6,23,0.35)",
                            borderRadius: "0 0 14px 14px",
                            cursor: "move",
                          }}
                        >
                          <span
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              background: "rgba(16,185,129,0.9)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#022c22",
                              fontSize: 18,
                              boxShadow: "0 4px 20px rgba(16,185,129,0.5)",
                            }}
                          >
                            ▶
                          </span>
                        </div>
                      )}
                    </div>
                  </foreignObject>
                )}
                {el.type === "video" && !el.imageSrc && (
                  <foreignObject x="0" y="22" width={el.w} height={el.h - 22}>
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        color: "#94a3b8",
                        background: "#020617",
                        borderRadius: "0 0 14px 14px",
                        textAlign: "center",
                        padding: 16,
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      <span style={{ fontSize: 30 }}>🎬</span>
                      <strong style={{ fontSize: 12, color: "#6ee7b7" }}>
                        Local video needs to be selected again
                      </strong>
                      <span style={{ fontSize: 10 }}>
                        Browsers do not retain permission to disk files after restart.
                      </span>
                    </div>
                  </foreignObject>
                )}

                {/* Frame Title header */}
                {el.type === "frame" && el.frameTitle && (
                  <foreignObject x="16" y="8" width={el.w - 32} height="24">
                    <div className="w-full h-full flex items-center">
                      <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                        {el.label || el.frameTitle}
                      </span>
                    </div>
                  </foreignObject>
                )}

                {/* Stamp / Emoji — render large icon */}
                {el.type === "stamp" && (
                  <foreignObject x="0" y="0" width={el.w} height={el.h}>
                    <div className="w-full h-full flex items-center justify-center select-none">
                      <span style={{ fontSize: `${Math.max(36, Math.min(el.w, el.h) * 0.75)}px`, lineHeight: 1 }}>
                        {el.stampIcon || el.label || "🚀"}
                      </span>
                    </div>
                  </foreignObject>
                )}

                {/* Text Label via foreignObject */}
                {el.type !== "frame" && el.type !== "image" && el.type !== "video" && el.type !== "line" && el.type !== "arrow" && el.type !== "stamp" && (
                  <foreignObject
                    x={el.type === "sticky" ? "12" : el.type === "parallelogram" ? "24" : "6"}
                    y={el.type === "sticky" ? "28" : "6"}
                    width={el.type === "sticky" ? el.w - 24 : el.type === "parallelogram" ? el.w - 48 : el.w - 12}
                    height={el.type === "sticky" ? el.h - 36 : el.h - 12}
                  >
                    <div
                      className={`w-full h-full flex select-none overflow-hidden ${
                        // Notes/text read top-aligned; shapes stay centred
                        el.type === "sticky" || el.type === "text"
                          ? "items-start"
                          : "items-center"
                      } ${
                        el.textAlign === "left"
                          ? "justify-start text-left"
                          : el.textAlign === "right"
                          ? "justify-end text-right"
                          : "justify-center text-center"
                      }`}
                    >
                      <p
                        className={`break-words leading-snug w-full ${
                          el.type === "sticky"
                            ? "text-slate-900 font-hand text-base"
                            : "text-white"
                        }`}
                        style={{
                          color: el.type === "sticky" ? (el.textColor || "#0f172a") : (el.textColor || "#ffffff"),
                          textAlign: el.textAlign || "center",
                          // Preserve authored line breaks + indentation
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          fontSize: `${el.fontSize || 14}px`,
                          fontWeight: el.bold ? "700" : "500",
                          fontStyle: el.italic ? "italic" : "normal",
                          textShadow: el.type === "mind-map" ? "0 1px 2px rgba(0,0,0,0.4)" : undefined,
                          fontFamily:
                            el.fontFamily === "hand"
                              ? "'Caveat', cursive, sans-serif"
                              : el.fontFamily === "mono"
                              ? "'JetBrains Mono', monospace"
                              : el.fontFamily === "serif"
                              ? "Georgia, 'Times New Roman', serif"
                              : el.fontFamily === "display"
                              ? "Impact, 'Arial Black', sans-serif"
                              : el.fontFamily === "rounded"
                              ? "'Trebuchet MS', 'Inter', sans-serif"
                              : "'Inter', sans-serif",
                        }}
                      >
                        {el.label}
                      </p>
                    </div>
                  </foreignObject>
                )}

                {/* ── One-Click '+' Node Expansion Handles ── */}
                {(isSel || isHov) && tool !== "erase" && tool !== "connect" && selectedIds.length <= 1 && !el.locked && el.type !== "draw" && el.type !== "highlighter" && el.type !== "line" && el.type !== "arrow" && (
                  <g className="pointer-events-auto">
                    {[
                      { dir: "top" as AnchorPos, cx: el.w / 2 - 12, cy: -26 },
                      { dir: "right" as AnchorPos, cx: el.w + 4, cy: el.h / 2 - 12 },
                      { dir: "bottom" as AnchorPos, cx: el.w / 2 - 12, cy: el.h + 4 },
                      { dir: "left" as AnchorPos, cx: -26, cy: el.h / 2 - 12 },
                    ].map((handle) => (
                      <g
                        key={handle.dir}
                        transform={`translate(${handle.cx}, ${handle.cy})`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onQuickSpawnChild(el.id, handle.dir);
                        }}
                        className="cursor-pointer group"
                      >
                        <title>Add branch node ({handle.dir})</title>
                        <circle
                          cx="12"
                          cy="12"
                          r="11"
                          fill="rgba(15, 23, 42, 0.75)"
                          stroke={el.color}
                          strokeWidth="2.5"
                          className="transition-all group-hover:fill-white"
                        />
                        <path
                          d="M12 7v10 M7 12h10"
                          stroke={el.color}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className="group-hover:stroke-slate-900"
                        />
                      </g>
                    ))}
                  </g>
                )}

                {/* Resize and rotation controls — now for ALL element types */}
                {isSel && selectedIds.length === 1 && !el.locked && (
                  <g className="pointer-events-auto">
                    <line
                      x1={el.w / 2}
                      y1="-7"
                      x2={el.w / 2}
                      y2="-38"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={el.w / 2}
                      cy="-42"
                      r="7"
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      className="cursor-grab"
                      onMouseDown={(event) => {
                        event.stopPropagation();
                        const point = getSvgPt(event.clientX, event.clientY);
                        const center = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
                        setRotating({
                          id: el.id,
                          center,
                          startAngle: Math.atan2(point.y - center.y, point.x - center.x) * (180 / Math.PI),
                          startRotation: el.rotation || 0,
                        });
                      }}
                    />
                    <rect
                      x={el.w - 7}
                      y={el.h - 7}
                      width="14"
                      height="14"
                      rx="3"
                      fill="#38bdf8"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-nwse-resize"
                      onMouseDown={(event) => {
                        event.stopPropagation();
                        const point = getSvgPt(event.clientX, event.clientY);
                        setResizing({
                          id: el.id,
                          startW: el.w,
                          startH: el.h,
                          startX: point.x,
                          startY: point.y,
                          startPoints: el.points ? el.points.map((p) => ({ ...p })) : undefined,
                          startFontSize:
                            el.type === "text" || el.type === "mind-map" ? el.fontSize : undefined,
                        });
                      }}
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* Multi-select bounding box with a group resize handle */}
          {selectedIds.length > 1 && (() => {
            const sel = els.filter((el) => selectedIds.includes(el.id));
            if (sel.length < 2) return null;
            const bx = Math.min(...sel.map((e) => e.x));
            const by = Math.min(...sel.map((e) => e.y));
            const bw = Math.max(...sel.map((e) => e.x + e.w)) - bx;
            const bh = Math.max(...sel.map((e) => e.y + e.h)) - by;
            return (
              <g className="pointer-events-none">
                <rect
                  x={bx - 8}
                  y={by - 8}
                  width={bw + 16}
                  height={bh + 16}
                  rx="10"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="7 5"
                  opacity="0.85"
                />
                {/* Corner scale handle */}
                <rect
                  x={bx + bw + 1}
                  y={by + bh + 1}
                  width="15"
                  height="15"
                  rx="4"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="pointer-events-auto cursor-nwse-resize"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    const start = getSvgPt(event.clientX, event.clientY);
                    setGroupResize({
                      originX: bx,
                      originY: by,
                      startW: Math.max(1, bw),
                      startH: Math.max(1, bh),
                      startPt: start,
                      snapshot: sel.map((el) => ({
                        id: el.id,
                        x: el.x,
                        y: el.y,
                        w: el.w,
                        h: el.h,
                        fontSize: el.fontSize,
                      })),
                    });
                  }}
                />
                <foreignObject x={bx - 8} y={by - 34} width="220" height="24">
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-[9px] font-bold text-slate-950">
                      {sel.length} selected · drag ◲ to scale
                    </span>
                  </div>
                </foreignObject>
              </g>
            );
          })()}

          {/* Lasso selection path with better visual feedback */}
          {lassoPath.length > 1 && (() => {
            const d = `M ${lassoPath.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ")} Z`;
            return (
              <g className="pointer-events-none">
                {/* Fill with gradient */}
                <defs>
                  <linearGradient id="lasso-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0.15" />
                  </linearGradient>
                </defs>
                <path
                  d={d}
                  fill="url(#lasso-gradient)"
                  stroke="#a855f7"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeDasharray="8 4"
                />
                {/* Animated dots along the path */}
                <circle r="4" fill="#a855f7" opacity="0.9">
                  <animateMotion dur="1.5s" repeatCount="indefinite" path={d} />
                </circle>
                <circle r="3" fill="#ec4899" opacity="0.7">
                  <animateMotion dur="1.5s" begin="0.5s" repeatCount="indefinite" path={d} />
                </circle>
              </g>
            );
          })()}

          {/* Marquee Selection Box */}
          {marquee && (
            <rect
              x={Math.min(marquee.startX, marquee.currX)}
              y={Math.min(marquee.startY, marquee.currY)}
              width={Math.abs(marquee.currX - marquee.startX)}
              height={Math.abs(marquee.currY - marquee.startY)}
              fill="rgba(56, 189, 248, 0.15)"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              className="pointer-events-none"
            />
          )}

          {laserPts.length > 0 && (
            <g className="pointer-events-none" filter="url(#laser-glow)">
              {laserPts.length > 1 && (
                <path
                  d={`M ${laserPts.map((point) => `${point.x} ${point.y}`).join(" L ")}`}
                  fill="none"
                  stroke="#fb7185"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                />
              )}
              <circle
                cx={laserPts[laserPts.length - 1].x}
                cy={laserPts[laserPts.length - 1].y}
                r="7"
                fill="#fff"
                stroke="#fb7185"
                strokeWidth="4"
              />
            </g>
          )}

          {/* Simulated Collaborator Cursors */}
          {showCollaborators && (
            <g data-export-ignore="true">
              {/* Alex Cursor */}
              <g
                transform={`translate(${simCursors.alex.x}, ${simCursors.alex.y})`}
                className="transition-all duration-1000 ease-out pointer-events-none"
              >
                <path
                  d="M0 0 L12 18 L7 18 L10 24 L7 25 L4 19 L0 23 Z"
                  fill="#4ade80"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
                <rect
                  x="12"
                  y="16"
                  width="54"
                  height="18"
                  rx="4"
                  fill="#4ade80"
                />
                <text
                  x="16"
                  y="28"
                  fill="#0f172a"
                  fontSize="9"
                  fontWeight="bold"
                >
                  Alex (Dev)
                </text>
              </g>
              {/* Sarah Cursor */}
              <g
                transform={`translate(${simCursors.sarah.x}, ${simCursors.sarah.y})`}
                className="transition-all duration-1000 ease-out pointer-events-none"
              >
                <path
                  d="M0 0 L12 18 L7 18 L10 24 L7 25 L4 19 L0 23 Z"
                  fill="#f472b6"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
                <rect
                  x="12"
                  y="16"
                  width="68"
                  height="18"
                  rx="4"
                  fill="#f472b6"
                />
                <text
                  x="16"
                  y="28"
                  fill="#0f172a"
                  fontSize="9"
                  fontWeight="bold"
                >
                  Sarah (Design)
                </text>
              </g>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

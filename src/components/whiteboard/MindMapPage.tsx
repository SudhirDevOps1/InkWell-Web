import { useState, useEffect, useCallback, useRef } from "react";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  Trash2,
  Copy,
  Group,
  Ungroup,
  Presentation,
  X,
} from "lucide-react";
import {
  WbElement,
  WbConn,
  WbBoard,
  ConnectorType,
  AnchorPos,
  GridType,
  StrokeStyleType,
  BrushStyleType,
} from "../../types/whiteboard";
import {
  STROKE_COLORS,
  FILL_COLORS,
  getBoundingBox,
  getBranchStyle,
  layoutRadial,
  layoutHierarchical,
  layoutHorizontal,
  generateTemplateData,
  uid,
} from "../../utils/whiteboardUtils";
import { WhiteboardToolbar } from "./WhiteboardToolbar";
import { WhiteboardPropertiesPanel } from "./WhiteboardPropertiesPanel";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { WhiteboardMiniMap } from "./WhiteboardMiniMap";
import { TemplateGeneratorModal } from "./TemplateGeneratorModal";
import { ExportShareModal } from "./ExportShareModal";
import { ShortcutsHelpModal } from "./ShortcutsHelpModal";
import { ConnectorPropertiesPanel } from "./ConnectorPropertiesPanel";
import { DrawingStudioBar } from "./DrawingStudioBar";
import { useDraggable } from "../../hooks/useDraggable";
import { GripVertical, Wifi, WifiOff } from "lucide-react";
import {
  SettingsModal,
  DEFAULT_SETTINGS,
  InkwellSettings,
} from "./SettingsModal";
import { GifEmojiPicker } from "./GifEmojiPicker";
import { LibraryPanel, LibraryItem } from "./LibraryPanel";
import { formatRichText, hasRichFormatting } from "../../utils/richTextFormatter";
import { TextEditorModal } from "./TextEditorModal";
import { AISetupModal, AIConfig, DEFAULT_AI_CONFIG } from "./AISetupModal";
import { GenerateModal } from "./GenerateModal";
import { normalizeMediaUrl, compressImageFile } from "../../utils/mediaHelpers";
import type { GifResult } from "../../utils/mediaHelpers";

const STORAGE_KEY = "flowtrack_whiteboards_v3";
const OLD_STORAGE_KEY = "flowtrack_mindmap_v2";
const SETTINGS_KEY = "inkwell_settings_v1";

function loadSettings(): InkwellSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function normalizeElement(el: WbElement): WbElement {
  const expiredLocalVideo =
    el.type === "video" && typeof el.imageSrc === "string" && el.imageSrc.startsWith("blob:");
  return {
    ...el,
    strokeWidth: el.strokeWidth ?? 2,
    strokeStyle: el.strokeStyle ?? "solid",
    opacity: el.opacity ?? 1,
    fontFamily: el.fontFamily ?? (el.type === "sticky" ? "hand" : "sans"),
    fontSize: el.fontSize ?? (el.type === "sticky" ? 16 : 14),
    textColor: el.textColor ?? (el.type === "sticky" ? "#0f172a" : "#ffffff"),
    rotation: el.rotation ?? 0,
    brushStyle: el.brushStyle ?? "pen",
    imageSrc: expiredLocalVideo ? undefined : el.imageSrc,
    label: expiredLocalVideo ? `${el.label || "Local video"} — choose file again` : el.label,
  };
}

function normalizeConnection(conn: WbConn): WbConn {
  return {
    ...conn,
    fromAnchor: conn.fromAnchor ?? "center",
    toAnchor: conn.toAnchor ?? "center",
    type: conn.type ?? "curved",
    strokeWidth: conn.strokeWidth ?? 2,
    strokeStyle: conn.strokeStyle ?? "solid",
    arrowEnd: conn.arrowEnd ?? true,
  };
}

function loadInitialBoards(): WbBoard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const boards = parsed.map((board: WbBoard) => ({
          ...board,
          els: (board.els || []).map(normalizeElement),
          conns: (board.conns || []).map(normalizeConnection),
          gridType: board.gridType || "dots",
          zoom: board.zoom || 1,
          pan: board.pan || { x: 0, y: 0 },
        }));
        // If every board is empty, seed the first one with the hero mind-map
        // so brand-new users always see something beautiful.
        if (boards.every((b: WbBoard) => (b.els?.length || 0) === 0)) {
          const seed = generateTemplateData("central-idea");
          boards[0] = { ...boards[0], title: "Central Idea Mind Map", ...seed };
        }
        return boards;
      }
    }

    // Migrate old storage if exists
    const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldRaw) {
      const oldParsed = JSON.parse(oldRaw);
      if (oldParsed.els) {
        return [
          {
            id: "default-board-1",
            title: "My Mind Map",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            els: (oldParsed.els || []).map(normalizeElement),
            conns: (oldParsed.conns || []).map(normalizeConnection),
            gridType: "dots",
            zoom: 1,
            pan: { x: 0, y: 0 },
          },
        ];
      }
    }
  } catch {
    // ignore
  }

  // Preload with the hero Central Idea mind map (matches screenshot).
  const { els, conns } = generateTemplateData("central-idea");
  return [
    {
      id: "default-board-1",
      title: "Central Idea Mind Map",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      els,
      conns,
      gridType: "dots",
      zoom: 1,
      pan: { x: 0, y: 0 },
    },
  ];
}

function saveBoardsToStorage(boards: WbBoard[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  } catch (err: any) {
    if (err?.name === "QuotaExceededError" || err?.code === 22) {
      console.warn("Storage quota exceeded, pruning heavy media payloads for fallback save");
      try {
        // Fallback: strip heavy Base64 image/video data strings if storage quota is hit
        const pruned = boards.map((b) => ({
          ...b,
          els: b.els.map((el) => {
            if (el.imageSrc && el.imageSrc.length > 100000) {
              return { ...el, imageSrc: undefined, label: `${el.label || "Media"} (Pruned due to storage quota)` };
            }
            return el;
          }),
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
      } catch {
        /* best effort */
      }
    }
  }
}

export function MindMapPage() {
  const [boards, setBoards] = useState<WbBoard[]>(loadInitialBoards);
  const [activeBoardId, setActiveBoardId] = useState<string>(() => {
    return boards[0]?.id || "default-board-1";
  });

  const activeBoard =
    boards.find((b) => b.id === activeBoardId) || boards[0];
  const [settings, setSettings] = useState<InkwellSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gifEmojiOpen, setGifEmojiOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [aiSetupOpen, setAiSetupOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    try {
      const raw = localStorage.getItem("inkwell_ai_config_v1");
      return raw ? { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) } : DEFAULT_AI_CONFIG;
    } catch {
      return DEFAULT_AI_CONFIG;
    }
  });
  const [libraries, setLibraries] = useState<LibraryItem[]>(() => {
    try {
      const raw = localStorage.getItem("inkwell_libraries_v1");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // ── Undo / Redo History ──────────────────────────────────────────────────
  const [history, setHistory] = useState<
    { els: WbElement[]; conns: WbConn[] }[]
  >([{ els: activeBoard.els, conns: activeBoard.conns }]);
  const [histIdx, setHistIdx] = useState(0);

  // Sync history when switching boards (also clear stale connector selection)
  useEffect(() => {
    setHistory([{ els: activeBoard.els, conns: activeBoard.conns }]);
    setHistIdx(0);
    setSelectedIds([]);
    setSelectedConnId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBoardId]);

  // Save to localStorage whenever boards change
  useEffect(() => {
    if (settings.autosave) saveBoardsToStorage(boards);
  }, [boards, settings.autosave]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // best effort
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem("inkwell_libraries_v1", JSON.stringify(libraries));
    } catch {
      /* ignore */
    }
  }, [libraries]);

  // ── Tool & Styles State ───────────────────────────────────────────────────
  const [tool, setTool] = useState<any>("select");
  const [activeConnectorType, setActiveConnectorType] =
    useState<ConnectorType>("curved");
  const [selectedStamp, setSelectedStamp] = useState<string>("💡");

  const [strokeColor, setStrokeColor] = useState<string>(STROKE_COLORS[0]);
  const [fillColor, setFillColor] = useState<string>(FILL_COLORS[1]);
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyleType>("solid");
  const [brushStyle, setBrushStyle] = useState<BrushStyleType>("pen");
  const [brushOpacity, setBrushOpacity] = useState<number>(1);
  const [pressureEnabled, setPressureEnabled] = useState(true);
  const [stabilizer, setStabilizer] = useState(3);

  // ── Selection State ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);

  // ── Modals & Popups State ────────────────────────────────────────────────
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const showCollaborators = false;
  const [presentationMode, setPresentationMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // Draggable panel positions — move the properties panel & minimap anywhere
  const panelDrag = useDraggable({ w: 260, h: 480 });
  const minimapDrag = useDraggable({ w: 200, h: 160 });
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // Online / offline awareness — Inkwell works offline after first load
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    tone?: "danger" | "info";
  } | null>(null);

  // Inline edit state
  const [editElId, setEditElId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const editInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const clipboardRef = useRef<{ els: WbElement[]; conns: WbConn[] } | null>(null);

  // ── Toast Helper ─────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  // ── Push State to Board and History ──────────────────────────────────────
  const pushChange = useCallback(
    (newEls: WbElement[], newConns: WbConn[]) => {
      setBoards((prev) =>
        prev.map((b) =>
          b.id === activeBoardId
            ? { ...b, els: newEls, conns: newConns, updatedAt: Date.now() }
            : b
        )
      );

      setHistory((h) => {
        const next = h.slice(0, histIdx + 1);
        next.push({ els: newEls, conns: newConns });
        if (next.length > 50) next.shift();
        setHistIdx(next.length - 1);
        return next;
      });
    },
    [activeBoardId, histIdx]
  );

  const handleUndo = useCallback(() => {
    if (histIdx <= 0) return;
    const prev = history[histIdx - 1];
    setBoards((prevBoards) =>
      prevBoards.map((b) =>
        b.id === activeBoardId
          ? { ...b, els: prev.els, conns: prev.conns }
          : b
      )
    );
    setHistIdx(histIdx - 1);
    setSelectedIds([]);
  }, [activeBoardId, histIdx, history]);

  const handleRedo = useCallback(() => {
    if (histIdx >= history.length - 1) return;
    const next = history[histIdx + 1];
    setBoards((prevBoards) =>
      prevBoards.map((b) =>
        b.id === activeBoardId
          ? { ...b, els: next.els, conns: next.conns }
          : b
      )
    );
    setHistIdx(histIdx + 1);
    setSelectedIds([]);
  }, [activeBoardId, histIdx, history]);

  // ── Board Operations ─────────────────────────────────────────────────────
  const handleCreateBoard = () => {
    const pageNo = boards.length + 1;
    const newBoard: WbBoard = {
      id: uid(),
      title: `Page ${pageNo}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      els: [],
      conns: [],
      gridType: activeBoard.gridType || "dots",
      zoom: 1,
      pan: { x: 0, y: 0 },
    };
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    showToast(`✨ Page ${pageNo} created. Double-click tab to rename.`);
  };

  const handleDuplicateBoard = () => {
    const clone: WbBoard = {
      ...JSON.parse(JSON.stringify(activeBoard)),
      id: uid(),
      title: `${activeBoard.title} copy`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    // Fresh IDs so history/selection stay clean
    const idMap = new Map<string, string>();
    clone.els = clone.els.map((el) => {
      const nid = uid();
      idMap.set(el.id, nid);
      return { ...el, id: nid };
    });
    clone.conns = clone.conns
      .filter((c) => idMap.has(c.fromId) && idMap.has(c.toId))
      .map((c) => ({
        ...c,
        id: uid(),
        fromId: idMap.get(c.fromId)!,
        toId: idMap.get(c.toId)!,
      }));
    setBoards((prev) => [...prev, clone]);
    setActiveBoardId(clone.id);
    showToast("📄 Page duplicated with all content.");
  };

  const handleDeleteBoard = (id: string) => {
    if (boards.length <= 1) {
      showToast("⚠️ Cannot delete the only remaining board.");
      return;
    }
    const filtered = boards.filter((b) => b.id !== id);
    setBoards(filtered);
    if (activeBoardId === id) {
      setActiveBoardId(filtered[0].id);
    }
    showToast("🗑️ Board removed.");
  };

  // ── Canvas Zoom & Pan Helpers ───────────────────────────────────────────
  const handleZoomChange = (delta: number) => {
    setBoards((prev) =>
      prev.map((b) =>
        b.id === activeBoardId
          ? {
              ...b,
              zoom: Math.min(Math.max(b.zoom + delta, 0.2), 4),
            }
          : b
      )
    );
  };

  const handleZoomToFit = (
    targetBoardId = activeBoardId,
    targetEls: WbElement[] = activeBoard.els,
    silent = false
  ) => {
    const box = getBoundingBox(targetEls);
    if (box.maxX - box.minX === 0) {
      // Reset default
      setBoards((prev) =>
        prev.map((b) =>
          b.id === targetBoardId
            ? { ...b, zoom: 1, pan: { x: 0, y: 0 } }
            : b
        )
      );
      return;
    }

    const cw = svgRef.current?.clientWidth || 1200;
    const ch = svgRef.current?.clientHeight || 800;

    const contentW = box.maxX - box.minX + 240;
    const contentH = box.maxY - box.minY + 240;

    const z = Math.min(Math.max(Math.min(cw / contentW, ch / contentH), 0.3), 1.8);
    const centerX = (box.minX + box.maxX) / 2;
    const centerY = (box.minY + box.maxY) / 2;

    const nextPan = {
      x: cw / 2 - centerX * z,
      y: ch / 2 - centerY * z,
    };

    setBoards((prev) =>
      prev.map((b) =>
        b.id === targetBoardId
          ? { ...b, zoom: Number(z.toFixed(2)), pan: nextPan }
          : b
      )
    );
    if (!silent) showToast("🔍 Zoomed to fit all elements!");
  };

  const handleGridToggle = () => {
    const order: GridType[] = ["dots", "squares", "blueprint", "blank"];
    const currIdx = order.indexOf(activeBoard.gridType);
    const nextGrid = order[(currIdx + 1) % order.length];
    setBoards((prev) =>
      prev.map((b) =>
        b.id === activeBoardId ? { ...b, gridType: nextGrid } : b
      )
    );
    showToast(`🔲 Grid changed to ${nextGrid.toUpperCase()}`);
  };

  // ── Elements Modification Helpers ────────────────────────────────────────
  const snap = (n: number) => (settings.snapToGrid ? Math.round(n / 20) * 20 : n);

  const handleAddElement = (el: WbElement) => {
    const next = settings.snapToGrid
      ? { ...el, x: snap(el.x), y: snap(el.y) }
      : el;
    const nextEls = [...activeBoard.els, next];
    pushChange(nextEls, activeBoard.conns);
  };

  const handleAddConnection = (conn: WbConn) => {
    const nextConns = [...activeBoard.conns, conn];
    pushChange(activeBoard.els, nextConns);
  };

  const handleUpdateElements = (patch: Partial<WbElement>) => {
    if (selectedIds.length === 0) return;
    const nextEls = activeBoard.els.map((el) =>
      selectedIds.includes(el.id) ? { ...el, ...patch } : el
    );
    pushChange(nextEls, activeBoard.conns);
  };

  const handleUpdateElementById = (id: string, patch: Partial<WbElement>) => {
    setBoards((prev) =>
      prev.map((board) =>
        board.id === activeBoardId
          ? {
              ...board,
              els: board.els.map((el) => (el.id === id ? { ...el, ...patch } : el)),
              updatedAt: Date.now(),
            }
          : board
      )
    );
  };

  const performDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    // BUG FIX: never delete LOCKED elements — skip them and warn the user.
    const deletableElements = activeBoard.els.filter((el) => selectedIds.includes(el.id) && !el.locked);
    const deletable = new Set(deletableElements.map((el) => el.id));
    const lockedCount = selectedIds.length - deletable.size;
    if (deletable.size === 0) {
      showToast("🔒 All selected items are locked. Unlock them first.");
      setSelectedIds([]);
      return;
    }
    // Clean up local blob object URLs to prevent memory leaks
    deletableElements.forEach((el) => {
      if (el.imageSrc && el.imageSrc.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(el.imageSrc);
        } catch {
          /* ignore */
        }
      }
    });
    const nextEls = activeBoard.els.filter((el) => !deletable.has(el.id));
    const nextConns = activeBoard.conns.filter(
      (c) => !deletable.has(c.fromId) && !deletable.has(c.toId)
    );
    pushChange(nextEls, nextConns);
    setSelectedIds([]);
    showToast(
      lockedCount > 0
        ? `🗑️ Deleted ${deletable.size} items. ${lockedCount} locked item(s) kept safe.`
        : "🗑️ Selected items deleted."
    );
  }, [activeBoard.els, activeBoard.conns, pushChange, selectedIds, showToast]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const deletingWholeBoard = selectedIds.length === activeBoard.els.length && activeBoard.els.length > 1;
    const deletingLargeSet = selectedIds.length >= 6;
    if (deletingWholeBoard || deletingLargeSet) {
      setConfirmDialog({
        title: deletingWholeBoard ? "Delete every selected item?" : "Delete many items?",
        message: `You selected ${selectedIds.length} items. This action can be undone with Ctrl+Z, but it will remove related connectors too.`,
        confirmLabel: "Delete selected",
        tone: "danger",
        onConfirm: performDeleteSelected,
      });
      return;
    }
    performDeleteSelected();
  }, [activeBoard.els.length, performDeleteSelected, selectedIds.length]);

  const handleLayerChange = (
    action: "front" | "back" | "forward" | "backward"
  ) => {
    if (selectedIds.length === 0) return;
    const els = [...activeBoard.els];
    const selected = els.filter((e) => selectedIds.includes(e.id));
    const rest = els.filter((e) => !selectedIds.includes(e.id));

    let nextEls = els;
    if (action === "front") {
      nextEls = [...rest, ...selected];
    } else if (action === "back") {
      nextEls = [...selected, ...rest];
    } else if (action === "forward") {
      // Move up by one
      const index = els.findIndex((e) => selectedIds.includes(e.id));
      if (index < els.length - 1) {
        const temp = els[index];
        els[index] = els[index + 1];
        els[index + 1] = temp;
        nextEls = [...els];
      }
    } else if (action === "backward") {
      // Move down by one
      const index = els.findIndex((e) => selectedIds.includes(e.id));
      if (index > 0) {
        const temp = els[index];
        els[index] = els[index - 1];
        els[index - 1] = temp;
        nextEls = [...els];
      }
    }
    pushChange(nextEls, activeBoard.conns);
  };

  const handleAlignElements = (
    alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom"
  ) => {
    if (selectedIds.length < 2) return;
    const selected = activeBoard.els.filter((el) =>
      selectedIds.includes(el.id)
    );
    const box = getBoundingBox(selected);

    const nextEls = activeBoard.els.map((el) => {
      if (!selectedIds.includes(el.id)) return el;
      if (alignment === "left") return { ...el, x: box.minX };
      if (alignment === "center-h")
        return {
          ...el,
          x: box.minX + (box.maxX - box.minX) / 2 - el.w / 2,
        };
      if (alignment === "right")
        return { ...el, x: box.maxX - el.w };
      if (alignment === "top") return { ...el, y: box.minY };
      if (alignment === "center-v")
        return {
          ...el,
          y: box.minY + (box.maxY - box.minY) / 2 - el.h / 2,
        };
      if (alignment === "bottom")
        return { ...el, y: box.maxY - el.h };
      return el;
    });
    pushChange(nextEls, activeBoard.conns);
    showToast("📏 Elements aligned!");
  };

  const handleDistributeElements = (
    direction: "horizontal" | "vertical"
  ) => {
    if (selectedIds.length < 3) {
      showToast("⚠️ Select at least 3 items to distribute.");
      return;
    }
    const selected = activeBoard.els
      .filter((el) => selectedIds.includes(el.id))
      .sort((a, b) => (direction === "horizontal" ? a.x - b.x : a.y - b.y));

    const min = direction === "horizontal" ? selected[0].x : selected[0].y;
    const maxEl = selected[selected.length - 1];
    const max =
      direction === "horizontal" ? maxEl.x + maxEl.w : maxEl.y + maxEl.h;
    const totalSpan = max - min;
    const totalSizes = selected.reduce(
      (sum, el) => sum + (direction === "horizontal" ? el.w : el.h),
      0
    );
    const gap = (totalSpan - totalSizes) / (selected.length - 1);

    let currPos = min;
    const nextEls = activeBoard.els.map((el) => {
      const idx = selected.findIndex((s) => s.id === el.id);
      if (idx === -1) return el;
      const patch =
        direction === "horizontal"
          ? { x: currPos }
          : { y: currPos };
      currPos += (direction === "horizontal" ? el.w : el.h) + gap;
      return { ...el, ...patch };
    });
    pushChange(nextEls, activeBoard.conns);
    showToast("↔️ Distributed evenly!");
  };

  // ── One-Click '+' Quick Spawn Child Node ────────────────────────────────
  const handleQuickSpawnChild = (fromId: string, direction: AnchorPos) => {
    const parent = activeBoard.els.find((e) => e.id === fromId);
    if (!parent) return;

    const offsetDist = 180;
    let nx = parent.x;
    let ny = parent.y;
    let fromAnchor: AnchorPos = "bottom";
    let toAnchor: AnchorPos = "top";

    if (direction === "top") {
      ny = parent.y - offsetDist;
      fromAnchor = "top";
      toAnchor = "bottom";
    } else if (direction === "right") {
      nx = parent.x + parent.w + offsetDist;
      fromAnchor = "right";
      toAnchor = "left";
    } else if (direction === "bottom") {
      ny = parent.y + parent.h + offsetDist;
      fromAnchor = "bottom";
      toAnchor = "top";
    } else if (direction === "left") {
      nx = parent.x - offsetDist - parent.w;
      fromAnchor = "left";
      toAnchor = "right";
    }

    // Auto-pick a colour for the new branch based on siblings (mind-map style).
    const siblingCount = activeBoard.conns.filter((c) => c.fromId === parent.id).length;
    const branch = getBranchStyle(siblingCount);
    const usingMindMap = parent.type === "mind-map";
    const branchColor = usingMindMap ? branch.color : (parent.color || strokeColor);
    const branchFill = usingMindMap ? branch.fill : parent.fill;

    const newChildId = uid();
    const newChild: WbElement = {
      ...parent,
      id: newChildId,
      x: nx,
      y: ny,
      w: usingMindMap ? 150 : parent.w,
      h: usingMindMap ? 52 : parent.h,
      label: "New Idea",
      color: branchColor,
      fill: branchFill,
      groupId: undefined,
    };

    const newConn: WbConn = {
      id: uid(),
      fromId: parent.id,
      toId: newChildId,
      fromAnchor,
      toAnchor,
      type: usingMindMap ? "curved" : activeConnectorType,
      color: branchColor,
      strokeWidth: 2.5,
      strokeStyle: "solid",
      arrowEnd: !usingMindMap,
    };

    const nextEls = [...activeBoard.els, newChild];
    const nextConns = [...activeBoard.conns, newConn];
    pushChange(nextEls, nextConns);
    setSelectedIds([newChildId]);
    showToast("✨ Spawned connected node!");
  };

  // ── Auto-Layout Organizers ───────────────────────────────────────────────
  const handleApplyLayout = (
    type: "radial" | "hierarchical" | "horizontal"
  ) => {
    let result: { els: WbElement[]; conns: WbConn[] };
    if (type === "radial") {
      result = layoutRadial(activeBoard.els, activeBoard.conns);
    } else if (type === "hierarchical") {
      result = layoutHierarchical(activeBoard.els, activeBoard.conns);
    } else {
      result = layoutHorizontal(activeBoard.els, activeBoard.conns);
    }
    pushChange(result.els, result.conns);
    showToast(`🗂️ Applied ${type.toUpperCase()} auto-layout!`);
    // BUG FIX: zoom to fit the NEW layout positions, not the stale board state.
    setTimeout(() => handleZoomToFit(activeBoardId, result.els, true), 100);
  };

  // ── Clear Canvas (with confirmation to prevent accidental delete-all) ────
  const handleClearCanvas = () => {
    if (activeBoard.els.length === 0) return;
    setConfirmDialog({
      title: "Clear this board?",
      message: `You are about to remove all ${activeBoard.els.length} elements and ${activeBoard.conns.length} connections on "${activeBoard.title}". This can be undone with Ctrl+Z.`,
      confirmLabel: "Yes, clear board",
      tone: "danger",
      onConfirm: () => {
        pushChange([], []);
        setSelectedIds([]);
        setSelectedConnId(null);
        showToast("🧹 Canvas cleared! Press Ctrl+Z to restore.");
      },
    });
  };

  const handleDeleteBoardConfirm = (id: string) => {
    if (boards.length <= 1) {
      showToast("⚠️ At least one board must remain.");
      return;
    }
    const board = boards.find((b) => b.id === id);
    setConfirmDialog({
      title: "Delete this whiteboard?",
      message: `"${board?.title || "Untitled"}" and all its content will be permanently removed.`,
      confirmLabel: "Delete board",
      tone: "danger",
      onConfirm: () => handleDeleteBoard(id),
    });
  };

  const handleInteractionCommit = () => {
    pushChange(activeBoard.els, activeBoard.conns);
  };

  const handleZoomAt = (delta: number, screenPoint: { x: number; y: number }) => {
    setBoards((prev) =>
      prev.map((board) => {
        if (board.id !== activeBoardId) return board;
        const nextZoom = Math.min(Math.max(board.zoom + delta, 0.2), 4);
        const worldX = (screenPoint.x - board.pan.x) / board.zoom;
        const worldY = (screenPoint.y - board.pan.y) / board.zoom;
        return {
          ...board,
          zoom: Number(nextZoom.toFixed(2)),
          pan: {
            x: screenPoint.x - worldX * nextZoom,
            y: screenPoint.y - worldY * nextZoom,
          },
        };
      })
    );
  };

  const handleImageFile = useCallback(
    async (file: File, point?: { x: number; y: number }) => {
      if (!file.type.startsWith("image/")) {
        showToast("⚠️ Please choose a valid image file.");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        showToast("⚠️ Image must be smaller than 15 MB.");
        return;
      }

      try {
        const src = await compressImageFile(file);
        const image = new Image();
        image.onload = () => {
          const maxW = 500;
          const maxH = 360;
          const scale = Math.min(1, maxW / (image.naturalWidth || maxW), maxH / (image.naturalHeight || maxH));
          const w = Math.max(80, (image.naturalWidth || maxW) * scale);
          const h = Math.max(60, (image.naturalHeight || maxH) * scale);
          const canvasW = svgRef.current?.clientWidth || 1000;
          const canvasH = svgRef.current?.clientHeight || 700;
          const center = point || {
            x: (canvasW / 2 - activeBoard.pan.x) / activeBoard.zoom,
            y: (canvasH / 2 - activeBoard.pan.y) / activeBoard.zoom,
          };
          const el: WbElement = {
            id: uid(),
            type: "image",
            x: center.x - w / 2,
            y: center.y - h / 2,
            w,
            h,
            label: file.name,
            imageAlt: file.name,
            imageSrc: src,
            color: "#38bdf8",
            fill: "transparent",
            strokeWidth: 2,
            strokeStyle: "solid",
            opacity: 1,
          };
          pushChange([...activeBoard.els, el], activeBoard.conns);
          setSelectedIds([el.id]);
          setSelectedConnId(null);
          showToast("🖼️ Image added. Resize and rotate it from the canvas handles.");
        };
        image.src = src;
      } catch {
        showToast("⚠️ Failed to load image.");
      }
    },
    [activeBoard, pushChange, showToast]
  );

  // ── Embed video / media / gif element ───────────────────────────────────
  const placeCenteredMedia = useCallback(
    (opts: {
      type: "video" | "image" | "stamp";
      src?: string;
      label: string;
      w: number;
      h: number;
      stampIcon?: string;
      color?: string;
    }) => {
      const cw = svgRef.current?.clientWidth || 1000;
      const ch = svgRef.current?.clientHeight || 700;
      const center = {
        x: (cw / 2 - activeBoard.pan.x) / activeBoard.zoom,
        y: (ch / 2 - activeBoard.pan.y) / activeBoard.zoom,
      };
      const el: WbElement = {
        id: uid(),
        type: opts.type,
        x: center.x - opts.w / 2,
        y: center.y - opts.h / 2,
        w: opts.w,
        h: opts.h,
        label: opts.label,
        imageSrc: opts.src,
        stampIcon: opts.stampIcon,
        color: opts.color || "#10b981",
        fill: opts.type === "stamp" ? "transparent" : "#020617",
        strokeWidth: opts.type === "stamp" ? 0 : 2,
        strokeStyle: "solid",
        opacity: 1,
      };
      pushChange([...activeBoard.els, el], activeBoard.conns);
      setSelectedIds([el.id]);
    },
    [activeBoard, pushChange]
  );

  const handleAddMedia = useCallback(
    (url: string) => {
      const media = normalizeMediaUrl(url);
      if (media.kind === "gif" || media.kind === "image") {
        placeCenteredMedia({
          type: "image",
          src: media.src,
          label: media.kind === "gif" ? "GIF" : "Image",
          w: 280,
          h: 220,
          color: "#ec4899",
        });
        showToast(media.kind === "gif" ? "✨ GIF added to board." : "🖼️ Image added.");
        return;
      }
      placeCenteredMedia({
        type: "video",
        src: media.src,
        label:
          media.kind === "youtube"
            ? "YouTube video"
            : media.kind === "vimeo"
            ? "Vimeo video"
            : "Embedded media",
        w: 480,
        h: 290,
        color: "#10b981",
      });
      showToast("🎬 Media embedded — select it to play, drag to move.");
    },
    [placeCenteredMedia, showToast]
  );

  const handlePickEmoji = useCallback(
    (emoji: string) => {
      placeCenteredMedia({
        type: "stamp",
        label: emoji,
        stampIcon: emoji,
        w: 72,
        h: 72,
        color: "transparent",
      });
      showToast(`${emoji} placed on board.`);
    },
    [placeCenteredMedia, showToast]
  );

  const handlePickGif = useCallback(
    (gif: GifResult) => {
      const maxW = 280;
      const scale = Math.min(1, maxW / Math.max(1, gif.width));
      placeCenteredMedia({
        type: "image",
        src: gif.url,
        label: gif.title || "GIF",
        w: Math.max(120, Math.round(gif.width * scale)),
        h: Math.max(90, Math.round(gif.height * scale)),
        color: "#ec4899",
      });
      showToast("✨ Free GIF added — drag / resize freely.");
    },
    [placeCenteredMedia, showToast]
  );

  const handleLibraryPick = useCallback(
    (item: LibraryItem) => {
      const cw = svgRef.current?.clientWidth || 1000;
      const ch = svgRef.current?.clientHeight || 700;
      const allX = item.elements.map((e) => e.x);
      const allY = item.elements.map((e) => e.y);
      const allW = item.elements.map((e) => e.x + e.w);
      const allH = item.elements.map((e) => e.y + e.h);
      const minX = Math.min(...allX);
      const minY = Math.min(...allY);
      const maxX = Math.max(...allW);
      const maxY = Math.max(...allH);
      const groupW = maxX - minX;
      const groupH = maxY - minY;
      const targetCx = (cw / 2 - activeBoard.pan.x) / activeBoard.zoom;
      const targetCy = (ch / 2 - activeBoard.pan.y) / activeBoard.zoom;
      const offsetX = targetCx - minX - groupW / 2;
      const offsetY = targetCy - minY - groupH / 2;
      const placedGroupId = uid();
      const newEls = item.elements.map((el) => ({
        ...el,
        id: uid(),
        x: el.x + offsetX,
        y: el.y + offsetY,
        groupId: placedGroupId,
      }));
      pushChange([...activeBoard.els, ...newEls], activeBoard.conns);
      setSelectedIds(newEls.map((e) => e.id));
      showToast(`📌 "${item.title}" placed on canvas.`);
    },
    [activeBoard, pushChange, showToast]
  );

  const handleLibraryImport = useCallback((items: LibraryItem[]) => {
    setLibraries((prev) => [...prev, ...items]);
  }, []);

  const handleLibraryRemove = useCallback((id: string) => {
    setLibraries((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // Browser security does not allow arbitrary disk paths. The file picker
  // creates a private blob URL that plays locally/offline for this session.
  const handleAddLocalVideo = useCallback(
    (file: File) => {
      if (!file.type.startsWith("video/")) {
        showToast("⚠️ Choose a valid video file (MP4, WebM, OGG…).");
        return;
      }
      const url = URL.createObjectURL(file);
      const cw = svgRef.current?.clientWidth || 1000;
      const ch = svgRef.current?.clientHeight || 700;
      const center = {
        x: (cw / 2 - activeBoard.pan.x) / activeBoard.zoom,
        y: (ch / 2 - activeBoard.pan.y) / activeBoard.zoom,
      };
      const el: WbElement = {
        id: uid(),
        type: "video",
        x: center.x - 240,
        y: center.y - 145,
        w: 480,
        h: 290,
        label: file.name,
        imageSrc: url,
        color: "#10b981",
        fill: "#020617",
        strokeWidth: 2,
        strokeStyle: "solid",
        opacity: 1,
      };
      pushChange([...activeBoard.els, el], activeBoard.conns);
      setSelectedIds([el.id]);
      showToast(
        "🎬 Local video added. It plays offline in this session; export the .flowtrack file without the video binary."
      );
    },
    [activeBoard, pushChange, showToast]
  );

  const handleCopySelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    const copiedEls = activeBoard.els.filter((el) => selectedIds.includes(el.id));
    const copiedSet = new Set(copiedEls.map((el) => el.id));
    const copiedConns = activeBoard.conns.filter(
      (conn) => copiedSet.has(conn.fromId) && copiedSet.has(conn.toId)
    );
    clipboardRef.current = { els: copiedEls, conns: copiedConns };
    showToast(`📋 Copied ${copiedEls.length} item${copiedEls.length === 1 ? "" : "s"}.`);
  }, [activeBoard, selectedIds, showToast]);

  const handlePasteSelection = useCallback(() => {
    const copied = clipboardRef.current;
    if (!copied || copied.els.length === 0) return;
    const idMap = new Map<string, string>();
    const groupMap = new Map<string, string>();
    copied.els.forEach((el) => idMap.set(el.id, uid()));
    const pastedEls = copied.els.map((el) => {
      if (el.groupId && !groupMap.has(el.groupId)) groupMap.set(el.groupId, uid());
      return {
        ...el,
        id: idMap.get(el.id)!,
        x: el.x + 36,
        y: el.y + 36,
        groupId: el.groupId ? groupMap.get(el.groupId) : undefined,
      };
    });
    const pastedConns = copied.conns.map((conn) => ({
      ...conn,
      id: uid(),
      fromId: idMap.get(conn.fromId)!,
      toId: idMap.get(conn.toId)!,
    }));
    pushChange(
      [...activeBoard.els, ...pastedEls],
      [...activeBoard.conns, ...pastedConns]
    );
    setSelectedIds(pastedEls.map((el) => el.id));
    setSelectedConnId(null);
    clipboardRef.current = { els: pastedEls, conns: pastedConns };
    showToast(`📌 Pasted ${pastedEls.length} item${pastedEls.length === 1 ? "" : "s"}.`);
  }, [activeBoard, pushChange, showToast]);

  const handleDuplicateSelection = useCallback(() => {
    handleCopySelection();
    window.setTimeout(handlePasteSelection, 0);
  }, [handleCopySelection, handlePasteSelection]);

  const handleGroupSelection = useCallback(() => {
    if (selectedIds.length < 2) {
      showToast("⚠️ Select at least two items to create a group.");
      return;
    }
    const groupId = uid();
    const nextEls = activeBoard.els.map((el) =>
      selectedIds.includes(el.id) ? { ...el, groupId } : el
    );
    pushChange(nextEls, activeBoard.conns);
    showToast(`🔗 Grouped ${selectedIds.length} items.`);
  }, [activeBoard, pushChange, selectedIds, showToast]);

  const handleUngroupSelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    const nextEls = activeBoard.els.map((el) =>
      selectedIds.includes(el.id) ? { ...el, groupId: undefined } : el
    );
    pushChange(nextEls, activeBoard.conns);
    showToast("🔓 Selection ungrouped.");
  }, [activeBoard, pushChange, selectedIds, showToast]);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      showToast("⚠️ Fullscreen is not available in this browser.");
    }
  };

  const handleUpdateConnection = (patch: Partial<WbConn>) => {
    if (!selectedConnId) return;
    const nextConns = activeBoard.conns.map((conn) =>
      conn.id === selectedConnId ? { ...conn, ...patch } : conn
    );
    pushChange(activeBoard.els, nextConns);
  };

  const handleDeleteConnection = () => {
    if (!selectedConnId) return;
    pushChange(
      activeBoard.els,
      activeBoard.conns.filter((conn) => conn.id !== selectedConnId)
    );
    setSelectedConnId(null);
    showToast("🗑️ Connector deleted.");
  };

  // ── Inline Label Edit ────────────────────────────────────────────────────
  const handleStartInlineEdit = (el: WbElement) => {
    setEditElId(el.id);
    // Keep list glyphs visible while editing so the toolbar state stays in sync
    setEditText(el.label || "");
    setTimeout(() => editInputRef.current?.focus(), 30);
  };

  /** Grow an element so all of its text stays visible. */
  const fitElementToText = (el: WbElement, text: string): Partial<WbElement> => {
    if (el.type !== "sticky" && el.type !== "text") return {};
    const lines = text.split("\n");
    const fontSize = el.fontSize || (el.type === "sticky" ? 16 : 14);
    const charW = fontSize * 0.58;
    const padX = el.type === "sticky" ? 28 : 16;
    const padY = el.type === "sticky" ? 44 : 18;
    const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);

    const naturalW = Math.min(520, Math.max(el.w, longest * charW + padX));
    // Wrap long lines when the width is capped
    const usableChars = Math.max(8, Math.floor((naturalW - padX) / charW));
    const wrappedCount = lines.reduce(
      (sum, l) => sum + Math.max(1, Math.ceil(l.length / usableChars)),
      0
    );
    const naturalH = Math.max(el.h, wrappedCount * (fontSize * 1.45) + padY);
    return { w: Math.round(naturalW), h: Math.round(naturalH) };
  };

  const handleCommitInlineEdit = () => {
    if (!editElId) return;
    const el = activeBoard.els.find((e) => e.id === editElId);
    if (!el) return;

    // Normalise markdown-ish typing into clean display text (idempotent)
    let finalText = editText;
    if (el.type === "sticky" || el.type === "text" || el.type === "mind-map") {
      if (hasRichFormatting(editText)) finalText = formatRichText(editText);
    }

    const sizing = fitElementToText(el, finalText);

    const nextEls = activeBoard.els.map((e) =>
      e.id === editElId ? { ...e, label: finalText, ...sizing } : e
    );
    pushChange(nextEls, activeBoard.conns);
    setEditElId(null);
  };

  useEffect(() => {
    const handlePasteImage = (event: ClipboardEvent) => {
      const imageItem = Array.from(event.clipboardData?.items || []).find((item) =>
        item.type.startsWith("image/")
      );
      const file = imageItem?.getAsFile();
      if (file) {
        event.preventDefault();
        handleImageFile(file);
      }
    };
    window.addEventListener("paste", handlePasteImage);
    return () => window.removeEventListener("paste", handlePasteImage);
  }, [handleImageFile]);

  // ── Keyboard Shortcuts Listener ──────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        editElId ||
        isTemplatesOpen ||
        isExportOpen ||
        isShortcutsOpen ||
        (e.target as Element)?.tagName === "INPUT" ||
        (e.target as Element)?.tagName === "TEXTAREA"
      ) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopySelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (clipboardRef.current) {
          e.preventDefault();
          handlePasteSelection();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicateSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedIds(activeBoard.els.map((el) => el.id));
        setSelectedConnId(null);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) handleUngroupSelection();
        else handleGroupSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        handleZoomChange(0.1);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        handleZoomChange(-0.1);
        return;
      }

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedConnId) handleDeleteConnection();
        else handleDeleteSelected();
        return;
      }

      // Layer Shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "]") {
        e.preventDefault();
        handleLayerChange("front");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "[") {
        e.preventDefault();
        handleLayerChange("back");
        return;
      }

      // ── Excalidraw-compatible number hotkeys ─────────────────────────
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const numberMap: Record<string, string> = {
          "1": "select",
          "2": "rect",
          "3": "diamond",
          "4": "circle",
          "5": "arrow",
          "6": "line",
          "7": "draw",
          "8": "text",
          "9": "image",
          "0": "erase",
        };
        if (numberMap[e.key]) {
          if (e.key === "9") {
            document.getElementById("whiteboard-image-input")?.click();
          } else {
            setTool(numberMap[e.key]);
          }
          return;
        }
      }

      // Shift+L → lasso, Shift+X → shape recognition toggle
      if (e.shiftKey && (e.key === "L" || e.key === "l")) {
        e.preventDefault();
        setTool("lasso");
        return;
      }
      if (e.shiftKey && (e.key === "X" || e.key === "x")) {
        e.preventDefault();
        setSettings((s) => {
          const next = { ...s, shapeRecognition: !s.shapeRecognition };
          showToast(next.shapeRecognition ? "✨ Draw-to-shape ON" : "✍️ Draw-to-shape OFF");
          return next;
        });
        return;
      }

      // Alt+Z zen mode, Alt+S snap, Ctrl+' grid
      if (e.altKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        setFocusMode((v) => !v);
        return;
      }
      if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        setSettings((s) => {
          const next = { ...s, snapToGrid: !s.snapToGrid };
          showToast(next.snapToGrid ? "📐 Snap to grid ON" : "📐 Snap OFF");
          return next;
        });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "'") {
        e.preventDefault();
        handleGridToggle();
        return;
      }
      // Shift+1 zoom to fit, Ctrl+0 reset zoom
      if (e.shiftKey && e.key === "!") {
        e.preventDefault();
        handleZoomToFit();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        setBoards((prev) => prev.map((b) => (b.id === activeBoardId ? { ...b, zoom: 1 } : b)));
        return;
      }

      // Tool Hotkeys
      if (e.key === "v" || e.key === "V") setTool("select");
      if (e.key === "h" || e.key === "H") setTool("pan");
      if (e.key === "a" || e.key === "A") setTool("arrow");
      if (e.key === "o" || e.key === "O") setTool("circle");
      if (e.key === "r" || e.key === "R") setTool("rounded-rect");
      if (e.key === "c" || e.key === "C") setTool("circle");
      if (e.key === "s" || e.key === "S") setTool("sticky");
      if (e.key === "t" || e.key === "T") setTool("text");
      if (e.key === "l" || e.key === "L") setTool("connect");
      if (e.key === "d" || e.key === "D") setTool("draw");
      if ((e.key === "p" || e.key === "P") && !e.shiftKey) {
        setBrushStyle("pen");
        setTool("draw");
      }
      if (e.key === "b" || e.key === "B") {
        setBrushStyle("brush");
        setTool("draw");
      }
      if (e.key === "[") setStrokeWidth((w) => Math.max(1, w - 1));
      if (e.key === "]") setStrokeWidth((w) => Math.min(40, w + 1));
      if (e.key === "m" || e.key === "M") setTool("highlighter");
      if ((e.key === "z" || e.key === "Z") && !e.ctrlKey && !e.metaKey) {
        setFocusMode((value) => !value);
      }
      if (e.key === "e" || e.key === "E") setGifEmojiOpen(true);
      if (e.key === "f" || e.key === "F") setTool("frame");
      if (e.key === "x" || e.key === "X") setTool("erase");
      if (e.key === "k" || e.key === "K") setTool("laser");
      if (e.key === "i" || e.key === "I") {
        document.getElementById("whiteboard-image-input")?.click();
      }

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        setIsShortcutsOpen(true);
      }
      if (e.key === "F11") {
        e.preventDefault();
        handleToggleFullscreen();
      }
      if (e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPresentationMode((value) => !value);
      }

      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault();
        const step = settings.snapToGrid ? 20 : 1;
        const amount = e.shiftKey ? step * 5 : step;
        const dx = e.key === "ArrowLeft" ? -amount : e.key === "ArrowRight" ? amount : 0;
        const dy = e.key === "ArrowUp" ? -amount : e.key === "ArrowDown" ? amount : 0;
        const nextEls = activeBoard.els.map((el) =>
          selectedIds.includes(el.id)
            ? {
                ...el,
                x: settings.snapToGrid ? Math.round((el.x + dx) / 20) * 20 : el.x + dx,
                y: settings.snapToGrid ? Math.round((el.y + dy) / 20) * 20 : el.y + dy,
              }
            : el
        );
        pushChange(nextEls, activeBoard.conns);
      }

      // Escape -> Close dialogs first, then deselect
      if (e.key === "Escape") {
        if (confirmDialog) {
          setConfirmDialog(null);
          return;
        }
        setSelectedIds([]);
        setSelectedConnId(null);
        setTool("select");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    editElId,
    confirmDialog,
    handleDeleteSelected,
    handleCopySelection,
    handlePasteSelection,
    handleDuplicateSelection,
    handleGroupSelection,
    handleUngroupSelection,
    handleRedo,
    handleUndo,
    isExportOpen,
    isShortcutsOpen,
    isTemplatesOpen,
    activeBoard,
    selectedConnId,
    selectedIds,
    pushChange,
  ]);

  const selectedEls = activeBoard.els.filter((el) =>
    selectedIds.includes(el.id)
  );
  const selectedConn = activeBoard.conns.find((conn) => conn.id === selectedConnId);

  return (
    <div
      className={`flex flex-col h-full w-full overflow-hidden select-none relative font-sans no-scroll-x ${settings.highContrast ? "contrast-125" : ""} ${settings.reducedMotion ? "[&_*]:!animate-none [&_*]:!transition-none" : ""}`}
      style={{ background: settings.canvasBg }}
    >
      {/* ── Toast Banner ────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border border-white/10 text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span>{toast}</span>
        </div>
      )}

      {!presentationMode && !focusMode && !settings.showHeader && (
        <button
          onClick={() => setSettingsOpen(true)}
          className="fixed right-3 top-3 z-40 rounded-2xl border border-white/10 bg-slate-900/90 px-3 py-2 text-[11px] font-bold text-cyan-300 shadow-xl backdrop-blur-md hover:bg-slate-800"
          title="Open Inkwell settings"
        >
          Settings
        </button>
      )}

      {/* ── Rich Text Editor Modal (bullets / numbers / checklist) ─────── */}
      <TextEditorModal
        open={!!editElId}
        elementType={activeBoard.els.find((x) => x.id === editElId)?.type || "text"}
        value={editText}
        onChange={setEditText}
        onSave={handleCommitInlineEdit}
        onCancel={() => setEditElId(null)}
      />

      {/* ── Top Bar & Left Floating Tools ──────────────────────────────── */}
      {!presentationMode && !focusMode ? (
        <WhiteboardToolbar
          tool={tool}
          setTool={setTool}
          activeConnectorType={activeConnectorType}
          setActiveConnectorType={setActiveConnectorType}
          selectedStamp={selectedStamp}
          setSelectedStamp={setSelectedStamp}
          brushStyle={brushStyle}
          setBrushStyle={setBrushStyle}
          strokeColor={strokeColor}
          setStrokeColor={setStrokeColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          boards={boards}
          activeBoardId={activeBoardId}
          onSelectBoard={(id) => setActiveBoardId(id)}
          onRenameBoard={(id, title) => {
            setBoards((prev) => prev.map((board) => board.id === id ? { ...board, title, updatedAt: Date.now() } : board));
            showToast("✏️ Board renamed.");
          }}
          onCreateBoard={handleCreateBoard}
          onDuplicateBoard={handleDuplicateBoard}
          onDeleteBoard={handleDeleteBoardConfirm}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenExport={() => {
            setSelectedIds([]);
            setSelectedConnId(null);
            window.setTimeout(() => setIsExportOpen(true), 0);
          }}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onImageUpload={(file) => handleImageFile(file)}
          onToggleFullscreen={handleToggleFullscreen}
          onTogglePresentation={() => setPresentationMode(true)}
          presentationMode={presentationMode}
          onApplyLayout={handleApplyLayout}
          onClearCanvas={handleClearCanvas}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode((value) => !value)}
          onAddMedia={handleAddMedia}
          onAddLocalVideo={handleAddLocalVideo}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenGifEmoji={() => setGifEmojiOpen(true)}
          onOpenLibrary={() => setLibraryOpen(true)}
          onOpenGenerate={() => setGenerateOpen(true)}
          onOpenAISetup={() => setAiSetupOpen(true)}
          showHeader={settings.showHeader}
          showToolRail={settings.showToolbar}
          showBoardTabs={settings.showBoardTabs}
          compactUI={settings.compactUI}
        />
      ) : focusMode && !presentationMode ? (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full border border-fuchsia-400/30 bg-slate-900/90 px-4 py-2 shadow-2xl backdrop-blur-md animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-400" />
          </span>
          <span className="font-display text-xs font-semibold text-white">Focus mode</span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">Z to exit · canvas only</span>
          <button
            onClick={() => setFocusMode(false)}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Exit focus mode (Z)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-slate-900/90 px-4 py-2 shadow-2xl backdrop-blur-md animate-fade-in">
          <Presentation className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white">Presentation mode</span>
          <span className="text-[10px] text-slate-400">Shift+P to exit</span>
          <button
            onClick={() => setPresentationMode(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            title="Exit presentation mode"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Work Area (Canvas + Right Properties Panel) ────────────── */}
      <div className="flex-1 flex min-h-0 relative inkwell-ambient">
        {!presentationMode && !focusMode && settings.showDrawingStudio && settings.keepDrawingBarOpen && (
          <DrawingStudioBar
            visible={tool === "draw" || tool === "highlighter"}
            tool={tool}
            brushStyle={brushStyle}
            setBrushStyle={setBrushStyle}
            strokeColor={strokeColor}
            setStrokeColor={setStrokeColor}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
            brushOpacity={brushOpacity}
            setBrushOpacity={setBrushOpacity}
            pressureEnabled={pressureEnabled}
            setPressureEnabled={setPressureEnabled}
            stabilizer={stabilizer}
            setStabilizer={setStabilizer}
            onSelectDraw={() => setTool("draw")}
            onSelectHighlighter={() => setTool("highlighter")}
          />
        )}
        <WhiteboardCanvas
          els={activeBoard.els}
          conns={activeBoard.conns}
          selectedIds={selectedIds}
          onSelectIds={(ids) => {
            setSelectedIds(ids);
            if (ids.length > 0) setSelectedConnId(null);
          }}
          tool={tool}
          setTool={setTool}
          activeConnectorType={activeConnectorType}
          zoom={activeBoard.zoom}
          pan={activeBoard.pan}
          onPanChange={(pan) =>
            setBoards((prev) =>
              prev.map((b) =>
                b.id === activeBoardId ? { ...b, pan } : b
              )
            )
          }
          gridType={settings.showGrid ? activeBoard.gridType : "blank"}
          strokeColor={strokeColor}
          fillColor={fillColor}
          strokeWidth={strokeWidth}
          strokeStyle={strokeStyle}
          brushStyle={brushStyle}
          brushOpacity={brushOpacity}
          pressureEnabled={pressureEnabled}
          stabilizer={stabilizer}
          selectedStamp={selectedStamp}
          onAddElement={handleAddElement}
          onAddConnection={handleAddConnection}
          onUpdateElement={handleUpdateElementById}
          onInteractionCommit={handleInteractionCommit}
          selectedConnId={selectedConnId}
          onSelectConnection={setSelectedConnId}
          onImageFile={handleImageFile}
          onZoomAt={handleZoomAt}
          onDeleteElements={(ids) => {
            const nextEls = activeBoard.els.filter(
              (el) => !ids.includes(el.id)
            );
            const nextConns = activeBoard.conns.filter(
              (c) => !ids.includes(c.fromId) && !ids.includes(c.toId)
            );
            pushChange(nextEls, nextConns);
            setSelectedIds(selectedIds.filter((id) => !ids.includes(id)));
          }}
          onQuickSpawnChild={handleQuickSpawnChild}
          onStartInlineEdit={handleStartInlineEdit}
          showCollaborators={showCollaborators}
          showToast={showToast}
          svgRef={svgRef}
          shapeRecognition={settings.shapeRecognition}
          handwritingRecognition={settings.handwritingRecognition}
          recognitionMode={settings.recognitionMode || "shapes"}
          connectorParticles={settings.connectorParticles && !settings.reducedMotion}
          particleSpeed={settings.particleSpeed}
          glowConnectors={settings.glowConnectors}
        />

        {/* Right Properties Panel */}
        {!presentationMode && !focusMode && settings.showProperties && (
          <div
            className="hidden md:block absolute right-4 top-4 z-20"
            style={panelDrag.style}
          >
          {/* Drag handle rail */}
          <div
            onPointerDown={panelDrag.onPointerDown}
            className="flex items-center justify-between gap-2 rounded-t-2xl border border-b-0 border-white/10 bg-slate-900/80 px-2.5 py-1 cursor-grab active:cursor-grabbing select-none"
            title="Drag to move this panel anywhere"
          >
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              <GripVertical className="w-3 h-3" /> Move
            </span>
            <button
              onClick={() => setPanelCollapsed((value) => !value)}
              className="text-[9px] font-bold text-slate-400 hover:text-white transition-colors"
            >
              {panelCollapsed ? "Expand" : "Collapse"}
            </button>
          </div>
          {!panelCollapsed && (
          <div className="max-h-[calc(100vh-150px)] overflow-y-auto scrollbar-none">
          {selectedConn ? (
            <ConnectorPropertiesPanel
              conn={selectedConn}
              onUpdate={handleUpdateConnection}
              onDelete={handleDeleteConnection}
              onClose={() => setSelectedConnId(null)}
            />
          ) : (
            <WhiteboardPropertiesPanel
            selectedEls={selectedEls}
            onUpdateElements={handleUpdateElements}
            onDeleteSelected={handleDeleteSelected}
            onLayerChange={handleLayerChange}
            onAlignElements={handleAlignElements}
            onDistributeElements={handleDistributeElements}
            onStartInlineEdit={handleStartInlineEdit}
            defaultColor={strokeColor}
            setDefaultColor={setStrokeColor}
            defaultFill={fillColor}
            setDefaultFill={setFillColor}
            defaultStrokeWidth={strokeWidth}
            setDefaultStrokeWidth={setStrokeWidth}
            defaultStrokeStyle={strokeStyle}
            setDefaultStrokeStyle={setStrokeStyle}
          />
          )}
          </div>
          )}
        </div>
        )}
      </div>

      {/* ── Mini-Map Radar Overview (draggable) ──────────────────────────── */}
      {!presentationMode && !focusMode && settings.showMinimap && <div
        className="absolute bottom-16 right-4 z-20 cursor-grab active:cursor-grabbing"
        style={minimapDrag.style}
        onPointerDown={minimapDrag.onPointerDown}
        title="Drag to reposition the mini-map"
      >
      <WhiteboardMiniMap
        els={activeBoard.els}
        zoom={activeBoard.zoom}
        pan={activeBoard.pan}
        onPanTo={(pan) =>
          setBoards((prev) =>
            prev.map((b) =>
              b.id === activeBoardId ? { ...b, pan } : b
            )
          )
        }
        canvasSize={{
          width: svgRef.current?.clientWidth || 1200,
          height: svgRef.current?.clientHeight || 800,
        }}
      />
      </div>}

      {/* ── Mobile Properties Bottom Sheet ──────────────────────────────── */}
      {!presentationMode && !focusMode && settings.showProperties && (selectedIds.length > 0 || selectedConnId) && (
        <div className="md:hidden fixed bottom-16 left-2 right-2 z-30 bg-slate-900/95 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-md max-h-[45vh] overflow-y-auto">
          {selectedConn ? (
            <ConnectorPropertiesPanel
              conn={selectedConn}
              onUpdate={handleUpdateConnection}
              onDelete={handleDeleteConnection}
              onClose={() => setSelectedConnId(null)}
            />
          ) : (
            <WhiteboardPropertiesPanel
              selectedEls={selectedEls}
              onUpdateElements={handleUpdateElements}
              onDeleteSelected={handleDeleteSelected}
              onLayerChange={handleLayerChange}
              onAlignElements={handleAlignElements}
              onDistributeElements={handleDistributeElements}
              onStartInlineEdit={handleStartInlineEdit}
              defaultColor={strokeColor}
              setDefaultColor={setStrokeColor}
              defaultFill={fillColor}
              setDefaultFill={setFillColor}
              defaultStrokeWidth={strokeWidth}
              setDefaultStrokeWidth={setStrokeWidth}
              defaultStrokeStyle={strokeStyle}
              setDefaultStrokeStyle={setStrokeStyle}
            />
          )}
        </div>
      )}

      {/* ── Bottom Canvas Footer Bar ────────────────────────────────────── */}
      {!presentationMode && !focusMode && settings.showFooter && <footer className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-white/10 rounded-2xl px-2 sm:px-4 py-1.5 shadow-2xl backdrop-blur-xl flex items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs max-w-[98vw] overflow-x-auto scrollbar-none">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={histIdx <= 0}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 transition-all"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={histIdx >= history.length - 1}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 transition-all"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-slate-500 ml-1 hidden sm:inline">
            {histIdx + 1}/{history.length}
          </span>
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 font-mono font-bold text-slate-300 text-[11px]">
          <button
            onClick={() => handleZoomChange(-0.1)}
            className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() =>
              setBoards((prev) =>
                prev.map((b) =>
                  b.id === activeBoardId ? { ...b, zoom: 1 } : b
                )
              )
            }
            className="w-12 text-center hover:text-cyan-400 cursor-pointer transition-colors"
            title="Reset Zoom to 100%"
          >
            {Math.round(activeBoard.zoom * 100)}%
          </button>
          <button
            onClick={() => handleZoomChange(0.1)}
            className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-all"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoomToFit()}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all ml-1"
            title="Zoom to Fit All (Center)"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Grid Toggle & Canvas Stats */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGridToggle}
            className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
            title="Toggle Background Grid Pattern"
          >
            <Grid className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline uppercase text-[10px] font-bold">
              {activeBoard.gridType}
            </span>
          </button>

          <span className="text-[10px] text-slate-500 hidden md:inline">
            <b className="text-slate-300">{activeBoard.els.length}</b> nodes{" "}
            •{" "}
            <b className="text-slate-300">{activeBoard.conns.length}</b> conns
          </span>

          {/* Online / offline status */}
          {settings.showOnlineBadge && (
          <span
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold ${
              online
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}
            title={
              online
                ? "Connected — work syncs to this device"
                : "Offline — Inkwell keeps working, everything is saved locally"
            }
          >
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span className="hidden sm:inline">{online ? "Online" : "Offline"}</span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}
            />
          </span>
          )}

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDuplicateSelection}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                title="Duplicate (Ctrl+D)"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {selectedIds.length > 1 && (
                <button
                  onClick={handleGroupSelection}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5"
                  title="Group Selection (Ctrl+G)"
                >
                  <Group className="w-3.5 h-3.5" />
                </button>
              )}
              {selectedEls.some((el) => el.groupId) && (
                <button
                  onClick={handleUngroupSelection}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-white/5"
                  title="Ungroup Selection (Ctrl+Shift+G)"
                >
                  <Ungroup className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition-all font-semibold"
                title="Delete Selected Items (Del)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Del ({selectedIds.length})</span>
              </button>
            </div>
          )}
        </div>
      </footer>}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <TemplateGeneratorModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onApplyData={(els, conns, title) => {
          const templateTitle = title || "Template Whiteboard";
          if (activeBoard.els.length === 0 && activeBoard.conns.length === 0) {
            pushChange(els, conns);
            setBoards((prev) => prev.map((b) => b.id === activeBoardId ? { ...b, title: templateTitle } : b));
            setTimeout(() => handleZoomToFit(activeBoardId, els, true), 100);
            return;
          }

          const newBoard: WbBoard = {
            id: uid(),
            title: templateTitle,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            els,
            conns,
            gridType: "dots",
            zoom: 1,
            pan: { x: 0, y: 0 },
          };
          setBoards((prev) => [...prev, newBoard]);
          setActiveBoardId(newBoard.id);
          showToast(`📌 Opened "${templateTitle}" in a new board.`);
          setTimeout(() => handleZoomToFit(newBoard.id, els, true), 120);
        }}
        showToast={showToast}
      />

      <ExportShareModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        activeBoard={activeBoard}
        svgRef={svgRef}
        onAddElements={(newEls, newConns) => {
          const nextEls = [...activeBoard.els, ...newEls];
          const nextConns = [...activeBoard.conns, ...newConns];
          pushChange(nextEls, nextConns);
          setSelectedIds(newEls.map((el) => el.id));
          setTimeout(() => handleZoomToFit(activeBoardId, nextEls, true), 120);
        }}
        selectedIds={selectedIds}
        onAddLibraryItems={(items) => {
          const shelfItems: LibraryItem[] = items.map((item) => ({
            id: `shelf-${Date.now()}-${item.id}`,
            title: item.title,
            elements: item.elements,
            color: item.color,
          }));
          setLibraries((prev) => [...prev, ...shelfItems]);
          setLibraryOpen(true);
        }}
        onImportBoardData={(newBoard) => {
          // Normalize imported files (may come from older versions)
          const importedEls = (newBoard.els || []).map(normalizeElement);
          const importedConns = (newBoard.conns || []).map(normalizeConnection);
          const normalized: WbBoard = {
            ...activeBoard,
            ...newBoard,
            id: activeBoardId,
            title: newBoard.title || activeBoard.title || "Imported board",
            els: importedEls,
            conns: importedConns,
            gridType: newBoard.gridType || "dots",
            zoom: 1,
            pan: { x: 0, y: 0 },
            updatedAt: Date.now(),
          };
          pushChange(normalized.els, normalized.conns);
          setBoards((prev) =>
            prev.map((b) => (b.id === activeBoardId ? normalized : b))
          );
          setSelectedIds([]);
          setSelectedConnId(null);
          showToast(
            `📤 Imported ${importedEls.length} elements & ${importedConns.length} connections.`
          );
          setTimeout(() => handleZoomToFit(activeBoardId, normalized.els, true), 150);
        }}
        showToast={showToast}
      />

      <ShortcutsHelpModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
        onEnterFocus={() => setFocusMode(true)}
        onEnterPresentation={() => setPresentationMode(true)}
        onResetPanels={() => {
          panelDrag.reset();
          minimapDrag.reset();
          setPanelCollapsed(false);
          showToast("↺ Panel positions reset.");
        }}
      />

      <GifEmojiPicker
        open={gifEmojiOpen}
        onClose={() => setGifEmojiOpen(false)}
        onPickEmoji={handlePickEmoji}
        onPickGif={handlePickGif}
        showToast={showToast}
      />

      <LibraryPanel
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        libraries={libraries}
        onImportFile={handleLibraryImport}
        onImportUrl={handleLibraryImport}
        onRemoveLibrary={handleLibraryRemove}
        onPickItem={handleLibraryPick}
        showToast={showToast}
      />

      <AISetupModal
        open={aiSetupOpen}
        onClose={() => setAiSetupOpen(false)}
        config={aiConfig}
        onSave={(cfg) => {
          setAiConfig(cfg);
          try {
            localStorage.setItem("inkwell_ai_config_v1", JSON.stringify(cfg));
          } catch {
            /* ignore */
          }
        }}
        showToast={showToast}
      />

      <GenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        aiConfig={aiConfig}
        onOpenAISetup={() => {
          setGenerateOpen(false);
          setAiSetupOpen(true);
        }}
        onApply={(els, conns, title) => {
          const nextEls = [...activeBoard.els, ...els];
          const nextConns = [...activeBoard.conns, ...conns];
          pushChange(nextEls, nextConns);
          setSelectedIds(els.map((e) => e.id));
          if (title) {
            setBoards((prev) =>
              prev.map((b) => (b.id === activeBoardId ? { ...b, title } : b))
            );
          }
          setTimeout(() => handleZoomToFit(activeBoardId, nextEls, true), 120);
        }}
        showToast={showToast}
      />

      {/* ── Confirmation Dialog ─────────────────────────────────────────── */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-zoom-in"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl ${
                  confirmDialog.tone === "danger"
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                }`}>
                  {confirmDialog.tone === "danger" ? "⚠️" : "❓"}
                </div>
                <h3 className="text-base font-black text-white">{confirmDialog.title}</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 bg-slate-950/60 border-t border-white/10">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-colors ${
                  confirmDialog.tone === "danger"
                    ? "bg-rose-500 hover:bg-rose-400 text-white"
                    : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                }`}
              >
                {confirmDialog.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MindMapPage;

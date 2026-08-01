import React, { useRef, useState } from "react";
import {
  MousePointer,
  Hand,
  Square,
  Circle as CircleIcon,
  Diamond as DiamondIcon,
  Triangle as TriangleIcon,
  Hexagon as HexagonIcon,
  Cloud as CloudIcon,
  Star as StarIcon,
  StickyNote,
  Type,
  Edit3,
  Highlighter,
  Smile,
  Frame as FrameIcon,
  Trash2,
  Sparkles,
  LayoutGrid,
  Download,
  HelpCircle,
  Plus,
  ChevronDown,
  Layers,
  RotateCcw,
  GitBranch,
  FolderOpen,
  ImagePlus,
  Presentation,
  Scan,
  Radio,
  Minus,
  MoveRight,
  EyeOff,
  Film,
  SlidersHorizontal,
} from "lucide-react";
import {
  ShapeType,
  ConnectorType,
  WbBoard,
  BrushStyleType,
} from "../../types/whiteboard";
import { STAMP_LIBRARY } from "../../utils/whiteboardUtils";
import { ToolbarPopover, PopoverAnchor } from "./ToolbarPopover";

interface WhiteboardToolbarProps {
  tool: string;
  setTool: (tool: any) => void;
  activeConnectorType: ConnectorType;
  setActiveConnectorType: (t: ConnectorType) => void;
  selectedStamp: string;
  setSelectedStamp: (s: string) => void;
  brushStyle: BrushStyleType;
  setBrushStyle: (style: BrushStyleType) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  boards: WbBoard[];
  activeBoardId: string;
  onSelectBoard: (id: string) => void;
  onRenameBoard: (id: string, title: string) => void;
  onCreateBoard: () => void;
  onDuplicateBoard: () => void;
  onDeleteBoard: (id: string) => void;
  onOpenTemplates: () => void;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
  onImageUpload: (file: File) => void;
  onToggleFullscreen: () => void;
  onTogglePresentation: () => void;
  presentationMode: boolean;
  onApplyLayout: (type: "radial" | "hierarchical" | "horizontal") => void;
  onClearCanvas: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  onAddMedia: (url: string) => void;
  onAddLocalVideo: (file: File) => void;
  onOpenSettings: () => void;
  onOpenGifEmoji: () => void;
  onOpenLibrary: () => void;
  onOpenGenerate: () => void;
  onOpenAISetup: () => void;
  showHeader: boolean;
  showToolRail: boolean;
  showBoardTabs: boolean;
  compactUI: boolean;
}

export const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = ({
  tool,
  setTool,
  activeConnectorType,
  setActiveConnectorType,
  selectedStamp,
  setSelectedStamp,
  brushStyle,
  setBrushStyle,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  boards,
  activeBoardId,
  onSelectBoard,
  onRenameBoard,
  onCreateBoard,
  onDuplicateBoard,
  onDeleteBoard,
  onOpenTemplates,
  onOpenExport,
  onOpenShortcuts,
  onImageUpload,
  onToggleFullscreen,
  onTogglePresentation,
  presentationMode,
  onApplyLayout,
  onClearCanvas,
  focusMode,
  onToggleFocus,
  onAddMedia,
  onAddLocalVideo,
  onOpenSettings,
  onOpenGifEmoji,
  onOpenLibrary,
  onOpenGenerate,
  onOpenAISetup,
  showHeader,
  showToolRail,
  showBoardTabs,
  compactUI,
}) => {
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showConnectMenu, setShowConnectMenu] = useState(false);
  const [showStampsMenu, setShowStampsMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Anchor position for portal popovers (prevents clipping inside the toolbar)
  const [anchor, setAnchor] = useState<PopoverAnchor | null>(null);

  const closeAllMenus = () => {
    setShowShapesMenu(false);
    setShowConnectMenu(false);
    setShowStampsMenu(false);
    setShowLayoutMenu(false);
    setShowMediaMenu(false);
  };

  /** Opens one menu and records the button position for the portal popover. */
  const openMenu = (
    event: React.MouseEvent<HTMLElement>,
    menu: "shapes" | "connect" | "stamps" | "layout" | "media",
    isCurrentlyOpen: boolean
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    closeAllMenus();
    if (isCurrentlyOpen) {
      setAnchor(null);
      return;
    }
    // Header dropdown opens below; left rail menus open to the right.
    if (menu === "layout") {
      setAnchor({ x: rect.right - 220, y: rect.bottom + 8 });
      setShowLayoutMenu(true);
      return;
    }
    setAnchor({ x: rect.right + 10, y: rect.top });
    if (menu === "shapes") setShowShapesMenu(true);
    if (menu === "connect") setShowConnectMenu(true);
    if (menu === "stamps") setShowStampsMenu(true);
    if (menu === "media") setShowMediaMenu(true);
  };

  const SHAPE_TOOLS: { type: ShapeType; label: string; icon: any }[] = [
    { type: "rect", label: "Rectangle", icon: Square },
    { type: "rounded-rect", label: "Rounded Box", icon: Square },
    { type: "circle", label: "Circle / Ellipse", icon: CircleIcon },
    { type: "diamond", label: "Decision (Diamond)", icon: DiamondIcon },
    { type: "triangle", label: "Triangle", icon: TriangleIcon },
    { type: "hexagon", label: "Hexagon", icon: HexagonIcon },
    { type: "cloud", label: "Idea Cloud", icon: CloudIcon },
    { type: "star", label: "Star", icon: StarIcon },
    { type: "capsule" as ShapeType, label: "Capsule Pill", icon: Square },
    { type: "parallelogram" as ShapeType, label: "Parallelogram", icon: Square },
    { type: "mind-map" as ShapeType, label: "Mind-Map Node", icon: CircleIcon },
    { type: "line", label: "Free Line", icon: Minus },
    { type: "arrow", label: "Free Arrow", icon: MoveRight },
  ];

  const currentShape = SHAPE_TOOLS.find((s) => s.type === tool) || SHAPE_TOOLS[1];

  // These props feed the Drawing Studio bar (rendered by the parent);
  // reference them so the compiler knows they are intentionally passed through.
  void setBrushStyle;
  void strokeColor;
  void setStrokeColor;
  void strokeWidth;
  void setStrokeWidth;

  return (
    <>
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      {showHeader && <header className={`flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/80 border-b border-white/10 backdrop-blur-xl z-30 ${compactUI ? "px-2 py-1.5" : "px-4 py-2.5"}`}>
        {/* Brand & Board Tabs */}
        <div className="flex items-center gap-2 sm:gap-4 w-full md:w-auto justify-between md:justify-start overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Inkwell brand mark — ink drop + node graph */}
            <div className="w-9 h-9 rounded-[12px] bg-[#0b1120] border border-white/10 flex items-center justify-center shadow-lg shadow-indigo-950/60 overflow-hidden">
              <svg viewBox="0 0 64 64" className="w-full h-full">
                <defs>
                  <linearGradient id="inkwell-g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#22d3ee" />
                    <stop offset="0.55" stopColor="#6366f1" />
                    <stop offset="1" stopColor="#d946ef" />
                  </linearGradient>
                </defs>
                <path d="M32 10c7 9 13 15.6 13 23a13 13 0 0 1-26 0c0-7.4 6-14 13-23Z" fill="url(#inkwell-g)" />
                <circle cx="25" cy="35" r="3.4" fill="#0b1120" />
                <circle cx="38" cy="30" r="3.4" fill="#0b1120" />
                <circle cx="33" cy="42" r="3.4" fill="#0b1120" />
                <path d="M25 35l13-5m-5 12l5-12m-8 7-5-2" stroke="#0b1120" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Inkwell</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30 uppercase tracking-widest">
                  Studio
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 hidden sm:block -mt-0.5">
                Infinite canvas · mind maps · media — by SudhirDevOps1
              </p>
            </div>
          </div>

          {/* Board Tabs — multi-page workspace */}
          {showBoardTabs && <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/10 max-w-sm overflow-x-auto">
            {boards.map((b) => {
              const isActive = b.id === activeBoardId;
              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBoard(b.id)}
                  onDoubleClick={() => {
                    const nextTitle = window.prompt("Rename whiteboard", b.title)?.trim();
                    if (nextTitle) onRenameBoard(b.id, nextTitle);
                  }}
                  title="Double-click to rename board"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                    isActive
                      ? "bg-cyan-500 text-slate-950 shadow-md font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <FolderOpen className="w-3 h-3" />
                  <span className="truncate max-w-[110px]">{b.title}</span>
                  {boards.length > 1 && isActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBoard(b.id);
                      }}
                      className="hover:text-rose-900 text-slate-800 ml-1"
                      title="Delete Board"
                    >
                      &times;
                    </button>
                  )}
                </div>
              );
            })}
            <button
              onClick={onCreateBoard}
              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-colors shrink-0"
              title="New page / board"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDuplicateBoard}
              className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-white/5 rounded-lg transition-colors shrink-0 text-[10px] font-bold"
              title="Duplicate current page"
            >
              ⧉
            </button>
          </div>}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* AI / Templates Button */}
          <button
            onClick={onOpenTemplates}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Templates</span>
            <span className="sm:hidden">Tpl</span>
          </button>

          {/* Generate: Mermaid / Markdown / AI */}
          <button
            onClick={onOpenGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white text-xs font-bold shadow-lg shadow-fuchsia-500/20 transition-all active:scale-95"
            title="Mermaid · Markdown · AI text-to-diagram"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Generate</span>
          </button>

          <button
            onClick={onOpenAISetup}
            className="hidden sm:flex p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-violet-300 hover:bg-white/10 transition-colors"
            title="AI Setup — provider, API key, model"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Auto-Layout Dropdown */}
          <button
            data-toolbar-anchor
            onClick={(e) => openMenu(e, "layout", showLayoutMenu)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-xs font-semibold transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Organize</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Export Button */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export & Share</span>
          </button>

          {/* Focus / Zen mode — hide every panel for pure drawing */}
          <button
            onClick={onToggleFocus}
            className={`flex p-2 rounded-xl border transition-colors ${
              focusMode
                ? "bg-fuchsia-500 text-white border-fuchsia-300 shadow-lg shadow-fuchsia-500/30"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
            title={focusMode ? "Exit focus mode (Z)" : "Focus mode — hide all panels (Z)"}
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePresentation}
            className={`hidden sm:flex p-2 rounded-xl border transition-colors ${
              presentationMode
                ? "bg-amber-500 text-slate-950 border-amber-300"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
            title="Presentation Mode (Shift+P)"
          >
            <Presentation className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleFullscreen}
            className="hidden sm:flex p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Toggle Fullscreen (F11)"
          >
            <Scan className="w-3.5 h-3.5" />
          </button>

          {/* Clear Canvas */}
          <button
            onClick={onClearCanvas}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 transition-colors"
            title="Clear Board"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Shortcuts / Help */}
          <button
            onClick={onOpenShortcuts}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Keyboard Shortcuts (Cheatsheet)"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenSettings}
            className="flex p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors"
            title="Inkwell settings"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>}

      {/* ── Left Floating Toolbar Palette ────────────────────────────── */}
      {showToolRail && <div className={`absolute left-2 sm:left-4 z-30 flex flex-col gap-0.5 sm:gap-1 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl max-h-[calc(100vh-7rem)] overflow-y-auto overflow-x-hidden scrollbar-none ${showHeader ? "top-20 sm:top-24" : "top-3"} ${compactUI ? "p-1" : "p-1.5 sm:p-2"}`}>
        {/* Select */}
        <button
          onClick={() => setTool("select")}
          className={`p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-center relative group ${
            tool === "select"
              ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          title="Select & Move (V)"
        >
          <MousePointer className="w-5 h-5" />
        </button>

        {/* Lasso free-form selection */}
        <button
          onClick={() => {
            closeAllMenus();
            setTool("lasso");
          }}
          className={`p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-center relative group ${
            tool === "lasso"
              ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
              : "text-slate-400 hover:text-purple-300 hover:bg-white/5"
          }`}
          title="Lasso selection — draw around items (Shift+L)"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 22a5 5 0 0 1-2-4" />
            <path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1" />
            <path d="M10.5 18a2.5 2.5 0 0 1-2.5 4" />
          </svg>
        </button>

        {/* Pan Hand */}
        <button
          onClick={() => setTool("pan")}
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative group ${
            tool === "pan"
              ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          title="Hand / Pan Canvas (H)"
        >
          <Hand className="w-5 h-5" />
        </button>

        <div className="w-full h-px bg-white/10 my-0.5" />

        {/* Shape Picker Button */}
        <button
          data-toolbar-anchor
          onClick={(e) => openMenu(e, "shapes", showShapesMenu)}
          className={`p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-center relative group ${
            SHAPE_TOOLS.some((s) => s.type === tool)
              ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          title={`Shapes: ${currentShape.label} (R/C)`}
        >
          <currentShape.icon className="w-5 h-5" />
        </button>

        {/* Sticky Note */}
        <button
          onClick={() => setTool("sticky")}
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative group ${
            tool === "sticky"
              ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          title="Sticky Note (S)"
        >
          <StickyNote className="w-5 h-5" />
        </button>

        {/* Text */}
        <button
          onClick={() => setTool("text")}
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative group ${
            tool === "text"
              ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          title="Text Box (T)"
        >
          <Type className="w-5 h-5" />
        </button>

        {/* Connector Line Tool & Dropdown */}
        <button
          data-toolbar-anchor
          onClick={(e) => {
            setTool("connect");
            openMenu(e, "connect", showConnectMenu);
          }}
          className={`p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-center relative group ${
            tool === "connect"
              ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          title={`Connect Nodes — ${activeConnectorType} (L)`}
        >
          <GitBranch className="w-5 h-5" />
        </button>

        <div className="w-full h-px bg-white/10 my-0.5" />

        {/* Draw tool — opens the full Drawing Studio bar (no duplicate popover) */}
        <button
          onClick={() => {
            closeAllMenus();
            setTool("draw");
          }}
          className={`p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-center relative group ${
            tool === "draw"
              ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          title={`Draw — ${brushStyle} pen (D)`}
        >
          <Edit3 className="w-5 h-5" />
        </button>
        {/* Highlighter */}
        <button
          onClick={() => setTool("highlighter")}
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative group ${
            tool === "highlighter"
              ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          title="Highlighter (M)"
        >
          <Highlighter className="w-5 h-5" />
        </button>

        {/* Laser pointer for presentations */}
        <button
          onClick={() => setTool("laser")}
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative group ${
            tool === "laser"
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
              : "text-slate-400 hover:text-rose-300 hover:bg-white/5"
          }`}
          title="Laser Pointer (K)"
        >
          <Radio className="w-5 h-5" />
        </button>

        {/* Stamps / Emoji / GIF library */}
        <button
          onClick={() => {
            closeAllMenus();
            onOpenGifEmoji();
          }}
          className="p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-center relative group text-slate-400 hover:text-pink-300 hover:bg-white/5"
          title="Free GIF & Emoji library (E)"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Excalidraw Library Panel — click one item at a time to place */}
        <button
          onClick={() => onOpenLibrary()}
          className="p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-center relative group text-slate-400 hover:text-indigo-300 hover:bg-white/5"
          title="Excalidraw Library — click an item to place it"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </button>

        {/* Image Upload */}
        <button
          onClick={() => imageInputRef.current?.click()}
          className="p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-center relative group text-slate-400 hover:text-emerald-300 hover:bg-white/5"
          title="Upload Image (I)"
        >
          <ImagePlus className="w-5 h-5" />
        </button>

        {/* Embed Video / Media */}
        <button
          data-toolbar-anchor
          onClick={(e) => openMenu(e, "media", showMediaMenu)}
          className={`p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-center ${
            showMediaMenu
              ? "bg-emerald-500 text-slate-950"
              : "text-slate-400 hover:text-emerald-300 hover:bg-white/5"
          }`}
          title="Embed Video / Media"
        >
          <Film className="w-5 h-5" />
        </button>
        <input
          id="whiteboard-image-input"
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImageUpload(file);
            event.target.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onAddLocalVideo(file);
            event.target.value = "";
          }}
        />

        {/* Frame / Container */}
        <button
          onClick={() => setTool("frame")}
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative group ${
            tool === "frame"
              ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          title="Frame / Container (F)"
        >
          <FrameIcon className="w-5 h-5" />
        </button>

        <div className="w-full h-px bg-white/10 my-0.5" />

        {/* Eraser Tool */}
        <button
          onClick={() => setTool("erase")}
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative group ${
            tool === "erase"
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
              : "text-slate-400 hover:text-rose-400 hover:bg-white/5"
          }`}
          title="Eraser Tool (X)"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>}

      {/* ══ Portal Popovers — rendered on <body> so they never get clipped ══ */}

      {/* Vector Shapes */}
      <ToolbarPopover
        open={showShapesMenu}
        anchor={anchor}
        onClose={closeAllMenus}
        title="Vector Shapes"
        width={260}
      >
        <div className="grid grid-cols-2 gap-1.5">
          {SHAPE_TOOLS.map((st) => {
            const IconComp = st.icon;
            const active = tool === st.type;
            return (
              <button
                key={st.type}
                onClick={() => {
                  setTool(st.type);
                  closeAllMenus();
                }}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <IconComp className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{st.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </ToolbarPopover>

      {/* Connector Styles */}
      <ToolbarPopover
        open={showConnectMenu}
        anchor={anchor}
        onClose={closeAllMenus}
        title="Connector Line Style"
        width={240}
      >
        <div className="flex flex-col gap-1">
          {[
            { id: "curved", label: "Curved Bezier Arrow" },
            { id: "straight", label: "Straight Line Arrow" },
            { id: "orthogonal", label: "Orthogonal / Flowchart" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveConnectorType(c.id as any);
                setTool("connect");
                closeAllMenus();
              }}
              className={`rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                activeConnectorType === c.id
                  ? "bg-cyan-500 font-bold text-slate-950"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </ToolbarPopover>

      {/* Stamps & Emoji */}
      <ToolbarPopover
        open={showStampsMenu}
        anchor={anchor}
        onClose={closeAllMenus}
        title="Stamps & Emoji Library"
        width={288}
      >
        <div className="grid grid-cols-4 gap-2">
          {STAMP_LIBRARY.map((st) => (
            <button
              key={st.id}
              onClick={() => {
                setSelectedStamp(st.icon);
                setTool("stamp");
                closeAllMenus();
              }}
              className={`flex flex-col items-center justify-center rounded-xl p-2 transition-all hover:scale-105 ${
                selectedStamp === st.icon && tool === "stamp"
                  ? "border border-cyan-500/40 bg-cyan-500/20 shadow-lg shadow-cyan-500/20"
                  : "border border-white/5 bg-white/5 hover:bg-white/10"
              }`}
              title={st.label}
            >
              <span className="text-2xl leading-none">{st.icon}</span>
              <span className="mt-1 w-full truncate text-center text-[8px] text-slate-500">
                {st.label.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[9px] text-slate-500">
          Click anywhere on the canvas to place it
        </p>
      </ToolbarPopover>

      {/* Auto-Layout */}
      <ToolbarPopover
        open={showLayoutMenu}
        anchor={anchor}
        onClose={closeAllMenus}
        title="Auto-Organize Layout"
        width={230}
      >
        <div className="flex flex-col gap-1">
          <button
            onClick={() => {
              onApplyLayout("radial");
              closeAllMenus();
            }}
            className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Radial Mind Map</span>
          </button>
          <button
            onClick={() => {
              onApplyLayout("hierarchical");
              closeAllMenus();
            }}
            className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            <span>Hierarchical Tree</span>
          </button>
          <button
            onClick={() => {
              onApplyLayout("horizontal");
              closeAllMenus();
            }}
            className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <GitBranch className="w-3.5 h-3.5 rotate-90 text-purple-400" />
            <span>Horizontal Flowchart</span>
          </button>
        </div>
      </ToolbarPopover>

      {/* Embed Video / Media */}
      <ToolbarPopover
        open={showMediaMenu}
        anchor={anchor}
        onClose={closeAllMenus}
        title="Embed Video or Media"
        width={320}
      >
        <p className="mb-2 text-[11px] leading-relaxed text-slate-400">
          Paste a YouTube, Vimeo or direct <span className="text-slate-300">.mp4 / .webm</span> link.
          It becomes a playable element on your canvas.
        </p>
        <button
          onClick={() => {
            videoInputRef.current?.click();
            closeAllMenus();
          }}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/15"
        >
          <Film className="h-4 w-4" /> Choose local video file
        </button>
        <div className="mb-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-600">
          <span className="h-px flex-1 bg-white/10" /> or paste a URL <span className="h-px flex-1 bg-white/10" />
        </div>
        <input
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && mediaUrl.trim()) {
              onAddMedia(mediaUrl.trim());
              setMediaUrl("");
              closeAllMenus();
            }
          }}
          placeholder="https://www.youtube.com/watch?v=…  or  file.mp4"
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-emerald-400"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <button
              onClick={() => setMediaUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}
              className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/10"
            >
              Sample YouTube
            </button>
            <button
              onClick={() => setMediaUrl("")}
              className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>
          <button
            onClick={() => {
              if (!mediaUrl.trim()) return;
              onAddMedia(mediaUrl.trim());
              setMediaUrl("");
              closeAllMenus();
            }}
            className="rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 transition-all hover:bg-emerald-400 active:scale-95"
          >
            Embed on canvas
          </button>
        </div>
      </ToolbarPopover>
    </>
  );
};

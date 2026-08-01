import { useState } from "react";
import {
  Brush,
  Droplets,
  Minus,
  Plus,
  Pencil,
  PenLine,
  Highlighter,
  Waves,
  SquarePen,
  Ruler,
  ChevronDown,
  ChevronUp,
  GripHorizontal,
} from "lucide-react";
import { BrushStyleType } from "../../types/whiteboard";
import { STROKE_COLORS } from "../../utils/whiteboardUtils";
import { useDraggable } from "../../hooks/useDraggable";

interface DrawingStudioBarProps {
  visible: boolean;
  tool: string;
  brushStyle: BrushStyleType;
  setBrushStyle: (style: BrushStyleType) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  brushOpacity: number;
  setBrushOpacity: (opacity: number) => void;
  pressureEnabled: boolean;
  setPressureEnabled: (enabled: boolean) => void;
  stabilizer: number;
  setStabilizer: (value: number) => void;
  onSelectDraw: () => void;
  onSelectHighlighter: () => void;
}

const PRESETS: {
  id: BrushStyleType;
  label: string;
  icon: typeof PenLine;
  hint: string;
}[] = [
  { id: "pen", label: "Pen", icon: PenLine, hint: "Clean ink" },
  { id: "pencil", label: "Pencil", icon: Pencil, hint: "Sketchy" },
  { id: "marker", label: "Marker", icon: Highlighter, hint: "Bold notes" },
  { id: "brush", label: "Brush", icon: Brush, hint: "Painterly" },
  { id: "calligraphy", label: "Calligraphy", icon: Waves, hint: "Flowing" },
  { id: "technical", label: "Technical", icon: Ruler, hint: "Sharp" },
];

export function DrawingStudioBar({
  visible,
  tool,
  brushStyle,
  setBrushStyle,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  brushOpacity,
  setBrushOpacity,
  pressureEnabled,
  setPressureEnabled,
  stabilizer,
  setStabilizer,
  onSelectDraw,
  onSelectHighlighter,
}: DrawingStudioBarProps) {
  const [expanded, setExpanded] = useState(false);
  const drag = useDraggable({ w: 720, h: 320 });

  if (!visible) return null;

  const isHighlighter = tool === "highlighter";

  // ── Compact mode: thin single-row bar that doesn't block drawing ──────
  if (!expanded) {
    // Bug #8 Fix: useDraggable applies inline transform: translate3d(...) which
    // overrides CSS -translate-x-1/2. Solution: outer div takes drag.style (positioning),
    // inner div applies -translate-x-1/2 centering independently.
    return (
      <div
        className="pointer-events-none absolute left-1/2 top-[52px] sm:top-[60px] z-40"
        style={drag.style}
      >
        <div className="-translate-x-1/2 pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/90 px-2 py-1.5 shadow-xl backdrop-blur-xl">
          {/* BUG FIX: grip must NOT be a <button> — useDraggable skips buttons */}
          <div
            role="button"
            aria-label="Drag pen bar"
            onPointerDown={drag.onPointerDown}
            className="cursor-grab rounded-full p-1.5 text-slate-500 hover:bg-white/10 hover:text-cyan-300 active:cursor-grabbing active:text-cyan-300 touch-none"
            title="Drag pen bar anywhere"
          >
            <GripHorizontal className="h-4 w-4" />
          </div>
          {/* Mode toggle */}
          <button
            onClick={onSelectDraw}
            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
              !isHighlighter ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            <SquarePen className="h-3.5 w-3.5 inline-block" />
          </button>
          <button
            onClick={onSelectHighlighter}
            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
              isHighlighter ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            <Highlighter className="h-3.5 w-3.5 inline-block" />
          </button>

          <span className="h-4 w-px bg-white/10" />

          {/* Quick brush pick */}
          {PRESETS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => { setBrushStyle(p.id); onSelectDraw(); }}
                className={`rounded-full p-1.5 ${
                  brushStyle === p.id && !isHighlighter
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-slate-500 hover:text-white"
                }`}
                title={p.label}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}

          <span className="h-4 w-px bg-white/10" />

          {/* Size display */}
          <span className="font-mono text-[10px] text-slate-400">{strokeWidth}px</span>

          {/* Quick colors */}
          <div className="flex gap-0.5">
            {STROKE_COLORS.slice(0, 6).map((c) => (
              <button
                key={c}
                onClick={() => setStrokeColor(c)}
                className={`h-4 w-4 rounded-full border ${
                  strokeColor === c ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Expand full studio */}
          <button
            onClick={() => setExpanded(true)}
            className="ml-1 flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[9px] font-bold text-slate-400 hover:text-white transition-colors"
            title="Expand full Drawing Studio"
          >
            <ChevronDown className="h-3 w-3" /> More
          </button>
        </div>
      </div>
    );
  }

  // ── Expanded mode: full studio with all controls ──────────────────────
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[52px] sm:top-[60px] z-40 w-[min(94vw,720px)] -translate-x-1/2 px-1 sm:px-2"
      style={drag.style}
    >
      <div className="pointer-events-auto rounded-3xl border border-white/10 bg-slate-900/95 p-2.5 sm:p-3 shadow-2xl backdrop-blur-xl animate-zoom-in overflow-y-auto overflow-x-hidden scrollbar-none max-h-[calc(100vh-7rem)]">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div
              role="button"
              aria-label="Move Drawing Studio"
              onPointerDown={drag.onPointerDown}
              className="flex cursor-grab items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-white/10 hover:text-cyan-300 active:cursor-grabbing touch-none"
              title="Drag Drawing Studio anywhere"
            >
              <GripHorizontal className="h-3.5 w-3.5" /> Move
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center justify-center gap-1 rounded-xl px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-white/5 hover:text-white transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" /> Collapse
            </button>
          </div>

          {/* Mode + presets */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-2xl bg-slate-950/70 p-1 border border-white/5">
              <button
                onClick={onSelectDraw}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 ${
                  !isHighlighter
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <SquarePen className="w-3.5 h-3.5" />
                Draw
              </button>
              <button
                onClick={onSelectHighlighter}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 ${
                  isHighlighter
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Highlighter className="w-3.5 h-3.5" />
                Highlighter
              </button>
            </div>

            <div className="flex flex-1 items-center gap-1 overflow-x-auto pb-0.5">
              {PRESETS.map((preset) => {
                const Icon = preset.icon;
                const active = brushStyle === preset.id && !isHighlighter;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setBrushStyle(preset.id);
                      onSelectDraw();
                    }}
                    className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-left transition-all ${
                      active
                        ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-500/20"
                        : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                    }`}
                    title={`${preset.label}: ${preset.hint}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">{preset.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size / opacity / pressure / stabilizer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-bold uppercase tracking-wider">Pen Size</span>
                <span className="font-mono text-white">{strokeWidth}px</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 1))}
                  className="rounded-lg bg-white/5 p-1 text-slate-300 hover:bg-white/10"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min={1}
                  max={40}
                  step={1}
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <button
                  onClick={() => setStrokeWidth(Math.min(40, strokeWidth + 1))}
                  className="rounded-lg bg-white/5 p-1 text-slate-300 hover:bg-white/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {[1, 2, 4, 8, 12, 20, 32].map((size) => (
                  <button
                    key={size}
                    onClick={() => setStrokeWidth(size)}
                    className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                      strokeWidth === size
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1">
                  <Droplets className="w-3 h-3" /> Opacity
                </span>
                <span className="font-mono text-white">{Math.round(brushOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={brushOpacity}
                onChange={(e) => setBrushOpacity(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="mt-2 flex gap-1">
                {[0.25, 0.5, 0.75, 1].map((value) => (
                  <button
                    key={value}
                    onClick={() => setBrushOpacity(value)}
                    className={`flex-1 rounded-md px-1 py-0.5 text-[9px] font-bold ${
                      Math.abs(brushOpacity - value) < 0.01
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    {Math.round(value * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-bold uppercase tracking-wider">Stabilizer</span>
                <span className="font-mono text-white">{stabilizer}</span>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                step={1}
                value={stabilizer}
                onChange={(e) => setStabilizer(Number(e.target.value))}
                className="w-full accent-indigo-400"
              />
              <p className="mt-1.5 text-[9px] text-slate-500">
                Higher = smoother strokes
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-2.5">
              <div className="mb-2 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-bold uppercase tracking-wider">Pressure</span>
                <button
                  onClick={() => setPressureEnabled(!pressureEnabled)}
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    pressureEnabled
                      ? "bg-emerald-400 text-slate-950"
                      : "bg-white/10 text-slate-300"
                  }`}
                >
                  {pressureEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <p className="text-[9px] text-slate-500">
                Velocity-based thickness for brush & calligraphy
              </p>
            </div>
          </div>

          {/* Colors */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Ink Color
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {STROKE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setStrokeColor(color)}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    strokeColor === color
                      ? "border-white scale-110 shadow-lg"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <label className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                Custom
                <input
                  type="color"
                  value={strokeColor.startsWith("#") ? strokeColor : "#38bdf8"}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="h-6 w-8 cursor-pointer rounded-md border-0 bg-transparent"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

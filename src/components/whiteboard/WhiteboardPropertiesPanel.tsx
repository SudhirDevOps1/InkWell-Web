import React from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Lock,
  Unlock,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown,
  Edit3,
} from "lucide-react";
import {
  WbElement,
  FontFamilyType,
  StrokeStyleType,
} from "../../types/whiteboard";
import { STROKE_COLORS, FILL_COLORS } from "../../utils/whiteboardUtils";

interface WhiteboardPropertiesPanelProps {
  selectedEls: WbElement[];
  onUpdateElements: (patch: Partial<WbElement>) => void;
  onDeleteSelected: () => void;
  onLayerChange: (action: "front" | "back" | "forward" | "backward") => void;
  onAlignElements: (
    alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom"
  ) => void;
  onDistributeElements: (direction: "horizontal" | "vertical") => void;
  onStartInlineEdit: (el: WbElement) => void;
  // Fallbacks when nothing selected
  defaultColor: string;
  setDefaultColor: (col: string) => void;
  defaultFill: string;
  setDefaultFill: (fill: string) => void;
  defaultStrokeWidth: number;
  setDefaultStrokeWidth: (w: number) => void;
  defaultStrokeStyle: StrokeStyleType;
  setDefaultStrokeStyle: (s: StrokeStyleType) => void;
}

export const WhiteboardPropertiesPanel: React.FC<WhiteboardPropertiesPanelProps> = ({
  selectedEls,
  onUpdateElements,
  onDeleteSelected,
  onLayerChange,
  onAlignElements,
  onDistributeElements,
  onStartInlineEdit,
  defaultColor,
  setDefaultColor,
  defaultFill,
  setDefaultFill,
  defaultStrokeWidth,
  setDefaultStrokeWidth,
  defaultStrokeStyle,
  setDefaultStrokeStyle,
}) => {
  const isSelected = selectedEls.length > 0;
  const isMulti = selectedEls.length > 1;
  const firstEl = selectedEls[0];

  const currentColor = isSelected ? firstEl.color : defaultColor;
  const currentFill = isSelected ? firstEl.fill : defaultFill;
  const currentWidth = isSelected ? firstEl.strokeWidth : defaultStrokeWidth;
  const currentStyle = isSelected ? firstEl.strokeStyle : defaultStrokeStyle;
  const currentFont = isSelected ? firstEl.fontFamily || "sans" : "sans";
  const currentFontSize = isSelected ? firstEl.fontSize || 14 : 14;
  const currentTextColor = isSelected ? firstEl.textColor || "#ffffff" : "#ffffff";
  const currentAlign = isSelected ? firstEl.textAlign || "center" : "center";
  const currentBold = isSelected ? !!firstEl.bold : false;
  const currentItalic = isSelected ? !!firstEl.italic : false;
  const currentOpacity = isSelected ? firstEl.opacity || 1 : 1;
  const currentLocked = isSelected ? !!firstEl.locked : false;
  const supportsText = isSelected && !["image", "draw", "highlighter", "line", "arrow"].includes(firstEl.type);

  const handleColorClick = (col: string) => {
    if (isSelected) onUpdateElements({ color: col });
    else setDefaultColor(col);
  };

  const handleFillClick = (fill: string) => {
    if (isSelected) onUpdateElements({ fill });
    else setDefaultFill(fill);
  };

  const handleWidthClick = (w: number) => {
    if (isSelected) onUpdateElements({ strokeWidth: w });
    else setDefaultStrokeWidth(w);
  };

  const handleStyleClick = (s: StrokeStyleType) => {
    if (isSelected) onUpdateElements({ strokeStyle: s });
    else setDefaultStrokeStyle(s);
  };

  return (
    <aside className="w-60 shrink-0 bg-slate-900/90 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-140px)] shadow-2xl backdrop-blur-md text-xs z-20">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div>
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">
            {isMulti
              ? `${selectedEls.length} Items Selected`
              : isSelected
              ? `${firstEl.type.toUpperCase()}`
              : "Drawing Styles"}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {isSelected ? "Customize selected item" : "Set default styling"}
          </p>
        </div>
        {supportsText && !isMulti && (
          <button
            onClick={() => onStartInlineEdit(firstEl)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Edit Text Label"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Multi-select Alignment Toolbar ──────────────────────────────── */}
      {isMulti && (
        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-2.5 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Align & Distribute
          </p>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => onAlignElements("left")}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-center"
              title="Align Left"
            >
              Left
            </button>
            <button
              onClick={() => onAlignElements("center-h")}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-center"
              title="Center Horizontally"
            >
              Center
            </button>
            <button
              onClick={() => onAlignElements("right")}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-center"
              title="Align Right"
            >
              Right
            </button>
            <button
              onClick={() => onAlignElements("top")}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-center"
              title="Align Top"
            >
              Top
            </button>
            <button
              onClick={() => onAlignElements("center-v")}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-center"
              title="Center Vertically"
            >
              Middle
            </button>
            <button
              onClick={() => onAlignElements("bottom")}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-center"
              title="Align Bottom"
            >
              Bottom
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1 pt-1 border-t border-white/5">
            <button
              onClick={() => onDistributeElements("horizontal")}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-center"
            >
              Distribute H
            </button>
            <button
              onClick={() => onDistributeElements("vertical")}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-center"
            >
              Distribute V
            </button>
          </div>
        </div>
      )}

      {isSelected && !isMulti && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geometry</p>
          <div className="grid grid-cols-3 gap-1.5">
            <label className="space-y-1">
              <span className="text-[9px] text-slate-500">Width</span>
              <input
                type="number"
                min="20"
                value={Math.round(firstEl.w)}
                onChange={(event) => onUpdateElements({ w: Math.max(20, Number(event.target.value)) })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[9px] text-slate-500">Height</span>
              <input
                type="number"
                min="20"
                value={Math.round(firstEl.h)}
                onChange={(event) => onUpdateElements({ h: Math.max(20, Number(event.target.value)) })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[9px] text-slate-500">Rotate</span>
              <input
                type="number"
                value={Math.round(firstEl.rotation || 0)}
                onChange={(event) => onUpdateElements({ rotation: Number(event.target.value) })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-cyan-400"
              />
            </label>
          </div>
          {firstEl.groupId && (
            <p className="text-[9px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2 py-1.5">
              Part of a linked group
            </p>
          )}
        </div>
      )}

      {/* ── Stroke Color ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Stroke / Line Color
        </p>
        <div className="flex flex-wrap gap-1.5">
          {STROKE_COLORS.map((col) => {
            const active = currentColor === col;
            return (
              <button
                key={col}
                onClick={() => handleColorClick(col)}
                className={`w-6 h-6 rounded-full transition-all border-2 ${
                  active
                    ? "border-white scale-110 shadow-lg shadow-white/10"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: col }}
                title={col}
              />
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>Custom</span>
          <input
            type="color"
            value={currentColor.startsWith("#") ? currentColor : "#38bdf8"}
            onChange={(event) => handleColorClick(event.target.value)}
            className="h-7 w-10 rounded-lg bg-slate-950 border border-white/10 cursor-pointer"
          />
        </label>
      </div>

      {/* ── Fill Color ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Fill Color
        </p>
        <div className="flex flex-wrap gap-1.5">
          {FILL_COLORS.map((fill, i) => {
            const active = currentFill === fill;
            return (
              <button
                key={i}
                onClick={() => handleFillClick(fill)}
                className={`w-6 h-6 rounded-md transition-all border-2 ${
                  active
                    ? "border-white scale-110 shadow-lg"
                    : "border-transparent hover:border-white/30"
                }`}
                style={{
                  background:
                    fill === "transparent"
                      ? "linear-gradient(45deg, #334155 25%, transparent 25%, transparent 75%, #334155 75%, #334155), linear-gradient(45deg, #334155 25%, #1e293b 25%, #1e293b 75%, #334155 75%, #334155)"
                      : fill,
                  backgroundSize: fill === "transparent" ? "8px 8px" : undefined,
                  backgroundPosition:
                    fill === "transparent" ? "0 0, 4px 4px" : undefined,
                }}
                title={fill === "transparent" ? "Transparent" : fill}
              />
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>Custom solid fill</span>
          <input
            type="color"
            value={currentFill.startsWith("#") ? currentFill : "#0f172a"}
            onChange={(event) => handleFillClick(event.target.value)}
            className="h-7 w-10 rounded-lg bg-slate-950 border border-white/10 cursor-pointer"
          />
        </label>
      </div>

      {/* ── Stroke Width & Style ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Stroke Width & Style
        </p>
        <div className="grid grid-cols-4 gap-1">
          {[1, 2, 3, 5, 8, 12, 20, 32].map((w) => (
            <button
              key={w}
              onClick={() => handleWidthClick(w)}
              className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                currentWidth === w
                  ? "bg-cyan-500 text-slate-950 shadow-md"
                  : "bg-white/5 hover:bg-white/10 text-slate-300"
              }`}
            >
              {w}px
            </button>
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={40}
          value={Math.min(40, Math.max(1, currentWidth))}
          onChange={(e) => handleWidthClick(Number(e.target.value))}
          className="w-full accent-cyan-400"
        />
        <div className="grid grid-cols-3 gap-1 pt-1">
          {[
            { id: "solid", label: "Solid" },
            { id: "dashed", label: "Dashed" },
            { id: "dotted", label: "Dotted" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => handleStyleClick(st.id as any)}
              className={`py-1 rounded-lg text-[11px] font-semibold transition-all ${
                currentStyle === st.id
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "bg-white/5 hover:bg-white/10 text-slate-300"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Typography & Alignment ──────────────────────────────────────── */}
      {supportsText && (
        <div className="space-y-2.5 pt-2 border-t border-white/10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Typography & Alignment
          </p>

          {/* Font Family */}
          <div className="grid grid-cols-3 gap-1">
              {[
                { id: "sans", label: "Sans" },
                { id: "mono", label: "Mono" },
                { id: "hand", label: "Hand" },
                { id: "serif", label: "Serif" },
                { id: "display", label: "Display" },
                { id: "rounded", label: "Rounded" },
              ].map((font) => (
              <button
                key={font.id}
                onClick={() =>
                  onUpdateElements({ fontFamily: font.id as FontFamilyType })
                }
                className={`py-1 rounded-lg text-xs transition-colors ${
                  currentFont === font.id
                    ? "bg-cyan-500 text-slate-950 font-bold"
                    : "bg-white/5 hover:bg-white/10 text-slate-300"
                }`}
              >
                {font.label}
              </button>
            ))}
          </div>

          {/* Font Size, Alignment, Bold, Italic */}
          <div className="flex items-center justify-between gap-1">
            <select
              value={currentFontSize}
              onChange={(e) =>
                onUpdateElements({ fontSize: Number(e.target.value) })
              }
              className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              {[10, 12, 14, 16, 18, 22, 26, 32, 40, 52, 64].map((s) => (
                <option key={s} value={s}>
                  {s}px
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdateElements({ textAlign: "left" })}
                className={`p-1 rounded ${
                  currentAlign === "left"
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-white/5 text-slate-300"
                }`}
                title="Left Align"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateElements({ textAlign: "center" })}
                className={`p-1 rounded ${
                  currentAlign === "center"
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-white/5 text-slate-300"
                }`}
                title="Center Align"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateElements({ textAlign: "right" })}
                className={`p-1 rounded ${
                  currentAlign === "right"
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-white/5 text-slate-300"
                }`}
                title="Right Align"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdateElements({ bold: !currentBold })}
                className={`p-1 rounded ${
                  currentBold
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-white/5 text-slate-300"
                }`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateElements({ italic: !currentItalic })}
                className={`p-1 rounded ${
                  currentItalic
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-white/5 text-slate-300"
                }`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Text Color
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["#ffffff", "#0f172a", "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#4ade80", "#facc15", "#fb923c", "#f87171"].map((col) => (
                <button
                  key={col}
                  onClick={() => onUpdateElements({ textColor: col })}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${currentTextColor === col ? "border-white scale-110" : "border-transparent hover:border-white/40"}`}
                  style={{ backgroundColor: col }}
                  title={`Text ${col}`}
                />
              ))}
            </div>
            <label className="flex items-center gap-2 text-[10px] text-slate-400">
              <span>Custom text</span>
              <input
                type="color"
                value={currentTextColor.startsWith("#") ? currentTextColor : "#ffffff"}
                onChange={(event) => onUpdateElements({ textColor: event.target.value })}
                className="h-7 w-10 rounded-lg bg-slate-950 border border-white/10 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {/* ── Opacity Slider ───────────────────────────────────────────────── */}
      <div className="space-y-1.5 pt-2 border-t border-white/10">
        <div className="flex justify-between items-center text-[10px] text-slate-400">
          <span>Opacity</span>
          <span className="font-bold text-white">
            {Math.round(currentOpacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={currentOpacity}
          onChange={(e) =>
            onUpdateElements({ opacity: parseFloat(e.target.value) })
          }
          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />
      </div>

      {/* ── Layer Order & Lock Controls ─────────────────────────────────── */}
      {isSelected && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Layer & Actions
          </p>

          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => onLayerChange("front")}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center"
              title="Bring to Front"
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onLayerChange("forward")}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center"
              title="Bring Forward"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onLayerChange("backward")}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center"
              title="Send Backward"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onLayerChange("back")}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center"
              title="Send to Back"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => onUpdateElements({ locked: !currentLocked })}
              className={`flex-1 py-1.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                currentLocked
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-white/5 hover:bg-white/10 text-slate-300"
              }`}
            >
              {currentLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Locked</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock</span>
                </>
              )}
            </button>

            <button
              onClick={onDeleteSelected}
              className="flex-1 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold flex items-center justify-center gap-1.5 border border-rose-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

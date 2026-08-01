import React, { useState } from "react";
import { X, Keyboard, Search } from "lucide-react";

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  key: string;
  desc: string;
  group: string;
}

const SHORTCUTS: Shortcut[] = [
  // Tools
  { group: "Tools", key: "V / 1", desc: "Selection" },
  { group: "Tools", key: "H", desc: "Hand (panning tool)" },
  { group: "Tools", key: "R / 2", desc: "Rectangle" },
  { group: "Tools", key: "D / 3", desc: "Diamond" },
  { group: "Tools", key: "O / 4", desc: "Ellipse / Circle" },
  { group: "Tools", key: "A / 5", desc: "Arrow" },
  { group: "Tools", key: "L / 6", desc: "Line" },
  { group: "Tools", key: "P / 7", desc: "Draw (pen)" },
  { group: "Tools", key: "T / 8", desc: "Text" },
  { group: "Tools", key: "9", desc: "Insert image" },
  { group: "Tools", key: "E / 0", desc: "Eraser" },
  { group: "Tools", key: "F", desc: "Frame tool" },
  { group: "Tools", key: "K", desc: "Laser pointer" },
  { group: "Tools", key: "S", desc: "Sticky note" },
  { group: "Tools", key: "M", desc: "Highlighter" },
  { group: "Tools", key: "B", desc: "Brush preset" },
  { group: "Tools", key: "Shift + L", desc: "Lasso selection" },
  { group: "Tools", key: "Shift + X", desc: "Toggle draw-to-shape" },
  { group: "Tools", key: "I", desc: "Open image picker" },

  // Editor
  { group: "Editor", key: "Enter", desc: "New line · continues the current list" },
  { group: "Editor", key: "Ctrl + Enter", desc: "Save text / finish editing" },
  { group: "Editor", key: "Tab / Shift+Tab", desc: "Indent / outdent list item" },
  { group: "Editor", key: "Ctrl + Shift + 8", desc: "Toggle bullet list" },
  { group: "Editor", key: "Ctrl + Shift + 7", desc: "Toggle numbered list" },
  { group: "Editor", key: "Ctrl + Shift + C", desc: "Toggle checklist" },
  { group: "Editor", key: "Ctrl + B / I", desc: "Bold / italic selection" },
  { group: "Editor", key: "Esc", desc: "Finish editing / deselect" },
  { group: "Editor", key: "Delete", desc: "Delete selection" },
  { group: "Editor", key: "Ctrl + X", desc: "Cut" },
  { group: "Editor", key: "Ctrl + C", desc: "Copy" },
  { group: "Editor", key: "Ctrl + V", desc: "Paste" },
  { group: "Editor", key: "Ctrl + A", desc: "Select all" },
  { group: "Editor", key: "Shift + click", desc: "Add element to selection" },
  { group: "Editor", key: "Ctrl + D", desc: "Duplicate" },
  { group: "Editor", key: "Ctrl + Z", desc: "Undo" },
  { group: "Editor", key: "Ctrl + Y", desc: "Redo" },
  { group: "Editor", key: "Ctrl + G", desc: "Group selection" },
  { group: "Editor", key: "Ctrl + Shift + G", desc: "Ungroup selection" },
  { group: "Editor", key: "Ctrl + [", desc: "Send to back" },
  { group: "Editor", key: "Ctrl + ]", desc: "Bring to front" },
  { group: "Editor", key: "Arrow keys", desc: "Nudge selection 1px" },
  { group: "Editor", key: "Shift + Arrows", desc: "Nudge selection 10px" },
  { group: "Editor", key: "Space + drag", desc: "Move canvas" },

  // View
  { group: "View", key: "Ctrl + +", desc: "Zoom in" },
  { group: "View", key: "Ctrl + -", desc: "Zoom out" },
  { group: "View", key: "Ctrl + 0", desc: "Reset zoom" },
  { group: "View", key: "Shift + 1", desc: "Zoom to fit all elements" },
  { group: "View", key: "Ctrl + Scroll", desc: "Zoom around pointer" },
  { group: "View", key: "Mouse Wheel", desc: "Pan the canvas" },
  { group: "View", key: "Alt + Z", desc: "Zen / Focus mode" },
  { group: "View", key: "Z", desc: "Focus mode (quick)" },
  { group: "View", key: "Alt + S", desc: "Snap to grid" },
  { group: "View", key: "Ctrl + '", desc: "Toggle grid" },
  { group: "View", key: "Shift + P", desc: "Presentation mode" },
  { group: "View", key: "F11", desc: "Browser fullscreen" },

  // Pen & shapes
  { group: "Pen & Shapes", key: "[ / ]", desc: "Decrease / increase pen size" },
  { group: "Pen & Shapes", key: "Draw → Shape", desc: "Auto circle, rect, triangle, diamond, line" },
  { group: "Pen & Shapes", key: "Handwriting", desc: "One-stroke A–Z becomes clean text (Settings)" },

  // Content
  { group: "Content", key: "Paste / Drop", desc: "Add an image to the canvas" },
  { group: "Content", key: "Film tool", desc: "Embed URL or local video" },
  { group: "Content", key: "Generate", desc: "Mermaid · Markdown · AI diagram" },
  { group: "Content", key: "Book icon", desc: "Excalidraw library shelf" },
];

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  if (!isOpen) return null;

  const filtered = query
    ? SHORTCUTS.filter(
        (s) =>
          s.desc.toLowerCase().includes(query.toLowerCase()) ||
          s.key.toLowerCase().includes(query.toLowerCase())
      )
    : SHORTCUTS;

  const groups = Array.from(new Set(filtered.map((s) => s.group)));

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-400">Excalidraw-compatible hotkeys</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shortcuts…"
              className="w-full rounded-xl border border-white/10 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {groups.map((group) => (
            <div key={group} className="mb-5">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400">{group}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filtered
                  .filter((s) => s.group === group)
                  .map((sc, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-950/60 border border-white/5 rounded-xl px-3.5 py-2">
                      <span className="text-xs text-slate-300">{sc.desc}</span>
                      <kbd className="px-2 py-1 bg-white/10 border border-white/15 rounded-lg text-white font-mono text-[10px] font-bold shrink-0 ml-2">
                        {sc.key}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">No shortcuts match "{query}"</p>
          )}
        </div>
      </div>
    </div>
  );
};

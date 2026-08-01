import { useState, useRef } from "react";
import { X, Search, Upload, Trash2, GripVertical } from "lucide-react";
import {
  parseExcalidrawLibraryItems,
  fetchExcalidrawLibraryItems,
} from "../../utils/excalidrawImport";
import { useDraggable } from "../../hooks/useDraggable";
import type { WbElement } from "../../types/whiteboard";

interface LibraryItem {
  id: string;
  title: string;
  elements: WbElement[];
  color: string;
}

interface LibraryPanelProps {
  open: boolean;
  onClose: () => void;
  libraries: LibraryItem[];
  onImportFile: (items: LibraryItem[]) => void;
  onImportUrl: (items: LibraryItem[]) => void;
  onRemoveLibrary: (id: string) => void;
  onPickItem: (item: LibraryItem) => void;
  showToast: (msg: string) => void;
}

function LibraryThumbnail({ item }: { item: LibraryItem }) {
  const els = item.elements;
  const minX = Math.min(...els.map((e) => e.x));
  const minY = Math.min(...els.map((e) => e.y));
  const maxX = Math.max(...els.map((e) => e.x + e.w));
  const maxY = Math.max(...els.map((e) => e.y + e.h));
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  return (
    <svg viewBox={`${minX - 8} ${minY - 8} ${w + 16} ${h + 16}`} className="h-14 w-full overflow-visible">
      {els.map((el) => {
        const common = {
          stroke: el.color,
          strokeWidth: Math.max(1, el.strokeWidth),
          fill: el.fill === "transparent" ? "none" : el.fill,
          opacity: el.opacity,
        };
        if (el.type === "circle") {
          return <ellipse key={el.id} cx={el.x + el.w / 2} cy={el.y + el.h / 2} rx={el.w / 2} ry={el.h / 2} {...common} />;
        }
        if (el.type === "diamond") {
          const p = `${el.x + el.w / 2},${el.y} ${el.x + el.w},${el.y + el.h / 2} ${el.x + el.w / 2},${el.y + el.h} ${el.x},${el.y + el.h / 2}`;
          return <polygon key={el.id} points={p} {...common} />;
        }
        if ((el.type === "draw" || el.type === "line" || el.type === "arrow") && el.points?.length) {
          const d = `M ${el.points.map((p) => `${el.x + p.x} ${el.y + p.y}`).join(" L ")}`;
          return <path key={el.id} d={d} fill="none" stroke={el.color} strokeWidth={Math.max(1, el.strokeWidth)} strokeLinecap="round" strokeLinejoin="round" />;
        }
        if (el.type === "text") {
          return <text key={el.id} x={el.x + el.w / 2} y={el.y + el.h / 2} fill={el.textColor || el.color} fontSize={Math.max(7, el.fontSize || 10)} textAnchor="middle" dominantBaseline="middle">{el.label.slice(0, 18)}</text>;
        }
        return <rect key={el.id} x={el.x} y={el.y} width={el.w} height={el.h} rx={el.type === "capsule" ? el.h / 2 : 5} {...common} />;
      })}
    </svg>
  );
}

export function LibraryPanel({
  open,
  onClose,
  libraries,
  onImportFile,
  onImportUrl,
  onRemoveLibrary,
  onPickItem,
  showToast,
}: LibraryPanelProps) {
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const drag = useDraggable({ w: 320, h: 560 });

  if (!open) return null;

  const filtered = libraries.filter(
    (lib) => !query || lib.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleUrl = async () => {
    if (!url.trim()) return;
    setBusy(true);
    const items = await fetchExcalidrawLibraryItems(url.trim());
    setBusy(false);
    if (items?.length) {
      onImportUrl(items);
      showToast(`📚 Imported ${items.length} library items.`);
      setUrl("");
    } else {
      showToast("⚠️ CORS / offline. Download .excalidrawlib and use Choose File.");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = String(ev.target?.result || "");
      const items = parseExcalidrawLibraryItems(raw);
      if (items?.length) {
        onImportFile(items);
        showToast(`📚 Loaded ${items.length} items from file.`);
      } else {
        showToast("❌ Could not parse file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed right-4 top-20 z-[130]"
      style={drag.style}
    >
      <div className="w-[320px] max-h-[72vh] rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-950/60 cursor-grab active:cursor-grabbing"
          onPointerDown={drag.onPointerDown}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-white">Excalidraw Library</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Import controls */}
        <div className="space-y-2 p-3 border-b border-white/10 bg-slate-950/40">
          <div className="flex gap-1.5">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUrl();
              }}
              placeholder="libraries.excalidraw.com link…"
              className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleUrl}
              disabled={busy}
              className="rounded-lg bg-cyan-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {busy ? "…" : "Load"}
            </button>
          </div>
          <div className="flex gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept=".excalidraw,.excalidrawlib,application/json"
              onChange={handleFile}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/10"
            >
              <Upload className="h-3.5 w-3.5" /> Choose .excalidrawlib
            </button>
            {libraries.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Remove all library items?")) {
                    libraries.forEach((l) => onRemoveLibrary(l.id));
                    showToast("️ Library cleared.");
                  }
                }}
                className="rounded-lg bg-rose-500/15 border border-rose-500/25 px-2 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-500/25"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-[9px] text-slate-600 leading-relaxed">
            Items appear below. Click any item to place it on the canvas.
          </p>
        </div>

        {/* Search */}
        {libraries.length > 0 && (
          <div className="px-3 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search library…"
                className="w-full rounded-lg border border-white/10 bg-slate-950 py-1.5 pl-8 pr-2 text-[11px] text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        )}

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {libraries.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center text-xs text-slate-500">
              <Upload className="h-6 w-6 mb-2 opacity-50" />
              <p>No items yet.</p>
              <p className="mt-1 text-[10px]">Load a .excalidrawlib file or paste a library URL.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-xs text-slate-500">No match.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((lib) => {
                return (
                  <button
                    key={lib.id}
                    onClick={() => onPickItem(lib)}
                    className="group flex flex-col items-center gap-1 rounded-xl border border-white/5 bg-white/[0.025] p-1.5 text-center transition-all hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/10"
                    title={`Place "${lib.title}" on canvas`}
                  >
                    <div className="relative h-14 w-full flex items-center justify-center">
                      <LibraryThumbnail item={lib} />
                    </div>
                    <span className="block w-full truncate text-[9px] font-semibold text-slate-300 group-hover:text-white">
                      {lib.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 bg-slate-950/60 px-3 py-1.5 text-[9px] text-slate-600">
          {libraries.length} item{libraries.length === 1 ? "" : "s"} · click to place
        </div>
      </div>
    </div>
  );
}

export type { LibraryItem };

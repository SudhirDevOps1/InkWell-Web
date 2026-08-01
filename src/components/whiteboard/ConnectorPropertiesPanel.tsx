import { ArrowLeftRight, Link2, Trash2, X } from "lucide-react";
import { ConnectorType, StrokeStyleType, WbConn } from "../../types/whiteboard";
import { STROKE_COLORS } from "../../utils/whiteboardUtils";

interface ConnectorPropertiesPanelProps {
  conn: WbConn;
  onUpdate: (patch: Partial<WbConn>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ConnectorPropertiesPanel({
  conn,
  onUpdate,
  onDelete,
  onClose,
}: ConnectorPropertiesPanelProps) {
  return (
    <aside className="w-60 bg-slate-900/95 border border-white/10 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md space-y-4 animate-zoom-in">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-cyan-400" /> Connector
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Edit line, arrows and label</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Label</label>
        <input
          value={conn.label || ""}
          onChange={(event) => onUpdate({ label: event.target.value })}
          placeholder="e.g. HTTPS, depends on..."
          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Routing</p>
        <div className="grid grid-cols-3 gap-1">
          {(["curved", "straight", "orthogonal"] as ConnectorType[]).map((type) => (
            <button
              key={type}
              onClick={() => onUpdate({ type })}
              className={`py-1.5 rounded-lg text-[10px] font-semibold capitalize ${
                conn.type === type ? "bg-cyan-500 text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {type === "orthogonal" ? "Elbow" : type}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Line color</p>
        <div className="flex flex-wrap gap-1.5">
          {STROKE_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onUpdate({ color })}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${conn.color === color ? "border-white scale-110" : "border-transparent"}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={conn.strokeWidth}
          onChange={(event) => onUpdate({ strokeWidth: Number(event.target.value) })}
          className="bg-slate-950 border border-white/10 rounded-xl px-2 py-2 text-[11px] text-white outline-none"
        >
          {[1, 2, 3, 4, 6, 8].map((width) => <option key={width} value={width}>{width}px</option>)}
        </select>
        <select
          value={conn.strokeStyle}
          onChange={(event) => onUpdate({ strokeStyle: event.target.value as StrokeStyleType })}
          className="bg-slate-950 border border-white/10 rounded-xl px-2 py-2 text-[11px] text-white outline-none"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => onUpdate({ arrowStart: !conn.arrowStart })}
          className={`py-2 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 ${conn.arrowStart ? "bg-cyan-500 text-slate-950" : "bg-white/5 text-slate-300"}`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" /> Start arrow
        </button>
        <button
          onClick={() => onUpdate({ arrowEnd: !conn.arrowEnd })}
          className={`py-2 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 ${conn.arrowEnd ? "bg-cyan-500 text-slate-950" : "bg-white/5 text-slate-300"}`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" /> End arrow
        </button>
      </div>

      <button
        onClick={onDelete}
        className="w-full py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-bold flex items-center justify-center gap-1.5"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete connector
      </button>
    </aside>
  );
}
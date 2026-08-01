import {
  X,
  MonitorUp,
  Eye,
  EyeOff,
  Save,
  Gauge,
  GraduationCap,
  RotateCcw,
  Maximize2,
} from "lucide-react";

export interface InkwellSettings {
  showHeader: boolean;
  showToolbar: boolean;
  showProperties: boolean;
  showMinimap: boolean;
  showFooter: boolean;
  showGrid: boolean;
  showDrawingStudio: boolean;
  autoHideDrawingStudio: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  autosave: boolean;
  teachingMode: boolean;
  compactUI: boolean;
  snapToGrid: boolean;
  showBoardTabs: boolean;
  keepDrawingBarOpen: boolean;
  showOnlineBadge: boolean;
  shapeRecognition: boolean;
  handwritingRecognition: boolean;
  recognitionMode: "off" | "shapes" | "handwriting" | "auto";
  canvasBg: string;
  connectorParticles: boolean;
  particleSpeed: number;
  glowConnectors: boolean;
}

export const CANVAS_PRESETS: { id: string; name: string; bg: string; swatch: string }[] = [
  { id: "midnight", name: "Midnight", bg: "#0b1120", swatch: "#0b1120" },
  { id: "slate", name: "Slate", bg: "#0f172a", swatch: "#0f172a" },
  { id: "charcoal", name: "Charcoal", bg: "#111111", swatch: "#111111" },
  { id: "navy", name: "Deep Navy", bg: "#0a1a2f", swatch: "#0a1a2f" },
  { id: "forest", name: "Forest", bg: "#0a1f14", swatch: "#0a1f14" },
  { id: "plum", name: "Plum", bg: "#1a0f24", swatch: "#1a0f24" },
  { id: "paper", name: "Paper (light)", bg: "#faf7f0", swatch: "#faf7f0" },
  { id: "white", name: "Pure White", bg: "#ffffff", swatch: "#ffffff" },
  { id: "cream", name: "Cream", bg: "#fdf6e3", swatch: "#fdf6e3" },
  { id: "blueprint", name: "Blueprint", bg: "#0d2137", swatch: "#0d2137" },
];

export const DEFAULT_SETTINGS: InkwellSettings = {
  showHeader: true,
  showToolbar: true,
  showProperties: true,
  showMinimap: true,
  showFooter: true,
  showGrid: true,
  showDrawingStudio: true,
  autoHideDrawingStudio: false,
  reducedMotion: false,
  highContrast: false,
  autosave: true,
  teachingMode: false,
  compactUI: false,
  snapToGrid: false,
  showBoardTabs: true,
  keepDrawingBarOpen: true,
  showOnlineBadge: true,
  shapeRecognition: true,
  handwritingRecognition: false,
  recognitionMode: "shapes",
  canvasBg: "#0b1120",
  connectorParticles: false,
  particleSpeed: 3,
  glowConnectors: false,
};

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: InkwellSettings;
  onChange: (settings: InkwellSettings) => void;
  onEnterFocus: () => void;
  onEnterPresentation: () => void;
  onResetPanels: () => void;
}

const Toggle = ({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) => (
  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.035] px-3.5 py-3 transition-colors hover:bg-white/[0.06]">
    <span className="min-w-0">
      <span className="block text-xs font-semibold text-white">{label}</span>
      <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
        {description}
      </span>
    </span>
    <span
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-cyan-500" : "bg-slate-700"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </span>
  </label>
);

export function SettingsModal({
  open,
  onClose,
  settings,
  onChange,
  onEnterFocus,
  onEnterPresentation,
  onResetPanels,
}: SettingsModalProps) {
  if (!open) return null;

  const set = <K extends keyof InkwellSettings>(key: K, value: InkwellSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/65 p-3 backdrop-blur-md sm:p-5"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-2xl animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl overflow-hidden border border-white/10 shadow-lg shadow-indigo-950/50">
              <img src="/inkwell.png" alt="Inkwell" className="w-full h-full object-cover" draggable={false} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">Inkwell Settings</h2>
              <p className="text-[11px] text-slate-500">
                Choose exactly what stays on screen — optimized for teaching
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          {/* Classroom presets */}
          <section className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <GraduationCap className="h-3.5 w-3.5 text-cyan-400" /> Classroom Modes
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                onClick={() => {
                  onChange({ ...settings, teachingMode: true, showProperties: false, showMinimap: false, showFooter: true, showDrawingStudio: false });
                  onClose();
                }}
                className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-3 text-left transition-all hover:border-cyan-400/60 hover:bg-cyan-500/15"
              >
                <MonitorUp className="mb-2 h-5 w-5 text-cyan-400" />
                <span className="block text-xs font-bold text-white">Teaching Canvas</span>
                <span className="mt-1 block text-[10px] text-slate-400">Maximum board area; tools remain available.</span>
              </button>
              <button
                onClick={() => {
                  onEnterFocus();
                  onClose();
                }}
                className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-3 text-left transition-all hover:border-fuchsia-400/60 hover:bg-fuchsia-500/15"
              >
                <EyeOff className="mb-2 h-5 w-5 text-fuchsia-400" />
                <span className="block text-xs font-bold text-white">Focus / Zen</span>
                <span className="mt-1 block text-[10px] text-slate-400">Hide everything; press Z to restore.</span>
              </button>
              <button
                onClick={() => {
                  onEnterPresentation();
                  onClose();
                }}
                className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-left transition-all hover:border-amber-400/60 hover:bg-amber-500/15"
              >
                <Maximize2 className="mb-2 h-5 w-5 text-amber-400" />
                <span className="block text-xs font-bold text-white">Presentation</span>
                <span className="mt-1 block text-[10px] text-slate-400">Clean read-only-style classroom view.</span>
              </button>
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <Eye className="h-3.5 w-3.5 text-indigo-400" /> Screen & Panels
              </div>
              <div className="space-y-2">
                <Toggle checked={settings.showHeader} onChange={(v) => set("showHeader", v)} label="Top header" description="Brand, board tabs, templates and export buttons." />
                <Toggle checked={settings.showToolbar} onChange={(v) => set("showToolbar", v)} label="Left tool rail" description="Select, shapes, text, brush, media and eraser tools." />
                <Toggle checked={settings.showProperties} onChange={(v) => set("showProperties", v)} label="Properties panel" description="Colors, typography, geometry and layers." />
                <Toggle checked={settings.showMinimap} onChange={(v) => set("showMinimap", v)} label="Mini-map" description="Overview navigator for large boards." />
                <Toggle checked={settings.showFooter} onChange={(v) => set("showFooter", v)} label="Bottom controls" description="Undo, zoom, grid and online state." />
                <Toggle checked={settings.showDrawingStudio} onChange={(v) => set("showDrawingStudio", v)} label="Drawing Studio" description="Pen size, opacity, stabilizer and pressure panel." />
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <Gauge className="h-3.5 w-3.5 text-emerald-400" /> Canvas & Performance
              </div>
              <div className="space-y-2">
                <Toggle checked={settings.showGrid} onChange={(v) => set("showGrid", v)} label="Canvas grid" description="Show dots, graph paper or blueprint background." />
                <Toggle checked={settings.autosave} onChange={(v) => set("autosave", v)} label="Auto-save locally" description="Continuously save boards in this browser." />
                <Toggle checked={settings.autoHideDrawingStudio} onChange={(v) => set("autoHideDrawingStudio", v)} label="Auto-hide Drawing Studio" description="Close the studio after selecting a brush preset." />
                <Toggle checked={settings.reducedMotion} onChange={(v) => set("reducedMotion", v)} label="Reduced motion" description="Disable ambient drift and most animations." />
                <Toggle checked={settings.highContrast} onChange={(v) => set("highContrast", v)} label="High contrast" description="Stronger panels and grid for classroom projectors." />
                <Toggle checked={settings.compactUI} onChange={(v) => set("compactUI", v)} label="Compact controls" description="Smaller controls for tablets and small laptops." />
                <Toggle checked={settings.snapToGrid} onChange={(v) => set("snapToGrid", v)} label="Snap to grid" description="Nudge and place shapes on a 20px grid for tidy diagrams." />
                <Toggle checked={settings.showBoardTabs} onChange={(v) => set("showBoardTabs", v)} label="Multi-page tabs" description="Show page tabs for multiple boards in one workspace." />
                <Toggle checked={settings.keepDrawingBarOpen} onChange={(v) => set("keepDrawingBarOpen", v)} label="Keep pen bar visible" description="Show the compact pen strip whenever draw tool is active." />
                <Toggle checked={settings.showOnlineBadge} onChange={(v) => set("showOnlineBadge", v)} label="Online / offline badge" description="Footer badge for connection state." />
                <div className="rounded-2xl border border-white/5 bg-white/[0.035] px-3.5 py-3 md:col-span-2">
                  <p className="mb-1 text-xs font-semibold text-white">Pen recognition mode</p>
                  <p className="mb-2.5 text-[10px] leading-relaxed text-slate-500">
                    Choose what your freehand pen strokes become. Only one runs at a time — no more shape/letter conflicts.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {([
                      ["off", "✏️ Raw ink", "Keep exactly what you draw"],
                      ["shapes", "🔷 Shapes", "Circle, rect, triangle, diamond, line"],
                      ["handwriting", "🔤 Letters", "A–Z, a–z, 0–9 → clean text"],
                      ["auto", "✨ Auto", "Shape first, else letter"],
                    ] as const).map(([mode, label, hint]) => (
                      <button
                        key={mode}
                        onClick={() => {
                          set("recognitionMode", mode);
                          onChange({
                            ...settings,
                            recognitionMode: mode,
                            shapeRecognition: mode === "shapes" || mode === "auto",
                            handwritingRecognition: mode === "handwriting" || mode === "auto",
                          });
                        }}
                        className={`rounded-xl border px-2 py-2 text-left transition-all ${
                          settings.recognitionMode === mode
                            ? "border-cyan-400 bg-cyan-500/15"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                        title={hint}
                      >
                        <span className="block text-[11px] font-bold text-white">{label}</span>
                        <span className="mt-0.5 block text-[8px] leading-tight text-slate-500">{hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Mind-map effects */}
          <section className="mt-6 border-t border-white/10 pt-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              ✨ Mind-Map Effects
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <Toggle
                checked={settings.connectorParticles}
                onChange={(v) => set("connectorParticles", v)}
                label="Flowing particles on connections"
                description="Animated energy dots travel along every connector — great for presentations."
              />
              <Toggle
                checked={settings.glowConnectors}
                onChange={(v) => set("glowConnectors", v)}
                label="Glowing connectors"
                description="Adds a soft neon glow to all connection lines."
              />
            </div>
            {settings.connectorParticles && (
              <div className="mt-2 rounded-2xl border border-white/5 bg-white/[0.035] px-3.5 py-3">
                <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold uppercase tracking-wider">Particle speed</span>
                  <span className="font-mono text-white">{settings.particleSpeed}/6</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={1}
                  value={settings.particleSpeed}
                  onChange={(e) => set("particleSpeed", Number(e.target.value))}
                  className="w-full accent-fuchsia-400"
                />
                <p className="mt-1 text-[9px] text-slate-500">Higher = faster particle travel.</p>
              </div>
            )}
          </section>

          {/* Canvas background presets */}
          <section className="mt-6 border-t border-white/10 pt-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              🎨 Canvas Background
            </div>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {CANVAS_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => set("canvasBg", preset.bg)}
                  className={`group flex flex-col items-center gap-1 rounded-xl p-1.5 transition-all ${
                    settings.canvasBg === preset.bg ? "bg-white/10 ring-2 ring-cyan-400" : "hover:bg-white/5"
                  }`}
                  title={preset.name}
                >
                  <span
                    className="h-8 w-full rounded-lg border border-white/15"
                    style={{ background: preset.swatch }}
                  />
                  <span className="w-full truncate text-center text-[8px] text-slate-500 group-hover:text-slate-300">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
              Custom color
              <input
                type="color"
                value={settings.canvasBg}
                onChange={(e) => set("canvasBg", e.target.value)}
                className="h-7 w-12 cursor-pointer rounded-md border border-white/10 bg-transparent"
              />
              <span className="font-mono text-slate-500">{settings.canvasBg}</span>
            </label>
          </section>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
            <button
              onClick={onResetPanels}
              className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset panel positions
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => onChange(DEFAULT_SETTINGS)}
                className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 transition-colors hover:text-white"
              >
                Restore defaults
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-400"
              >
                <Save className="h-3.5 w-3.5" /> Save settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
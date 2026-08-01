import React, { useState } from "react";
import {
  Download,
  X,
  FileCode,
  Image as ImageIcon,
  FileText,
  Upload,
  Copy,
  Check,
  Share2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { jsPDF } from "jspdf";
import { WbBoard, WbElement, WbConn } from "../../types/whiteboard";
import { getBoundingBox } from "../../utils/whiteboardUtils";
import {
  parseExcalidraw,
  parseExcalidrawLibraryItems,
  fetchExcalidrawLibrary,
  fetchExcalidrawLibraryItems,
  exportAsExcalidraw,
  ParsedExcalidrawLibraryItem,
} from "../../utils/excalidrawImport";

interface ExportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBoard: WbBoard;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onImportBoardData: (board: WbBoard) => void;
  onAddElements: (els: WbElement[], conns: WbConn[]) => void;
  onAddLibraryItems: (items: ParsedExcalidrawLibraryItem[]) => void;
  selectedIds: string[];
  showToast: (msg: string) => void;
}

export const ExportShareModal: React.FC<ExportShareModalProps> = ({
  isOpen,
  onClose,
  activeBoard,
  svgRef,
  onImportBoardData,
  onAddElements,
  onAddLibraryItems,
  selectedIds,
  showToast,
}) => {
  const [pngBg, setPngBg] = useState<"dark" | "light" | "transparent">("dark");
  const [copiedLink, setCopiedLink] = useState(false);
  const [excaliUrl, setExcaliUrl] = useState("");
  const [excaliBusy, setExcaliBusy] = useState(false);
  const [exportScope, setExportScope] = useState<"board" | "selection">("board");
  const [exportScale, setExportScale] = useState(2);
  const [exportPadding, setExportPadding] = useState(64);
  const [copiedImage, setCopiedImage] = useState(false);

  const selectedEls = activeBoard.els.filter((el) => selectedIds.includes(el.id));

  if (!isOpen) return null;

  const triggerConfetti = () => {
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch {
      // ignore
    }
  };

  const buildExportSvg = () => {
    if (!svgRef.current) return null;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('[data-export-ignore="true"]').forEach((node) => node.remove());

    // iframes/videos cannot be rasterized inside an SVG-as-image; replace each
    // embedded media player with a clean labelled placeholder so the rest of the
    // board still exports perfectly.
    clone.querySelectorAll("foreignObject").forEach((fo) => {
      if (fo.querySelector("iframe, video")) {
        const w = Number(fo.getAttribute("width")) || 420;
        const h = Number(fo.getAttribute("height")) || 238;
        const placeholder = document.createElementNS("http://www.w3.org/2000/svg", "g");
        placeholder.innerHTML = `
          <rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="#020617" stroke="#10b981" stroke-width="2" stroke-dasharray="6 4"/>
          <circle cx="${w / 2}" cy="${h / 2}" r="22" fill="rgba(16,185,129,0.9)"/>
          <path d="M ${w / 2 - 6} ${h / 2 - 9} L ${w / 2 + 10} ${h / 2} L ${w / 2 - 6} ${h / 2 + 9} Z" fill="#022c22"/>
          <text x="${w / 2}" y="${h / 2 + 40}" text-anchor="middle" fill="#6ee7b7" font-size="12" font-family="Inter, Arial, sans-serif">Embedded media (plays in app)</text>
        `;
        fo.replaceWith(placeholder);
      }
    });

    // Raster export must not depend on foreignObject support (Safari/iOS and
    // some Chromium builds reject it). Convert all remaining labels/stamps to
    // native SVG <text>/<tspan> nodes. SVG export becomes more portable too.
    clone.querySelectorAll("foreignObject").forEach((fo) => {
      const text = (fo.textContent || "").trim();
      const x = Number(fo.getAttribute("x")) || 0;
      const y = Number(fo.getAttribute("y")) || 0;
      const w = Number(fo.getAttribute("width")) || 120;
      const h = Number(fo.getAttribute("height")) || 40;
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const isEmojiOnly = text.length <= 5 && !/[A-Za-z0-9]/.test(text);
      textNode.setAttribute("x", String(x + w / 2));
      textNode.setAttribute("y", String(y + h / 2));
      textNode.setAttribute("text-anchor", "middle");
      textNode.setAttribute("dominant-baseline", "middle");
      textNode.setAttribute("fill", "#ffffff");
      textNode.setAttribute("font-family", "Inter, Arial, sans-serif");
      textNode.setAttribute("font-size", isEmojiOnly ? String(Math.min(44, h * 0.68)) : "13");
      textNode.setAttribute("font-weight", "700");

      // Preserve authored line breaks; wrap long lines to the element width.
      const fontSize = isEmojiOnly ? Math.min(44, h * 0.68) : 13;
      const maxChars = Math.max(8, Math.floor(w / (fontSize * 0.56)));
      const rawLines = text.split(/\n/);
      const lines: string[] = [];
      rawLines.forEach((raw) => {
        if (raw.length <= maxChars) {
          lines.push(raw);
          return;
        }
        const words = raw.split(/\s+/);
        let current = "";
        words.forEach((word) => {
          const next = current ? `${current} ${word}` : word;
          if (next.length > maxChars) {
            if (current) lines.push(current);
            current = word;
          } else {
            current = next;
          }
        });
        if (current) lines.push(current);
      });
      const shown = lines.slice(0, 14);

      const lineHeight = fontSize * 1.35;
      if (shown.length <= 1) {
        textNode.textContent = shown[0] ?? text;
      } else {
        const startDy = -((shown.length - 1) * lineHeight) / 2;
        shown.forEach((line, index) => {
          const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
          tspan.setAttribute("x", String(x + w / 2));
          tspan.setAttribute("dy", index === 0 ? String(startDy) : String(lineHeight));
          tspan.textContent = line;
          textNode.appendChild(tspan);
        });
      }
      group.appendChild(textNode);
      fo.replaceWith(group);
    });

    const exportEls =
      exportScope === "selection" && selectedEls.length > 0 ? selectedEls : activeBoard.els;

    // When exporting only the selection, hide everything else.
    if (exportScope === "selection" && selectedEls.length > 0) {
      const keep = new Set(selectedEls.map((el) => el.id));
      clone.querySelectorAll("[data-el-id]").forEach((node) => {
        const id = node.getAttribute("data-el-id");
        if (id && !keep.has(id)) node.remove();
      });
      clone.querySelectorAll("[data-conn-from]").forEach((node) => {
        const from = node.getAttribute("data-conn-from");
        const to = node.getAttribute("data-conn-to");
        if (!from || !to || !keep.has(from) || !keep.has(to)) node.remove();
      });
    }

    const bounds = getBoundingBox(exportEls);
    const padding = exportPadding;
    const hasContent = exportEls.length > 0;
    const width = hasContent ? Math.max(320, bounds.maxX - bounds.minX + padding * 2) : 1200;
    const height = hasContent ? Math.max(240, bounds.maxY - bounds.minY + padding * 2) : 800;
    const worldRoot = clone.querySelector('[data-world-root="true"]');
    if (worldRoot) {
      worldRoot.setAttribute(
        "transform",
        hasContent
          ? `translate(${padding - bounds.minX},${padding - bounds.minY})`
          : "translate(0,0)"
      );
    }

    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
    clone.removeAttribute("class");

    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      foreignObject div { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
      foreignObject p { width: 100%; margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; line-height: 1.25; }
      foreignObject span { color: #67e8f9; font-family: Inter, Arial, sans-serif; font-weight: 700; }
    `;
    clone.insertBefore(style, clone.firstChild);

    return {
      svg: new XMLSerializer().serializeToString(clone),
      width,
      height,
    };
  };

  /** Rasterize the export SVG to a data-URL with proper error feedback. */
  const rasterize = (
    exportData: { svg: string; width: number; height: number },
    onSuccess: (dataUrl: string) => void
  ) => {
    const img = new Image();
    const svgBlob = new Blob([exportData.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = exportData.width * exportScale;
        canvas.height = exportData.height * exportScale;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.scale(exportScale, exportScale);
        if (pngBg === "dark") {
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, exportData.width, exportData.height);
        } else if (pngBg === "light") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, exportData.width, exportData.height);
        }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        onSuccess(canvas.toDataURL("image/png"));
      } catch {
        URL.revokeObjectURL(url);
        showToast("⚠️ Export render failed — try the SVG format instead.");
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast("⚠️ Could not render the board to an image. The SVG export always works.");
    };
    img.src = url;
  };

  // Export SVG
  const handleExportSVG = () => {
    const exportData = buildExportSvg();
    if (!exportData) {
      showToast("⚠️ Nothing to export yet — add some elements first.");
      return;
    }
    const blob = new Blob([exportData.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeBoard.title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    triggerConfetti();
    showToast("📥 SVG exported — check your downloads.");
    onClose();
  };

  const downloadDataUrl = (dataUrl: string, extension: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${activeBoard.title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Export raster images (PNG / JPG / WEBP) at 2x retina resolution.
  const handleExportRaster = (format: "png" | "jpeg" | "webp") => {
    const exportData = buildExportSvg();
    if (!exportData) {
      showToast("⚠️ Nothing to export yet — add some elements first.");
      return;
    }
    rasterize(exportData, (pngUrl) => {
      if (format === "png") {
        downloadDataUrl(pngUrl, "png");
        triggerConfetti();
        showToast("📥 PNG exported — check your downloads.");
        onClose();
        return;
      }
      // JPG / WEBP need a second pass through canvas to change the codec.
      const img2 = new Image();
      img2.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = exportData.width * exportScale;
        canvas.height = exportData.height * exportScale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = pngBg === "light" ? "#ffffff" : "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img2, 0, 0);
        const mime = format === "jpeg" ? "image/jpeg" : "image/webp";
        const out = canvas.toDataURL(mime, 0.95);
        const extension = format === "jpeg" ? "jpg" : "webp";
        downloadDataUrl(out, extension);
        triggerConfetti();
        showToast(`📥 ${extension.toUpperCase()} exported — check your downloads.`);
        onClose();
      };
      img2.onerror = () => showToast("⚠️ Export failed — try SVG instead.");
      img2.src = pngUrl;
    });
  };

  const handleExportPNG = () => handleExportRaster("png");

  /** Copy the rendered board straight to the system clipboard as a PNG. */
  const handleCopyImage = () => {
    const exportData = buildExportSvg();
    if (!exportData) {
      showToast("⚠️ Nothing to copy yet — add some elements first.");
      return;
    }
    rasterize(exportData, async (pngUrl) => {
      try {
        const blob = await (await fetch(pngUrl)).blob();
        const anyWindow = window as unknown as { ClipboardItem?: typeof ClipboardItem };
        if (!anyWindow.ClipboardItem || !navigator.clipboard?.write) {
          showToast("⚠️ Clipboard images unsupported here — use PNG download.");
          return;
        }
        await navigator.clipboard.write([
          new anyWindow.ClipboardItem({ "image/png": blob }),
        ]);
        setCopiedImage(true);
        showToast("📋 Board copied to clipboard as PNG.");
        setTimeout(() => setCopiedImage(false), 2000);
      } catch {
        showToast("⚠️ Clipboard blocked by the browser — use PNG download.");
      }
    });
  };

  // Export as a fitted PDF document (board-sized page, dark background)
  const handleExportPDF = () => {
    const exportData = buildExportSvg();
    if (!exportData) {
      showToast("⚠️ Nothing to export yet — add some elements first.");
      return;
    }
    rasterize(exportData, (pngUrl) => {
      try {
        const img2 = new Image();
        img2.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = exportData.width * exportScale;
          canvas.height = exportData.height * exportScale;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img2, 0, 0);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
          const orientation =
            exportData.width >= exportData.height ? "landscape" : "portrait";
          const pdf = new jsPDF({
            orientation,
            unit: "px",
            format: [exportData.width, exportData.height],
          });
          pdf.addImage(dataUrl, "JPEG", 0, 0, exportData.width, exportData.height);
          pdf.save(
            `${activeBoard.title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`
          );
          triggerConfetti();
          showToast("📄 PDF exported — check your downloads.");
          onClose();
        };
        img2.onerror = () => showToast("⚠️ PDF render failed — try SVG instead.");
        img2.src = pngUrl;
      } catch {
        showToast("⚠️ PDF library error — try the PNG export instead.");
      }
    });
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(activeBoard, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `${activeBoard.title.toLowerCase().replace(/\s+/g, "-")}.flowtrack`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    triggerConfetti();
    showToast("📥 .flowtrack project file saved.");
    onClose();
  };

  const handleExportExcalidraw = () => {
    const json = exportAsExcalidraw(activeBoard.els, activeBoard.title);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeBoard.title.toLowerCase().replace(/\s+/g, "-")}.excalidraw`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    triggerConfetti();
    showToast("✏️ Exported .excalidraw — open it on excalidraw.com");
    onClose();
  };

  // Import JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.els)) {
          onImportBoardData(parsed);
          triggerConfetti();
          showToast("📤 Loaded project successfully!");
          onClose();
        } else {
          showToast("❌ Invalid project file format.");
        }
      } catch {
        showToast("❌ Could not parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast("📋 Share link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ── Excalidraw import (file) ──────────────────────────────────────────────
  const handleExcalidrawFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const raw = String(event.target?.result || "");
      const libraryItems = parseExcalidrawLibraryItems(raw);
      if (libraryItems?.length) {
        onAddLibraryItems(libraryItems);
        triggerConfetti();
        showToast(`📚 Added ${libraryItems.length} items to the Library shelf. Open the book icon to place one.`);
        onClose();
        return;
      }
      const result = parseExcalidraw(raw);
      if (result && result.count > 0) {
        onAddElements(result.els, result.conns);
        triggerConfetti();
        showToast(`🎨 Imported ${result.count} Excalidraw shapes.`);
        onClose();
      } else {
        showToast("❌ Not a valid .excalidraw / .excalidrawlib file.");
      }
    };
    reader.readAsText(file);
  };

  // ── Excalidraw import (library URL / token) ───────────────────────────────
  const handleExcalidrawUrl = async () => {
    if (!excaliUrl.trim()) {
      showToast("⚠️ Paste an Excalidraw library link or token first.");
      return;
    }
    try {
      const parsed = new URL(excaliUrl.trim());
      if (
        parsed.hostname === "libraries.excalidraw.com" &&
        parsed.pathname === "/" &&
        parsed.searchParams.has("token")
      ) {
        window.open(excaliUrl.trim(), "_blank", "noopener,noreferrer");
        showToast("📚 Marketplace opened. Choose a library, download its .excalidrawlib file, then upload it here. The marketplace URL itself is not a library file.");
        return;
      }
    } catch {
      // Continue with raw URL/token handling.
    }
    setExcaliBusy(true);
    const libraryItems = await fetchExcalidrawLibraryItems(excaliUrl.trim());
    if (libraryItems?.length) {
      setExcaliBusy(false);
      onAddLibraryItems(libraryItems);
      triggerConfetti();
      showToast(`📚 Added ${libraryItems.length} items to the Library shelf.`);
      setExcaliUrl("");
      onClose();
      return;
    }
    const result = await fetchExcalidrawLibrary(excaliUrl.trim());
    setExcaliBusy(false);
    if (result && result.count > 0) {
      onAddElements(result.els, result.conns);
      triggerConfetti();
      showToast(`🎨 Imported ${result.count} shapes from the library.`);
      setExcaliUrl("");
      onClose();
    } else {
      showToast(
        "⚠️ Could not load that library (CORS/offline). Download the .excalidrawlib and use Choose File."
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Export & Share Whiteboard
              </h2>
              <p className="text-xs text-slate-400">
                Download as high-res images, vector SVG, or project files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Export options */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              {/* Scope */}
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Scope</p>
                <div className="flex rounded-lg bg-white/5 p-0.5">
                  <button
                    onClick={() => setExportScope("board")}
                    className={`rounded-md px-3 py-1 text-[10px] font-bold transition-colors ${
                      exportScope === "board" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Whole board
                  </button>
                  <button
                    onClick={() => setExportScope("selection")}
                    disabled={selectedEls.length === 0}
                    className={`rounded-md px-3 py-1 text-[10px] font-bold transition-colors disabled:opacity-40 ${
                      exportScope === "selection" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                    title={selectedEls.length === 0 ? "Select elements on the canvas first" : undefined}
                  >
                    Selection ({selectedEls.length})
                  </button>
                </div>
              </div>

              {/* Scale */}
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Scale</p>
                <div className="flex rounded-lg bg-white/5 p-0.5">
                  {[1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setExportScale(s)}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors ${
                        exportScale === s ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Padding */}
              <div className="space-y-1 min-w-[140px] flex-1">
                <div className="flex items-center justify-between text-[9px] text-slate-500">
                  <span className="font-bold uppercase tracking-widest">Padding</span>
                  <span className="font-mono text-slate-300">{exportPadding}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={8}
                  value={exportPadding}
                  onChange={(e) => setExportPadding(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Copy to clipboard */}
              <button
                onClick={handleCopyImage}
                className={`flex items-center gap-1.5 self-end rounded-xl px-3 py-2 text-[11px] font-bold transition-colors ${
                  copiedImage
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {copiedImage ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedImage ? "Copied!" : "Copy image"}
              </button>
            </div>
          </div>

          {/* Export Formats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* SVG */}
            <button
              onClick={handleExportSVG}
              className="bg-slate-950/80 border border-white/10 hover:border-cyan-400/60 rounded-2xl p-4 flex flex-col items-center text-center gap-2 transition-all hover:shadow-xl group"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">Vector SVG</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Scalable & clean
                </p>
              </div>
            </button>

            {/* PNG */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center gap-2">
              <button
                onClick={handleExportPNG}
                className="w-full flex flex-col items-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-slate-950 transition-all">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-white text-xs">Retina PNG</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    High-res image
                  </p>
                </div>
              </button>

              {/* PNG background toggle */}
              <div className="flex gap-1 w-full pt-1 border-t border-white/5">
                {(["dark", "light", "transparent"] as const).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setPngBg(bg)}
                    className={`flex-1 py-0.5 rounded text-[9px] font-semibold transition-colors ${
                      pngBg === bg
                        ? "bg-indigo-500 text-white font-bold"
                        : "bg-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    {bg === "transparent" ? "Trans" : bg}
                  </button>
                ))}
              </div>
            </div>

            {/* JPG / WEBP */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">JPG / WEBP</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Optimized sharing</p>
              </div>
              <div className="grid grid-cols-2 gap-1 w-full pt-1 border-t border-white/5">
                <button
                  onClick={() => handleExportRaster("jpeg")}
                  className="py-1 rounded-lg bg-white/5 hover:bg-amber-500 hover:text-slate-950 text-[10px] font-bold text-slate-300 transition-colors"
                >
                  JPG
                </button>
                <button
                  onClick={() => handleExportRaster("webp")}
                  className="py-1 rounded-lg bg-white/5 hover:bg-amber-500 hover:text-slate-950 text-[10px] font-bold text-slate-300 transition-colors"
                >
                  WEBP
                </button>
              </div>
            </div>

            {/* PDF */}
            <button
              onClick={handleExportPDF}
              className="bg-slate-950/80 border border-white/10 hover:border-rose-400/60 rounded-2xl p-4 flex flex-col items-center text-center gap-2 transition-all hover:shadow-xl group"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">PDF Document</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Print-ready board</p>
              </div>
            </button>

            {/* JSON */}
            <button
              onClick={handleExportJSON}
              className="bg-slate-950/80 border border-white/10 hover:border-cyan-400/60 rounded-2xl p-4 flex flex-col items-center text-center gap-2 transition-all hover:shadow-xl group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-slate-950 transition-all">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">Project .flowtrack</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Save full project
                </p>
              </div>
            </button>

            {/* Excalidraw export */}
            <button
              onClick={handleExportExcalidraw}
              className="bg-slate-950/80 border border-white/10 hover:border-indigo-400/60 rounded-2xl p-4 flex flex-col items-center text-center gap-2 transition-all hover:shadow-xl group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all text-lg">
                ✏️
              </div>
              <div>
                <p className="font-bold text-white text-xs">.excalidraw</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Open in Excalidraw</p>
              </div>
            </button>
          </div>

          {/* Import JSON Box */}
          <div className="bg-slate-950/60 border border-dashed border-white/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-white">
                  Import Saved Project File
                </p>
                <p className="text-[10px] text-slate-400">
                  Restore any previously downloaded .flowtrack JSON file
                </p>
              </div>
            </div>

            <label className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors">
              <span>Choose File</span>
              <input
                type="file"
                accept=".json,.flowtrack"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Excalidraw import */}
          <div className="bg-indigo-500/[0.06] border border-indigo-500/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center text-lg shrink-0">
                ✏️
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Import from Excalidraw</p>
                <p className="text-[10px] text-slate-400">
                  Drop a <b>.excalidraw</b> scene, an <b>.excalidrawlib</b> library, or paste a
                  libraries.excalidraw.com link.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={excaliUrl}
                onChange={(e) => setExcaliUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleExcalidrawUrl();
                }}
                placeholder="https://libraries.excalidraw.com/?...token=..."
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-400"
              />
              <button
                onClick={handleExcalidrawUrl}
                disabled={excaliBusy}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors shrink-0"
              >
                {excaliBusy ? "Loading…" : "Import link"}
              </button>
              <label className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer text-center shrink-0">
                <span>Choose .excalidrawlib</span>
                <input
                  type="file"
                  accept=".excalidraw,.excalidrawlib,application/json"
                  onChange={handleExcalidrawFile}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[9px] text-slate-500 leading-relaxed">
              Tip: If a link is blocked by the browser (CORS) or you are offline, click “Add to
              Excalidraw” on the library site to download the .excalidrawlib file, then use Choose file.
            </p>
          </div>

          {/* Share Link */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Shareable Workspace URL</span>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

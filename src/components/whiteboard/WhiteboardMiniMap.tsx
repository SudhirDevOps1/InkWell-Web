import React, { useState } from "react";
import { Map, Minimize2 } from "lucide-react";
import { WbElement, Point } from "../../types/whiteboard";
import { getBoundingBox } from "../../utils/whiteboardUtils";

interface WhiteboardMiniMapProps {
  els: WbElement[];
  zoom: number;
  pan: Point;
  onPanTo: (pan: Point) => void;
  canvasSize: { width: number; height: number };
}

export const WhiteboardMiniMap: React.FC<WhiteboardMiniMapProps> = ({
  els,
  zoom,
  pan,
  onPanTo,
  canvasSize,
}) => {
  const [minimized, setMinimized] = useState(false);

  if (els.length === 0 && minimized) return null;

  const box = getBoundingBox(els);
  const minX = Math.min(box.minX, 0);
  const minY = Math.min(box.minY, 0);
  const maxX = Math.max(box.maxX, 1200);
  const maxY = Math.max(box.maxY, 800);

  const mapW = 160;
  const mapH = 100;

  const totalW = Math.max(maxX - minX, 600);
  const totalH = Math.max(maxY - minY, 400);

  const scale = Math.min(mapW / totalW, mapH / totalH);

  // Viewport box in minimap coordinates
  const vpX = (-pan.x - minX) * scale;
  const vpY = (-pan.y - minY) * scale;
  const vpW = (canvasSize.width / zoom) * scale;
  const vpH = (canvasSize.height / zoom) * scale;

  const handleMinimapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldX = minX + clickX / scale;
    const worldY = minY + clickY / scale;

    onPanTo({
      x: -worldX * zoom + canvasSize.width / 2,
      y: -worldY * zoom + canvasSize.height / 2,
    });
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="bg-slate-900/90 border border-white/10 rounded-xl p-2 text-slate-400 hover:text-white shadow-xl backdrop-blur-md transition-all"
        title="Show Mini-Map"
      >
        <Map className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-md flex flex-col gap-1 w-44">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Map className="w-3 h-3 text-cyan-400" />
          Mini-Map
        </span>
        <button
          onClick={() => setMinimized(true)}
          className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          title="Minimize Mini-Map"
        >
          <Minimize2 className="w-3 h-3" />
        </button>
      </div>

      <div className="relative w-40 h-24 bg-slate-950/80 rounded-xl border border-white/5 overflow-hidden">
        <svg
          className="w-full h-full cursor-pointer"
          viewBox={`0 0 ${mapW} ${mapH}`}
          onClick={handleMinimapClick}
        >
          <g
            transform={`scale(${scale}) translate(${-minX}, ${-minY})`}
          >
            {els.map((el) => (
              <rect
                key={el.id}
                x={el.x}
                y={el.y}
                width={el.w}
                height={el.h}
                fill={el.color || "#38bdf8"}
                opacity={0.7}
                rx={4}
              />
            ))}
          </g>

          {/* Viewport Frame */}
          <rect
            x={Math.max(0, vpX)}
            y={Math.max(0, vpY)}
            width={Math.min(mapW, vpW)}
            height={Math.min(mapH, vpH)}
            fill="rgba(56, 189, 248, 0.15)"
            stroke="#38bdf8"
            strokeWidth="1.5"
            rx="2"
            className="pointer-events-none"
          />
        </svg>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface PopoverAnchor {
  x: number;
  y: number;
}

interface ToolbarPopoverProps {
  open: boolean;
  anchor: PopoverAnchor | null;
  onClose: () => void;
  title?: string;
  width?: number;
  children: React.ReactNode;
}

/**
 * Renders a floating popover in a React portal attached to <body>.
 *
 * This is critical: rendering menus INSIDE the scrollable left toolbar
 * caused them to be clipped and produced unwanted horizontal/vertical
 * scrollbars inside the toolbar. A portal escapes all overflow contexts.
 */
export function ToolbarPopover({
  open,
  anchor,
  onClose,
  title,
  width = 280,
  children,
}: ToolbarPopoverProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxHeight: number }>({
    left: 0,
    top: 0,
    maxHeight: 400,
  });

  // Keep the popover inside the viewport on all screen sizes.
  useEffect(() => {
    if (!open || !anchor) return;

    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 640;

      const panelWidth = isMobile ? Math.min(vw - 24, width) : width;
      let left = anchor.x;
      let top = anchor.y;

      if (isMobile) {
        // Center horizontally on small screens so nothing is cut off.
        left = Math.max(12, (vw - panelWidth) / 2);
        top = Math.min(anchor.y, vh * 0.35);
      } else {
        if (left + panelWidth > vw - 12) left = vw - panelWidth - 12;
        if (left < 12) left = 12;
      }

      const maxHeight = Math.max(220, vh - top - 24);
      if (top + 220 > vh) top = Math.max(12, vh - 240);

      setPos({ left, top, maxHeight });
    };

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, anchor, width]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const node = panelRef.current;
      const target = event.target as Node;
      if (node && !node.contains(target)) {
        const anchorBtn = (target as Element)?.closest?.("[data-toolbar-anchor]");
        if (!anchorBtn) onClose();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !anchor) return null;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const panelWidth = isMobile ? Math.min(window.innerWidth - 24, width) : width;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[120] rounded-2xl border border-white/10 bg-slate-900/98 p-3 shadow-2xl backdrop-blur-xl animate-zoom-in"
      style={{
        left: pos.left,
        top: pos.top,
        width: panelWidth,
        maxHeight: pos.maxHeight,
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {title && (
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <button
            onClick={onClose}
            className="rounded-lg px-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
      )}
      {children}
    </div>,
    document.body
  );
}

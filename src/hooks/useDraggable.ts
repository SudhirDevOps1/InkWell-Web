import { useEffect, useRef, useState } from "react";

/**
 * Offset-based dragging. Returns a transform offset that can be applied on
 * top of any absolutely-positioned element, plus a pointer-down handler to
 * attach to a drag handle. The element stays inside the viewport.
 */
export function useDraggable(maxTranslate?: { w: number; h: number }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const startRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    // Only primary button or touch, and don't hijack clicks on interactive children
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, textarea, a") && !(event.currentTarget as HTMLElement).hasAttribute("data-force-drag")) return;

    event.preventDefault();
    startRef.current = {
      px: event.clientX,
      py: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      let x = start.ox + (event.clientX - start.px);
      let y = start.oy + (event.clientY - start.py);

      if (maxTranslate) {
        const limX = Math.max(0, window.innerWidth - maxTranslate.w);
        const limY = Math.max(0, window.innerHeight - maxTranslate.h);
        x = Math.min(Math.max(x, -limX / 2), limX / 2 + 240);
        y = Math.min(Math.max(y, -limY / 2), limY / 2 + 200);
      }
      setOffset({ x, y });
    };
    const onUp = () => {
      startRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [maxTranslate]);

  return {
    offset,
    onPointerDown,
    style: {
      transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
      transition: startRef.current ? "none" : "transform 120ms ease-out",
    },
    reset: () => setOffset({ x: 0, y: 0 }),
  };
}

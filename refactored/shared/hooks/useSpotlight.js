/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  CAPA SHARED — Hook useSpotlight (tour / guía interactiva)║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Reemplaza la definición duplicada de useSpotlight en:    ║
 * ║  - src/pages/landing/RegisterGuided.jsx (L25-56)          ║
 * ║  - src/pages/landing/AccessGuided.jsx (L20-51)            ║
 * ║                                                           ║
 * ║  USO DESPUÉS DE MIGRACIÓN:                                ║
 * ║    import { useSpotlight } from "@shared/hooks";          ║
 * ║    const { rect, update } = useSpotlight(ref, [deps]);   ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useEffect } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useEffect : () => {};

/**
 * Hook que calcula el rectángulo de un elemento DOM para
 * dibujar spotlights, tooltips y tours interactivos.
 *
 * @param {React.RefObject} targetRef - Ref del elemento target
 * @param {any[]}           deps      - Dependencias para re-medir
 * @returns {{ rect: object|null, update: () => void }}
 */
export function useSpotlight(targetRef, deps = []) {
  const [rect, setRect] = useState(null);

  const update = useCallback(() => {
    if (!targetRef?.current || typeof window === "undefined") return;
    const r = targetRef.current.getBoundingClientRect();
    const margin = 10;
    setRect({
      top: Math.max(8, r.top - margin + window.scrollY),
      left: Math.max(8, r.left - margin + window.scrollX),
      width: r.width + margin * 2,
      height: r.height + margin * 2,
      centerX: r.left + r.width / 2 + window.scrollX,
      centerY: r.top + r.height / 2 + window.scrollY,
      vw: window.innerWidth,
      vh: window.innerHeight,
    });
  }, [targetRef]);

  useIsomorphicLayoutEffect(() => {
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { rect, update };
}

export default useSpotlight;

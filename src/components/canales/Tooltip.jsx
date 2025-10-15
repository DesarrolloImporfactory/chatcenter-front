// src/components/canales/Tooltip.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function ThWithTooltip({ label, tip }) {
  const thRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !thRef.current) return;
    const r = thRef.current.getBoundingClientRect();
    // ▶️ Colocar el tooltip ENCIMA del th (10px de separación)
    setPos({
      top: r.top + window.scrollY - 10, // arriba del th
      left: r.left + window.scrollX + r.width / 2, // centrado
    });
  }, [open]);

  return (
    <th
      ref={thRef}
      scope="col"
      className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="inline-flex items-center gap-2">
        <span>{label}</span>
        {tip && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px]
                       border-gray-300 text-gray-600 bg-white select-none"
            aria-label={`Ayuda: ${label}`}
            title="" // evita tooltip nativo del browser
          >
            i
          </span>
        )}
      </div>

      {open &&
        tip &&
        createPortal(
          <div
            // posición absoluta en el body para evitar clipping
            style={{
              position: "absolute",
              top: pos.top, // top calculado arriba del th
              left: pos.left,
              transform: "translate(-50%, -100%)", // ancla por arriba
              zIndex: 9999,
            }}
          >
            <div className="relative pointer-events-none">
              {/* CUERPO */}
              <div
                className="max-w-sm text-xs leading-relaxed text-white bg-gray-900
                              border border-gray-800 rounded-md shadow-2xl px-3 py-2"
              >
                {typeof tip === "string" ? <div>{tip}</div> : tip}
              </div>
              {/* FLECHITA: abajo del globito, apuntando hacia el th */}
              <div
                className="h-2 w-2 bg-gray-900 border-l border-t border-gray-800 rotate-45 mx-auto"
                style={{ marginTop: "-1px" }}
              />
            </div>
          </div>,
          document.body
        )}
    </th>
  );
}

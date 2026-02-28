import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DateRange } from "react-date-range";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

// YYYY-MM-DD
function toISODate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseISOToDate(iso) {
  if (!iso || typeof iso !== "string") return null;
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

function clampDate(date, minDate, maxDate) {
  const t = date.getTime();
  if (minDate && t < minDate.getTime()) return new Date(minDate);
  if (maxDate && t > maxDate.getTime()) return new Date(maxDate);
  return date;
}

export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Popover position (Portal fixed)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 340 });

  // ✅ Años permitidos (ajuste aquí)
  // Recomendación: 2023 (si quiere “más enterprise”: 2022)
  const minDate = useMemo(() => new Date(2023, 0, 1), []);
  const maxDate = useMemo(() => new Date(), []);

  // Valores aplicados (from/to)
  const startAppliedRaw = useMemo(
    () => parseISOToDate(value?.from) || new Date(),
    [value?.from],
  );
  const endAppliedRaw = useMemo(
    () => parseISOToDate(value?.to) || new Date(),
    [value?.to],
  );

  const startApplied = useMemo(
    () => clampDate(startAppliedRaw, minDate, maxDate),
    [startAppliedRaw, minDate, maxDate],
  );
  const endApplied = useMemo(
    () => clampDate(endAppliedRaw, minDate, maxDate),
    [endAppliedRaw, minDate, maxDate],
  );

  // Draft interno (lo que el usuario está tocando en el calendario)
  const [draft, setDraft] = useState({
    startDate: startApplied,
    endDate: endApplied,
  });

  // Mantener draft sincronizado si el padre cambia (reset externo)
  useEffect(() => {
    setDraft({ startDate: startApplied, endDate: endApplied });
  }, [startApplied, endApplied]);

  const range = useMemo(
    () => ({
      startDate: draft.startDate,
      endDate: draft.endDate,
      key: "selection",
    }),
    [draft],
  );

  const updatePosition = () => {
    const el = inputRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const margin = 8;

    let left = rect.left;
    let top = rect.bottom + margin;
    const width = Math.max(rect.width, 340);

    const maxLeft = window.innerWidth - width - 12;
    if (left > maxLeft) left = Math.max(12, maxLeft);

    const estimatedHeight = 360;
    if (top + estimatedHeight > window.innerHeight) {
      top = rect.top - margin - estimatedHeight;
    }

    setPos({ top, left, width });
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);

    if (next) {
      // ✅ al abrir, limpiamos “selección en progreso” reseteando draft a lo aplicado
      setDraft({ startDate: startApplied, endDate: endApplied });

      requestAnimationFrame(updatePosition);
    }
  };

  const handleChange = (ranges) => {
    const selection = ranges.selection;

    const s = clampDate(selection.startDate, minDate, maxDate);
    const e = clampDate(selection.endDate, minDate, maxDate);

    setDraft({ startDate: s, endDate: e });

    // ✅ Emitimos al padre (from/to)
    const from = toISODate(s);
    const to = toISODate(e);
    onChange({ from, to });

    // ✅ Cerrar solo cuando ya seleccionó rango real (no al primer click)
    // Nota: al primer click, muchas veces e == s (un solo día)
    const isRangeSelected = s && e && s.getTime() !== e.getTime();
    if (isRangeSelected) setOpen(false);
  };

  // cerrar al click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!open) return;

      const w = wrapperRef.current;
      const pop = document.getElementById("date-range-portal-popover");

      const clickedInWrapper = w?.contains(event.target);
      const clickedInPopover = pop?.contains(event.target);

      if (!clickedInWrapper && !clickedInPopover) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // recalcular posición si hay scroll/resize y está abierto
  useEffect(() => {
    if (!open) return;

    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    updatePosition();

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // texto del input siempre representa LO APLICADO (no el draft)
  const inputValue = `${format(startApplied, "dd/MM/yyyy")} - ${format(
    endApplied,
    "dd/MM/yyyy",
  )}`;

  return (
    <div ref={wrapperRef} className="relative min-w-[260px] shrink-0">
      <div className="mb-1 text-[11px] font-medium text-slate-500">
        Rango de fechas
      </div>

      <input
        ref={inputRef}
        readOnly
        onClick={handleToggle}
        value={inputValue}
        className="
          h-[42px] w-full rounded-xl border border-slate-200 bg-white
          px-3 text-sm text-slate-900 cursor-pointer
          focus:border-[#2b7cff] focus:ring-2 focus:ring-[#2b7cff]/15
        "
      />

      {open &&
        createPortal(
          <div
            id="date-range-portal-popover"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              width: pos.width,
            }}
            className="rounded-xl border border-slate-200 bg-white shadow-2xl"
          >
            <DateRange
              editableDateInputs
              onChange={handleChange}
              moveRangeOnFirstSelection={false}
              ranges={[range]}
              locale={es}
              rangeColors={["#2b7cff"]}
              minDate={minDate}
              maxDate={maxDate}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

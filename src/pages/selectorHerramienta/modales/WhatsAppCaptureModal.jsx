import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import chatApi from "../../../api/chatcenter";

const PAISES = [
  { code: "+593", flag: "🇪🇨", name: "Ecuador" },
  { code: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "+51", flag: "🇵🇪", name: "Perú" },
  { code: "+52", flag: "🇲🇽", name: "México" },
  { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "+55", flag: "🇧🇷", name: "Brasil" },
  { code: "+58", flag: "🇻🇪", name: "Venezuela" },
  { code: "+591", flag: "🇧🇴", name: "Bolivia" },
  { code: "+595", flag: "🇵🇾", name: "Paraguay" },
  { code: "+598", flag: "🇺🇾", name: "Uruguay" },
  { code: "+507", flag: "🇵🇦", name: "Panamá" },
  { code: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { code: "+34", flag: "🇪🇸", name: "España" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
];

/* ═══════════════════════════════════════════════════════════
   PaisSelect con portal + buscador
   - Dropdown se renderiza en document.body (no le afecta overflow)
   - Buscador con auto-focus filtra por nombre/código
   - Cierra con Escape o click fuera
   ═══════════════════════════════════════════════════════════ */
const PaisSelect = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 260 });
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const updateCoords = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 260;
      const desiredLeft = rect.left;
      const maxLeft = window.innerWidth - width - 8;
      setCoords({
        top: rect.bottom + 4,
        left: Math.min(desiredLeft, Math.max(8, maxLeft)),
        width,
      });
    };
    updateCoords();

    setTimeout(() => inputRef.current?.focus(), 60);

    const handleClickOutside = (e) => {
      if (
        !btnRef.current?.contains(e.target) &&
        !dropdownRef.current?.contains(e.target)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", updateCoords);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open]);

  const sel = PAISES.find((p) => p.code === value) || PAISES[0];

  const q = query.toLowerCase().trim();
  const qDigits = q.replace(/[^\d]/g, "");
  const filtered = !q
    ? PAISES
    : PAISES.filter((p) => {
        const matchName = p.name.toLowerCase().includes(q);
        const matchCodeText = p.code.toLowerCase().includes(q);
        const matchCodeDigits = qDigits && p.code.includes(qDigits);
        return matchName || matchCodeText || matchCodeDigits;
      });

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-50 transition text-xs"
      >
        <span className="text-base leading-none">{sel.flag}</span>
        <span className="font-medium text-[#0B1426]">{sel.code}</span>
        <svg
          className="w-3 h-3 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
                zIndex: 100000,
              }}
            >
              {/* Buscador */}
              <div className="p-2 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                  <svg
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar país..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-md border border-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Lista */}
              <ul className="max-h-[260px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <li className="px-3 py-4 text-xs text-slate-400 text-center">
                    No encontramos ese país
                  </li>
                ) : (
                  filtered.map((p) => (
                    <li key={p.code}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(p.code);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-emerald-50 text-left transition ${
                          value === p.code ? "bg-emerald-50/70" : ""
                        }`}
                      >
                        <span className="text-base">{p.flag}</span>
                        <span className="text-[#0B1426] flex-1">{p.name}</span>
                        <span className="text-slate-500 font-mono">
                          {p.code}
                        </span>
                        {value === p.code && (
                          <svg
                            className="w-3.5 h-3.5 text-emerald-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════════
   Modal — superpuesto, no se puede cerrar sin guardar
   ═══════════════════════════════════════════════════════════ */
export default function WhatsAppCaptureModal({ id_usuario, onSuccess }) {
  const [pais, setPais] = useState("+593");
  const [numero, setNumero] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleGuardar = async () => {
    setError("");
    const digits = numero.replace(/\D/g, "");
    if (digits.length < 7) {
      setError("Mínimo 7 dígitos.");
      return;
    }

    setSaving(true);
    try {
      await chatApi.post("usuarios_chat_center/actualizarWhatsappLead", {
        id_usuario,
        whatsapp_lead: digits,
        whatsapp_lead_pais: pais,
      });
      onSuccess?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center px-4"
      style={{
        background: "rgba(11, 20, 38, 0.85)",
        backdropFilter: "blur(8px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] overflow-hidden"
      >
        {/* Header */}
        <div
          className="p-6 pb-5"
          style={{
            background: "linear-gradient(135deg, #0B1426 0%, #132743 100%)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-xl grid place-items-center"
              style={{ background: "rgba(16,185,129,0.15)" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#10B981">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                Último paso
              </p>
              <h2 className="text-lg font-extrabold text-white leading-tight">
                Confírmanos tu WhatsApp
              </h2>
            </div>
          </div>
          <p className="text-[12px] text-slate-400 leading-relaxed">
            Lo usamos solo para enviarte alertas importantes de tu cuenta y
            novedades del sistema. No spam.
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            Tu número de WhatsApp Personal
          </label>
          <div
            className={`flex items-stretch gap-1 rounded-xl border-2 bg-white pr-4 transition-all ${
              error
                ? "border-rose-400"
                : "border-slate-200 focus-within:border-emerald-600 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.08)]"
            }`}
          >
            <div className="flex items-center pl-3 border-r border-slate-100">
              <PaisSelect value={pais} onChange={setPais} />
            </div>
            <input
              type="tel"
              placeholder="99 123 4567"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="flex-1 py-3 px-3 text-sm bg-transparent text-[#0B1426] placeholder-slate-400 outline-none"
              autoFocus
              disabled={saving}
            />
          </div>
          {error && <p className="text-rose-500 text-xs mt-2">{error}</p>}

          <button
            type="button"
            onClick={handleGuardar}
            disabled={saving || !numero.trim()}
            className="w-full mt-5 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 shadow-lg"
            style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
          >
            {saving ? "Guardando..." : "Continuar al ecosistema"}
          </button>

          <p className="text-[10px] text-slate-400 text-center mt-3 leading-relaxed">
            Tu número queda guardado solo en tu cuenta. Lo puedes cambiar
            después en el panel de usuarios.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

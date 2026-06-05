import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Modal de selección de conexiones a CONSERVAR cuando un downgrade reduce el
 * límite de conexiones del plan del cliente.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - conexiones: [{ id, nombre_configuracion, telefono, conectado }]
 *  - limite: number   → total que puede conservar (plan + addon)
 *  - addon: number    → cuántas de ese total vienen del COMPLEMENTO
 *                       (lo del plan se calcula: base = limite - addon)
 *  - planNombre: string
 *  - fechaEfectiva: string|Date
 *  - loading: boolean
 *  - onConfirm: (idsSuspender: number[]) => void
 */
const palabraConexion = (n) => (n === 1 ? "conexión" : "conexiones");

const ModalSeleccionConexiones = ({
  open,
  onClose,
  conexiones = [],
  limite = 1,
  addon = 0,
  planNombre = "",
  fechaEfectiva = null,
  loading = false,
  onConfirm,
}) => {
  const [conservar, setConservar] = useState([]);

  useEffect(() => {
    if (open) setConservar([]);
  }, [open, conexiones]);

  const aDesactivar = Math.max(0, conexiones.length - limite);
  const extra = Number(addon || 0);
  const base = Math.max(0, limite - extra); // lo que aporta el plan

  const fechaTexto = fechaEfectiva
    ? `el ${new Date(fechaEfectiva).toLocaleDateString("es-EC", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`
    : "al final de tu período actual";

  const fmtTelefono = (t) => {
    const s = String(t || "");
    return s.length > 6 ? `+${s}` : s;
  };

  const toggle = (id) => {
    setConservar((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= limite) return prev;
      return [...prev, id];
    });
  };

  const puedeConfirmar = conservar.length === limite && !loading;

  const idsSuspender = useMemo(
    () => conexiones.filter((c) => !conservar.includes(c.id)).map((c) => c.id),
    [conexiones, conservar],
  );

  if (!open) return null;

  const containerVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
    exit: { opacity: 0, y: 12, transition: { duration: 0.2 } },
  };

  return (
    <div className="fixed inset-0 bg-[#0a1a36]/50 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key="modal-susp"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Cabecera */}
          <div className="relative bg-gradient-to-br from-[#0a1a36] via-[#102a5c] to-[#1e4fd6] px-6 pt-6 pb-7 text-center">
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label="Cerrar"
            >
              <i className="fas fa-times text-sm"></i>
            </button>

            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
              <i className="bx bx-list-check text-2xl"></i>
            </span>
            <h3 className="mt-3 text-base font-bold tracking-tight text-white">
              Elige las conexiones que deseas conservar
            </h3>

            {/* Texto explícito: separa lo del plan y lo del complemento */}
            <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-[1.45] text-white/75">
              {extra > 0 ? (
                <>
                  El <b className="text-white">{planNombre}</b> incluye{" "}
                  <b className="text-white">{base}</b> {palabraConexion(base)};
                  con tu complemento (<b className="text-white">+{extra}</b>)
                  podrás conservar <b className="text-white">{limite}</b> en
                  total.
                </>
              ) : (
                <>
                  El <b className="text-white">{planNombre}</b> incluye{" "}
                  <b className="text-white">{limite}</b>{" "}
                  {palabraConexion(limite)}.
                </>
              )}{" "}
              Hoy tienes <b className="text-white">{conexiones.length}</b>{" "}
              conexiones activas, así que{" "}
              <b className="text-white">{aDesactivar}</b> se desactivará
              {aDesactivar === 1 ? "" : "n"} {fechaTexto}.
            </p>
          </div>

          {/* Cuerpo */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-[12px] font-semibold text-slate-600">
                Selecciona las conexiones que quieres mantener
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  conservar.length === limite
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {conservar.length} / {limite}
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {conexiones.map((c) => {
                const sel = conservar.includes(c.id);
                const bloqueada = !sel && conservar.length >= limite;
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    disabled={loading || bloqueada}
                    className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                      sel
                        ? "border-[#1d4ed8] bg-[#eff6ff]"
                        : bloqueada
                          ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                          : "border-slate-200 bg-white hover:border-[#1d4ed8]/40"
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                        sel
                          ? "border-[#1d4ed8] bg-[#1d4ed8] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {sel && <i className="bx bx-check text-sm"></i>}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-[#171931] truncate">
                        {c.nombre_configuracion || "Sin nombre"}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {fmtTelefono(c.telefono)}
                      </span>
                    </span>
                    {Number(c.conectado) === 1 && (
                      <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                        Conectada
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="flex items-start gap-1.5 mt-3 px-0.5 text-[10px] leading-[1.35] text-slate-400">
              <i className="bx bx-info-circle text-[12px] mt-px"></i>
              <span>
                Las conexiones que no selecciones se desactivarán
                automáticamente al aplicarse el cambio. Podrás reactivarlas si
                vuelves a subir de plan.
              </span>
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end bg-gray-50/60 px-5 py-4 border-t border-gray-100 gap-2.5">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm?.(idsSuspender)}
              disabled={!puedeConfirmar}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d4ed8] text-sm text-white font-semibold hover:bg-[#1e40af] shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <i
                className={`bx ${loading ? "bx-loader-alt bx-spin" : "bx-check"}`}
              ></i>
              {loading ? "Programando…" : "Confirmar bajada"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ModalSeleccionConexiones;

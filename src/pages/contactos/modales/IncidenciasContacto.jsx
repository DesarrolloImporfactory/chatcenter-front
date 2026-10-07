// Incidencias de un contacto desde el kanban (/estado_contactos).
//
// La tarjeta muestra solo la última incidencia; este modal trae la bitácora
// completa (mismo endpoint que el panel derecho de /chat) y deja registrar
// una nueva o borrar las propias sin abrir el chat. Los casos (Escalar /
// Oportunidad) se crean y resuelven desde el chat: acá solo se ven.
//
// `onChange(resumen)` avisa a la tarjeta con el mismo formato que devuelve
// el back en `contacto.incidencias` ({ total, casos_abiertos, ultima }).
import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";
import { CHIPS } from "../../../components/chat/IncidenciasCliente";

export const TIPOS_CASO = {
  escalamiento: { badge: "Escalado", icon: "bx-error", color: "#be123c", bg: "rgba(244,63,94,.10)", border: "rgba(244,63,94,.30)" },
  oportunidad: { badge: "Oportunidad", icon: "bx-trending-up", color: "#047857", bg: "rgba(16,185,129,.10)", border: "rgba(16,185,129,.30)" },
};

export const ESTADO_CASO = {
  sin_resolver: { txt: "Sin resolver", color: "#b45309" },
  en_espera: { txt: "En espera", color: "#0369a1" },
  resuelto: { txt: "Resuelto", color: "#047857" },
};

/** Estado de un caso tal como lo lista el back del chat (estado_caso o escalado_resuelto). */
export const estadoDeCaso = (it) =>
  it.estado || it.estado_caso || (Number(it.escalado_resuelto) ? "resuelto" : "sin_resolver");

/** Resumen para la tarjeta a partir de la lista completa (orden ASC del back). */
const resumenDe = (items) => {
  if (!items.length) return null;
  const ultima = items[items.length - 1];
  return {
    total: items.length,
    casos_abiertos: items.filter((i) => i.tipo && estadoDeCaso(i) !== "resuelto").length,
    ultima: {
      id: ultima.id,
      descripcion: ultima.descripcion,
      autor_nombre: ultima.autor_nombre,
      created_at: ultima.created_at,
      tipo: ultima.tipo || null,
      estado: ultima.tipo ? estadoDeCaso(ultima) : null,
    },
  };
};

const fmt = (d) => {
  const x = new Date(d);
  if (isNaN(+x)) return "";
  return x.toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function IncidenciasContacto({ contacto, idConfiguracion, onClose, onChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  const clienteId = contacto?.id;
  const nombre =
    [contacto?.nombre_cliente, contacto?.apellido_cliente].filter(Boolean).join(" ") ||
    "Sin nombre";

  const cargar = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    try {
      const { data } = await chatApi.get("/incidencias_chat_center", {
        params: { id_cliente: clienteId },
        silentError: true,
      });
      setItems(Array.isArray(data?.data) ? data.data : []);
    } catch (_) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Cerrar con Escape (si hay un confirm de Swal abierto, Escape es para él)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !Swal.isVisible()) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const publicar = (lista) => {
    setItems(lista);
    onChange?.(resumenDe(lista));
  };

  const addChip = (frase) =>
    setTexto((t) => (t.trim() ? `${t.trim()}. ${frase}` : frase));

  const agregar = async () => {
    const desc = texto.trim();
    if (!desc || saving) return;
    setSaving(true);
    try {
      const { data } = await chatApi.post(
        "/incidencias_chat_center",
        { id_cliente: clienteId, id_configuracion: idConfiguracion, descripcion: desc },
        { silentError: true },
      );
      if (data?.data) publicar([...items, data.data]);
      setTexto("");
    } catch (_) {
      Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        confirmButtonColor: "#1d4ed8",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id) => {
    const r = await Swal.fire({
      icon: "warning",
      title: "Borrar incidencia",
      text: "¿Seguro que deseas borrarla?",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      reverseButtons: true,
      customClass: { popup: "rounded-2xl" },
    });
    if (!r.isConfirmed) return;
    try {
      await chatApi.delete(`/incidencias_chat_center/${id}`, { silentError: true });
      publicar(items.filter((x) => x.id !== id));
    } catch (_) {
      Swal.fire({ icon: "error", title: "No se pudo borrar", confirmButtonColor: "#1d4ed8" });
    }
  };

  if (!contacto) return null;

  // Más reciente arriba: lo que se quiere ver es lo último que pasó
  const lista = [...items].reverse();

  return createPortal(
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10,10,20,.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 520, maxHeight: "88vh", boxShadow: "0 32px 80px rgba(0,0,0,.25)" }}
      >
        {/* Cabecera */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
          <div className="h-9 w-9 rounded-xl bg-cyan-50 text-cyan-600 grid place-items-center shrink-0">
            <i className="bx bx-notepad text-xl" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-bold text-slate-900 leading-tight">Incidencias</h3>
            <p className="text-xs text-slate-500 truncate">
              {nombre}
              {contacto.celular_cliente ? ` · ${contacto.celular_cliente}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              window.open(`/chat/${contacto.id}`, "_blank", "noopener,noreferrer")
            }
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50"
            title="Abrir la conversación"
          >
            Abrir chat <i className="bx bx-right-arrow-alt text-sm" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* Alta rápida */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 bg-slate-50/60">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => addChip(c)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-cyan-400 hover:text-cyan-700 transition"
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-stretch">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) agregar();
              }}
              placeholder="Escribe qué pasó con el cliente… (Ctrl+Enter para guardar)"
              rows={2}
              maxLength={2000}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-800 outline-none resize-none focus:border-cyan-400 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={agregar}
              disabled={saving || !texto.trim()}
              className="shrink-0 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className={`bx ${saving ? "bx-loader-alt animate-spin" : "bx-plus"} text-base`} />
              Agregar
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto px-5 py-3 flex-1">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Cargando…</p>
          ) : lista.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Aún no hay incidencias registradas
            </p>
          ) : (
            <ul className="space-y-2">
              {lista.map((it) => {
                const caso = TIPOS_CASO[it.tipo];
                const est = caso ? ESTADO_CASO[estadoDeCaso(it)] : null;
                return (
                  <li
                    key={it.id}
                    className="group rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
                  >
                    {caso && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold"
                          style={{ color: caso.color, background: caso.bg, borderColor: caso.border }}
                        >
                          <i className={`bx ${caso.icon} text-[11px]`} />
                          {caso.badge}
                        </span>
                        {it.destino_nombre && (
                          <span className="text-[10px] text-slate-500">→ {it.destino_nombre}</span>
                        )}
                        {est && (
                          <span className="ml-auto text-[10px] font-semibold" style={{ color: est.color }}>
                            {est.txt}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] text-slate-800 leading-snug whitespace-pre-wrap flex-1">
                        {it.descripcion}
                      </p>
                      {it.propia && !it.tipo && (
                        <button
                          type="button"
                          onClick={() => eliminar(it.id)}
                          title="Borrar"
                          className="shrink-0 text-slate-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                        >
                          <i className="bx bx-trash text-base" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {it.autor_nombre} · {fmt(it.created_at)}
                    </p>
                    {it.resolucion_comentario && (
                      <p className="text-[11px] text-emerald-700 mt-1.5 bg-emerald-50 rounded-lg px-2 py-1">
                        <i className="bx bx-check-circle mr-1" />
                        {it.resolucion_comentario}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

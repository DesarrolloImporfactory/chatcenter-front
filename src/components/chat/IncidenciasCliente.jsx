import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

// Frases rápidas que rellenan el texto (editable después).
const CHIPS = [
  "No contestó",
  "Número equivocado",
  "Se escribió por WhatsApp",
  "Reagendó llamada",
  "Confirmó pedido",
  "Pidió más info",
];

export default function IncidenciasCliente({ clienteId, idConfiguracion }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
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
    fetchItems();
  }, [fetchItems]);

  if (!clienteId) return null;

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
      if (data?.data) setItems((prev) => [...prev, data.data]);
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
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (_) {
      Swal.fire({ icon: "error", title: "No se pudo borrar", confirmButtonColor: "#1d4ed8" });
    }
  };

  const fmt = (d) => {
    const x = new Date(d);
    if (isNaN(+x)) return "";
    return x.toLocaleString("es-EC", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const ultimo = items.length ? items[items.length - 1] : null;

  return (
    <div className="px-3 py-2.5 bg-[#0d1a30] border-t border-white/10">
      {/* Header */}
      <button type="button" onClick={() => setExpanded((p) => !p)} className="w-full group">
        <div className="flex items-center justify-between">
          <p className="text-[9px] text-white/45 uppercase tracking-[0.15em] flex items-center gap-1 font-semibold">
            <i className="bx bx-notepad text-[11px] text-cyan-400" />
            Incidencias
            {!loading && items.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center h-3.5 min-w-[14px] px-1 rounded-full bg-cyan-500/20 text-[9px] text-cyan-300 font-medium">
                {items.length}
              </span>
            )}
          </p>
          <i
            className={`bx bx-chevron-down text-white/40 text-[14px] transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>

        {/* Preview colapsado: última incidencia */}
        {!loading && ultimo && !expanded && (
          <div className="flex items-center gap-2 mt-2 mb-0.5 text-left">
            <div className="h-6 w-6 rounded-md bg-cyan-500/15 flex items-center justify-center shrink-0">
              <i className="bx bx-message-square-dots text-[12px] text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-white/75 truncate">{ultimo.descripcion}</p>
              <p className="text-[9px] text-white/35 truncate">
                {ultimo.autor_nombre} · {fmt(ultimo.created_at)}
              </p>
            </div>
          </div>
        )}
      </button>

      {/* Expandido */}
      {expanded && (
        <div className="mt-2.5 space-y-2.5">
          {/* Chips rápidos */}
          <div className="flex flex-wrap gap-1">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => addChip(c)}
                className="text-[9px] px-2 py-1 rounded-full bg-white/[0.05] border border-white/10 text-white/60 hover:text-white hover:border-cyan-400/40 transition"
              >
                {c}
              </button>
            ))}
          </div>

          {/* Campo + agregar */}
          <div className="space-y-1.5">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe qué pasó con el cliente…"
              rows={2}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white outline-none resize-none focus:border-cyan-400/50 placeholder:text-white/25"
            />
            <button
              type="button"
              onClick={agregar}
              disabled={saving || !texto.trim()}
              className="w-full px-3 py-2 rounded-lg bg-cyan-500/[0.14] hover:bg-cyan-500/[0.24] border border-cyan-400/[0.22] text-[11px] font-semibold text-cyan-300 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <i className={`bx ${saving ? "bx-loader-alt animate-spin" : "bx-plus"} text-sm`} />
              {saving ? "Guardando…" : "Agregar incidencia"}
            </button>
          </div>

          {/* Lista */}
          {loading ? (
            <p className="text-[10px] text-white/30 text-center py-2">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-[10px] text-white/30 text-center py-2">
              Aún no hay incidencias registradas
            </p>
          ) : (
            <div className="space-y-1.5">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-2 group/it"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] text-white/80 leading-snug whitespace-pre-wrap flex-1">
                      {it.descripcion}
                    </p>
                    {it.propia && (
                      <button
                        type="button"
                        onClick={() => eliminar(it.id)}
                        title="Borrar"
                        className="shrink-0 text-white/25 hover:text-rose-400 transition opacity-0 group-hover/it:opacity-100"
                      >
                        <i className="bx bx-trash text-[13px]" />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-white/35 mt-1">
                    {it.autor_nombre} · {fmt(it.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

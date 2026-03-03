import React, { useState, useEffect, useRef, useCallback } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

/**
 * Props:
 *  - clienteId : id del cliente_chat_center (viene de selectedChat?.id)
 *
 * id_configuracion se lee internamente desde localStorage
 */
export default function EtiquetasCustomSelect({ clienteId }) {
  const [asesorOptions, setAsesorOptions] = useState([]);
  const [cicloOptions, setCicloOptions] = useState([]);

  const [selectedAsesor, setSelectedAsesor] = useState(null);
  const [selectedCiclo, setSelectedCiclo] = useState(null);

  const [loading, setLoading] = useState(true);

  // Leer id_configuracion desde localStorage
  const getIdConfiguracion = () => localStorage.getItem("id_configuracion");

  // ── Carga inicial ──────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!clienteId) return;

    const id_configuracion = getIdConfiguracion();
    if (!id_configuracion) return;

    setLoading(true);
    try {
      const [resAsesor, resCiclo, resCliente] = await Promise.all([
        chatApi.get(
          `/etiquetas_custom_chat_center/listar?tipo=asesor&id_configuracion=${id_configuracion}`,
        ),
        chatApi.get(
          `/etiquetas_custom_chat_center/listar?tipo=ciclo&id_configuracion=${id_configuracion}`,
        ),
        chatApi.get(`/etiquetas_custom_chat_center/cliente/${clienteId}`),
      ]);

      setAsesorOptions(resAsesor.data?.data || []);
      setCicloOptions(resCiclo.data?.data || []);

      const c = resCliente.data?.data || {};
      setSelectedAsesor(c.id_etiqueta_asesor || null);
      setSelectedCiclo(c.id_etiqueta_ciclo || null);
    } catch (err) {
      console.error("Error cargando etiquetas custom:", err);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Asignar ────────────────────────────────────────
  const handleAssign = async (tipo, id_etiqueta) => {
    try {
      await chatApi.post("/etiquetas_custom_chat_center/asignar", {
        id_cliente: clienteId,
        tipo,
        id_etiqueta: id_etiqueta || null,
      });

      if (tipo === "asesor") setSelectedAsesor(id_etiqueta || null);
      else setSelectedCiclo(id_etiqueta || null);
    } catch (err) {
      console.error("Error asignando etiqueta:", err);
    }
  };

  // ── Crear nueva opción ─────────────────────────────
  const handleCreate = async (tipo) => {
    const { value: nombre } = await Swal.fire({
      title: `Nueva opción de ${tipo === "asesor" ? "Asesor" : "Ciclo"}`,
      input: "text",
      inputPlaceholder: "Escribe el nombre…",
      showCancelButton: true,
      confirmButtonText: "Crear",
      cancelButtonText: "Cancelar",
      inputValidator: (v) => {
        if (!v?.trim()) return "El nombre no puede estar vacío";
      },
    });

    if (!nombre) return;

    const id_configuracion = getIdConfiguracion();
    if (!id_configuracion) return;

    try {
      const { data } = await chatApi.post(
        "/etiquetas_custom_chat_center/crear",
        {
          tipo,
          nombre: nombre.trim(),
          id_configuracion,
        },
      );

      const newOpt = data.data; // { id, nombre }

      if (tipo === "asesor") {
        setAsesorOptions((prev) => {
          const exists = prev.some((o) => o.id === newOpt.id);
          if (exists) return prev;
          return [...prev, newOpt].sort((a, b) =>
            a.nombre.localeCompare(b.nombre),
          );
        });
        // Auto-asignar
        handleAssign("asesor", newOpt.id);
      } else {
        setCicloOptions((prev) => {
          const exists = prev.some((o) => o.id === newOpt.id);
          if (exists) return prev;
          return [...prev, newOpt].sort((a, b) =>
            a.nombre.localeCompare(b.nombre),
          );
        });
        handleAssign("ciclo", newOpt.id);
      }
    } catch (err) {
      console.error("Error creando opción:", err);
      Swal.fire("Error", "No se pudo crear la opción", "error");
    }
  };

  // ── Eliminar opción ────────────────────────────────
  const handleDelete = async (tipo, id) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar esta opción?",
      text: "Se removerá de todos los clientes que la tengan asignada.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    const id_configuracion = getIdConfiguracion();
    if (!id_configuracion) return;

    try {
      await chatApi.delete(
        `/etiquetas_custom_chat_center/eliminar/${id}?id_configuracion=${id_configuracion}`,
      );

      if (tipo === "asesor") {
        setAsesorOptions((prev) => prev.filter((o) => o.id !== id));
        if (selectedAsesor === id) setSelectedAsesor(null);
      } else {
        setCicloOptions((prev) => prev.filter((o) => o.id !== id));
        if (selectedCiclo === id) setSelectedCiclo(null);
      }
    } catch (err) {
      console.error("Error eliminando opción:", err);
      Swal.fire("Error", "No se pudo eliminar la opción", "error");
    }
  };

  if (!clienteId) return null;

  return (
    <div className="px-5 py-4 bg-[#0d1a30] border-t border-white/10">
      <p className="text-[11px] text-white/45 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <i className="bx bx-purchase-tag text-sm text-violet-400" />
        Etiquetas adicionales
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Asesor */}
        <CustomSelectField
          label="Asesor"
          icon="bx-user-voice"
          iconColor="text-sky-400"
          options={asesorOptions}
          selected={selectedAsesor}
          loading={loading}
          onChange={(val) => handleAssign("asesor", val)}
          onCreate={() => handleCreate("asesor")}
          onDelete={(id) => handleDelete("asesor", id)}
        />

        {/* Ciclo */}
        <CustomSelectField
          label="Ciclo"
          icon="bx-revision"
          iconColor="text-emerald-400"
          options={cicloOptions}
          selected={selectedCiclo}
          loading={loading}
          onChange={(val) => handleAssign("ciclo", val)}
          onCreate={() => handleCreate("ciclo")}
          onDelete={(id) => handleDelete("ciclo", id)}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Sub-componente: Select con dropdown custom
// ──────────────────────────────────────────────────────────
function CustomSelectField({
  label,
  icon,
  iconColor,
  options,
  selected,
  loading,
  onChange,
  onCreate,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedName = options.find((o) => o.id === selected)?.nombre;

  return (
    <div ref={ref} className="relative">
      <p className="text-[10px] text-white/40 mb-1 flex items-center gap-1">
        <i className={`bx ${icon} text-xs ${iconColor}`} />
        {label}
      </p>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`
          w-full flex items-center justify-between gap-2
          bg-white/5 border border-white/10 rounded-lg
          px-3 py-2 text-sm text-left
          hover:bg-white/10 hover:border-white/20
          transition-all duration-200
          ${open ? "border-violet-400/50 bg-white/8" : ""}
        `}
        disabled={loading}
      >
        <span
          className={selectedName ? "text-white/90" : "text-white/35 italic"}
        >
          {loading ? "Cargando…" : selectedName || "Sin asignar"}
        </span>
        <i
          className={`bx bx-chevron-down text-white/40 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#151d35] border border-white/15 rounded-lg shadow-xl overflow-hidden animate-slideInDown">
          {/* Sin asignar */}
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`
              w-full text-left px-3 py-2 text-sm
              hover:bg-white/10 transition flex items-center gap-2
              ${!selected ? "text-violet-300 bg-white/5" : "text-white/50 italic"}
            `}
          >
            <i className="bx bx-minus-circle text-xs" />
            Sin asignar
          </button>

          {/* Separador */}
          {options.length > 0 && <div className="border-t border-white/8" />}

          {/* Opciones */}
          <div className="max-h-40 overflow-y-auto custom-scrollbar">
            {options.map((opt) => (
              <div
                key={opt.id}
                className={`
                  flex items-center justify-between px-3 py-2
                  hover:bg-white/10 transition group
                  ${selected === opt.id ? "bg-violet-500/15 text-violet-300" : "text-white/80"}
                `}
              >
                <button
                  type="button"
                  className="flex-1 text-left text-sm truncate"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  {selected === opt.id && (
                    <i className="bx bx-check text-violet-400 mr-1.5" />
                  )}
                  {opt.nombre}
                </button>

                {/* Botón eliminar (solo visible en hover) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(opt.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 transition"
                  title="Eliminar opción"
                >
                  <i className="bx bx-trash text-xs text-rose-400" />
                </button>
              </div>
            ))}
          </div>

          {/* Separador */}
          <div className="border-t border-white/8" />

          {/* Crear nuevo */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
            className="w-full text-left px-3 py-2.5 text-sm text-violet-300 hover:bg-violet-500/10 transition flex items-center gap-2"
          >
            <i className="bx bx-plus-circle text-base" />
            Crear nuevo
          </button>
        </div>
      )}
    </div>
  );
}

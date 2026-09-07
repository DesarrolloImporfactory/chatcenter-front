import React, { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/**
 * AdminAvisosView — /administrador-avisos (solo super admin)
 *
 * CRUD de las plantillas de avisos por WhatsApp del motor de reglas de Meta
 * Ads. Mismo lenguaje visual que Usuarios/Conexiones (hero navy) y el mismo
 * patrón de las plantillas Dropi para las variables: cada {{n}} del cuerpo
 * se mapea con un SELECT a un dato del sistema — nada escrito a mano.
 */

const EVENTO_LABEL = {
  regla_anuncio_pausado: "Anuncio pausado",
  regla_campania_pausada: "Campaña pausada",
  regla_presupuesto_subido: "Presupuesto escalado",
};

const IDIOMAS = [
  { code: "es", label: "Español (es)" },
  { code: "en", label: "Inglés (en)" },
];

const PLANTILLA_VACIA = {
  id: null,
  evento: "regla_anuncio_pausado",
  nombre_template: "",
  idioma: "es",
  cuerpo: "",
  parametros: [],
  footer: "Aviso desde Imporchat",
  activa: 1,
};

const HeaderStat = ({ label, value, icon, accent }) => (
  <div className="rounded-xl bg-white/[0.06] ring-1 ring-white/10 px-3.5 py-2.5 backdrop-blur">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/50 font-semibold">
      <i className={`bx ${icon} ${accent}`} />
      {label}
    </div>
    <div className="mt-0.5 text-sm font-bold text-white truncate">{value}</div>
  </div>
);

const AdminAvisosView = () => {
  const [rows, setRows] = useState([]);
  const [eventos, setEventos] = useState(Object.keys(EVENTO_LABEL));
  const [claves, setClaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const cuerpoRef = useRef(null);

  const fetchTodo = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await chatApi.get("/admin_avisos/listar");
      if (data?.success) {
        setRows(data.data || []);
        if (data.eventos?.length) setEventos(data.eventos);
        if (data.claves?.length) setClaves(data.claves);
      }
    } catch (err) {
      console.error("Admin avisos fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodo();
  }, [fetchTodo]);

  const parseParams = (p) => {
    try {
      const arr = p.parametros_json ? JSON.parse(p.parametros_json) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  const abrirEditor = (p) =>
    setModal({ ...PLANTILLA_VACIA, ...p, parametros: parseParams(p) });

  const setM = (campo, valor) => setModal((m) => ({ ...m, [campo]: valor }));

  const claveDefault = claves[0]?.key || "nombre_cliente";
  const nVars = (String(modal?.cuerpo || "").match(/\{\{\d+\}\}/g) || [])
    .length;

  // Mantiene el array de mapeos alineado con las variables del cuerpo.
  const parametrosAlineados = () => {
    const actual = modal?.parametros || [];
    const out = [];
    for (let i = 0; i < nVars; i++) out.push(actual[i] || claveDefault);
    return out;
  };

  const setParametro = (idx, clave) => {
    const arr = parametrosAlineados();
    arr[idx] = clave;
    setM("parametros", arr);
  };

  // Inserta la siguiente variable {{n}} en la posición del cursor.
  const insertarVariable = () => {
    const el = cuerpoRef.current;
    const actual = modal.cuerpo || "";
    const token = `{{${nVars + 1}}}`;
    const ini = el?.selectionStart ?? actual.length;
    const fin = el?.selectionEnd ?? actual.length;
    setM("cuerpo", `${actual.slice(0, ini)}${token}${actual.slice(fin)}`);
    setM("parametros", [...parametrosAlineados(), claveDefault]);
    requestAnimationFrame(() => {
      el?.focus();
      if (el) el.selectionStart = el.selectionEnd = ini + token.length;
    });
  };

  const guardar = async () => {
    if (!modal.nombre_template.trim() || !modal.cuerpo.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Completa nombre y cuerpo",
        customClass: { popup: "rounded-2xl" },
      });
      return;
    }
    setGuardando(true);
    try {
      const { data } = await chatApi.post("/admin_avisos/guardar", {
        ...modal,
        parametros: parametrosAlineados(),
        variables_desc: parametrosAlineados()
          .map(
            (k, i) =>
              `{{${i + 1}}} ${claves.find((c) => c.key === k)?.label || k}`,
          )
          .join(" · "),
      });
      if (data?.success) {
        setModal(null);
        fetchTodo();
      } else {
        Swal.fire({
          icon: "error",
          title: "No se pudo guardar",
          text: data?.message,
          customClass: { popup: "rounded-2xl" },
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.response?.data?.message || "No se pudo guardar.",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (p) => {
    const c = await Swal.fire({
      title: `¿Eliminar "${p.nombre_template}"?`,
      text: "El template ya creado en las WABAs de los clientes no se toca; solo se deja de usar.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      customClass: { popup: "rounded-2xl" },
    });
    if (!c.isConfirmed) return;
    try {
      await chatApi.post("/admin_avisos/eliminar", { id: p.id });
      fetchTodo();
    } catch (err) {
      console.error("Eliminar aviso error:", err);
    }
  };

  const toggleActiva = async (p) => {
    try {
      await chatApi.post("/admin_avisos/guardar", {
        ...p,
        parametros: parseParams(p),
        activa: Number(p.activa) === 1 ? 0 : 1,
      });
      fetchTodo();
    } catch (err) {
      console.error("Toggle aviso error:", err);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300";
  const labelCls = "block text-[11px] font-bold text-slate-600 mb-1.5";
  const activas = rows.filter((r) => Number(r.activa) === 1).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 pr-8">
      <div className="mx-auto w-[100%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 flex flex-col min-h-[82vh] overflow-hidden">
        {/* HERO — mismo estilo que Usuarios/Conexiones */}
        <header className="relative isolate overflow-hidden rounded-t-2xl">
          <div className="absolute inset-0 bg-[#171931]" aria-hidden />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.6]"
            style={{
              backgroundImage:
                "radial-gradient(600px circle at 0% 0%, rgba(79,70,229,0.25), transparent 45%), radial-gradient(500px circle at 100% 120%, rgba(99,102,241,0.18), transparent 40%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative px-5 py-4 md:px-7 md:py-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 ring-1 ring-white/15">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  ImporChat · Avisos
                </span>
                <h1 className="mt-2 text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                  Avisos que{" "}
                  <span className="bg-gradient-to-r from-indigo-300 to-violet-200 bg-clip-text text-transparent">
                    tranquilizan clientes
                  </span>
                </h1>
                <p className="mt-0.5 text-white/55 text-[13px] leading-snug">
                  Decide qué plantillas siguen, cuáles se van y qué dato llena
                  cada variable.
                </p>
              </div>

              <button
                onClick={() => setModal({ ...PLANTILLA_VACIA })}
                className="group shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-white text-[#171931] rounded-xl font-semibold text-sm shadow-lg shadow-black/20 ring-1 ring-white/40 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <i className="bx bx-plus text-xl text-[#4f46e5] transition-transform duration-200 group-hover:rotate-90" />
                Nueva plantilla
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <HeaderStat
                label="Plantillas"
                value={rows.length}
                icon="bx-layer"
                accent="text-indigo-300"
              />
              <HeaderStat
                label="Activas"
                value={activas}
                icon="bx-check-shield"
                accent="text-emerald-300"
              />
              <HeaderStat
                label="Eventos cubiertos"
                value={`${new Set(rows.filter((r) => Number(r.activa) === 1).map((r) => r.evento)).size}/${eventos.length}`}
                icon="bx-bell"
                accent="text-amber-300"
              />
            </div>
          </div>
        </header>

        {/* CONTENIDO */}
        <div className="flex-1 p-4 md:p-6 bg-slate-50/60">
          <div className="rounded-xl bg-indigo-50/70 ring-1 ring-indigo-100 px-4 py-3 text-[11px] text-indigo-800 leading-relaxed mb-4">
            <i className="bx bx-info-circle mr-1" />
            El motor usa la plantilla <strong>activa</strong> de cada evento.
            Cuando un cliente enciende su switch de avisos, las plantillas
            activas se crean automáticamente en su WABA (categoría UTILITY,
            aprobación rápida de Meta).
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="h-4 w-24 bg-slate-100 rounded-full mb-3" />
                  <div className="h-3 w-40 bg-slate-100 rounded mb-4" />
                  <div className="h-28 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {rows.map((p) => {
                const activa = Number(p.activa) === 1;
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border bg-white p-4 flex flex-col ${
                      activa
                        ? "border-slate-200"
                        : "border-slate-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 ring-1 ring-indigo-100 text-indigo-600 text-[9px] font-bold">
                          {EVENTO_LABEL[p.evento] || p.evento}
                        </span>
                        <p className="text-xs font-extrabold text-slate-800 mt-1.5 truncate font-mono">
                          {p.nombre_template}
                          <span className="ml-1 text-slate-400 font-sans">
                            · {p.idioma}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => toggleActiva(p)}
                        title={activa ? "Desactivar" : "Activar"}
                        className={`relative w-10 h-6 rounded-full transition shrink-0 ${
                          activa ? "bg-indigo-600" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                            activa ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Vista previa estilo WhatsApp */}
                    <div
                      className="mt-3 rounded-xl px-3 py-2.5 flex-1"
                      style={{ backgroundColor: "#ECE5DD" }}
                    >
                      <div className="max-w-full w-fit rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 shadow-sm">
                        <p className="text-[11px] text-slate-800 whitespace-pre-line leading-snug">
                          {p.cuerpo}
                        </p>
                        {p.footer && (
                          <p className="text-[9px] text-slate-400 mt-1">
                            {p.footer}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Mapa de variables */}
                    {parseParams(p).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {parseParams(p).map((k, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 ring-1 ring-slate-200 text-[9px] font-semibold text-slate-500"
                          >
                            <span className="font-mono text-indigo-500">{`{{${i + 1}}}`}</span>
                            {claves.find((c) => c.key === k)?.label || k}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-1 mt-3">
                      <button
                        onClick={() => abrirEditor(p)}
                        className="p-1.5 rounded-lg text-slate-500 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                        title="Editar"
                      >
                        <i className="bx bx-edit-alt text-sm" />
                      </button>
                      <button
                        onClick={() => eliminar(p)}
                        className="p-1.5 rounded-lg text-rose-500 bg-rose-50 ring-1 ring-rose-100 hover:bg-rose-100 transition"
                        title="Eliminar"
                      >
                        <i className="bx bx-trash text-sm" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL EDITOR */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#171931] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-extrabold">
                {modal.id ? "Editar plantilla" : "Nueva plantilla"}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition"
              >
                <i className="bx bx-x text-lg" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3.5 max-h-[72vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Evento</label>
                  <select
                    className={inputCls}
                    value={modal.evento}
                    onChange={(e) => setM("evento", e.target.value)}
                  >
                    {eventos.map((ev) => (
                      <option key={ev} value={ev}>
                        {EVENTO_LABEL[ev] || ev}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Idioma</label>
                  <select
                    className={inputCls}
                    value={modal.idioma}
                    onChange={(e) => setM("idioma", e.target.value)}
                  >
                    {IDIOMAS.map((i) => (
                      <option key={i.code} value={i.code}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>
                  Nombre del template (como en Meta) *
                </label>
                <input
                  className={`${inputCls} font-mono`}
                  value={modal.nombre_template}
                  onChange={(e) => setM("nombre_template", e.target.value)}
                  placeholder="aviso_anuncio_pausado"
                  maxLength={120}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-600">
                    Cuerpo *
                  </label>
                  <button
                    type="button"
                    onClick={insertarVariable}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 ring-1 ring-indigo-200 text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <i className="bx bx-plus" />
                    Agregar variable
                  </button>
                </div>
                <textarea
                  ref={cuerpoRef}
                  className={`${inputCls} min-h-[110px]`}
                  value={modal.cuerpo}
                  onChange={(e) => setM("cuerpo", e.target.value)}
                  placeholder="Escribe el mensaje y agrega variables con el botón..."
                />
              </div>

              {/* Mapeo de variables — mismo patrón que plantillas Dropi:
                  cada {{n}} elige con un select qué dato del sistema lo llena */}
              {nVars > 0 && (
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                    <i className="bx bx-code-curly mr-1" />
                    Qué dato llena cada variable
                  </p>
                  <div className="space-y-1.5">
                    {parametrosAlineados().map((clave, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-center font-mono text-[11px] font-bold text-indigo-600 bg-white rounded-lg ring-1 ring-slate-200 py-2">
                          {`{{${idx + 1}}}`}
                        </span>
                        <select
                          className={inputCls}
                          value={clave}
                          onChange={(e) => setParametro(idx, e.target.value)}
                        >
                          {claves.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>Footer</label>
                <input
                  className={inputCls}
                  value={modal.footer || ""}
                  onChange={(e) => setM("footer", e.target.value)}
                  maxLength={120}
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {guardando ? (
                  <i className="bx bx-loader-alt animate-spin" />
                ) : (
                  <i className="bx bx-save" />
                )}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAvisosView;

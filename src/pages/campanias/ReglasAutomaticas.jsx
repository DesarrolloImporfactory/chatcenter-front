import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/**
 * ReglasAutomaticas
 *
 * Motor propio de Imporchat (en vez de las reglas nativas de Meta): cada 30
 * minutos se lee gasto y mensajes por anuncio y, si una regla se cumple, se
 * pausa el anuncio/campaña o se escala el presupuesto. Todo queda en una
 * bitácora auditable.
 */

const METRICA_LABEL = {
  cpa_msg: "Costo por mensaje",
  msgs: "Mensajes",
  spend: "Gasto",
};
const NIVEL_LABEL = { ad: "Anuncio", campaign: "Campaña" };
const PERIODO_LABEL = { hoy: "hoy", "7d": "últimos 7 días" };

const esMoneda = (metrica) => metrica !== "msgs";

/* Descripción humana de la regla, para que el cliente entienda de un vistazo */
const describir = (r) => {
  const ent = r.nivel === "campaign" ? "una campaña" : "un anuncio";
  const met = METRICA_LABEL[r.metrica] || r.metrica;
  const val = esMoneda(r.metrica)
    ? `$${Number(r.umbral).toFixed(2)}`
    : Number(r.umbral);
  const accion =
    r.accion === "subir_presupuesto"
      ? `subir el presupuesto ${Number(r.accion_valor || 10)}% (tope $${Number(r.accion_limite || 50).toFixed(0)}/día)`
      : r.nivel === "campaign"
        ? "pausar la campaña"
        : "pausar el anuncio";
  return `Si ${ent} gasta ≥ $${Number(r.gasto_minimo).toFixed(2)} ${PERIODO_LABEL[r.periodo] || "hoy"} y ${met.toLowerCase()} ${r.operador} ${val} → ${accion}.`;
};

const fmtFecha = (v) => {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("es-EC", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(v);
  }
};

const AMBITO_LABEL = {
  imporchat: "Campañas del sistema",
  externas: "Campañas externas",
  todas: "Todas las campañas",
  personalizado: "Campañas elegidas",
};

const REGLA_VACIA = {
  id: null,
  nombre: "",
  nivel: "ad",
  ambito: "imporchat",
  campanias: [],
  metrica: "cpa_msg",
  operador: ">",
  umbral: 1,
  gasto_minimo: 4,
  periodo: "hoy",
  accion: "pausar",
  accion_valor: 10,
  accion_limite: 50,
  frecuencia: "30m",
  activa: 1,
};

const ReglasAutomaticas = ({ id_configuracion }) => {
  const [reglas, setReglas] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [modal, setModal] = useState(null); // null | { ...regla }
  const [guardando, setGuardando] = useState(false);

  // Avisos por WhatsApp al dueño cuando una regla actúa
  const [avisos, setAvisos] = useState(null);
  const [avisosGuardando, setAvisosGuardando] = useState(false);

  // Campañas de la cuenta (para el ámbito "personalizado")
  const [campanias, setCampanias] = useState(null); // null = sin cargar
  const [campaniasCargando, setCampaniasCargando] = useState(false);

  const cargarCampanias = useCallback(async () => {
    if (campanias || campaniasCargando) return;
    setCampaniasCargando(true);
    try {
      const { data } = await chatApi.get("/meta_ads/campaigns", {
        params: { id_configuracion },
        silentError: true,
      });
      const lista = (data?.success ? data.data || [] : []).map((c) => ({
        id: String(c.id || c.campaign_id || ""),
        nombre: c.name || c.nombre || String(c.id),
      }));
      setCampanias(lista.filter((c) => c.id));
    } catch {
      setCampanias([]);
    } finally {
      setCampaniasCargando(false);
    }
  }, [campanias, campaniasCargando, id_configuracion]);

  // Abre el editor normalizando campanias_json → campanias (array)
  const abrirEditor = (r) => {
    let cams = [];
    try {
      const arr = r.campanias_json ? JSON.parse(r.campanias_json) : [];
      if (Array.isArray(arr)) cams = arr;
    } catch {
      cams = [];
    }
    setModal({ ...REGLA_VACIA, ...r, campanias: cams });
    if ((r.ambito || "imporchat") === "personalizado") cargarCampanias();
  };

  const fetchTodo = useCallback(async () => {
    if (!id_configuracion) return;
    setLoading(true);
    try {
      const [rRes, lRes] = await Promise.all([
        chatApi.get("/meta_ads/launcher/reglas", {
          params: { id_configuracion },
        }),
        chatApi.get("/meta_ads/launcher/reglas/log", {
          params: { id_configuracion },
        }),
      ]);
      setReglas(rRes.data?.success ? rRes.data.data || [] : []);
      setPendientes(
        rRes.data?.success ? rRes.data.recomendadas_pendientes || [] : [],
      );
      setLog(lRes.data?.success ? lRes.data.data || [] : []);
    } catch (err) {
      console.error("Reglas fetch error:", err);
    } finally {
      setLoading(false);
    }
    // Estado de avisos (aparte: no bloquea la lista)
    try {
      const { data } = await chatApi.get("/meta_ads/launcher/avisos", {
        params: { id_configuracion },
        silentError: true,
      });
      setAvisos(data?.success ? data.data : null);
    } catch {
      setAvisos(null);
    }
  }, [id_configuracion]);

  useEffect(() => {
    fetchTodo();
  }, [fetchTodo]);

  // nombres = null aplica todas las pendientes; con array, solo esas.
  const aplicarRecomendadas = async (nombres = null) => {
    try {
      const { data } = await chatApi.post(
        "/meta_ads/launcher/reglas/aplicar-recomendadas",
        { id_configuracion, ...(nombres ? { nombres } : {}) },
      );
      if (data?.success) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title:
            data.creadas === 1
              ? "Regla agregada"
              : `${data.creadas} reglas agregadas`,
          showConfirmButton: false,
          timer: 2200,
        });
        fetchTodo();
      }
    } catch (err) {
      console.error("Aplicar recomendadas error:", err);
    }
  };

  const toggleActiva = async (r) => {
    let cams = [];
    try {
      cams = r.campanias_json ? JSON.parse(r.campanias_json) : [];
    } catch {
      cams = [];
    }
    try {
      await chatApi.post("/meta_ads/launcher/reglas/guardar", {
        ...r,
        campanias: cams,
        id_configuracion,
        activa: Number(r.activa) === 1 ? 0 : 1,
      });
      fetchTodo();
    } catch (err) {
      console.error("Toggle regla error:", err);
    }
  };

  const toggleAvisos = async () => {
    if (!avisos) return;
    if (!avisos.activo && !avisos.tiene_lead) {
      Swal.fire({
        icon: "info",
        title: "Falta tu WhatsApp personal",
        text: "Regístralo en Mi Perfil para poder avisarte cuando una regla actúe.",
        confirmButtonText: "Ir a Mi Perfil",
        showCancelButton: true,
        cancelButtonText: "Ahora no",
        customClass: { popup: "rounded-2xl" },
      }).then((r) => {
        if (r.isConfirmed) window.location.href = "/mi-perfil";
      });
      return;
    }
    setAvisosGuardando(true);
    try {
      const { data } = await chatApi.post("/meta_ads/launcher/avisos/toggle", {
        id_configuracion,
        activo: !avisos.activo,
      });
      if (data?.success) setAvisos((a) => ({ ...a, activo: data.activo }));
    } catch (err) {
      console.error("Toggle avisos error:", err);
    } finally {
      setAvisosGuardando(false);
    }
  };

  const eliminar = async (r) => {
    const c = await Swal.fire({
      title: `¿Eliminar la regla "${r.nombre}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      customClass: { popup: "rounded-2xl" },
    });
    if (!c.isConfirmed) return;
    try {
      await chatApi.post("/meta_ads/launcher/reglas/eliminar", {
        id: r.id,
        id_configuracion,
      });
      fetchTodo();
    } catch (err) {
      console.error("Eliminar regla error:", err);
    }
  };

  const ejecutarAhora = async () => {
    setEjecutando(true);
    try {
      const { data } = await chatApi.post(
        "/meta_ads/launcher/reglas/ejecutar",
        { id_configuracion },
        { timeout: 120000 },
      );
      if (data?.success) {
        const d = data.data;
        Swal.fire({
          icon: "success",
          title: "Motor ejecutado",
          html: `Se evaluaron <strong>${d.evaluadas}</strong> entidades y se dispararon <strong>${d.disparos.length}</strong> acciones.`,
          confirmButtonText: "Ver bitácora",
          customClass: { popup: "rounded-2xl" },
        });
        fetchTodo();
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.response?.data?.message || "No se pudo ejecutar el motor.",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setEjecutando(false);
    }
  };

  const guardarRegla = async () => {
    if (!modal.nombre.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Ponle un nombre a la regla",
        customClass: { popup: "rounded-2xl" },
      });
      return;
    }
    setGuardando(true);
    try {
      const { data } = await chatApi.post(
        "/meta_ads/launcher/reglas/guardar",
        { ...modal, id_configuracion },
      );
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
        text: err?.response?.data?.message || "No se pudo guardar la regla.",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setGuardando(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300";
  const labelCls = "block text-[11px] font-bold text-slate-600 mb-1.5";
  const setM = (campo, valor) => setModal((m) => ({ ...m, [campo]: valor }));

  if (loading) {
    // Skeleton con la silueta real de la vista (banner + reglas + bitácora)
    return (
      <div className="space-y-4 animate-pulse">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 bg-slate-100 rounded" />
            <div className="h-2.5 w-2/3 bg-slate-100 rounded" />
          </div>
          <div className="w-11 h-6 rounded-full bg-slate-100 shrink-0" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-slate-100 rounded-xl" />
          <div className="h-9 w-36 bg-slate-100 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                  <div className="h-2 w-1/3 bg-slate-100 rounded" />
                </div>
                <div className="w-10 h-6 rounded-full bg-slate-100" />
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded mb-1.5" />
              <div className="h-2.5 w-3/4 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5">
          <div className="h-3 w-40 bg-slate-100 rounded" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2.5 w-full bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* CÓMO FUNCIONA */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-5 py-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white ring-1 ring-indigo-200 grid place-items-center shrink-0">
          <i className="bx bx-shield-quarter text-indigo-600 text-lg" />
        </div>
        <div className="text-[11px] text-indigo-800 leading-relaxed">
          <strong>Tu copiloto de optimización.</strong> Cada 30 minutos el
          sistema lee el gasto y los mensajes de cada anuncio lanzado desde
          aquí y aplica tus reglas: corta lo que no da resultados y escala lo
          que sí. Solo toca campañas creadas desde esta sección, y cada acción
          queda registrada en la bitácora.
        </div>
      </div>

      {/* AVISOS POR WHATSAPP */}
      {avisos && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 grid place-items-center shrink-0">
              <i className="bx bxl-whatsapp text-emerald-600 text-lg" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-800">
                Entérate al instante de cada acción
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                {avisos.tiene_lead ? (
                  <>
                    Cada pausa o escalado te llega al instante a{" "}
                    <span className="font-bold text-slate-700">
                      {avisos.lead_pais || ""} {avisos.lead}
                    </span>{" "}
                    desde tu número conectado. Solo avisos, sin remarketing.{" "}
                    <a
                      href="/mi-perfil"
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Editar número
                    </a>
                  </>
                ) : (
                  <>
                    Aún no tienes un número personal registrado.{" "}
                    <a
                      href="/mi-perfil"
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Agrégalo en Mi Perfil
                    </a>{" "}
                    para poder avisarte.
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={toggleAvisos}
            disabled={avisosGuardando}
            title={avisos.activo ? "Desactivar avisos" : "Activar avisos"}
            className={`relative w-11 h-6 rounded-full transition shrink-0 disabled:opacity-60 ${
              avisos.activo ? "bg-emerald-500" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                avisos.activo ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      )}

      {/* RECOMENDADAS DISPONIBLES — se agregan una por una o todas */}
      {pendientes.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-700">
              <i className="bx bx-magic-wand mr-1 text-indigo-500" />
              Reglas recomendadas disponibles
            </p>
            {pendientes.length > 1 && (
              <button
                onClick={() => aplicarRecomendadas()}
                className="text-[10px] font-bold text-indigo-600 hover:underline"
              >
                Agregar todas
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {pendientes.map((r) => (
              <div
                key={r.nombre}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col"
              >
                <p className="text-[11px] font-bold text-slate-700">
                  {r.nombre}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed flex-1">
                  {r.descripcion}
                </p>
                <button
                  onClick={() => aplicarRecomendadas([r.nombre])}
                  className="mt-2.5 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  <i className="bx bx-plus" />
                  Agregar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACCIONES */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setModal({ ...REGLA_VACIA })}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 transition"
        >
          <i className="bx bx-plus" />
          Nueva regla
        </button>
        {reglas.length > 0 && (
          <button
            onClick={ejecutarAhora}
            disabled={ejecutando}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition disabled:opacity-60 ml-auto"
          >
            <i
              className={`bx ${ejecutando ? "bx-loader-alt animate-spin" : "bx-play-circle"}`}
            />
            {ejecutando ? "Evaluando..." : "Ejecutar ahora"}
          </button>
        )}
      </div>

      {/* LISTA DE REGLAS */}
      {reglas.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 ring-1 ring-indigo-200 grid place-items-center mb-4">
            <i className="bx bx-shield-quarter text-2xl text-indigo-600" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800 mb-1.5">
            Aún no tienes reglas
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Agrega las reglas recomendadas con un click, o crea las tuyas. No
            son obligatorias: sin reglas, tus campañas corren libres.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {reglas.map((r) => {
            const activa = Number(r.activa) === 1;
            return (
              <div
                key={r.id}
                className={`rounded-2xl border bg-white p-4 transition ${
                  activa ? "border-slate-200" : "border-slate-100 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                        r.accion === "subir_presupuesto"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-rose-50 text-rose-500"
                      }`}
                    >
                      <i
                        className={`bx ${r.accion === "subir_presupuesto" ? "bx-trending-up" : "bx-pause-circle"}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-800 truncate">
                        {r.nombre}
                      </p>
                      <div className="flex gap-1 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-50 ring-1 ring-slate-200 text-slate-500 text-[9px] font-bold">
                          {NIVEL_LABEL[r.nivel]}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 ring-1 ring-indigo-100 text-indigo-600 text-[9px] font-bold">
                          {AMBITO_LABEL[r.ambito] || AMBITO_LABEL.imporchat}
                        </span>
                        {Number(r.es_recomendada) === 1 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-blue-50 ring-1 ring-blue-200 text-blue-600 text-[9px] font-bold">
                            Recomendada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Switch */}
                  <button
                    onClick={() => toggleActiva(r)}
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
                <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">
                  {describir(r)}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[9px] text-slate-400 font-semibold">
                    <i className="bx bx-time-five mr-0.5" />
                    {r.frecuencia === "diaria"
                      ? "Máx. una vez al día"
                      : "Cada 30 minutos"}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => abrirEditor(r)}
                      className="p-1.5 rounded-lg text-slate-500 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                      title="Editar"
                    >
                      <i className="bx bx-edit-alt text-sm" />
                    </button>
                    <button
                      onClick={() => eliminar(r)}
                      className="p-1.5 rounded-lg text-rose-500 bg-rose-50 ring-1 ring-rose-100 hover:bg-rose-100 transition"
                      title="Eliminar"
                    >
                      <i className="bx bx-trash text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BITÁCORA */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            <i className="bx bx-history mr-1" />
            Bitácora de acciones
          </span>
          <span className="text-[10px] text-slate-400">
            últimas {log.length}
          </span>
        </div>
        {log.length === 0 ? (
          <p className="px-5 py-6 text-xs text-slate-400 text-center">
            Ninguna regla ha actuado todavía. Cuando el motor pause o escale
            algo, lo verás aquí con sus números.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="px-5 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Regla</th>
                  <th className="px-3 py-2 font-semibold">Sobre</th>
                  <th className="px-3 py-2 font-semibold">Gasto</th>
                  <th className="px-3 py-2 font-semibold">Msgs</th>
                  <th className="px-3 py-2 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50">
                    <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">
                      {fmtFecha(l.created_at)}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">
                      {l.regla_nombre || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-[220px] truncate">
                      {l.entidad_nombre || l.entidad_id}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                      {l.gasto != null ? `$${Number(l.gasto).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {l.mensajes ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {l.resultado === "ok" ? (
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold ${
                            l.accion === "subir_presupuesto"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                          title={l.detalle || ""}
                        >
                          {l.detalle ||
                            (l.accion === "subir_presupuesto"
                              ? "Presupuesto ↑"
                              : "Pausado")}
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold cursor-help"
                          title={l.detalle || ""}
                        >
                          Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL NUEVA/EDITAR REGLA */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#171931] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-extrabold">
                {modal.id ? "Editar regla" : "Nueva regla"}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition"
              >
                <i className="bx bx-x text-lg" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3.5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className={labelCls}>Nombre *</label>
                <input
                  className={inputCls}
                  value={modal.nombre}
                  onChange={(e) => setM("nombre", e.target.value)}
                  placeholder="Ej: Cortar anuncio sin ventas"
                  maxLength={150}
                />
              </div>
              <div>
                <label className={labelCls}>Se aplica a</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "ad", label: "Cada anuncio", icon: "bx-image-alt" },
                    {
                      v: "campaign",
                      label: "La campaña completa",
                      icon: "bx-folder",
                    },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => {
                        setM("nivel", o.v);
                        if (o.v === "ad" && modal.accion === "subir_presupuesto")
                          setM("accion", "pausar");
                      }}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition ${
                        modal.nivel === o.v
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      <i className={`bx ${o.icon} mr-1`} />
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Sobre qué campañas</label>
                <select
                  className={inputCls}
                  value={modal.ambito || "imporchat"}
                  onChange={(e) => {
                    const v = e.target.value;
                    setM("ambito", v);
                    if (v === "personalizado") cargarCampanias();
                  }}
                >
                  <option value="imporchat">
                    Solo las creadas desde el sistema
                  </option>
                  <option value="externas">
                    Solo las creadas por fuera (Ads Manager)
                  </option>
                  <option value="todas">Todas las campañas de la cuenta</option>
                  <option value="personalizado">
                    Elegir campañas específicas
                  </option>
                </select>
                {(modal.ambito || "imporchat") === "personalizado" && (
                  <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-50">
                    {campaniasCargando && (
                      <p className="px-3 py-2.5 text-[11px] text-slate-400">
                        <i className="bx bx-loader-alt animate-spin mr-1" />
                        Cargando campañas de tu cuenta...
                      </p>
                    )}
                    {!campaniasCargando && (campanias || []).length === 0 && (
                      <p className="px-3 py-2.5 text-[11px] text-slate-400">
                        No encontramos campañas en tu cuenta.
                      </p>
                    )}
                    {(campanias || []).map((c) => {
                      const marcada = (modal.campanias || []).some(
                        (x) => String(x.id) === c.id,
                      );
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-indigo-50 transition"
                        >
                          <input
                            type="checkbox"
                            checked={marcada}
                            onChange={() =>
                              setM(
                                "campanias",
                                marcada
                                  ? (modal.campanias || []).filter(
                                      (x) => String(x.id) !== c.id,
                                    )
                                  : [...(modal.campanias || []), c],
                              )
                            }
                            className="accent-indigo-600"
                          />
                          <span className="text-xs font-semibold text-slate-700 truncate">
                            {c.nombre}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Métrica</label>
                  <select
                    className={inputCls}
                    value={modal.metrica}
                    onChange={(e) => setM("metrica", e.target.value)}
                  >
                    <option value="cpa_msg">Costo por mensaje</option>
                    <option value="msgs">Mensajes</option>
                    <option value="spend">Gasto</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Condición</label>
                  <select
                    className={inputCls}
                    value={modal.operador}
                    onChange={(e) => setM("operador", e.target.value)}
                  >
                    <option value=">">Mayor que</option>
                    <option value="<">Menor que</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>
                    Valor {esMoneda(modal.metrica) ? "($)" : ""}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className={inputCls}
                    value={modal.umbral}
                    onChange={(e) => setM("umbral", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Gasto mínimo ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className={inputCls}
                    value={modal.gasto_minimo}
                    onChange={(e) => setM("gasto_minimo", e.target.value)}
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Antes de este gasto, no se opina.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Período</label>
                  <select
                    className={inputCls}
                    value={modal.periodo}
                    onChange={(e) => setM("periodo", e.target.value)}
                  >
                    <option value="hoy">Hoy</option>
                    <option value="7d">Últimos 7 días</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Frecuencia máx.</label>
                  <select
                    className={inputCls}
                    value={modal.frecuencia}
                    onChange={(e) => setM("frecuencia", e.target.value)}
                  >
                    <option value="30m">Cada 30 min</option>
                    <option value="diaria">1 vez al día</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Acción</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setM("accion", "pausar")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition ${
                      modal.accion === "pausar"
                        ? "bg-rose-500 text-white border-rose-500"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}
                  >
                    <i className="bx bx-pause-circle mr-1" />
                    Pausar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setM("accion", "subir_presupuesto");
                      setM("nivel", "campaign");
                    }}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition ${
                      modal.accion === "subir_presupuesto"
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}
                  >
                    <i className="bx bx-trending-up mr-1" />
                    Subir presupuesto
                  </button>
                </div>
                {modal.accion === "subir_presupuesto" && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className={labelCls}>Aumento (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className={inputCls}
                        value={modal.accion_valor || 10}
                        onChange={(e) => setM("accion_valor", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Tope diario ($)</label>
                      <input
                        type="number"
                        min="1"
                        className={inputCls}
                        value={modal.accion_limite || 50}
                        onChange={(e) => setM("accion_limite", e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Preview de la regla */}
              <div className="rounded-xl bg-indigo-50/70 ring-1 ring-indigo-100 px-3.5 py-2.5 text-[11px] text-indigo-700 leading-relaxed">
                <i className="bx bx-bulb mr-1" />
                {describir({
                  ...modal,
                  umbral: Number(modal.umbral) || 0,
                  gasto_minimo: Number(modal.gasto_minimo) || 0,
                })}
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
                onClick={guardarRegla}
                disabled={guardando}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {guardando ? (
                  <i className="bx bx-loader-alt animate-spin" />
                ) : (
                  <i className="bx bx-save" />
                )}
                Guardar regla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReglasAutomaticas;

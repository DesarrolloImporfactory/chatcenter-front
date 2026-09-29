import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import LineaTiempoCaso from "../../components/chat/LineaTiempoCaso";

/**
 * «Seguimiento de casos» (pedido 2026-09-28, parte 2 de 3) — la bandeja de
 * Johan para los casos que los asesores marcan desde Incidencias del chat:
 * Oportunidades Comerciales y Escalamientos, en dos listas separadas.
 *
 * Misma forma que «Seguimiento IA» (tarjetas de conteo, filtros, tabla). Al
 * resolver o poner en espera, el back deja la nota en la conversación del
 * cliente: eso reemplaza los informes manuales.
 *
 * Quién entra lo decide el back (GET /incidencias_chat_center/casos-acceso):
 * los destinatarios configurados en incidencias_casos_destinatarios y los
 * administradores de la cuenta. Resolver: el destinatario del caso o un admin.
 */

const LISTAS = {
  oportunidad: { label: "Oportunidades Comerciales", icon: "bx-trending-up", activo: "border-emerald-400 bg-emerald-50 text-emerald-800" },
  escalamiento: { label: "Escalamientos", icon: "bx-error", activo: "border-rose-400 bg-rose-50 text-rose-800" },
};

const ESTADOS = {
  sin_resolver: ["Sin resolver", "border-amber-300 bg-amber-50 text-amber-800", "bx-time-five"],
  en_espera: ["En espera", "border-sky-300 bg-sky-50 text-sky-800", "bx-pause-circle"],
  resuelto: ["Resuelto", "border-emerald-300 bg-emerald-50 text-emerald-800", "bx-check-circle"],
};

const FILTROS_INICIALES = {
  tipo: "oportunidad",
  estado: "pendientes",
  search: "",
  id_asesor: "",
  dias: 30,
  orden: "",
  page: 1,
  limit: 20,
};

export default function SeguimientoCasos() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [busqueda, setBusqueda] = useState("");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [sinPermiso, setSinPermiso] = useState(false);
  const [asesores, setAsesores] = useState([]);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const cargar = useCallback(
    async (signal) => {
      setCargando(true);
      setError("");
      try {
        const { data } = await chatApi.get("/incidencias_chat_center/casos", {
          params: filtros,
          signal,
          silentError: true,
        });
        if (!vivo.current) return;
        setDatos(data);
        if (!filtros.id_asesor && data?.asesores) setAsesores(data.asesores);
      } catch (e) {
        if (e?.name === "CanceledError" || !vivo.current) return;
        if (e?.response?.status === 403) setSinPermiso(true);
        else setError(e?.response?.data?.message || e.message || "No se pudo cargar el seguimiento.");
      } finally {
        if (vivo.current) setCargando(false);
      }
    },
    [filtros],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    cargar(ctrl.signal);
    return () => ctrl.abort();
  }, [cargar]);

  // Búsqueda con debounce.
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => (f.search === busqueda ? f : { ...f, search: busqueda, page: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const aplicar = (cambios) => setFiltros((f) => ({ ...f, page: 1, ...cambios }));

  async function resolver(caso) {
    if (caso.estado === "resuelto") {
      verResolucion(caso);
      return;
    }
    const r = await Swal.fire({
      title: "Resolver caso",
      html: `<p style="margin:0 0 8px;color:#64748b;font-size:13px;text-align:left">${escapar(
        caso.cliente || "Cliente",
      )} · marcado por ${escapar(caso.asesor || "—")}.<br>Lo que escribas queda en el chat del cliente.</p>`,
      input: "textarea",
      inputPlaceholder: "Cuenta cómo se resolvió el caso…",
      inputAttributes: { maxlength: "2000" },
      showCancelButton: true,
      confirmButtonText: "Resolver",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#059669",
      preConfirm: async (comentario) => {
        if (!comentario || !comentario.trim()) {
          Swal.showValidationMessage("Escribe cómo se resolvió el caso");
          return false;
        }
        try {
          await chatApi.patch(
            `/incidencias_chat_center/caso/${caso.id}/resolver`,
            { comentario: comentario.trim() },
            { silentError: true },
          );
          return true;
        } catch (e) {
          Swal.showValidationMessage(e?.response?.data?.message || "No se pudo resolver");
          return false;
        }
      },
    });
    if (r.isConfirmed) {
      Swal.fire({ icon: "success", title: "Caso resuelto", timer: 1400, showConfirmButton: false });
      cargar();
    }
  }

  async function ponerEnEspera(caso) {
    const r = await Swal.fire({
      title: "Poner en espera",
      html: `<p style="margin:0 0 8px;color:#64748b;font-size:13px;text-align:left">${escapar(
        caso.cliente || "Cliente",
      )}. El caso sigue abierto; lo que escribas queda en el chat del cliente.</p>`,
      input: "textarea",
      inputPlaceholder: "Qué se está esperando (respuesta del cliente, del proveedor…)",
      inputAttributes: { maxlength: "2000" },
      showCancelButton: true,
      confirmButtonText: "Poner en espera",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0284c7",
      preConfirm: async (comentario) => {
        if (!comentario || !comentario.trim()) {
          Swal.showValidationMessage("Escribe qué se está esperando");
          return false;
        }
        try {
          await chatApi.patch(
            `/incidencias_chat_center/caso/${caso.id}/espera`,
            { comentario: comentario.trim() },
            { silentError: true },
          );
          return true;
        } catch (e) {
          Swal.showValidationMessage(e?.response?.data?.message || "No se pudo guardar");
          return false;
        }
      },
    });
    if (r.isConfirmed) cargar();
  }

  function verResolucion(caso) {
    Swal.fire({
      icon: "info",
      title: "Caso resuelto",
      html: `<p style="font-size:14px;color:#334155;white-space:pre-wrap;text-align:left">${escapar(
        caso.resolucion_comentario || "",
      )}</p>
             <p style="font-size:12px;color:#94a3b8;margin-top:8px">${escapar(caso.resuelto_por || "—")} · ${escapar(
               fecha(caso.resolucion_fecha),
             )}</p>`,
      confirmButtonColor: "#1d4ed8",
    });
  }

  function irAlChat(caso) {
    if (!caso.id_chat) return;
    localStorage.setItem("id_configuracion", String(caso.id_configuracion));
    navigate(`/chat/${caso.id_chat}`);
  }

  if (sinPermiso) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <i className="bx bx-lock-alt text-4xl text-slate-400" />
          <h1 className="mt-2 text-lg font-bold text-slate-800">No tienes permiso para ver esta página</h1>
          <p className="mt-1 text-sm text-slate-500">
            El seguimiento de casos es para quien recibe los escalamientos y las oportunidades comerciales, y para los
            administradores de la cuenta.
          </p>
          <button
            type="button"
            onClick={() => navigate("/chat")}
            className="mt-4 rounded-lg bg-[#0B1426] px-4 py-2 text-sm font-semibold text-white"
          >
            Volver al chat
          </button>
        </div>
      </div>
    );
  }

  const conteos = datos?.conteos ?? {};
  const c = conteos[filtros.tipo] ?? {};
  const kpis = [
    { label: "Pendientes", valor: (c.sin_resolver ?? 0) + (c.en_espera ?? 0), ayuda: "Sin resolver y en espera", tono: "text-slate-900", estado: "pendientes" },
    { label: "Sin resolver", valor: c.sin_resolver ?? 0, ayuda: "Nadie los ha tocado", tono: "text-amber-700", estado: "sin_resolver" },
    { label: "En espera", valor: c.en_espera ?? 0, ayuda: "Esperando a alguien más", tono: "text-sky-700", estado: "en_espera" },
    { label: "Resueltos", valor: c.resuelto ?? 0, ayuda: "Con su resolución en el chat", tono: "text-emerald-700", estado: "resuelto" },
    { label: "Total", valor: c.total ?? 0, ayuda: `Sin resolver + en espera + resueltos · ${filtros.dias} días`, tono: "text-slate-600", estado: "" },
  ];
  const lista = LISTAS[filtros.tipo];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-3 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-[#0B1426]">
              <i className="bx bx-flag text-rose-600" />
              Seguimiento de casos
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Los casos que los asesores marcan desde Incidencias del chat. Toca «Resolver» y escribe cómo se resolvió: queda
              en el chat del cliente, sin informes aparte.
            </p>
          </div>
          <button
            type="button"
            onClick={() => cargar()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <i className={`bx bx-refresh ${cargando ? "bx-spin" : ""}`} /> Actualizar
          </button>
        </header>

        {/* Las dos listas, cada una con su contador de pendientes */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(LISTAS).map(([tipo, l]) => {
            const n = conteos[tipo] ?? {};
            const pendientes = (n.sin_resolver ?? 0) + (n.en_espera ?? 0);
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => aplicar({ tipo, id_asesor: "" })}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition ${
                  filtros.tipo === tipo ? l.activo : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <i className={`bx ${l.icon} text-lg`} />
                {l.label}
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs tabular-nums ring-1 ring-slate-200">
                  {pendientes}
                  <span className="font-normal text-slate-400"> / {n.total ?? 0}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Sin casos en el período: un aviso en vez de una fila de ceros que
            parezca un error. */}
        {datos && (c.total ?? 0) === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <i className={`bx ${lista.icon} mt-0.5 text-2xl text-slate-300`} />
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Todavía no hay {lista.label.toLowerCase()} en los últimos {filtros.dias} días.
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Aparecen aquí cuando un asesor marca un chat desde la sección Incidencias del panel derecho.
                {filtros.dias < 180 && " Puedes ampliar el período en los filtros."}
              </p>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {kpis.map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={() => aplicar({ estado: k.estado })}
              className={`rounded-xl border p-3 text-left shadow-sm transition ${
                filtros.estado === k.estado ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
              <p className={`mt-1 text-2xl font-black tabular-nums ${k.tono}`}>{k.valor}</p>
              <p className="text-[10px] text-slate-400">{k.ayuda}</p>
            </button>
          ))}
        </div>
        )}

        <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <i className="bx bx-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, teléfono o motivo…"
              className={`${INPUT} pl-9`}
            />
          </div>
          <select value={filtros.id_asesor} onChange={(e) => aplicar({ id_asesor: e.target.value })} className={INPUT}>
            <option value="">Todos los asesores</option>
            {asesores.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          <select value={filtros.estado} onChange={(e) => aplicar({ estado: e.target.value })} className={INPUT}>
            <option value="pendientes">Pendientes</option>
            <option value="sin_resolver">Sin resolver</option>
            <option value="en_espera">En espera</option>
            <option value="resuelto">Resueltos</option>
            <option value="">Todos los estados</option>
          </select>
          <select value={filtros.dias} onChange={(e) => aplicar({ dias: Number(e.target.value) })} className={INPUT}>
            <option value={30}>Últimos 30 días</option>
            <option value={60}>Últimos 60 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={180}>Últimos 180 días</option>
          </select>
          <select value={filtros.orden} onChange={(e) => aplicar({ orden: e.target.value })} className={INPUT}>
            <option value="">Más recientes primero</option>
            <option value="antiguas">Más viejos primero</option>
          </select>
        </div>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
        )}

        {/* Sin ningún caso en el período ya lo dice el aviso de arriba: la tabla vacía sobra. */}
        <div
          className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${cargando && datos ? "opacity-60" : ""} ${
            datos && (c.total ?? 0) === 0 ? "hidden" : ""
          }`}
        >
          {!datos && cargando ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : (datos?.data ?? []).length === 0 ? (
            <Vacio lista={lista} hayCasos={(c.total ?? 0) > 0} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {datos.data.map((caso) => (
                <Fila
                  key={caso.id}
                  caso={caso}
                  esperaHabilitada={!!datos.espera_habilitada}
                  onResolver={() => resolver(caso)}
                  onEspera={() => ponerEnEspera(caso)}
                  onChat={() => irAlChat(caso)}
                />
              ))}
            </ul>
          )}
          {datos?.total_paginas > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              <span>
                Página {datos.pagina} de {datos.total_paginas} · {datos.total} casos
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={datos.pagina <= 1}
                  onClick={() => setFiltros((f) => ({ ...f, page: datos.pagina - 1 }))}
                  className="rounded-md border border-slate-200 px-2.5 py-1 font-semibold disabled:opacity-40"
                >
                  <i className="bx bx-chevron-left" /> Anterior
                </button>
                <button
                  type="button"
                  disabled={datos.pagina >= datos.total_paginas}
                  onClick={() => setFiltros((f) => ({ ...f, page: datos.pagina + 1 }))}
                  className="rounded-md border border-slate-200 px-2.5 py-1 font-semibold disabled:opacity-40"
                >
                  Siguiente <i className="bx bx-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none";

function Vacio({ lista, hayCasos }) {
  return (
    <div className="p-10 text-center">
      <i className={`bx ${lista.icon} text-4xl text-slate-300`} />
      <p className="mt-2 text-sm font-semibold text-slate-600">
        {hayCasos ? "No hay casos con estos filtros." : `Todavía no hay ${lista.label.toLowerCase()}.`}
      </p>
      {!hayCasos && (
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
          Aparecen aquí cuando un asesor marca un chat desde la sección Incidencias del panel derecho.
        </p>
      )}
    </div>
  );
}

function Fila({ caso, esperaHabilitada, onResolver, onEspera, onChat }) {
  const est = ESTADOS[caso.estado] || ESTADOS.sin_resolver;
  const resuelto = caso.estado === "resuelto";
  const [verTiempo, setVerTiempo] = useState(false);
  return (
    <li className={caso.estado === "sin_resolver" ? "border-l-4 border-l-amber-400" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-900">
            <span className="font-semibold">{caso.cliente || "Cliente sin nombre"}</span>
            {caso.celular && <span className="text-slate-400"> · {caso.celular}</span>}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Marcado por {caso.asesor || "—"} · {fecha(caso.fecha)} · para {caso.destino || "—"}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{caso.motivo}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${est[1]}`}>
              <i className={`bx ${est[2]}`} /> {est[0]}
            </span>
          </div>
          {caso.estado === "en_espera" && caso.espera_comentario && (
            <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs text-sky-800">
              <i className="bx bx-pause-circle mr-1" />
              {[caso.espera_por, fecha(caso.espera_fecha)].filter(Boolean).join(" · ")}:{" "}
              <strong>{caso.espera_comentario}</strong>
            </p>
          )}
          {resuelto && caso.resolucion_comentario && (
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
              <i className="bx bx-check-circle mr-1" />
              Resuelto por {caso.resuelto_por || "—"} el {fecha(caso.resolucion_fecha)}:{" "}
              <strong>{caso.resolucion_comentario}</strong>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {caso.id_chat && (
            <button
              type="button"
              onClick={onChat}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <i className="bx bxl-whatsapp" /> Ir al chat
            </button>
          )}
          {Array.isArray(caso.eventos) && (
            <button
              type="button"
              onClick={() => setVerTiempo((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <i className={`bx ${verTiempo ? "bx-chevron-up" : "bx-history"}`} />
              {verTiempo ? "Ocultar" : `Línea de tiempo (${caso.eventos.length})`}
            </button>
          )}
          {resuelto ? (
            <button
              type="button"
              onClick={onResolver}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <i className="bx bx-show" /> Ver resolución
            </button>
          ) : caso.puede_resolver ? (
            <>
              {esperaHabilitada && caso.estado !== "en_espera" && (
                <button
                  type="button"
                  onClick={onEspera}
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                >
                  <i className="bx bx-pause" /> En espera
                </button>
              )}
              <button
                type="button"
                onClick={onResolver}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500 bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <i className="bx bx-check" /> Resolver
              </button>
            </>
          ) : (
            <span className="text-[11px] text-slate-400" title="Lo resuelve el destinatario del caso o un administrador">
              Lo resuelve {caso.destino || "otra persona"}
            </span>
          )}
        </div>
      </div>
      {verTiempo && Array.isArray(caso.eventos) && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Línea de tiempo · registro, no se edita
          </p>
          <LineaTiempoCaso eventos={caso.eventos} tema="claro" />
        </div>
      )}
    </li>
  );
}

function fecha(d) {
  if (!d) return "—";
  const x = new Date(d);
  if (Number.isNaN(+x)) return String(d).slice(0, 16);
  return x.toLocaleString("es-EC", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function escapar(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

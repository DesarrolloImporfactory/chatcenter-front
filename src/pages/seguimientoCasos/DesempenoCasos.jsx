import { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";

/**
 * «Desempeño» de Seguimiento de casos (pedido 2026-09-30): no sigue los casos
 * sino a quien los recibe (Johan, Vivi). Cuánto tardó en responder cada caso,
 * qué respondió y cuántos dejó sin respuesta. Solo administradores.
 *
 * «Respondió» = lo primero entre escribirle al cliente en ese chat y actuar
 * sobre el caso (en espera / resuelto). El back lo calcula en
 * GET /incidencias_chat_center/casos-desempeno.
 */

const CUMPLIMIENTO = {
  a_tiempo: ["A tiempo", "border-emerald-300 bg-emerald-50 text-emerald-800", "bx-check-circle"],
  tarde: ["Tarde", "border-amber-300 bg-amber-50 text-amber-800", "bx-time"],
  vencido: ["Sin respuesta · vencido", "border-rose-300 bg-rose-50 text-rose-800", "bx-error-circle"],
  pendiente: ["Sin respuesta", "border-slate-300 bg-slate-50 text-slate-700", "bx-time-five"],
  resuelto_por_otro: ["Lo resolvió otra persona", "border-violet-300 bg-violet-50 text-violet-800", "bx-user-check"],
};

const TIPOS = { oportunidad: "Oportunidad", escalamiento: "Escalamiento" };
const ACCIONES = { en_espera: "Lo puso en espera", resuelto: "Lo resolvió" };

export default function DesempenoCasos({ onChat }) {
  const [filtros, setFiltros] = useState({ dias: 30, tipo: "", id_responsable: "", cumplimiento: "" });
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setCargando(true);
    setError("");
    const { cumplimiento, ...params } = filtros;
    chatApi
      .get("/incidencias_chat_center/casos-desempeno", { params, signal: ctrl.signal, silentError: true })
      .then(({ data }) => setDatos(data))
      .catch((e) => {
        if (e?.name === "CanceledError") return;
        setError(e?.response?.data?.message || e.message || "No se pudo cargar el desempeño.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setCargando(false);
      });
    return () => ctrl.abort();
    // El filtro de cumplimiento es local: no vuelve a pedir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.dias, filtros.tipo, filtros.id_responsable, recarga]);

  const aplicar = (cambios) => setFiltros((f) => ({ ...f, ...cambios }));
  const horas = datos?.horas_limite ?? 24;
  const casos = (datos?.data ?? []).filter((c) => !filtros.cumplimiento || c.cumplimiento === filtros.cumplimiento);

  function exportar() {
    const cab = [
      "Fecha del caso", "Tipo", "Cliente", "Teléfono", "Marcado por", "Responsable", "Motivo",
      "Primera respuesta", "Tiempo de respuesta", "Cumplimiento", "Qué respondió al cliente",
      "Acción sobre el caso", "Comentario de la acción", "Estado", "Tiempo hasta resolver", "Resuelto por",
    ];
    const filas = casos.map((c) => [
      fecha(c.fecha), TIPOS[c.tipo] || c.tipo, c.cliente, c.celular, c.asesor, c.responsable, c.motivo,
      c.primera_respuesta ? fecha(c.primera_respuesta.fecha) : "",
      duracion(c.minutos_respuesta), CUMPLIMIENTO[c.cumplimiento]?.[0] || c.cumplimiento,
      c.mensaje?.texto || "", c.accion ? ACCIONES[c.accion.accion] || c.accion.accion : "",
      c.accion?.comentario || "", c.estado, duracion(c.minutos_resolucion), c.resuelto_por || "",
    ]);
    const csv = [cab, ...filas]
      .map((f) => f.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `desempeno_casos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Cuánto tarda cada responsable en responder los casos que le llegan. Cuenta como respuesta lo primero que haga:
        escribirle al cliente en el chat o poner el caso en espera / resolverlo. Plazo: {horas} h.
      </p>

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <select value={filtros.id_responsable} onChange={(e) => aplicar({ id_responsable: e.target.value })} className={INPUT}>
          <option value="">Todos los responsables</option>
          {(datos?.destinatarios ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
        <select value={filtros.tipo} onChange={(e) => aplicar({ tipo: e.target.value })} className={INPUT}>
          <option value="">Oportunidades y escalamientos</option>
          <option value="oportunidad">Solo oportunidades</option>
          <option value="escalamiento">Solo escalamientos</option>
        </select>
        <select value={filtros.cumplimiento} onChange={(e) => aplicar({ cumplimiento: e.target.value })} className={INPUT}>
          <option value="">Todas las respuestas</option>
          {Object.entries(CUMPLIMIENTO).map(([k, v]) => (
            <option key={k} value={k}>
              {v[0]}
            </option>
          ))}
        </select>
        <select value={filtros.dias} onChange={(e) => aplicar({ dias: Number(e.target.value) })} className={INPUT}>
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={60}>Últimos 60 días</option>
          <option value={90}>Últimos 90 días</option>
          <option value={180}>Últimos 180 días</option>
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRecarga((n) => n + 1)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <i className={`bx bx-refresh ${cargando ? "bx-spin" : ""}`} />
          </button>
          <button
            type="button"
            disabled={!casos.length}
            onClick={exportar}
            className="inline-flex flex-[3] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <i className="bx bx-download" /> Exportar
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}

      {!datos && cargando ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : (datos?.responsables ?? []).length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <i className="bx bx-stopwatch text-4xl text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-600">
            No hay casos en los últimos {filtros.dias} días para medir.
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
            Los tiempos aparecen en cuanto los asesores marquen casos desde Incidencias del chat.
          </p>
        </div>
      ) : (
        <>
          <div className={`grid gap-3 md:grid-cols-2 ${cargando ? "opacity-60" : ""}`}>
            {datos.responsables.map((r) => (
              <TarjetaResponsable key={r.id} r={r} horas={horas} />
            ))}
          </div>

          {datos.truncado && (
            <p className="text-xs text-amber-700">Se muestran los 500 casos más recientes; acorta el período para ver el resto.</p>
          )}

          <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${cargando ? "opacity-60" : ""}`}>
            <p className="border-b border-slate-100 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Historial · {casos.length} casos
            </p>
            {casos.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No hay casos con estos filtros.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {casos.map((c) => (
                  <FilaHistorial key={c.id} c={c} onChat={() => onChat(c)} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TarjetaResponsable({ r, horas }) {
  const sinResp = r.vencidos + r.pendientes;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold text-[#0B1426]">{r.nombre}</p>
          <p className="text-xs text-slate-500">
            {r.casos} casos recibidos · {r.resueltos} resueltos
          </p>
        </div>
        <span
          className={`rounded-lg px-2.5 py-1 text-lg font-black tabular-nums ${
            r.pct_a_tiempo >= 80 ? "bg-emerald-50 text-emerald-700" : r.pct_a_tiempo >= 50 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
          }`}
          title={`Casos respondidos en menos de ${horas} h, sobre el total recibido`}
        >
          {r.pct_a_tiempo}%
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Dato label="1ª respuesta (prom.)" valor={duracion(r.promedio_respuesta_min)} ayuda={`mediana ${duracion(r.mediana_respuesta_min)}`} />
        <Dato label="Hasta resolver (prom.)" valor={duracion(r.promedio_resolucion_min)} />
        <Dato label="Por chat" valor={`${r.respondio_por_chat}/${r.casos}`} ayuda="le escribió al cliente" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
        <Chip cls={CUMPLIMIENTO.a_tiempo[1]}>{r.a_tiempo} a tiempo</Chip>
        <Chip cls={CUMPLIMIENTO.tarde[1]}>{r.tarde} tarde</Chip>
        <Chip cls={sinResp ? CUMPLIMIENTO.vencido[1] : CUMPLIMIENTO.pendiente[1]}>
          {sinResp} sin respuesta{r.vencidos ? ` (${r.vencidos} vencidos)` : ""}
        </Chip>
        {r.resueltos_por_otro > 0 && <Chip cls={CUMPLIMIENTO.resuelto_por_otro[1]}>{r.resueltos_por_otro} los resolvió otro</Chip>}
      </div>
    </div>
  );
}

function Dato({ label, valor, ayuda }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-black tabular-nums text-slate-900">{valor}</p>
      {ayuda && <p className="text-[10px] text-slate-400">{ayuda}</p>}
    </div>
  );
}

function Chip({ cls, children }) {
  return <span className={`rounded-md border px-2 py-0.5 ${cls}`}>{children}</span>;
}

function FilaHistorial({ c, onChat }) {
  const cum = CUMPLIMIENTO[c.cumplimiento] || CUMPLIMIENTO.pendiente;
  const sinRespuesta = c.cumplimiento === "vencido" || c.cumplimiento === "pendiente";
  return (
    <li className={`px-4 py-3 ${c.cumplimiento === "vencido" ? "border-l-4 border-l-rose-400" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-900">
            <span className="font-semibold">{c.cliente || "Cliente sin nombre"}</span>
            <span className="text-slate-400"> · {TIPOS[c.tipo] || c.tipo}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Marcado por {c.asesor || "—"} el {fecha(c.fecha)} · para <strong>{c.responsable || "—"}</strong>
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-600">{c.motivo}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cum[1]}`}>
            <i className={`bx ${cum[2]}`} /> {cum[0]}
          </span>
          <span className="text-xs font-bold tabular-nums text-slate-700">
            {sinRespuesta ? `lleva ${duracion(c.minutos_abierto)}` : c.minutos_respuesta !== null ? `respondió en ${duracion(c.minutos_respuesta)}` : ""}
          </span>
          {c.id_chat && (
            <button
              type="button"
              onClick={onChat}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <i className="bx bxl-whatsapp" /> Ir al chat
            </button>
          )}
        </div>
      </div>

      {(c.mensaje || c.accion || c.minutos_resolucion !== null) && (
        <div className="mt-2 space-y-1.5">
          {c.mensaje && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
              <i className="bx bx-message-rounded-dots mr-1 text-slate-400" />
              <span className="text-slate-500">
                Le escribió al cliente · {fecha(c.mensaje.fecha)} ({duracion(minutos(c.fecha, c.mensaje.fecha))}):{" "}
              </span>
              <span className="whitespace-pre-wrap">{c.mensaje.texto || `[${c.mensaje.tipo}]`}</span>
            </p>
          )}
          {c.accion && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs text-sky-900">
              <i className="bx bx-flag mr-1" />
              <span className="text-sky-700">
                {ACCIONES[c.accion.accion] || c.accion.accion} · {fecha(c.accion.fecha)} ({duracion(minutos(c.fecha, c.accion.fecha))})
                {c.accion.comentario ? ": " : ""}
              </span>
              {c.accion.comentario && <strong>{c.accion.comentario}</strong>}
            </p>
          )}
          {c.minutos_resolucion !== null && (
            <p className="text-[11px] text-emerald-700">
              <i className="bx bx-check-circle mr-1" />
              Resuelto en {duracion(c.minutos_resolucion)}
              {c.resuelto_por ? ` por ${c.resuelto_por}` : ""}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none";

function minutos(desde, hasta) {
  if (!desde || !hasta) return null;
  return Math.max(Math.round((new Date(hasta) - new Date(desde)) / 60000), 0);
}

/** 45 min · 3 h 20 min · 2 d 4 h */
function duracion(min) {
  if (min === null || min === undefined) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
  const d = Math.floor(h / 24);
  return `${d} d${h % 24 ? ` ${h % 24} h` : ""}`;
}

function fecha(d) {
  if (!d) return "—";
  const x = new Date(d);
  if (Number.isNaN(+x)) return String(d).slice(0, 16);
  return x.toLocaleString("es-EC", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

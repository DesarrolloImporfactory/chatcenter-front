import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import { COHORTE_UI, num, fmtFechaHora } from "./recuperacionUtils";

/**
 * Pestaña «Automatizaciones» de recuperación: secuencias de plantillas de
 * WhatsApp que salen desde la conexión de Expertos a los clientes del embudo
 * (pago rebotado, cancelación programada, nutrición de prueba / sin tarjeta).
 *
 * Reglas que el asesor debe entender y por eso están escritas en pantalla:
 *  - a quien no escribió en 24 h solo se le puede mandar una PLANTILLA
 *    aprobada por Meta; aquí se elige cuál va en cada paso;
 *  - cada paso de una secuencia sale solo si el cliente NO respondió al
 *    anterior; si responde, para y la sigue el asesor;
 *  - un cliente recibe como mucho una automatización cada 3 días;
 *  - el paso con descuento aplica el cupón de 10% al customer en Stripe.
 *
 * Configurar (prender, fechas, plantillas) es de administradores; ver,
 * simular y «enviar ahora» lo puede hacer cualquier asesor.
 */

const COHORTE_LABEL = {
  pago_rebotado: "Pago rebotado",
  cancelacion_programada: "Cancelación programada",
  en_prueba: "En prueba",
  sin_tarjeta: "Sin tarjeta",
  vencido: "Vencido",
  cancelado_reciente: "Cancelado (30 días)",
};

const ESTADO_ENVIO = {
  encolado: "bg-amber-50 text-amber-700 ring-amber-200",
  enviado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  error: "bg-rose-50 text-rose-700 ring-rose-200",
  omitido: "bg-slate-100 text-slate-600 ring-slate-200",
};

const toLocalInput = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
};

const cuerpoDe = (tpl) => tpl?.components?.find((c) => c.type === "BODY")?.text || "";

// Valores de ejemplo para la vista previa (lo que vería un cliente real).
const EJEMPLO = {
  "{{nombre}}": "Carolina",
  "{{plan}}": "Plan ImporChat",
  "{{precio}}": "$39",
  "{{link_pago}}": "https://invoice.stripe.com/i/acct_1Rii…/pagar",
  "{{link_planes}}": "https://chatcenter.imporfactory.app/planes",
  "{{fecha}}": "24 de octubre",
  "{{dias}}": "3",
  "{{descuento}}": "10%",
};

// Rellena {{1}}, {{2}}… con el ejemplo de cada variable del paso.
const conEjemplos = (texto, parametros = []) =>
  String(texto || "").replace(/\{\{(\d+)\}\}/g, (m, n) => {
    const tok = parametros[Number(n) - 1];
    return EJEMPLO[tok] || tok || m;
  });

// Formato de WhatsApp: *negrita*, _cursiva_, saltos de línea y enlaces.
function TextoWhatsApp({ texto }) {
  const lineas = String(texto || "").split("\n");
  return (
    <>
      {lineas.map((linea, i) => (
        <span key={i}>
          {linea.split(/(\*[^*]+\*|_[^_]+_|https?:\/\/\S+)/g).map((parte, j) => {
            if (/^\*[^*]+\*$/.test(parte)) return <b key={j}>{parte.slice(1, -1)}</b>;
            if (/^_[^_]+_$/.test(parte)) return <i key={j}>{parte.slice(1, -1)}</i>;
            if (/^https?:\/\//.test(parte)) return <span key={j} className="text-sky-700 underline break-all">{parte}</span>;
            return parte;
          })}
          {i < lineas.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

/** Burbuja como la vería el cliente en WhatsApp (saliente, fondo verde). */
function BurbujaWhatsApp({ texto, hora = "10:20", etiqueta }) {
  return (
    <div className="flex flex-col items-end">
      {etiqueta && (
        <span className="self-center mb-2 px-2 py-0.5 rounded-md bg-[#d9e4ec] text-[#54656f] text-[10px] font-semibold uppercase tracking-wide shadow-sm">
          {etiqueta}
        </span>
      )}
      <div className="relative max-w-[92%] bg-[#d9fdd3] text-[#111b21] text-[13.5px] leading-[1.35] rounded-lg rounded-tr-none px-3 pt-1.5 pb-5 shadow-[0_1px_0.5px_rgba(11,20,26,.13)]">
        <TextoWhatsApp texto={texto} />
        <span className="absolute bottom-1 right-2 text-[10px] text-[#667781] flex items-center gap-0.5">
          {hora} <i className="bx bx-check-double text-[#53bdeb] text-sm" />
        </span>
      </div>
    </div>
  );
}

/** Marco de teléfono con la cabecera de la conexión de Expertos. */
function Telefono({ titulo, children }) {
  return (
    <div className="rounded-2xl overflow-hidden ring-1 ring-slate-300 shadow-md bg-[#efeae2] w-full max-w-[380px]">
      <div className="bg-[#075e54] text-white px-3 py-2 flex items-center gap-2">
        <span className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center"><i className="bx bx-support" /></span>
        <div className="min-w-0 leading-tight">
          <div className="text-sm font-semibold truncate">{titulo}</div>
          <div className="text-[10px] opacity-80">Cuenta de empresa · en línea</div>
        </div>
      </div>
      <div
        className="p-3 space-y-3"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,.04) 1px, transparent 0)", backgroundSize: "14px 14px" }}
      >
        {children}
      </div>
    </div>
  );
}

export default function AutomatizacionesRecuperacion({ permisos }) {
  const [data, setData] = useState(null);
  const [plantillas, setPlantillas] = useState(null); // name → template (Meta)
  const [loading, setLoading] = useState(true);
  const [bitacora, setBitacora] = useState([]);
  const [filtroBitacora, setFiltroBitacora] = useState("");
  const puedeConfigurar = !!permisos?.puede_asignar;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: r } = await chatApi.get("recuperacion/automatizaciones");
      setData(r.data);
      const { data: b } = await chatApi.get("recuperacion/automatizaciones/envios", { params: { limit: 150 } });
      setBitacora(b.data || []);
      if (r.data?.expertos?.id_configuracion) {
        try {
          const { data: t } = await chatApi.post("whatsapp_managment/obtenerTemplatesWhatsapp", {
            id_configuracion: r.data.expertos.id_configuracion,
            limit: 100,
          });
          const map = {};
          for (const tpl of t?.data || []) map[tpl.name] = tpl;
          setPlantillas(map);
        } catch {
          setPlantillas({});
        }
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudieron cargar las automatizaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const aprobadas = useMemo(
    () => Object.values(plantillas || {}).filter((t) => String(t.status).toUpperCase() === "APPROVED"),
    [plantillas],
  );

  if (loading && !data) {
    return (
      <div className="py-16 text-center text-slate-500">
        <i className="bx bx-loader-alt bx-spin text-4xl text-cyan-600" />
        <p className="mt-2 text-sm">Cargando automatizaciones…</p>
      </div>
    );
  }
  if (!data) return null;

  const bitacoraVisible = filtroBitacora ? bitacora.filter((b) => String(b.id_automatizacion) === filtroBitacora) : bitacora;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-sm text-slate-700 space-y-2">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 shrink-0 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
            <i className="bx bx-bot text-2xl" />
          </span>
          <div>
            <div className="font-bold text-slate-900">Mensajes automáticos desde «{data.expertos?.nombre || "Expertos"}»</div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cada secuencia manda una plantilla de WhatsApp por paso. Un paso sale solo si el cliente <b>no respondió</b> al
              anterior; si responde, la secuencia se detiene y la sigue el asesor desde el chat. Ningún cliente recibe más de una
              automatización cada {data.min_dias_entre_mensajes} días, ni nada si escribió en los últimos 2 días. Horario: 9 a. m. a 7 p. m.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 p-2.5">
            <b>Plantillas.</b> A quien no escribió en 24 h solo se le puede mandar una plantilla aprobada por Meta. Cada paso trae el
            texto sugerido: créalo en <b>Plantillas</b> de la conexión Expertos con ese nombre y, cuando Meta lo apruebe, aparece aquí
            en verde.
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5">
            <b>Descuento 10%.</b> El paso marcado aplica el cupón al cliente en Stripe: su <b>próxima factura</b> sale con 10% menos y
            en Stripe se ve a quién se le dio. Una factura ya emitida no se puede rebajar, por eso al pago rebotado se le dice
            «paga la pendiente y la próxima va con 10%».
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5">
            <b>Prender.</b> Todo nace apagado. Un administrador elige la fecha de inicio y activa cada secuencia. «Simular» muestra a
            quién le llegaría hoy sin enviar nada; «Enviar ahora» manda un paso a mano a toda la cohorte.
          </div>
        </div>
      </div>

      {data.automatizaciones.map((a) => (
        <TarjetaAutomatizacion
          key={a.id}
          a={a}
          plantillas={plantillas}
          aprobadas={aprobadas}
          variables={data.variables}
          puedeConfigurar={puedeConfigurar}
          onCambio={cargar}
          nombreExpertos={data.expertos?.nombre || "Soporte Expertos"}
        />
      ))}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-sm font-bold text-slate-800">Bitácora de envíos</div>
            <p className="text-xs text-slate-500">Qué se mandó, a quién, si llegó y si respondió. Los «omitidos» explican por qué no se envió.</p>
          </div>
          <select value={filtroBitacora} onChange={(e) => setFiltroBitacora(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1">
            <option value="">Todas las secuencias</option>
            {data.automatizaciones.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">Cuándo</th>
              <th className="text-left px-3 py-2">Secuencia · paso</th>
              <th className="text-left px-3 py-2">Cliente</th>
              <th className="text-left px-3 py-2">Estado</th>
              <th className="text-left px-3 py-2">Respondió</th>
              <th className="text-left px-3 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bitacoraVisible.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{fmtFechaHora(b.created_at)}</td>
                <td className="px-3 py-2 text-xs">
                  <div className="font-semibold text-slate-800">{b.automatizacion}</div>
                  <div className="text-slate-500">Paso {b.orden}{b.paso_titulo ? ` · ${b.paso_titulo}` : ""} {b.origen?.startsWith("manual") ? "· manual" : ""}</div>
                </td>
                <td className="px-3 py-2 text-xs">
                  <div className="font-semibold text-slate-800">{b.empresa || b.email || `Usuario ${b.id_usuario}`}</div>
                  <div className="text-slate-500">{b.telefono ? `+${b.telefono}` : ""}</div>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ring-1 ${ESTADO_ENVIO[b.estado] || ESTADO_ENVIO.omitido}`}>{b.estado}</span>
                  {b.descuento_aplicado ? <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">10% aplicado</div> : null}
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">{b.respondio_en ? fmtFechaHora(b.respondio_en) : "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-500 max-w-[260px] truncate" title={b.detalle || b.error_message || ""}>
                  {b.detalle || b.error_message || b.nombre_template || ""}
                </td>
              </tr>
            ))}
            {!bitacoraVisible.length && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">Todavía no se ha enviado nada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TarjetaAutomatizacion({ a, plantillas, aprobadas, variables, puedeConfigurar, onCambio, nombreExpertos }) {
  const [abierta, setAbierta] = useState(false);
  const [inicio, setInicio] = useState(toLocalInput(a.inicia_en));
  const [simulacion, setSimulacion] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const listaParaPrender = a.pasos.some((p) => p.activo && p.nombre_template && plantillas?.[p.nombre_template]);

  const patch = async (cambios, ok = "Guardado") => {
    setOcupado(true);
    try {
      await chatApi.patch(`recuperacion/automatizaciones/${a.id}`, cambios);
      toast.success(ok);
      onCambio();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo guardar");
    } finally {
      setOcupado(false);
    }
  };

  const prender = async () => {
    if (a.activa) return patch({ activa: false }, "Secuencia apagada");
    const sinPlantilla = a.pasos.filter((p) => p.activo && (!p.nombre_template || !plantillas?.[p.nombre_template]));
    const r = await Swal.fire({
      title: `Activar «${a.nombre}»`,
      html: `<div style="text-align:left;font-size:13px;line-height:1.5">
        <p>Empieza <b>${inicio ? new Date(inicio).toLocaleString("es-EC") : "ahora mismo"}</b> y corre cada hora de 9 a. m. a 7 p. m.</p>
        <p>Tope: <b>${a.max_por_dia}</b> mensajes por día. Clientes hoy en la cohorte: los ves con «Simular».</p>
        ${sinPlantilla.length ? `<p style="color:#b45309"><b>Ojo:</b> ${sinPlantilla.length} paso(s) no tienen plantilla aprobada en Meta y se saltarán.</p>` : ""}
      </div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, activar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#059669",
    });
    if (!r.isConfirmed) return;
    await patch({ activa: true, inicia_en: inicio ? new Date(inicio).toISOString() : null }, "Secuencia activada");
  };

  const simular = async () => {
    setOcupado(true);
    try {
      const { data } = await chatApi.get(`recuperacion/automatizaciones/${a.id}/simular`);
      setSimulacion(data.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo simular");
    } finally {
      setOcupado(false);
    }
  };

  const enviarAhora = async () => {
    const pasos = a.pasos.filter((p) => p.activo && p.nombre_template && plantillas?.[p.nombre_template]);
    if (!pasos.length) {
      toast.error("Ningún paso tiene una plantilla aprobada en Meta todavía");
      return;
    }
    const opciones = Object.fromEntries(pasos.map((p) => [p.id, `Paso ${p.orden} · ${p.titulo}`]));
    const r = await Swal.fire({
      title: "Enviar ahora a toda la cohorte",
      html: `<p style="font-size:13px;text-align:left">Manda el paso elegido a todos los clientes de <b>${a.cohortes.map((c) => COHORTE_LABEL[c] || c).join(", ")}</b> que tengan número, sin esperar los días de la secuencia. No se manda a quien ya respondió, a quien ya recibió ese paso o lo tiene en cola, ni a quien escribió en los últimos 2 días, y se respeta el tope diario (${a.max_por_dia}).</p>${
        a.activa
          ? `<p style="font-size:12px;text-align:left;color:#047857;margin-top:8px">La secuencia está activa: los pasos siguientes salen solos a quien no responda.</p>`
          : `<p style="font-size:12px;text-align:left;color:#b45309;margin-top:8px"><b>La secuencia está apagada:</b> solo sale este paso. Para que los siguientes salgan solos, actívala con el botón «Activar».</p>`
      }`,
      input: "select",
      inputOptions: opciones,
      inputPlaceholder: "Elige el paso",
      showCancelButton: true,
      confirmButtonText: "Enviar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0e7490",
      inputValidator: (v) => (!v ? "Elige un paso" : undefined),
    });
    if (!r.isConfirmed) return;
    setOcupado(true);
    try {
      const { data } = await chatApi.post(`recuperacion/automatizaciones/${a.id}/enviar-ahora`, { id_paso: Number(r.value) });
      const d = data.data;
      await Swal.fire({
        icon: "success",
        title: `${num(d?.encolados || 0)} mensajes en cola`,
        html: `<div style="font-size:12px;text-align:left">${num(d?.omitidos || 0)} omitidos${
          d?.motivos && Object.keys(d.motivos).length
            ? ": " + Object.entries(d.motivos).map(([k, v]) => `${k} (${v})`).join(", ")
            : ""
        }. Los envíos salen en el próximo minuto por el cron de plantillas; el estado se actualiza en la bitácora.</div>`,
      });
      onCambio();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo enviar");
    } finally {
      setOcupado(false);
    }
  };

  const s = a.stats;
  return (
    <div className={`bg-white rounded-xl border shadow-sm ${a.activa ? "border-emerald-300" : "border-slate-200"}`}>
      <div className="p-4 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ring-1 ${a.activa ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
              {a.activa ? (a.inicia_en && new Date(a.inicia_en) > new Date() ? `Programada · ${new Date(a.inicia_en).toLocaleDateString("es-EC")}` : "Activa") : "Apagada"}
            </span>
            <h3 className="text-base font-extrabold text-slate-900">{a.nombre}</h3>
            {a.cohortes.map((c) => (
              <span key={c} className={`px-2 py-0.5 rounded text-[11px] font-semibold ring-1 ${(COHORTE_UI[c] || COHORTE_UI.manual).cls}`}>{COHORTE_LABEL[c] || c}</span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1">{a.descripcion}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>Enviados 30d: <b className="text-slate-900">{num(s.enviados)}</b></span>
            <span>Respondieron: <b className="text-emerald-700">{num(s.respondieron)}</b></span>
            <span>Se recuperaron después: <b className="text-emerald-700">{num(s.convertidos)}</b></span>
            <span>Descuentos dados: <b className="text-slate-900">{num(s.descuentos)}</b></span>
            {s.errores > 0 && <span>Errores: <b className="text-rose-600">{num(s.errores)}</b></span>}
            {s.ultimo && <span className="text-slate-400">Último: {fmtFechaHora(s.ultimo)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={simular} disabled={ocupado} className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50">
            <i className="bx bx-show" /> Simular
          </button>
          <button onClick={enviarAhora} disabled={ocupado} className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700 disabled:opacity-50">
            <i className="bx bx-send" /> Enviar ahora…
          </button>
          {puedeConfigurar && (
            <button
              onClick={prender}
              disabled={ocupado || (!a.activa && !listaParaPrender)}
              title={!a.activa && !listaParaPrender ? "Primero configura al menos un paso con una plantilla aprobada en Meta" : ""}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 ${a.activa ? "bg-slate-700 hover:bg-slate-800" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              <i className={`bx ${a.activa ? "bx-pause-circle" : "bx-play-circle"}`} /> {a.activa ? "Apagar" : "Activar"}
            </button>
          )}
          <button onClick={() => setAbierta((v) => !v)} className="px-2 py-1.5 rounded-lg ring-1 ring-slate-200 text-slate-600 text-xs hover:bg-slate-100">
            <i className={`bx ${abierta ? "bx-chevron-up" : "bx-chevron-down"} text-base`} />
          </button>
        </div>
      </div>

      {simulacion && (
        <div className="mx-4 mb-3 rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <b className="text-cyan-900">Si corriera ahora</b>
            <button onClick={() => setSimulacion(null)} className="text-slate-400 hover:text-slate-700"><i className="bx bx-x" /></button>
          </div>
          <p className="mt-1">
            {num(simulacion.candidatos)} clientes en la cohorte · enviaría <b>{num(simulacion.enviaria)}</b>
            {simulacion.enviaria_sin_tope > simulacion.tope_diario ? ` (hay ${num(simulacion.enviaria_sin_tope)}, tope ${simulacion.tope_diario}/día)` : ""}
            {Object.keys(simulacion.por_paso || {}).length ? " · por paso: " + Object.entries(simulacion.por_paso).map(([k, v]) => `paso ${k}: ${v}`).join(", ") : ""}
          </p>
          {Object.keys(simulacion.omitidos || {}).length > 0 && (
            <p className="mt-1 text-slate-600">No se enviaría a: {Object.entries(simulacion.omitidos).map(([k, v]) => `${k} (${v})`).join(" · ")}</p>
          )}
          {simulacion.ejemplos?.length > 0 && (
            <p className="mt-1 text-slate-500">Ejemplos: {simulacion.ejemplos.map((e) => `${e.empresa || e.id_usuario} → paso ${e.paso}`).join(" · ")}</p>
          )}
        </div>
      )}

      {abierta && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          {puedeConfigurar && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <label className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-slate-500">Empieza</span>
                <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} onBlur={() => patch({ inicia_en: inicio ? new Date(inicio).toISOString() : null }, "Fecha de inicio guardada")} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg" />
                <span className="text-slate-400">Vacío = en cuanto se active.</span>
              </label>
              <label className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-slate-500">{a.ciclico ? "Cada cuántos días" : "Días entre pasos (si no define el paso)"}</span>
                <input type="number" min="1" defaultValue={a.intervalo_dias} onBlur={(e) => Number(e.target.value) !== a.intervalo_dias && patch({ intervalo_dias: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg" />
              </label>
              <label className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-slate-500">Tope por día</span>
                <input type="number" min="1" defaultValue={a.max_por_dia} onBlur={(e) => Number(e.target.value) !== a.max_por_dia && patch({ max_por_dia: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg" />
              </label>
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-slate-500 block">Reglas</span>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={a.solo_sin_respuesta} onChange={(e) => patch({ solo_sin_respuesta: e.target.checked })} /> Parar si el cliente responde</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={a.incluir_numero_conexion} onChange={(e) => patch({ incluir_numero_conexion: e.target.checked })} /> Incluir a quien solo tiene el número de su bot</label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4">
            <div className="space-y-3 min-w-0">
              {a.pasos.map((p) => (
                <Paso key={p.id} p={p} a={a} plantillas={plantillas} aprobadas={aprobadas} variables={variables} puedeConfigurar={puedeConfigurar} onCambio={onCambio} />
              ))}
            </div>
            {/* La secuencia completa como la vería el cliente, con días entre mensajes */}
            <div className="xl:sticky xl:top-4 self-start">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Así lo ve el cliente</div>
              <Telefono titulo={nombreExpertos}>
                {(() => {
                  let dia = 0;
                  return a.pasos.filter((p) => p.activo).map((p, i) => {
                    if (i > 0) dia += a.ciclico ? a.intervalo_dias : p.espera_dias;
                    const etiqueta = i === 0 ? (a.ciclico ? "Día 1" : "Al entrar en riesgo") : `Día ${dia + 1}${a.solo_sin_respuesta ? " · si no respondió" : ""}`;
                    return <BurbujaWhatsApp key={p.id} etiqueta={etiqueta} texto={conEjemplos(p.texto_sugerido, p.parametros)} hora={`10:${20 + i * 2}`} />;
                  });
                })()}
              </Telefono>
              <p className="mt-2 text-[11px] text-slate-500 max-w-[380px]">
                Ejemplo con datos ficticios: «Carolina», «Plan ImporChat». Al enviar, cada variable se rellena con los datos reales del cliente.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Paso({ p, a, plantillas, aprobadas, variables, puedeConfigurar, onCambio }) {
  const [tpl, setTpl] = useState(p.nombre_template || "");
  const [params, setParams] = useState((p.parametros || []).join(", "));
  const [espera, setEspera] = useState(p.espera_dias);
  const [verTexto, setVerTexto] = useState(false);
  const meta = tpl ? plantillas?.[tpl] : null;
  const estadoTpl = !tpl ? "sin" : !meta ? "no_existe" : String(meta.status).toUpperCase() === "APPROVED" ? "ok" : "pendiente";

  const guardar = async () => {
    try {
      await chatApi.patch(`recuperacion/automatizaciones/pasos/${p.id}`, {
        nombre_template: tpl,
        parametros: params.split(",").map((s) => s.trim()).filter(Boolean),
        espera_dias: espera,
      });
      toast.success(`Paso ${p.orden} guardado`);
      onCambio();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo guardar el paso");
    }
  };
  const toggle = async (campo, valor) => {
    try {
      await chatApi.patch(`recuperacion/automatizaciones/pasos/${p.id}`, { [campo]: valor });
      onCambio();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo guardar");
    }
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(p.texto_sugerido || "");
      toast.success("Texto copiado: pégalo al crear la plantilla en Meta");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className={`rounded-lg ring-1 p-3 ${p.activo ? "ring-slate-200 bg-white" : "ring-slate-200 bg-slate-50 opacity-70"}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="h-7 w-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">{p.orden}</span>
          <div className="font-semibold text-slate-900 text-sm">{p.titulo}</div>
          <span className="text-[11px] text-slate-500">
            {p.orden === 1 && !a.ciclico ? "al entrar a la cohorte" : `${a.ciclico ? a.intervalo_dias : p.espera_dias} días después del anterior${a.solo_sin_respuesta ? ", si no respondió" : ""}`}
          </span>
          {p.aplica_descuento && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">aplica 10% en Stripe</span>}
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ring-1 ${
              estadoTpl === "ok" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : estadoTpl === "pendiente" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-rose-50 text-rose-700 ring-rose-200"
            }`}
            title={estadoTpl === "ok" ? "Plantilla aprobada en Meta" : estadoTpl === "pendiente" ? `Plantilla en Meta con estado ${meta?.status}` : estadoTpl === "no_existe" ? "No existe una plantilla con ese nombre en la conexión Expertos" : "Sin plantilla"}
          >
            {estadoTpl === "ok" ? "plantilla aprobada" : estadoTpl === "pendiente" ? `plantilla ${String(meta?.status).toLowerCase()}` : estadoTpl === "no_existe" ? "plantilla no existe en Meta" : "sin plantilla"}
          </span>
        </div>
        {puedeConfigurar && (
          <label className="text-[11px] text-slate-600 flex items-center gap-1">
            <input type="checkbox" checked={p.activo} onChange={(e) => toggle("activo", e.target.checked)} /> paso activo
          </label>
        )}
      </div>

      <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-slate-500">Mensaje {p.orden} · vista previa</span>
            <div className="flex gap-2">
              <button onClick={() => setVerTexto((v) => !v)} className="text-cyan-700 font-semibold hover:underline">{verTexto ? "Ocultar texto" : "Texto para Meta"}</button>
              <button onClick={copiar} className="text-cyan-700 font-semibold hover:underline"><i className="bx bx-copy" /> Copiar</button>
            </div>
          </div>
          <div className="mt-2 rounded-xl bg-[#efeae2] p-3" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,.04) 1px, transparent 0)", backgroundSize: "14px 14px" }}>
            <BurbujaWhatsApp texto={conEjemplos(p.texto_sugerido, p.parametros)} />
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {(p.parametros || []).length
              ? (p.parametros || []).map((t, i) => `{{${i + 1}}} = ${t.replace(/[{}]/g, "")}`).join(" · ")
              : "Sin variables"}
          </div>
          {verTexto && (
            <pre className="mt-2 whitespace-pre-wrap font-sans text-slate-700 bg-slate-50 rounded-lg p-2 leading-relaxed border border-slate-200">{p.texto_sugerido}</pre>
          )}
          {estadoTpl === "ok" && (
            <details className="mt-1">
              <summary className="cursor-pointer text-slate-500">Texto real de la plantilla en Meta</summary>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-slate-700 bg-emerald-50 rounded-lg p-2 leading-relaxed">{cuerpoDe(meta)}</pre>
            </details>
          )}
        </div>
        <div className="text-xs space-y-2">
          {puedeConfigurar ? (
            <>
              <label className="block">
                <span className="font-bold uppercase tracking-wider text-slate-500">Plantilla de Meta</span>
                <input list={`tpls-${p.id}`} value={tpl} onChange={(e) => setTpl(e.target.value)} placeholder="nombre_de_la_plantilla" className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-lg" />
                <datalist id={`tpls-${p.id}`}>
                  {aprobadas.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                </datalist>
              </label>
              <label className="block">
                <span className="font-bold uppercase tracking-wider text-slate-500">Variables, en el orden de {"{{1}}, {{2}}…"}</span>
                <input value={params} onChange={(e) => setParams(e.target.value)} placeholder="{{nombre}}, {{plan}}, {{link_pago}}" className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono" />
                <span className="text-slate-400">
                  Disponibles: {Object.keys(variables || {}).join(" ")}
                </span>
              </label>
              <div className="flex items-end gap-3 flex-wrap">
                {!a.ciclico && p.orden > 1 && (
                  <label className="block">
                    <span className="font-bold uppercase tracking-wider text-slate-500">Días de espera</span>
                    <input type="number" min="0" value={espera} onChange={(e) => setEspera(e.target.value)} className="mt-1 w-24 px-2 py-1.5 border border-slate-300 rounded-lg" />
                  </label>
                )}
                <label className="flex items-center gap-1.5 pb-2"><input type="checkbox" checked={p.aplica_descuento} onChange={(e) => toggle("aplica_descuento", e.target.checked)} /> aplica 10% en Stripe</label>
                <button onClick={guardar} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800">Guardar paso</button>
              </div>
            </>
          ) : (
            <div className="text-slate-600">
              <div><b>Plantilla:</b> {p.nombre_template || "—"}</div>
              <div><b>Variables:</b> {(p.parametros || []).join(", ") || "—"}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

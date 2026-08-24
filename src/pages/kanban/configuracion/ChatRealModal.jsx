// src/pages/kanban/configuracion/ChatRealModal.jsx
// "Probar como cliente": cada mensaje entra por el mismo camino que un mensaje
// real de WhatsApp (el webhook) en el servidor al que está conectado este
// panel, y el bot responde de verdad al número de prueba. La ventana arranca
// vacía: solo muestra lo que pase desde que se abre.
//
// Reglas:
//  - El primer mensaje de cada prueba reinicia la conversación del número
//    (etapa inicial, sin historial previo para el bot).
//  - WhatsApp solo permite responder a un número que escribió al negocio en
//    las últimas 24 horas; si no es el caso, el panel lo indica.
import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";
import { APP_CONFIG } from "../../../config";

const LS_TEL = "prueba_real_telefono";

function Hora({ v }) {
  const d = v ? new Date(v) : new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function etiquetaBot(m) {
  const r = String(m.responsable || "");
  if (r === "IA_mensaje_fijo" || r === "IA_wizard") {
    return { txt: "Mensaje fijo · sin IA", cls: "bg-emerald-100 text-emerald-800" };
  }
  if (r === "IA_respuesta_rapida") {
    return { txt: "Respuesta rápida · sin IA", cls: "bg-emerald-100 text-emerald-800" };
  }
  if (r.startsWith("IA_")) return { txt: "Respondió la IA", cls: "bg-slate-200 text-slate-700" };
  return r ? { txt: r.replace(/_/g, " "), cls: "bg-slate-200 text-slate-700" } : null;
}

export default function ChatRealModal({ open, onClose, columnaNombre }) {
  const [telefono, setTelefono] = useState(() => localStorage.getItem(LS_TEL) || "");
  const [anuncios, setAnuncios] = useState([]);
  const [anuncio, setAnuncio] = useState("");
  const [tituloAnuncio, setTituloAnuncio] = useState("");
  const [mensajes, setMensajes] = useState([]);
  const [contacto, setContacto] = useState(null);
  const [ventana, setVentana] = useState(null);
  const [telefonoNegocio, setTelefonoNegocio] = useState("");
  const [ultimoError, setUltimoError] = useState(null);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [esperando, setEsperando] = useState(false);
  const [desdeId, setDesdeId] = useState(null);
  const [ultimoId, setUltimoId] = useState(0);
  const [pruebaIniciada, setPruebaIniciada] = useState(false);
  const bodyRef = useRef(null);
  const esperaRef = useRef(null);

  const idc = Number(localStorage.getItem("id_configuracion"));
  const servidor = useMemo(() => {
    try {
      return new URL(APP_CONFIG.api.baseURL).host;
    } catch {
      return String(APP_CONFIG.api.baseURL || "");
    }
  }, []);
  const esLocal = /localhost|127\.0\.0\.1|192\.168\./.test(servidor);
  const telDigitos = telefono.replace(/\D/g, "");
  const telOk = telDigitos.length >= 8;
  const linkWa = telefonoNegocio
    ? `https://wa.me/${String(telefonoNegocio).replace(/\D/g, "")}?text=${encodeURIComponent("Hola")}`
    : null;

  /* ── al abrir ── */
  useEffect(() => {
    if (!open) return;
    setMensajes([]);
    setContacto(null);
    setVentana(null);
    setInput("");
    setUltimoError(null);
    setPruebaIniciada(false);
    chatApi
      .post("/pruebas_webhook/anuncios", { id_configuracion: idc }, { silentError: true })
      .then(({ data }) => setAnuncios(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setAnuncios([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ── punto de partida del hilo: solo el último id (la ventana arranca vacía) ── */
  useEffect(() => {
    if (!open || !telOk) return;
    localStorage.setItem(LS_TEL, telefono);
    setPruebaIniciada(false);
    chatApi
      .post(
        "/pruebas_webhook/mensajes",
        { id_configuracion: idc, telefono: telDigitos, desde_id: 0, solo_ultimo: true },
        { silentError: true },
      )
      .then(({ data }) => {
        const d = data?.data || {};
        setContacto(d.contacto || null);
        setVentana(d.ventana_24h || null);
        setTelefonoNegocio(d.telefono_negocio || "");
        const last = Number(d.ultimo_id) || 0;
        setDesdeId(last);
        setUltimoId(last);
        setMensajes([]);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, telefono]);

  /* ── escucha de lo nuevo ── */
  useEffect(() => {
    if (!open || !telOk || desdeId === null) return undefined;
    const tick = async () => {
      try {
        const { data } = await chatApi.post(
          "/pruebas_webhook/mensajes",
          { id_configuracion: idc, telefono: telDigitos, desde_id: ultimoId },
          { silentError: true },
        );
        const d = data?.data || {};
        if (d.contacto) setContacto(d.contacto);
        if (d.ventana_24h) setVentana(d.ventana_24h);
        if (d.telefono_negocio) setTelefonoNegocio(d.telefono_negocio);
        setUltimoError(d.ultimo_error || null);
        if (d.ultimo_error) {
          setEsperando(false);
          clearTimeout(esperaRef.current);
        }
        const nuevos = d.mensajes || [];
        if (nuevos.length) {
          setMensajes((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            return [...prev, ...nuevos.filter((m) => !ids.has(m.id))];
          });
          setUltimoId(Number(d.ultimo_id) || ultimoId);
          if (nuevos.some((m) => Number(m.rol_mensaje) === 1)) {
            setEsperando(false);
            clearTimeout(esperaRef.current);
          }
        }
      } catch {
        /* reintenta en el próximo tick */
      }
    };
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [open, telOk, desdeId, ultimoId, telDigitos, idc]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes, esperando, ultimoError]);

  const reiniciar = async () => {
    if (!telOk) return;
    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: "¿Reiniciar la prueba?",
      text: "El contacto vuelve a la etapa inicial y el asistente deja de considerar la conversación anterior.",
      showCancelButton: true,
      confirmButtonText: "Reiniciar",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    try {
      const { data } = await chatApi.post("/pruebas_webhook/reiniciar", {
        id_configuracion: idc,
        telefono: telDigitos,
      });
      const d = data?.data || {};
      setMensajes([]);
      setUltimoError(null);
      setPruebaIniciada(false);
      if (d.desde_id != null) {
        setDesdeId(d.desde_id);
        setUltimoId(d.desde_id);
      }
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: d.reiniciado ? "success" : "info",
        title: d.reiniciado ? `Prueba reiniciada en “${d.columna}”` : d.motivo || "Nada que reiniciar",
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (e) {
      Swal.fire({ icon: "error", title: e?.response?.data?.message || "No se pudo reiniciar" });
    }
  };

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || !telOk || enviando) return;
    setEnviando(true);
    try {
      const { data } = await chatApi.post("/pruebas_webhook/enviar", {
        id_configuracion: idc,
        telefono: telDigitos,
        mensaje: texto,
        referral_source_id: anuncio && anuncio !== "__manual__" ? anuncio : "",
        headline: anuncio === "__manual__" ? tituloAnuncio.trim() : "",
        reiniciar: !pruebaIniciada,
      });
      setInput("");
      setUltimoError(null);
      const d = data?.data || {};
      if (!pruebaIniciada) {
        setPruebaIniciada(true);
        setMensajes([]);
        if (d.desde_id != null) {
          setDesdeId(d.desde_id);
          setUltimoId(d.desde_id);
        }
      } else if (desdeId === null && d.desde_id != null) {
        setDesdeId(d.desde_id);
        setUltimoId(d.desde_id);
      }
      setEsperando(true);
      clearTimeout(esperaRef.current);
      esperaRef.current = setTimeout(() => setEsperando(false), 90000);
      if (anuncio) {
        setAnuncio("");
        setTituloAnuncio("");
      }
    } catch (e) {
      Swal.fire({ icon: "error", title: e?.response?.data?.message || "No se pudo enviar" });
    } finally {
      setEnviando(false);
    }
  };

  if (!open) return null;

  const ventanaAbierta = Boolean(ventana?.abierta);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3">
      <div className="w-full max-w-3xl h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-[#171931] text-white">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-white/60">
              Probar como cliente
            </div>
            <div className="font-semibold truncate">
              Conversación real por WhatsApp con el asistente
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[11px] rounded-full px-2.5 py-1 ring-1 ${
                esLocal
                  ? "bg-amber-500/20 text-amber-200 ring-amber-400/40"
                  : "bg-white/10 text-white/80 ring-white/20"
              }`}
              title="Servidor donde se ejecuta la prueba"
            >
              <i className="bx bx-server mr-1" />
              {esLocal ? `Entorno local (${servidor})` : servidor}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center"
              title="Cerrar"
            >
              <i className="bx bx-x text-2xl" />
            </button>
          </div>
        </div>

        {/* Parámetros de la prueba */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 space-y-2">
          <div className="grid sm:grid-cols-12 gap-2 items-start">
            <div className="sm:col-span-4">
              <label className="block h-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500 truncate">
                Número de WhatsApp de prueba
              </label>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/[^\d+ ]/g, ""))}
                placeholder="593999999999"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="sm:col-span-6">
              <label className="block h-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500 truncate">
                Origen del primer mensaje
              </label>
              <select
                value={anuncio}
                onChange={(e) => setAnuncio(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Mensaje directo</option>
                {anuncios.map((a) => (
                  <option key={a.source_id} value={a.source_id}>
                    Anuncio: {a.producto || a.headline}
                    {a.producto && a.headline && a.producto !== a.headline ? ` — ${a.headline}` : ""}
                    {Number(a.wizard) === 1 ? " · con mensaje fijo" : ""}
                  </option>
                ))}
                <option value="__manual__">Anuncio con otro título…</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <span className="block h-4" aria-hidden="true" />
              <button
                type="button"
                onClick={reiniciar}
                disabled={!telOk}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-700 hover:border-indigo-400 disabled:opacity-50"
                title="Etapa inicial y sin historial previo para el asistente"
              >
                <i className="bx bx-reset" /> Reiniciar
              </button>
            </div>
            {anuncio === "__manual__" ? (
              <div className="sm:col-span-12">
                <input
                  value={tituloAnuncio}
                  onChange={(e) => setTituloAnuncio(e.target.value)}
                  placeholder="Título del anuncio (el producto se identifica por este texto)"
                  className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  autoFocus
                />
              </div>
            ) : null}
          </div>

          {telOk && ventana ? (
            ventanaAbierta ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900">
                <span>
                  <i className="bx bx-check-circle mr-1" />
                  Conversación activa con este número.{" "}
                  {pruebaIniciada
                    ? "Prueba en curso."
                    : "El primer mensaje inicia una prueba nueva: etapa inicial y sin historial previo."}
                </span>
                {contacto ? (
                  <span className="rounded-full bg-white ring-1 ring-emerald-200 px-2 py-0.5 text-emerald-800">
                    Etapa: <b>{contacto.columna || contacto.estado_contacto || "—"}</b>
                    {contacto.columna_ia === false ? " (atención humana)" : ""}
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                <div>
                  <i className="bx bx-error-circle mr-1" />
                  Para que el asistente pueda responder, este número debe haber escrito al
                  negocio en las últimas 24 horas. Envía un mensaje desde ese WhatsApp y luego
                  escribe aquí: el primer mensaje inicia la prueba en la etapa inicial, sin
                  historial previo.
                </div>
                {linkWa ? (
                  <div className="mt-2">
                    <a
                      href={linkWa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#00a884] text-white px-3 py-1.5 text-[12px] font-semibold hover:brightness-110"
                    >
                      <i className="bx bxl-whatsapp text-base" /> Abrir WhatsApp
                    </a>
                  </div>
                ) : null}
              </div>
            )
          ) : (
            <div className="text-[11.5px] text-slate-500">
              <i className="bx bx-info-circle mr-1" />
              Las respuestas del asistente llegan al WhatsApp indicado y quedan registradas en el
              chat del contacto.
            </div>
          )}
        </div>

        {/* Conversación */}
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
          style={{
            backgroundColor: "#e5ddd5",
            backgroundImage: "radial-gradient(rgba(255,255,255,.35) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        >
          {!telOk ? (
            <div className="text-center text-[12.5px] text-slate-600 bg-white/80 rounded-lg px-3 py-2 mx-auto max-w-md">
              Indica el número de WhatsApp de prueba.
            </div>
          ) : mensajes.length === 0 && !esperando && !ultimoError ? (
            <div className="text-center text-[12.5px] text-slate-600 bg-white/80 rounded-lg px-3 py-2 mx-auto max-w-md">
              Escribe como lo haría un cliente. Ejemplos: “Hola, quiero información”, “¿Tiene
              garantía?”, “Quiero 2”.
              {columnaNombre ? (
                <div className="text-[11px] text-slate-400 mt-1">
                  La prueba inicia en la etapa inicial del tablero.
                </div>
              ) : null}
            </div>
          ) : null}

          {mensajes.map((m) => {
            const esBot = Number(m.rol_mensaje) === 1;
            const et = esBot ? etiquetaBot(m) : null;
            const esMedia = ["image", "video"].includes(String(m.tipo_mensaje));
            return (
              <div key={m.id} className={`flex ${esBot ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-[13px] leading-relaxed shadow-sm whitespace-pre-line break-words ${
                    esBot ? "bg-[#dcf8c6] rounded-tr-sm" : "bg-white rounded-tl-sm"
                  }`}
                >
                  {esMedia ? (
                    m.tipo_mensaje === "video" ? (
                      <video src={m.ruta_archivo} className="h-44 w-48 rounded-lg object-cover bg-black" controls muted />
                    ) : (
                      <img src={m.ruta_archivo} alt="" className="h-44 w-48 rounded-lg object-cover" />
                    )
                  ) : m.tipo_mensaje === "referral" ? (
                    <span>
                      <span className="block text-[10px] text-slate-400">Desde un anuncio</span>
                      {m.texto_mensaje}
                    </span>
                  ) : (
                    m.texto_mensaje
                  )}
                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    {et ? (
                      <span className={`rounded px-1.5 py-0.5 text-[9.5px] font-semibold ${et.cls}`}>
                        {et.txt}
                      </span>
                    ) : null}
                    <span className="text-[9.5px] text-slate-400">
                      <Hora v={m.created_at} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {ultimoError ? (
            <div className="mx-auto max-w-lg rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900 shadow-sm">
              {ultimoError.ventana_24h ? (
                <>
                  <b>WhatsApp no permitió enviar la respuesta:</b> este número no ha escrito al
                  negocio en las últimas 24 horas. Envía un mensaje desde ese WhatsApp y vuelve a
                  escribir aquí.
                  {linkWa ? (
                    <div className="mt-2">
                      <a
                        href={linkWa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#00a884] text-white px-3 py-1.5 text-[12px] font-semibold hover:brightness-110"
                      >
                        <i className="bx bxl-whatsapp text-base" /> Abrir WhatsApp
                      </a>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <b>WhatsApp rechazó la respuesta</b>
                  {ultimoError.codigo ? ` (código ${ultimoError.codigo})` : ""}:{" "}
                  {ultimoError.mensaje}
                </>
              )}
            </div>
          ) : null}

          {esperando && !ultimoError ? (
            <div className="flex justify-end">
              <div className="rounded-xl bg-[#dcf8c6] px-3 py-2 text-[12px] text-slate-500 shadow-sm inline-flex items-center gap-2">
                <i className="bx bx-loader-alt bx-spin" /> El asistente está respondiendo…
              </div>
            </div>
          ) : null}
        </div>

        {/* Entrada */}
        <div className="border-t border-slate-200 bg-[#f0f2f5] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
              disabled={!telOk || enviando}
              placeholder={
                !telOk
                  ? "Indica el número de prueba"
                  : pruebaIniciada
                    ? "Escribe como el cliente"
                    : "Escribe como el cliente (el primer mensaje inicia la prueba)"
              }
              className="flex-1 rounded-full bg-white px-4 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={enviar}
              disabled={!telOk || enviando || !input.trim()}
              className="h-9 w-9 rounded-full bg-[#00a884] text-white flex items-center justify-center disabled:opacity-50"
              title="Enviar"
            >
              <i className={`bx ${enviando ? "bx-loader-alt bx-spin" : "bxs-send"}`} />
            </button>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            <span className="inline-block rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 font-semibold mr-1">
              Sin IA
            </span>
            mensaje fijo o respuesta rápida del producto ·{" "}
            <span className="inline-block rounded bg-slate-200 text-slate-700 px-1.5 py-0.5 font-semibold mr-1">
              IA
            </span>
            respuesta del asistente.
          </div>
        </div>
      </div>
    </div>
  );
}

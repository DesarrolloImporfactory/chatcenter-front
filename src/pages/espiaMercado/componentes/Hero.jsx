import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import chatApi from "../../../api/chatcenter";
import KpiTile from "./KpiTile";
import CuentasDropi from "./CuentasDropi";
import { abrirComplemento, abrirExtension } from "./Complemento";
import { ADDON_IMPORKILLER, Aviso, PAISES, TOKENS, btnBlanco, btnOscuro, fmtCorto, fmtDia, fmtFecha, fmtNum, haceCuanto, nombrePais, textoError } from "../ui";

/* «YYYY-MM-DD» de hace n días en la hora local (las fechas del back vienen así). */
const diaLocal = (haceDias = 0) => {
  const d = new Date(Date.now() - haceDias * 864e5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ═══════════════════════════════════════════════════════════════════════
   Cabecera oscura de /imporkiller (ImporKiller): título, país, KPIs,
   estado del recolector (con barra de avance si está corriendo), botón de
   la extensión (o del complemento si la cuenta no lo tiene), reporte y
   «¿Cómo funciona?». Lo de operar el recolector —cuenta de Dropi en uso,
   «Cuentas de mapeo», Prueba corta, Correr pasada— solo lo ve el super
   administrador (`acceso.superAdmin`, que viene del back en /espia/estado).
   ═══════════════════════════════════════════════════════════════════════ */

const ESTIMADO_CATALOGO = { EC: 47400, MX: 40000, CO: 60000, QA: 120 };
const HORARIO = { EC: "02:15 y 12:15", MX: "02:52 y 12:52", CO: "04:05 y 14:05" };

export default function Hero({ pais, onPais, estado, cargando, error, onRecargar, onVerReporte, acceso }) {
  const superAdmin = !!acceso?.superAdmin;
  const conAddon = !!acceso?.addon;
  const ud = estado?.ventas_ultimo_dia || null;
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [comoFunciona, setComoFunciona] = useState(false);
  const [verCuentas, setVerCuentas] = useState(false);

  const u = estado?.ultima_pasada;
  const corriendo = !!estado?.corriendo || u?.estado === "corriendo" || u?.estado === "en_curso";
  const freno = estado?.freno_hasta ? new Date(estado.freno_hasta) : null;
  const frenado = !!(freno && freno.getTime() > Date.now());
  const sinDatos = !cargando && !error && !Number(estado?.productos_total);
  const cuenta = estado?.cuenta || null;
  const cuentas = estado?.cuentas || null;
  const sinCuenta = !!cuenta?.error;

  const correr = async (corta = false) => {
    setOcupado(true);
    setMsg(null);
    try {
      await chatApi.post("/espia/pasada", corta ? { pais, max_paginas: 5 } : { pais });
      setMsg({
        tipo: "ok",
        texto: corta
          ? "Prueba corta iniciada: 5 páginas, unos 20 segundos. Si queda «Completa» con ~200 productos, la llave y la IP del servidor están bien."
          : "Pasada iniciada. Tarda alrededor de una hora; puedes seguir trabajando, el avance se actualiza solo.",
      });
      onRecargar?.();
    } catch (err) {
      setMsg({ tipo: "error", texto: textoError(err) });
    } finally {
      setOcupado(false);
    }
  };

  /* Avance de la pasada en curso: el back actualiza el contador cada 25
     páginas. La meta es lo que trajo la última pasada completa; sin ella,
     el total conocido del país o el estimado. */
  const completa = estado?.ultima_completa || null;
  const estimado = Number(completa?.productos) > 0 ? Number(completa.productos) : Math.max(Number(estado?.productos_total) || 0, ESTIMADO_CATALOGO[pais] || 40000);
  const avance = corriendo ? Math.min(99, Math.round(((Number(u?.productos) || 0) / estimado) * 100)) : 0;

  const estadoTexto = !u ? "Sin pasadas todavía" : corriendo ? "Pasada en curso" : u.estado === "ok" ? "Última foto completa" : u.estado === "frenada" ? "Frenada por Dropi (429)" : "Última pasada con error";
  const estadoTono = !u ? "blanco" : corriendo ? "verde" : u.estado === "ok" ? "sky" : u.estado === "frenada" ? "ambar" : "rosa";

  return (
    <section
      className="relative overflow-hidden rounded-[26px] text-white shadow-[0_40px_100px_-30px_rgba(11,20,38,0.8)] ring-1 ring-white/10"
      style={{
        background:
          "radial-gradient(110% 80% at 0% 0%, rgba(14,165,233,0.32) 0%, rgba(11,20,38,0) 55%), radial-gradient(70% 60% at 100% 100%, rgba(37,211,102,0.16) 0%, rgba(11,20,38,0) 60%), linear-gradient(180deg, #0B1426 0%, #0a1222 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

      <div className="relative px-5 pb-5 pt-6 sm:px-7 md:px-9 md:pb-7 md:pt-8">
        {/* ── Fila 1: título · país · acciones ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: TOKENS.verde }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: TOKENS.verde }} />
              </span>
              Inteligencia de mercado · {superAdmin ? "dirección" : "ImporChat"}
            </div>
            <h1 className="mt-3 flex items-center gap-3 text-[30px] font-extrabold leading-[1.05] tracking-tight sm:text-[36px]">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-[#0f1b33] text-sky-300">
                <i className="bx bx-radar text-[26px]" />
              </span>
              Impor
              <span className="-ml-3 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${TOKENS.sky} 0%, ${TOKENS.cyan} 100%)` }}>
                Killer
              </span>
            </h1>
            <p className="mt-2 max-w-[60ch] text-[14px] leading-6 text-slate-300">
              Qué se está vendiendo en Dropi, qué anuncios llevan semanas activos y qué tiendas están pautando en {nombrePais(pais)}. Ventas estimadas por la baja de stock entre dos fotos diarias del catálogo.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div role="radiogroup" aria-label="País" className="inline-flex rounded-2xl border border-white/10 bg-white/[0.06] p-1 backdrop-blur">
              {PAISES.map((p) => {
                const activo = p.code === pais;
                return (
                  <button
                    key={p.code}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    onClick={() => onPais(p.code)}
                    className={`relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${activo ? "text-[#0B1426]" : "text-slate-300 hover:text-white"}`}
                  >
                    {activo ? <motion.span layoutId="pais-activo" className="absolute inset-0 rounded-xl bg-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.7)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                    <span className="relative text-base leading-none">{p.bandera}</span>
                    <span className="relative">{p.nombre}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={btnOscuro} onClick={onRecargar} title="Refrescar estado" aria-label="Refrescar estado">
                <i className={`bx bx-refresh ${cargando ? "animate-spin" : ""}`} />
              </button>
              {/* El resumen del día es material de dirección (texto para
                  WhatsApp): al cliente solo le estorba, no lo ve. */}
              {superAdmin ? (
                <button type="button" className={btnOscuro} onClick={onVerReporte}>
                  <i className="bx bx-receipt" /> Resumen de hoy
                </button>
              ) : null}
              {/* Extensión de Chrome: con el complemento se descarga; sin él,
                  el botón sale bloqueado y abre la venta (como el límite de
                  conexiones). Mientras no se sabe el acceso, no se muestra. */}
              {acceso?.cargado ? (
                conAddon ? (
                  <button type="button" className={superAdmin ? btnOscuro : btnBlanco} onClick={abrirExtension} title="Descargar la extensión de Chrome e instalarla">
                    <i className="bx bxl-chrome" /> Descargar extensión
                  </button>
                ) : (
                  <button type="button" className={`${btnBlanco} ring-2 ring-amber-300/60`} onClick={abrirComplemento} title={`La extensión y los anuncios son el complemento ImporKiller ($${ADDON_IMPORKILLER.precio}/mes)`}>
                    <i className="bx bx-lock-alt text-amber-500" /> Extensión y anuncios
                    <span className="ml-0.5 rounded-md bg-[#0B1426]/10 px-1.5 py-0.5 text-[11px] font-extrabold">${ADDON_IMPORKILLER.precio}/mes</span>
                  </button>
                )
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Fila 2: KPIs. El cliente ve el mercado (productos, ventas,
            historial, anuncios, tiendas); la operación del recolector
            (páginas, errores, latencia) solo la ve el super administrador. ── */}
        {superAdmin ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
            <KpiTile label="Productos vigilados" valor={fmtCorto(estado?.productos_total)} sub={estado?.productos_ultima_vez ? `Última foto ${haceCuanto(estado.productos_ultima_vez)}` : "Sin fotos todavía"} icono="bx-package" tono="sky" cargando={cargando} />
            <KpiTile
              label="Ventas estimadas 24 h"
              valor={u && !corriendo && u.estado === "ok" ? fmtCorto(u.ventas_sumadas) : u?.estado === "corriendo" && Number(u.ventas_sumadas) ? fmtCorto(u.ventas_sumadas) : "—"}
              sub={u?.estado === "ok" ? "unidades que bajaron de stock" : corriendo ? "se suman al terminar" : "necesita dos fotos"}
              icono="bx-cart-download"
              tono="verde"
              cargando={cargando}
            />
            <KpiTile label="Días medidos" valor={fmtNum(estado?.dias_con_ventas)} sub={Number(estado?.dias_con_ventas) >= 30 ? "atajos de 30 días listos" : `faltan ${Math.max(0, 30 - (Number(estado?.dias_con_ventas) || 0))} para los atajos de 30 d`} icono="bx-calendar-check" tono="cyan" cargando={cargando} />
            <KpiTile
              label="Anuncios espiados"
              valor={fmtCorto(estado?.extension?.anuncios_total)}
              sub={Number(estado?.radar?.con_anuncios) > 0 ? `${fmtNum(estado.radar.con_anuncios)} productos con anuncios · radar ${haceCuanto(estado.radar.ultimo)}` : estado?.extension?.ultimo_envio ? `Último envío ${haceCuanto(estado.extension.ultimo_envio)}` : "nada desde la extensión"}
              icono="bx-images"
              tono="sky"
              cargando={cargando}
            />
            <KpiTile label="Tiendas espiadas" valor={fmtCorto(estado?.extension?.tiendas_total)} sub="dominios que pautan" icono="bx-store" tono="cyan" cargando={cargando} />
            <KpiTile
              label="Recolector"
              valor={estadoTexto}
              sub={u ? (corriendo ? `Desde ${fmtFecha(u.inicio)} · ${fmtNum(u.productos)} fichas` : `${fmtFecha(u.fin || u.inicio)} · ${fmtNum(u.paginas)} págs`) : "Pulsa «Correr pasada ahora»"}
              live={corriendo}
              icono={!corriendo ? (u?.estado === "ok" ? "bx-check-shield" : u ? "bx-error" : "bx-time-five") : undefined}
              tono={estadoTono}
              cargando={cargando}
            />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <KpiTile label="Productos analizados" valor={fmtCorto(estado?.productos_total)} sub={estado?.productos_ultima_vez ? `Catálogo de Dropi · actualizado ${haceCuanto(estado.productos_ultima_vez)}` : "Catálogo de Dropi"} icono="bx-package" tono="sky" cargando={cargando} />
            {/* Último día cerrado: siempre hay un número (hoy solo se sabe
                con la foto de la noche, y «se calcula en la próxima
                actualización» dejaba al cliente en la nada). */}
            <KpiTile
              label={ud && ud.fecha === diaLocal(1) ? "Ventas estimadas ayer" : "Ventas del último día"}
              valor={ud ? fmtCorto(ud.unidades) : "—"}
              sub={ud ? `unidades en ${nombrePais(pais)} el ${fmtDia(ud.fecha)}${Number(estado?.ventas_hoy) > 0 ? ` · hoy van ${fmtCorto(estado.ventas_hoy)}` : ""}` : "aparece con la segunda foto del catálogo"}
              icono="bx-cart-download"
              tono="verde"
              cargando={cargando}
            />
            <KpiTile
              label="Historial"
              valor={Number(estado?.dias_con_ventas) ? `${fmtNum(estado.dias_con_ventas)} ${Number(estado.dias_con_ventas) === 1 ? "día" : "días"}` : "—"}
              sub={Number(estado?.dias_con_ventas) >= 30 ? "ventas de 7 y 30 días disponibles" : Number(estado?.dias_con_ventas) >= 14 ? "ventas de 7 días y comparación semanal" : "de ventas estimadas; crece cada día"}
              icono="bx-calendar-check"
              tono="cyan"
              cargando={cargando}
            />
            <KpiTile
              label="Anuncios"
              valor={fmtCorto(estado?.extension?.anuncios_total)}
              sub={Number(estado?.radar?.con_anuncios) > 0 ? `en ${fmtNum(estado.radar.con_anuncios)} productos · Biblioteca de Meta` : "de la Biblioteca de anuncios de Meta"}
              icono="bx-images"
              tono="sky"
              cargando={cargando}
            />
            <KpiTile label="Tiendas" valor={fmtCorto(estado?.extension?.tiendas_total)} sub={`que pautan en ${nombrePais(pais)}`} icono="bx-store" tono="cyan" cargando={cargando} />
          </div>
        )}

        {/* ── Operación del recolector (solo super admin): la cuenta en turno,
            la última pasada completa y el cron a la izquierda; los botones de
            operar a la derecha. Antes iban en la cabecera, donde seis botones
            se apilaban en dos o tres filas debajo del selector de país. ── */}
        {superAdmin ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-400">
              {sinCuenta ? (
                <button type="button" className="inline-flex items-center gap-1.5 text-left text-amber-300 hover:text-amber-200" onClick={() => setVerCuentas(true)}>
                  <i className="bx bx-error-circle" /> {nombrePais(pais)} no tiene cuenta de Dropi registrada: <u>agrégala en Cuentas de mapeo</u>
                </button>
              ) : cuenta?.origen === "registrada" ? (
                <button type="button" className="inline-flex items-center gap-1.5 text-left hover:text-white" onClick={() => setVerCuentas(true)} title={`Cuenta #${cuenta.id}${cuenta.etiqueta ? ` · ${cuenta.etiqueta}` : ""} · token ····${cuenta.token_last4 || ""}`}>
                  <i className="bx bx-key" style={{ color: TOKENS.verde }} /> Próxima foto con <b className="text-slate-200">{cuenta.correo}</b>
                  {Number(cuentas?.activas) > 1 ? <span className="hidden sm:inline">· {cuentas.activas} cuentas en turno</span> : null}
                  {Number(cuentas?.con_error) > 0 ? <span className="text-rose-300">· {cuentas.con_error} con error</span> : null}
                </button>
              ) : cuenta?.origen === "configuracion" ? (
                <button type="button" className="inline-flex items-center gap-1.5 text-left text-amber-200 hover:text-white" onClick={() => setVerCuentas(true)} title={`Integración #${cuenta.id} de la configuración ${cuenta.id_configuracion}`}>
                  <i className="bx bx-key" /> Respaldo: <b>{cuenta.store_name}</b> <span className="hidden sm:inline">(cfg {cuenta.id_configuracion}) · sin cuentas registradas, </span><u>registrar</u>
                </button>
              ) : cuenta?.origen === "mock" ? (
                <span className="inline-flex items-center gap-1.5">
                  <i className="bx bx-key" /> Respuestas guardadas (QA)
                </span>
              ) : null}
              {completa ? (
                <span className="inline-flex items-center gap-1.5" title={`Pasada #${completa.id} · terminó ${fmtFecha(completa.fin)}`}>
                  <i className="bx bx-check-shield" style={{ color: TOKENS.verde }} /> Última completa <b className="text-slate-200">{haceCuanto(completa.fin)}</b> · {fmtNum(completa.productos)} fichas · {fmtNum(completa.minutos)} min
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <i className="bx bx-time-five" style={{ color: TOKENS.verde }} /> Fotos automáticas {HORARIO[pais] || "02:15 y 12:15"} · {estado?.cron_activo ? "cron activo" : "cron apagado"}
              </span>
              {frenado ? (
                <span className="inline-flex items-center gap-1.5 text-amber-300">
                  <i className="bx bx-pause-circle" /> Frenado por Dropi hasta {fmtFecha(freno)}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={`${btnOscuro} ${sinCuenta ? "ring-2 ring-amber-300/70" : ""}`} onClick={() => setVerCuentas(true)} title="Correos y tokens de Dropi con los que se mapea cada país">
                <i className="bx bx-key" /> Cuentas de mapeo
                {cuentas ? <span className={`ml-0.5 rounded-md px-1.5 py-0.5 text-[11px] ${Number(cuentas.activas) > 0 ? "bg-emerald-400/20 text-emerald-200" : "bg-amber-400/20 text-amber-200"}`}>{Number(cuentas.activas) || 0}</span> : null}
              </button>
              <button type="button" className={btnOscuro} disabled={ocupado || frenado || corriendo || sinCuenta} onClick={() => correr(true)} title="Lee solo 5 páginas del catálogo para comprobar el token y la IP del servidor">
                <i className="bx bx-test-tube" /> Prueba corta
              </button>
              <button type="button" className={btnBlanco} disabled={ocupado || frenado || corriendo || sinCuenta} onClick={() => correr(false)}>
                <i className={`bx ${ocupado ? "bx-loader-alt animate-spin" : "bx-play"}`} /> Correr pasada ahora
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Avance de la pasada en curso (el cliente solo ve que se está
            actualizando; los contadores de páginas son del super admin) ── */}
        <AnimatePresence>
          {corriendo && !superAdmin ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-[12px] text-slate-300">
                <i className="bx bx-loader-alt animate-spin text-sky-300" /> Actualizando el catálogo de {nombrePais(pais)}; los datos se refrescan solos al terminar.
              </div>
            </motion.div>
          ) : null}
          {corriendo && superAdmin ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-300">
                  <span className="inline-flex items-center gap-2 font-bold text-white">
                    <i className="bx bx-loader-alt animate-spin text-sky-300" /> Fotografiando el catálogo de {nombrePais(pais)}…
                  </span>
                  <span>
                    {fmtNum(u?.productos)} de ~{fmtCorto(estimado)} fichas · {fmtNum(u?.paginas)} páginas · {avance} %
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${TOKENS.sky}, ${TOKENS.cyan})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(2, avance)}%` }}
                    transition={{ type: "spring", stiffness: 80, damping: 20 }}
                  />
                </div>
                      <p className="mt-1.5 text-[11px] text-slate-400">
                  El contador avanza cada 25 páginas. {completa?.minutos ? `La última completa tardó ${fmtNum(completa.minutos)} min` : "Una pasada completa tarda alrededor de una hora y cuarto"}; esta vista se actualiza sola.
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── Fila 3: cuenta, avisos, cómo funciona ── */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-slate-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {superAdmin ? null : (
              <span className="inline-flex items-center gap-1.5">
                <i className="bx bx-time-five" style={{ color: TOKENS.verde }} /> Se actualiza dos veces al día
                {estado?.productos_ultima_vez ? <> · última vez <b className="text-slate-200">{haceCuanto(estado.productos_ultima_vez)}</b></> : null}
              </span>
            )}
            {acceso?.cargado && !superAdmin ? (
              conAddon ? (
                <button type="button" className="inline-flex items-center gap-1.5 text-left hover:text-white" onClick={abrirExtension}>
                  <i className="bx bxl-chrome" style={{ color: TOKENS.verde }} /> Complemento ImporKiller <b className="text-slate-200">activo</b> · <u>instalar la extensión</u>
                </button>
              ) : (
                <button type="button" className="inline-flex items-center gap-1.5 text-left text-amber-200 hover:text-white" onClick={abrirComplemento}>
                  <i className="bx bx-lock-alt" /> Extensión en Dropi y anuncios: <u>complemento ImporKiller, ${ADDON_IMPORKILLER.precio}/mes</u>
                </button>
              )
            ) : null}
          </div>
          <button type="button" className="inline-flex items-center gap-1.5 font-bold text-sky-300 hover:text-white" onClick={() => setComoFunciona((v) => !v)} aria-expanded={comoFunciona}>
            <i className="bx bx-help-circle text-base" /> ¿Cómo funciona? <i className={`bx ${comoFunciona ? "bx-chevron-up" : "bx-chevron-down"}`} />
          </button>
        </div>

        <AnimatePresence>
          {comoFunciona ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-3 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[12.5px] leading-5 text-slate-300 md:grid-cols-4">
                <Explica icono="bx-camera" titulo="Dos fotos al día">
                  {superAdmin
                    ? "El recolector lee el catálogo completo de Dropi de madrugada y al mediodía con las cuentas de Dropi registradas en «Cuentas de mapeo» (si hay varias, se turnan), respetando el límite de Dropi."
                    : "ImporChat lee el catálogo público completo de Dropi de madrugada y al mediodía, respetando el límite de Dropi. No usa tu cuenta ni tus datos."}
                </Explica>
                <Explica icono="bx-trending-down" titulo="Ventas por baja de stock">
                  Si una bodega pasa de 120 a 97 unidades entre fotos, contamos 23 ventas ese día. Un reabastecimiento sube el stock y no resta ventas; un traslado puede verse como venta.
                </Explica>
                <Explica icono="bxl-chrome" titulo="Extensión, anuncios y tiendas">
                  Con el complemento ImporKiller (${ADDON_IMPORKILLER.precio}/mes) la extensión de Chrome pinta las ventas estimadas debajo de cada producto en Dropi y manda a ImporChat lo que analizas en la Biblioteca de anuncios de Meta. Un anuncio sin ver en 60 días pasa a inactivo.
                </Explica>
                <Explica icono="bx-target-lock" titulo="Atajos">
                  <b>Sin escalar</b>: 7 d entre 10 y 120, 30 d entre 120 y 500, stock ≥ 80. <b>Nuevos con tracción</b>: creado hace ≤ 90 días, 100–2.000 totales, ≤ 5 reabastecimientos. Necesitan semanas de fotos.
                </Explica>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {verCuentas && superAdmin ? <CuentasDropi pais={pais} onClose={() => setVerCuentas(false)} onCambio={onRecargar} /> : null}

        {error ? (
          <Aviso tipo="error" className="mt-4 border-rose-400/30 bg-rose-500/10 text-rose-100">
            {error}
          </Aviso>
        ) : null}
        {superAdmin && u?.error && !corriendo ? (
          <Aviso tipo="warn" className="mt-4 border-amber-400/30 bg-amber-500/10 text-amber-100">
            La última pasada terminó con error: {u.error}
          </Aviso>
        ) : null}
        {sinDatos && !corriendo ? (
          <Aviso tipo="info" className="mt-4 border-sky-400/30 bg-sky-500/10 text-sky-100">
            Todavía no hay fotos del catálogo de {nombrePais(pais)}. {superAdmin ? <>Pulsa <b>Correr pasada ahora</b> o espera la foto automática.</> : "La primera foto automática sale hoy; vuelve en unas horas."}
          </Aviso>
        ) : null}
        {msg ? (
          <Aviso tipo={msg.tipo} className={`mt-4 ${msg.tipo === "ok" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-rose-400/30 bg-rose-500/10 text-rose-100"}`}>
            {msg.texto}
          </Aviso>
        ) : null}
      </div>
    </section>
  );
}

function Explica({ icono, titulo, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#0f1b33] text-sky-300">
        <i className={`bx ${icono} text-lg`} />
      </span>
      <div>
        <div className="text-[13px] font-extrabold text-white">{titulo}</div>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

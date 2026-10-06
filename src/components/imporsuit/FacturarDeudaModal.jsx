import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  consultarFacturaDeuda,
  consultarRucSri,
  emitirFacturaDeuda,
  getDatosFacturacion,
  guardarDatosFacturacion,
  prepararFacturaDeuda,
} from "../../services/imporsuit";
import { Field, Overlay, btnGhost, btnPrimary, inputCls } from "./ui";

const MONEY = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
const fmt$ = (n) => MONEY.format(Number(n ?? 0));

/** Cada cuánto y cuántas veces se le pregunta a Dátil por la autorización. */
const POLL_MS = 4000;
const POLL_MAX = 8;

/**
 * Facturación electrónica de UNA deuda de la cartera (un programa de pago
 * único, o una cuota). Gemelo del modal de Imporfactory: mismo backend, misma
 * regla y mismo emisor.
 *
 * Dos requisitos: la deuda pagada completa (el pago se registra desde la
 * tarjeta de la deuda, con su comprobante) y los datos fiscales del cliente,
 * que se piden acá mismo si faltan.
 *
 * Desde ImporChat se emite y se consulta; anular una factura se hace en
 * Imporfactory (matriz «Facturas electrónicas»).
 */
export function FacturarDeudaModal({ deuda, onClose, onChanged }) {
  const idCpp = deuda?.id_cpp;

  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const [emitiendo, setEmitiendo] = useState(false);
  const [editandoDatos, setEditandoDatos] = useState(false);

  const recargar = useCallback(() => setReload((k) => k + 1), []);

  useEffect(() => {
    if (!idCpp) return undefined;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    prepararFacturaDeuda(idCpp, { signal: ctrl.signal })
      .then((r) => setCtx(r))
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setError(err);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [idCpp, reload]);

  // La autorización del SRI llega segundos después de emitir.
  const enProceso = ctx?.factura?.estado === "procesando";
  useEffect(() => {
    if (!enProceso || !idCpp) return undefined;
    let intentos = 0;
    let cancelado = false;
    const timer = setInterval(async () => {
      intentos += 1;
      try {
        const r = await consultarFacturaDeuda(idCpp);
        if (cancelado) return;
        if (r.factura?.estado !== "procesando") {
          clearInterval(timer);
          setReload((k) => k + 1);
          onChanged?.();
        }
      } catch {
        // un fallo de red no corta el sondeo
      }
      if (intentos >= POLL_MAX) clearInterval(timer);
    }, POLL_MS);
    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [enProceso, idCpp, onChanged]);

  const handleEmitir = async () => {
    const esPruebas = Number(ctx?.emisor?.ambiente) !== 2;
    const ok = await Swal.fire({
      icon: "warning",
      title: esPruebas ? "¿Emitir factura de PRUEBA?" : "¿Emitir la factura?",
      html: `Se enviará al SRI una factura por <b>${fmt$(ctx?.vista_previa?.importe_total)}</b> a nombre de <b>${
        ctx?.facturacion?.datos?.razon_social ?? ""
      }</b>.<br/>Una factura emitida no se puede editar: solo anular con nota de crédito.`,
      showCancelButton: true,
      confirmButtonText: "Sí, emitir",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });
    if (!ok.isConfirmed) return;

    setEmitiendo(true);
    try {
      const r = await emitirFacturaDeuda(idCpp);
      Swal.fire({ icon: "success", title: "Factura enviada", text: r.message, timer: 2600, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo emitir", text: err?.message ?? "" });
    } finally {
      setEmitiendo(false);
      recargar();
      onChanged?.();
    }
  };

  if (!deuda) return null;

  const cartera = ctx?.cartera;
  const datos = ctx?.facturacion?.datos;
  const factura = ctx?.factura;
  const vp = ctx?.vista_previa;
  const esPruebas = ctx && Number(ctx.emisor?.ambiente) !== 2;
  const yaFacturada = factura && factura.estado !== "emitiendo";
  // Bloqueos que no se resuelven con ninguno de los dos pasos.
  const otrosBloqueos = (ctx?.bloqueos ?? []).filter(
    (b) => !["cartera_pendiente", "sin_facturacion", "ya_facturada"].includes(b.codigo),
  );

  return (
    <Overlay onClose={emitiendo ? undefined : onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-800">
              <i className="bx bx-receipt text-cyan-600" />
              Facturar deuda
              {esPruebas && (
                <span
                  className="rounded border border-amber-200 bg-amber-50 px-1.5 text-[10px] font-bold uppercase text-amber-700"
                  title="Dátil está en ambiente de pruebas: la factura no tiene validez tributaria."
                >
                  Pruebas
                </span>
              )}
            </h3>
            <p className="truncate text-xs text-gray-500">
              {ctx?.deuda?.concepto ?? deuda.concepto}
              {ctx?.deuda?.cuota ? ` · cuota ${ctx.deuda.cuota}` : ""}
              {ctx?.cliente?.nombre ? ` — ${ctx.cliente.nombre}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={emitiendo}
            className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
          {loading && !ctx ? (
            <p className="py-6 text-center text-sm text-gray-400">Preparando factura…</p>
          ) : error ? (
            <Aviso tono="rojo">{error.message}</Aviso>
          ) : editandoDatos ? (
            <DatosFacturacionForm
              idUsers={ctx.cliente.id_users}
              onCancel={() => setEditandoDatos(false)}
              onSaved={() => {
                setEditandoDatos(false);
                recargar();
              }}
            />
          ) : yaFacturada ? (
            <FacturaEmitida factura={factura} />
          ) : (
            <>
              {factura?.estado === "emitiendo" && (
                <Aviso tono="ambar">
                  {factura.error_mensaje ?? "La emisión anterior quedó sin respuesta de Dátil."} Número
                  reservado: <b>{factura.numero}</b>.
                </Aviso>
              )}
              {!factura && ctx?.anulada_previa && (
                <Aviso tono="ambar">
                  La factura <b>{ctx.anulada_previa.numero}</b> se anuló con la nota de crédito{" "}
                  <b>{ctx.anulada_previa.nota_numero}</b>. Puedes facturar de nuevo.
                </Aviso>
              )}
              {!factura && ctx?.ultimo_error && <Aviso tono="rojo">Último intento: {ctx.ultimo_error}</Aviso>}
              {(ctx?.avisos ?? []).map((a) => (
                <Aviso key={a} tono="ambar">
                  {a}
                </Aviso>
              ))}

              <Paso
                n={1}
                ok={cartera?.pagada}
                titulo="Deuda pagada completa"
                detalle={
                  cartera?.pagada
                    ? `Cobrado ${fmt$(cartera.total)}.`
                    : `Faltan ${fmt$(cartera?.pendiente)} por cobrar. Registra el pago y vuelve.`
                }
              />
              <Paso
                n={2}
                ok={ctx?.facturacion?.registrada}
                titulo="Datos de facturación del cliente"
                detalle={
                  datos
                    ? `${datos.razon_social} · ${String(datos.tipo_identificacion).toUpperCase()} ${datos.identificacion}`
                    : "El cliente no tiene datos fiscales registrados."
                }
                accion={{
                  label: datos ? "Editar" : "Registrar datos",
                  secundaria: Boolean(datos),
                  onClick: () => setEditandoDatos(true),
                }}
              />

              {otrosBloqueos.map((b) => (
                <Aviso key={b.codigo} tono="rojo">
                  {b.mensaje}
                </Aviso>
              ))}

              {vp?.items?.length > 0 && <VistaPrevia vp={vp} emisor={ctx.emisor} />}
            </>
          )}
        </div>

        {!editandoDatos && (
          <footer className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <button onClick={onClose} disabled={emitiendo} className={btnGhost}>
              Cerrar
            </button>
            {!yaFacturada && (
              <button
                onClick={handleEmitir}
                disabled={!ctx?.puede_emitir || emitiendo || loading}
                className={btnPrimary}
              >
                {emitiendo
                  ? "Emitiendo…"
                  : factura?.estado === "emitiendo"
                    ? "Reintentar emisión"
                    : "Emitir factura"}
              </button>
            )}
          </footer>
        )}
      </div>
    </Overlay>
  );
}

function Paso({ n, ok, titulo, detalle, accion }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
        ok ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
          ok ? "bg-emerald-500" : "bg-gray-300"
        }`}
      >
        {ok ? "✓" : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-800">{titulo}</p>
        <p className="truncate text-xs text-gray-500">{detalle}</p>
      </div>
      {accion && (
        <button
          onClick={accion.onClick}
          className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-bold ${
            accion.secundaria
              ? "border border-gray-300 text-gray-600 hover:bg-white"
              : "bg-amber-400 text-gray-900 hover:bg-amber-300"
          }`}
        >
          {accion.label}
        </button>
      )}
    </div>
  );
}

function Aviso({ tono, children }) {
  const cls =
    tono === "rojo"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-800";
  return <p className={`rounded-lg border px-3 py-2 text-xs ${cls}`}>{children}</p>;
}

function VistaPrevia({ vp, emisor }) {
  const diferencia = Math.abs(Number(vp.diferencia) || 0);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
        <strong className="uppercase tracking-wide">Detalle de la factura</strong>
        <span>
          {emisor?.razon_social || "Emisor sin configurar"} · serie {emisor?.serie}
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-gray-400">
            <th className="px-3 py-1.5 font-bold">Descripción</th>
            <th className="px-3 py-1.5 text-right font-bold">Subtotal</th>
            <th className="px-3 py-1.5 text-right font-bold">IVA {Number(emisor?.iva) || 0}%</th>
            <th className="px-3 py-1.5 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {vp.items.map((it, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="px-3 py-1.5 text-gray-700">{it.descripcion}</td>
              <td className="px-3 py-1.5 text-right font-mono text-gray-600">{fmt$(it.base)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-gray-600">{fmt$(it.iva)}</td>
              <td className="px-3 py-1.5 text-right font-mono font-bold text-gray-800">{fmt$(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-gray-100 px-3 py-1.5 text-[11px] text-gray-400">
        El precio ya incluye el IVA.
        {diferencia >= 0.005 && (
          <span className="text-amber-600">
            {" "}
            Queda {fmt$(diferencia)} de diferencia con la deuda por el redondeo del IVA.
          </span>
        )}
      </p>
    </div>
  );
}

function FacturaEmitida({ factura }) {
  const autorizada = factura.estado === "autorizada";
  const nota = factura.nota_credito;
  const enlaces = [
    ["ride", "RIDE", "Ver el RIDE (versión imprimible)"],
    ["pdf", "PDF", "Descargar el RIDE en PDF"],
    ["xml", "XML", "Descargar el XML firmado"],
  ];
  return (
    <div
      className={`space-y-3 rounded-xl border px-4 py-4 ${
        autorizada ? "border-emerald-200 bg-emerald-50" : "border-cyan-200 bg-cyan-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <i
          className={`bx text-2xl ${
            autorizada ? "bx-check-circle text-emerald-600" : "bx-loader-alt bx-spin text-cyan-600"
          }`}
        />
        <div>
          <p className="text-sm font-bold text-gray-800">
            Factura {factura.numero}
            {Number(factura.ambiente) !== 2 && (
              <span className="ml-2 text-[10px] font-bold uppercase text-amber-600">pruebas</span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            {autorizada ? "Autorizada por el SRI." : "Enviada. Esperando la autorización del SRI…"}
          </p>
        </div>
        <span className="ml-auto font-mono text-base font-black text-gray-800">
          {fmt$(factura.importe_total)}
        </span>
      </div>
      <div className="space-y-0.5 text-xs text-gray-600">
        <p>
          <span className="text-gray-400">Cliente:</span> {factura.comprador || "—"}
        </p>
        <p className="break-all">
          <span className="text-gray-400">Clave de acceso:</span>{" "}
          <span className="font-mono">{factura.clave_acceso || "—"}</span>
        </p>
      </div>
      {factura.urls && (
        <div className="flex flex-wrap gap-1.5 border-t border-black/5 pt-3">
          {enlaces.map(([k, label, title]) => (
            <a
              key={k}
              href={factura.urls[k]}
              target="_blank"
              rel="noreferrer"
              title={title}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-50"
            >
              {label}
            </a>
          ))}
        </div>
      )}
      {nota && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Hay una nota de crédito <b>{nota.numero}</b> en curso para anularla ({nota.motivo}).
        </p>
      )}
      <p className="text-[11px] text-gray-400">
        Para anularla, usa «Facturas electrónicas» en Imporfactory.
      </p>
    </div>
  );
}

const VACIO = {
  tipo_identificacion: "",
  identificacion: "",
  razon_social: "",
  nombre_comercial: "",
  direccion: "",
  ciudad: "",
  estado_provincia: "",
  codigo_postal: "",
  correo: "",
  telefono: "",
};

/**
 * Datos fiscales del cliente. Los campos NO están escritos acá: se pintan
 * desde `catalogo.campos`, que arma el backend (`CatalogosFacturacion`), igual
 * que en Imporfactory. Con un RUC de 13 dígitos se consulta el SRI y se
 * autocompleta lo que el agente dejó en blanco.
 */
function DatosFacturacionForm({ idUsers, onCancel, onSaved }) {
  const [catalogo, setCatalogo] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [errores, setErrores] = useState({});
  const [sri, setSri] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    getDatosFacturacion(idUsers, { signal: ctrl.signal })
      .then((r) => {
        setCatalogo(r.catalogo);
        const base = r.facturacion ?? r.precarga ?? {};
        setForm({
          ...VACIO,
          ...Object.fromEntries(Object.keys(VACIO).map((k) => [k, base[k] ?? ""])),
          tipo_identificacion:
            base.tipo_identificacion || r.catalogo?.tipos_identificacion?.[0]?.value || "",
        });
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [idUsers]);

  const setCampo = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrores((e) => {
      if (!e[name]) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
  };

  const esRuc = form.tipo_identificacion === "ruc" && /^\d{13}$/.test(String(form.identificacion).trim());

  const consultarSri = async () => {
    setSri({ consultando: true });
    try {
      const r = await consultarRucSri(String(form.identificacion).trim());
      const d = r?.sri ?? {};
      setSri(d);
      if (d.encontrado) {
        // Sólo lo que el agente dejó en blanco.
        setForm((f) => ({
          ...f,
          razon_social: f.razon_social || d.razon_social || "",
          nombre_comercial: f.nombre_comercial || d.nombre_comercial || "",
          direccion: f.direccion || d.direccion || "",
          ciudad: f.ciudad || d.ciudad || "",
          estado_provincia: f.estado_provincia || d.provincia || "",
        }));
      }
    } catch (err) {
      // El SRI es un extra: si falla, se puede guardar igual.
      setSri({ disponible: false, message: err?.message ?? "No se pudo consultar el SRI." });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setErrores({});
    try {
      const r = await guardarDatosFacturacion(idUsers, form);
      if (!r?.success) {
        setErrores(r?.errores ?? {});
        setError(r?.message ?? "No se pudieron guardar los datos.");
        return;
      }
      onSaved?.();
    } catch (err) {
      setError(err?.message ?? "No se pudieron guardar los datos.");
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return <p className="py-6 text-center text-sm text-gray-400">Cargando datos del cliente…</p>;

  const campos = catalogo?.campos ?? [];

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm font-bold text-gray-800">Datos de facturación del cliente</p>
      {error && <Aviso tono="rojo">{error}</Aviso>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campos.map((c) => (
          <div key={c.name} className={Number(c.col) >= 12 ? "sm:col-span-2" : ""}>
            <Field label={`${c.label}${c.required ? " *" : ""}`}>
              {c.type === "select" ? (
                <select
                  className={inputCls}
                  value={form[c.name] ?? ""}
                  disabled={c.readonly}
                  onChange={(e) => setCampo(c.name, e.target.value)}
                >
                  {!c.required && <option value="">—</option>}
                  {(c.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={c.type === "email" ? "email" : "text"}
                  className={inputCls}
                  value={form[c.name] ?? ""}
                  maxLength={c.maxlength}
                  onChange={(e) =>
                    setCampo(c.name, c.uppercase ? e.target.value.toUpperCase() : e.target.value)
                  }
                />
              )}
            </Field>
            {errores[c.name] && <p className="mt-1 text-[11px] text-red-600">{errores[c.name]}</p>}
            {c.name === "identificacion" && esRuc && (
              <button
                type="button"
                onClick={consultarSri}
                disabled={sri?.consultando}
                className="mt-1 text-[11px] font-bold text-blue-600 hover:underline disabled:opacity-60"
              >
                {sri?.consultando ? "Consultando el SRI…" : "Consultar en el SRI y autocompletar"}
              </button>
            )}
            {c.name === "identificacion" && sri && !sri.consultando && (
              <p className={`mt-1 text-[11px] ${sri.encontrado ? "text-emerald-600" : "text-amber-600"}`}>
                {sri.message || (sri.encontrado ? "RUC verificado en el SRI." : "")}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={guardando} className={btnGhost}>
          Volver
        </button>
        <button type="submit" disabled={guardando} className={btnPrimary}>
          {guardando ? "Guardando…" : "Guardar datos"}
        </button>
      </div>
    </form>
  );
}

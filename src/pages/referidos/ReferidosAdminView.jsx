import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/* ============================================================
   Solicitudes de transferencia — panel del super administrador
   ============================================================

   QUÉ RESUELVE
   Un referidor con saldo disponible pide su dinero al banco. Eso NO mueve
   plata: crea una solicitud y reserva sus comisiones. Alguien tiene que
   revisarla, transferir por fuera y volver aquí a registrarlo. Esta pantalla es
   ese "volver aquí".

   LO QUE NO PUEDE FALTAR
   · Los datos bancarios copiables: se transcriben a mano en la web del banco y
     un dígito mal copiado manda el dinero a un desconocido.
   · El desglose de comisiones: aprobar un monto sin ver de qué referidos salió
     es firmar un cheque en blanco.
   · El comprobante: el referidor solo ve "Pagada" y una referencia escrita a
     mano. Sin el archivo no tiene con qué reclamar si el dinero no llegó.

   Rechazar SUELTA las comisiones —vuelven a estar disponibles— así que no es
   destructivo, pero sí visible para el usuario: por eso el motivo es
   obligatorio.

   Misma estética que /referidos: cabecera #171931 e indigo #4F46E5.
   ============================================================ */

const money = (cent) =>
  `$${((Number(cent) || 0) / 100).toLocaleString("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fechaHora = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).replace(" ", "T"));
  return isNaN(d)
    ? String(v)
    : d.toLocaleString("es-EC", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const fecha = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).replace(" ", "T"));
  return isNaN(d)
    ? String(v)
    : d.toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

/** Días que lleva esperando. Es el dato que ordena la cola de trabajo. */
const espera = (v) => {
  if (!v) return null;
  const d = new Date(String(v).replace(" ", "T"));
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};

const ESTADOS = {
  solicitado: { label: "Por revisar", cls: "bg-orange-100 text-orange-700" },
  aprobado: { label: "Aprobada", cls: "bg-sky-100 text-sky-700" },
  pagado: { label: "Pagada", cls: "bg-indigo-100 text-indigo-700" },
  rechazado: { label: "Rechazada", cls: "bg-rose-100 text-rose-700" },
};

const TABS = [
  { k: "", label: "Por resolver" },
  { k: "pagado", label: "Pagadas" },
  { k: "rechazado", label: "Rechazadas" },
  { k: "todos", label: "Todas" },
];

const esPendiente = (s) => s === "solicitado" || s === "aprobado";

/* ─────────────────────────────────────────────────────────────
   Piezas
   ───────────────────────────────────────────────────────────── */

const Kpi = ({ label, valor, detalle, color, icon }) => (
  <div className="rounded-2xl bg-white border border-slate-200 p-4">
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-tight">
        {label}
      </p>
      {icon && <i className={`bx ${icon} text-base text-slate-300`} />}
    </div>
    <p
      className="text-[1.6rem] font-bold mt-1 tabular-nums leading-none"
      style={{ color: color || "#1E293B" }}
    >
      {valor}
    </p>
    {detalle && (
      <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">
        {detalle}
      </p>
    )}
  </div>
);

const Bloque = ({ className = "" }) => (
  <div className={`rounded-lg bg-slate-200/70 ${className}`} />
);

/** Mismo criterio que /referidos: la retícula real, no un spinner. */
const Esqueleto = () => (
  <div className="p-3 md:p-5 space-y-4 animate-pulse">
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl p-4 bg-white border border-slate-200">
          <Bloque className="h-2.5 w-24 mb-3" />
          <Bloque className="h-7 w-28 mb-2.5" />
          <Bloque className="h-2.5 w-32" />
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl border border-slate-200">
      <div className="flex gap-3 px-4 py-3 border-b border-slate-200">
        {[0, 1, 2, 3].map((i) => (
          <Bloque key={i} className="h-7 w-28" />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4 border-b border-slate-100"
        >
          <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 min-w-0">
            <Bloque className="h-3 w-44 mb-1.5" />
            <Bloque className="h-2.5 w-32" />
          </div>
          <Bloque className="h-3 w-20 hidden md:block" />
          <Bloque className="h-3 w-40 hidden lg:block" />
          <Bloque className="h-8 w-24" />
        </div>
      ))}
    </div>
  </div>
);

const Vacio = ({ icon, titulo, texto }) => (
  <div className="p-14 text-center">
    <i className={`bx ${icon} text-4xl text-slate-300 block mb-2`} />
    <p className="text-sm font-medium text-slate-600">{titulo}</p>
    {texto && <p className="text-xs text-slate-400 mt-1">{texto}</p>}
  </div>
);

/** Los datos del banco se copian a mano en otra pestaña: el botón evita el error de dedo. */
const DatosBanco = ({ texto }) => {
  const [copiado, setCopiado] = useState(false);
  if (!texto) return <span className="text-slate-300">Sin datos</span>;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      Swal.fire("Copia manual", texto, "info");
    }
  };

  return (
    <div className="flex items-start gap-2 max-w-[22rem]">
      <p className="text-[11.5px] text-slate-600 leading-snug whitespace-pre-wrap break-words flex-1">
        {texto}
      </p>
      <button
        onClick={copiar}
        title="Copiar datos bancarios"
        className="shrink-0 w-7 h-7 grid place-items-center rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition"
      >
        <i className={`bx ${copiado ? "bx-check" : "bx-copy"} text-sm`} />
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Modal de resolución
   ───────────────────────────────────────────────────────────── */

/**
 * Registrar el pago o rechazarlo.
 *
 * El comprobante no es obligatorio en el backend —si el uploader está caído, el
 * pago igual tiene que poder registrarse— pero aquí se pide de forma explícita,
 * porque en el 99% de los casos existe y es lo único que le queda al referidor
 * como prueba.
 */
const ModalResolver = ({ solicitud, accion, onCerrar, onListo }) => {
  const [referencia, setReferencia] = useState("");
  const [nota, setNota] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const pagar = accion === "pagar";

  useEffect(() => {
    if (!archivo || !archivo.type?.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const elegirArchivo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      Swal.fire("Archivo muy pesado", "El máximo es 10 MB.", "warning");
      e.target.value = "";
      return;
    }
    setArchivo(f);
  };

  const enviar = async () => {
    if (!pagar && nota.trim().length < 5) {
      Swal.fire(
        "Falta el motivo",
        "Explica por qué se rechaza: el referidor lo verá en su pantalla.",
        "warning",
      );
      return;
    }

    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("accion", pagar ? "pagar" : "rechazar");
      if (referencia.trim()) fd.append("referencia", referencia.trim());
      if (nota.trim()) fd.append("nota", nota.trim());
      if (pagar && archivo) fd.append("comprobante", archivo);

      const { data: res } = await chatApi.post(
        `referidos/admin/solicitudes/${solicitud.id}`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      if (pagar && archivo && res?.comprobante_subido === false) {
        await Swal.fire(
          "Pago registrado, comprobante no",
          "El pago quedó marcado como pagado, pero el archivo no se pudo subir. Vuelve a abrir la solicitud y adjúntalo de nuevo.",
          "warning",
        );
      } else {
        await Swal.fire({
          icon: "success",
          title: pagar ? "Pago registrado" : "Solicitud rechazada",
          text: pagar
            ? "El referidor ya lo ve en su sección de cobros."
            : "Las comisiones volvieron a quedar disponibles para el referidor.",
          timer: 2200,
          showConfirmButton: false,
        });
      }
      onListo();
    } catch (e) {
      Swal.fire(
        "No se pudo registrar",
        e?.response?.data?.message || "Inténtalo de nuevo.",
        "error",
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={enviando ? undefined : onCerrar}
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-800">
              {pagar ? "Registrar transferencia" : "Rechazar solicitud"}
            </h3>
            <p className="text-[11.5px] text-slate-500 mt-0.5">
              {solicitud.nombre} · {money(solicitud.monto_cent)}
            </p>
          </div>
          <button
            onClick={onCerrar}
            disabled={enviando}
            className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 transition"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-auto">
          {pagar ? (
            <>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Cuenta destino
                </p>
                <DatosBanco texto={solicitud.datos_pago} />
              </div>

              <label className="block">
                <span className="text-[12px] font-semibold text-slate-700">
                  Número de transferencia
                </span>
                <input
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej: 4471209835"
                  className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-indigo-400"
                />
                <span className="text-[11px] text-slate-400">
                  Aparece en la pantalla de cobros del referidor.
                </span>
              </label>

              <div>
                <span className="text-[12px] font-semibold text-slate-700">
                  Comprobante
                </span>
                <label className="mt-1 flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 cursor-pointer transition">
                  <i className="bx bx-cloud-upload text-2xl text-slate-400" />
                  <span className="text-[12px] text-slate-600 min-w-0 flex-1 truncate">
                    {archivo
                      ? archivo.name
                      : "Adjunta la captura o el PDF del banco (máx. 10 MB)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={elegirArchivo}
                    className="hidden"
                  />
                </label>
                {preview && (
                  <img
                    src={preview}
                    alt="Vista previa del comprobante"
                    className="mt-2 max-h-56 rounded-xl border border-slate-200 object-contain"
                  />
                )}
                {solicitud.comprobante_url && !archivo && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Ya hay un comprobante adjunto.{" "}
                    <a
                      href={solicitud.comprobante_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 font-semibold"
                    >
                      Verlo
                    </a>
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3">
              <p className="text-[12px] text-rose-800 leading-relaxed">
                Las {solicitud.comisiones_n || 0} comisiones de esta solicitud
                vuelven a quedar disponibles para el referidor. No se pierde
                saldo: podrá volver a pedirlas.
              </p>
            </div>
          )}

          <label className="block">
            <span className="text-[12px] font-semibold text-slate-700">
              {pagar ? "Nota interna (opcional)" : "Motivo del rechazo"}
            </span>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              placeholder={
                pagar
                  ? "Ej: transferida desde Pichincha empresa"
                  : "Ej: los datos de la cuenta no coinciden con el titular"
              }
              className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-indigo-400 resize-none"
            />
            <span className="text-[11px] text-slate-400">
              {pagar
                ? "El referidor también la ve junto al estado del cobro."
                : "Se le muestra al referidor tal cual la escribas."}
            </span>
          </label>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex gap-2 justify-end">
          <button
            onClick={onCerrar}
            disabled={enviando}
            className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={enviando}
            className={`px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition disabled:opacity-50 ${
              pagar
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {enviando ? (
              <>
                <i className="bx bx-loader-alt bx-spin mr-1.5" />
                Guardando…
              </>
            ) : pagar ? (
              `Marcar ${money(solicitud.monto_cent)} como pagada`
            ) : (
              "Rechazar solicitud"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Detalle
   ───────────────────────────────────────────────────────────── */

const PanelDetalle = ({ id, onCerrar }) => {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data: res } = await chatApi.get(
          `referidos/admin/solicitudes/${id}`,
        );
        if (vivo) setDetalle(res.data);
      } catch {
        if (vivo) setDetalle(null);
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id]);

  return (
    <div className="fixed inset-0 z-[55] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCerrar} />
      <aside className="relative w-full max-w-xl bg-white shadow-2xl overflow-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">
            Solicitud #{id}
          </h3>
          <button
            onClick={onCerrar}
            className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {cargando ? (
          <div className="p-5 space-y-3 animate-pulse">
            <Bloque className="h-4 w-48" />
            <Bloque className="h-24 w-full" />
            <Bloque className="h-4 w-40" />
            <Bloque className="h-40 w-full" />
          </div>
        ) : !detalle ? (
          <Vacio
            icon="bx-error-circle"
            titulo="No se pudo cargar el detalle"
            texto="Cierra y vuelve a intentarlo"
          />
        ) : (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Solicitante
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {detalle.nombre}
                </p>
                <p className="text-[11px] text-slate-500 break-all">
                  {detalle.email_propietario}
                </p>
                {detalle.whatsapp_lead && (
                  <p className="text-[11px] text-slate-500">
                    {detalle.whatsapp_lead}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Monto solicitado
                </p>
                <p className="text-xl font-bold text-slate-800 tabular-nums mt-1">
                  {money(detalle.monto_cent)}
                </p>
                <p className="text-[11px] text-slate-500">
                  Pedida el {fechaHora(detalle.created_at)}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                Cuenta destino
              </p>
              <DatosBanco texto={detalle.datos_pago} />
            </div>

            {detalle.estado === "pagado" && (
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3">
                <p className="text-[12px] text-indigo-900">
                  Pagada el {fechaHora(detalle.pagado_en)}
                  {detalle.referencia && ` · Ref. ${detalle.referencia}`}
                </p>
                {detalle.comprobante_url && (
                  <a
                    href={detalle.comprobante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-[12px] font-semibold text-indigo-700"
                  >
                    <i className="bx bx-receipt" />
                    Ver comprobante
                  </a>
                )}
              </div>
            )}

            <div>
              <p className="text-[12px] font-semibold text-slate-700 mb-2">
                Comisiones que componen el monto ({detalle.comisiones.length})
              </p>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">
                        Referido
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">Mes</th>
                      <th className="text-right px-3 py-2 font-semibold">
                        Pagó
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">%</th>
                      <th className="text-right px-3 py-2 font-semibold">
                        Comisión
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detalle.comisiones.map((c) => (
                      <tr key={c.id}>
                        <td className="px-3 py-2 text-slate-700">
                          {c.nombre_referido || "—"}
                          <span className="block text-[10px] text-slate-400">
                            {fecha(c.created_at)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 tabular-nums">
                          {c.ciclo_num}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 tabular-nums">
                          {money(c.monto_base_cent)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 tabular-nums">
                          {Number(c.porcentaje)}%
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800 tabular-nums">
                          {money(c.monto_comision_cent)}
                        </td>
                      </tr>
                    ))}
                    {detalle.comisiones.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-6 text-center text-[12px] text-slate-500"
                        >
                          Las comisiones ya se soltaron (solicitud rechazada)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {detalle.nota_admin && (
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Nota del administrador
                </p>
                <p className="text-[12px] text-slate-600">
                  {detalle.nota_admin}
                </p>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Vista
   ───────────────────────────────────────────────────────────── */

export default function ReferidosAdminView() {
  const navigate = useNavigate();
  const isSuperAdmin =
    (localStorage.getItem("user_role") || "") === "super_administrador";

  const [rows, setRows] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [detalleId, setDetalleId] = useState(null);
  const [resolviendo, setResolviendo] = useState(null); // { solicitud, accion }

  // El backend también gatea; esto evita pintar una pantalla que va a dar 403.
  useEffect(() => {
    if (!isSuperAdmin) navigate("/chatboard");
  }, [isSuperAdmin, navigate]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data: res } = await chatApi.get("referidos/admin/solicitudes", {
        params: estado ? { estado } : {},
      });
      setRows(res.data || []);
    } catch (e) {
      Swal.fire(
        "No se pudo cargar",
        e?.response?.data?.message || "Inténtalo de nuevo en unos minutos.",
        "error",
      );
    } finally {
      setCargando(false);
    }
  }, [estado]);

  useEffect(() => {
    if (isSuperAdmin) cargar();
  }, [cargar, isSuperAdmin]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.nombre || ""} ${r.email_propietario || ""} ${r.whatsapp_lead || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [rows, busqueda]);

  const totales = useMemo(() => {
    const pend = rows.filter((r) => esPendiente(r.estado));
    const pagadas = rows.filter((r) => r.estado === "pagado");
    return {
      pendientes: pend.length,
      pendienteCent: pend.reduce((a, r) => a + Number(r.monto_cent || 0), 0),
      pagadas: pagadas.length,
      pagadoCent: pagadas.reduce((a, r) => a + Number(r.monto_cent || 0), 0),
      // La más vieja sin resolver: es la que marca el peor tiempo de respuesta.
      masVieja: pend.reduce((max, r) => Math.max(max, espera(r.created_at) ?? 0), 0),
    };
  }, [rows]);

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 md:px-5 py-5">
      <div className="mx-auto w-full bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 overflow-hidden">
        {/* ═══════════ Cabecera ═══════════ */}
        <header className="relative isolate overflow-hidden">
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
          <div className="relative px-5 py-5 md:px-7 md:py-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 ring-1 ring-white/15">
                Administración · Referidos
              </span>
              <h1 className="mt-2 text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                Solicitudes de transferencia
              </h1>
              <p className="mt-1 text-white/55 text-[13px] leading-snug max-w-2xl">
                Comisiones que los referidores pidieron recibir en su banco.
                Transfiere por fuera, registra aquí el pago y adjunta el
                comprobante: es lo que ellos ven en su pantalla de cobros.
              </p>
            </div>
            <button
              onClick={cargar}
              className="px-4 py-2.5 bg-white/10 text-white rounded-xl font-semibold text-[12.5px] hover:bg-white/20 transition ring-1 ring-white/15"
            >
              <i className="bx bx-refresh mr-1.5" />
              Actualizar
            </button>
          </div>
        </header>

        {cargando ? (
          <Esqueleto />
        ) : (
          <div className="p-3 md:p-5 space-y-4">
            {/* ═══════════ Cifras ═══════════ */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <Kpi
                label="Por resolver"
                valor={totales.pendientes}
                detalle={`${money(totales.pendienteCent)} en espera`}
                color="#EA580C"
                icon="bx-time-five"
              />
              <Kpi
                label="Monto a transferir"
                valor={money(totales.pendienteCent)}
                detalle="Saldo ya reservado al referidor"
                color="#4F46E5"
                icon="bx-wallet"
              />
              <Kpi
                label="Espera más larga"
                valor={`${totales.masVieja} d`}
                detalle={
                  totales.pendientes
                    ? "Días de la solicitud más antigua sin resolver"
                    : "Sin solicitudes pendientes"
                }
                color={totales.masVieja >= 5 ? "#E11D48" : "#1E293B"}
                icon="bx-calendar-exclamation"
              />
              <Kpi
                label="Pagadas (en la lista)"
                valor={totales.pagadas}
                detalle={`${money(totales.pagadoCent)} transferidos`}
                icon="bx-check-double"
              />
            </div>

            {/* ═══════════ Tabla ═══════════ */}
            <div className="bg-white rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2 px-3 pt-2 border-b border-slate-200">
                {TABS.map((t) => (
                  <button
                    key={t.k || "abiertas"}
                    onClick={() => setEstado(t.k)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
                      estado === t.k
                        ? "border-indigo-600 text-indigo-700"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
                <div className="relative ml-auto mb-2">
                  <i className="bx bx-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre, correo o WhatsApp…"
                    className="pl-8 pr-3 py-1.5 text-[12px] rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-400 w-64"
                  />
                </div>
              </div>

              {visibles.length === 0 ? (
                <Vacio
                  icon="bx-check-circle"
                  titulo={
                    busqueda
                      ? "Ninguna solicitud coincide con la búsqueda"
                      : "No hay solicitudes en este estado"
                  }
                  texto={
                    busqueda
                      ? "Prueba con otro nombre o correo"
                      : "Aquí aparecen los referidores que piden su saldo al banco"
                  }
                />
              ) : (
                <div className="overflow-auto max-h-[36rem]">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">
                          Referidor
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Solicitada
                        </th>
                        <th className="text-right px-4 py-3 font-semibold">
                          Monto
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Cuenta destino
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Estado
                        </th>
                        <th className="text-right px-4 py-3 font-semibold">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibles.map((r) => {
                        const est = ESTADOS[r.estado] || {
                          label: r.estado,
                          cls: "bg-slate-100 text-slate-600",
                        };
                        const dias = espera(r.created_at);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70 align-top">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="w-9 h-9 rounded-full grid place-items-center text-[11px] font-bold text-white shrink-0 bg-[#4F46E5]">
                                  {(r.nombre || "?").slice(0, 2).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-800 truncate">
                                    {r.nombre}
                                  </p>
                                  <p className="text-[11px] text-slate-400 truncate">
                                    {r.email_propietario}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {r.comisiones_n} comisión
                                    {Number(r.comisiones_n) === 1 ? "" : "es"} ·{" "}
                                    {r.referidos_n} referido
                                    {Number(r.referidos_n) === 1 ? "" : "s"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                              {fechaHora(r.created_at)}
                              {esPendiente(r.estado) && dias !== null && (
                                <span
                                  className={`block text-[10px] font-semibold ${
                                    dias >= 5 ? "text-rose-600" : "text-slate-400"
                                  }`}
                                >
                                  {dias === 0
                                    ? "hoy"
                                    : `esperando ${dias} día${dias === 1 ? "" : "s"}`}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums whitespace-nowrap">
                              {money(r.monto_cent)}
                            </td>
                            <td className="px-4 py-3">
                              <DatosBanco texto={r.datos_pago} />
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-[11px] px-2 py-1 rounded-full font-semibold ${est.cls}`}
                              >
                                {est.label}
                              </span>
                              {r.estado === "pagado" && (
                                <span className="block text-[10px] text-slate-400 mt-1">
                                  {fecha(r.pagado_en)}
                                  {r.admin_nombre && ` · ${r.admin_nombre}`}
                                </span>
                              )}
                              {r.estado === "pagado" && !r.comprobante_url && (
                                <span className="block text-[10px] text-orange-600 font-semibold mt-0.5">
                                  Sin comprobante
                                </span>
                              )}
                              {r.nota_admin && (
                                <span className="block text-[10px] text-slate-500 mt-1 max-w-[12rem]">
                                  {r.nota_admin}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5 justify-end">
                                <button
                                  onClick={() => setDetalleId(r.id)}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-600 hover:border-slate-400 transition"
                                >
                                  Detalle
                                </button>
                                {r.comprobante_url && (
                                  <a
                                    href={r.comprobante_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition"
                                  >
                                    Comprobante
                                  </a>
                                )}
                                {esPendiente(r.estado) && (
                                  <>
                                    <button
                                      onClick={() =>
                                        setResolviendo({
                                          solicitud: r,
                                          accion: "rechazar",
                                        })
                                      }
                                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                                    >
                                      Rechazar
                                    </button>
                                    <button
                                      onClick={() =>
                                        setResolviendo({
                                          solicitud: r,
                                          accion: "pagar",
                                        })
                                      }
                                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition"
                                    >
                                      Registrar pago
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {detalleId && (
        <PanelDetalle id={detalleId} onCerrar={() => setDetalleId(null)} />
      )}
      {resolviendo && (
        <ModalResolver
          solicitud={resolviendo.solicitud}
          accion={resolviendo.accion}
          onCerrar={() => setResolviendo(null)}
          onListo={() => {
            setResolviendo(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import { FilterDropdown } from "./OrdenesDropi";

/* Novedades Dropi pendientes por solucionar.
   Consulta EN VIVO a Dropi (no al cache): el back pide /orders/myorders con
   haveIncidenceProcesamiento=true. Se solventan desde el modal (o se manda a
   devolución). Misma cabecera, tarjeta de filtros y tabla que Gestión de
   Pedidos (OrdenesDropi.jsx), de donde se toma el desplegable de filtro. */

const PAGE_SIZE = 20;

/* Color por transportadora (Ecuador). La que no esté acá sale en gris. */
const TRANSPORTADORAS = {
  GINTRACOM: "bg-sky-50 text-sky-700 border-sky-200",
  SERVIENTREGA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LAARCOURIER: "bg-rose-50 text-rose-700 border-rose-200",
  LAAR: "bg-rose-50 text-rose-700 border-rose-200",
  VELOCES: "bg-violet-50 text-violet-700 border-violet-200",
  URBANO: "bg-amber-50 text-amber-700 border-amber-200",
};
const claseTransportadora = (nombre) =>
  TRANSPORTADORAS[String(nombre || "").toUpperCase().replace(/\s+/g, "")] ||
  "bg-gray-50 text-gray-600 border-gray-200";

const fmtFecha = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* "hace 3 h" / "hace 2 d": cuánto lleva la novedad sin gestionar. */
const hace = (s) => {
  if (!s) return null;
  const ms = Date.now() - new Date(s).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "hace menos de 1 h";
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};
const horasDesde = (s) =>
  s ? (Date.now() - new Date(s).getTime()) / 3600000 : 0;

const fmtMonto = (v) =>
  v === null || v === undefined || v === "" ? "—" : `$${Number(v).toFixed(2)}`;

const errMsg = (error, def) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  def;

const copiar = (texto) => {
  if (!texto) return;
  navigator.clipboard?.writeText(String(texto)).then(() =>
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Copiado",
      showConfirmButton: false,
      timer: 1200,
    }),
  );
};

/* ───────────────────────── piezas pequeñas ───────────────────────── */

function BadgeTransportadora({ nombre }) {
  if (!nombre) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${claseTransportadora(
        nombre,
      )}`}
    >
      <i className="bx bxs-truck text-sm" />
      {nombre}
    </span>
  );
}

function Kpi({ icono, color, valor, label }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-gray-100">
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}
      >
        <i className={`bx ${icono} text-xl`} />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none text-gray-900">{valor}</p>
        <p className="mt-1 truncate text-[11px] text-gray-500">{label}</p>
      </div>
    </div>
  );
}

/* Encabezado de tarjeta, igual al de "Filtros de búsqueda" en Pedidos. */
function TituloTarjeta({ icono, titulo, subtitulo }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#171931]/[0.06] text-[#171931]">
        <i className={`bx ${icono} text-lg`} />
      </span>
      <div>
        <h3 className="text-sm font-bold leading-tight text-gray-900">
          {titulo}
        </h3>
        {subtitulo && <p className="text-[11px] text-gray-400">{subtitulo}</p>}
      </div>
    </div>
  );
}

/* Botón redondo de chat, el mismo de la tabla de Pedidos. */
function BotonChat({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      title={disabled ? "No hay conversación" : "Abrir chat"}
      aria-label={disabled ? "No hay conversación" : "Abrir chat"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-200 ${
        disabled
          ? "cursor-not-allowed bg-gray-200 text-gray-400"
          : "bg-emerald-600 text-white hover:bg-emerald-700"
      }`}
    >
      <i className="bx bxs-chat text-[18px]" />
    </button>
  );
}

/* Paginación del pie, igual a la de Pedidos. */
function Paginacion({ page, totalPaginas, hayMas, cargando, onCambiar, texto }) {
  const sinAnterior = page <= 1 || cargando;
  const sinSiguiente = cargando || (totalPaginas ? page >= totalPaginas : !hayMas);
  return (
    <div className="mt-5 flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-gray-400">{texto}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            sinAnterior ? "cursor-not-allowed text-gray-300" : "text-gray-700 hover:bg-gray-100"
          }`}
          disabled={sinAnterior}
          onClick={() => onCambiar(Math.max(1, page - 1))}
        >
          ‹ Anterior
        </button>
        <span className="min-w-[110px] rounded-lg bg-[#171931] px-3 py-1.5 text-center text-sm font-semibold text-white">
          Página {page}
          {totalPaginas ? ` de ${totalPaginas}` : ""}
        </span>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            sinSiguiente ? "cursor-not-allowed text-gray-300" : "text-gray-700 hover:bg-gray-100"
          }`}
          disabled={sinSiguiente}
          onClick={() => onCambiar(page + 1)}
        >
          Siguiente ›
        </button>
      </div>
    </div>
  );
}

function Dato({ icono, label, valor, copiable = false }) {
  return (
    <div className="flex items-start gap-2.5">
      <i className={`bx ${icono} mt-0.5 text-lg text-gray-400`} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <div className="flex items-center gap-1.5">
          <p className="break-words font-medium text-gray-800">
            {valor || "—"}
          </p>
          {copiable && valor && (
            <button
              type="button"
              onClick={() => copiar(valor)}
              title="Copiar"
              className="text-gray-400 transition hover:text-gray-700"
            >
              <i className="bx bx-copy" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FilaCargando({ columnas = 9 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columnas }).map((_, j) => (
        <td key={j} className="px-3 py-3">
          <div className="h-3 w-full max-w-[140px] rounded bg-gray-100" />
          {j === 1 && <div className="mt-2 h-2 w-24 rounded bg-gray-100" />}
        </td>
      ))}
    </tr>
  );
}

/* Lo que dice nuestro registro de esta orden: si es reincidencia, cuántas
   veces se volvió a ofrecer y si la tiene que ver un asesor. */
function BadgesRegistro({ registro }) {
  if (!registro) return null;
  const { numero, veces_ofrecida: veces, requiere_asesor: asesor } = registro;
  if (!(numero > 1) && !veces && !asesor) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {numero > 1 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
          <i className="bx bx-revision" />
          {numero}ª novedad
        </span>
      )}
      {veces > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
          Ofrecida {veces} {veces === 1 ? "vez" : "veces"}
        </span>
      )}
      {asesor && (
        <span
          title={registro.motivo_asesor || "Debe gestionarla un asesor"}
          className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700"
        >
          <i className="bx bx-user-voice" />
          Requiere asesor
        </span>
      )}
    </div>
  );
}

const ESTADOS_REGISTRO = {
  pendiente: { label: "Pendiente", clase: "bg-amber-50 text-amber-700 border-amber-200" },
  solventada: { label: "Solución enviada", clase: "bg-sky-50 text-sky-700 border-sky-200" },
  en_ruta: { label: "Se volvió a ofrecer", clase: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  cerrada: { label: "Cerrada", clase: "bg-gray-50 text-gray-600 border-gray-200" },
};
const RESULTADOS_REGISTRO = {
  entregada: { label: "Entregada", clase: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  devolucion: { label: "Devuelta", clase: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelada: { label: "Cancelada", clase: "bg-red-50 text-red-700 border-red-200" },
  indemnizada: { label: "Indemnizada", clase: "bg-gray-50 text-gray-600 border-gray-200" },
  nueva_novedad: { label: "Volvió a novedad", clase: "bg-rose-50 text-rose-700 border-rose-200" },
};
const TIPOS_SOLUCION = {
  volver_a_ofrecer: "Volver a ofrecer",
  ajustar_recaudo: "Ajustar recaudo",
  devolucion: "Devolución",
  externa: "Gestionada fuera de ChatCenter",
};
const EVENTOS_REGISTRO = {
  detectada: { icono: "bx-error", color: "text-amber-500" },
  reincidencia: { icono: "bx-revision", color: "text-rose-500" },
  sugerencia_ia: { icono: "bx-bot", color: "text-violet-500" },
  solventada: { icono: "bx-send", color: "text-emerald-600" },
  devolucion: { icono: "bx-undo", color: "text-rose-600" },
  solventada_externa: { icono: "bx-transfer", color: "text-gray-500" },
  en_ruta: { icono: "bxs-truck", color: "text-indigo-500" },
  cerrada: { icono: "bx-check-double", color: "text-gray-500" },
  error_dropi: { icono: "bx-x-circle", color: "text-rose-500" },
};

/* ───────────────────────── modal solventar ───────────────────────── */

/* Formulario por transportadora, copiado del modal de novedades del panel de
   Dropi (Ecuador). Cada una pide campos distintos y el panel valida que no
   vayan vacíos; si faltan, Dropi no la acepta.
   - Gintracom: tipo de solución (Volver a ofrecer / Ajustar recaudo /
     Efectuar devolución) + fecha posterior a hoy.
   - Servientrega: solución + nombre + celular.
   - Laarcourier: solución + nombre + dirección + celular.
   - Urbano: solución (+ dirección y referencia si la novedad es de dirección).
   - Veloces: solución + nombre + dirección + referencia + celular.
   "Devolver al remitente" existe para todas (botón aparte). */
const OPCIONES_GINTRACOM = [
  { value: 1, descripcion: "Volver a ofrecer" },
  { value: 2, descripcion: "Ajustar recaudo" },
  { value: 3, descripcion: "Efectuar devolución" },
];

const URBANO_NOVEDADES_DIRECCION = [
  "DIRECCION NO EXISTE",
  "DIRECCION INCOMPLETA",
  "DESTINO INCORRECTO",
  "DESCONOCIDO EN EL LUGAR",
  "DIRECCION INCORRECTA",
  "DIRECCION INSUFICIENTE",
];

/* Gintracom manda la novedad como "TEXTO | detalle": el panel compara solo
   la parte de antes del "|". */
const novedadBase = (n) =>
  String(n || "")
    .split("|")[0]
    .trim()
    .toUpperCase();

/* Qué campos pide cada transportadora para esta novedad. */
function camposPorTransportadora(novedad) {
  const t = String(novedad.transportadora || "")
    .toUpperCase()
    .replace(/\s+/g, "");
  const nov = novedadBase(novedad.novedad);

  // Solo Ecuador está verificado: en otros países la misma transportadora
  // pide otros campos (y el back lo rechaza igual).
  if (novedad.pais && novedad.pais !== "EC") return { noSoportada: true };

  if (t === "GINTRACOM") {
    return {
      gintracom: true,
      direccion:
        nov === "DIRECCIÓN DE DESTINARIO INCOMPLETA O INCORRECTA Y NO HAY RESPUESTA DEL CLIENTE",
      // El panel guarda este teléfono en direccionConfirma (así lo lee Dropi).
      telefonoEnDireccion: nov === "NÚMERO TELEFÓNICO INCORRECTO",
    };
  }
  if (t === "SERVIENTREGA") return { nombre: true, telefono: true };
  if (t === "LAARCOURIER" || t === "LAAR")
    return { nombre: true, direccion: true, telefono: true };
  if (t === "URBANO") {
    const dir = URBANO_NOVEDADES_DIRECCION.includes(nov);
    return { direccion: dir, referencia: dir, direccionOpcional: true };
  }
  if (t === "VELOCES")
    return {
      nombre: true,
      direccion: true,
      referencia: true,
      telefono: true,
      referenciaObligatoria: true,
    };
  // Transportadora sin formulario copiado del panel de Dropi: no se envía
  // nada desde aquí para no registrar una solución con el formato equivocado.
  return { noSoportada: true };
}

/* Fecha YYYY-MM-DD en Ecuador, desplazada N días. */
const fechaEc = (dias = 0) =>
  new Date(Date.now() - 5 * 3600000 + dias * 86400000)
    .toISOString()
    .slice(0, 10);

const fechaLarga = (ymd) => {
  if (!ymd) return "";
  const d = new Date(`${ymd}T12:00:00`);
  return d.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

/* Respuestas tipo de la base de conocimiento de transportadoras
   (src/knowledge/knowledge_base_transportadoras.md del back). */
const PLANTILLAS = [
  {
    label: "Sí va a recibir",
    icono: "bx-check-circle",
    texto: ({ tel, fecha }) =>
      `Me he comunicado con el cliente al número ${tel} y me indica que sí va a recibir el pedido${fecha ? ` el día ${fecha}` : ""}.`,
  },
  {
    label: "Estará en el domicilio",
    icono: "bx-home-heart",
    texto: ({ tel, fecha }) =>
      `Me he comunicado con el cliente al número ${tel}, me indica que ${fecha ? `el día ${fecha}` : "mañana"} ya se encontrará en el domicilio y podrá recibir el pedido.`,
  },
  {
    label: "Tendrá el dinero",
    icono: "bx-money",
    texto: ({ tel, fecha }) =>
      `Me he comunicado con el cliente al número ${tel}, indica que ${fecha ? `el día ${fecha}` : "mañana"} estará en el domicilio y ya tendrá el dinero disponible.`,
  },
  {
    label: "Dirección completa",
    icono: "bx-map-pin",
    texto: ({ tel, dir }) =>
      `Me he comunicado con el cliente al número ${tel} y me indica que la dirección es: ${dir || "(sector, calle principal y secundaria, # de casa)"}. Referencia: `,
  },
  {
    label: "Retira en oficina",
    icono: "bx-store-alt",
    texto: ({ tel, fecha }) =>
      `Me he comunicado con el cliente al número ${tel}, comenta que se acercará a la oficina ${fecha ? `el día ${fecha}` : "mañana"} a retirar el pedido.`,
  },
  {
    label: "Contactar a otro número",
    icono: "bx-phone-call",
    texto: ({ tel, fecha }) =>
      `Me he comunicado con el cliente al número ${tel} y me indica que se pueden comunicar con él al número (otro número). ${fecha ? `El día ${fecha}` : "Mañana"} estará en el domicilio esperando el pedido.`,
  },
];

const claseInput =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none focus:border-[#171931] focus:ring-2 focus:ring-[#171931]/10";

function Campo({ label, obligatorio, children, ayuda }) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-gray-700">
        {label}
        {obligatorio && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {ayuda && <span className="mt-1 block text-[11px] text-gray-400">{ayuda}</span>}
    </label>
  );
}

function ModalSolventar({ idConfiguracion, novedad, onClose, onSolventada }) {
  const campos = useMemo(() => camposPorTransportadora(novedad), [novedad]);
  const [opcion, setOpcion] = useState(1);
  const [fecha, setFecha] = useState(fechaEc(1));
  const [solucion, setSolucion] = useState("");
  const [nombre, setNombre] = useState(novedad.cliente?.nombre || "");
  const [telefono, setTelefono] = useState(novedad.cliente?.telefono || "");
  const [direccion, setDireccion] = useState(novedad.cliente?.direccion || "");
  const [referencia, setReferencia] = useState("");
  const [recaudo, setRecaudo] = useState(
    novedad.total !== null && novedad.total !== undefined
      ? String(novedad.total)
      : "",
  );
  const [enviando, setEnviando] = useState(false);
  // Sugerencia de la IA (modo sugerencia: rellena el formulario, no envía).
  const [ia, setIa] = useState(null);
  const [pensando, setPensando] = useState(false);
  const [usoIA, setUsoIA] = useState(false);

  const sugerirConIA = async () => {
    setPensando(true);
    try {
      const res = await chatApi.post("dropi_integrations/novedades/sugerir", {
        id_configuracion: idConfiguracion,
        order_id: novedad.order_id,
      });
      const s = res?.data?.data || null;
      setIa(s);
      if (s?.decision === "proponer" && s.solucion) {
        setSolucion(s.solucion);
        setUsoIA(true);
        if (s.fecha_entrega && s.fecha_entrega > fechaEc(0)) setFecha(s.fecha_entrega);
        if (s.nombre) setNombre(s.nombre);
        if (s.telefono) setTelefono(s.telefono);
        if (s.direccion) setDireccion(s.direccion);
        if (s.referencia) setReferencia(s.referencia);
        if (campos.gintracom) setOpcion(1);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo generar la sugerencia",
        text: errMsg(error, "Intenta de nuevo en un momento."),
        confirmButtonColor: "#d33",
      });
    } finally {
      setPensando(false);
    }
  };

  const esDevolucionGintracom = campos.gintracom && opcion === 3;
  const pideFecha = campos.gintracom && !esDevolucionGintracom;

  const tel = telefono || novedad.cliente?.telefono || "(número)";
  const dir = [direccion, novedad.cliente?.ciudad].filter(Boolean).join(", ");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !enviando && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, enviando]);

  const avisar = (text) =>
    Swal.fire({
      icon: "warning",
      title: "Falta información",
      text,
      confirmButtonColor: "#171931",
    });

  const enviarADropi = async (body, exito) => {
    setEnviando(true);
    try {
      const res = await chatApi.post("dropi_integrations/novedades/solucionar", {
        id_configuracion: idConfiguracion,
        order_id: novedad.order_id,
        // Para el registro de novedades (historial y reincidencias).
        transportadora: novedad.transportadora,
        novedad: novedad.novedad,
        guia: novedad.guia,
        sugerida_por_ia: usoIA,
        // Si el asesor cambió el texto que propuso la IA (mide qué tan bien acierta).
        ia_editada: usoIA && solucion.trim() !== (ia?.solucion || ""),
        ...body,
      });
      await Swal.fire({
        icon: "success",
        title: exito,
        text: res?.data?.message || "Dropi recibió la solución.",
        confirmButtonColor: "#171931",
        timer: 2500,
      });
      onSolventada(novedad);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Dropi no aceptó la solución",
        text: errMsg(error, "No se pudo enviar a Dropi."),
        confirmButtonColor: "#d33",
      });
    } finally {
      setEnviando(false);
    }
  };

  const devolver = async () => {
    const ok = await Swal.fire({
      icon: "warning",
      title: "¿Devolver el pedido al remitente?",
      html: `<p style="font-size:14px">La orden <b>#${novedad.order_id}</b> no se volverá a ofrecer: la transportadora la regresa a la bodega.</p>
      <p style="font-size:13px;color:#be123c;margin-top:8px"><b>No se puede deshacer.</b></p>`,
      showCancelButton: true,
      confirmButtonText: "Sí, devolver",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e11d48",
      focusCancel: true,
    });
    if (!ok.isConfirmed) return;
    await enviarADropi({ accion: "devolver" }, "Pedido enviado a devolución");
  };

  const enviar = async () => {
    if (esDevolucionGintracom) return devolver();

    const texto = solucion.trim();
    if (texto.length < 10)
      return avisar("Escribe qué se acordó con el cliente (mínimo 10 caracteres).");
    if (campos.nombre && !nombre.trim()) return avisar("Falta el nombre de quien recibe.");
    if (campos.telefono && !telefono.trim()) return avisar("Falta el celular.");
    if (campos.telefonoEnDireccion && !telefono.trim())
      return avisar("Falta el nuevo número de teléfono.");
    if (campos.direccion && !campos.direccionOpcional && !direccion.trim())
      return avisar("Falta la dirección de entrega.");
    if (campos.referenciaObligatoria && !referencia.trim())
      return avisar("Falta la referencia de la dirección.");
    if (pideFecha && fecha <= fechaEc(0))
      return avisar("La posible fecha de entrega debe ser posterior a hoy.");
    if (campos.gintracom && opcion === 2 && !(Number(recaudo) >= 0 && recaudo !== ""))
      return avisar("Ingresa el nuevo valor a recaudar.");

    const op = OPCIONES_GINTRACOM.find((o) => o.value === opcion);
    const resumen = campos.gintracom
      ? `${op.descripcion}${opcion === 2 ? ` por <b>$${Number(recaudo).toFixed(2)}</b>` : ""} · entrega el <b>${fechaLarga(fecha)}</b>`
      : "Volver a ofrecer";
    const ok = await Swal.fire({
      icon: "question",
      title: "¿Enviar solución a Dropi?",
      html: `<p style="font-size:14px">Orden <b>#${novedad.order_id}</b> · ${resumen}.</p>
      <p style="font-size:13px;color:#64748b;margin-top:8px">La transportadora recibirá la solución tal como está escrita.</p>`,
      showCancelButton: true,
      confirmButtonText: "Sí, solventar",
      cancelButtonText: "Revisar",
      confirmButtonColor: "#171931",
    });
    if (!ok.isConfirmed) return;

    // Veloces: el panel junta dirección y referencia en una sola línea.
    const direccionFinal = campos.telefonoEnDireccion
      ? telefono.trim()
      : campos.referenciaObligatoria
        ? `${direccion.trim()}, ${referencia.trim()}`
        : campos.direccion
          ? direccion.trim()
          : "";

    await enviarADropi(
      {
        solucion: texto,
        nuevo_nombre: campos.nombre ? nombre.trim() : "",
        nuevo_telefono: campos.telefono ? telefono.trim() : "",
        nueva_direccion: direccionFinal,
        datos_adicionales_direccion:
          campos.referencia && !campos.referenciaObligatoria ? referencia.trim() : "",
        ...(campos.gintracom
          ? {
              opcion: { value: op.value, descripcion: op.descripcion },
              fecha_envio: fecha,
              ...(opcion === 2 ? { nuevo_recaudo: Number(recaudo) } : {}),
            }
          : {}),
      },
      "Novedad solventada",
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-gray-900/50 p-4 backdrop-blur-[2px]"
      onClick={() => !enviando && onClose()}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera (azul de la marca, como la de Pedidos) */}
        <div className="flex items-start gap-3 bg-[#171931] px-5 py-4 text-white">
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
              esDevolucionGintracom ? "bg-rose-400/20" : "bg-white/10"
            }`}
          >
            <i
              className={`bx ${
                esDevolucionGintracom ? "bx-undo text-rose-200" : "bx-wrench text-white"
              } text-2xl`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">
              {esDevolucionGintracom ? "Devolver pedido" : "Solventar novedad"}
            </h2>
            <p className="text-xs text-white/60">
              Orden #{novedad.order_id} · {novedad.cliente?.nombre || "Cliente"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Cerrar (Esc)"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {/* Novedad reportada */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">
              Novedad reportada
            </p>
            <p className="mt-0.5 font-semibold text-amber-900">
              {novedad.novedad || "—"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <BadgeTransportadora nombre={novedad.transportadora} />
              {novedad.cliente?.telefono && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-800">
                  <i className="bx bx-phone" />
                  {novedad.cliente.telefono}
                </span>
              )}
            </div>
          </div>

          {/* Reincidencia: ya se ofreció y volvió a novedad */}
          {novedad.registro?.requiere_asesor && (
            <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-3 text-violet-900">
              <i className="bx bx-user-voice mt-0.5 text-lg" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide">
                  Gestión de asesor
                </p>
                <p className="text-xs leading-relaxed">
                  {novedad.registro.motivo_asesor ||
                    "Esta novedad debe revisarla un asesor antes de ofrecerla otra vez."}
                </p>
              </div>
            </div>
          )}

          {/* IA en modo sugerencia */}
          <div className="rounded-xl border border-gray-200 bg-white p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50">
                  <i className="bx bx-bot text-lg text-indigo-600" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-800">
                    Sugerencia de la IA
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Lee el chat con el cliente y propone la respuesta. Tú la
                    revisas y la envías.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={sugerirConIA}
                disabled={pensando || enviando}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#171931] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
              >
                <i className={`bx ${pensando ? "bx-loader-alt bx-spin" : "bx-magic-wand"}`} />
                {pensando ? "Leyendo el chat…" : ia ? "Volver a sugerir" : "Sugerir"}
              </button>
            </div>

            {ia && (
              <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold ${
                      ia.decision === "proponer"
                        ? "bg-emerald-100 text-emerald-700"
                        : ia.decision === "pedir_datos"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {ia.decision === "proponer"
                      ? "Propone volver a ofrecer"
                      : ia.decision === "pedir_datos"
                        ? "Falta respuesta del cliente"
                        : "Recomienda que lo vea un asesor"}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">
                    Confianza {ia.confianza}
                  </span>
                  {!ia.tiene_chat && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">
                      Sin conversación en ChatCenter
                    </span>
                  )}
                </div>
                {ia.motivo && <p className="text-gray-700">{ia.motivo}</p>}
                {(ia.avisos || []).map((a, i) => (
                  <p key={i} className="flex items-start gap-1 text-rose-700">
                    <i className="bx bx-error-circle mt-0.5" />
                    {a}
                  </p>
                ))}
                {ia.decision === "proponer" &&
                  (campos.noSoportada ? (
                    <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-800">
                      <p className="mb-1 font-bold">Solución sugerida</p>
                      <p className="whitespace-pre-wrap">{ia.solucion}</p>
                      <button
                        type="button"
                        onClick={() => copiar(ia.solucion)}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <i className="bx bx-copy" /> Copiar para pegar en Dropi
                      </button>
                    </div>
                  ) : (
                    <p className="text-emerald-700">
                      <i className="bx bx-check" /> Rellené el formulario con la
                      propuesta. Revísala antes de enviar.
                    </p>
                  ))}
                {ia.mensaje_para_cliente && (
                  <div className="rounded-lg bg-gray-50 p-2.5">
                    <p className="mb-1 font-bold text-gray-600">
                      Mensaje sugerido para el cliente
                    </p>
                    <p className="whitespace-pre-wrap text-gray-700">
                      {ia.mensaje_para_cliente}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => copiar(ia.mensaje_para_cliente)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        <i className="bx bx-copy" /> Copiar
                      </button>
                      {novedad.has_chat && novedad.chat_id_cliente && (
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              `/chat/${novedad.chat_id_cliente}`,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 font-semibold text-white hover:bg-emerald-700"
                        >
                          <i className="bx bx-message-rounded-dots" /> Abrir chat
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gintracom: tipo de solución */}
          {campos.gintracom && (
            <Campo label="Tipo de solución" obligatorio>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {OPCIONES_GINTRACOM.map((o) => {
                  const activa = opcion === o.value;
                  const roja = o.value === 3;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setOpcion(o.value)}
                      className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${
                        activa
                          ? roja
                            ? "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/15"
                            : "border-[#171931] bg-[#171931] text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {o.descripcion}
                    </button>
                  );
                })}
              </div>
            </Campo>
          )}

          {campos.noSoportada ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-gray-700">
              <p className="flex items-center gap-1.5 font-bold">
                <i className="bx bx-info-circle text-lg text-gray-500" />
                Esta novedad se solventa desde Dropi
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                Todavía no tenemos el formulario de{" "}
                <b>{novedad.transportadora || "esta transportadora"}</b>
                {novedad.pais && novedad.pais !== "EC" ? " para este país" : ""}:
                cada transportadora pide datos distintos y enviar los
                equivocados puede registrar una solución errónea. Puedes usar
                la sugerencia de la IA y el mensaje para el cliente, y cargar
                la solución en el panel de Dropi.
              </p>
            </div>
          ) : esDevolucionGintracom ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-rose-800">
              <p className="flex items-center gap-1.5 font-bold">
                <i className="bx bx-error-alt text-lg" />
                El pedido regresa a la bodega
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                La transportadora deja de intentar la entrega y devuelve el
                paquete al remitente. Úsalo solo si el cliente ya no quiere el
                pedido o no hay forma de entregarlo.
              </p>
            </div>
          ) : (
            <>
              {/* Fecha y recaudo (Gintracom) */}
              {pideFecha && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="Posible fecha de entrega" obligatorio>
                    <input
                      type="date"
                      value={fecha}
                      min={fechaEc(1)}
                      onChange={(e) => setFecha(e.target.value)}
                      className={claseInput}
                    />
                  </Campo>
                  {opcion === 2 && (
                    <Campo
                      label="Nuevo recaudo"
                      obligatorio
                      ayuda={`Valor actual: ${fmtMonto(novedad.total)}`}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={recaudo}
                        onChange={(e) => setRecaudo(e.target.value)}
                        className={claseInput}
                      />
                    </Campo>
                  )}
                </div>
              )}

              {/* Datos que pide la transportadora */}
              {(campos.nombre ||
                campos.telefono ||
                campos.telefonoEnDireccion ||
                campos.direccion ||
                campos.referencia) && (
                <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Datos de entrega que pide {novedad.transportadora}
                  </p>
                  {campos.nombre && (
                    <Campo label="Nombre de quien recibe" obligatorio>
                      <input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        maxLength={50}
                        className={claseInput}
                      />
                    </Campo>
                  )}
                  {(campos.telefono || campos.telefonoEnDireccion) && (
                    <Campo
                      label={campos.telefonoEnDireccion ? "Nuevo teléfono" : "Celular"}
                      obligatorio
                    >
                      <input
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        maxLength={15}
                        inputMode="tel"
                        className={claseInput}
                      />
                    </Campo>
                  )}
                  {campos.direccion && (
                    <Campo
                      label="Dirección de entrega"
                      obligatorio={!campos.direccionOpcional}
                    >
                      <input
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        maxLength={200}
                        className={claseInput}
                      />
                    </Campo>
                  )}
                  {campos.referencia && (
                    <Campo
                      label="Referencia de la dirección"
                      obligatorio={campos.referenciaObligatoria}
                    >
                      <input
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        maxLength={150}
                        placeholder="Ej.: casa esquinera, portón negro"
                        className={claseInput}
                      />
                    </Campo>
                  )}
                </div>
              )}

              {/* Plantillas */}
              <div>
                <p className="text-[13px] font-semibold text-gray-700">
                  Respuestas rápidas
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {PLANTILLAS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        setSolucion(
                          p.texto({
                            tel,
                            dir,
                            fecha: pideFecha ? fechaLarga(fecha) : "",
                          }),
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#171931]/40 hover:text-[#171931]"
                    >
                      <i className={`bx ${p.icono} text-sm`} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Texto de la solución */}
              <label className="block">
                <span className="flex items-center justify-between text-[13px] font-semibold text-gray-700">
                  <span>
                    {campos.gintracom ? "Observaciones" : "Solución"}
                    <span className="text-rose-500"> *</span>
                  </span>
                  <span className="text-[11px] font-normal text-gray-400">
                    {solucion.length}/200
                  </span>
                </span>
                <textarea
                  value={solucion}
                  onChange={(e) => setSolucion(e.target.value.slice(0, 200))}
                  rows={4}
                  placeholder="Ej.: Me he comunicado con el cliente al número 09…, confirma que mañana estará en el domicilio y recibirá el pedido."
                  className={`${claseInput} resize-none leading-relaxed`}
                />
              </label>

              <p className="flex items-start gap-1.5 text-xs text-gray-500">
                <i className="bx bx-info-circle mt-0.5 text-sm" />
                Contacta al cliente antes de enviar. Si la solución no es
                efectiva, la transportadora puede devolver el pedido.
              </p>
            </>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          {!campos.gintracom && !campos.noSoportada && (
            <button
              type="button"
              onClick={devolver}
              disabled={enviando}
              className="mr-auto inline-flex items-center gap-1 text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-50"
            >
              <i className="bx bx-undo text-base" />
              Devolver al remitente
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className={`rounded-xl bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-300 disabled:opacity-50 ${
              campos.gintracom || campos.noSoportada ? "ml-auto" : ""
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={
              enviando ||
              campos.noSoportada ||
              (!esDevolucionGintracom && !solucion.trim())
            }
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50 ${
              esDevolucionGintracom
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-[#171931] hover:opacity-95"
            }`}
          >
            <i
              className={`bx ${
                enviando
                  ? "bx-loader-alt bx-spin"
                  : esDevolucionGintracom
                    ? "bx-undo"
                    : "bx-send"
              }`}
            />
            {enviando
              ? "Enviando…"
              : esDevolucionGintracom
                ? "Devolver pedido"
                : "Solventar en Dropi"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── panel de detalle ───────────────────────── */

function DetalleNovedad({
  idConfiguracion,
  novedad,
  onClose,
  onAbrirChat,
  onSolventar,
  modalAbierto,
}) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [verJson, setVerJson] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    chatApi
      .post("dropi_integrations/novedades/detalle", {
        id_configuracion: idConfiguracion,
        order_id: novedad.order_id,
      })
      .then((res) => {
        if (!cancelado) setDetalle(res?.data?.data || null);
      })
      .catch((error) => {
        if (cancelado) return;
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errMsg(error, "No se pudo cargar el detalle de la novedad."),
          confirmButtonColor: "#d33",
        });
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [idConfiguracion, novedad.order_id]);

  useEffect(() => {
    // Con el modal de solventar encima, el Esc es del modal.
    if (modalAbierto) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, modalAbierto]);

  const d = detalle || novedad;
  const estados = [...(detalle?.estados || [])].reverse();

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col bg-gray-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="bg-[#171931] px-6 pb-5 pt-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/60">
              Orden #{novedad.order_id}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              title="Cerrar (Esc)"
            >
              <i className="bx bx-x text-2xl" />
            </button>
          </div>
          <div className="mt-2 flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-400/20">
              <i className="bx bx-error text-2xl text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-snug">
                {novedad.novedad || "Novedad"}
              </h2>
              <p className="mt-1 text-xs text-white/60">
                Reportada {hace(novedad.updated_at) || "—"} ·{" "}
                {fmtFecha(novedad.updated_at)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <BadgeTransportadora nombre={d.transportadora} />
            {d.metodo_solucion && (
              <span className="rounded-full border border-white/20 px-2.5 py-1 text-xs text-white/80">
                Solución por {d.metodo_solucion}
              </span>
            )}
            <button
              type="button"
              onClick={() => onSolventar(novedad)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#171931] transition hover:bg-emerald-50"
            >
              <i className="bx bx-wrench text-sm" />
              Solventar
            </button>
            <button
              type="button"
              onClick={() => onAbrirChat(novedad)}
              disabled={!novedad.has_chat || !novedad.chat_id_cliente}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
            >
              <i className="bx bx-message-rounded-dots text-sm" />
              {novedad.has_chat ? "Abrir chat" : "Sin chat"}
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
          {cargando ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Cliente y envío */}
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                  Cliente y envío
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Dato icono="bx-user" label="Cliente" valor={d.cliente?.nombre} />
                  <Dato
                    icono="bx-phone"
                    label="Teléfono"
                    valor={d.cliente?.telefono}
                    copiable
                  />
                  <Dato icono="bx-barcode" label="Guía" valor={d.guia} copiable />
                  <Dato icono="bx-dollar-circle" label="Total" valor={fmtMonto(d.total)} />
                  <div className="sm:col-span-2">
                    <Dato
                      icono="bx-map"
                      label="Dirección"
                      valor={[
                        d.cliente?.direccion,
                        d.cliente?.ciudad,
                        d.cliente?.provincia,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      copiable
                    />
                  </div>
                </div>
                {d.productos?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
                    {d.productos.map((p, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-700"
                      >
                        <i className="bx bx-package text-gray-400" />
                        {p.cantidad}× {p.nombre}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Gestiones */}
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                  Gestiones de la novedad
                </h3>
                {detalle?.gestiones?.length ? (
                  <ul className="space-y-2.5">
                    {detalle.gestiones.map((g) => {
                      const resuelta = !!g.solucion;
                      return (
                        <li
                          key={g.id}
                          className={`rounded-xl border-l-4 p-3 ${
                            resuelta
                              ? "border-emerald-400 bg-emerald-50/60"
                              : "border-amber-400 bg-amber-50/60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-gray-800">
                              {g.novedad || g.comentario || "—"}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                resuelta
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {resuelta ? "Con solución" : "Sin solucionar"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {fmtFecha(g.created_at)}
                          </p>
                          {g.solucion && (
                            <p className="mt-2">
                              <span className="text-gray-500">Solución: </span>
                              {g.solucion}
                            </p>
                          )}
                          {g.aclaracion && (
                            <p>
                              <span className="text-gray-500">Aclaración: </span>
                              {g.aclaracion}
                            </p>
                          )}
                          {g.observacion && (
                            <p>
                              <span className="text-gray-500">Observación: </span>
                              {g.observacion}
                            </p>
                          )}
                          {g.fecha_solucion && (
                            <p className="mt-1 text-xs text-gray-500">
                              Solucionada el {fmtFecha(g.fecha_solucion)}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-gray-500">Sin gestiones registradas.</p>
                )}
              </section>

              {/* Lo que registró ChatCenter de este pedido */}
              {(detalle?.total_novedades > 1 ||
                detalle?.veces_ofrecida > 0 ||
                detalle?.registro?.eventos?.length > 0) && (
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Historial de la novedad
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          detalle.total_novedades > 1
                            ? "bg-rose-100 text-rose-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {detalle.total_novedades || 1}{" "}
                        {detalle.total_novedades > 1 ? "novedades" : "novedad"} en
                        este pedido
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                        Ofrecido {detalle.veces_ofrecida || 0}{" "}
                        {detalle.veces_ofrecida === 1 ? "vez" : "veces"}
                      </span>
                    </div>
                  </div>
                  {detalle.registro?.eventos?.length ? (
                    <ul className="space-y-2.5">
                      {detalle.registro.eventos.map((e) => {
                        const ev = EVENTOS_REGISTRO[e.evento] || {
                          icono: "bx-dots-horizontal-rounded",
                          color: "text-gray-400",
                        };
                        return (
                          <li key={e.id} className="flex items-start gap-2.5">
                            <i className={`bx ${ev.icono} mt-0.5 text-lg ${ev.color}`} />
                            <div className="min-w-0">
                              <p className="text-gray-800">{e.descripcion || e.evento}</p>
                              <p className="text-xs text-gray-500">
                                {fmtFecha(e.created_at)}
                                {e.nombre_usuario ? ` · ${e.nombre_usuario}` : ""}
                                {e.origen === "ia" ? " · IA" : ""}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500">
                      ChatCenter empezó a registrar este pedido ahora; las
                      gestiones anteriores están arriba, tal como las guarda
                      Dropi.
                    </p>
                  )}
                </section>
              )}

              {/* Historial de estados (más reciente arriba) */}
              {estados.length > 0 && (
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Recorrido del pedido
                  </h3>
                  <ol className="relative ml-2 border-l-2 border-gray-100">
                    {estados.map((e, i) => {
                      const esNovedad = /NOVEDAD/i.test(e.status || "");
                      return (
                        <li key={`${e.status}-${i}`} className="mb-4 ml-4 last:mb-0">
                          <span
                            className={`absolute -left-[7px] mt-1 h-3 w-3 rounded-full ring-4 ring-white ${
                              i === 0
                                ? esNovedad
                                  ? "bg-amber-500"
                                  : "bg-[#171931]"
                                : "bg-gray-300"
                            }`}
                          />
                          <p
                            className={`font-semibold ${
                              esNovedad ? "text-amber-700" : "text-gray-800"
                            }`}
                          >
                            {e.status}
                          </p>
                          <p className="text-xs text-gray-500">
                            {fmtFecha(e.created_at)}
                          </p>
                          {e.novedad && (
                            <p className="mt-0.5 text-xs text-amber-700">
                              {e.novedad}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              {/* Respuesta cruda, para revisar qué manda Dropi */}
              <section>
                <button
                  type="button"
                  onClick={() => setVerJson((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
                >
                  <i className={`bx ${verJson ? "bx-chevron-up" : "bx-code-alt"}`} />
                  {verJson ? "Ocultar respuesta completa" : "Ver respuesta completa"}
                </button>
                {verJson && (
                  <pre className="mt-2 max-h-96 overflow-auto rounded-xl bg-gray-900 p-3 text-[11px] text-gray-100">
                    {JSON.stringify(detalle, null, 2)}
                  </pre>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── pestaña historial ───────────────────────── */

const FILTROS_REGISTRO = [
  { id: "", label: "Todas" },
  { id: "requiere_asesor", label: "Requieren asesor" },
  { id: "pendiente", label: "Pendientes" },
  { id: "solventada", label: "Solución enviada" },
  { id: "en_ruta", label: "Se volvió a ofrecer" },
  { id: "cerrada", label: "Cerradas" },
];

function RegistroNovedades({ idConfiguracion }) {
  const [filas, setFilas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [disponible, setDisponible] = useState(true);
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!idConfiguracion) return undefined;
    let cancelado = false;
    setCargando(true);
    chatApi
      .post("dropi_integrations/novedades/registro", {
        id_configuracion: idConfiguracion,
        estado,
        page,
        page_size: PAGE_SIZE,
      })
      .then((res) => {
        if (cancelado) return;
        const d = res?.data?.data || {};
        setFilas(Array.isArray(d.rows) ? d.rows : []);
        setTotal(Number(d.total) || 0);
        setResumen(d.resumen || null);
        setDisponible(d.disponible !== false);
      })
      .catch((error) => {
        if (cancelado) return;
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errMsg(error, "No se pudo cargar el historial."),
          confirmButtonColor: "#d33",
        });
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [idConfiguracion, estado, page]);

  if (!disponible) {
    return (
      <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-gray-100">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gray-100">
          <i className="bx bx-data text-3xl text-gray-400" />
        </div>
        <h3 className="mb-1 text-lg font-bold text-gray-800">
          El historial todavía no está activado
        </h3>
        <p className="text-sm text-gray-500">
          Falta crear las tablas del registro de novedades en la base de datos.
        </p>
      </div>
    );
  }

  const r = resumen || {};
  const cerradas = (r.entregadas || 0) + (r.devueltas || 0) + (r.sin_efecto || 0);
  const efectividad = cerradas
    ? `${Math.round(((r.entregadas || 0) / cerradas) * 100)}%`
    : "—";
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icono="bx-error" color="bg-amber-50 text-amber-600" valor={r.total || 0} label="Novedades registradas" />
        <Kpi icono="bx-user-voice" color="bg-violet-50 text-violet-600" valor={r.requieren_asesor || 0} label="Requieren asesor" />
        <Kpi icono="bx-revision" color="bg-rose-50 text-rose-600" valor={r.reincidencias || 0} label="Reincidencias" />
        <Kpi icono="bx-check-circle" color="bg-emerald-50 text-emerald-600" valor={r.entregadas || 0} label="Entregadas tras la novedad" />
        <Kpi icono="bx-trending-up" color="bg-[#171931]/[0.06] text-[#171931]" valor={efectividad} label="Efectividad de las soluciones" />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <TituloTarjeta
          icono="bx-history"
          titulo="Historial de novedades"
          subtitulo="Lo que registró ChatCenter en los últimos 30 días"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] font-semibold text-gray-700">Estado</span>
          {FILTROS_REGISTRO.map((f) => {
            const activa = estado === f.id;
            return (
              <button
                key={f.id || "todas"}
                type="button"
                onClick={() => {
                  setEstado(f.id);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                  activa
                    ? "border-[#171931] bg-[#171931] text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[#171931]/40"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 overflow-auto rounded-xl border border-gray-100">
          <table className="w-full min-w-[1000px] text-[13px]">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold"># Orden</th>
                <th className="px-3 py-2.5 text-left font-semibold">Novedad</th>
                <th className="px-3 py-2.5 text-left font-semibold">Transportadora</th>
                <th className="px-3 py-2.5 text-left font-semibold">Estado</th>
                <th className="px-3 py-2.5 text-left font-semibold">Solución</th>
                <th className="px-3 py-2.5 text-left font-semibold">Fechas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando && !filas.length ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <FilaCargando key={`sk-${i}`} columnas={6} />
                ))
              ) : !filas.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-gray-500">
                    Sin registros con ese filtro. Las novedades se registran a
                    medida que Dropi las reporta.
                  </td>
                </tr>
              ) : (
                filas.map((f) => {
                  const est = ESTADOS_REGISTRO[f.estado] || ESTADOS_REGISTRO.pendiente;
                  const resu = RESULTADOS_REGISTRO[f.resultado];
                  return (
                    <tr key={f.id} className="align-top hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-gray-900">#{f.dropi_order_id}</div>
                        <div className="text-xs text-gray-500">
                          Guía: {f.shipping_guide || "Sin guía"}
                        </div>
                      </td>
                      <td className="max-w-[240px] px-3 py-2.5">
                        <p className="line-clamp-2 font-medium text-amber-700">
                          {f.novedad || "—"}
                        </p>
                        <BadgesRegistro
                          registro={{
                            numero: f.numero,
                            veces_ofrecida: 0,
                            requiere_asesor:
                              Number(f.requiere_asesor) === 1 && f.estado !== "cerrada",
                            motivo_asesor: f.motivo_asesor,
                          }}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <BadgeTransportadora nombre={f.transportadora} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-semibold ${est.clase}`}
                          >
                            <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                            {est.label}
                          </span>
                          {resu && (
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-semibold ${resu.clase}`}
                            >
                              <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                              {resu.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[260px] px-3 py-2.5 text-xs">
                        {f.tipo_solucion ? (
                          <>
                            <p className="font-semibold text-gray-800">
                              {TIPOS_SOLUCION[f.tipo_solucion] || f.tipo_solucion}
                              {f.solventada_por === "ia" && (
                                <span className="ml-1.5 inline-flex items-center gap-1 rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                                  <i className="bx bx-bot text-xs" />
                                  IA
                                </span>
                              )}
                            </p>
                            {f.solucion && (
                              <p className="mt-0.5 line-clamp-2 text-gray-500">{f.solucion}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">Sin solución</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500">
                        <div>
                          <i className="bx bx-calendar mr-0.5 align-middle text-gray-400" />
                          Detectada: {fmtFecha(f.detectada_at)}
                        </div>
                        {f.solventada_at && <div>Solución: {fmtFecha(f.solventada_at)}</div>}
                        {f.cerrada_at && <div>Cierre: {fmtFecha(f.cerrada_at)}</div>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Paginacion
          page={page}
          totalPaginas={totalPaginas}
          cargando={cargando}
          onCambiar={setPage}
          texto={`${total.toLocaleString()} registros encontrados`}
        />
      </div>
    </>
  );
}

/* ───────────────────────── vista principal ───────────────────────── */

export default function NovedadesDropi() {
  const [idConfiguracion, setIdConfiguracion] = useState(null);
  const [novedades, setNovedades] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null);
  const [aSolventar, setASolventar] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [soloAsesor, setSoloAsesor] = useState(false);
  const [tab, setTab] = useState("pendientes");
  const location = useLocation();

  /* La campana de notificaciones enlaza a /novedades-dropi?orden=123: se
     muestra la pestaña de pendientes filtrada por ese pedido. */
  useEffect(() => {
    const orden = new URLSearchParams(location.search).get("orden");
    if (orden) {
      setTab("pendientes");
      setSoloAsesor(false);
      setTransportadora("");
      setBusqueda(orden);
    }
  }, [location.search]);

  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setIdConfiguracion(parseInt(idc, 10));
  }, []);

  const cargar = useCallback(async () => {
    if (!idConfiguracion) return;
    setCargando(true);
    try {
      const res = await chatApi.post("dropi_integrations/novedades/pendientes", {
        id_configuracion: idConfiguracion,
        page,
        page_size: PAGE_SIZE,
      });
      const data = res?.data?.data || {};
      setNovedades(Array.isArray(data.novedades) ? data.novedades : []);
      setHasMore(!!data.hasMore);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errMsg(error, "No se pudieron cargar las novedades."),
        confirmButtonColor: "#d33",
      });
    } finally {
      setCargando(false);
    }
  }, [idConfiguracion, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirChat = useCallback((n) => {
    if (!n?.chat_id_cliente) return;
    window.open(`/chat/${n.chat_id_cliente}`, "_blank", "noopener,noreferrer");
  }, []);
  const cerrarDetalle = useCallback(() => setSeleccionada(null), []);
  const cerrarSolventar = useCallback(() => setASolventar(null), []);

  /* Solventada en Dropi: sale de la lista sin esperar a recargar (Dropi puede
     tardar en dejar de devolverla como pendiente). */
  const alSolventar = useCallback((n) => {
    setASolventar(null);
    setSeleccionada(null);
    setNovedades((prev) => prev.filter((x) => x.order_id !== n.order_id));
  }, []);

  // Filtros sobre la página cargada (la consulta a Dropi no los soporta).
  const transportadoras = useMemo(
    () =>
      Array.from(
        new Set(novedades.map((n) => n.transportadora).filter(Boolean)),
      ).sort(),
    [novedades],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return novedades.filter((n) => {
      if (transportadora && n.transportadora !== transportadora) return false;
      if (soloAsesor && !n.registro?.requiere_asesor) return false;
      if (!q) return true;
      return [
        n.order_id,
        n.guia,
        n.novedad,
        n.cliente?.nombre,
        n.cliente?.telefono,
        n.cliente?.ciudad,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [novedades, busqueda, transportadora, soloAsesor]);

  const kpis = useMemo(
    () => ({
      total: novedades.length,
      conChat: novedades.filter((n) => n.has_chat).length,
      viejas: novedades.filter((n) => horasDesde(n.updated_at) >= 24).length,
      asesor: novedades.filter((n) => n.registro?.requiere_asesor).length,
    }),
    [novedades],
  );

  return (
    <div className="p-5">
      {/* HEADER (mismo de Gestión de Pedidos) */}
      <div className="mb-6 rounded-2xl bg-[#171931] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Novedades Dropi</h1>
            <p className="mt-1 text-sm opacity-90">
              Pedidos con novedad por solucionar, su historial y la sugerencia
              de la IA.
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-white/60">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  cargando ? "animate-pulse bg-amber-400" : "bg-emerald-400"
                }`}
              />
              {cargando ? "Consultando a Dropi…" : "En vivo desde Dropi"}
              <button
                type="button"
                onClick={cargar}
                disabled={cargando}
                className="ml-2 inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-white/80 transition hover:bg-white/20 disabled:opacity-50"
              >
                <i className={`bx bx-refresh text-sm ${cargando ? "animate-spin" : ""}`} />
                Actualizar
              </button>
            </div>
          </div>

          {/* Pestañas */}
          <div className="inline-flex self-start rounded-xl border border-white/15 bg-white/10 p-1 md:self-auto">
            {[
              { id: "pendientes", label: "Pendientes", icono: "bx-error-circle" },
              { id: "historial", label: "Historial", icono: "bx-history" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === t.id
                    ? "bg-white text-[#171931] shadow-sm"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <i className={`bx ${t.icono}`} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "historial" && <RegistroNovedades idConfiguracion={idConfiguracion} />}

      <div className={tab === "pendientes" ? "" : "hidden"}>
        {/* KPIs */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            icono="bx-error"
            color="bg-amber-50 text-amber-600"
            valor={hasMore ? `${kpis.total}+` : kpis.total}
            label="Novedades pendientes"
          />
          <Kpi
            icono="bxs-chat"
            color="bg-emerald-50 text-emerald-600"
            valor={kpis.conChat}
            label="Con conversación en ChatCenter"
          />
          <Kpi
            icono="bx-time-five"
            color="bg-rose-50 text-rose-600"
            valor={kpis.viejas}
            label="Llevan más de 24 h"
          />
          <Kpi
            icono="bx-user-voice"
            color="bg-violet-50 text-violet-600"
            valor={kpis.asesor}
            label="Requieren asesor"
          />
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <TituloTarjeta
            icono="bx-filter-alt"
            titulo="Filtros de búsqueda"
            subtitulo="Filtra por cliente, guía, transportadora o gestión de la novedad"
          />

          <div className="mt-5 grid grid-cols-1 items-start gap-3 md:grid-cols-4 xl:grid-cols-6">
            {/* Buscar */}
            <div className="flex h-full flex-col md:col-span-2">
              <label className="text-[13px] font-semibold text-gray-700">Buscar</label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Cliente, teléfono, guía, ciudad o novedad…"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-[7px] text-[13px] transition focus:border-[#171931] focus:outline-none focus:ring-2 focus:ring-[#171931]/10"
              />
              <p className="mt-1 text-xs text-gray-400">
                Busca automáticamente mientras escribe.
              </p>
            </div>

            <FilterDropdown
              label="Transportadora"
              icon="bx-truck"
              value={transportadora}
              placeholder="Todas"
              options={[
                { value: "", label: "Todas" },
                ...transportadoras.map((t) => ({
                  value: t,
                  label: t,
                  count: novedades.filter((n) => n.transportadora === t).length,
                })),
              ]}
              onChange={setTransportadora}
            />

            <FilterDropdown
              label="Gestión"
              icon="bx-user-voice"
              value={soloAsesor ? "asesor" : ""}
              placeholder="Todas"
              options={[
                { value: "", label: "Todas" },
                { value: "asesor", label: "Requieren asesor", count: kpis.asesor },
              ]}
              onChange={(val) => setSoloAsesor(val === "asesor")}
            />

            {/* Limpiar */}
            <div className="flex h-full flex-col">
              <label className="select-none text-[13px] font-semibold text-gray-700 opacity-0">
                Limpiar
              </label>
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setTransportadora("");
                  setSoloAsesor(false);
                }}
                className="mt-1 w-full rounded-xl bg-gray-200 px-3 py-[7px] text-[13px] font-semibold text-gray-800 shadow-sm transition hover:bg-gray-300"
              >
                Limpiar
              </button>
              <div className="mt-1 select-none text-[11px] opacity-0">.</div>
            </div>
          </div>

          {/* Alerta: reincidencias que debe ver un asesor */}
          {!cargando && kpis.asesor > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <i className="bx bxs-error mt-0.5 shrink-0 text-lg" />
              <div>
                <span className="font-semibold">
                  {kpis.asesor} novedad(es) requieren asesor.
                </span>{" "}
                Ya se volvieron a ofrecer y regresaron a novedad: conviene que
                un asesor hable con el cliente antes de solventarlas otra vez.
              </div>
            </div>
          )}

          {/* TABLA */}
          <div className="mt-6 overflow-auto rounded-xl border border-gray-100">
            <table className="w-full min-w-[1150px] text-[13px]">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold"># Orden</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Cliente</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Novedad</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Transportadora</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Producto</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Agente</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Chat</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cargando && !novedades.length ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <FilaCargando key={`sk-${i}`} columnas={9} />
                  ))
                ) : !visibles.length ? (
                  <tr>
                    <td className="px-4 py-6 text-gray-500" colSpan={9}>
                      {novedades.length
                        ? "Ninguna novedad coincide con esos filtros."
                        : "No hay novedades pendientes: todos tus pedidos con novedad ya están gestionados."}
                    </td>
                  </tr>
                ) : (
                  visibles.map((n) => {
                    const urgente = horasDesde(n.updated_at) >= 24;
                    const hasAgent = n.agent_assigned && n.agent_assigned !== "Sin agente";
                    const prods = n.productos || [];
                    return (
                      <tr
                        key={n.order_id}
                        onClick={() => setSeleccionada(n)}
                        className="cursor-pointer align-top hover:bg-gray-50"
                      >
                        <td className="px-3 py-2.5 font-semibold text-gray-900">
                          #{n.order_id}
                        </td>

                        {/* Cliente + guía */}
                        <td className="px-3 py-2.5 text-gray-700">
                          <div className="max-w-[190px] truncate font-semibold text-gray-900">
                            {n.cliente?.nombre || "Sin nombre"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Tel: {n.cliente?.telefono || "Sin teléfono"}
                          </div>
                          {n.cliente?.ciudad && (
                            <div className="text-xs text-gray-500">{n.cliente.ciudad}</div>
                          )}
                          <div className="text-xs text-gray-500">
                            Guía: {n.guia || "Sin guía"}
                          </div>
                        </td>

                        {/* Novedad */}
                        <td className="max-w-[260px] px-3 py-2.5">
                          <p className="line-clamp-2 font-medium text-amber-700">
                            {n.novedad || "—"}
                          </p>
                          {hace(n.updated_at) && (
                            <span
                              className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                urgente
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-gray-200 bg-gray-50 text-gray-500"
                              }`}
                            >
                              <i className="bx bx-time-five" />
                              {hace(n.updated_at)}
                            </span>
                          )}
                          <BadgesRegistro registro={n.registro} />
                        </td>

                        <td className="px-3 py-2.5">
                          <BadgeTransportadora nombre={n.transportadora} />
                        </td>

                        {/* Producto */}
                        <td className="px-3 py-2.5 text-gray-700">
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-100">
                              <i className="bx bx-package text-lg text-gray-300" />
                            </div>
                            <div className="min-w-0 max-w-[200px]">
                              <div className="line-clamp-2">
                                {prods.length
                                  ? prods
                                      .map((p) => `${p.cantidad}× ${p.nombre}`)
                                      .join(" + ")
                                  : "-"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                          {fmtMonto(n.total)}
                        </td>

                        {/* Agente (sin asignar + hay chat → Bot) */}
                        <td className="px-3 py-2.5 text-gray-700">
                          {hasAgent ? (
                            <span className="inline-flex max-w-[120px] items-start gap-1.5">
                              <i className="bx bx-user-circle mt-0.5 shrink-0 text-base text-gray-400" />
                              <span className="whitespace-normal break-words text-xs leading-tight">
                                {n.agent_assigned}
                              </span>
                            </span>
                          ) : n.has_chat ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                              <i className="bx bx-bot text-sm" />
                              Bot
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <BotonChat
                            disabled={!n.has_chat || !n.chat_id_cliente}
                            onClick={() => abrirChat(n)}
                          />
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setASolventar(n);
                              }}
                              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#171931] px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98]"
                            >
                              <i className="bx bx-wrench text-sm" />
                              Solventar
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSeleccionada(n);
                              }}
                              title="Ver detalle"
                              aria-label="Ver detalle"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-800"
                            >
                              <i className="bx bx-show text-[18px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Paginacion
            page={page}
            hayMas={hasMore}
            cargando={cargando}
            onCambiar={setPage}
            texto={`${visibles.length} novedad(es) en esta página${hasMore ? " · hay más en la siguiente" : ""}`}
          />
        </div>
      </div>

      {seleccionada && (
        <DetalleNovedad
          idConfiguracion={idConfiguracion}
          novedad={seleccionada}
          onClose={cerrarDetalle}
          onAbrirChat={abrirChat}
          onSolventar={setASolventar}
          modalAbierto={!!aSolventar}
        />
      )}

      {aSolventar && (
        <ModalSolventar
          idConfiguracion={idConfiguracion}
          novedad={aSolventar}
          onClose={cerrarSolventar}
          onSolventada={alSolventar}
        />
      )}
    </div>
  );
}

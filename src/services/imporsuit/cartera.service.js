import imporsuitApi from "../../api/imporsuit";

/**
 * Servicio de CARTERA de Imporsuit (deudas + pagos) consumido desde chatcenter.
 * Endpoints "libres" del controlador `Carterachat` (token compartido).
 * Tablas reales: carteras + cuenta_por_pagar + cartera_pagos.
 * NO toca Wallet/billeteras/solicitudes.
 *
 * El back legacy responde:
 *   - Lecturas: el array/objeto crudo de la query.
 *   - Mutaciones / errores: envelope `{ status, message, ... }` con HTTP 200
 *     → `unwrap()` revienta ruidosamente cuando status >= 400 (incluye el 401
 *     de token de integración inválido).
 */

function unwrap(data) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const status = data.status;
    if (status != null && Number(status) >= 400) {
      const err = new Error(data.message || data.title || `Error ${status}`);
      err.status = Number(status);
      err.payload = data;
      throw err;
    }
  }
  return data;
}

/* ── Lecturas ──────────────────────────────────────────────────────── */

/**
 * Busca un CLIENTE por correo (Carterachat/buscar_cliente).
 * @returns {Promise<{exists: boolean, data: object|null}>}
 *   data (si exists): { id_users, nombre_users, email_users, suspendido,
 *   id_rol, id_cartera, telefono, cursos[], fecha_registro, membresia_ecommerce,
 *   ecommerce, importacion, infoaduana, kit, tiendas, franquicias }. `id_cartera`
 *   es el uuid o 0; `telefono` sale de plataformas.whatsapp (o perfil.telefono),
 *   "" si no tiene; `cursos` es un array de id_curso (cursos_usuarios);
 *   `fecha_registro` es users.date_added (desde cuándo es cliente).
 */
export async function buscarPorCorreo(correo, { signal } = {}) {
  const { data } = await imporsuitApi.post(
    "/Carterachat/buscar_cliente",
    { correo: String(correo ?? "").trim() },
    { signal },
  );
  unwrap(data);
  return {
    exists: Boolean(data?.exists),
    data: data?.data ?? null,
  };
}

/** Detalle de un usuario por id (incluye id_cartera uuid o 0). */
export async function getUserData(idUser, { signal } = {}) {
  const { data } = await imporsuitApi.get(
    `/Carterachat/cliente/${Number(idUser)}`,
    { signal },
  );
  return unwrap(data);
}

/**
 * Deudas de una cartera con su historial de pagos.
 * OJO: recibe el UUID de la cartera (campo id_cartera), NO el id del usuario.
 */
export async function getDeudasUsuario(idCarteraUuid, { signal } = {}) {
  const { data } = await imporsuitApi.get(
    `/Carterachat/deudas/${encodeURIComponent(String(idCarteraUuid))}`,
    { signal },
  );
  return unwrap(data);
}

/**
 * Deuda pendiente TOTAL de VARIOS correos en UNA sola llamada (batch para el
 * listado de chats). Devuelve un mapa
 *   { "<correo en minúsculas>": { pendiente, num_pendientes } }
 * SOLO con los correos que tienen saldo > 0 — los ausentes se asumen sin deuda.
 */
export async function getDeudasPorCorreos(correos, { signal } = {}) {
  const { data } = await imporsuitApi.post(
    "/Carterachat/deudas_por_correos",
    { correos: Array.isArray(correos) ? correos : [] },
    { signal },
  );
  unwrap(data);
  return data?.data ?? {};
}

/* ── Mutaciones ────────────────────────────────────────────────────── */

/** Crea la cartera de un usuario. Devuelve { status, message, uuid }. */
export async function generarCartera(idUser, { signal } = {}) {
  const { data } = await imporsuitApi.post(
    "/Carterachat/generar_cartera",
    { id_users: Number(idUser) },
    { signal },
  );
  return unwrap(data);
}

/**
 * Agrega una deuda a la cartera.
 * @param {{ concepto, monto, idCarteraUuid, tipoVenta, fechaLimite, launchId? }} p
 *   tipoVenta: 'fria' | 'caliente' · fechaLimite: 'YYYY-MM-DD'
 */
export async function agregarDeuda(
  { concepto, monto, idCarteraUuid, tipoVenta, fechaLimite, launchId, idAsesor },
  { signal } = {},
) {
  const { data } = await imporsuitApi.post(
    "/Carterachat/agregar_deuda",
    {
      concepto: String(concepto ?? "").trim(),
      monto: Number(monto),
      id_cartera: String(idCarteraUuid),
      tipo_venta: tipoVenta,
      fecha_limite: fechaLimite,
      launch_id: launchId ? String(launchId) : "",
      id_asesor: idAsesor ? Number(idAsesor) : 0,
    },
    { signal },
  );
  return unwrap(data);
}

/**
 * Registra un pago/abono sobre una deuda.
 * Las imágenes (si las hay) deben venir ya subidas como URLs en imagenesUrls.
 */
export async function agregarPago(
  {
    idCpp,
    montoPagado,
    fechaPago,
    medioPago,
    referencia = "",
    imagenesUrls = [],
    numeroCuota = "",
    moneda = "USD",
  },
  { signal } = {},
) {
  const { data } = await imporsuitApi.post(
    "/Carterachat/agregar_pago",
    {
      id_cpp: Number(idCpp),
      monto_pagado: Number(montoPagado),
      fecha_pago: fechaPago,
      medio_pago: medioPago,
      referencia: String(referencia ?? ""),
      imagenes_urls: Array.isArray(imagenesUrls) ? imagenesUrls : [],
      numero_cuota: String(numeroCuota ?? ""),
      moneda: String(moneda ?? "USD"),
    },
    { signal },
  );
  return unwrap(data);
}

/** Elimina una deuda SIN pagos. Devuelve { status, message }. */
export async function eliminarDeuda(idCpp, { signal } = {}) {
  const { data } = await imporsuitApi.post(
    "/Carterachat/eliminar_deuda",
    { id_cpp: Number(idCpp) },
    { signal },
  );
  return unwrap(data);
}

/**
 * Actualiza solo el `launch_id` de una deuda. `launchId` vacío la limpia (NULL).
 * Devuelve { status, message, launch_id }.
 */
export async function editarDeuda({ idCpp, launchId }, { signal } = {}) {
  const { data } = await imporsuitApi.post(
    "/Carterachat/editar_deuda",
    {
      id_cpp: Number(idCpp),
      launch_id: launchId ? String(launchId).trim() : "",
    },
    { signal },
  );
  return unwrap(data);
}

/* ── Webhook de cuotas (lanzamientos) ──────────────────────────────── */

const WEBHOOK_CUOTAS_URL =
  "https://launch-copy-engine-production.up.railway.app/api/cuotas/webhook/pago";
const WEBHOOK_CUOTAS_SECRET = "lce-cuotas-2026";

/** launch_id histórico por defecto cuando la deuda no tiene uno propio. */
export const LAUNCH_ID_DEFAULT = "e0ab1098-eb61-40a3-ad37-75c02df5ca6d";

/**
 * Reenvía UN pago al webhook de cuotas (mismo endpoint que usa el legacy).
 * Se dispara desde el front porque el back NO lo hace. Lanza si el POST falla.
 * Va con fetch directo: el destino es el API de Railway, no el backend Imporsuit.
 */
export async function enviarWebhookCuota(payload, { signal } = {}) {
  const res = await fetch(WEBHOOK_CUOTAS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": WEBHOOK_CUOTAS_SECRET,
    },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Webhook cuotas respondió ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

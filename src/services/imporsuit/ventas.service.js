import imporsuitApi from "../../api/imporsuit";
import chatApi from "../../api/chatcenter";

/**
 * Servicio de REGISTRO EN MODO VENTAS (el alumno ya pagó).
 *
 * Endpoints "libres" del controlador `Carterachat` (token compartido):
 *   - GET  /Carterachat/catalogos_venta
 *   - POST /Carterachat/registrar_venta
 *
 * Son el espejo de `Venta/catalogos` y `Venta/registrar` del panel React:
 * aquellos exigen JWT con rol 1/6/12/20 y chatcenter se autentica con el token
 * de integración. La lógica es la misma (VentaModel), así que las dos puertas
 * registran idéntico.
 *
 * A diferencia de `crearUsuarioFull`, esto encadena:
 *   usuario (+curso y paquete del producto) → cartera → deuda con sus cuotas
 *   → pago de la primera → bienvenida WhatsApp → webhook de Make
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

/**
 * Productos vendibles, closers (rol 6) y pasarelas, en un solo viaje.
 *
 * `closerPorDefecto` es el asesor de integración del .env: acá no hay usuario
 * de Imporsuit logueado con quien precargar el select.
 */
export async function getCatalogosVenta({ signal } = {}) {
  const { data } = await imporsuitApi.get("/Carterachat/catalogos_venta", {
    signal,
  });
  unwrap(data);

  return {
    productos: (Array.isArray(data?.productos) ? data.productos : []).map((p) => ({
      id: Number(p.id_producto_venta),
      nombre: String(p.nombre ?? ""),
      idCurso: p.id_curso == null ? null : Number(p.id_curso),
      cursoNombre: p.curso_nombre ?? null,
      flagPaquete: p.flag_paquete ?? null,
    })),
    closers: (Array.isArray(data?.closers) ? data.closers : []).map((c) => ({
      id: Number(c.id_users),
      nombre: String(c.nombre_users ?? ""),
      email: String(c.email_users ?? ""),
    })),
    pasarelas: Array.isArray(data?.pasarelas) ? data.pasarelas : [],
    // Etiquetas de ImporChat (asesor / ciclo), ya deduplicadas entre las dos
    // configuraciones por el back.
    etiquetas: {
      asesores: Array.isArray(data?.etiquetas?.asesores) ? data.etiquetas.asesores : [],
      ciclos: Array.isArray(data?.etiquetas?.ciclos) ? data.etiquetas.ciclos : [],
    },
    closerPorDefecto: Number(data?.closer_por_defecto ?? 0),
  };
}

/**
 * Registra la venta completa.
 *
 * `montoPagado` es lo que YA entró (la cuota 1); `montoTotal`, el precio de la
 * venta. De contado son iguales; con cuotas el back reparte el total en N
 * vencimientos mensuales desde `fechaCompra` (paga el 5-ago → 2ª el 5-sep).
 *
 * @returns {Promise<{status, message, data:{id_users, cartera_uuid, id_cpp,
 *   cuotas, ya_existia, pago_registrado, pago_error, producto,
 *   whatsapp:{enviado, plantilla, registrado_en_chat, motivo}},
 *   webhook:{enviado, error}}>}
 */
export async function registrarVenta(payload, { signal } = {}) {
  const body = {
    nombre: String(payload.nombre ?? "").trim(),
    correo: String(payload.correo ?? "").trim(),
    telefono: String(payload.telefono ?? "").trim(),
    pais: String(payload.pais ?? "").trim().toUpperCase(),
    id_producto_venta: Number(payload.idProducto),
    monto_total: Number(payload.montoTotal),
    monto_pagado: Number(payload.montoPagado ?? 0),
    cuotas: Number(payload.cuotas ?? 1),
    fecha_compra: payload.fechaCompra,
    id_closer: Number(payload.idCloser ?? 0),
    pasarela: payload.pasarela,
    referencia: payload.referencia || "",
    // Comprobantes ya subidos a S3: al back solo viajan las URLs.
    imagenes_urls: Array.isArray(payload.imagenesUrls) ? payload.imagenesUrls : [],
    rol: Number(payload.rol ?? 16),
    tipo_venta: payload.tipoVenta ?? "caliente",
    enviar_whatsapp: payload.enviarWhatsapp !== false,
    // Por nombre: la misma etiqueta tiene otro id en cada configuración.
    etiqueta_asesor: payload.etiquetaAsesor || "",
    etiqueta_ciclo: payload.etiquetaCiclo || "",
  };

  const { data } = await imporsuitApi.post(
    "/Carterachat/registrar_venta",
    body,
    { signal },
  );
  return unwrap(data);
}

/** Asigna desde el API de ChatCenter una vez creados los chats de la venta. */
export async function asignarEtiquetasVenta({ correo, telefono, asesor, ciclo }, { signal } = {}) {
  const { data } = await chatApi.post(
    "/etiquetas_custom_chat_center/asignar-contacto",
    {
      correo: String(correo ?? "").trim(),
      telefono: String(telefono ?? "").trim(),
      asesor: String(asesor ?? "").trim(),
      ciclo: String(ciclo ?? "").trim(),
    },
    { signal },
  );
  return data;
}

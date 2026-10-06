import imporsuitApi from "../../api/imporsuit";

/**
 * Facturación electrónica (Dátil → SRI) de las deudas de la cartera, desde
 * ImporChat. Endpoints del controlador `Carterachat` (token compartido), que
 * reusa el mismo modelo que Imporfactory: la regla y el emisor son los mismos.
 *
 * Cada deuda —o cada cuota de un programa a plazos— lleva su propia factura.
 * Para emitirla hace falta que esté pagada completa y que el cliente tenga
 * datos de facturación; `prepararFacturaDeuda` dice cuál de las dos falta.
 *
 * Estos endpoints contestan los errores con HTTP 200 y dos formas distintas:
 * el envelope legacy `{ status, message }` o `{ success: false, message }`.
 */
function unwrap(data, fallback) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const status = Number(data.status);
    if (data.success === false || (data.status != null && status >= 400)) {
      const err = new Error(data.message || data.title || fallback);
      err.status = Number.isFinite(status) ? status : 400;
      err.payload = data;
      throw err;
    }
  }
  return data;
}

/**
 * Requisitos, vista previa del detalle y factura vigente de una deuda.
 * @returns {Promise<{cartera:object, facturacion:object, emisor:object,
 *   vista_previa:?object, factura:?object, bloqueos:Array, puede_emitir:boolean,
 *   avisos:string[], cliente:{id_users:number,nombre:string}, deuda:object}>}
 */
export async function prepararFacturaDeuda(idCpp, { signal } = {}) {
  const { data } = await imporsuitApi.post(
    "/Carterachat/factura_preparar",
    { id_cpp: Number(idCpp) },
    { signal },
  );
  return unwrap(data, "No se pudo preparar la factura.");
}

/** Emite la factura de la deuda. El back vuelve a validar los requisitos. */
export async function emitirFacturaDeuda(idCpp) {
  const { data } = await imporsuitApi.post("/Carterachat/factura_emitir", {
    id_cpp: Number(idCpp),
  });
  return unwrap(data, "No se pudo emitir la factura.");
}

/** Refresca contra Dátil una factura que sigue esperando al SRI. */
export async function consultarFacturaDeuda(idCpp, { signal } = {}) {
  const { data } = await imporsuitApi.post(
    "/Carterachat/factura_consultar",
    { id_cpp: Number(idCpp) },
    { signal },
  );
  return unwrap(data, "No se pudo consultar la factura.");
}

/**
 * Datos fiscales del cliente (Ecuador) + el catálogo de campos con que se
 * pinta el formulario + la precarga sugerida si todavía no tiene.
 */
export async function getDatosFacturacion(idUsers, { signal } = {}) {
  const { data } = await imporsuitApi.post(
    "/Carterachat/facturacion_datos",
    { id_users: Number(idUsers), pais: "ec" },
    { signal },
  );
  return unwrap(data, "No se pudieron cargar los datos de facturación.");
}

/**
 * Alta o actualización de los datos fiscales. NO pasa por `unwrap`: cuando la
 * validación falla, la respuesta trae `errores` por campo y el formulario
 * los necesita.
 * @returns {Promise<{success:boolean, message:string, errores?:Object}>}
 */
export async function guardarDatosFacturacion(idUsers, form) {
  const { data } = await imporsuitApi.post("/Carterachat/facturacion_guardar", {
    ...form,
    id_users: Number(idUsers),
    pais: "ec",
  });
  if (data && Number(data.status) >= 400) {
    return { success: false, message: data.message || "No se pudieron guardar los datos." };
  }
  return data;
}

/** Consulta un RUC en el catastro público del SRI (autocompleta el formulario). */
export async function consultarRucSri(ruc, { signal } = {}) {
  const { data } = await imporsuitApi.post(
    "/Carterachat/facturacion_sri",
    { ruc: String(ruc) },
    { signal },
  );
  return unwrap(data, "No se pudo consultar el SRI.");
}

import { jwtDecode } from "jwt-decode";
import chatApi from "../../api/chatcenter";

/**
 * Productos adicionales (complementos) que se suman a la suscripción de
 * Stripe: una fila por clave en addons_chat_center del back. Los compran el
 * administrador de la cuenta desde /complementos, desde el modal de límite de
 * Usuarios y Conexiones, y desde ImporKiller (botón «Extensión»).
 *
 * La compra va por POST /stripe_plan/comprarAddon { id_usuario, clave,
 * cantidad }: el back agrega (o incrementa) el item en la suscripción, cobra el
 * prorrateo al instante y escribe la cantidad en usuarios_chat_center
 * (conexiones_adicionales / subusuarios_adicionales / imporkiller). En trial se
 * otorga gratis y se cobra con el primer pago real.
 */
export const ADDONS = [
  {
    clave: "subusuario_adicional",
    nombre: "Usuario adicional",
    precio: 5,
    unidad: "por usuario",
    icono: "bxs-user-plus",
    tono: "sky",
    campo: "subusuarios_adicionales",
    incluidos: (plan) => Number(plan?.max_subusuarios || 0),
    nombreIncluidos: "usuarios",
    resumen: "Un asesor más atendiendo tus chats, con su propio acceso y sus propias conversaciones.",
    detalle: ["Acceso propio con usuario y clave", "Reparto automático de chats (round robin)", "Métricas por asesor en el tablero"],
    ruta: "/usuarios",
    rutaTexto: "Ir a Usuarios",
    multiple: true,
  },
  {
    clave: "conexion_adicional",
    nombre: "Conexión adicional",
    precio: 10,
    unidad: "por conexión",
    icono: "bxs-plug",
    tono: "indigo",
    campo: "conexiones_adicionales",
    incluidos: (plan) => Number((plan?.n_conexiones ?? plan?.max_conexiones) || 0),
    nombreIncluidos: "conexiones",
    resumen: "Otro negocio o número de WhatsApp, Messenger, Instagram o TikTok dentro de la misma cuenta.",
    detalle: ["Su propio bot y tablero kanban", "Integraciones (Dropi, Shopify) independientes", "Los mismos usuarios pueden atenderla"],
    ruta: "/conexiones",
    rutaTexto: "Ir a Conexiones",
    multiple: true,
  },
  {
    clave: "imporkiller",
    nombre: "ImporKiller",
    precio: 10,
    unidad: "por cuenta",
    icono: "bx-radar",
    tono: "cyan",
    campo: "imporkiller",
    incluidos: () => 0,
    nombreIncluidos: null,
    resumen: "La extensión de Chrome que muestra las ventas estimadas debajo de cada producto de Dropi, y el descargador de anuncios de la Biblioteca de Meta.",
    detalle: [
      "Ventas estimadas (24 h, 7 d, 30 d y tendencia) dentro del catálogo de Dropi en EC, MX y CO",
      "Descarga masiva de creativos y envío de anuncios a ImporChat desde la Biblioteca de Meta",
      "Radar: qué anuncios tiene cada producto que más vende y qué tiendas pautan",
    ],
    ruta: "/imporkiller",
    rutaTexto: "Abrir ImporKiller",
    multiple: false,
    nota: "El buscador de productos y las métricas de ImporKiller van incluidos en tu plan; el complemento suma la extensión y los anuncios.",
  },
];

export const addonPorClave = (clave) => ADDONS.find((a) => a.clave === clave) || null;

export const idUsuarioActual = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const d = jwtDecode(token);
    return d.id_usuario || d.id_users || null;
  } catch {
    return null;
  }
};

/**
 * Compra un complemento. Devuelve el `data` del back:
 *   { success, actionRequired:false, en_trial?, ya_activo?, cantidad_total, message }
 *   { success, actionRequired:true, hosted_invoice_url }  → hay que ir a pagar (3DS)
 * Lanza Error con `code` = NO_SUBSCRIPTION cuando la cuenta no tiene
 * suscripción (hay que elegir plan primero) o con el mensaje del back.
 */
export async function comprarAddon(clave, cantidad = 1) {
  const id_usuario = idUsuarioActual();
  if (!id_usuario) {
    const e = new Error("Tu sesión venció. Vuelve a iniciar sesión.");
    e.code = "SESSION";
    throw e;
  }
  try {
    const res = await chatApi.post("/stripe_plan/comprarAddon", { id_usuario, clave, cantidad });
    const data = res?.data || {};
    if (!data.success) {
      const e = new Error(data.message || "No se pudo procesar el complemento.");
      e.code = data.code || null;
      throw e;
    }
    return data;
  } catch (err) {
    if (err?.code) throw err;
    const e = new Error(err?.response?.data?.message || err?.message || "No se pudo procesar el complemento.");
    e.code = err?.response?.data?.code || null;
    throw e;
  }
}

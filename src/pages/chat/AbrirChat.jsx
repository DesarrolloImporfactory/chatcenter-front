import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

/**
 * Enlace directo a un chat desde fuera de ImporChat:
 *   /abrir-chat/:linea/:chatId[?cot=<código de cotización>]
 *   /abrir-chat/:linea/:chatId[?motivo=<por qué se abre>]
 *
 * `/chat/:chatId` solo no alcanza para un enlace externo: el chat se abre en
 * la conexión que esté en `localStorage.id_configuracion`, y desde otro origen
 * (Imporsuit) no se puede escribir ahí. Esta ruta la fija y pasa al chat —lo
 * mismo que hace «Ir al chat» de Seguimiento IA, pero entrando por URL—.
 *
 * Los permisos no cambian: `Chat` valida que la conexión sea del usuario y que
 * el chat sea suyo. Con `?cot=` (se llega desde una cotización) y si el chat
 * lo atiende un compañero, `Chat` ofrece asignárselo en vez de solo avisar.
 *
 * Lo usa el botón «Ir al chat» de «Mis Cotizaciones» en Imporsuit
 * (`Cotizadorpro/chatCliente` arma la URL).
 *
 * `?motivo=` es lo mismo para cuando no se llega desde una cotización: lo
 * manda «Abrir chat» de los casos de «Mi turno» (portal del equipo), que
 * suelen ser chats de un front escalados a otra silla. El texto va al aviso
 * y al historial de la transferencia.
 */
export default function AbrirChat() {
  const { linea, chatId } = useParams();
  const [query] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!/^\d+$/.test(linea ?? "") || !/^\d+$/.test(chatId ?? "")) {
      navigate("/conexiones", { replace: true });
      return;
    }
    localStorage.setItem("id_configuracion", linea);
    const cot = (query.get("cot") || "").slice(0, 40);
    const motivo = (query.get("motivo") || "").trim().slice(0, 90);
    navigate(`/chat/${chatId}`, {
      replace: true,
      state: cot
        ? { desdeCotizacion: cot }
        : motivo
          ? { motivoImporsuit: motivo }
          : null,
    });
  }, [linea, chatId, query, navigate]);

  return null;
}

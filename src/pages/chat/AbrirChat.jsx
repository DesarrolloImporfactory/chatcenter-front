import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

/**
 * Enlace directo a un chat desde fuera de ImporChat:
 *   /abrir-chat/:linea/:chatId[?cot=<código de cotización>]
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
    navigate(`/chat/${chatId}`, {
      replace: true,
      state: cot ? { desdeCotizacion: cot } : null,
    });
  }, [linea, chatId, query, navigate]);

  return null;
}

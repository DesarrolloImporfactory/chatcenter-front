import { useEffect, useMemo, useState } from "react";
import {
  CARTERA_CONFIGS_HABILITADAS,
  getCatalogosVenta,
} from "../../services/imporsuit";

/**
 * Filtro de la lista de chats por PROGRAMA comprado.
 *
 * El filtrado es LOCAL: cada chat trae `productos_imporsuit` —los ids de
 * `productos_venta` separados por coma, denormalizados en
 * `clientes_chat_center`— así que no hay ninguna llamada a Imporsuit al
 * cambiar el filtro. Cruzar por correo contra la otra base en cada cambio
 * habría sido demasiado lento con miles de contactos.
 *
 * Lo único que se pide a Imporsuit es el CATÁLOGO (una vez por sesión), para
 * poner nombres en el select.
 *
 * Solo se marcan los clientes desde que existe el registro modo ventas: no
 * hubo backfill del histórico, así que un contacto viejo no aparece hasta que
 * recompre.
 */

let cacheProductos = null; // catálogo, se pide una vez por sesión

/** Ids de programa de un chat, como Set de números. */
export function productosDeChat(chat) {
  const raw = chat?.productos_imporsuit;
  if (!raw) return null;
  return new Set(
    String(raw)
      .split(",")
      .map((n) => Number(String(n).trim()))
      .filter(Boolean),
  );
}

/* eslint-disable react-hooks/set-state-in-effect */
export default function useFiltroProducto(idConfiguracion) {
  const habilitado = CARTERA_CONFIGS_HABILITADAS.includes(
    Number(idConfiguracion),
  );

  const [productos, setProductos] = useState(() => cacheProductos ?? []);
  const [productoSel, setProductoSel] = useState(null);

  // Catálogo: una sola vez por sesión y solo donde la cartera está habilitada.
  useEffect(() => {
    if (!habilitado || cacheProductos) return undefined;
    let alive = true;

    getCatalogosVenta()
      .then((data) => {
        cacheProductos = data.productos ?? [];
        if (alive) setProductos(cacheProductos);
      })
      .catch(() => {
        // Silencioso: sin catálogo simplemente no se ofrece el filtro.
        cacheProductos = [];
      });

    return () => {
      alive = false;
    };
  }, [habilitado]);

  const filtrarChats = useMemo(() => {
    const id = Number(productoSel?.value ?? 0);
    if (!habilitado || id <= 0) return (chats) => chats;

    return (chats) =>
      (Array.isArray(chats) ? chats : []).filter((c) => {
        const ids = productosDeChat(c);
        return ids ? ids.has(id) : false;
      });
  }, [habilitado, productoSel]);

  return {
    habilitado: habilitado && productos.length > 0,
    productos,
    productoSel,
    setProductoSel,
    cargando: false,
    filtrarChats,
  };
}
/* eslint-enable react-hooks/set-state-in-effect */

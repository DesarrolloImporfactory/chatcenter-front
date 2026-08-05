import { useEffect, useState } from "react";
import { getCatalogosVenta } from "../../services/imporsuit";

/**
 * Catálogo de programas de Imporsuit (`productos_venta`), para traducir a
 * nombre los ids que vienen en `clientes_chat_center.productos_imporsuit`.
 *
 * Se pide UNA vez por sesión y se cachea a nivel de módulo: lo consumen la
 * tabla de Contactos y el filtro del sidebar, y ninguno debería disparar una
 * petición por render.
 *
 * Falla en silencio a lista vacía: sin catálogo, la columna muestra los chips
 * con el id crudo en vez de romperse.
 */

let cache = null;
let enVuelo = null;

/* eslint-disable react-hooks/set-state-in-effect */
export default function useCatalogoProductos(habilitado = true) {
  const [productos, setProductos] = useState(() => cache ?? []);

  useEffect(() => {
    if (!habilitado || cache) return undefined;
    let alive = true;

    // Dedup: si dos componentes montan a la vez, comparten la misma promesa.
    enVuelo =
      enVuelo ||
      getCatalogosVenta()
        .then((data) => {
          cache = data.productos ?? [];
          return cache;
        })
        .catch(() => {
          cache = [];
          return cache;
        })
        .finally(() => {
          enVuelo = null;
        });

    enVuelo.then((lista) => alive && setProductos(lista));

    return () => {
      alive = false;
    };
  }, [habilitado]);

  return productos;
}
/* eslint-enable react-hooks/set-state-in-effect */

/**
 * Nombres de los programas de un contacto.
 *
 * Prefiere `productos_imporsuit_txt` (los nombres, que el back ya trae) y solo
 * traduce los ids con el catálogo si esa columna no vino — así la tabla pinta
 * bien incluso antes de que el catálogo termine de cargar.
 *
 * @param {string|null} raw   ids: "1,2,7"
 * @param {{id:number, nombre:string}[]} catalogo
 * @param {string|null} texto nombres: "Club de Importadores · Kit"
 * @returns {{id:number|string, nombre:string}[]}
 */
export function programasDeContacto(raw, catalogo, texto = null) {
  if (texto) {
    return String(texto)
      .split("·")
      .map((n) => n.trim())
      .filter(Boolean)
      .map((nombre, i) => ({ id: nombre || i, nombre }));
  }

  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((n) => Number(String(n).trim()))
    .filter(Boolean)
    .map((id) => {
      const p = catalogo.find((x) => x.id === id);
      // Sin catálogo (o producto borrado) se muestra el id: es preferible a
      // ocultar que el contacto tiene algo comprado.
      return { id, nombre: p?.nombre ?? `#${id}` };
    });
}

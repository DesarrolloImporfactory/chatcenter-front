import { useCallback, useRef, useState } from "react";

/**
 * Mide el ancho REAL de un elemento y dice cuántos cortes supera.
 *
 * Existe porque los breakpoints de Tailwind (sm:, lg:) miran el ancho de la
 * ventana, no el del componente: la cabecera del chat ocupa 3/4 de la pantalla
 * con el panel del cliente cerrado y 2/4 con el panel abierto, y la ventana es
 * la misma en los dos casos. Con zoom pasa igual. Decidir por la ventana hacía
 * que el contenido no cupiera y se partiera en varias líneas.
 *
 * Devuelve [ref, escalon]: `ref` va en el elemento a medir y `escalon` es la
 * cantidad de cortes que su ancho alcanza (0 = más angosto que el primero).
 * Solo re-renderiza cuando se cruza un corte, no en cada píxel.
 *
 * `cortes` debe ser un arreglo estable (constante de módulo), ascendente.
 */
export default function useEscalonAncho(cortes) {
  const [escalon, setEscalon] = useState(0);
  const observadorRef = useRef(null);

  const ref = useCallback(
    (el) => {
      observadorRef.current?.disconnect();
      observadorRef.current = null;
      if (!el) return;

      const medir = (ancho) =>
        setEscalon(cortes.filter((corte) => ancho >= corte).length);

      medir(el.getBoundingClientRect().width);
      if (typeof ResizeObserver === "undefined") return;
      const observador = new ResizeObserver(([entrada]) =>
        medir(entrada.contentRect.width),
      );
      observador.observe(el);
      observadorRef.current = observador;
    },
    [cortes],
  );

  return [ref, escalon];
}

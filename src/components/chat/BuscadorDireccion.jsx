import React, { useCallback, useRef, useState } from "react";

/**
 * Buscador de direcciones para el mapa de pedidos de Aliclik.
 *
 * Usa Nominatim (el geocodificador de OpenStreetMap): gratis, sin API key y
 * con CORS abierto, así que se llama DIRECTO desde el navegador. Se hace así a
 * propósito y no por el backend: el límite de peticiones de Nominatim se
 * aplica por IP, y proxeándolo lo concentraríamos en la del servidor — un solo
 * bloqueo dejaría sin buscador a todas las cuentas a la vez.
 *
 * ── Lo que este componente NO hace, y es lo importante ──────────────────────
 * No define la coordenada de entrega: solo propone puntos para mover el mapa.
 * Nominatim resuelve la CALLE mucho mejor que el NÚMERO, y en Perú eso duele:
 *
 *   "Av. Arequipa 1234, Lince"     → 3 puntos sobre la misma avenida, a 600 m
 *   "Calle Los Girasoles 245, SJL" → 2 calles homónimas en barrios distintos,
 *                                     a 5 km una de otra
 *
 * Si se aplicara el primer resultado como destino, el pedido saldría a otro
 * distrito y Aliclik lo cotizaría y despacharía sin chistar. Por eso se muestra
 * la lista completa para que el asesor elija, y el punto que queda se marca
 * como "aproximada" hasta que lo ajuste en el mapa.
 */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

// Política de uso de Nominatim: máximo 1 petición por segundo. Se busca solo
// al enviar (nunca por cada tecla) y además se espacia acá.
const MIN_MS_ENTRE_BUSQUEDAS = 1100;

export default function BuscadorDireccion({ defaultQuery = "", onSelect }) {
  const [q, setQ] = useState(defaultQuery || "");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resultados, setResultados] = useState(null); // null = aún no se buscó
  const ultimaBusquedaRef = useRef(0);

  const buscar = useCallback(
    async (e) => {
      e?.preventDefault?.();

      const texto = String(q || "").trim();
      if (texto.length < 3) {
        setError("Escribe al menos 3 caracteres.");
        return;
      }

      const ahora = Date.now();
      if (ahora - ultimaBusquedaRef.current < MIN_MS_ENTRE_BUSQUEDAS) return;
      ultimaBusquedaRef.current = ahora;

      setCargando(true);
      setError(null);

      try {
        // countrycodes=pe: Aliclik solo entrega en Perú, así que traer
        // resultados de otros países solo agrega ruido y errores.
        const url =
          `${NOMINATIM}?format=json&addressdetails=0&limit=5&countrycodes=pe` +
          `&q=${encodeURIComponent(texto)}`;

        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        setResultados(Array.isArray(data) ? data : []);
      } catch (_) {
        // Nominatim es un servicio comunitario: puede limitar o caerse. No es
        // un error del pedido — el mapa sigue sirviendo a mano.
        setError(
          "El buscador de direcciones no respondió. Marca el punto en el mapa.",
        );
        setResultados(null);
      } finally {
        setCargando(false);
      }
    },
    [q],
  );

  const elegir = (r) => {
    const lat = Number(r?.lat);
    const lng = Number(r?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    onSelect?.(lat, lng, r?.display_name || "");
    setResultados(null);
  };

  return (
    <div className="space-y-1.5">
      <form onSubmit={buscar} className="flex gap-1.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar dirección o referencia…"
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-[7px] px-3 py-2 text-[12px] text-white outline-none transition-all focus:border-cyan-400/50 focus:bg-white/[0.06] hover:border-white/15 placeholder:text-white/[0.18]"
        />
        <button
          type="submit"
          disabled={cargando}
          className="px-3 py-2 rounded-[7px] bg-cyan-500/[0.12] hover:bg-cyan-500/[0.22] border border-cyan-400/[0.18] text-[10px] font-semibold text-cyan-300 shrink-0 transition-colors disabled:opacity-40"
        >
          <i
            className={`bx ${cargando ? "bx-loader-alt bx-spin" : "bx-search"} text-sm`}
          />
        </button>
      </form>

      {error && (
        <p className="text-[9px] text-amber-300/70 flex items-start gap-1">
          <i className="bx bx-info-circle text-[11px] mt-px shrink-0" />
          {error}
        </p>
      )}

      {resultados?.length === 0 && !error && (
        <p className="text-[9px] text-white/30">
          Sin resultados. Prueba con la calle y el distrito, sin el número.
        </p>
      )}

      {resultados?.length > 0 && (
        <>
          <div className="max-h-32 overflow-y-auto space-y-1 pr-0.5">
            {resultados.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => elegir(r)}
                className="w-full text-left rounded-[7px] border border-white/[0.06] bg-white/[0.02] hover:border-cyan-400/30 hover:bg-cyan-400/[0.05] px-2 py-1.5 transition-colors"
              >
                <p className="text-[10px] text-white/75 leading-snug">
                  {r.display_name}
                </p>
              </button>
            ))}
          </div>
          {/* Se dice explícitamente por qué hay que revisar: es la diferencia
              entre acertar la cuadra y acertar la puerta. */}
          <p className="text-[9px] text-white/25 leading-relaxed">
            El buscador ubica la calle, no siempre el número. Ajusta el marcador
            en el mapa antes de crear el pedido.
          </p>
        </>
      )}
    </div>
  );
}

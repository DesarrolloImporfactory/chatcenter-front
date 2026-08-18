import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Mapa para fijar el punto de entrega de un pedido de Aliclik.
 *
 * Se usa Leaflet "pelado" y no react-leaflet a propósito: la única interacción
 * es un click que devuelve lat/lng, y así se evita una segunda dependencia y
 * los problemas de versión de react-leaflet con React 18.
 *
 * El marcador es un divIcon (HTML inline) en vez del icono por defecto de
 * Leaflet: el default apunta a PNGs por URL relativa y se rompe con el
 * bundling de Vite, que es el clásico "marcador invisible".
 */

// Lima. Solo es el encuadre inicial cuando todavía no hay coordenadas; nunca
// se manda como ubicación del pedido.
const CENTRO_PERU = [-12.04318, -77.02824];

const marcadorIcon = L.divIcon({
  className: "",
  html: `<div style="
      width:22px;height:22px;border-radius:50% 50% 50% 0;
      background:#22d3ee;border:2px solid #0e7490;
      transform:rotate(-45deg);
      box-shadow:0 2px 6px rgba(0,0,0,.45);
    "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

export default function UbicacionPicker({ lat, lng, onChange, height = 180 }) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  // El handler se guarda en un ref para poder registrar el listener del mapa
  // UNA sola vez: si dependiera de onChange, cada render recrearía el mapa.
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // ── Crear el mapa una sola vez ──
  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return;

    const map = L.map(nodeRef.current, {
      center: lat && lng ? [Number(lat), Number(lng)] : CENTRO_PERU,
      zoom: lat && lng ? 16 : 11,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e) => {
      const { lat: la, lng: ln } = e.latlng;
      onChangeRef.current?.(Number(la.toFixed(6)), Number(ln.toFixed(6)));
    });

    mapRef.current = map;

    // El panel que contiene el mapa se despliega con una animación de altura,
    // así que al montar el contenedor puede medir 0px y Leaflet dibuja los
    // tiles en gris. invalidateSize después del despliegue lo corrige.
    const t = setTimeout(() => map.invalidateSize(), 320);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // ── Reflejar las coordenadas actuales ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const hayCoords = lat !== null && lat !== undefined && lng !== null && lng !== undefined;

    if (!hayCoords) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const pos = [Number(lat), Number(lng)];

    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      markerRef.current = L.marker(pos, {
        icon: marcadorIcon,
        draggable: true,
      }).addTo(map);

      markerRef.current.on("dragend", (e) => {
        const { lat: la, lng: ln } = e.target.getLatLng();
        onChangeRef.current?.(Number(la.toFixed(6)), Number(ln.toFixed(6)));
      });
    }

    // setView y no flyTo: dentro de un panel angosto la animación se ve como
    // un salto y confunde más de lo que ayuda.
    map.setView(pos, Math.max(map.getZoom(), 16));
    map.invalidateSize();
  }, [lat, lng]);

  return (
    <div className="rounded-lg overflow-hidden border border-white/10">
      <div ref={nodeRef} style={{ height, width: "100%" }} />
      <div className="px-2 py-1 bg-white/5 text-[9px] text-white/50">
        Toca el mapa o arrastra el marcador para ajustar el punto de entrega.
      </div>
    </div>
  );
}

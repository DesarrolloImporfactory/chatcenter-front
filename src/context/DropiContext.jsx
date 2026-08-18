import React, { createContext, useContext } from "react";

/**
 * Contexto de proveedores de fulfillment.
 *
 * Nació solo para Dropi (de ahí el nombre, que se conserva para no tocar los
 * ~10 puntos que ya lo consumen) y ahora también resuelve Aliclik, el
 * equivalente para Perú. Lo que decide es qué panel de pedidos ve el asesor en
 * el chat:
 *   · uno solo vinculado  → ese panel, sin preguntar nada;
 *   · los dos vinculados  → el panel muestra un selector Dropi | Aliclik;
 *   · ninguno             → panel básico de cliente.
 */
export const DropiContext = createContext({
  isDropiLinked: null,
  isAliclikLinked: null,
  // Solo las plataformas realmente vinculadas: [{ key, label }]
  plataformas: [],
  // true cuando hay más de una y hay que dejar elegir
  multiplesPlataformas: false,
  loadingDropiLinked: false,
  refreshDropiLinked: async () => {},
});

export const useDropi = () => useContext(DropiContext);

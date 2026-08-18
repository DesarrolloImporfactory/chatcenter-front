import React, { useCallback, useEffect, useMemo, useState } from "react";
import chatApi from "../api/chatcenter";
import { DropiContext } from "./DropiContext";

/**
 * Resuelve qué proveedores de fulfillment tiene vinculados la configuración
 * actual: Dropi (multipaís) y/o Aliclik (Perú).
 *
 * Se consultan los dos en paralelo y de forma independiente: que Aliclik falle
 * o no exista no puede dejar sin panel a una cuenta que sí tiene Dropi, que es
 * el caso de casi todos los clientes de hoy.
 */
export default function DropiProvider({ children }) {
  const [id_configuracion, setId_configuracion] = useState(null);

  // null = aún no se sabe (evita parpadeos)
  const [isDropiLinked, setIsDropiLinked] = useState(null);
  const [isAliclikLinked, setIsAliclikLinked] = useState(null);
  const [loadingDropiLinked, setLoadingDropiLinked] = useState(false);

  const readIdc = () => {
    const raw = localStorage.getItem("id_configuracion");
    const n = raw ? Number(raw) : null;
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  // 1) leer id_configuracion al montar
  useEffect(() => {
    setId_configuracion(readIdc());
  }, []);

  // 2) función para consultar al backend (SIEMPRE por idc actual)
  const refreshDropiLinked = useCallback(async () => {
    const idc = readIdc();

    // si cambió, sincronice estado y "resetea" para no heredar
    setId_configuracion((prev) => (prev !== idc ? idc : prev));

    if (!idc) {
      setIsDropiLinked(false);
      setIsAliclikLinked(false);
      setLoadingDropiLinked(false);
      return;
    }

    setLoadingDropiLinked(true);
    // <-- clave: evita que se quede "true" de otra config
    setIsDropiLinked(null);
    setIsAliclikLinked(null);

    // allSettled y no all: si la llamada de Aliclik falla (cuenta sin la tabla,
    // 403, red), Dropi tiene que resolverse igual.
    const [dropi, aliclik] = await Promise.allSettled([
      chatApi.get("dropi_integrations", { params: { id_configuracion: idc } }),
      chatApi.get("aliclik_integrations", {
        params: { id_configuracion: idc },
        silentError: true,
      }),
    ]);

    // Ante error NO conviene conservar true: podría ser de otra configuración.
    setIsDropiLinked(
      dropi.status === "fulfilled"
        ? (dropi.value?.data?.data ?? []).length > 0
        : false,
    );
    setIsAliclikLinked(
      aliclik.status === "fulfilled"
        ? (aliclik.value?.data?.data ?? []).length > 0
        : false,
    );

    setLoadingDropiLinked(false);
  }, []);

  // 3) bootstrap cuando haya id_configuracion
  useEffect(() => {
    refreshDropiLinked();
  }, [id_configuracion, refreshDropiLinked]);

  // 4) eventos: linked-changed y config-changed
  useEffect(() => {
    const handler = () => refreshDropiLinked();

    window.addEventListener("dropi:linked-changed", handler);
    window.addEventListener("dropi:config-changed", handler);
    // La pantalla de Aliclik emite el suyo al vincular/desvincular.
    window.addEventListener("aliclik:linked-changed", handler);

    return () => {
      window.removeEventListener("dropi:linked-changed", handler);
      window.removeEventListener("dropi:config-changed", handler);
      window.removeEventListener("aliclik:linked-changed", handler);
    };
  }, [refreshDropiLinked]);

  const plataformas = useMemo(() => {
    const out = [];
    if (isDropiLinked) out.push({ key: "dropi", label: "Dropi" });
    if (isAliclikLinked) out.push({ key: "aliclik", label: "Aliclik" });
    return out;
  }, [isDropiLinked, isAliclikLinked]);

  const value = useMemo(
    () => ({
      isDropiLinked,
      isAliclikLinked,
      plataformas,
      multiplesPlataformas: plataformas.length > 1,
      loadingDropiLinked,
      refreshDropiLinked,
    }),
    [
      isDropiLinked,
      isAliclikLinked,
      plataformas,
      loadingDropiLinked,
      refreshDropiLinked,
    ],
  );

  return (
    <DropiContext.Provider value={value}>{children}</DropiContext.Provider>
  );
}

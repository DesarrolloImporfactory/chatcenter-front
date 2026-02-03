import React, { useCallback, useEffect, useMemo, useState } from "react";
import chatApi from "../api/chatcenter";
import { DropiContext } from "./DropiContext";

export default function DropiProvider({ children }) {
  const [id_configuracion, setId_configuracion] = useState(null);

  // null = aún no se sabe (evita parpadeos)
  const [isDropiLinked, setIsDropiLinked] = useState(null);
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
      setLoadingDropiLinked(false);
      return;
    }

    setLoadingDropiLinked(true);
    setIsDropiLinked(null); // <-- clave: evita que se quede "true" de otra config

    try {
      const res = await chatApi.get("dropi_integrations", {
        params: { id_configuracion: idc },
      });

      const list = res?.data?.data ?? [];
      setIsDropiLinked(list.length > 0);
    } catch (e) {
      // aquí NO conviene conservar true porque puede ser de otra config
      setIsDropiLinked(false);
    } finally {
      setLoadingDropiLinked(false);
    }
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

    return () => {
      window.removeEventListener("dropi:linked-changed", handler);
      window.removeEventListener("dropi:config-changed", handler);
    };
  }, [refreshDropiLinked]);

  const value = useMemo(
    () => ({
      isDropiLinked,
      loadingDropiLinked,
      refreshDropiLinked,
    }),
    [isDropiLinked, loadingDropiLinked, refreshDropiLinked],
  );

  return (
    <DropiContext.Provider value={value}>{children}</DropiContext.Provider>
  );
}

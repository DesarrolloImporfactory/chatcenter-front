/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CONEXIONES — Hook useConexiones                  ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extrae la lógica de carga/gestión de conexiones que      ║
 * ║  estaba inline en Conexiones.jsx y Conexionespruebas.jsx  ║
 * ║  (~300 líneas de useEffect + estado en cada archivo)      ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useRef } from "react";
import conexionesService from "../services/conexionesService";
import { Toast } from "../../../shared/ui/Toast";

export function useConexiones() {
  const [conexiones, setConexiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  /* ─────── Cargar lista ─────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await conexionesService.fetchAll();
      if (mountedRef.current) {
        setConexiones(
          Array.isArray(data.data || data) ? (data.data || data) : []
        );
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─────── Crear ─────── */
  const create = useCallback(async (payload) => {
    const data = await conexionesService.create(payload);
    Toast.fire({ icon: "success", title: "Conexión creada" });
    await fetchAll(); // Refrescar lista
    return data;
  }, [fetchAll]);

  /* ─────── Actualizar ─────── */
  const update = useCallback(async (id, payload) => {
    const data = await conexionesService.update(id, payload);
    Toast.fire({ icon: "success", title: "Conexión actualizada" });
    await fetchAll();
    return data;
  }, [fetchAll]);

  /* ─────── Eliminar ─────── */
  const remove = useCallback(async (id) => {
    await conexionesService.delete(id);
    Toast.fire({ icon: "success", title: "Conexión eliminada" });
    setConexiones((prev) => prev.filter((c) => (c.id || c.id_configuracion) !== id));
  }, []);

  return {
    conexiones,
    loading,
    error,
    fetchAll,
    create,
    update,
    remove,
  };
}

export default useConexiones;

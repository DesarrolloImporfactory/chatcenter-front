/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE PLANTILLAS — Hook usePlantillas                  ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extrae lógica de CRUD de plantillas que estaba inline en ║
 * ║  CrearPlantillaModal.jsx y CrearConfiguracionModal.jsx    ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useRef } from "react";
import plantillasService from "../services/plantillasService";
import { Toast, confirm } from "../../../shared/ui/Toast";

export function usePlantillas(configId) {
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await plantillasService.fetchAll(configId);
      if (mountedRef.current) {
        setPlantillas(Array.isArray(data.data || data) ? (data.data || data) : []);
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [configId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = useCallback(async (payload) => {
    const data = await plantillasService.create(payload);
    Toast.fire({ icon: "success", title: "Plantilla creada" });
    await fetchAll();
    return data;
  }, [fetchAll]);

  const update = useCallback(async (id, payload) => {
    const data = await plantillasService.update(id, payload);
    Toast.fire({ icon: "success", title: "Plantilla actualizada" });
    await fetchAll();
    return data;
  }, [fetchAll]);

  const remove = useCallback(async (id, nombre) => {
    const { isConfirmed } = await confirm(
      "¿Eliminar plantilla?",
      `Se eliminará "${nombre || "esta plantilla"}" permanentemente.`
    );
    if (!isConfirmed) return false;
    await plantillasService.delete(id);
    Toast.fire({ icon: "success", title: "Plantilla eliminada" });
    setPlantillas((prev) => prev.filter((p) => p.id !== id));
    return true;
  }, []);

  const search = useCallback(async (query) => {
    const data = await plantillasService.search(query, configId);
    return Array.isArray(data.data || data) ? (data.data || data) : [];
  }, [configId]);

  return { plantillas, loading, error, fetchAll, create, update, remove, search };
}

export default usePlantillas;

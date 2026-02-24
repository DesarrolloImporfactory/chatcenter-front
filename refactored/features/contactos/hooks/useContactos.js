/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CONTACTOS — Hook useContactos                    ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extrae lógica de carga y gestión de contactos que estaba ║
 * ║  inline en +4 páginas de contactos y Kanban.              ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useRef } from "react";
import contactosService from "../services/contactosService";
import { Toast } from "../../../shared/ui/Toast";

export function useContactos({ initialEstado = "", pageSize = 50 } = {}) {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState(initialEstado);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetchAll = useCallback(async (pg = page) => {
    setLoading(true);
    setError(null);
    try {
      const result = await contactosService.fetchAll({
        page: pg,
        limit: pageSize,
        search,
        estado,
      });
      if (mountedRef.current) {
        setContactos(result.contactos);
        setTotal(result.total);
        setPage(pg);
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [page, pageSize, search, estado]);

  useEffect(() => { fetchAll(1); }, [search, estado]); // Reset a página 1 al filtrar

  const updateEstado = useCallback(async (id, nuevoEstado) => {
    await contactosService.updateEstado(id, nuevoEstado);
    Toast.fire({ icon: "success", title: "Estado actualizado" });
    setContactos((prev) =>
      prev.map((c) =>
        (c.id_cliente_chat_center || c.id) === id
          ? { ...c, estado_cliente: nuevoEstado }
          : c
      )
    );
  }, []);

  const assignTag = useCallback(async (clientId, tagId) => {
    await contactosService.assignTag(clientId, tagId);
    Toast.fire({ icon: "success", title: "Etiqueta asignada" });
  }, []);

  return {
    contactos,
    loading,
    error,
    search,
    setSearch,
    estado,
    setEstado,
    page,
    total,
    totalPages: Math.ceil(total / pageSize),
    goToPage: fetchAll,
    updateEstado,
    assignTag,
    refresh: () => fetchAll(page),
  };
}

export default useContactos;

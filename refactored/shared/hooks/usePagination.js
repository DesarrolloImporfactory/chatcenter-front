/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  CAPA SHARED — Hook usePagination                         ║
 * ║                                                           ║
 * ║  Lógica genérica de paginación para listas.               ║
 * ║  Reutilizable en chat, contactos, plantillas, etc.        ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import { useState, useMemo, useCallback } from "react";

/**
 * @param {object} options
 * @param {number} options.initialPage - Página inicial (default: 1)
 * @param {number} options.pageSize    - Elementos por página (default: 20)
 * @param {number} options.total       - Total de elementos
 */
export function usePagination({ initialPage = 1, pageSize = 20, total = 0 } = {}) {
  const [page, setPage] = useState(initialPage);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const next = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prev = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const goTo = useCallback(
    (n) => setPage(Math.max(1, Math.min(n, totalPages))),
    [totalPages]
  );

  const reset = useCallback(() => setPage(initialPage), [initialPage]);

  return { page, totalPages, hasNext, hasPrev, next, prev, goTo, reset };
}

export default usePagination;

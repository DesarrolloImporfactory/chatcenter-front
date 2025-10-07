import { useRef, useCallback } from "react";

/**
 * Hook para cache inteligente con TTL y invalidación
 */
export const useOptimizedCache = (defaultTTL = 5 * 60 * 1000) => {
  const cacheRef = useRef(new Map());
  const ttlRef = useRef(new Map());

  // Obtener del cache
  const get = useCallback((key) => {
    const ttl = ttlRef.current.get(key);

    // Verificar si el cache ha expirado
    if (ttl && Date.now() > ttl) {
      cacheRef.current.delete(key);
      ttlRef.current.delete(key);
      return null;
    }

    return cacheRef.current.get(key) || null;
  }, []);

  // Establecer en cache
  const set = useCallback(
    (key, value, customTTL = null) => {
      const ttl = customTTL || defaultTTL;

      cacheRef.current.set(key, value);
      ttlRef.current.set(key, Date.now() + ttl);
    },
    [defaultTTL]
  );

  // Verificar si existe en cache y no ha expirado
  const has = useCallback((key) => {
    const ttl = ttlRef.current.get(key);

    if (ttl && Date.now() > ttl) {
      cacheRef.current.delete(key);
      ttlRef.current.delete(key);
      return false;
    }

    return cacheRef.current.has(key);
  }, []);

  // Eliminar del cache
  const del = useCallback((key) => {
    cacheRef.current.delete(key);
    ttlRef.current.delete(key);
  }, []);

  // Limpiar cache por patrón
  const invalidate = useCallback((pattern = null) => {
    if (!pattern) {
      cacheRef.current.clear();
      ttlRef.current.clear();
      return;
    }

    // Si es string, buscar por prefijo
    if (typeof pattern === "string") {
      for (const key of cacheRef.current.keys()) {
        if (key.startsWith(pattern)) {
          cacheRef.current.delete(key);
          ttlRef.current.delete(key);
        }
      }
      return;
    }

    // Si es función, usar como filtro
    if (typeof pattern === "function") {
      for (const key of cacheRef.current.keys()) {
        if (pattern(key)) {
          cacheRef.current.delete(key);
          ttlRef.current.delete(key);
        }
      }
      return;
    }

    // Si es RegExp, usar para match
    if (pattern instanceof RegExp) {
      for (const key of cacheRef.current.keys()) {
        if (pattern.test(key)) {
          cacheRef.current.delete(key);
          ttlRef.current.delete(key);
        }
      }
    }
  }, []);

  // Obtener o establecer (cache-aside pattern)
  const getOrSet = useCallback(
    async (key, fetcher, customTTL = null) => {
      // Intentar obtener del cache primero
      const cached = get(key);
      if (cached !== null) {
        return cached;
      }

      try {
        // Si no está en cache, obtener de la fuente
        const value = await fetcher();

        // Guardar en cache
        set(key, value, customTTL);

        return value;
      } catch (error) {
        console.error(`Error fetching data for key ${key}:`, error);
        throw error;
      }
    },
    [get, set]
  );

  // Estadísticas del cache
  const getStats = useCallback(() => {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [key, ttl] of ttlRef.current.entries()) {
      if (now > ttl) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: cacheRef.current.size,
      active,
      expired,
      hitRate: 0, // Se podría implementar con contadores
    };
  }, []);

  // Limpiar cache expirado manualmente
  const cleanup = useCallback(() => {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, ttl] of ttlRef.current.entries()) {
      if (now > ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      cacheRef.current.delete(key);
      ttlRef.current.delete(key);
    }

    return expiredKeys.length;
  }, []);

  // Actualizar valor existente sin cambiar TTL
  const update = useCallback(
    (key, updater) => {
      const cached = get(key);
      if (cached !== null) {
        const updated =
          typeof updater === "function" ? updater(cached) : updater;
        const currentTTL = ttlRef.current.get(key);
        const remainingTTL = currentTTL - Date.now();

        if (remainingTTL > 0) {
          set(key, updated, remainingTTL);
        }
      }
    },
    [get, set]
  );

  return {
    get,
    set,
    has,
    del,
    invalidate,
    getOrSet,
    getStats,
    cleanup,
    update,
    clear: () => invalidate(),
  };
};

export default useOptimizedCache;

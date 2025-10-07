import { useCallback, useRef, useState } from "react";

/**
 * Hook para manejar selección de elementos con prevención de clicks múltiples
 * y feedback visual instantáneo
 */
export const useInstantSelection = (onSelect, options = {}) => {
  const {
    debounceTime = 100,
    enableOptimisticUpdates = true,
    enableClickPrevention = true,
  } = options;

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const selectingRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const timeoutRef = useRef(null);

  const select = useCallback(
    async (item) => {
      if (!item) return;

      const now = Date.now();

      // Prevenir clicks muy rápidos si está habilitado
      if (
        enableClickPrevention &&
        now - lastClickTimeRef.current < debounceTime
      ) {
        return;
      }

      // Prevenir selecciones simultáneas
      if (selectingRef.current) {
        return;
      }

      // Si ya está seleccionado, no hacer nada
      if (selectedId === item.id) {
        return;
      }

      lastClickTimeRef.current = now;
      selectingRef.current = true;
      setIsSelecting(true);

      try {
        // Actualización optimista si está habilitada
        if (enableOptimisticUpdates) {
          setSelectedId(item.id);
        }

        // Ejecutar la función de selección
        await onSelect(item);

        // Si no hay actualización optimista, actualizar ahora
        if (!enableOptimisticUpdates) {
          setSelectedId(item.id);
        }
      } catch (error) {
        console.error("Error en selección:", error);

        // Revertir actualización optimista si falló
        if (enableOptimisticUpdates) {
          setSelectedId(null);
        }

        throw error;
      } finally {
        selectingRef.current = false;
        setIsSelecting(false);
      }
    },
    [
      onSelect,
      debounceTime,
      enableClickPrevention,
      enableOptimisticUpdates,
      selectedId,
    ]
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    selectingRef.current = false;
    setIsSelecting(false);
  }, []);

  const isSelected = useCallback(
    (itemId) => {
      return selectedId === itemId;
    },
    [selectedId]
  );

  return {
    select,
    clearSelection,
    isSelected,
    isSelecting,
    selectedId,
  };
};

export default useInstantSelection;

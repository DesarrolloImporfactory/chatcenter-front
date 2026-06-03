import { useCallback, useEffect, useRef, useState } from "react";
import {
  buscarPorCorreo,
  getDeudasUsuario,
  generarCartera,
  eliminarDeuda,
} from "../../services/imporsuit";

/** Una cartera existe si id_cartera es un uuid (no 0 / "0" / vacío). */
export function tieneCartera(cliente) {
  const c = cliente?.id_cartera;
  return Boolean(c) && c !== 0 && c !== "0";
}

/**
 * Orquesta la mini-vista de cartera para un cliente identificado por correo:
 * buscar -> (no existe → crear) -> ver/crear cartera -> deudas/pagos.
 *
 * Estado expuesto:
 *   correo, cliente (null si no existe), existe (bool|null), deudas, busy, error
 */
export function useCarteraCliente(correoInicial = "") {
  const [correo, setCorreo] = useState(correoInicial);
  const [cliente, setCliente] = useState(null);
  const [existe, setExiste] = useState(null); // null = aún no se buscó
  const [deudas, setDeudas] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [cargandoDeudas, setCargandoDeudas] = useState(false);
  const [error, setError] = useState(null);

  // Evita setState tras desmontar.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const safeSet = (fn) => () => {
    if (mounted.current) fn();
  };

  const cargarDeudas = useCallback(async (idCarteraUuid) => {
    if (!idCarteraUuid || idCarteraUuid === 0 || idCarteraUuid === "0") {
      setDeudas([]);
      return [];
    }
    setCargandoDeudas(true);
    try {
      const rows = await getDeudasUsuario(idCarteraUuid);
      const lista = Array.isArray(rows) ? rows : [];
      if (mounted.current) setDeudas(lista);
      return lista;
    } finally {
      if (mounted.current) setCargandoDeudas(false);
    }
  }, []);

  const buscar = useCallback(
    async (correoArg) => {
      const email = String(correoArg ?? correo ?? "").trim();
      if (!email) return;
      setBuscando(true);
      setError(null);
      try {
        const res = await buscarPorCorreo(email);
        if (!mounted.current) return;
        setExiste(res.exists);
        setCliente(res.exists ? res.data : null);
        setDeudas([]);
        if (res.exists && tieneCartera(res.data)) {
          await cargarDeudas(res.data.id_cartera);
        }
      } catch (err) {
        if (mounted.current) {
          setError(err);
          setExiste(null);
          setCliente(null);
        }
      } finally {
        if (mounted.current) setBuscando(false);
      }
    },
    [correo, cargarDeudas],
  );

  /** Re-consulta el cliente actual por su correo (refresca cartera + flags). */
  const recargar = useCallback(async () => {
    const email = cliente?.email_users || correo;
    if (email) await buscar(email);
  }, [cliente, correo, buscar]);

  /** Crea la cartera si el cliente no la tiene; luego recarga. */
  const asegurarCartera = useCallback(async () => {
    if (!cliente?.id_users) return;
    if (tieneCartera(cliente)) return;
    await generarCartera(cliente.id_users);
    await recargar();
  }, [cliente, recargar]);

  const eliminarDeudaById = useCallback(
    async (idCpp) => {
      await eliminarDeuda(idCpp);
      if (cliente && tieneCartera(cliente)) {
        await cargarDeudas(cliente.id_cartera);
      }
    },
    [cliente, cargarDeudas],
  );

  return {
    correo,
    setCorreo,
    cliente,
    existe,
    deudas,
    buscando,
    cargandoDeudas,
    error,
    buscar,
    recargar,
    asegurarCartera,
    eliminarDeudaById,
    _safeSet: safeSet, // por si el consumidor quiere desmontar limpio
    _mountedRef: mounted,
  };
}

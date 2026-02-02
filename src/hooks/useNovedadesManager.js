import { useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";

/**
 * Hook que encapsula TODA la lógica de Novedades (modal, selección, acciones, envíos por transportadora)
 */
export default function useNovedadesManager({
  id_usuario_conf,
  id_plataforma_conf,
  recargarDatosFactura,
}) {
  const [showModalNovedad, setShowModalNovedad] = useState(false);
  const [novedadSeleccionada, setNovedadSeleccionada] = useState(null);

  // tipo_novedad: "gestionada" | "no_gestionada"
  const [tipo_novedad, setTipo_novedad] = useState(null);

  // Acciones internas del modal: null | "ofrecer"
  const [accion, setAccion] = useState(null);

  const [datosNovedadExtra, setDatosNovedadExtra] = useState(null);

  // ---------- LAAR ----------
  const [tipoLaar, setTipoLaar] = useState("");
  const [observacionLaar, setObservacionLaar] = useState("");
  const [solucionLaar, setSolucionLaar] = useState("");
  const [enviando, setEnviando] = useState(false);

  // ---------- GINTRACOM ----------
  const [tipoGintra, setTipoGintra] = useState("");
  const [solucionGintra, setSolucionGintra] = useState("");
  const [fechaGintra, setFechaGintra] = useState("");
  const [valorRecaudar, setValorRecaudar] = useState("");

  // ---------- SERVIENTREGA ----------
  const [observacionServi, setObservacionServi] = useState("");

  // ---------- SPEED (si luego lo implementa) ----------
  const [observacionSpeed, setObservacionSpeed] = useState("");

  const Toast = useMemo(
    () =>
      Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.onmouseenter = Swal.stopTimer;
          toast.onmouseleave = Swal.resumeTimer;
        },
      }),
    [],
  );

  const minDate = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }, []);

  const resetTransportadoras = useCallback(() => {
    setTipoLaar("");
    setObservacionLaar("");
    setSolucionLaar("");
    setTipoGintra("");
    setSolucionGintra("");
    setFechaGintra("");
    setValorRecaudar("");
    setObservacionServi("");
    setObservacionSpeed("");
  }, []);

  const closeModalNovedad = useCallback(() => {
    setShowModalNovedad(false);
    setAccion(null);
    setDatosNovedadExtra(null);
    setTipo_novedad(null);
    setNovedadSeleccionada(null);
    resetTransportadoras();
  }, [resetTransportadoras]);

  const handleDetalleNovedad = useCallback(
    (novedad, tipo) => {
      setTipo_novedad(tipo);
      setNovedadSeleccionada(novedad);
      setAccion(null);
      setDatosNovedadExtra(null);
      resetTransportadoras();
      setShowModalNovedad(true);
    },
    [resetTransportadoras],
  );

  const handleVolverOfrecer = useCallback(async () => {
    try {
      if (!novedadSeleccionada?.guia_novedad) return;

      const res = await fetch(
        `https://new.imporsuitpro.com/novedades/datos/${novedadSeleccionada.guia_novedad}`,
      );
      const data = await res.json();
      setDatosNovedadExtra(data);
      setAccion("ofrecer");
    } catch (error) {
      console.error("Error al obtener detalles para volver a ofrecer:", error);
      Swal.fire(
        "Error",
        "No se pudo obtener los datos para gestionar la novedad",
        "error",
      );
    }
  }, [novedadSeleccionada]);

  const devolverRemitente = useCallback(async () => {
    try {
      if (!novedadSeleccionada?.guia_novedad) return;

      const res = await fetch(
        `https://new.imporsuitpro.com/Pedidos/devolver_novedad/${novedadSeleccionada.guia_novedad}`,
        { method: "POST" },
      );
      const data = await res.json();

      if (data.status === 200) {
        Toast.fire({
          title: "Pedido devuelto",
          icon: "success",
          text: "El pedido ha sido devuelto correctamente al remitente.",
        });
        closeModalNovedad();
        recargarDatosFactura?.();
      } else {
        throw new Error(data.message || "Error al devolver");
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Hubo un problema al devolver el pedido.",
        icon: "error",
      });
    }
  }, [Toast, closeModalNovedad, novedadSeleccionada, recargarDatosFactura]);

  // -------------------- ENVIOS POR TRANSPORTADORA --------------------

  const enviarServiNovedad = useCallback(async () => {
    try {
      const formData = new FormData();
      formData.append("guia", novedadSeleccionada?.guia_novedad);
      formData.append("observacion", observacionServi);
      formData.append("id_novedad", novedadSeleccionada?.id_novedad);
      formData.append("id", id_usuario_conf ? id_usuario_conf : 0);
      formData.append("id_plataforma", id_plataforma_conf);

      const res = await fetch(
        "https://new.imporsuitpro.com/novedades/solventarNovedadServientrega",
        { method: "POST", body: formData },
      );

      if (!res.ok) throw new Error("Fallo al enviar la novedad");

      Toast.fire({
        title: "Éxito",
        icon: "success",
        text: "Novedad enviada correctamente.",
      });

      closeModalNovedad();
      recargarDatosFactura?.();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.message || "Error al enviar la novedad",
        icon: "error",
      });
    }
  }, [
    Toast,
    closeModalNovedad,
    id_plataforma_conf,
    id_usuario_conf,
    novedadSeleccionada,
    observacionServi,
    recargarDatosFactura,
  ]);

  const enviarLaarNovedad = useCallback(async () => {
    try {
      setEnviando(true);
      if (!novedadSeleccionada?.guia_novedad) return;

      // valores del DOM (tal como lo tiene hoy)
      const nombre =
        document.getElementById("nombre_novedadesServi")?.value || "";
      const telefono =
        document.getElementById("telefono_novedadesServi")?.value || "";
      const callePrincipal =
        document.getElementById("callePrincipal_novedadesServi")?.value || "";
      const calleSecundaria =
        document.getElementById("calleSecundaria_novedadesServi")?.value || "";

      const formData = new FormData();
      formData.append("guia", novedadSeleccionada.guia_novedad);
      formData.append("id_novedad", novedadSeleccionada.id_novedad);
      formData.append("ciudad", datosNovedadExtra?.factura?.[0]?.ciudad);
      formData.append("nombre", nombre);
      formData.append("callePrincipal", callePrincipal || "");
      formData.append("calleSecundaria", calleSecundaria || "");
      formData.append("numeracion", "00");
      formData.append(
        "referencia",
        datosNovedadExtra?.factura?.[0]?.referencia,
      );
      formData.append("telefono", telefono);
      formData.append(
        "celular",
        datosNovedadExtra?.factura?.[0]?.telefono || "",
      );
      formData.append("observacion", observacionLaar || "");
      formData.append("observacionA", solucionLaar || "");
      formData.append("id", id_usuario_conf ? id_usuario_conf : 0);
      formData.append("id_plataforma", id_plataforma_conf);

      const res = await fetch(
        "https://new.imporsuitpro.com/novedades/solventarNovedadLaar",
        { method: "POST", body: formData },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Error en envío LAAR");

      Toast.fire({
        title: "Novedad enviada",
        icon: "success",
        text: "Se envió correctamente.",
      });

      closeModalNovedad();
      recargarDatosFactura?.();
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: error.message });
    } finally {
      setEnviando(false);
    }
  }, [
    Toast,
    closeModalNovedad,
    datosNovedadExtra,
    id_plataforma_conf,
    id_usuario_conf,
    novedadSeleccionada,
    observacionLaar,
    recargarDatosFactura,
    solucionLaar,
  ]);

  const enviarGintracomNovedad = useCallback(async () => {
    try {
      if (!novedadSeleccionada?.guia_novedad) return;

      if (tipoGintra !== "rechazar" && !fechaGintra) {
        Swal.fire({
          icon: "warning",
          title: "Fecha requerida",
          text: "Por favor, selecciona una fecha válida.",
        });
        return;
      }

      const formData = new FormData();
      formData.append("guia", novedadSeleccionada.guia_novedad);
      formData.append("observacion", solucionGintra || "");
      formData.append("id_novedad", novedadSeleccionada.id_novedad);
      formData.append("tipo", tipoGintra);
      formData.append("recaudo", tipoGintra === "recaudo" ? valorRecaudar : "");
      formData.append("fecha", tipoGintra !== "rechazar" ? fechaGintra : "");
      formData.append("id", id_usuario_conf ? id_usuario_conf : 0);
      formData.append("id_plataforma", id_plataforma_conf);

      const response = await fetch(
        "https://new.imporsuitpro.com/novedades/solventarNovedadGintracom",
        { method: "POST", body: formData },
      );
      const data = await response.json();

      if (data?.error === false) {
        Toast.fire({
          title: "Éxito",
          icon: "success",
          text: data.message || "Novedad solventada correctamente",
        });

        closeModalNovedad();
        recargarDatosFactura?.();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Hubo un error al solventar la novedad",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un error inesperado al enviar la solicitud.",
      });
    }
  }, [
    Toast,
    closeModalNovedad,
    fechaGintra,
    id_plataforma_conf,
    id_usuario_conf,
    novedadSeleccionada,
    recargarDatosFactura,
    solucionGintra,
    tipoGintra,
    valorRecaudar,
  ]);

  // helper para su submit actual (si lo quiere conservar)
  const handleGestionSubmit = useCallback(
    (e) => {
      e.preventDefault();
      Toast.fire({
        title: "Éxito",
        icon: "success",
        text: "La novedad ha sido gestionada como 'Volver a ofrecer'.",
      });
      closeModalNovedad();
    },
    [Toast, closeModalNovedad],
  );

  return {
    // estado general
    showModalNovedad,
    setShowModalNovedad,
    novedadSeleccionada,
    tipo_novedad,
    accion,
    datosNovedadExtra,

    // acciones
    handleDetalleNovedad,
    closeModalNovedad,
    handleVolverOfrecer,
    devolverRemitente,
    handleGestionSubmit,

    // LAAR
    tipoLaar,
    setTipoLaar,
    observacionLaar,
    setObservacionLaar,
    solucionLaar,
    setSolucionLaar,
    enviando,
    enviarLaarNovedad,

    // GINTRACOM
    tipoGintra,
    setTipoGintra,
    solucionGintra,
    setSolucionGintra,
    fechaGintra,
    setFechaGintra,
    valorRecaudar,
    setValorRecaudar,
    enviarGintracomNovedad,
    minDate,

    // SERVIENTREGA
    observacionServi,
    setObservacionServi,
    enviarServiNovedad,

    // SPEED
    observacionSpeed,
    setObservacionSpeed,

    // utils
    Toast,
  };
}

import React, { useMemo } from "react";
import DropshipperClientPanel from "./DropshipperClientPanel";
import BasicClientPanel from "./BasicClientPanel";
import { useDropi } from "../../context/DropiContext";

export default function ChatRightPanel(props) {
  const { isDropiLinked } = useDropi();

  const basicProps = useMemo(
    () => ({
      selectedChat: props.selectedChat,
      DEFAULT_AVATAR: props.DEFAULT_AVATAR,
      isOpenMiniCal: props.isOpenMiniCal,
      handleToggleCalendar: props.handleToggleCalendar,
      activar_cotizacion: props.activar_cotizacion,
      isCotizacionesOpen: props.isCotizacionesOpen,
      handleToggleCotizaciones: props.handleToggleCotizaciones,
      loadingCotizaciones: props.loadingCotizaciones,
      cotizacionesData: props.cotizacionesData,
      Cotizador: props.Cotizador,
      MiniCalendario: props.MiniCalendario,
      openEditContact: props.openEditContact,
      isGoogleLinked: props.isGoogleLinked,
      id_configuracion: props.id_configuracion,
    }),
    [
      props.selectedChat,
      props.DEFAULT_AVATAR,
      props.isOpenMiniCal,
      props.handleToggleCalendar,
      props.activar_cotizacion,
      props.isCotizacionesOpen,
      props.handleToggleCotizaciones,
      props.loadingCotizaciones,
      props.cotizacionesData,
      props.Cotizador,
      props.MiniCalendario,
      props.openEditContact,
      props.isGoogleLinked,
    ],
  );

  if (isDropiLinked) {
    return <DropshipperClientPanel {...props} />;
  }

  return <BasicClientPanel {...basicProps} />;
}

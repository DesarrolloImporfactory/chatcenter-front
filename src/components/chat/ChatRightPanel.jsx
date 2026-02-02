import React from "react";
import DropshipperClientPanel from "./DropshipperClientPanel";
import BasicClientPanel from "./BasicClientPanel";

export default function ChatRightPanel({
  id_plataforma_conf,
  // comunes
  selectedChat,
  DEFAULT_AVATAR,

  // estados y setters (comunes)
  isOpenMiniCal,
  handleToggleCalendar,

  // cotizaciones
  activar_cotizacion,
  isCotizacionesOpen,
  handleToggleCotizaciones,
  loadingCotizaciones,
  cotizacionesData,
  Cotizador,

  // panel ImporSuite (Órdenes / Novedades / etc.)
  isOpen,
  setIsOpen,
  isOpenNovedades,
  setIsOpenNovedades,
  setIsOpenMiniCal,
  activeTab,
  setActiveTab,
  facturasChatSeleccionado,
  guiasChatSeleccionado,
  obtenerEstadoGuia,
  handleFacturaSeleccionada,
  handleGuiaSeleccionada,

  // novedades
  activeTabNovedad,
  setActiveTabNovedad,
  novedades_gestionadas,
  novedades_noGestionadas,
  handleDetalleNovedad,

  // modal detalle novedad
  showModalNovedad,
  setShowModalNovedad,
  novedadSeleccionada,
  accion,
  tipo_novedad,
  // props específicos de formularios de novedad (laar/gintra/speed/servi)
  datosNovedadExtra,
  tipoLaar,
  setTipoLaar,
  observacionLaar,
  setObservacionLaar,
  solucionLaar,
  setSolucionLaar,
  enviarLaarNovedad,
  enviando,

  tipoGintra,
  setTipoGintra,
  solucionGintra,
  setSolucionGintra,
  fechaGintra,
  setFechaGintra,
  minDate,
  valorRecaudar,
  setValorRecaudar,
  enviarGintracomNovedad,

  observacionSpeed,
  setObservacionSpeed,

  observacionServi,
  setObservacionServi,
  enviarServiNovedad,

  setAccion,
  handleVolverOfrecer,
  devolverRemitente,

  // guía detalle
  guiaSeleccionada,
  tracking_guia,
  imprimir_guia,
  provinciaCiudad,
  disableAanular,
  anular_guia,
  disableGestionar,

  // factura overlay
  facturaSeleccionada,
  generandoGuia,
  handleSubmit,
  onSubmit,
  register,
  provincias,
  ciudades,
  setFacturaSeleccionada,
  handleSetTarifas,
  tarifas,
  images,
  selectedImageId,
  handleImageClick,
  modal_google_maps,
  setModal_google_maps,

  // accordion productos + resumen
  isAccordionOpen,
  facturaSeleccionadaProductos, // opcional si lo usa aparte
  handleCantidadInputChange,
  handleCantidadChange,
  handlePrecioChange,
  eliminar,
  setIsModalOpen,
  nombreBodega,
  monto_venta,
  costo,
  precio_envio_directo,
  fulfillment,
  total_directo,
  MetricCard,
  TarjetaHistorial,
  stats,
  nivel,
  mostrarAlerta,
  Swal,
  MiniCalendario,
}) {
  if (id_plataforma_conf !== null) {
    return (
      <DropshipperClientPanel
        selectedChat={selectedChat}
        DEFAULT_AVATAR={DEFAULT_AVATAR}
        // botones arriba
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        isOpenNovedades={isOpenNovedades}
        setIsOpenNovedades={setIsOpenNovedades}
        isOpenMiniCal={isOpenMiniCal}
        setIsOpenMiniCal={setIsOpenMiniCal}
        handleToggleCalendar={handleToggleCalendar}
        activar_cotizacion={activar_cotizacion}
        isCotizacionesOpen={isCotizacionesOpen}
        handleToggleCotizaciones={handleToggleCotizaciones}
        loadingCotizaciones={loadingCotizaciones}
        cotizacionesData={cotizacionesData}
        Cotizador={Cotizador}
        // órdenes
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        facturasChatSeleccionado={facturasChatSeleccionado}
        guiasChatSeleccionado={guiasChatSeleccionado}
        obtenerEstadoGuia={obtenerEstadoGuia}
        handleFacturaSeleccionada={handleFacturaSeleccionada}
        handleGuiaSeleccionada={handleGuiaSeleccionada}
        // novedades
        activeTabNovedad={activeTabNovedad}
        setActiveTabNovedad={setActiveTabNovedad}
        novedades_gestionadas={novedades_gestionadas}
        novedades_noGestionadas={novedades_noGestionadas}
        handleDetalleNovedad={handleDetalleNovedad}
        // modal detalle novedad
        showModalNovedad={showModalNovedad}
        setShowModalNovedad={setShowModalNovedad}
        novedadSeleccionada={novedadSeleccionada}
        accion={accion}
        tipo_novedad={tipo_novedad}
        datosNovedadExtra={datosNovedadExtra}
        tipoLaar={tipoLaar}
        setTipoLaar={setTipoLaar}
        observacionLaar={observacionLaar}
        setObservacionLaar={setObservacionLaar}
        solucionLaar={solucionLaar}
        setSolucionLaar={setSolucionLaar}
        enviarLaarNovedad={enviarLaarNovedad}
        enviando={enviando}
        tipoGintra={tipoGintra}
        setTipoGintra={setTipoGintra}
        solucionGintra={solucionGintra}
        setSolucionGintra={setSolucionGintra}
        fechaGintra={fechaGintra}
        setFechaGintra={setFechaGintra}
        minDate={minDate}
        valorRecaudar={valorRecaudar}
        setValorRecaudar={setValorRecaudar}
        enviarGintracomNovedad={enviarGintracomNovedad}
        observacionSpeed={observacionSpeed}
        setObservacionSpeed={setObservacionSpeed}
        observacionServi={observacionServi}
        setObservacionServi={setObservacionServi}
        enviarServiNovedad={enviarServiNovedad}
        setAccion={setAccion}
        handleVolverOfrecer={handleVolverOfrecer}
        devolverRemitente={devolverRemitente}
        // guía detalle
        guiaSeleccionada={guiaSeleccionada}
        tracking_guia={tracking_guia}
        imprimir_guia={imprimir_guia}
        provinciaCiudad={provinciaCiudad}
        disableAanular={disableAanular}
        anular_guia={anular_guia}
        disableGestionar={disableGestionar}
        Swal={Swal}
        // factura overlay form
        facturaSeleccionada={facturaSeleccionada}
        generandoGuia={generandoGuia}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        register={register}
        provincias={provincias}
        ciudades={ciudades}
        setFacturaSeleccionada={setFacturaSeleccionada}
        handleSetTarifas={handleSetTarifas}
        tarifas={tarifas}
        images={images}
        selectedImageId={selectedImageId}
        handleImageClick={handleImageClick}
        modal_google_maps={modal_google_maps}
        setModal_google_maps={setModal_google_maps}
        // productos + resumen
        isAccordionOpen={isAccordionOpen}
        handleCantidadInputChange={handleCantidadInputChange}
        handleCantidadChange={handleCantidadChange}
        handlePrecioChange={handlePrecioChange}
        eliminar={eliminar}
        setIsModalOpen={setIsModalOpen}
        nombreBodega={nombreBodega}
        monto_venta={monto_venta}
        costo={costo}
        precio_envio_directo={precio_envio_directo}
        fulfillment={fulfillment}
        total_directo={total_directo}
        MetricCard={MetricCard}
        TarjetaHistorial={TarjetaHistorial}
        stats={stats}
        nivel={nivel}
        mostrarAlerta={mostrarAlerta}
        MiniCalendario={MiniCalendario}
      />
    );
  }

  return (
    <BasicClientPanel
      selectedChat={selectedChat}
      DEFAULT_AVATAR={DEFAULT_AVATAR}
      isOpenMiniCal={isOpenMiniCal}
      handleToggleCalendar={handleToggleCalendar}
      activar_cotizacion={activar_cotizacion}
      isCotizacionesOpen={isCotizacionesOpen}
      handleToggleCotizaciones={handleToggleCotizaciones}
      loadingCotizaciones={loadingCotizaciones}
      cotizacionesData={cotizacionesData}
      Cotizador={Cotizador}
      MiniCalendario={MiniCalendario}
    />
  );
}

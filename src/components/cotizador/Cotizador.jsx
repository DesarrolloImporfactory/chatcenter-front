
const Cotizador = ({loadingCotizaciones, cotizacionesData}) => {
     cotizacionesData = cotizacionesData.cotizaciones || [];
  return (
    <div className="p-4">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                          <i className="bx bx-file-blank text-xl"></i>
                          Cotizaciones
                        </h3>
                        
                        {loadingCotizaciones ? (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-3"></div>
                            <span className="text-white text-sm">Cargando cotizaciones...</span>
                          </div>
                        ) : (
                          <div className="w-full overflow-x-auto overflow-y-auto min-h-12 max-h-80 transition-all duration-500 ease-out transform animate-fadeTable custom-scrollbar">
                            <table className="w-full table-auto border-separate border-spacing-y-2">
                              <thead className="bg-gradient-to-r from-blue-800 to-blue-700 text-white text-sm">
                                <tr>
                                  <th className="px-4 py-2 text-left rounded-tl-md">
                                    Id Cotización
                                  </th>
                                  <th className="px-4 py-2 text-left">
                                    Fecha
                                  </th>
                                  <th className="px-4 py-2 text-center rounded-tr-md">
                                    Acción
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {cotizacionesData?.length > 0 ? (
                                  cotizacionesData.map((cotizacion, index) => (
                                    <tr
                                      key={index}
                                      className="bg-[#1f2937] text-white hover:shadow-lg hover:ring-1 hover:ring-blue-400 rounded-md transition-all"
                                    >
                                      <td className="px-4 py-3 rounded-l-md">
                                        {/* poner maximo 5 digitos rellenar 0 ala izquierda*/ String(cotizacion.id_cotizacion).padStart(5, '0')}
                                      </td>
                                      <td className="px-4 py-3">
                                        {cotizacion.fecha_creacion ? new Date(cotizacion.fecha_creacion).toLocaleDateString('es-EC') : 'N/A'}
                                      </td>
                                      <td className="px-4 py-3 text-center rounded-r-md">
                                        <button
                                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 py-2 rounded-md transition duration-200"
                                          onClick={() => {
                                            console.log('Ver cotización:', cotizacion);
                                            // Aquí puedes agregar la lógica para ver la cotización
                                          }}
                                        >
                                          Ver
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="3" className="text-center py-6 text-white/60">
                                      No hay cotizaciones disponibles
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
  )
}

export default Cotizador

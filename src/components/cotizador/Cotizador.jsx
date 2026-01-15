import { useState } from 'react';
import chatApi from '../../api/chatcenter';

const Cotizador = ({loadingCotizaciones, cotizacionesData}) => {
     cotizacionesData = cotizacionesData.cotizaciones || [];
    
    const [pdfPreview, setPdfPreview] = useState(null);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [loadingPdf, setLoadingPdf] = useState(false);

    const handleSeePreviewCotizacion = async (id_cotizacion) => {
        try {
            setLoadingPdf(true);
            const url = "https://new.imporsuitpro.com/"
            const request = await chatApi.post(url + "cotizadorpro/enviarCotizacion", {
                id_cotizacion: id_cotizacion
            });
            
            console.log(request.data);
            
            if (request.data.success && request.data.pdf) {
                // Convertir base64 a blob URL para vista previa
                const byteCharacters = atob(request.data.pdf);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);
                
                setPdfPreview({
                    url: blobUrl,
                    filename: request.data.filename
                });
                setShowPdfModal(true);
            }
        } catch (error) {
            console.error('Error al cargar PDF:', error);
            alert('Error al cargar la vista previa del PDF');
        } finally {
            setLoadingPdf(false);
        }
    }
    
    const handleClosePdfModal = () => {
        if (pdfPreview?.url) {
            URL.revokeObjectURL(pdfPreview.url); // Liberar memoria
        }
        setPdfPreview(null);
        setShowPdfModal(false);
    }
    
    const handleDownloadPdf = () => {
        if (pdfPreview?.url && pdfPreview?.filename) {
            const link = document.createElement('a');
            link.href = pdfPreview.url;
            link.download = pdfPreview.filename;
            link.click();
        }
    }

  return (
    <>
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
                                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 py-2 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                          onClick={() => {
                                            handleSeePreviewCotizacion(cotizacion.id_cotizacion);
                                          }}
                                          disabled={loadingPdf}
                                        >
                                          {loadingPdf ? 'Cargando...' : 'Ver'}
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

      {/* Modal de Vista Previa del PDF */}
      {showPdfModal && pdfPreview && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-95">
          <div className="bg-gray-900 w-full h-full flex flex-col">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
              <h2 className="text-white font-semibold text-base flex items-center gap-2">
                <i className="bx bx-file-pdf text-red-500 text-xl"></i>
                {pdfPreview.filename}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md transition duration-200 flex items-center gap-1 text-sm"
                >
                  <i className="bx bx-download"></i>
                  Descargar
                </button>
                <button
                  onClick={handleClosePdfModal}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md transition duration-200 flex items-center gap-1 text-sm"
                >
                  <i className="bx bx-x text-xl"></i>
                  Cerrar
                </button>
              </div>
            </div>
            
            {/* Visor PDF */}
            <div className="flex-1 overflow-hidden bg-gray-800">
              <iframe
                src={pdfPreview.url}
                className="w-full h-full border-0"
                title="Vista previa PDF"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Cotizador

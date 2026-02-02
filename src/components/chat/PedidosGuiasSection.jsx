import React, { useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";
import GuiaGenerator from "./GuiaGenerator";

export default function PedidosGuiasSection({
  socketRef,
  provincias,
  selectedChat,
  id_configuracion,
  id_plataforma_conf,
  id_usuario_conf,
  dataAdmin,
  facturasChatSeleccionado,
  setFacturasChatSeleccionado,
  guiasChatSeleccionado,
  setGuiasChatSeleccionado,
  obtenerEstadoGuia,
  buscar_id_recibe,
  agregar_mensaje_enviado,
}) {
  const [activeTab, setActiveTab] = useState("pedidos");
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [guiaSeleccionada, setGuiaSeleccionada] = useState(null);

  const handleSelectFactura = useCallback((factura) => {
    setGuiaSeleccionada(null);
    setFacturaSeleccionada(factura);
  }, []);

  const handleSelectGuia = useCallback((guia) => {
    setFacturaSeleccionada(null);
    setGuiaSeleccionada(guia);
  }, []);

  // Si cambia de chat, resetea selección (opcional, pero recomendado)
  // useEffect(() => { setFacturaSeleccionada(null); setGuiaSeleccionada(null); }, [selectedChat?.id, selectedChat?.psid]);

  const canRender = Boolean(
    selectedChat?.celular_cliente && id_plataforma_conf,
  );

  if (!canRender) return null;

  return (
    <div className="bg-[#12172e] rounded-lg shadow-md p-3">
      {/* Tabs */}
      <div className="flex gap-3 mb-3">
        <button
          className={`flex-1 px-4 py-2 rounded ${activeTab === "pedidos" ? "bg-[#1f1b2e]" : "bg-[#15121f]"}`}
          onClick={() => setActiveTab("pedidos")}
        >
          Pedidos
        </button>

        <button
          className={`flex-1 px-4 py-2 rounded ${activeTab === "guias" ? "bg-[#1a2b27]" : "bg-[#101f1d]"}`}
          onClick={() => setActiveTab("guias")}
        >
          Guías
        </button>
      </div>

      {/* Tabla */}
      <div className="w-full overflow-x-auto max-h-80 custom-scrollbar">
        <table className="w-full table-auto border-separate border-spacing-y-2">
          <thead className="bg-gradient-to-r from-blue-800 to-blue-700 text-white text-sm">
            <tr>
              {activeTab === "pedidos" ? (
                <>
                  <th className="px-4 py-2 text-left rounded-tl-md">Factura</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-center rounded-tr-md">
                    Acción
                  </th>
                </>
              ) : (
                <>
                  <th className="px-4 py-2 text-left rounded-tl-md">Guía</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-center rounded-tr-md">
                    Acción
                  </th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {activeTab === "pedidos"
              ? (facturasChatSeleccionado || []).map((f) => (
                  <tr key={f.id_factura} className="bg-[#1f2937] text-white">
                    <td className="px-4 py-3 rounded-l-md">
                      {f.numero_factura}
                    </td>
                    <td className="px-4 py-3">{f.nombre}</td>
                    <td className="px-4 py-3 text-center rounded-r-md">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 py-2 rounded-md"
                        onClick={() => handleSelectFactura(f)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              : (guiasChatSeleccionado || []).map((g) => {
                  const { color, estado_guia } = obtenerEstadoGuia(
                    g.transporte,
                    g.estado_guia_sistema,
                  );
                  return (
                    <tr key={g.numero_guia} className="bg-[#1f2937] text-white">
                      <td className="px-4 py-3 rounded-l-md">
                        {g.numero_guia}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-3 py-1 rounded-full ${color}`}
                        >
                          {estado_guia}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center rounded-r-md">
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 py-2 rounded-md"
                          onClick={() => handleSelectGuia(g)}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Detalle */}
      {facturaSeleccionada && (
        <div className="mt-4 bg-white text-black rounded-lg p-3">
          <GuiaGenerator
            socketRef={socketRef}
            provincias={provincias}
            selectedChat={selectedChat}
            facturaSeleccionada={facturaSeleccionada}
            setFacturaSeleccionada={setFacturaSeleccionada}
            setFacturasChatSeleccionado={setFacturasChatSeleccionado}
            id_plataforma_conf={id_plataforma_conf}
            id_usuario_conf={id_usuario_conf}
            id_configuracion={id_configuracion}
            dataAdmin={dataAdmin}
            buscar_id_recibe={buscar_id_recibe}
            agregar_mensaje_enviado={agregar_mensaje_enviado}
            // para refrescar lista
            onRecargarPedido={() => {
              socketRef.current?.emit("GET_FACTURAS", {
                id_plataforma: id_plataforma_conf,
                telefono: selectedChat.celular_cliente,
              });
            }}
          />
        </div>
      )}

      {guiaSeleccionada && (
        <div className="mt-4 bg-white text-black rounded-lg p-3">
          {/* aquí usted pone su UI detalle guía, tracking/imprimir/anular */}
          <div className="flex items-center justify-between">
            <div>
              <b>Guía:</b> {guiaSeleccionada.numero_guia} <br />
              <b>Factura:</b> {guiaSeleccionada.numero_factura}
            </div>

            <button
              className="px-3 py-2 rounded bg-gray-200"
              onClick={() => setGuiaSeleccionada(null)}
            >
              Cerrar
            </button>
          </div>

          {/* Reutilice su detalle actual, pero ya fuera de DatosUsuario */}
        </div>
      )}
    </div>
  );
}

# 📚 Documentación de actualizacion DatosUsuario a DatosUsuarioModerno

Que hace cada archivo?

DatosUsuarioModerno.jsx:

Controla estados + lógica + data

Renderiza el panel derecho SOLO si opciones === true

Llama a <ChatRightPanel /> y le pasa props

ChatRightPanel.jsx

Decide panel:

    DropshipperClientPanel (completo) vs BasicClientPanel (simple)

DropshipperClientPanel.jsx

    Renderiza UI compleja (pedidos/guías/novedades)

    Renderiza calendario cuando isOpenMiniCal está activo

BasicClientPanel.jsx

    Renderiza UI básica

    Renderiza calendario cuando isOpenMiniCal está activo

import { se } from "date-fns/locale";
import { useState, useEffect, useRef } from "react";

const Cabecera = ({
  userData,
  chatMessages,
  opciones,
  setOpciones,
  handleOpciones,
  selectedChat,
  setSelectedChat,
  animateOut,
  toggleCrearEtiquetaModal,
  etiquetasMenuOpen,
  setEtiquetasMenuOpen,
  toggleAsginarEtiquetaModal,
  tagListAsginadas,
  tagList,
  cargar_socket,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef(null);
  const etiquetasMenuRef = useRef(null);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const toggleEtiquetasMenu = () => {
    setEtiquetasMenuOpen(!etiquetasMenuOpen);
  };

  const volver_seccion_principal = () => {
    setOpciones(false);
    setSelectedChat(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setMenuOpen(false);
    window.location.reload();
  };

  const handleReturnToImporsuit = () => {
    setMenuOpen(false);
    localStorage.getItem("token");
    window.location.href =
      "https://new.imporsuitpro.com/acceso/jwt_home/" +
      localStorage.getItem("token");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        etiquetasMenuRef.current &&
        !etiquetasMenuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
        console.log("cualquier mensaje");
        setEtiquetasMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setEtiquetasMenuOpen(false);
        setIsCrearEtiquetaModalOpen(false); // Cierra el modal si se presiona "Escape"
      }
    };

    /* document.addEventListener("mousedown", handleClickOutside); */
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const [isHovering, setIsHovering] = useState(false);

  // Función para manejar el cambio de estado del chat (archivar o abrir)
  const handleChangeChatStatus = async (newStatus) => {
    try {
      // Aquí llamas a tu API para actualizar el estado del chat
      // La función 'actualizar_cerrado' es la que debes pasar como prop para llamar tu API
      await actualizar_cerrado(selectedChat.id, newStatus); // Enviamos el id y el nuevo estado (0 o 1)
    } catch (error) {
      console.error("Error al cambiar el estado del chat:", error);
    }
  };

  const actualizar_cerrado = async (chatId, nuevoEstado) => {
    try {
      const formData = new FormData();
      formData.append("chatId", chatId); // Añadimos el ID del chat
      formData.append("nuevoEstado", nuevoEstado); // Añadimos el nuevo estado (0 o 1)

      // Enviar la solicitud a la API con los datos
      const response = await fetch(
        "https://new.imporsuitpro.com/Pedidos/actualizar_cerrado",
        {
          method: "POST",
          body: formData, // Usamos el FormData para enviar los datos
        }
      );

      const data = await response.json(); // Parseamos la respuesta JSON

      if (!response.ok) {
        throw new Error(data.message || "Error al actualizar el chat");
      }

      console.log("Chat actualizado correctamente:", data);
      cargar_socket();
    } catch (error) {
      console.error("Error al actualizar el chat:", error);
    }
  };

  return (
    <>
      <div
        className={`items-center justify-between p-4 bg-[#171931] ${
          selectedChat ? "hidden sm:flex" : "flex"
        }`}
      >
        {/* Botón de opciones */}
        <div className="grid place-content-center relative" ref={menuRef}>
          <button onClick={toggleMenu}>
            <i className="bx text-2xl bx-dots-vertical-rounded text-white"></i>
          </button>

          {menuOpen && (
            <div className="absolute top-10 left-[10%] bg-white rounded shadow-lg py-2 w-40 z-50">
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-200"
              >
                Cerrar sesión
              </button>
              <button
                onClick={handleReturnToImporsuit}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-200"
              >
                Volver a Imporsuit
              </button>
            </div>
          )}
        </div>
        {/* Imagen y Nombre */}
        <div className="flex items-center space-x-3">
          <div className="text-end">
            <span className="block text-white font-medium">
              {" "}
              {userData?.nombre ?? "Tony Plaza"}
            </span>
            <span className="text-sm text-white ">
              {" "}
              {userData?.cargo == 1 ? "Administrador" : "Vendedor"}
            </span>
          </div>
          <img
            className="rounded-full w-12 h-12 bg-white"
            src="https://new.imporsuitpro.com/public/img/img.png"
            alt="Profile"
          />
        </div>
      </div>

      {/* Chat titulo */}
      {/* Mostrar un div vacío si selectedChat es null */}
      {selectedChat === null ? (
        <div
          className={`${
            opciones == true
              ? "col-span-2 bg-gray-100"
              : "col-span-3 bg-gray-100"
          } ${selectedChat === null ? "hidden sm:block" : "block"}`}
        ></div>
      ) : (
        <div
          className={`${
            opciones == true ? "col-span-2 bg-white" : "col-span-3 bg-white"
          } ${selectedChat === null ? "hidden sm:block" : "block"}`}
        >
          <div className="flex justify-between items-center space-x-3">
            {/* Imagen, nombre y telefono */}
            <div className="flex gap-2">
              <button
                className="p-1 text-[25px] block sm:hidden"
                onClick={volver_seccion_principal}
              >
                <i className="bx bx-arrow-back"></i>
              </button>
              <img
                className="rounded-full w-12 h-12"
                src="https://tiendas.imporsuitpro.com/imgs/react/user.png"
                alt="Profile"
              />
              <div>
                <span className="block text-black font-medium">
                  {chatMessages.length > 0 && selectedChat
                    ? selectedChat?.nombre_cliente
                    : "SELECCIONE UN CHAT"}
                </span>
                <span className="text-sm text-black">
                  {chatMessages.length > 0 && selectedChat
                    ? "+" + selectedChat?.celular_cliente
                    : "-------"}
                </span>
              </div>
            </div>
            {/* opciones */}
            <div className="flex items-center justify-between text-xl gap-4 p-4">
              <button
                onClick={() =>
                  handleChangeChatStatus(
                    selectedChat.chat_cerrado === 0 ? 1 : 0
                  )
                }
                onMouseEnter={() => setIsHovering(true)} // Mostrar el texto cuando el mouse entra
                onMouseLeave={() => setIsHovering(false)} // Ocultar el texto cuando el mouse sale
                className="relative group"
              >
                {/* Texto dinámico del botón */}
                <span
                  className={`${
                    selectedChat.chat_cerrado === 0
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-green-500 hover:bg-green-600"
                  } py-2 px-4 rounded-md text-sm font-semibold text-white transition duration-300`}
                >
                  {selectedChat.chat_cerrado === 0
                    ? "Cerrar chat"
                    : "Abrir chat"}
                </span>
              </button>

              {/* boton etiquetas */}
              <button onClick={toggleEtiquetasMenu} ref={etiquetasMenuRef}>
                <i className="bx bxs-purchase-tag"></i>
              </button>

              {etiquetasMenuOpen && (
                <div className="absolute top-10 right-0 bg-white rounded shadow-lg py-2 w-40 z-50">
                  <button
                    onClick={toggleAsginarEtiquetaModal}
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-200"
                  >
                    Asignar etiquetas
                  </button>
                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-200"
                    onClick={toggleCrearEtiquetaModal}
                  >
                    Crear etiqueta
                  </button>
                </div>
              )}
              {/* fin boton etiquetas */}

              <button onClick={handleOpciones}>
                <i className="bx bx-info-circle"></i>
              </button>
            </div>
          </div>

          {/* Sección de etiquetas asignadas */}
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {tagList.length > 0 ? (
              tagList
                .filter((tag) =>
                  tagListAsginadas.some(
                    (assignedTag) => assignedTag.id_etiqueta === tag.id_etiqueta
                  )
                )
                .map((tag) => (
                  <div
                    key={tag.id_etiqueta}
                    className="bg-gray-800 text-white text-xs font-semibold py-1 px-3 rounded-full flex items-center gap-2"
                  >
                    <span>{tag.nombre_etiqueta}</span>
                    <button
                      onClick={() =>
                        toggleTagAssignment(tag.id_etiqueta, selectedChat.id)
                      }
                      className="text-gray-400 hover:text-gray-200"
                    >
                      <i className="bx bx-x text-xs"></i>
                    </button>
                  </div>
                ))
            ) : (
              <p className="text-gray-500 text-sm">
                No hay etiquetas asignadas.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Datos del chat */}
      {opciones && (
        <div
          className={`relative col-span-1 bg-[#171931] text-white animate-slide-in ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }`}
        >
          {/* Encabezado */}
          <div className="flex justify-center p-4">
            <div className="flex text-center justify-center">
              <span>Historial de Pedidos</span>
            </div>
          </div>

          {/* Botón de cierre */}
          <div className="absolute top-3 right-4">
            <button onClick={handleOpciones}>
              <i className="bx bx-x text-white text-3xl"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Cabecera;

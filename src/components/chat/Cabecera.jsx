import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; // al inicio

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
  const [sliderOpen, setSliderOpen] = useState(false);

  const menuRef = useRef(null);
  const etiquetasMenuRef = useRef(null);

  const toggleSlider = () => {
    setSliderOpen(!sliderOpen);
  };

  const toggleEtiquetasMenu = () => {
    setEtiquetasMenuOpen(!etiquetasMenuOpen);
  };

  const volver_seccion_principal = () => {
    setOpciones(false);
    setSelectedChat(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login"; // redirige al login
  };

  const handleReturnToImporsuit = () => {
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
        setEtiquetasMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setEtiquetasMenuOpen(false);
        setMenuOpen(false);
        setSliderOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const [isHovering, setIsHovering] = useState(false);

  const handleChangeChatStatus = async (newStatus) => {
    try {
      await actualizar_cerrado(selectedChat.id, newStatus);

      // Actualizar localmente el estado del chat seleccionado
      setSelectedChat((prev) => ({
        ...prev,
        chat_cerrado: newStatus,
      }));
    } catch (error) {
      console.error("Error al cambiar el estado del chat:", error);
    }
  };

  const actualizar_cerrado = async (chatId, nuevoEstado) => {
    try {
      const formData = new FormData();
      formData.append("chatId", chatId);
      formData.append("nuevoEstado", nuevoEstado);

      const response = await fetch(
        "https://new.imporsuitpro.com/Pedidos/actualizar_cerrado",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al actualizar el chat");
      }

      console.log("Chat actualizado correctamente:", data);
      cargar_socket();
    } catch (error) {
      console.error("Error al actualizar el chat:", error);
    }
  };

  const toggleTagAssignment = (tagId, chatId) => {
    console.log("Desasignar etiqueta con ID:", tagId, "del chat:", chatId);
  };

  const navigate = useNavigate();
  const irAPlantillas = () => {
    navigate("/administrador-whatsapp");
  };

  const navigater = useNavigate();
  const irAChatCenter = () => {
    navigater("/chat");
  };

  return (
    <>
      {/* Cabecera principal (mobile visible si no hay chat seleccionado, desktop siempre) */}
      <div
        className={`items-center justify-between p-4 bg-[#171931] ${
          selectedChat ? "hidden sm:flex" : "flex"
        }`}
      >
        {/* Botón “hamburger” para abrir slider */}
        <div>
          <button
            onClick={toggleSlider}
            className="text-white text-2xl focus:outline-none hover:scale-110 transition-transform"
          >
            <i className="bx bx-menu"></i>
          </button>
        </div>

        {/* Nombre de usuario y foto */}
        <div className="flex items-center space-x-3">
          <div className="text-end">
            <span className="block text-white font-semibold text-lg">
              {userData?.nombre ?? "Tony Plaza"}
            </span>
            <span className="text-sm text-white">
              {userData?.cargo === 1 ? "Administrador" : "Vendedor"}
            </span>
          </div>
          <img
            className="rounded-full w-12 h-12 bg-white object-cover"
            src="https://new.imporsuitpro.com/public/img/img.png"
            alt="Profile"
          />
        </div>
      </div>

      {/* Slider lateral (Menú) */}
      <div
        className={`fixed top-0 left-0 h-screen w-64 bg-white shadow-xl transform transition-transform duration-300 z-50 ${
          sliderOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Encabezado del slider */}
        <div className="h-[84px] px-5 flex items-center justify-between bg-[#171931] text-white">
          <h2 className="font-bold text-lg">Menú</h2>
          <button
            onClick={toggleSlider}
            className="hover:scale-110 transition-transform"
          >
            <i className="bx bx-x text-2xl"></i>
          </button>
        </div>

        {/* Opciones dentro del slider */}
        <div className="mt-6">
          {/* Volver a Imporsuit */}
          <button
            onClick={handleReturnToImporsuit}
            className="group flex items-center w-full px-5 py-4 text-left transition-colors hover:bg-gray-100"
          >
            <i className="bx bx-log-in text-2xl mr-3 text-gray-600 group-hover:text-blue-600 transition-colors"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600 transition-colors">
              Volver a Imporsuit
            </span>
          </button>
          {/* Chat Center */}
          <button
            onClick={irAChatCenter}
            className="group flex items-center w-full px-5 py-4 text-left transition-colors hover:bg-gray-100"
          >
            <i className="bx bx-chat text-2xl mr-3 text-gray-600 group-hover:text-blue-600 transition-colors"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600 transition-colors">
              Chat Center
            </span>
          </button>
          {/* Administrar Plantillas */}
          <button
            onClick={irAPlantillas}
            className="group flex items-center w-full px-5 py-4 text-left transition-colors hover:bg-gray-100"
          >
            <i className="bx bxl-whatsapp text-2xl mr-3 text-gray-600 group-hover:text-blue-600 transition-colors"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600 transition-colors">
              WhatsApp
            </span>
          </button>
          {/* Cerrar sesión */}
          <button
            onClick={handleLogout}
            className="group flex items-center w-full px-5 py-4 text-left transition-colors hover:bg-gray-100"
          >
            <i className="bx bx-door-open text-2xl mr-3 text-gray-600 group-hover:text-blue-600 transition-colors"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600 transition-colors">
              Cerrar sesión
            </span>
          </button>
        </div>
      </div>

      {/* Sección principal cuando el chat está seleccionado */}
      {selectedChat === null ? (
        <div
          className={`${
            opciones ? "col-span-2 bg-gray-100" : "col-span-3 bg-gray-100"
          } ${selectedChat === null ? "hidden sm:block" : "block"}`}
        ></div>
      ) : (
        <div
          className={`${
            opciones ? "col-span-2 bg-white" : "col-span-3 bg-white"
          } ${selectedChat === null ? "hidden sm:block" : "block"}`}
        >
          {/* Encabezado del chat seleccionado */}
          <div className="flex justify-between items-center space-x-3 border-b p-4">
            {/* Botón para volver en móvil + imagen de usuario + nombre/teléfono */}
            <div className="flex gap-3 items-center">
              <button
                className="p-1 text-[25px] block sm:hidden hover:scale-110 transition-transform"
                onClick={volver_seccion_principal}
              >
                <i className="bx bx-arrow-back"></i>
              </button>
              <img
                className="rounded-full w-12 h-12 object-cover"
                src="https://tiendas.imporsuitpro.com/imgs/react/user.png"
                alt="Profile"
              />
              <div>
                <span className="block text-black font-semibold text-lg">
                  {chatMessages.length > 0 && selectedChat
                    ? selectedChat.nombre_cliente
                    : "SELECCIONE UN CHAT"}
                </span>
                <span className="text-sm text-gray-600">
                  {chatMessages.length > 0 && selectedChat
                    ? "+" + selectedChat.celular_cliente
                    : "-------"}
                </span>
              </div>
            </div>

            {/* Botones de acciones en la esquina derecha */}
            <div className="flex items-center gap-4">
              {/* Cerrar/Abrir chat */}
              <button
                onClick={() =>
                  handleChangeChatStatus(
                    selectedChat.chat_cerrado === 0 ? 1 : 0
                  )
                }
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="relative group transition-transform hover:scale-105"
              >
                <span
                  className={`${
                    selectedChat.chat_cerrado === 0
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-green-500 hover:bg-green-600"
                  } py-2 px-4 rounded-md text-sm font-semibold text-white transition-colors duration-300`}
                >
                  {selectedChat.chat_cerrado === 0
                    ? "Cerrar chat"
                    : "Abrir chat"}
                </span>
              </button>

              {/* Menú de etiquetas */}
              <div className="relative" ref={etiquetasMenuRef}>
                <button
                  onClick={toggleEtiquetasMenu}
                  className="hover:scale-110 transition-transform"
                >
                  <i className="bx bxs-purchase-tag text-xl"></i>
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
              </div>

              {/* Botón de información (opciones) */}
              <button
                onClick={handleOpciones}
                className="hover:scale-110 transition-transform"
              >
                <i className="bx bx-info-circle text-xl"></i>
              </button>
            </div>
          </div>

          {/* Sección de etiquetas asignadas debajo del encabezado */}
          <div className="flex flex-wrap gap-2 px-4 py-3 border-b bg-gray-50">
            {tagList && tagList.length > 0 ? (
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

      {/* Sección de detalle (Historial, etc) */}
      {opciones && (
        <div
          className={`relative col-span-1 bg-[#171931] text-white animate-slide-in ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }`}
        >
          <div className="flex justify-center p-4 border-b border-white/10">
            <div className="flex text-center justify-center">
              <span className="text-lg font-semibold">
                Historial de Pedidos
              </span>
            </div>
          </div>

          {/* Cerrar la sección (opciones) */}
          <div className="absolute top-3 right-4">
            <button
              onClick={handleOpciones}
              className="hover:scale-110 transition-transform"
            >
              <i className="bx bx-x text-white text-3xl"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Cabecera;

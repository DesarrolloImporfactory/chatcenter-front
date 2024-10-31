const Cabecera = ({
  userData,
  chatMessages,
  opciones,
  handleOpciones,
  selectedChat,
  animateOut,
}) => {
  return (
    <>
      <div className="flex items-center justify-between p-4 bg-blue-500">
        {/* Botón de opciones */}
        <div className="grid place-content-center">
          <button>
            <i className="bx text-2xl bx-dots-vertical-rounded text-white"></i>
          </button>
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
      <div
        className={`${
          opciones == true ? "col-span-2 bg-white" : "col-span-3 bg-white"
        }`}
      >
        <div className="flex justify-between items-center space-x-3 p-4">
          {/* Imagen, nombre y telefono */}
          <div className="flex gap-2">
            <img
              className="rounded-full w-12 h-12"
              src="https://tiendas.imporsuitpro.com/imgs/react/user.png"
              alt="Profile"
            />
            <div>
              <span className="block text-black font-medium">
                {chatMessages.length > 0 && selectedChat
                  ? chatMessages.find((chat) => chat.id === selectedChat.id)
                      ?.nombre_cliente
                  : "SELECCIONE UN CHAT"}
              </span>
              <span className="text-sm text-black ">
                {chatMessages.length > 0 && selectedChat
                  ? "+" +
                    chatMessages.find((chat) => chat.id === selectedChat.id)
                      ?.celular_cliente
                  : "-------"}
              </span>
            </div>
          </div>
          {/* opciones */}
          <div className="flex items-center justify-between text-xl gap-4 p-4">
            <button onClick={handleOpciones}>
              <i className="bx bx-info-circle"></i>
            </button>
          </div>
        </div>
      </div>
      {/* datos del chat */}
      {opciones && (
        <div
          className={`col-span-1 bg-[#171931] text-white animate-slide-in ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }`}
        >
          <div className="flex justify-center p-4">
            <div className="flex text-center justify-center">
              <span>Historial de Pedidos</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Cabecera;

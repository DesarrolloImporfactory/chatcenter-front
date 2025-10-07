import React from "react";
import { OptimizedChat } from "../features/chat";

/**
 * Componente Chat modernizado que reemplaza el anterior de 3234 líneas
 * Utiliza la nueva arquitectura modular para mejor mantenibilidad
 */
const Chat = () => {
  return (
    <div className="h-screen w-full">
      <OptimizedChat />
    </div>
  );
};

export default Chat;

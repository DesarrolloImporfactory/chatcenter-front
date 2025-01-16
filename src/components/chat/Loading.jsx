import React from "react";

const Loading = () => {
  return (
    <div className="flex flex-col justify-center items-center h-full w-full">
      {/* Animación de carga */}
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-opacity-75"></div>
      {/* Texto debajo */}
      <span className="mt-4 text-blue-500 text-lg font-semibold">
        Cargando...
      </span>
    </div>
  );
};

export default Loading;

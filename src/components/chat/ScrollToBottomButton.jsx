import React, { useState, useEffect } from "react";

const ScrollToBottomButton = ({ containerRef }) => {
  const [mostrarBoton, setMostrarBoton] = useState(false);

  // Detectar si el scroll no está al final
  const handleScroll = () => {
    const container = containerRef.current;
    if (container) {
      const isAtBottom =
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + 10;
      setMostrarBoton(!isAtBottom);
    }
  };

  // Desplazarse al final del contenedor
  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Agregar el listener para el scroll
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [containerRef]);

  return (
    <button
      onClick={scrollToBottom}
      className={`absolute bottom-[15%] right-5 bg-[#171931] text-white w-12 h-12 rounded-full shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-500 z-[1000] flex items-center justify-center ${
        mostrarBoton
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-10 pointer-events-none"
      }`}
      title="Ir al final"
    >
      <i className="bx bx-down-arrow-alt text-xl"></i>
    </button>
  );
};

export default ScrollToBottomButton;

import React, { useState } from "react";
import Modal from "react-modal";

const ImageWithModal = ({ mensaje }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div>
      {/* Miniatura de la imagen en el chat */}
      <img
        className="max-w-[330px] max-h-[426px] cursor-pointer hover:opacity-90 transition-opacity duration-200"
        src={
          mensaje.ruta_archivo.startsWith("http")
            ? mensaje.ruta_archivo
            : `https://new.imporsuitpro.com/${mensaje.ruta_archivo}`
        }
        alt="Imagen en el chat"
        onClick={openModal}
      />
      <p className="pt-2">{mensaje.texto_mensaje}</p>

      {/* Modal para ver la imagen ampliada */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Imagen Ampliada"
        className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
        ariaHideApp={false}
      >
        <div
          className="relative max-w-3xl max-h-3xl p-4 bg-white rounded-lg overflow-hidden"
          style={{
            maxWidth: "90vw", // Max-width del modal
            maxHeight: "90vh", // Max-height del modal
          }}
        >
          {/* Botón para cerrar el modal */}
          <button
            className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 text-2xl"
            onClick={closeModal}
          >
            &times;
          </button>
          {/* Imagen ampliada */}
          <img
            src={`https://new.imporsuitpro.com/${mensaje.ruta_archivo}`}
            alt="Imagen Ampliada"
            className="w-full h-full object-contain"
            style={{
              maxWidth: "90vw", // Max-width del modal
              maxHeight: "90vh", // Max-height del modal
            }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ImageWithModal;

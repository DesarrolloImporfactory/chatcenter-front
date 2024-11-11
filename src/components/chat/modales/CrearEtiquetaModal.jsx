// CrearEtiquetaModal.jsx
import React, { useState } from 'react';
import Modal from 'react-modal';

const CrearEtiquetaModal = ({ isOpen, onRequestClose, onAddEtiqueta }) => {
  const [nombreEtiqueta, setNombreEtiqueta] = useState('');
  const [colorEtiqueta, setColorEtiqueta] = useState('#ff0000');

  const handleAddEtiqueta = () => {
    // Enviar la etiqueta a la función `onAddEtiqueta` que se pase como prop
    if (nombreEtiqueta.trim()) {
      onAddEtiqueta({ nombre: nombreEtiqueta, color: colorEtiqueta });
      setNombreEtiqueta('');
      setColorEtiqueta('#ff0000');
      onRequestClose(); // Cerrar el modal
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Crear Etiqueta"
      className="relative bg-white p-4 rounded shadow-lg max-w-md mx-auto my-10"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      ariaHideApp={false}
    >
      <h2 className="text-lg font-medium mb-4">Agregar etiqueta</h2>
      
      {/* Nombre de la etiqueta */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Nombre etiqueta</label>
        <input
          type="text"
          placeholder="Ingrese el nombre de la etiqueta"
          value={nombreEtiqueta}
          onChange={(e) => setNombreEtiqueta(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Selector de color de etiqueta */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Color etiqueta</label>
        <input
          type="color"
          value={colorEtiqueta}
          onChange={(e) => setColorEtiqueta(e.target.value)}
          className="w-12 h-10 p-0 border rounded cursor-pointer"
        />
      </div>

      {/* Botón para agregar la etiqueta */}
      <button
        onClick={handleAddEtiqueta}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
      >
        Agregar etiqueta
      </button>

      {/* Botón de cierre */}
      <button
        onClick={onRequestClose}
        className="mt-4 w-full bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition"
      >
        Cerrar
      </button>
    </Modal>
  );
};

export default CrearEtiquetaModal;

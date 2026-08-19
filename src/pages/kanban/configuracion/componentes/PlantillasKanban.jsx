// src/pages/kanban/configuracion/componentes/PlantillasKanban.jsx
//
// Botón "Plantillas Kanban" que abre el instalador de plantillas/asistentes.
// El modal completo (elegir plantilla, personalizar, aplicar con progreso)
// vive en ../modales/InstaladorPlantillasModal.jsx — este archivo llegó a las
// 2.100 líneas con todo adentro y quedó solo como el disparador.
//
// OJO con la estructura del render: KanbanConfig estiliza este botón desde
// afuera con selectores [&>button], así que el <button> tiene que seguir
// siendo hijo directo del componente.
import React, { useState } from "react";
import InstaladorPlantillasModal from "../modales/InstaladorPlantillasModal";

const PlantillasKanban = ({ id_configuracion, onPlantillaAplicada }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <style>{`
        .pk-trigger-btn {
          height: 36px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.15);
          background: rgba(255,255,255,.06);
          color: rgba(255,255,255,.9);
          font-size: .78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all .15s;
          white-space: nowrap;
          font-family: inherit;
          flex-shrink: 0;
        }
        .pk-trigger-btn:hover {
          background: rgba(255,255,255,.12);
          border-color: rgba(255,255,255,.28);
          transform: none;
          box-shadow: none;
        }
        .pk-trigger-btn i { color: #a5b4fc; }
      `}</style>

      <button
        className="pk-trigger-btn"
        type="button"
        onClick={() => setShowModal(true)}
      >
        <i className="bx bx-layout" style={{ fontSize: 15 }} />
        Plantillas Kanban
      </button>

      {/* Renderizado condicional a propósito: el modal carga las plantillas
          al montarse y todo su estado nace limpio en cada apertura. */}
      {showModal && (
        <InstaladorPlantillasModal
          id_configuracion={id_configuracion}
          onPlantillaAplicada={onPlantillaAplicada}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default PlantillasKanban;

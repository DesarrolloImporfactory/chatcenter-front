// src/pages/kanban/configuracion/componentes/AdaptarBot.jsx
//
// Botón "Adaptar el bot a mi negocio". El flujo completo (cuestionario →
// entendimiento → construcción) vive en ../modales/AdaptarBotModal.jsx; este
// archivo es solo el disparador, igual que PlantillasKanban.
//
// Misma regla de estructura: KanbanConfig estiliza el botón desde afuera con
// selectores [&>button], así que el <button> tiene que seguir siendo hijo
// directo del componente.
import React, { useState } from "react";
import AdaptarBotModal from "../modales/AdaptarBotModal";

const AdaptarBot = ({ id_configuracion, onTableroConstruido, destacado = false }) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <style>{`
        .ab-trigger{
          height:36px;display:inline-flex;align-items:center;gap:7px;padding:0 14px;
          border-radius:12px;font-size:.78rem;font-weight:700;cursor:pointer;
          white-space:nowrap;font-family:inherit;flex-shrink:0;transition:all .18s;
          border:1px solid rgba(103,232,249,.45);
          background:linear-gradient(135deg,rgba(34,211,238,.18),rgba(99,102,241,.18));
          color:#e0f2fe;box-shadow:0 0 0 0 rgba(34,211,238,.35);
        }
        .ab-trigger:hover{border-color:rgba(103,232,249,.8);box-shadow:0 0 0 4px rgba(34,211,238,.15);transform:translateY(-1px);}
        .ab-trigger i{color:#67e8f9;font-size:15px;}
        .ab-trigger-destacado{
          background:linear-gradient(135deg,#67e8f9 0%,#22d3ee 100%);color:#171931;border:none;
          box-shadow:0 10px 30px -8px rgba(34,211,238,.55);
        }
        .ab-trigger-destacado i{color:#171931;}
      `}</style>

      <button
        type="button"
        className={`ab-trigger ${destacado ? "ab-trigger-destacado" : ""}`}
        onClick={() => setAbierto(true)}
        title="Responde unas preguntas y la IA arma un tablero hecho para tu negocio"
      >
        <i className="bx bxs-magic-wand" />
        Adaptar el bot a mi negocio
      </button>

      {abierto && (
        <AdaptarBotModal
          id_configuracion={id_configuracion}
          onTableroConstruido={onTableroConstruido}
          onClose={() => setAbierto(false)}
        />
      )}
    </>
  );
};

export default AdaptarBot;

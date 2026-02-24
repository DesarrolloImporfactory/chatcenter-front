/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  PAGE — PlantillasPage                                    ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Reemplaza: src/pages/admintemplates/ (2 archivos grandes)║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React from "react";
// TODO: Crear PlantillasShell en features/plantillas/components
// import { PlantillasShell } from "../features/plantillas";

export default function PlantillasPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Plantillas</h1>
      {/* TODO: <PlantillasShell /> */}
      <p className="text-slate-500">
        Migrar componente de plantillas desde src/pages/admintemplates/
      </p>
    </div>
  );
}

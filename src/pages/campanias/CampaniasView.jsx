import React from "react";
import AdsLauncherTab from "../../components/metaAsd/adsboard/AdsLauncherTab";
import Header from "../Header/pageHeader";

/**
 * CampaniasView — /anuncios (submenú Productos → Campañas)
 *
 * Centro de campañas de Meta: plantillas → campaña + conjunto + anuncios
 * CTWA con un click. Las reglas automáticas viven en un modal que se abre
 * desde la barra del Lanzador (y desde el paso 4 del wizard).
 *
 * Mismo marco que las demás vistas de MainLayout (ej. Productos): tarjeta
 * blanca + PageHeader compartido.
 *
 * Piloto: visible solo para las conexiones de la lista hasta abrirlo a todos
 * (el ítem del menú usa el mismo gate).
 */

export const CAMPANIAS_PILOTO = [610, 10];

const CampaniasView = () => {
  const idConfiguracion =
    Number(localStorage.getItem("id_configuracion")) || null;
  const habilitado =
    CAMPANIAS_PILOTO.length === 0 ||
    CAMPANIAS_PILOTO.includes(idConfiguracion);

  return (
    <div className="min-h-screen bg-slate-50 w-full">
      <div
        className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl
        ring-1 ring-slate-200 flex flex-col min-h-[82vh] overflow-hidden"
      >
        <Header
          title="Campañas"
          subtitle="Crea, lanza y deja que las reglas automáticas cuiden tu presupuesto."
          icon={<i className="bx bxs-megaphone text-2xl" />}
        />

        {habilitado ? (
          <div className="px-4 sm:px-5 pb-6 flex-1 bg-slate-50/60">
            <div className="pt-4">
              <AdsLauncherTab id_configuracion={idConfiguracion} />
            </div>
          </div>
        ) : (
          <div className="flex-1 grid place-items-center px-6 py-14">
            <div className="text-center max-w-md">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 ring-1 ring-indigo-200 grid place-items-center mb-5">
                <i className="bx bxs-megaphone text-3xl text-indigo-600" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-800 mb-2">
                Campañas está en piloto
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Muy pronto podrás crear y lanzar tus campañas de Meta directo
                desde aquí, con reglas automáticas que cuidan tu presupuesto.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaniasView;

import React from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { Estilos, FONDO } from "./ui";
import {
  Nav,
  Hero,
  Personas,
  SinCon,
  Capacidades,
  AgenteIA,
  Industrias,
  ComoFunciona,
  MetaPartner,
  Integraciones,
  Planes,
  Preguntas,
  CtaFinal,
  Pie,
  BotonWhatsApp,
} from "./Sections";

/* Landing pública de ImporChat (/home).
 *
 * Orden de las secciones: primero la promesa (hero), luego la prueba de que
 * es para negocios como el del visitante (personas, sin/con), después qué
 * hace (capacidades, agente, industrias, pasos), por qué confiar (Meta,
 * integraciones) y al final el precio y las dudas. El contenido vive en
 * data.js; aquí solo se compone. */
const LandingHome = () => {
  const navigate = useNavigate();

  /* El login se abre en una pestaña nueva, como hace Funnelchat: la landing
   * se queda abierta y la app vive aparte. Si ya hay sesión, va directo. */
  const irLogin = () => {
    let destino = "/login";
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const d = jwtDecode(token);
        if (d.exp > Date.now() / 1000) destino = "/conexiones";
      } catch {
        /* token inválido: sigue al login */
      }
    }
    window.open(destino, "_blank", "noopener");
  };

  const irRegistro = () => navigate("/register");
  const irPlanes = () => navigate("/planes");

  return (
    <div className="min-h-screen overflow-x-hidden antialiased text-white" style={{ background: FONDO }}>
      <Estilos />
      <Nav onLogin={irLogin} onRegistro={irRegistro} />
      <Hero onRegistro={irRegistro} />
      <Personas />
      <SinCon />
      <Capacidades />
      <AgenteIA onRegistro={irRegistro} />
      <Industrias />
      <ComoFunciona onRegistro={irRegistro} />
      <MetaPartner />
      <Integraciones />
      <Planes onRegistro={irRegistro} onVerPlanes={irPlanes} />
      <Preguntas />
      <CtaFinal onRegistro={irRegistro} />
      <Pie />
      <BotonWhatsApp />
    </div>
  );
};

export default LandingHome;

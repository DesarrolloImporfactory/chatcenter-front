import React from "react";
import "./legal.css";

const LOGO_BLANCO =
  "https://imp-datas.s3.amazonaws.com/images/2026-09-07T21-20-06-459Z-IMPORCHAT-02.png";

/* Fecha de vigencia de los textos legales. Se cambia a mano cuando se
 * modifica el contenido: mostrar "hoy" hacía parecer que el documento
 * cambiaba a diario. */
export const FECHA_LEGAL = "26 de octubre de 2026";

/* Cabecera común de las páginas legales: logo, volver a la landing, título,
 * resumen y enlaces cruzados. */
export const LegalHero = ({ titulo, children, enlaces = [] }) => (
  <header className="hero">
    <div className="wrap">
      <div className="barra">
        <a href="/home" aria-label="Ir a ImporChat">
          <img src={LOGO_BLANCO} alt="ImporChat" />
        </a>
      </div>
      <p className="badge">Vigente desde {FECHA_LEGAL}</p>
      <h1>{titulo}</h1>
      <p className="lead">{children}</p>
      {enlaces.length > 0 && (
        <div className="links">
          {enlaces.map((e) => (
            <a key={e.href} href={e.href} className="link">
              {e.t}
            </a>
          ))}
        </div>
      )}
    </div>
  </header>
);

export const LegalPie = () => (
  <footer className="foot">
    <span>© {new Date().getFullYear()} Imporfactory · ImporChat</span>
    <span>
      <a href="/politica-privacidad">Privacidad</a>
      <a href="/condiciones-servicio">Condiciones</a>
    </span>
  </footer>
);

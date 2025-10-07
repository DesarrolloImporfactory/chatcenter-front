import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./politicas.css";

export default function PoliticasTikTokIndex() {
  useEffect(() => {
    document.title = "Políticas TikTok | ImporChat (by Imporfactory)";
  }, []);

  const hoy = new Date().toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

  return (
    <div className="legal">
      {/* HERO */}
      <header className="hero">
        <div className="wrap">
          <p className="badge">Última actualización: {hoy}</p>
          <h1>Políticas para TikTok</h1>
          <p className="lead">
            Documentos legales específicos que rigen el uso de{" "}
            <strong>ImporChat</strong> en conexión con la plataforma TikTok.
            Nuestro servicio está enfocado exclusivamente en mensajería
            empresarial y NO involucra creación ni distribución de contenido.
          </p>
          <div className="links">
            <a href="/politica-privacidad" className="link">
              Política de Privacidad General
            </a>
            <a href="/condiciones-servicio" className="link">
              Términos Generales
            </a>
            <a href="mailto:info@imporsuit.ec" className="link">
              Contacto
            </a>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="wrap">
        {/* Descripción del Servicio */}
        <section className="card">
          <h2>Sobre ImporChat para TikTok</h2>
          <p>
            <strong>ImporChat</strong> es una plataforma de mensajería
            empresarial que facilita la comunicación directa entre empresas y
            usuarios de TikTok.
          </p>

          <h3>¿Qué hacemos?</h3>
          <div className="check">
            <ul>
              <li>
                ✓ Facilitamos mensajería directa entre empresas y usuarios de
                TikTok
              </li>
              <li>
                ✓ Proporcionamos herramientas de gestión de conversaciones
              </li>
              <li>✓ Ofrecemos integración oficial con TikTok Business API</li>
              <li>
                ✓ Garantizamos cumplimiento con regulaciones de protección de
                datos
              </li>
            </ul>
          </div>

          <h3>¿Qué NO hacemos?</h3>
          <div className="check">
            <ul>
              <li>✗ NO creamos contenido para TikTok</li>
              <li>✗ NO distribuimos videos o contenido multimedia</li>
              <li>✗ NO influimos en el algoritmo de TikTok</li>
              <li>✗ NO accedemos a contenido público de usuarios</li>
              <li>✗ NO proporcionamos servicios de marketing de contenido</li>
            </ul>
          </div>
        </section>

        {/* Documentos Legales */}
        <section className="card">
          <h2>Documentos Legales para TikTok</h2>
          <p>
            Hemos desarrollado políticas específicas para el uso de nuestro
            servicio en conexión con TikTok, cumpliendo con todas las
            regulaciones aplicables.
          </p>

          <div style={{ display: "grid", gap: "20px", marginTop: "24px" }}>
            {/* Política de Privacidad TikTok */}
            <div
              className="card"
              style={{ border: "2px solid var(--brand)", margin: 0 }}
            >
              <h3 style={{ margin: "0 0 12px 0", color: "var(--brand)" }}>
                📋 Política de Privacidad para TikTok
              </h3>
              <p style={{ margin: "0 0 16px 0", color: "var(--muted)" }}>
                Explica cómo recopilamos, usamos y protegemos los datos
                personales en el contexto de nuestro servicio de mensajería para
                TikTok.
              </p>

              <h4>Incluye:</h4>
              <ul style={{ margin: "8px 0 16px 20px", fontSize: "14px" }}>
                <li>Tipos de datos que recopilamos y NO recopilamos</li>
                <li>Uso específico para mensajería (no contenido)</li>
                <li>Integración con TikTok Business API</li>
                <li>Derechos del usuario bajo GDPR y CCPA</li>
                <li>Medidas de seguridad implementadas</li>
                <li>Retención y eliminación de datos</li>
              </ul>

              <Link
                to="/politica-privacidad-tiktok"
                className="link"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  backgroundColor: "var(--brand)",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                }}
              >
                Leer Política de Privacidad TikTok →
              </Link>
            </div>

            {/* Términos de Servicio TikTok */}
            <div
              className="card"
              style={{ border: "2px solid #10b981", margin: 0 }}
            >
              <h3 style={{ margin: "0 0 12px 0", color: "#10b981" }}>
                📄 Términos de Servicio para TikTok
              </h3>
              <p style={{ margin: "0 0 16px 0", color: "var(--muted)" }}>
                Establecen las reglas, responsabilidades y limitaciones para el
                uso de ImporChat en conexión con TikTok.
              </p>

              <h4>Incluye:</h4>
              <ul style={{ margin: "8px 0 16px 20px", fontSize: "14px" }}>
                <li>Descripción detallada del servicio de mensajería</li>
                <li>Usos permitidos y prohibidos del servicio</li>
                <li>Responsabilidades del usuario y la empresa</li>
                <li>Términos de facturación y pagos</li>
                <li>Limitaciones de responsabilidad</li>
                <li>Procedimientos de suspensión y terminación</li>
              </ul>

              <Link
                to="/terminos-servicio-tiktok"
                className="link"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  backgroundColor: "#10b981",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                }}
              >
                Leer Términos de Servicio TikTok →
              </Link>
            </div>
          </div>
        </section>

        {/* Cumplimiento */}
        <section className="card">
          <h2>Cumplimiento Normativo</h2>

          <p>
            Nuestras políticas para TikTok han sido diseñadas para cumplir con:
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            <div
              style={{
                padding: "16px",
                border: "1px solid var(--line)",
                borderRadius: "8px",
              }}
            >
              <h4 style={{ margin: "0 0 8px 0" }}>🇪🇺 Regulaciones Europeas</h4>
              <ul style={{ margin: 0, fontSize: "14px" }}>
                <li>GDPR (Reglamento General de Protección de Datos)</li>
                <li>ePrivacy Directive</li>
                <li>Digital Services Act</li>
              </ul>
            </div>

            <div
              style={{
                padding: "16px",
                border: "1px solid var(--line)",
                borderRadius: "8px",
              }}
            >
              <h4 style={{ margin: "0 0 8px 0" }}>🇺🇸 Regulaciones de EE.UU.</h4>
              <ul style={{ margin: 0, fontSize: "14px" }}>
                <li>CCPA (California Consumer Privacy Act)</li>
                <li>CAN-SPAM Act</li>
                <li>COPPA (Children's Online Privacy)</li>
              </ul>
            </div>

            <div
              style={{
                padding: "16px",
                border: "1px solid var(--line)",
                borderRadius: "8px",
              }}
            >
              <h4 style={{ margin: "0 0 8px 0" }}>
                🇪🇨 Regulaciones de Ecuador
              </h4>
              <ul style={{ margin: 0, fontSize: "14px" }}>
                <li>Ley de Protección de Datos Personales</li>
                <li>Ley de Comercio Electrónico</li>
                <li>Regulaciones de ARCOTEL</li>
              </ul>
            </div>

            <div
              style={{
                padding: "16px",
                border: "1px solid var(--line)",
                borderRadius: "8px",
              }}
            >
              <h4 style={{ margin: "0 0 8px 0" }}>📱 Políticas de TikTok</h4>
              <ul style={{ margin: 0, fontSize: "14px" }}>
                <li>TikTok Business Terms</li>
                <li>TikTok API Guidelines</li>
                <li>Community Guidelines</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section className="card">
          <h2>Contacto Legal</h2>

          <p>Para consultas sobre estas políticas específicas de TikTok:</p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            <div>
              <h4>📧 Email Principal</h4>
              <p>
                <strong>info@imporsuit.ec</strong>
              </p>
            </div>

            <div>
              <h4>🛡️ Delegado de Protección de Datos</h4>
              <p>
                <strong>dpo@imporsuit.ec</strong>
              </p>
            </div>

            <div>
              <h4>⚖️ Consultas Legales</h4>
              <p>
                Usar asunto: <em>"TikTok Legal"</em>
              </p>
            </div>

            <div>
              <h4>🕒 Tiempo de Respuesta</h4>
              <p>
                <strong>Máximo 30 días calendario</strong>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

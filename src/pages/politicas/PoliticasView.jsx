import { useEffect } from "react";
import "./politicas.css";

export default function PoliticasView() {
  useEffect(() => {
    document.title = "Política de Privacidad | ImporChat (by Imporfactory)";
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
          <h1>Política de Privacidad</h1>
          <p className="lead">
            Esta Política explica cómo <strong>Imporfactory</strong>{" "}
            (“nosotros”) trata los datos cuando usted usa{" "}
            <strong>ImporChat</strong> y su módulo <strong>Calendario</strong>.
          </p>
          <div className="links">
            <a href="/condiciones-servicio" className="link">
              Condiciones del Servicio
            </a>
            <a href="info@imporfactoryusa.com" className="link">
              Contacto
            </a>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="wrap">
        {/* Índice */}
        <nav className="toc card">
          <h2>Contenido</h2>
          <ol>
            <li>
              <a href="#responsable">Responsable</a>
            </li>
            <li>
              <a href="#informacion">Información que recopilamos</a>
            </li>
            <li>
              <a href="#scopes">Permisos (scopes) de Google</a>
            </li>
            <li>
              <a href="#finalidades">Finalidades</a>
            </li>
            <li>
              <a href="#base-legal">Base legal</a>
            </li>
            <li>
              <a href="#conservacion">Conservación</a>
            </li>
            <li>
              <a href="#seguridad">Seguridad</a>
            </li>
            <li>
              <a href="#comparticion">Compartición</a>
            </li>
            <li>
              <a href="#derechos">Sus derechos</a>
            </li>
            <li>
              <a href="#internacional">Transferencias internacionales</a>
            </li>
            <li>
              <a href="#menores">Menores</a>
            </li>
            <li>
              <a href="#cambios">Cambios</a>
            </li>
            <li>
              <a href="#contacto">Contacto</a>
            </li>
          </ol>
        </nav>

        <section id="responsable">
          <h2>1. Responsable del tratamiento</h2>
          <p>
            <strong>Imporfactory</strong>
            <br />
            Quito, Ecuador
            <br />
            Correo:{" "}
            <a href="mailto:info@imporfactoryusa.com">
              info@imporfactoryusa.com
            </a>
            <br />
            Sistema/App: <strong>ImporChat (by Imporfactory)</strong>
          </p>
        </section>

        <section id="informacion">
          <h2>2. Información que recopilamos</h2>
          <ul className="check">
            <li>
              <strong>Datos de cuenta:</strong> nombre, correo y foto de perfil
              (Google OAuth).
            </li>
            <li>
              <strong>Datos de calendario (si autoriza):</strong> eventos,
              metadatos y disponibilidad.
            </li>
            <li>
              <strong>Datos técnicos:</strong> IP, dispositivo/navegador,
              identificadores de sesión y registros de actividad.
            </li>
          </ul>
        </section>

        <section id="scopes" className="card">
          <h2>3. Permisos (scopes) de Google que solicitamos</h2>
          <p>
            Usamos únicamente los permisos necesarios para operar el Calendario
            en ImporChat:
          </p>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Scope</th>
                  <th>Uso</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>openid</code>
                  </td>
                  <td>Identidad y sesión segura.</td>
                </tr>
                <tr>
                  <td>
                    <code>https://www.googleapis.com/auth/userinfo.email</code>
                  </td>
                  <td>Obtener su correo verificado.</td>
                </tr>
                <tr>
                  <td>
                    <code>
                      https://www.googleapis.com/auth/userinfo.profile
                    </code>
                  </td>
                  <td>Obtener su nombre y foto de perfil.</td>
                </tr>
                <tr>
                  <td>
                    <code>https://www.googleapis.com/auth/calendar</code>
                  </td>
                  <td>
                    Leer y gestionar eventos de su calendario cuando usted lo
                    solicita.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="note">
            Puede revisar y revocar accesos desde{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
            >
              su cuenta de Google
            </a>
            .
          </p>
        </section>

        <section id="finalidades">
          <h2>4. Finalidades del tratamiento</h2>
          <ul className="check">
            <li>Autenticar su cuenta y permitir el acceso a ImporChat.</li>
            <li>
              Sincronizar, mostrar y gestionar eventos del calendario bajo su
              acción.
            </li>
            <li>
              Mejorar seguridad, prevenir fraude y cumplir obligaciones legales.
            </li>
            <li>Brindar soporte y resolver incidencias.</li>
          </ul>
        </section>

        <section id="base-legal">
          <h2>5. Base legal</h2>
          <p>
            Tratamos datos en base a: (i) su consentimiento (p. ej., acceso al
            calendario); (ii) la ejecución del contrato (provisión del
            servicio); y (iii) interés legítimo (seguridad y mejora continua).
          </p>
        </section>

        <section id="conservacion">
          <h2>6. Conservación</h2>
          <ul className="check">
            <li>
              <strong>Mensajes y archivos en ImporChat:</strong> se conservan
              por un máximo de
              <strong> 6 meses (180 días)</strong> desde su recepción, tras lo
              cual se eliminan automáticamente de forma definitiva en nuestras
              bases de datos operativas.
            </li>
            <li>
              <strong>Registros técnicos (logs) y seguridad:</strong> podemos
              conservar resúmenes y evidencias de acceso o eventos por un
              período adicional razonable para
              <em>auditoría, prevención de fraude y seguridad</em>, o cuando sea
              requerido por ley.
            </li>
            <li>
              <strong>Backups operativos:</strong> se mantienen por ciclos de
              corta duración y se rotan de manera periódica. El contenido
              eliminado puede subsistir temporalmente hasta la próxima rotación.
            </li>
            <li>
              <strong>Excepciones legales:</strong> cuando exista una obligación
              legal, requerimiento de autoridad o disputa vigente, podremos
              conservar la información estrictamente necesaria hasta la
              resolución del caso.
            </li>
          </ul>
        </section>

        <section id="seguridad">
          <h2>7. Seguridad</h2>
          <p>
            Aplicamos cifrado en tránsito (TLS), cifrado de tokens en reposo,
            controles de acceso y auditoría. Monitorizamos uso indebido y
            tomamos medidas ante riesgos.
          </p>
        </section>

        <section id="comparticion">
          <h2>8. Compartición de datos</h2>
          <p>
            No vendemos datos. Compartimos con proveedores que operan
            infraestructura, envío de correos o analítica bajo acuerdos de
            confidencialidad y mínima necesidad. Podemos revelar datos por
            exigencias legales.
          </p>
        </section>

        <section id="derechos" className="card">
          <h2>9. Sus derechos</h2>
          <ul className="check">
            <li>
              Acceso, rectificación, eliminación, restricción u oposición.
            </li>
            <li>Revocar permisos de Google desde su panel de cuenta.</li>
            <li>
              Contactar a{" "}
              <a href="mailto:info@imporfactoryusa.com">
                info@imporfactoryusa.com
              </a>
              .
            </li>
          </ul>
        </section>

        <section id="internacional">
          <h2>10. Transferencias internacionales</h2>
          <p>
            Puede haber tratamiento fuera de su país. Aplicamos salvaguardas
            adecuadas cuando corresponde.
          </p>
        </section>

        <section id="menores">
          <h2>11. Menores</h2>
          <p>No dirigimos el servicio a menores de 13 años.</p>
        </section>

        <section id="cambios">
          <h2>12. Cambios a esta política</h2>
          <p>
            Publicaremos actualizaciones en esta misma página con fecha de
            vigencia.
          </p>
        </section>

        <section id="contacto">
          <h2>13. Contacto</h2>
          <p>
            Escríbanos a{" "}
            <a href="mailto:info@imporfactoryusa.com">
              info@imporfactoryusa.com
            </a>
            .
          </p>
        </section>

        <footer className="foot">
          © {new Date().getFullYear()} Imporfactory
        </footer>
      </main>
    </div>
  );
}

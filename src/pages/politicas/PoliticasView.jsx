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
            <a href="/eliminacion-datos" className="link">
              Eliminación de datos
            </a>
            <a href="mailto:info@imporfactoryusa.com" className="link">
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
              <a href="#scopes">Permisos que solicitamos</a>
            </li>
            <li>
              <a href="#finalidades">Finalidades</a>
            </li>
            <li>
              <a href="#roles">Quién responde por cada dato</a>
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
          <p>
            ImporChat trata dos clases de información muy distintas, y conviene
            separarlas porque las reglas que se les aplican no son las mismas.
          </p>

          <h3>2.1. Datos del negocio que contrata ImporChat</h3>
          <ul className="check">
            <li>
              <strong>Datos de cuenta:</strong> nombre, correo, foto de perfil y
              datos de los subusuarios que el negocio da de alta.
            </li>
            <li>
              <strong>Datos de facturación:</strong> los necesarios para
              gestionar la suscripción. Los datos de la tarjeta los procesa
              Stripe; nosotros no los almacenamos.
            </li>
            <li>
              <strong>Credenciales de conexión:</strong> los tokens de acceso a
              las plataformas que el negocio conecta, guardados cifrados.
            </li>
            <li>
              <strong>Datos técnicos:</strong> IP, dispositivo, navegador,
              identificadores de sesión y registros de actividad.
            </li>
          </ul>

          <h3>2.2. Datos de las personas que escriben al negocio</h3>
          <p>
            Cuando alguien contacta a un negocio por un canal conectado,
            recibimos y almacenamos los datos de esa conversación por cuenta del
            negocio.
          </p>
          <ul className="check">
            <li>
              <strong>Mensajes:</strong> el contenido enviado y recibido, con
              sus archivos adjuntos, imágenes, audios y documentos.
            </li>
            <li>
              <strong>Comentarios:</strong> los publicados en las publicaciones
              de las páginas de Facebook conectadas, con su autor y el hilo de
              respuestas.
            </li>
            <li>
              <strong>Datos de contacto:</strong> nombre o nombre de usuario,
              número de teléfono en el caso de WhatsApp, foto de perfil pública
              e identificador asignado por la plataforma de origen.
            </li>
            <li>
              <strong>Metadatos:</strong> fecha y hora, canal de procedencia y
              estado de lectura o entrega.
            </li>
          </ul>
          <p className="note">
            Estos datos llegan porque la persona inició la conversación o
            comentó públicamente. No los compramos, no los importamos de
            terceros y no los cruzamos entre negocios distintos: cada cuenta ve
            únicamente sus propias conversaciones. Si usted escribió a un
            negocio y quiere que eliminemos su rastro, puede pedirlo en{" "}
            <a href="/eliminacion-datos">Eliminación de datos</a>.
          </p>
        </section>

        <section id="scopes" className="card">
          <h2>3. Permisos que solicitamos</h2>
          <p>
            Pedimos únicamente los permisos necesarios para prestar cada
            función, y solo sobre las cuentas que el negocio conecta
            expresamente. Ninguno se usa para publicidad dirigida, elaboración
            de perfiles ajenos al servicio ni venta de datos.
          </p>

          <h3>3.1. Meta (Facebook, Messenger, Instagram y WhatsApp)</h3>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Permiso</th>
                  <th>Para qué lo usamos</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>pages_show_list</code>
                  </td>
                  <td>
                    Mostrarle la lista de sus páginas para que elija cuál
                    conectar.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>pages_messaging</code>
                  </td>
                  <td>
                    Recibir en la bandeja los mensajes que le escriben a la
                    página y responderlos desde ImporChat.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>pages_manage_metadata</code>
                  </td>
                  <td>
                    Suscribir la página a los webhooks, que es lo que permite
                    que los mensajes lleguen en tiempo real.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>pages_read_engagement</code>
                  </td>
                  <td>
                    Leer las publicaciones de la página y los comentarios que
                    recibe, incluido el nombre de quien comenta, para mostrarlos
                    en la bandeja de comentarios.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>pages_manage_engagement</code>
                  </td>
                  <td>
                    Publicar respuestas a esos comentarios y ocultarlos cuando
                    el negocio lo decide.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>instagram_basic</code>,{" "}
                    <code>instagram_manage_messages</code>
                  </td>
                  <td>
                    Recibir y responder los mensajes directos de la cuenta de
                    Instagram vinculada a la página.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>whatsapp_business_messaging</code>,{" "}
                    <code>whatsapp_business_management</code>
                  </td>
                  <td>
                    Recibir y enviar mensajes del número de WhatsApp Business y
                    gestionar sus plantillas.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>ads_read</code>, <code>ads_management</code>
                  </td>
                  <td>
                    Mostrar el rendimiento de las campañas del negocio y enviar
                    eventos de conversión de sus propias ventas, si activa el
                    módulo de anuncios.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="note">
            Puede retirar estos accesos en cualquier momento desde{" "}
            <strong>
              Configuración de Facebook &rarr; Integraciones empresariales
            </strong>
            .
          </p>

          <h3>3.2. TikTok</h3>
          <p>
            Recibimos y enviamos los mensajes de la cuenta de empresa que el
            negocio conecta, con el alcance mínimo necesario para operar la
            bandeja.
          </p>

          <h3>3.3. Google</h3>
          <p>
            Solo si el negocio activa el módulo de calendario:
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
              Entregar en la bandeja del negocio los mensajes y comentarios que
              recibe, y enviar sus respuestas a la plataforma de origen.
            </li>
            <li>
              Organizar el trabajo del negocio sobre esas conversaciones:
              asignarlas a agentes, etiquetarlas y moverlas por su embudo de
              ventas.
            </li>
            <li>
              Sincronizar, mostrar y gestionar eventos del calendario bajo su
              acción, si activa ese módulo.
            </li>
            <li>
              Mejorar seguridad, prevenir fraude y cumplir obligaciones legales.
            </li>
            <li>Brindar soporte y resolver incidencias.</li>
          </ul>
          <p className="note">
            <strong>Lo que no hacemos:</strong> no vendemos ni cedemos datos a
            terceros, no los usamos para segmentación publicitaria, no
            entrenamos modelos con el contenido de las conversaciones y no
            cruzamos la información de un negocio con la de otro.
          </p>
        </section>

        <section id="roles" className="card">
          <h2>4.b. Quién responde por cada dato</h2>
          <p>
            Respecto de los datos de las personas que escriben a un negocio
            (punto 2.2), <strong>el negocio es el responsable</strong> del
            tratamiento e <strong>Imporfactory actúa como encargado</strong>:
            los tratamos siguiendo sus instrucciones y únicamente para prestarle
            el servicio.
          </p>
          <p>
            Esto importa en la práctica: si usted escribió a un negocio y quiere
            ejercer sus derechos, puede dirigirse a ese negocio o a nosotros
            directamente en{" "}
            <a href="/eliminacion-datos">Eliminación de datos</a>. Atenderemos
            su solicitud en cualquiera de los dos casos.
          </p>
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
              <strong>Acceso, rectificación, eliminación, restricción u
              oposición</strong> sobre los datos que tratamos de usted.
            </li>
            <li>
              <strong>Solicitar la eliminación de sus datos</strong> siguiendo
              el procedimiento de{" "}
              <a href="/eliminacion-datos">Eliminación de datos</a>, tanto si es
              un negocio con cuenta como si escribió o comentó a uno.
            </li>
            <li>
              <strong>Retirar los accesos concedidos</strong> en cualquier
              momento: los de Meta desde{" "}
              <em>
                Configuración de Facebook &rarr; Integraciones empresariales
              </em>
              , y los de Google desde{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
              >
                el panel de su cuenta
              </a>
              . Al retirarlos dejamos de recibir datos nuevos de inmediato.
            </li>
            <li>
              <strong>Escribirnos</strong> a{" "}
              <a href="mailto:info@imporfactoryusa.com">
                info@imporfactoryusa.com
              </a>{" "}
              para cualquiera de los anteriores. Respondemos en un máximo de 5
              días hábiles.
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

import { useEffect } from "react";
import "./condiciones.css";

export default function CondicionesView() {
  useEffect(() => {
    document.title = "Condiciones del Servicio | ImporChat (by Imporfactory)";
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
          <h1>Condiciones del Servicio</h1>
          <p className="lead">
            Al usar <strong>ImporChat</strong> de <strong>Imporfactory</strong>,
            usted acepta estas Condiciones. Lea también la{" "}
            <a className="link" href="/politica-privacidad">
              Política de Privacidad
            </a>
            .
          </p>
          <div className="links">
            <a href="/politica-privacidad" className="link">
              Política de Privacidad
            </a>
            <a href="mailto:info@imporfactoryusa.com" className="link">
              Contacto
            </a>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="wrap">
        <section>
          <h2>1. Descripción del servicio</h2>
          <p>
            ImporChat es una herramienta de uso empresarial que centraliza en
            una sola bandeja las conversaciones que un negocio mantiene con sus
            clientes a través de distintos canales de mensajería, y añade
            funciones de gestión comercial sobre esas conversaciones.
          </p>
          <ul className="check">
            <li>
              Recepción y envío de mensajes de WhatsApp Business, Facebook
              Messenger, Instagram Direct y TikTok.
            </li>
            <li>
              Lectura y respuesta de comentarios en las publicaciones de las
              páginas de Facebook que el negocio conecta.
            </li>
            <li>
              Asignación de conversaciones a agentes, embudo de ventas tipo
              kanban, plantillas y automatizaciones.
            </li>
            <li>
              Gestión de pedidos, catálogo e integraciones logísticas, y un
              módulo opcional de calendario con Google.
            </li>
          </ul>
          <p className="note">
            ImporChat es un producto independiente. No está afiliado,
            patrocinado ni respaldado por Meta Platforms, TikTok ni Google.
          </p>
        </section>

        <section>
          <h2>2. Aceptación</h2>
          <p>
            Al acceder o usar el servicio, declara que leyó y acepta estas
            Condiciones y la Política de Privacidad. Si no está de acuerdo, no
            utilice el servicio.
          </p>
        </section>

        <section>
          <h2>3. Requisitos y cuenta</h2>
          <ul className="check">
            <li>Mayoría de edad legal en su jurisdicción.</li>
            <li>Responsabilidad sobre confidencialidad de sus credenciales.</li>
            <li>Información veraz y actualizada.</li>
          </ul>
        </section>

        <section className="card">
          <h2>4. Permisos y datos</h2>
          <p>
            Para funcionar, ImporChat se conecta a plataformas de terceros
            mediante autorizaciones que usted otorga expresamente. Solicitamos
            los permisos estrictamente necesarios para prestar las funciones
            descritas.
          </p>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Plataforma</th>
                  <th>Para qué la usamos</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Meta (Facebook, Messenger, Instagram, WhatsApp)</td>
                  <td>
                    Recibir y enviar mensajes de las páginas y cuentas que usted
                    conecta, y leer y responder los comentarios de sus
                    publicaciones.
                  </td>
                </tr>
                <tr>
                  <td>TikTok</td>
                  <td>Recibir y enviar mensajes de su cuenta de empresa.</td>
                </tr>
                <tr>
                  <td>Google</td>
                  <td>Inicio de sesión y módulo de calendario, si lo activa.</td>
                </tr>
                <tr>
                  <td>Stripe</td>
                  <td>Procesamiento de pagos de la suscripción.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>
              No vendemos ni cedemos a terceros los datos obtenidos de estas
              plataformas
            </strong>
            , ni los empleamos para publicidad, elaboración de perfiles ajenos
            al servicio o venta de bases de datos.
          </p>
          <p>
            Usted puede revocar cualquier conexión en el momento que quiera,
            desde la propia plataforma o desde ImporChat. Para eliminar los
            datos ya almacenados, consulte{" "}
            <a href="/eliminacion-datos">Eliminación de datos</a>.
          </p>
        </section>

        <section>
          <h2>5. Planes, pagos y facturación</h2>
          <p>
            Algunas funciones requieren suscripción o pagos procesados por
            terceros (p. ej., Stripe). Los importes, ciclos, impuestos y
            política de reembolsos se muestran antes del pago.
          </p>
        </section>

        <section>
          <h2>6. Uso aceptable</h2>
          <ul className="check">
            <li>Prohibido uso ilícito, spam, abuso o elusión de seguridad.</li>
            <li>
              No ceder, sublicenciar ni revender el acceso sin autorización.
            </li>
          </ul>
        </section>

        <section>
          <h2>7. Propiedad intelectual</h2>
          <p>
            El software, marcas y contenidos son de sus titulares. Usted
            conserva derechos sobre su contenido y otorga licencias necesarias
            para operar el servicio.
          </p>
        </section>

        <section>
          <h2>8. Disponibilidad y soporte</h2>
          <p>
            Procuramos alta disponibilidad, pero pueden existir interrupciones
            programadas o no. Ofrecemos soporte razonable por canales oficiales.
          </p>
        </section>

        <section>
          <h2>9. Garantías y responsabilidad</h2>
          <p>
            El servicio se ofrece “tal cual” y “según disponibilidad”. En lo
            permitido por la ley, se renuncian garantías implícitas y no se
            asume responsabilidad por daños indirectos, especiales o
            consecuentes.
          </p>
        </section>

        <section>
          <h2>10. Suspensión y terminación</h2>
          <p>
            Podemos suspender o terminar el acceso ante incumplimientos, riesgos
            de seguridad o por mandato legal. Usted puede dejar de usar el
            servicio y solicitar eliminación de datos conforme a la Política de
            Privacidad.
          </p>
        </section>

        <section>
          <h2>11. Modificaciones</h2>
          <p>
            Podremos actualizar estas Condiciones. Publicaremos la versión
            vigente con su fecha de actualización. El uso continuado implica
            aceptación.
          </p>
        </section>

        <section>
          <h2>12. Ley aplicable y jurisdicción</h2>
          <p>
            Se rigen por las leyes de la República del Ecuador. Las
            controversias se someterán a los tribunales de Guayaquil, salvo
            disposición imperativa distinta.
          </p>
        </section>

        <section>
          <h2>13. Conservación y eliminación automática de mensajes</h2>
          <p>
            Para optimizar rendimiento y costos, ImporChat elimina de forma
            automática los mensajes y archivos con una antigüedad mayor a 6
            meses (180 días) en las bandejas del sistema. Esta medida no
            modifica el tratamiento realizado por las plataformas de origen
            (WhatsApp, Instagram, Facebook, TikTok), que se rigen por sus
            propias políticas.
          </p>
          <p>
            Usted es responsable de exportar o respaldar la información que
            desee conservar por períodos superiores. Podemos conservar ciertos
            registros mínimos (p. ej., auditoría y seguridad) por tiempo
            adicional cuando exista obligación legal o interés legítimo
            justificado.
          </p>
        </section>

        <section>
          <h2>14. Contacto</h2>
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

import { useEffect } from "react";
import { LegalHero, LegalPie } from "../legal/LegalHero";

export default function CondicionesView() {
  useEffect(() => {
    document.title = "Condiciones del Servicio | ImporChat (by Imporfactory)";
  }, []);

  return (
    <div className="legal">
      <LegalHero
        titulo="Condiciones del Servicio"
        enlaces={[
          { href: "/politica-privacidad", t: "Política de Privacidad" },
          { href: "mailto:info@imporfactoryusa.com", t: "Contacto" },
        ]}
      >
        Al usar <strong>ImporChat</strong> de <strong>Imporfactory</strong>,
        usted acepta estas Condiciones. Lea también la{" "}
        <a href="/politica-privacidad">Política de Privacidad</a>.
      </LegalHero>

      <main className="wrap">
        <nav className="toc card">
          <h2>Contenido</h2>
          <ol>
            <li><a href="#servicio">Descripción del servicio</a></li>
            <li><a href="#aceptacion">Aceptación</a></li>
            <li><a href="#cuenta">Requisitos y cuenta</a></li>
            <li><a href="#permisos">Permisos y datos</a></li>
            <li><a href="#pagos">Planes, pagos y facturación</a></li>
            <li><a href="#uso">Uso aceptable</a></li>
            <li><a href="#propiedad">Propiedad intelectual</a></li>
            <li><a href="#disponibilidad">Disponibilidad y soporte</a></li>
            <li><a href="#garantias">Garantías y responsabilidad</a></li>
            <li><a href="#terminacion">Suspensión y terminación</a></li>
            <li><a href="#modificaciones">Modificaciones</a></li>
            <li><a href="#ley">Ley aplicable</a></li>
            <li><a href="#conservacion">Conservación de mensajes</a></li>
            <li><a href="#contacto">Contacto</a></li>
          </ol>
        </nav>

        <section id="servicio">
          <h2>1. Descripción del servicio</h2>
          <p>
            ImporChat es una herramienta de uso empresarial que centraliza en
            una sola bandeja las conversaciones que un negocio mantiene con sus
            clientes a través de distintos canales de mensajería, y añade
            funciones de gestión comercial y automatización sobre esas
            conversaciones.
          </p>
          <ul className="check">
            <li>
              Recepción y envío de mensajes de WhatsApp Business, Facebook
              Messenger e Instagram Direct.
            </li>
            <li>
              Lectura y respuesta de comentarios en las publicaciones de las
              páginas de Facebook que el negocio conecta.
            </li>
            <li>
              Agente de inteligencia artificial que responde en nombre del
              negocio con la información que el propio negocio le entrega.
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
            patrocinado ni respaldado por Meta Platforms ni Google. Imporfactory
            es Meta Business Partner y opera sobre la API oficial de WhatsApp
            Business Platform.
          </p>
        </section>

        <section id="aceptacion">
          <h2>2. Aceptación</h2>
          <p>
            Al acceder o usar el servicio, declara que leyó y acepta estas
            Condiciones y la Política de Privacidad. Si no está de acuerdo, no
            utilice el servicio.
          </p>
        </section>

        <section id="cuenta">
          <h2>3. Requisitos y cuenta</h2>
          <ul className="check">
            <li>Mayoría de edad legal en su jurisdicción.</li>
            <li>
              Responsabilidad sobre la confidencialidad de sus credenciales y
              sobre lo que hagan los subusuarios que dé de alta.
            </li>
            <li>Información veraz y actualizada.</li>
          </ul>
        </section>

        <section id="permisos" className="card">
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
                  <td>Google</td>
                  <td>Inicio de sesión y módulo de calendario, si lo activa.</td>
                </tr>
                <tr>
                  <td>Stripe</td>
                  <td>Procesamiento de pagos de la suscripción.</td>
                </tr>
                <tr>
                  <td>Proveedores de IA (OpenAI, Anthropic)</td>
                  <td>
                    Generar las respuestas del agente IA. No se usan las
                    conversaciones para entrenar modelos.
                  </td>
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

        <section id="pagos">
          <h2>5. Planes, pagos y facturación</h2>
          <p>
            El servicio se contrata por suscripción mensual, semestral o anual,
            con los límites de negocios conectados y usuarios de cada plan. Los
            pagos los procesa Stripe. Los importes, ciclos e impuestos se
            muestran antes del pago.
          </p>
          <ul className="check">
            <li>
              El período de prueba es gratuito y no exige tarjeta. Al terminar,
              el acceso se pausa hasta que se activa un plan.
            </li>
            <li>
              La suscripción se renueva automáticamente al final de cada ciclo
              salvo cancelación previa. Puede cancelar en cualquier momento y
              conserva el acceso hasta el fin del ciclo pagado.
            </li>
            <li>
              Los cobros ya realizados no son reembolsables, salvo error
              imputable a Imporfactory o disposición legal en contrario.
            </li>
          </ul>
        </section>

        <section id="uso">
          <h2>6. Uso aceptable</h2>
          <ul className="check">
            <li>
              Prohibido el uso ilícito, el spam, el abuso o la elusión de
              medidas de seguridad.
            </li>
            <li>
              Los envíos masivos deben respetar las políticas de WhatsApp
              Business y dirigirse a contactos que hayan aceptado recibirlos.
              El bloqueo de un número por incumplirlas es responsabilidad del
              negocio.
            </li>
            <li>
              El negocio es responsable de la información que entrega al agente
              IA y de supervisar las respuestas que este da en su nombre.
            </li>
            <li>
              No ceder, sublicenciar ni revender el acceso sin autorización.
            </li>
          </ul>
        </section>

        <section id="propiedad">
          <h2>7. Propiedad intelectual</h2>
          <p>
            El software, marcas y contenidos de ImporChat son de Imporfactory o
            de sus titulares. Usted conserva los derechos sobre su contenido y
            nos otorga la licencia necesaria para operar el servicio.
          </p>
        </section>

        <section id="disponibilidad">
          <h2>8. Disponibilidad y soporte</h2>
          <p>
            Procuramos alta disponibilidad, pero pueden existir interrupciones
            programadas o no, incluidas las que dependan de Meta, Google o los
            proveedores de IA. Ofrecemos soporte por los canales oficiales en
            horario laboral de Ecuador.
          </p>
        </section>

        <section id="garantias">
          <h2>9. Garantías y responsabilidad</h2>
          <p>
            El servicio se ofrece «tal cual» y «según disponibilidad». En lo
            permitido por la ley, se renuncia a las garantías implícitas y no se
            asume responsabilidad por daños indirectos, especiales o
            consecuentes, ni por decisiones comerciales tomadas a partir de las
            respuestas del agente IA.
          </p>
        </section>

        <section id="terminacion">
          <h2>10. Suspensión y terminación</h2>
          <p>
            Podemos suspender o terminar el acceso ante incumplimientos, falta
            de pago, riesgos de seguridad o por mandato legal. Usted puede dejar
            de usar el servicio y solicitar la eliminación de sus datos conforme
            a la Política de Privacidad.
          </p>
        </section>

        <section id="modificaciones">
          <h2>11. Modificaciones</h2>
          <p>
            Podremos actualizar estas Condiciones. Publicaremos la versión
            vigente con su fecha de actualización. El uso continuado implica
            aceptación.
          </p>
        </section>

        <section id="ley">
          <h2>12. Ley aplicable y jurisdicción</h2>
          <p>
            Estas Condiciones se rigen por las leyes de la República del
            Ecuador. Las controversias se someterán a los tribunales de
            Guayaquil, salvo disposición imperativa distinta.
          </p>
        </section>

        <section id="conservacion">
          <h2>13. Conservación y eliminación automática de mensajes</h2>
          <p>
            Para optimizar rendimiento y costos, ImporChat elimina de forma
            automática los mensajes y archivos con una antigüedad mayor a 6
            meses (180 días) en las bandejas del sistema. Esta medida no
            modifica el tratamiento realizado por las plataformas de origen
            (WhatsApp, Instagram, Facebook), que se rigen por sus propias
            políticas.
          </p>
          <p>
            Usted es responsable de exportar o respaldar la información que
            desee conservar por períodos superiores. Podemos conservar ciertos
            registros mínimos (auditoría y seguridad) por tiempo adicional
            cuando exista obligación legal o interés legítimo justificado.
          </p>
        </section>

        <section id="contacto">
          <h2>14. Contacto</h2>
          <p>
            Escríbanos a{" "}
            <a href="mailto:info@imporfactoryusa.com">
              info@imporfactoryusa.com
            </a>
            .
          </p>
        </section>

        <LegalPie />
      </main>
    </div>
  );
}

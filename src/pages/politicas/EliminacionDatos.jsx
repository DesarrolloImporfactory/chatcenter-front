import { useEffect } from "react";
import "./politicas.css";

/**
 * Instrucciones de eliminación de datos de usuario.
 *
 * Meta exige en la configuración de la app una URL de eliminación de datos, y
 * la que había apuntaba a facebook.com. Sin una dirección real donde mandar a
 * la gente, las solicitudes de baja se acumulan en el panel de alertas de la
 * app (había una marcada como urgente) y bloquean la verificación de acceso.
 *
 * La lee sobre todo gente que NO es cliente nuestro: personas que escribieron
 * o comentaron a un negocio que usa ImporChat y quieren que borremos su
 * rastro. Por eso el texto separa los dos casos y evita jerga: si un revisor
 * de Meta no encuentra en esta página un procedimiento concreto y un correo
 * al que escribir, la da por inválida.
 */
export default function EliminacionDatos() {
  useEffect(() => {
    document.title = "Eliminación de datos | ImporChat (by Imporfactory)";
  }, []);

  const hoy = new Date().toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

  return (
    <div className="legal">
      <header className="hero">
        <div className="wrap">
          <p className="badge">Última actualización: {hoy}</p>
          <h1>Eliminación de datos</h1>
          <p className="lead">
            Cómo solicitar que <strong>ImporChat</strong> elimine los datos que
            conserva sobre usted, y qué ocurre después de pedirlo.
          </p>
          <div className="links">
            <a href="/politica-privacidad" className="link">
              Política de Privacidad
            </a>
            <a href="/condiciones-servicio" className="link">
              Condiciones del Servicio
            </a>
            <a href="mailto:info@imporfactoryusa.com" className="link">
              Contacto
            </a>
          </div>
        </div>
      </header>

      <main className="wrap">
        <nav className="toc card">
          <h2>Contenido</h2>
          <ol>
            <li>
              <a href="#quien">Identifique su caso</a>
            </li>
            <li>
              <a href="#usuario">Escribió o comentó a un negocio</a>
            </li>
            <li>
              <a href="#negocio">Es el negocio que usa ImporChat</a>
            </li>
            <li>
              <a href="#que-borramos">Qué eliminamos</a>
            </li>
            <li>
              <a href="#que-conservamos">Qué conservamos y por qué</a>
            </li>
            <li>
              <a href="#plazos">Plazos y confirmación</a>
            </li>
          </ol>
        </nav>

        <section id="quien">
          <h2>1. Identifique su caso</h2>
          <p>
            ImporChat es una herramienta que los negocios usan para atender a
            sus clientes. Según su relación con la plataforma, el procedimiento
            cambia:
          </p>
          <ul className="check">
            <li>
              <strong>Escribió o comentó a un negocio</strong> por Facebook
              Messenger, Instagram, WhatsApp o TikTok, y ese negocio usa
              ImporChat. Vaya al <a href="#usuario">punto 2</a>.
            </li>
            <li>
              <strong>Es el negocio</strong>, es decir, tiene una cuenta
              contratada en ImporChat. Vaya al{" "}
              <a href="#negocio">punto 3</a>.
            </li>
          </ul>
        </section>

        <section id="usuario" className="card">
          <h2>2. Escribió o comentó a un negocio</h2>
          <p>
            Si conversó con un negocio y quiere que se eliminen sus datos, tiene
            dos vías. Puede usar cualquiera de las dos, o las dos.
          </p>

          <h3>Vía A — Pídanoslo directamente</h3>
          <p>
            Envíe un correo a{" "}
            <a href="mailto:info@imporfactoryusa.com">
              info@imporfactoryusa.com
            </a>{" "}
            con el asunto <strong>&laquo;Eliminación de datos&raquo;</strong> e
            incluya:
          </p>
          <ul className="check">
            <li>
              El <strong>nombre de la página o negocio</strong> con el que
              conversó.
            </li>
            <li>
              El <strong>canal</strong> que utilizó: Messenger, Instagram,
              WhatsApp o TikTok.
            </li>
            <li>
              El <strong>dato con el que le identificamos</strong>: su número de
              teléfono si escribió por WhatsApp, o su nombre de usuario o perfil
              si fue por Messenger, Instagram o TikTok.
            </li>
          </ul>
          <p className="note">
            Pediremos una comprobación mínima antes de borrar, para no eliminar
            los datos de otra persona a petición de un tercero. No le pediremos
            contraseñas ni documentos que no sean necesarios.
          </p>

          <h3>Vía B — Corte la conexión desde Facebook</h3>
          <p>
            Si la conversación fue por Messenger o Instagram, puede retirarle a
            ImporChat el acceso desde su propia cuenta de Facebook, en{" "}
            <strong>
              Configuración y privacidad &rarr; Configuración &rarr;
              Integraciones empresariales
            </strong>
            . Al hacerlo dejamos de recibir datos nuevos suyos de inmediato.
          </p>
          <p>
            Esto <strong>detiene el flujo, pero no borra el historial</strong>{" "}
            que ya estaba guardado. Para que se elimine, use además la vía A.
          </p>
        </section>

        <section id="negocio">
          <h2>3. Es el negocio que usa ImporChat</h2>
          <p>
            Si tiene una cuenta contratada, puede eliminar datos de dos formas:
          </p>
          <ul className="check">
            <li>
              <strong>Desconectar un canal.</strong> Desde{" "}
              <em>Canales y conexiones</em> en la plataforma. Dejamos de recibir
              mensajes y comentarios de ese canal y se invalidan los accesos
              asociados.
            </li>
            <li>
              <strong>Eliminar la cuenta completa.</strong> Solicítelo desde la
              plataforma o por correo a{" "}
              <a href="mailto:info@imporfactoryusa.com">
                info@imporfactoryusa.com
              </a>{" "}
              desde la dirección registrada como titular.
            </li>
          </ul>
          <p>
            Antes de eliminar la cuenta le recomendamos exportar la información
            que necesite conservar: la eliminación es definitiva y alcanza
            también a las conversaciones de sus clientes finales.
          </p>
        </section>

        <section id="que-borramos">
          <h2>4. Qué eliminamos</h2>
          <p>
            Al atender una solicitud eliminamos de nuestras bases de datos, de
            forma permanente:
          </p>
          <ul className="check">
            <li>
              Los <strong>mensajes</strong> enviados y recibidos, con sus
              archivos adjuntos, imágenes, audios y documentos.
            </li>
            <li>
              Los <strong>comentarios</strong> recogidos de las publicaciones y
              las respuestas asociadas.
            </li>
            <li>
              La <strong>ficha de contacto</strong>: nombre, número de teléfono,
              identificador de la plataforma, foto de perfil y etiquetas.
            </li>
            <li>
              Los <strong>identificadores de la plataforma de origen</strong>{" "}
              que permiten reconocerle en futuras interacciones.
            </li>
            <li>
              Los <strong>tokens de acceso</strong> a las plataformas
              conectadas, cuando se trata de una desconexión de canal o de una
              baja de cuenta.
            </li>
          </ul>
          <p className="note">
            Lo que se publicó en Facebook o Instagram sigue estando en esas
            plataformas: nosotros eliminamos nuestra copia. Para retirar un
            comentario público de la publicación hay que borrarlo también en la
            red social.
          </p>
        </section>

        <section id="que-conservamos">
          <h2>5. Qué conservamos y por qué</h2>
          <p>
            Hay información que no podemos eliminar de inmediato porque una
            obligación legal nos exige guardarla. En esos casos la conservamos
            bloqueada, sin usarla para ninguna otra finalidad, hasta que vence
            el plazo:
          </p>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Dato</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Comprobantes de pago y facturación</td>
                  <td>Obligaciones tributarias y contables.</td>
                </tr>
                <tr>
                  <td>Registros de seguridad y acceso</td>
                  <td>
                    Detección de fraude e investigación de incidentes de
                    seguridad.
                  </td>
                </tr>
                <tr>
                  <td>Copias de seguridad</td>
                  <td>
                    Se sobrescriben en su ciclo normal de rotación, no se
                    consultan.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Nada de esto se utiliza para contactarle ni para perfilarle. Cuando
            vence el plazo de conservación, se elimina.
          </p>
        </section>

        <section id="plazos">
          <h2>6. Plazos y confirmación</h2>
          <ul className="check">
            <li>
              <strong>Acuse de recibo:</strong> respondemos su solicitud en un
              plazo máximo de <strong>5 días hábiles</strong>.
            </li>
            <li>
              <strong>Eliminación:</strong> se completa dentro de los{" "}
              <strong>30 días</strong> siguientes a la verificación de su
              identidad.
            </li>
            <li>
              <strong>Confirmación:</strong> le escribimos al mismo correo
              cuando el borrado está hecho, detallando qué se eliminó y qué
              quedó retenido por obligación legal, si aplica.
            </li>
          </ul>
          <p>
            Si no recibe respuesta en el plazo indicado, reescriba a{" "}
            <a href="mailto:info@imporfactoryusa.com">
              info@imporfactoryusa.com
            </a>{" "}
            indicando la fecha de su primera solicitud.
          </p>
        </section>

        <footer className="foot">
          © {new Date().getFullYear()} Imporfactory
        </footer>
      </main>
    </div>
  );
}

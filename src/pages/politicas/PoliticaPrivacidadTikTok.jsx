import { useEffect } from "react";
import "./politicas.css";

export default function PoliticaPrivacidadTikTok() {
  useEffect(() => {
    document.title =
      "Política de Privacidad TikTok | ImporChat (by Imporfactory)";
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
          <h1>Política de Privacidad para TikTok</h1>
          <p className="lead">
            Esta Política de Privacidad específica para TikTok explica cómo{" "}
            <strong>Imporfactory</strong> ("nosotros", "nuestro" o "nos")
            recopila, usa, comparte y protege la información personal cuando
            utiliza nuestro servicio de mensajería <strong>ImporChat</strong> en
            conexión con la plataforma TikTok.
          </p>
          <div className="links">
            <a href="/terminos-servicio-tiktok" className="link">
              Términos de Servicio TikTok
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
              <a href="#resumen">Resumen Ejecutivo</a>
            </li>
            <li>
              <a href="#responsable">Responsable del Tratamiento</a>
            </li>
            <li>
              <a href="#informacion">Información que Recopilamos</a>
            </li>
            <li>
              <a href="#uso">Cómo Usamos su Información</a>
            </li>
            <li>
              <a href="#compartir">Compartir Información</a>
            </li>
            <li>
              <a href="#tiktok">Integración con TikTok</a>
            </li>
            <li>
              <a href="#retencion">Retención de Datos</a>
            </li>
            <li>
              <a href="#seguridad">Seguridad</a>
            </li>
            <li>
              <a href="#derechos">Sus Derechos</a>
            </li>
            <li>
              <a href="#menores">Menores de Edad</a>
            </li>
            <li>
              <a href="#internacional">Transferencias Internacionales</a>
            </li>
            <li>
              <a href="#cambios">Cambios a esta Política</a>
            </li>
            <li>
              <a href="#contacto">Contacto</a>
            </li>
          </ol>
        </nav>

        {/* Resumen Ejecutivo */}
        <section id="resumen" className="card">
          <h2>1. Resumen Ejecutivo</h2>
          <div className="check">
            <p>
              <strong>
                ImporChat es un servicio de mensajería empresarial que NO crea
                ni distribuye contenido.
              </strong>
            </p>
            <ul>
              <li>
                ✓ Facilitamos comunicación entre empresas y usuarios de TikTok
              </li>
              <li>✓ NO almacenamos ni procesamos contenido de TikTok</li>
              <li>
                ✓ Solo procesamos datos de mensajería necesarios para el
                servicio
              </li>
              <li>
                ✓ Cumplimos con GDPR, CCPA y regulaciones locales de Ecuador
              </li>
              <li>
                ✓ Los datos se procesan únicamente para fines de mensajería
                empresarial
              </li>
            </ul>
          </div>
        </section>

        {/* Responsable */}
        <section id="responsable" className="card">
          <h2>2. Responsable del Tratamiento</h2>
          <p>
            <strong>Imporfactory</strong>
          </p>
          <p>RUC: 1722377726001</p>
          <p>Dirección: Ecuador</p>
          <p>Email: info@imporfactoryusa.com</p>
          <p>Teléfono: +593 99 926 3107</p>
          <p>
            Somos el responsable del tratamiento de sus datos personales bajo
            esta política y cumplimos con todas las regulaciones aplicables de
            protección de datos.
          </p>
        </section>

        {/* Información que Recopilamos */}
        <section id="informacion" className="card">
          <h2>3. Información que Recopilamos</h2>

          <h3>3.1 Datos de Mensajería</h3>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo de Dato</th>
                  <th>Descripción</th>
                  <th>Finalidad</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ID de Usuario TikTok</td>
                  <td>Identificador único de TikTok (encriptado)</td>
                  <td>Enrutamiento de mensajes</td>
                </tr>
                <tr>
                  <td>Contenido de Mensajes</td>
                  <td>Texto de mensajes enviados/recibidos</td>
                  <td>Entrega de mensajes</td>
                </tr>
                <tr>
                  <td>Metadatos de Mensajes</td>
                  <td>Fecha, hora, estado de entrega</td>
                  <td>Funcionamiento del servicio</td>
                </tr>
                <tr>
                  <td>Información de Empresa</td>
                  <td>Datos de la empresa que usa el servicio</td>
                  <td>Facturación y soporte</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>3.2 Datos Técnicos</h3>
          <ul>
            <li>Dirección IP (anonimizada después de 30 días)</li>
            <li>Información del dispositivo (solo para debugging)</li>
            <li>Logs de conexión (eliminados después de 90 días)</li>
            <li>Datos de rendimiento del servicio</li>
          </ul>

          <h3>3.3 Datos que NO Recopilamos</h3>
          <div className="check">
            <ul>
              <li>✗ Contenido de videos de TikTok</li>
              <li>✗ Lista de seguidores o seguidos</li>
              <li>✗ Historial de navegación en TikTok</li>
              <li>✗ Datos de ubicación precisos</li>
              <li>✗ Información biométrica</li>
              <li>✗ Datos de otros servicios de redes sociales</li>
            </ul>
          </div>
        </section>

        {/* Uso */}
        <section id="uso" className="card">
          <h2>4. Cómo Usamos su Información</h2>

          <h3>4.1 Finalidades Principales</h3>
          <ul>
            <li>
              <strong>Entrega de Mensajes:</strong> Facilitar la comunicación
              entre empresas y usuarios
            </li>
            <li>
              <strong>Mantenimiento del Servicio:</strong> Asegurar
              funcionamiento óptimo
            </li>
            <li>
              <strong>Soporte Técnico:</strong> Resolver problemas y consultas
            </li>
            <li>
              <strong>Seguridad:</strong> Prevenir fraude y abuso del servicio
            </li>
          </ul>

          <h3>4.2 Base Legal (GDPR)</h3>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Finalidad</th>
                  <th>Base Legal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Prestación del servicio de mensajería</td>
                  <td>Ejecución de contrato</td>
                </tr>
                <tr>
                  <td>Mejoras del servicio</td>
                  <td>Interés legítimo</td>
                </tr>
                <tr>
                  <td>Seguridad y prevención de fraude</td>
                  <td>Interés legítimo</td>
                </tr>
                <tr>
                  <td>Cumplimiento legal</td>
                  <td>Obligación legal</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Compartir */}
        <section id="compartir" className="card">
          <h2>5. Compartir Información</h2>

          <h3>5.1 Con Terceros</h3>
          <p>
            <strong>
              NO vendemos, alquilamos ni compartimos datos personales con
              terceros para marketing.
            </strong>
          </p>

          <p>Compartimos datos únicamente en estas circunstancias:</p>
          <ul>
            <li>
              <strong>Proveedores de Servicios:</strong> Infraestructura técnica
              (AWS, etc.) bajo estrictos acuerdos de confidencialidad
            </li>
            <li>
              <strong>Requerimientos Legales:</strong> Cuando sea legalmente
              obligatorio
            </li>
            <li>
              <strong>Emergencias:</strong> Para proteger la seguridad de
              usuarios
            </li>
          </ul>

          <h3>5.2 Con TikTok</h3>
          <p>
            Solo compartimos con TikTok los datos mínimos necesarios para el
            funcionamiento del servicio de mensajería, de acuerdo con los
            términos de la API de TikTok Business y sus políticas de privacidad.
          </p>
        </section>

        {/* Integración TikTok */}
        <section id="tiktok" className="card">
          <h2>6. Integración con TikTok</h2>

          <h3>6.1 Relación con TikTok</h3>
          <p>
            ImporChat utiliza las APIs oficiales de TikTok Business para
            facilitar la mensajería. Esta integración está sujeta a:
          </p>
          <ul>
            <li>Términos de Servicio de TikTok Business</li>
            <li>Política de Privacidad de TikTok</li>
            <li>Directrices de la API de TikTok</li>
          </ul>

          <h3>6.2 Limitaciones del Servicio</h3>
          <div className="check">
            <ul>
              <li>✓ Solo procesamos mensajes directos autorizados</li>
              <li>✓ NO accedemos a contenido público de TikTok</li>
              <li>✓ NO interactuamos con el algoritmo de TikTok</li>
              <li>✓ NO influimos en la distribución de contenido</li>
            </ul>
          </div>
        </section>

        {/* Retención */}
        <section id="retencion" className="card">
          <h2>7. Retención de Datos</h2>

          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo de Dato</th>
                  <th>Período de Retención</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mensajes activos</td>
                  <td>Durante la relación comercial</td>
                  <td>Funcionalidad del servicio</td>
                </tr>
                <tr>
                  <td>Mensajes archivados</td>
                  <td>12 meses después del cierre</td>
                  <td>Soporte y resolución de disputas</td>
                </tr>
                <tr>
                  <td>Logs técnicos</td>
                  <td>90 días</td>
                  <td>Debugging y seguridad</td>
                </tr>
                <tr>
                  <td>Datos de facturación</td>
                  <td>7 años</td>
                  <td>Obligaciones fiscales</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Seguridad */}
        <section id="seguridad" className="card">
          <h2>8. Seguridad</h2>

          <h3>8.1 Medidas Técnicas</h3>
          <ul>
            <li>
              <strong>Encriptación:</strong> TLS 1.3 para datos en tránsito,
              AES-256 en reposo
            </li>
            <li>
              <strong>Acceso:</strong> Autenticación multifactor para todos los
              sistemas
            </li>
            <li>
              <strong>Monitoreo:</strong> Detección de intrusiones 24/7
            </li>
            <li>
              <strong>Backups:</strong> Copias de seguridad encriptadas diarias
            </li>
          </ul>

          <h3>8.2 Medidas Organizacionales</h3>
          <ul>
            <li>Personal capacitado en protección de datos</li>
            <li>Auditorías de seguridad regulares</li>
            <li>Políticas de acceso basadas en roles</li>
            <li>Procedimientos de respuesta a incidentes</li>
          </ul>
        </section>

        {/* Derechos */}
        <section id="derechos" className="card">
          <h2>9. Sus Derechos</h2>

          <p>
            Según las leyes aplicables (GDPR, CCPA, Ley de Protección de Datos
            de Ecuador), usted tiene derecho a:
          </p>

          <div className="check">
            <ul>
              <li>
                <strong>Acceso:</strong> Conocer qué datos tenemos sobre usted
              </li>
              <li>
                <strong>Rectificación:</strong> Corregir datos inexactos
              </li>
              <li>
                <strong>Supresión:</strong> Solicitar eliminación de sus datos
              </li>
              <li>
                <strong>Portabilidad:</strong> Recibir sus datos en formato
                estructurado
              </li>
              <li>
                <strong>Limitación:</strong> Restringir el procesamiento
              </li>
              <li>
                <strong>Oposición:</strong> Oponerse al procesamiento
              </li>
              <li>
                <strong>Revocación:</strong> Retirar consentimiento en cualquier
                momento
              </li>
            </ul>
          </div>

          <p>
            <strong>Para ejercer sus derechos, contacte:</strong>{" "}
            info@imporfactoryusa.com
          </p>
          <p>Responderemos dentro de 30 días calendario.</p>
        </section>

        {/* Menores */}
        <section id="menores" className="card">
          <h2>10. Menores de Edad</h2>

          <p>
            Nuestro servicio está dirigido a empresas y no recopilamos
            intencionalmente información personal de menores de 13 años (16 en
            la UE).
          </p>

          <p>
            Si descubrimos que hemos recopilado información de un menor sin
            consentimiento parental apropiado, eliminaremos esa información
            inmediatamente.
          </p>

          <p>
            Los padres o tutores pueden contactarnos en info@imporfactoryusa.com
            para cualquier consulta relacionada con menores.
          </p>
        </section>

        {/* Internacional */}
        <section id="internacional" className="card">
          <h2>11. Transferencias Internacionales</h2>

          <p>
            Sus datos pueden ser transferidos y procesados en países fuera de su
            jurisdicción. Implementamos las siguientes salvaguardas:
          </p>

          <ul>
            <li>
              <strong>Cláusulas Contractuales Estándar</strong> de la Comisión
              Europea
            </li>
            <li>
              <strong>Certificaciones</strong> como Privacy Shield (cuando
              aplicable)
            </li>
            <li>
              <strong>Decisiones de Adecuación</strong> para países con
              protección equivalente
            </li>
            <li>
              <strong>Evaluaciones de Impacto</strong> para transferencias de
              alto riesgo
            </li>
          </ul>
        </section>

        {/* Cambios */}
        <section id="cambios" className="card">
          <h2>12. Cambios a esta Política</h2>

          <p>
            Podemos actualizar esta política periódicamente. Los cambios
            significativos serán notificados mediante:
          </p>

          <ul>
            <li>Email a la dirección registrada</li>
            <li>Notificación en la plataforma</li>
            <li>Actualización de la fecha en esta página</li>
          </ul>

          <p>
            Su uso continuado del servicio después de los cambios constituye
            aceptación de la política actualizada.
          </p>
        </section>

        {/* Contacto */}
        <section id="contacto" className="card">
          <h2>13. Contacto</h2>

          <h3>Para consultas sobre privacidad:</h3>
          <p>
            <strong>Email:</strong> info@imporfactoryusa.com
          </p>
          <p>
            <strong>Asunto:</strong> "Consulta Privacidad TikTok"
          </p>

          <h3>Para ejercer derechos:</h3>
          <p>
            <strong>Email:</strong> info@imporfactoryusa.com
          </p>
          <p>
            <strong>Asunto:</strong> "Ejercicio de Derechos - TikTok"
          </p>

          <h3>Delegado de Protección de Datos (DPO):</h3>
          <p>
            <strong>Email:</strong> dpo@imporsuit.ec
          </p>

          <h3>Autoridad de Control:</h3>
          <p>Superintendencia de Telecomunicaciones (Ecuador)</p>
          <p>
            En caso de estar en la UE: Su autoridad nacional de protección de
            datos
          </p>
        </section>
      </main>
    </div>
  );
}

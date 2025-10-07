import { useEffect } from "react";
import "./politicas.css";

export default function TerminosServicioTikTok() {
  useEffect(() => {
    document.title =
      "Términos de Servicio TikTok | ImporChat (by Imporfactory)";
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
          <h1>Términos de Servicio para TikTok</h1>
          <p className="lead">
            Estos Términos de Servicio específicos para TikTok regulan el uso
            del servicio de mensajería <strong>ImporChat</strong> desarrollado
            por <strong>Imporfactory</strong> en conexión con la plataforma
            TikTok. Al usar nuestro servicio, usted acepta estos términos en su
            totalidad.
          </p>
          <div className="links">
            <a href="/politica-privacidad-tiktok" className="link">
              Política de Privacidad TikTok
            </a>
            <a href="mailto:info@imporsuit.ec" className="link">
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
              <a href="#definiciones">Definiciones</a>
            </li>
            <li>
              <a href="#aceptacion">Aceptación de Términos</a>
            </li>
            <li>
              <a href="#descripcion">Descripción del Servicio</a>
            </li>
            <li>
              <a href="#elegibilidad">Elegibilidad</a>
            </li>
            <li>
              <a href="#registro">Registro y Cuenta</a>
            </li>
            <li>
              <a href="#uso-permitido">Uso Permitido</a>
            </li>
            <li>
              <a href="#uso-prohibido">Uso Prohibido</a>
            </li>
            <li>
              <a href="#tiktok-integracion">Integración con TikTok</a>
            </li>
            <li>
              <a href="#responsabilidades">Responsabilidades del Usuario</a>
            </li>
            <li>
              <a href="#limitaciones">Limitaciones del Servicio</a>
            </li>
            <li>
              <a href="#facturacion">Facturación y Pagos</a>
            </li>
            <li>
              <a href="#suspension">Suspensión y Terminación</a>
            </li>
            <li>
              <a href="#propiedad">Propiedad Intelectual</a>
            </li>
            <li>
              <a href="#limitacion-responsabilidad">
                Limitación de Responsabilidad
              </a>
            </li>
            <li>
              <a href="#indemnizacion">Indemnización</a>
            </li>
            <li>
              <a href="#fuerza-mayor">Fuerza Mayor</a>
            </li>
            <li>
              <a href="#jurisdiccion">Jurisdicción y Ley Aplicable</a>
            </li>
            <li>
              <a href="#modificaciones">Modificaciones</a>
            </li>
            <li>
              <a href="#contacto">Contacto</a>
            </li>
          </ol>
        </nav>

        {/* Definiciones */}
        <section id="definiciones" className="card">
          <h2>1. Definiciones</h2>

          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Término</th>
                  <th>Definición</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>"Servicio"</strong>
                  </td>
                  <td>
                    La plataforma ImporChat y todos sus componentes de
                    mensajería para TikTok
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>"Usuario"</strong>
                  </td>
                  <td>
                    Cualquier persona o entidad que utiliza nuestro Servicio
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>"Cliente Empresarial"</strong>
                  </td>
                  <td>
                    Empresa que contrata el Servicio para comunicarse con
                    usuarios de TikTok
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>"Usuario Final"</strong>
                  </td>
                  <td>
                    Usuario de TikTok que recibe mensajes a través de nuestro
                    Servicio
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>"Contenido"</strong>
                  </td>
                  <td>
                    Mensajes, datos y información transmitidos a través del
                    Servicio
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>"API TikTok"</strong>
                  </td>
                  <td>
                    Interfaz de programación de aplicaciones oficial de TikTok
                    Business
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Aceptación */}
        <section id="aceptacion" className="card">
          <h2>2. Aceptación de Términos</h2>

          <p>
            Al acceder, registrarse o utilizar ImporChat en conexión con TikTok,
            usted confirma que:
          </p>

          <div className="check">
            <ul>
              <li>✓ Ha leído y comprende estos Términos de Servicio</li>
              <li>
                ✓ Acepta cumplir con todas las disposiciones aquí establecidas
              </li>
              <li>✓ Tiene la capacidad legal para celebrar este acuerdo</li>
              <li>✓ Acepta también los Términos de Servicio de TikTok</li>
              <li>
                ✓ Cumple con todas las leyes aplicables en su jurisdicción
              </li>
            </ul>
          </div>

          <p>
            <strong>
              Si no está de acuerdo con estos términos, no utilice el Servicio.
            </strong>
          </p>
        </section>

        {/* Descripción del Servicio */}
        <section id="descripcion" className="card">
          <h2>3. Descripción del Servicio</h2>

          <h3>3.1 Naturaleza del Servicio</h3>
          <p>
            ImporChat es un servicio de mensajería empresarial que facilita la
            comunicación entre empresas y usuarios de TikTok.{" "}
            <strong>
              NO somos una plataforma de contenido ni distribuimos contenido de
              TikTok.
            </strong>
          </p>

          <h3>3.2 Funcionalidades Principales</h3>
          <ul>
            <li>
              <strong>Mensajería Directa:</strong> Envío y recepción de mensajes
              de texto
            </li>
            <li>
              <strong>Gestión de Conversaciones:</strong> Organización y
              seguimiento de chats
            </li>
            <li>
              <strong>Integración API:</strong> Conexión oficial con TikTok
              Business
            </li>
            <li>
              <strong>Panel de Control:</strong> Interface para gestión
              empresarial
            </li>
            <li>
              <strong>Reportes:</strong> Estadísticas básicas de mensajería
            </li>
          </ul>

          <h3>3.3 Limitaciones del Servicio</h3>
          <div className="check">
            <ul>
              <li>✗ NO creamos ni distribuimos contenido de TikTok</li>
              <li>✗ NO influimos en el algoritmo de TikTok</li>
              <li>✗ NO accedemos a videos o contenido público</li>
              <li>✗ NO proporcionamos servicios de marketing de contenido</li>
              <li>✗ NO gestionamos campañas publicitarias en TikTok</li>
            </ul>
          </div>
        </section>

        {/* Elegibilidad */}
        <section id="elegibilidad" className="card">
          <h2>4. Elegibilidad</h2>

          <h3>4.1 Requisitos Generales</h3>
          <p>Para utilizar el Servicio, usted debe:</p>
          <ul>
            <li>Ser mayor de 18 años o tener autorización parental</li>
            <li>Tener capacidad legal para celebrar contratos</li>
            <li>
              Representar una entidad empresarial legítima (para Clientes
              Empresariales)
            </li>
            <li>Cumplir con las políticas de TikTok Business</li>
            <li>No estar suspendido previamente de nuestros servicios</li>
          </ul>

          <h3>4.2 Restricciones Geográficas</h3>
          <p>
            El Servicio puede no estar disponible en todas las jurisdicciones.
            Es responsabilidad del Usuario verificar la legalidad del uso en su
            ubicación.
          </p>
        </section>

        {/* Registro */}
        <section id="registro" className="card">
          <h2>5. Registro y Cuenta</h2>

          <h3>5.1 Proceso de Registro</h3>
          <p>Para registrarse debe proporcionar:</p>
          <ul>
            <li>Información empresarial veraz y actualizada</li>
            <li>Datos de contacto válidos</li>
            <li>Documentación comercial requerida</li>
            <li>Aceptación de verificaciones de identidad</li>
          </ul>

          <h3>5.2 Responsabilidades de la Cuenta</h3>
          <div className="check">
            <ul>
              <li>✓ Mantener la confidencialidad de credenciales</li>
              <li>✓ Notificar inmediatamente cualquier uso no autorizado</li>
              <li>✓ Actualizar información cuando sea necesario</li>
              <li>✓ Usar la cuenta solo para fines autorizados</li>
              <li>✓ No compartir credenciales con terceros</li>
            </ul>
          </div>

          <h3>5.3 Verificación</h3>
          <p>
            Nos reservamos el derecho de verificar la identidad y legitimidad de
            todos los usuarios antes de activar el servicio.
          </p>
        </section>

        {/* Uso Permitido */}
        <section id="uso-permitido" className="card">
          <h2>6. Uso Permitido</h2>

          <p>El Servicio puede ser utilizado para:</p>

          <div className="check">
            <ul>
              <li>
                ✓ <strong>Atención al Cliente:</strong> Responder consultas de
                usuarios de TikTok
              </li>
              <li>
                ✓ <strong>Soporte Técnico:</strong> Asistir con
                productos/servicios
              </li>
              <li>
                ✓ <strong>Información Comercial:</strong> Compartir información
                relevante del negocio
              </li>
              <li>
                ✓ <strong>Confirmaciones:</strong> Confirmación de pedidos o
                servicios
              </li>
              <li>
                ✓ <strong>Comunicación Autorizada:</strong> Solo con usuarios
                que han dado consentimiento
              </li>
              <li>
                ✓ <strong>Cumplimiento Legal:</strong> Comunicaciones requeridas
                por ley
              </li>
            </ul>
          </div>

          <h3>6.1 Mejores Prácticas</h3>
          <ul>
            <li>
              Obtener consentimiento explícito antes de iniciar comunicación
            </li>
            <li>Respetar horarios apropiados para mensajería</li>
            <li>Proporcionar opciones claras de opt-out</li>
            <li>Mantener comunicación profesional y relevante</li>
          </ul>
        </section>

        {/* Uso Prohibido */}
        <section id="uso-prohibido" className="card">
          <h2>7. Uso Prohibido</h2>

          <p>
            <strong>
              Está estrictamente prohibido utilizar el Servicio para:
            </strong>
          </p>

          <div className="check">
            <ul>
              <li>
                ✗ <strong>Spam o Mensajes Masivos No Solicitados</strong>
              </li>
              <li>
                ✗ <strong>Contenido Ilegal:</strong> Cualquier actividad que
                viole leyes aplicables
              </li>
              <li>
                ✗ <strong>Acoso o Intimidación:</strong> Mensajes hostiles o
                amenazantes
              </li>
              <li>
                ✗ <strong>Fraude o Estafa:</strong> Información falsa o engañosa
              </li>
              <li>
                ✗ <strong>Contenido Inapropiado:</strong> Material sexual,
                violento o discriminatorio
              </li>
              <li>
                ✗ <strong>Violación de Propiedad Intelectual:</strong> Uso no
                autorizado de marcas o contenido
              </li>
              <li>
                ✗ <strong>Ingeniería Inversa:</strong> Intentos de copiar o
                replicar el servicio
              </li>
              <li>
                ✗ <strong>Evasión de Sistemas:</strong> Burlar limitaciones o
                controles técnicos
              </li>
              <li>
                ✗ <strong>Competencia Desleal:</strong> Usar el servicio para
                competir directamente
              </li>
              <li>
                ✗ <strong>Venta o Redistribución:</strong> Del servicio sin
                autorización explícita
              </li>
            </ul>
          </div>

          <h3>7.1 Consecuencias del Uso Prohibido</h3>
          <p>El uso prohibido puede resultar en:</p>
          <ul>
            <li>Suspensión inmediata de la cuenta</li>
            <li>Terminación del servicio sin reembolso</li>
            <li>Reporte a autoridades competentes</li>
            <li>Acciones legales por daños</li>
          </ul>
        </section>

        {/* Integración TikTok */}
        <section id="tiktok-integracion" className="card">
          <h2>8. Integración con TikTok</h2>

          <h3>8.1 Dependencia de TikTok</h3>
          <p>
            Nuestro Servicio depende de la API oficial de TikTok Business. Los
            cambios en las políticas o disponibilidad de TikTok pueden afectar
            la funcionalidad del Servicio.
          </p>

          <h3>8.2 Cumplimiento con Políticas de TikTok</h3>
          <p>Los usuarios deben cumplir también con:</p>
          <ul>
            <li>Términos de Servicio de TikTok</li>
            <li>Políticas de la Comunidad de TikTok</li>
            <li>Términos de TikTok Business</li>
            <li>Directrices de la API de TikTok</li>
          </ul>

          <h3>8.3 Limitaciones de la Integración</h3>
          <div className="check">
            <ul>
              <li>Sujeto a límites de tasa de la API de TikTok</li>
              <li>Funcionalidad limitada a capacidades oficiales de la API</li>
              <li>Posibles interrupciones por mantenimiento de TikTok</li>
              <li>Cambios en funcionalidad según actualizaciones de TikTok</li>
            </ul>
          </div>
        </section>

        {/* Responsabilidades del Usuario */}
        <section id="responsabilidades" className="card">
          <h2>9. Responsabilidades del Usuario</h2>

          <h3>9.1 Contenido de Mensajes</h3>
          <p>El Usuario es completamente responsable de:</p>
          <ul>
            <li>La veracidad y legalidad del contenido de sus mensajes</li>
            <li>Obtener consentimientos necesarios de destinatarios</li>
            <li>Cumplir con leyes de protección de datos aplicables</li>
            <li>Respetar derechos de propiedad intelectual de terceros</li>
          </ul>

          <h3>9.2 Seguridad</h3>
          <div className="check">
            <ul>
              <li>✓ Mantener credenciales seguras</li>
              <li>✓ Usar conexiones seguras</li>
              <li>✓ Reportar vulnerabilidades de seguridad</li>
              <li>✓ Implementar medidas de seguridad apropiadas</li>
              <li>✓ Capacitar personal autorizado</li>
            </ul>
          </div>

          <h3>9.3 Cumplimiento Legal</h3>
          <p>
            Es responsabilidad del Usuario asegurar que su uso del Servicio
            cumple con todas las leyes aplicables, incluyendo pero no limitado
            a:
          </p>
          <ul>
            <li>Leyes de protección de datos (GDPR, CCPA, etc.)</li>
            <li>Regulaciones de telecomunicaciones</li>
            <li>Leyes anti-spam</li>
            <li>Regulaciones comerciales locales</li>
          </ul>
        </section>

        {/* Limitaciones */}
        <section id="limitaciones" className="card">
          <h2>10. Limitaciones del Servicio</h2>

          <h3>10.1 Disponibilidad</h3>
          <p>
            Nos esforzamos por mantener un servicio disponible 24/7, pero no
            garantizamos disponibilidad ininterrumpida. El servicio puede estar
            temporalmente no disponible por:
          </p>
          <ul>
            <li>Mantenimiento programado</li>
            <li>Actualizaciones del sistema</li>
            <li>Fallas técnicas imprevistas</li>
            <li>Cambios en la API de TikTok</li>
            <li>Circunstancias fuera de nuestro control</li>
          </ul>

          <h3>10.2 Límites de Uso</h3>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Límite</th>
                  <th>Descripción</th>
                  <th>Razón</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mensajes por minuto</td>
                  <td>Según plan contratado</td>
                  <td>Prevención de spam</td>
                </tr>
                <tr>
                  <td>Tamaño de mensaje</td>
                  <td>Límites de TikTok API</td>
                  <td>Restricciones técnicas</td>
                </tr>
                <tr>
                  <td>Retención de datos</td>
                  <td>Según política de privacidad</td>
                  <td>Cumplimiento legal</td>
                </tr>
                <tr>
                  <td>Conexiones simultáneas</td>
                  <td>Según infraestructura</td>
                  <td>Performance del servicio</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Facturación */}
        <section id="facturacion" className="card">
          <h2>11. Facturación y Pagos</h2>

          <h3>11.1 Planes de Servicio</h3>
          <p>
            Ofrecemos diferentes planes con distintas funcionalidades y límites.
          </p>

          <h3>11.2 Términos de Pago</h3>
          <ul>
            <li>
              <strong>Facturación:</strong> Mensual o anual según plan
              seleccionado
            </li>
            <li>
              <strong>Pagos:</strong> Por adelantado, no reembolsables salvo lo
              indicado
            </li>
            <li>
              <strong>Moneda:</strong> USD (Dólares estadounidenses)
            </li>
            <li>
              <strong>Impuestos:</strong> Adicionales según jurisdicción
              aplicable
            </li>
          </ul>

          <h3>11.3 Cambios de Precio</h3>
          <p>
            Los precios pueden cambiar con 30 días de aviso previo. Los cambios
            no afectan períodos ya pagados.
          </p>

          <h3>11.4 Suspensión por Falta de Pago</h3>
          <p>El servicio puede ser suspendido por falta de pago después de:</p>
          <ul>
            <li>Notificación de pago vencido</li>
            <li>Período de gracia de 15 días</li>
            <li>Suspensión temporal (30 días adicionales)</li>
            <li>Terminación definitiva si no se regulariza</li>
          </ul>
        </section>

        {/* Suspensión y Terminación */}
        <section id="suspension" className="card">
          <h2>12. Suspensión y Terminación</h2>

          <h3>12.1 Terminación por el Usuario</h3>
          <p>
            El Usuario puede terminar el servicio en cualquier momento con 30
            días de aviso previo. No se proporcionan reembolsos por períodos no
            utilizados.
          </p>

          <h3>12.2 Terminación por Imporfactory</h3>
          <p>Podemos suspender o terminar el servicio inmediatamente si:</p>
          <ul>
            <li>Se violan estos Términos de Servicio</li>
            <li>Se detecta uso fraudulento o ilegal</li>
            <li>No se realizan pagos según lo acordado</li>
            <li>Se compromete la seguridad del sistema</li>
            <li>Lo requieren las autoridades competentes</li>
          </ul>

          <h3>12.3 Efectos de la Terminación</h3>
          <p>Al terminar el servicio:</p>
          <div className="check">
            <ul>
              <li>Se suspende el acceso inmediatamente</li>
              <li>Los datos se conservan según política de retención</li>
              <li>Se pueden exportar datos durante 30 días</li>
              <li>Después de 90 días, los datos se eliminan permanentemente</li>
            </ul>
          </div>
        </section>

        {/* Propiedad Intelectual */}
        <section id="propiedad" className="card">
          <h2>13. Propiedad Intelectual</h2>

          <h3>13.1 Propiedad de Imporfactory</h3>
          <p>
            Todos los derechos de propiedad intelectual sobre el Servicio
            (software, diseño, marcas, contenido) pertenecen a Imporfactory.
          </p>

          <h3>13.2 Licencia de Uso</h3>
          <p>
            Se otorga una licencia limitada, no exclusiva y revocable para usar
            el Servicio según estos términos.
          </p>

          <h3>13.3 Contenido del Usuario</h3>
          <p>
            El Usuario mantiene la propiedad de su contenido, pero otorga a
            Imporfactory una licencia para procesarlo según sea necesario para
            proporcionar el Servicio.
          </p>

          <h3>13.4 Respeto de Derechos de Terceros</h3>
          <p>
            Los Usuarios deben respetar los derechos de propiedad intelectual de
            terceros y TikTok en todo momento.
          </p>
        </section>

        {/* Limitación de Responsabilidad */}
        <section id="limitacion-responsabilidad" className="card">
          <h2>14. Limitación de Responsabilidad</h2>

          <h3>14.1 Descargo de Garantías</h3>
          <p>
            EL SERVICIO SE PROPORCIONA "COMO ESTÁ" SIN GARANTÍAS DE NINGÚN TIPO,
            EXPRESAS O IMPLÍCITAS, INCLUYENDO PERO NO LIMITADO A GARANTÍAS DE
            COMERCIABILIDAD, IDONEIDAD PARA UN PROPÓSITO PARTICULAR O NO
            VIOLACIÓN.
          </p>

          <h3>14.2 Limitación de Daños</h3>
          <p>
            EN NINGÚN CASO IMPORFACTORY SERÁ RESPONSABLE POR DAÑOS INDIRECTOS,
            INCIDENTALES, ESPECIALES, CONSECUENCIALES O PUNITIVOS, INCLUYENDO
            PERO NO LIMITADO A PÉRDIDA DE BENEFICIOS, DATOS O USO.
          </p>

          <h3>14.3 Límite Máximo</h3>
          <p>
            LA RESPONSABILIDAD TOTAL DE IMPORFACTORY NO EXCEDERÁ EL MONTO PAGADO
            POR EL USUARIO EN LOS 12 MESES ANTERIORES AL EVENTO QUE DIO LUGAR AL
            RECLAMO.
          </p>

          <h3>14.4 Excepciones</h3>
          <p>
            Estas limitaciones no aplican donde estén prohibidas por ley o en
            casos de dolo o negligencia grave.
          </p>
        </section>

        {/* Indemnización */}
        <section id="indemnizacion" className="card">
          <h2>15. Indemnización</h2>

          <p>
            El Usuario acepta indemnizar, defender y eximir de responsabilidad a
            Imporfactory, sus directivos, empleados y afiliados de y contra
            cualquier reclamo, daño, pérdida, costo y gasto (incluyendo
            honorarios legales razonables) resultante de:
          </p>

          <ul>
            <li>Uso del Servicio por parte del Usuario</li>
            <li>Violación de estos Términos por el Usuario</li>
            <li>Contenido proporcionado por el Usuario</li>
            <li>Violación de derechos de terceros por el Usuario</li>
            <li>Uso ilegal o no autorizado del Servicio</li>
          </ul>
        </section>

        {/* Fuerza Mayor */}
        <section id="fuerza-mayor" className="card">
          <h2>16. Fuerza Mayor</h2>

          <p>
            Imporfactory no será responsable por cualquier falla o demora en el
            cumplimiento debido a causas fuera de su control razonable,
            incluyendo pero no limitado a:
          </p>

          <ul>
            <li>Desastres naturales</li>
            <li>Actos de gobierno o autoridades</li>
            <li>Guerras, terrorismo o disturbios civiles</li>
            <li>Fallas en infraestructura de internet</li>
            <li>Cambios en las APIs o servicios de TikTok</li>
            <li>Pandemias o emergencias sanitarias</li>
          </ul>
        </section>

        {/* Jurisdicción */}
        <section id="jurisdiccion" className="card">
          <h2>17. Jurisdicción y Ley Aplicable</h2>

          <h3>17.1 Ley Aplicable</h3>
          <p>
            Estos términos se regirán e interpretarán de acuerdo con las leyes
            de la República del Ecuador.
          </p>

          <h3>17.2 Jurisdicción</h3>
          <p>
            Cualquier disputa será resuelta exclusivamente por los tribunales
            competentes de Ecuador, con renuncia expresa a cualquier otro fuero.
          </p>

          <h3>17.3 Arbitraje</h3>
          <p>
            Las partes pueden acordar someter las disputas a arbitraje según las
            reglas del Centro de Arbitraje y Mediación de la Cámara de Comercio
            de Ecuador.
          </p>
        </section>

        {/* Modificaciones */}
        <section id="modificaciones" className="card">
          <h2>18. Modificaciones</h2>

          <h3>18.1 Cambios a los Términos</h3>
          <p>
            Imporfactory se reserva el derecho de modificar estos términos en
            cualquier momento. Los cambios significativos serán notificados con
            al menos 30 días de anticipación.
          </p>

          <h3>18.2 Aceptación de Cambios</h3>
          <p>
            El uso continuado del Servicio después de la notificación de cambios
            constituye aceptación de los términos modificados.
          </p>

          <h3>18.3 Rechazo de Cambios</h3>
          <p>
            Si no está de acuerdo con los cambios, puede terminar el servicio
            antes de que entren en vigor.
          </p>
        </section>

        {/* Contacto */}
        <section id="contacto" className="card">
          <h2>19. Contacto</h2>

          <h3>Información de Contacto:</h3>
          <p>
            <strong>Imporfactory</strong>
          </p>
          <p>
            <strong>Email:</strong> info@imporsuit.ec
          </p>
          <p>
            <strong>Asunto para consultas legales:</strong> "Términos de
            Servicio TikTok"
          </p>

          <h3>Para Soporte Técnico:</h3>
          <p>
            <strong>Email:</strong> soporte@imporsuit.ec
          </p>

          <h3>Para Consultas Comerciales:</h3>
          <p>
            <strong>Email:</strong> ventas@imporsuit.ec
          </p>

          <h3>Horario de Atención:</h3>
          <p>Lunes a Viernes: 9:00 AM - 6:00 PM (GMT-5)</p>

          <p>
            <strong>
              Estos términos constituyen el acuerdo completo entre las partes y
              reemplazan todos los acuerdos anteriores relacionados con el tema.
            </strong>
          </p>
        </section>
      </main>
    </div>
  );
}

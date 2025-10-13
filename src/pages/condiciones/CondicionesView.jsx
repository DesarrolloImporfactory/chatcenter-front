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
            ImporChat permite autenticar con Google, visualizar disponibilidad y
            crear/gestionar eventos de calendario según permisos otorgados por
            usted.
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
            Para operar, ImporChat solicita permisos de Google (OAuth). Usted
            puede revocar accesos desde su cuenta de Google. El uso de datos se
            rige por la Política de Privacidad.
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

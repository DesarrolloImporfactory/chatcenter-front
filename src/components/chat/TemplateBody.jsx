import { renderTextoWhatsapp } from "../../utils/waFormat";

/**
 * Cuerpo de una plantilla tal como la ve el cliente en WhatsApp:
 * header + body con formato real + footer + botones.
 *
 * Antes el chat solo pintaba el body como texto plano: los asteriscos se
 * veían crudos y los botones no aparecían, así que el asesor no tenía forma
 * de saber qué le había llegado realmente al cliente.
 *
 * @param {React.ReactNode} headerNode  Header ya resuelto por quien llama
 *   (imagen/video/documento), porque cada origen resuelve la URL distinto.
 * @param {string} texto     Body con las variables ya sustituidas.
 * @param {string} footer    Footer de la plantilla (opcional).
 * @param {Array}  buttons   Botones de la definición de Meta.
 * @param {Array}  urlFullItems  URLs dinámicas ya armadas por el chat, para
 *   los botones URL con variable. Se emparejan en orden con los de tipo URL.
 * @param {Object} buttonParams  Parámetros reales del envío, por índice de
 *   botón ({"0": "189221610"}). Salen de lo que se le mandó a Meta, así que
 *   el enlace queda EXACTAMENTE igual al que le llegó al cliente.
 */
export default function TemplateBody({
  headerNode = null,
  texto = "",
  footer = null,
  buttons = [],
  urlFullItems = [],
  buttonParams = null,
  compacto = false,
}) {
  const lista = Array.isArray(buttons) ? buttons : [];

  // Las URLs dinámicas llegan aparte; se asignan en orden a los botones URL.
  let urlDinamicaIdx = 0;
  const resolverUrl = (b, i) => {
    const cruda = String(b?.url || "");
    if (!cruda.includes("{{")) return cruda;

    /* El parámetro real del envío es la fuente correcta: Meta lo pega al
       final de la URL tal cual, sin escapar, así que aquí se sustituye
       igual. Sin esto el botón quedaba muerto en el chat aunque en el
       teléfono del cliente sí funcionara. */
    const param = buttonParams?.[String(i)];
    if (param) return cruda.replace(/\{\{\s*\d+\s*\}\}/, param);

    const item = urlFullItems[urlDinamicaIdx++];
    return item?.url || "";
  };

  /* Si no hay definición de botones (caché fría o plantilla borrada del BM)
     se cae a las URLs dinámicas sueltas, que es lo que se mostraba antes. */
  const sinDefinicion = lista.length === 0 && urlFullItems.length > 0;

  return (
    <div className={compacto ? "space-y-1.5" : "space-y-2"}>
      {headerNode}

      {texto ? (
        <p className="whitespace-pre-wrap break-words">
          {renderTextoWhatsapp(texto)}
        </p>
      ) : null}

      {footer ? (
        <p className="text-[11px] leading-tight text-slate-500">{footer}</p>
      ) : null}

      {lista.length > 0 && (
        <div className="mt-1 flex flex-col gap-1 border-t border-black/10 pt-1.5">
          {lista.map((b, i) => {
            const tipo = String(b?.type || "").toUpperCase();
            const etiqueta = b?.text || "Botón";

            if (tipo === "URL") {
              const href = resolverUrl(b, i);
              return href ? (
                <a
                  key={`btn-${i}`}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-sky-700 hover:bg-sky-50"
                >
                  <i className="bx bx-link-external text-[15px]" />
                  {etiqueta}
                </a>
              ) : (
                <span
                  key={`btn-${i}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-400"
                  title="El enlace se arma al enviarse"
                >
                  <i className="bx bx-link-external text-[15px]" />
                  {etiqueta}
                </span>
              );
            }

            if (tipo === "PHONE_NUMBER") {
              return (
                <a
                  key={`btn-${i}`}
                  href={`tel:${b?.phone_number || ""}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-sky-700 hover:bg-sky-50"
                >
                  <i className="bx bx-phone text-[15px]" />
                  {etiqueta}
                </a>
              );
            }

            // QUICK_REPLY / COPY_CODE / lo que venga: es un botón que pulsa el
            // cliente, no el asesor. Se muestra pero no hace nada al clic.
            return (
              <span
                key={`btn-${i}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-sky-700"
                title="Botón de respuesta rápida (lo pulsa el cliente)"
              >
                <i className="bx bx-reply text-[15px]" />
                {etiqueta}
              </span>
            );
          })}
        </div>
      )}

      {sinDefinicion && (
        <div className="mt-2 flex flex-col gap-2">
          {urlFullItems.map((it) => (
            <a
              key={it.key}
              href={it.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm shadow-sm transition hover:bg-slate-50"
            >
              <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
                <i className="bx bx-link-external text-lg text-blue-600" />
                {it.label}
              </span>
              <span className="text-xs font-semibold text-blue-600">
                Ver
                <i className="bx bx-chevron-right align-middle text-base" />
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

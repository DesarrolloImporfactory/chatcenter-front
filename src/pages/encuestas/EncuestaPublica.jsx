import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import chatApi from "../../api/chatcenter";

const EMOJIS = [
  {
    score: 1,
    emoji: "😡",
    label: "Muy mala",
    active: "bg-red-50 border-red-300 ring-red-200",
    text: "text-red-500",
  },
  {
    score: 2,
    emoji: "😞",
    label: "Mala",
    active: "bg-orange-50 border-orange-300 ring-orange-200",
    text: "text-orange-500",
  },
  {
    score: 3,
    emoji: "😐",
    label: "Regular",
    active: "bg-yellow-50 border-yellow-300 ring-yellow-200",
    text: "text-yellow-500",
  },
  {
    score: 4,
    emoji: "😊",
    label: "Buena",
    active: "bg-emerald-50 border-emerald-300 ring-emerald-200",
    text: "text-emerald-500",
  },
  {
    score: 5,
    emoji: "🤩",
    label: "Excelente",
    active: "bg-cyan-50 border-cyan-300 ring-cyan-200",
    text: "text-cyan-500",
  },
];

/**
 * Códigos de país para el link público. Misma lista que el registro
 * (`pages/register/Register.jsx`): son los países donde hay clientes.
 */
const PAISES = [
  { code: "+593", flag: "🇪🇨", name: "Ecuador" },
  { code: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "+51", flag: "🇵🇪", name: "Perú" },
  { code: "+52", flag: "🇲🇽", name: "México" },
  { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "+55", flag: "🇧🇷", name: "Brasil" },
  { code: "+58", flag: "🇻🇪", name: "Venezuela" },
  { code: "+591", flag: "🇧🇴", name: "Bolivia" },
  { code: "+595", flag: "🇵🇾", name: "Paraguay" },
  { code: "+598", flag: "🇺🇾", name: "Uruguay" },
  { code: "+507", flag: "🇵🇦", name: "Panamá" },
  { code: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { code: "+34", flag: "🇪🇸", name: "España" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
];

/**
 * Los textos cambian según el tipo de encuesta.
 *
 * `satisfaccion` se responde DESPUÉS de una conversación, así que habla en
 * pasado ("fuiste atendido", "tu calificación"). `webhook_lead` se responde
 * ANTES del primer contacto — el cliente acaba de comprar y todavía no lo
 * atiende nadie, así que esos textos no aplican y sonaban absurdos.
 */
const COPY = {
  satisfaccion: {
    submit: "Enviar mi respuesta",
    graciasTitulo: "¡Gracias por tu calificación!",
    graciasTexto:
      "Tu opinión nos ayuda a mejorar cada día. Agradecemos mucho tu tiempo.",
    yaTitulo: "¡Gracias",
    yaTexto:
      "Ya registramos tu calificación. Agradecemos mucho tu tiempo y tu opinión.",
  },
  lead: {
    submit: "Enviar mis respuestas",
    graciasTitulo: "¡Listo! Ya te tenemos registrado",
    graciasTexto:
      "Recibimos tus respuestas. Tu asesor las va a revisar y se pondrá en contacto contigo por WhatsApp muy pronto.",
    yaTitulo: "¡Todo listo",
    yaTexto:
      "Ya recibimos tus respuestas. Tu asesor se pondrá en contacto contigo por WhatsApp muy pronto.",
  },
};

/**
 * Se muestra sobre el fondo oscuro, FUERA de la tarjeta: el ancho de la
 * tarjeta depende del tipo de encuesta, que no se conoce hasta que responde
 * el servidor. Si se renderizara antes, la tarjeta aparecería con un ancho y
 * se reajustaría al llegar el dato — se veía como un bug.
 */
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-white/10 border-t-blue-400 rounded-full animate-spin mb-4" />
      <p className="text-white/40 text-sm">Cargando encuesta...</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="text-center py-20">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-4">
        <i className="bx bx-error-circle text-3xl text-red-400" />
      </div>
      <h2 className="text-lg font-bold text-gray-700 mb-1">No disponible</h2>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

function AlreadyAnswered({ cliente, copy }) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-50 mb-5">
        <i className="bx bx-check-circle text-4xl text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        {copy.yaTitulo}
        {cliente?.nombre ? `, ${cliente.nombre.split(" ")[0]}` : ""}!
      </h2>
      <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
        {copy.yaTexto}
      </p>
    </div>
  );
}

function ThankYouState({ score, copy }) {
  const emoji = EMOJIS.find((e) => e.score === score);
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-5">{emoji?.emoji || "🎉"}</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        {copy.graciasTitulo}
      </h2>
      <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
        {copy.graciasTexto}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200">
        <i className="bx bx-check text-emerald-500" />
        <span className="text-xs text-emerald-600 font-semibold">
          Respuesta registrada
        </span>
      </div>
    </div>
  );
}

function PreviewBanner() {
  return (
    <div className="mx-4 sm:mx-6 mt-4 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
      <i className="bx bx-show text-amber-500 text-sm" />
      <span className="text-[10px] text-amber-600 font-semibold">
        Vista previa — las respuestas no se guardarán
      </span>
    </div>
  );
}

export default function EncuestaPublica() {
  const { id: idEncuesta } = useParams();
  const [searchParams] = useSearchParams();
  const cid = searchParams.get("cid");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedScore, setSelectedScore] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [errores, setErrores] = useState({});

  // Link público (sin ?cid=): nadie sabe quién está respondiendo. El teléfono
  // es lo único que permite asociar estas respuestas con el chat del cliente,
  // así que ahí sí es obligatorio.
  const [codigoPais, setCodigoPais] = useState("+593");
  const [telefono, setTelefono] = useState("");
  const [nombreContacto, setNombreContacto] = useState("");
  const [errorTelefono, setErrorTelefono] = useState(null);
  const [errorEnvio, setErrorEnvio] = useState(null);

  const isPreview = cid === "preview";
  const requiereTelefono = data?.requiere_telefono === true;

  const esSatisfaccion = data?.encuesta?.tipo === "satisfaccion";
  const copy = esSatisfaccion ? COPY.satisfaccion : COPY.lead;

  // En satisfacción el score global ya cubre la escala 1-5, así que una
  // pregunta rating_1_5 propia sería redundante y se omite.
  const preguntas = (data?.encuesta?.preguntas || []).filter(
    (p) => !(esSatisfaccion && p.type === "rating_1_5"),
  );

  const estaVacia = (valor) =>
    valor === undefined ||
    valor === null ||
    (typeof valor === "string" && !valor.trim()) ||
    (Array.isArray(valor) && valor.length === 0);

  // Progreso sobre las obligatorias: es lo que realmente bloquea el envío.
  const requeridas = preguntas.filter((p) => p.required);
  const respondidas = requeridas.filter(
    (p) => !estaVacia(respuestas[p.key]),
  ).length;
  const progreso = requeridas.length
    ? Math.round((respondidas / requeridas.length) * 100)
    : 0;

  const fetchEncuesta = useCallback(async () => {
    try {
      setLoading(true);
      const url = cid
        ? `encuestas_publico/publica/${idEncuesta}?cid=${cid}`
        : `encuestas_publico/publica/${idEncuesta}`;
      const res = await chatApi.get(url);
      if (!res.data.ok) {
        setError(res.data.error || "Encuesta no disponible");
        return;
      }
      setData(res.data);
    } catch (err) {
      setError("Esta encuesta no está disponible en este momento");
    } finally {
      setLoading(false);
    }
  }, [idEncuesta, cid]);

  useEffect(() => {
    fetchEncuesta();
  }, [fetchEncuesta]);

  /** Dígitos del número local, sin el 0 de marcación nacional. */
  const telefonoDigitos = telefono.replace(/\D/g, "").replace(/^0+/, "");

  const handleSubmit = async () => {
    if (submitting) return;
    if (esSatisfaccion && !selectedScore) return;

    // El teléfono se valida primero: sin él la respuesta no se puede asociar
    // a ningún chat, así que no tiene sentido dejar avanzar el envío.
    if (requiereTelefono && telefonoDigitos.length < 6) {
      setErrorTelefono(
        "Escribe tu número de WhatsApp para poder registrar tu respuesta",
      );
      document
        .getElementById("bloque-contacto")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrorTelefono(null);

    // Validar las obligatorias antes de enviar
    const faltantes = {};
    preguntas.forEach((p) => {
      if (p.required && estaVacia(respuestas[p.key])) faltantes[p.key] = true;
    });

    if (Object.keys(faltantes).length > 0) {
      setErrores(faltantes);
      const primera = preguntas.find((p) => faltantes[p.key]);
      document
        .getElementById(`pregunta-${primera.key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrores({});

    if (isPreview) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    setErrorEnvio(null);
    try {
      const res = await chatApi.post(
        `encuestas_publico/publica/${idEncuesta}/responder`,
        {
          cid: cid || null,
          score: selectedScore,
          respuestas: {
            ...respuestas,
            ...(selectedScore ? { score: selectedScore } : {}),
          },
          // Solo el link público manda contacto: con cid el backend ya sabe
          // de quién es la respuesta.
          ...(requiereTelefono
            ? {
                telefono: telefonoDigitos,
                codigo_pais: codigoPais,
                nombre: nombreContacto.trim() || null,
              }
            : {}),
        },
      );

      // El cooldown de la encuesta solo se puede comprobar al enviar cuando el
      // cliente se identifica con el teléfono: ya respondió hace poco.
      if (res.data?.ya_respondida) {
        setData((prev) => ({ ...prev, ya_respondida: true }));
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      const payload = err.response?.data;
      if (payload?.campo === "telefono") {
        setErrorTelefono(payload.error);
        document
          .getElementById("bloque-contacto")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setErrorEnvio(
          payload?.error || "No pudimos enviar tu respuesta, intenta de nuevo",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateRespuesta = (key, value) => {
    setRespuestas((prev) => ({ ...prev, [key]: value }));
    // Limpiar el error en cuanto empieza a responder
    setErrores((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  /** Marca/desmarca una opción en preguntas de opción múltiple. */
  const toggleOpcion = (key, opcion) => {
    const actual = Array.isArray(respuestas[key]) ? respuestas[key] : [];
    updateRespuesta(
      key,
      actual.includes(opcion)
        ? actual.filter((o) => o !== opcion)
        : [...actual, opcion],
    );
  };

  const inputCls =
    "w-full bg-gray-50/80 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all resize-none";

  return (
    <div className="min-h-[100dvh] bg-[#0a0e1a] flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/[0.07] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-600/[0.05] blur-[100px] pointer-events-none" />
      {/* Hasta que no llega `data` no se sabe el tipo, y el tipo decide el
          ancho. Se muestra solo el spinner: así la tarjeta nace ya con su
          ancho definitivo y nunca se reajusta a la vista. */}
      {loading && <LoadingState />}

      {/* Satisfacción es una sola pregunta con emojis y se ve mejor angosta.
          Las de tipo lead traen varias preguntas: necesitan respirar. */}
      <div
        className={`w-full ${loading ? "hidden" : ""} ${
          esSatisfaccion || !data ? "max-w-md" : "max-w-2xl"
        }`}
      >
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/40 border border-white/10 overflow-hidden ring-1 ring-white/5">
          {/* Header */}
          <div className="relative px-4 sm:px-6 pt-5 sm:pt-7 pb-4 sm:pb-5 bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzAtOS45NC04LjA2LTE4LTE4LTE4IDAgOS45NCA4LjA2IDE4IDE4IDE4em0wIDBjOS45NCAwIDE4IDguMDYgMTggMTgtOS45NCAwLTE4LTguMDYtMTgtMTh6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center shrink-0">
                <i
                  className={`text-white text-xl sm:text-2xl ${
                    esSatisfaccion
                      ? "bx bx-message-rounded-dots"
                      : "bx bx-clipboard"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-white font-bold text-base sm:text-lg truncate">
                  {data?.encuesta?.nombre || "Encuesta"}
                </h1>
                {data?.encuesta?.descripcion && (
                  <p className="text-white/50 text-[11px] sm:text-xs mt-0.5 leading-snug">
                    {data.encuesta.descripcion}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Progreso: solo donde hay varias preguntas obligatorias */}
          {!esSatisfaccion &&
            !loading &&
            !error &&
            !submitted &&
            !data?.ya_respondida &&
            requeridas.length > 1 && (
              <div className="px-4 sm:px-6 pt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {respondidas} de {requeridas.length} respondidas
                  </span>
                  <span className="text-[10px] font-bold text-gray-500">
                    {progreso}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
              </div>
            )}

          {isPreview && !submitted && <PreviewBanner />}

          {/* Content */}
          <div className="px-4 sm:px-6 pb-5 sm:pb-7 pt-4 sm:pt-5">
            {error && <ErrorState message={error} />}
            {data?.ya_respondida && (
              <AlreadyAnswered cliente={data.cliente} copy={copy} />
            )}

            {!loading &&
              !error &&
              data &&
              !data.ya_respondida &&
              !submitted && (
                <>
                  {data.cliente && (
                    <div className="mb-5 sm:mb-6">
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Hola{" "}
                        <span className="font-bold text-gray-800">
                          {data.cliente.nombre?.split(" ")[0] || ""}
                        </span>
                        {esSatisfaccion ? (
                          data.encargado?.nombre && (
                            <>
                              , fuiste atendido por{" "}
                              <span className="font-bold text-blue-600">
                                {data.encargado.nombre}
                              </span>
                            </>
                          )
                        ) : (
                          <>
                            , cuéntanos un poco de ti para poder acompañarte
                            mejor. Te toma menos de un minuto.
                          </>
                        )}
                      </p>

                      {/* El asesor de un lead todavía no lo atendió: se anuncia
                          como asignación futura, no como algo ya ocurrido.
                          Puede no haber ninguno: con el round robin apagado,
                          un comprador nuevo entra sin encargado y solo lo
                          hereda si ya existía en la base. En ese caso se
                          promete el contacto sin nombrar a nadie. */}
                      {!esSatisfaccion &&
                        (data.encargado?.nombre ? (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100">
                            <i className="bx bx-user-check text-blue-500 text-sm" />
                            <span className="text-[11px] text-blue-700">
                              Tu asesor asignado es{" "}
                              <span className="font-bold">
                                {data.encargado.nombre}
                              </span>
                            </span>
                          </div>
                        ) : (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
                            <i className="bx bx-time-five text-gray-400 text-sm" />
                            <span className="text-[11px] text-gray-600">
                              Al terminar, un asesor se pondrá en contacto
                              contigo por WhatsApp
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Contacto: solo en el link público. Sin teléfono no hay
                      forma de unir la respuesta con el chat del cliente, por
                      eso es obligatorio y va antes que las preguntas. */}
                  {requiereTelefono && (
                    <div
                      id="bloque-contacto"
                      className={`mb-5 sm:mb-6 rounded-2xl border p-4 ${
                        errorTelefono
                          ? "border-red-200 bg-red-50/40"
                          : "border-gray-100 bg-gray-50/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                          <i className="bx bxl-whatsapp text-emerald-600 text-base" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-gray-700 leading-tight">
                            ¿Cómo te contactamos?
                          </p>
                          <p className="text-[10px] text-gray-400 leading-snug">
                            Necesitamos tu WhatsApp para registrar tu respuesta
                            y darte seguimiento.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            Tu nombre{" "}
                            <span className="text-gray-300 font-normal">
                              (opcional)
                            </span>
                          </label>
                          <input
                            type="text"
                            value={nombreContacto}
                            onChange={(e) => setNombreContacto(e.target.value)}
                            className={inputCls}
                            placeholder="Nombre y apellido"
                            autoComplete="name"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            WhatsApp
                            <span className="text-red-400 ml-0.5">*</span>
                          </label>
                          <div className="grid grid-cols-[124px_minmax(0,1fr)] gap-2">
                            <select
                              value={codigoPais}
                              onChange={(e) => setCodigoPais(e.target.value)}
                              className={`${inputCls} !w-[124px] pr-2`}
                              aria-label="Código de país"
                            >
                              {PAISES.map((p) => (
                                <option key={p.code} value={p.code}>
                                  {p.flag} {p.code}
                                </option>
                              ))}
                            </select>
                            <input
                              type="tel"
                              inputMode="numeric"
                              value={telefono}
                              onChange={(e) => {
                                setTelefono(e.target.value);
                                if (errorTelefono) setErrorTelefono(null);
                              }}
                              className={`${inputCls} min-w-0 ${
                                errorTelefono
                                  ? "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100"
                                  : ""
                              }`}
                              placeholder="987654321"
                              autoComplete="tel"
                            />
                          </div>
                          {errorTelefono && (
                            <p className="text-[10px] text-red-500 font-medium mt-1.5 flex items-center gap-1">
                              <i className="bx bx-error-circle" />
                              {errorTelefono}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {esSatisfaccion && (
                    <div className="mb-6 sm:mb-7">
                      <p className="text-sm font-semibold text-gray-700 mb-3 sm:mb-4 text-center">
                        ¿Cómo calificarías tu experiencia?
                      </p>
                      <div className="flex justify-center gap-1.5 sm:gap-2.5">
                        {EMOJIS.map((item) => (
                          <button
                            key={item.score}
                            type="button"
                            onClick={() => setSelectedScore(item.score)}
                            className={`flex flex-col items-center gap-1 sm:gap-1.5 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 flex-1 max-w-[68px] ${
                              selectedScore === item.score
                                ? `${item.active} ring-2 scale-105 sm:scale-110 shadow-lg`
                                : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                            }`}
                          >
                            <span
                              className={`text-xl sm:text-2xl transition-transform ${selectedScore === item.score ? "scale-110" : ""}`}
                            >
                              {item.emoji}
                            </span>
                            <span
                              className={`text-[8px] sm:text-[9px] font-bold leading-tight text-center ${
                                selectedScore === item.score
                                  ? item.text
                                  : "text-gray-300"
                              }`}
                            >
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {preguntas.length > 0 && (
                    <div
                      className={
                        esSatisfaccion ? "space-y-5 mb-5" : "space-y-3 mb-5"
                      }
                    >
                      {preguntas.map((pregunta, idx) => {
                        const valor = respuestas[pregunta.key];
                        const conError = !!errores[pregunta.key];
                        const errCls = conError
                          ? "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100"
                          : "";

                        // Con el contenedor ancho, las listas largas se leen
                        // mejor en dos columnas que en una tira vertical.
                        const opcionesCls =
                          !esSatisfaccion && pregunta.options?.length >= 4
                            ? "grid sm:grid-cols-2 gap-1.5"
                            : "space-y-1.5";

                        return (
                          <div
                            key={pregunta.key || idx}
                            id={`pregunta-${pregunta.key}`}
                            className={
                              esSatisfaccion
                                ? ""
                                : `rounded-2xl border p-4 transition-colors ${
                                    conError
                                      ? "border-red-200 bg-red-50/30"
                                      : "border-gray-100 bg-gray-50/40"
                                  }`
                            }
                          >
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              {!esSatisfaccion && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-900 text-white text-[10px] font-bold mr-2 align-middle">
                                  {idx + 1}
                                </span>
                              )}
                              <span className="align-middle text-[13px]">
                                {pregunta.label}
                              </span>
                              {pregunta.required && (
                                <span className="text-red-400 ml-0.5">*</span>
                              )}
                            </label>

                            {pregunta.hint && (
                              <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">
                                {pregunta.hint}
                              </p>
                            )}

                            {/* Texto largo */}
                            {(pregunta.type === "textarea" ||
                              !pregunta.type) && (
                              <textarea
                                value={valor || ""}
                                onChange={(e) =>
                                  updateRespuesta(pregunta.key, e.target.value)
                                }
                                rows={3}
                                className={`${inputCls} ${errCls}`}
                                placeholder={
                                  pregunta.placeholder || "Tu respuesta..."
                                }
                              />
                            )}

                            {/* Texto corto */}
                            {pregunta.type === "text" && (
                              <input
                                type="text"
                                value={valor || ""}
                                onChange={(e) =>
                                  updateRespuesta(pregunta.key, e.target.value)
                                }
                                className={`${inputCls} ${errCls}`}
                                placeholder={
                                  pregunta.placeholder || "Tu respuesta..."
                                }
                              />
                            )}

                            {/* Numérico */}
                            {pregunta.type === "number" && (
                              <input
                                type="number"
                                inputMode="numeric"
                                value={valor ?? ""}
                                onChange={(e) =>
                                  updateRespuesta(pregunta.key, e.target.value)
                                }
                                className={`${inputCls} ${errCls}`}
                                placeholder={pregunta.placeholder || "0"}
                              />
                            )}

                            {/* Lista desplegable */}
                            {pregunta.type === "select" &&
                              pregunta.options?.length > 0 && (
                                <select
                                  value={valor || ""}
                                  onChange={(e) =>
                                    updateRespuesta(
                                      pregunta.key,
                                      e.target.value,
                                    )
                                  }
                                  className={`${inputCls} ${errCls}`}
                                >
                                  <option value="">Selecciona...</option>
                                  {pregunta.options.map((opt, i) => (
                                    <option key={i} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              )}

                            {/* Opción única */}
                            {pregunta.type === "radio" &&
                              pregunta.options?.length > 0 && (
                                <div
                                  className={`${opcionesCls} ${
                                    conError && esSatisfaccion
                                      ? "rounded-xl ring-2 ring-red-100 p-1"
                                      : ""
                                  }`}
                                >
                                  {pregunta.options.map((opt, i) => {
                                    const activa = valor === opt;
                                    return (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() =>
                                          updateRespuesta(pregunta.key, opt)
                                        }
                                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-2 text-left transition-all ${
                                          activa
                                            ? "border-blue-400 bg-blue-50/70 shadow-sm"
                                            : "border-gray-100 bg-gray-50/60 hover:border-gray-200 hover:bg-gray-50"
                                        }`}
                                      >
                                        <span
                                          className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                                            activa
                                              ? "border-blue-500"
                                              : "border-gray-300"
                                          }`}
                                        >
                                          {activa && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                          )}
                                        </span>
                                        <span
                                          className={`text-sm ${
                                            activa
                                              ? "text-gray-900 font-semibold"
                                              : "text-gray-600"
                                          }`}
                                        >
                                          {opt}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                            {/* Opción múltiple */}
                            {pregunta.type === "checkbox" &&
                              pregunta.options?.length > 0 && (
                                <div
                                  className={`${opcionesCls} ${
                                    conError && esSatisfaccion
                                      ? "rounded-xl ring-2 ring-red-100 p-1"
                                      : ""
                                  }`}
                                >
                                  {pregunta.options.map((opt, i) => {
                                    const marcada =
                                      Array.isArray(valor) &&
                                      valor.includes(opt);
                                    return (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() =>
                                          toggleOpcion(pregunta.key, opt)
                                        }
                                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-2 text-left transition-all ${
                                          marcada
                                            ? "border-blue-400 bg-blue-50/70 shadow-sm"
                                            : "border-gray-100 bg-gray-50/60 hover:border-gray-200 hover:bg-gray-50"
                                        }`}
                                      >
                                        <span
                                          className={`w-4 h-4 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${
                                            marcada
                                              ? "border-blue-500 bg-blue-500"
                                              : "border-gray-300"
                                          }`}
                                        >
                                          {marcada && (
                                            <i className="bx bx-check text-white text-xs" />
                                          )}
                                        </span>
                                        <span
                                          className={`text-sm ${
                                            marcada
                                              ? "text-gray-900 font-semibold"
                                              : "text-gray-600"
                                          }`}
                                        >
                                          {opt}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                            {/* Escala 1-5 propia */}
                            {pregunta.type === "rating_1_5" && (
                              <div className="flex justify-center gap-1.5 sm:gap-2.5">
                                {EMOJIS.map((item) => {
                                  const activa = valor === item.score;
                                  return (
                                    <button
                                      key={item.score}
                                      type="button"
                                      onClick={() =>
                                        updateRespuesta(
                                          pregunta.key,
                                          item.score,
                                        )
                                      }
                                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all flex-1 max-w-[68px] ${
                                        activa
                                          ? `${item.active} ring-2 scale-105 shadow-lg`
                                          : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                                      }`}
                                    >
                                      <span className="text-xl">
                                        {item.emoji}
                                      </span>
                                      <span
                                        className={`text-[8px] font-bold leading-tight text-center ${
                                          activa ? item.text : "text-gray-300"
                                        }`}
                                      >
                                        {item.label}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {conError && (
                              <p className="text-[10px] text-red-500 font-medium mt-1.5 flex items-center gap-1">
                                <i className="bx bx-error-circle" />
                                Esta pregunta es obligatoria
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {esSatisfaccion &&
                    !preguntas.some(
                      (p) => p.type === "textarea" && p.key === "comentario",
                    ) && (
                      <div className="mb-5 sm:mb-6">
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          ¿Algún comentario adicional?{" "}
                          <span className="text-gray-300 font-normal">
                            (opcional)
                          </span>
                        </label>
                        <textarea
                          value={respuestas.comentario || ""}
                          onChange={(e) =>
                            updateRespuesta("comentario", e.target.value)
                          }
                          rows={3}
                          className={inputCls}
                          placeholder="Cuéntanos más sobre tu experiencia..."
                        />
                      </div>
                    )}

                  {errorEnvio && (
                    <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                      <i className="bx bx-error-circle text-red-400 text-sm mt-0.5" />
                      <span className="text-[11px] text-red-600 leading-snug">
                        {errorEnvio}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || (esSatisfaccion && !selectedScore)}
                    className={`w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm font-bold transition-all duration-200 ${
                      submitting || (esSatisfaccion && !selectedScore)
                        ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                        : "bg-slate-900 text-white shadow-lg shadow-slate-300/30 hover:shadow-xl hover:shadow-slate-400/30 hover:bg-slate-800 active:scale-[0.98]"
                    }`}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="bx bx-loader-alt bx-spin" /> Enviando...
                      </span>
                    ) : (
                      copy.submit
                    )}
                  </button>

                  {esSatisfaccion && !selectedScore && (
                    <p className="text-center text-[10px] text-gray-300 mt-2">
                      Selecciona una calificación para continuar
                    </p>
                  )}
                </>
              )}

            {submitted && <ThankYouState score={selectedScore} copy={copy} />}
          </div>
        </div>

        <p className="text-center mt-3">
          <span className="text-[10px] text-white/20">
            Encuesta generada por{" "}
          </span>
          <span className="text-[10px] text-blue-400/40 font-bold">
            ImporChat
          </span>
        </p>
      </div>
    </div>
  );
}

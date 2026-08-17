import React, { useEffect, useRef, useState } from "react";
import chatApi from "../../../api/chatcenter";

/* Importar un ítem desde una publicación que ya existe.
   ─────────────────────────────────────────────────────────────
   Cargar algo a mano son diez o quince campos que ya están escritos en el
   anuncio. Eso es lo que hace que un catálogo nunca esté al día — y un catálogo
   viejo es un bot ofreciendo lo que ya se vendió.

   Un solo campo, dos caminos que terminan en el mismo borrador editable:
   un enlace, o el texto pegado. Cuál de los dos es se detecta solo.

   ── El caso importante: la página bloqueada ──
   Varios portales (Plusvalía entre ellos) no se dejan leer desde un servidor.
   Eso NO es un error del usuario ni algo que pueda arreglar, así que no se
   presenta como un error: la primera versión mostraba un cartelito y la
   respuesta fue "no es nada apreciable" — con razón, porque leer un aviso y
   deducir qué hacer es trabajo que le estábamos pasando a él.

   Ahora el modal cambia de estado y se convierte en tres pasos numerados, con
   el botón para abrir la página y las teclas dibujadas. No hay nada que
   interpretar: se ve qué sigue. */

/* Un enlace es una línea sola que empieza con http. Cualquier otra cosa es el
   anuncio pegado. Distinguirlo es trivial, así que preguntárselo con dos
   pestañas era hacerle tomar una decisión que el programa puede tomar. */
const esEnlace = (v) => {
  const s = String(v || "").trim();
  return /^https?:\/\/\S+$/i.test(s) && !/\s/.test(s);
};

/* Una tecla dibujada como tecla. "Ctrl+A" en medio de una frase se lee como
   ruido; con forma de tecla se reconoce sin leer. */
const Tecla = ({ children }) => (
  <kbd className="inline-flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-md border border-slate-300 border-b-2 bg-white text-[11px] font-bold text-slate-700 shadow-sm">
    {children}
  </kbd>
);

const Paso = ({ n, titulo, children, hecho }) => (
  <div className="flex gap-3">
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 ${
        hecho ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white"
      }`}
    >
      {hecho ? <i className="bx bx-check text-sm" /> : n}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-slate-800">{titulo}</p>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  </div>
);

const ImportarDesdeEnlaceModal = ({ open, onClose, onImportado }) => {
  const [valor, setValor] = useState("");
  const [cargando, setCargando] = useState(false);
  // { tipo: 'bloqueado' | 'error', mensaje, enlace }
  const [aviso, setAviso] = useState(null);
  const areaRef = useRef(null);

  useEffect(() => {
    if (open) {
      setAviso(null);
      setValor("");
    }
  }, [open]);

  if (!open) return null;

  const entrada = valor.trim();
  const modoDetectado = esEnlace(entrada) ? "url" : entrada ? "texto" : null;

  /* Con la página bloqueada el modal deja de ser un formulario y pasa a ser una
     guía. El textarea sigue existiendo, pero como el paso 3. */
  const guiando = aviso?.tipo === "bloqueado";
  const yaPego = guiando && modoDetectado === "texto";

  const importar = async () => {
    if (!entrada) {
      setAviso({
        tipo: "error",
        mensaje: "Pega el enlace de la publicación o su texto completo.",
      });
      areaRef.current?.focus();
      return;
    }

    setCargando(true);
    try {
      const idc = parseInt(localStorage.getItem("id_configuracion"));
      const { data } = await chatApi.post(
        "/productos/importarDesdeUrl",
        {
          id_configuracion: idc,
          ...(modoDetectado === "url" ? { url: entrada } : { texto: entrada }),
        },
        // El aviso se muestra acá adentro; el interceptor global no tiene que
        // sacar su propio popup encima.
        { silentError: true },
      );

      const r = data?.data;
      if (!r?.borrador) throw new Error("Respuesta vacía");

      onImportado(r.borrador, { uso_ia: r.uso_ia, aviso: r.aviso });
      onClose();
      setValor("");
    } catch (e) {
      const resp = e?.response?.data;

      if (resp?.requiere_texto) {
        /* El enlace se guarda aparte y el campo se vacía: lo que sigue es
           pegar el texto ahí, y dejarle la URL adentro obligaría a borrarla
           antes. El botón para abrir la página conserva el enlace. */
        setAviso({
          tipo: "bloqueado",
          enlace: resp.enlace || entrada,
          mensaje: resp.message,
        });
        setValor("");
      } else {
        setAviso({
          tipo: "error",
          mensaje:
            resp?.message ||
            e.message ||
            "No se pudo leer la publicación. Prueba pegando su texto.",
        });
      }
    } finally {
      setCargando(false);
    }
  };

  const areaCls =
    "w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 focus:bg-white resize-none transition-all";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-800">
              Importar desde una publicación
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Se arma el borrador y tú lo revisas antes de guardar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none flex-shrink-0"
            aria-label="Cerrar"
          >
            <i className="bx bx-x" />
          </button>
        </div>

        {guiando ? (
          /* ═══ MODO GUÍA — la página no se deja leer ═══ */
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-3">
              <i className="bx bx-lock-alt text-slate-400 text-lg mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-600 leading-relaxed">
                {aviso.mensaje || "Esta página no se dejó leer desde aquí."}{" "}
                Cópiala tú y sale exactamente igual — son unos segundos.
              </p>
            </div>

            <Paso n="1" titulo="Abre la publicación" hecho={yaPego}>
              <a
                href={aviso.enlace}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
              >
                <i className="bx bx-link-external" />
                Abrir en otra pestaña
              </a>
            </Paso>

            <Paso n="2" titulo="Ahí adentro, selecciona y copia" hecho={yaPego}>
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
                <Tecla>Ctrl</Tecla>
                <span className="text-slate-400">+</span>
                <Tecla>A</Tecla>
                <span className="mx-1.5">luego</span>
                <Tecla>Ctrl</Tecla>
                <span className="text-slate-400">+</span>
                <Tecla>C</Tecla>
              </div>
            </Paso>

            <Paso n="3" titulo="Vuelve y pega aquí" hecho={yaPego}>
              <textarea
                ref={areaRef}
                autoFocus
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                rows={5}
                placeholder="Pega aquí lo que copiaste…"
                className={`${areaCls} ${
                  yaPego
                    ? "border-emerald-300 bg-emerald-50/40"
                    : "border-indigo-300 bg-indigo-50/40 ring-2 ring-indigo-500/15"
                }`}
              />
              {yaPego && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1.5 font-medium">
                  <i className="bx bx-check-circle" />
                  {entrada.length.toLocaleString("es-EC")} caracteres pegados.
                  Ya puedes importar.
                </p>
              )}
            </Paso>
          </div>
        ) : (
          /* ═══ MODO NORMAL ═══ */
          <div className="p-6 space-y-4">
            {aviso?.tipo === "error" && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                <i className="bx bx-error-circle text-rose-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-rose-700 leading-relaxed">
                  {aviso.mensaje}
                </p>
              </div>
            )}

            <textarea
              ref={areaRef}
              autoFocus
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                if (aviso) setAviso(null);
              }}
              rows={8}
              placeholder={
                "Pega aquí el enlace de la publicación…\n\n" +
                "O su texto completo: abre la página, Ctrl+A, Ctrl+C y pega."
              }
              className={`${areaCls} border-slate-300 bg-slate-50`}
            />

            {/* Qué entendió. Confirma sin preguntar nada. */}
            <div className="flex items-start gap-2 text-xs min-h-[18px]">
              {modoDetectado === "url" && (
                <>
                  <i className="bx bx-link text-indigo-500 mt-0.5" />
                  <span className="text-slate-500">
                    Enlace detectado. Si la página no se deja leer, te guío para
                    copiarla.
                  </span>
                </>
              )}
              {modoDetectado === "texto" && (
                <>
                  <i className="bx bx-check-circle text-emerald-500 mt-0.5" />
                  <span className="text-slate-500">
                    Texto pegado ({entrada.length.toLocaleString("es-EC")}{" "}
                    caracteres). Da igual que traiga menús y botones: se lee solo
                    lo del ítem.
                  </span>
                </>
              )}
            </div>

            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <i className="bx bx-info-circle text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Revisa el precio antes de guardar: es el dato que el asistente le
                va a repetir a cada persona que pregunte.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
          {guiando ? (
            <button
              onClick={() => {
                setAviso(null);
                setValor("");
              }}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              ← Probar con otro enlace
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={cargando}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={importar}
              disabled={cargando || (guiando && !entrada)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-sm text-white font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-40"
            >
              {cargando ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" />
                  Leyendo…
                </>
              ) : (
                <>
                  <i className="bx bx-import" />
                  Importar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportarDesdeEnlaceModal;

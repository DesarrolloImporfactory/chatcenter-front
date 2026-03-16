import React, { useState, useEffect, useRef } from "react";

const IL_IMG =
  "https://imp-datas.s3.amazonaws.com/images/2026-03-16T01-13-57-545Z-Gemini_Generated_Image_wn6s7iwn6s7iwn6s.png";

const I = {
  image: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  bolt: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  layout: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  ),
  palette: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="8" r="1.5" fill={c} />
      <circle cx="8" cy="14" r="1.5" fill={c} />
      <circle cx="16" cy="14" r="1.5" fill={c} />
    </svg>
  ),
  link: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  ),
  truck: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  check: (c = "#10B981") => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill={c} opacity="0.12" />
      <path
        d="M6.5 10.5l2.5 2.5 5-5"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  layers: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  globe: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  target: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  download: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  sparkles: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z" />
    </svg>
  ),
  grid: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  edit: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  shop: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  bar: (c = "#10B981") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
};

const IPhone = ({ children }) => (
  <div className="relative mx-auto" style={{ width: 270, height: 545 }}>
    <div
      className="absolute inset-0 rounded-[42px] shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
      style={{ background: "linear-gradient(145deg,#2a2a3e,#0f0f1a)" }}
    />
    <div className="absolute inset-[3px] rounded-[39px] bg-black" />
    <div className="absolute inset-[5px] rounded-[37px] overflow-hidden bg-white">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[26px] bg-black rounded-b-2xl z-20" />
      <div className="relative w-full h-full overflow-hidden">{children}</div>
    </div>
    <div
      className="absolute inset-0 rounded-[42px] pointer-events-none"
      style={{
        background:
          "linear-gradient(160deg,rgba(255,255,255,0.1) 0%,transparent 35%)",
      }}
    />
  </div>
);

/* Phone: image top half + prompt bottom */
const PhoneContent = ({ cachedSrc }) => (
  <div className="w-full h-full flex flex-col bg-slate-50">
    <div className="h-[50%] overflow-hidden relative">
      {cachedSrc ? (
        <img
          src={cachedSrc}
          alt="Landing generada"
          className="w-full h-full object-cover object-center"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-b from-emerald-600 to-teal-700 grid place-items-center">
          <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-50 to-transparent" />
    </div>
    <div className="flex-1 px-3 py-2 flex flex-col">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-4 h-4 rounded bg-emerald-100 grid place-items-center">
          {I.sparkles("#10B981")}
        </div>
        <span className="text-[9px] font-bold text-slate-700">
          Datos del producto
        </span>
      </div>
      <div className="flex-1 rounded-xl bg-white border border-slate-200 p-2.5 shadow-sm space-y-1.5">
        <div>
          <p className="text-[7px] font-bold text-emerald-600 uppercase tracking-wider">
            Titulo
          </p>
          <p className="text-[9px] text-slate-700">
            Parlante Bluetooth Portatil
          </p>
        </div>
        <div>
          <p className="text-[7px] font-bold text-emerald-600 uppercase tracking-wider">
            Descripcion
          </p>
          <p className="text-[9px] text-slate-600 leading-relaxed">
            Sonido envolvente 360, bateria 12h, resistente al agua IPX7
          </p>
        </div>
        <div className="flex gap-3">
          <div>
            <p className="text-[7px] font-bold text-emerald-600 uppercase tracking-wider">
              Precio
            </p>
            <p className="text-[9px] text-slate-700 font-bold">$89.90</p>
          </div>
          <div>
            <p className="text-[7px] font-bold text-emerald-600 uppercase tracking-wider">
              Seccion
            </p>
            <p className="text-[9px] text-slate-700">Hero principal</p>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <div className="h-1 flex-1 rounded-full bg-emerald-500" />
          <span className="text-[7px] text-emerald-600 font-bold">
            Generado exitosamente
          </span>
        </div>
      </div>
      <div className="mt-2 flex gap-1.5">
        <div className="flex-1 bg-emerald-600 text-white text-center py-1.5 rounded-lg text-[8px] font-bold">
          Descargar
        </div>
        <div className="flex-1 bg-white text-slate-600 text-center py-1.5 rounded-lg text-[8px] font-semibold border border-slate-200">
          Regenerar
        </div>
      </div>
    </div>
  </div>
);

const FeatureCard = ({ icon, title, desc, bullets = [] }) => (
  <div className="rounded-2xl bg-white border border-slate-200/60 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
    <div
      className="w-12 h-12 rounded-xl grid place-items-center mb-4 transition-transform group-hover:scale-110"
      style={{
        background: "rgba(16,185,129,0.06)",
        border: "1px solid rgba(16,185,129,0.12)",
      }}
    >
      {icon}
    </div>
    <h4 className="text-base font-bold text-[#0B1426]">{title}</h4>
    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
    {bullets.length > 0 && (
      <ul className="mt-3 space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
            {I.check("#10B981")}
            <span>{b}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const StepCard = ({ number, title, desc }) => (
  <div>
    <div
      className="w-10 h-10 rounded-full grid place-items-center text-white text-sm font-extrabold mb-4 shadow-lg"
      style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}
    >
      {number}
    </div>
    <h4 className="text-sm font-bold text-[#0B1426]">{title}</h4>
    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
  </div>
);

const TabInstaLanding = ({ onLogin }) => {
  const [cachedSrc, setCachedSrc] = useState(null);
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        setCachedSrc(c.toDataURL("image/jpeg", 0.9));
      } catch {
        setCachedSrc(IL_IMG);
      }
    };
    img.onerror = () => setCachedSrc(IL_IMG);
    img.src = IL_IMG;
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="relative pt-6 pb-14 sm:pb-20 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(16,185,129,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.015) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div
          className="absolute top-0 left-0 w-[600px] h-[600px] pointer-events-none opacity-50"
          style={{
            background:
              "radial-gradient(circle,rgba(16,185,129,0.08),transparent 60%)",
          }}
        />
        <div className="relative w-full px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="relative flex justify-center order-2 lg:order-1">
              <IPhone>
                <PhoneContent cachedSrc={cachedSrc} />
              </IPhone>
              <div className="absolute -left-4 sm:-left-8 top-12 z-20 px-3.5 py-2.5 rounded-xl bg-white shadow-lg border border-slate-100 animate-[floatY_3s_ease-in-out_infinite]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 grid place-items-center">
                    {I.sparkles("#10B981")}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#0B1426]">
                      Designer Pro{" "}
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="absolute -right-4 sm:-right-8 top-24 z-20 px-3.5 py-2.5 rounded-xl bg-white shadow-lg border border-slate-100 animate-[floatY_3s_ease-in-out_infinite]"
                style={{ animationDelay: "400ms" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 grid place-items-center">
                    {I.layers("#10B981")}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#0B1426]">
                      +280 templates
                    </p>
                    <p className="text-[8px] text-slate-400">
                      Listos para usar
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="absolute -left-2 bottom-28 z-20 px-3.5 py-2.5 rounded-xl bg-[#0B1426] shadow-lg animate-[floatY_3s_ease-in-out_infinite]"
                style={{ animationDelay: "700ms" }}
              >
                <div className="flex items-center gap-2">
                  {I.bolt("#10B981")}
                  <div>
                    <p className="text-[10px] font-bold text-emerald-400">
                      10 secciones
                    </p>
                    <p className="text-[8px] text-slate-400">
                      por landing page
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="absolute -right-2 bottom-40 z-20 px-3 py-2 rounded-xl shadow-lg animate-[floatY_3s_ease-in-out_infinite]"
                style={{
                  animationDelay: "1000ms",
                  background: "linear-gradient(135deg,#10B981,#059669)",
                }}
              >
                <p className="text-[10px] font-bold text-white">
                  120 banners/mes
                </p>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider mb-5"
                style={{
                  color: "#10B981",
                  background: "rgba(16,185,129,0.06)",
                  border: "1px solid rgba(16,185,129,0.15)",
                }}
              >
                {I.sparkles("#10B981")} Generador de contenido con IA
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#0B1426] tracking-[-0.03em] leading-[1.08]">
                Landing pages y banners{" "}
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  profesionales en segundos
                </span>
              </h2>
              <p className="mt-4 text-sm sm:text-[15px] text-slate-500 leading-relaxed max-w-lg">
                Ingrese el titulo, descripcion y precio de su producto. Nuestra
                IA genera banners de venta, landing pages con hasta 10 secciones
                y angulos persuasivos — listo para publicar en Shopify, Dropi o
                su tienda propia.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { name: "Designer Pro", color: "#10B981" },
                  { name: "Dropi integrado", color: "#F59E0B" },
                  { name: "+280 templates", color: "#6366F1" },
                  { name: "Editor AI textos", color: "#00BFFF" },
                  { name: "Compatible Shopify", color: "#96bf48" },
                ].map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200/60"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: t.color }}
                    />
                    {t.name}
                  </span>
                ))}
              </div>
              <div className="mt-6">
                <button
                  onClick={onLogin}
                  className="px-7 py-3.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-[1px]"
                  style={{
                    background: "linear-gradient(135deg,#10B981,#059669)",
                  }}
                >
                  Prueba gratuita — 10 imagenes
                </button>
              </div>
            </div>
          </div>
        </div>
        <style>{`@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      </section>

      {/* STATS */}
      <section
        className="py-10"
        style={{ background: "linear-gradient(180deg,#064e3b,#065f46)" }}
      >
        <div className="w-full px-5 sm:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              {
                v: "120+",
                l: "Banners por mes",
                d: "Todo el contenido visual que necesite.",
              },
              {
                v: "30",
                l: "Angulos AI",
                d: "Multiples enfoques persuasivos por producto.",
              },
              {
                v: "10",
                l: "Secciones por landing",
                d: "Hero, beneficios, precios, testimonios y mas.",
              },
              {
                v: "280+",
                l: "Templates",
                d: "Disenos profesionales listos para usar.",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 text-center"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-300 tracking-tight">
                  {s.v}
                </p>
                <p className="text-xs font-bold text-white mt-1">{s.l}</p>
                <p className="text-[10px] text-emerald-200/50 mt-1">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10 REAL SECTIONS */}
      <section
        className="py-14 sm:py-20"
        style={{
          background: "linear-gradient(180deg,#ecfdf5,#f8fafc 50%,white)",
        }}
      >
        <div className="w-full px-5 sm:px-8">
          <div className="text-center mb-12">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-3"
              style={{
                color: "#10B981",
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.12)",
              }}
            >
              {I.grid("#10B981")} 10 secciones disponibles
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B1426] tracking-tight">
              Cada landing se compone de secciones profesionales
            </h3>
            <p className="mt-2 text-sm text-slate-500 max-w-lg mx-auto">
              La IA genera cada seccion con textos persuasivos optimizados para
              plataformas como Shopify, Dropi o tiendas propias.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
            {[
              {
                name: "Hero",
                desc: "Primera impresion — producto integrado con CTA",
              },
              {
                name: "Oferta",
                desc: "Precio tachado, descuento y urgencia de compra",
              },
              {
                name: "Antes / Despues",
                desc: "Resultados visibles — ideal para belleza, salud, fitness",
              },
              {
                name: "Beneficios",
                desc: "Argumentos concretos que justifican la compra",
              },
              {
                name: "Tabla Comparativa",
                desc: "Diferenciacion vs competidores genericos",
              },
              {
                name: "Prueba de Autoridad",
                desc: "Certificaciones y avales — confianza institucional",
              },
              {
                name: "Testimonios",
                desc: "Prueba social — clientes reales y resenas",
              },
              {
                name: "Modo de Uso",
                desc: "Pasos simples — reduce friccion de compra",
              },
              {
                name: "Logistica",
                desc: "Envio gratis, pago contraentrega, entrega rapida",
              },
              {
                name: "Preguntas Frecuentes",
                desc: "Resuelve objeciones finales antes del checkout",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-xl bg-white border border-emerald-200/30 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-md grid place-items-center text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200">
                    {i + 1}
                  </span>
                  <span className="text-[11px] font-bold text-[#0B1426]">
                    {s.name}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        className="py-14 sm:py-20"
        style={{
          background: "linear-gradient(180deg,white,#f0fdf4 50%,#ecfdf5)",
        }}
      >
        <div className="w-full px-5 sm:px-8">
          <div className="text-center mb-12">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-3"
              style={{
                color: "#10B981",
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.12)",
              }}
            >
              {I.bolt("#10B981")} Capacidades
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B1426] tracking-tight">
              Del producto al contenido de venta en segundos
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            <FeatureCard
              icon={I.image("#10B981")}
              title="Banners de producto AI"
              desc="Suba la foto y obtenga banners para redes, Shopify, Dropi y campanas."
              bullets={[
                "Formatos 9:16, 1:1, 16:9",
                "Textos persuasivos generados por IA",
                "Descarga en alta resolucion",
              ]}
            />
            <FeatureCard
              icon={I.layout("#10B981")}
              title="Landing pages de 10 secciones"
              desc="Hero, oferta, beneficios, comparativa, testimonios, logistica, FAQ y mas."
              bullets={[
                "Contenido generado por seccion",
                "Optimizado para conversion",
                "Compatible con cualquier plataforma",
              ]}
            />
            <FeatureCard
              icon={I.bolt("#10B981")}
              title="Angulos de venta profesionales"
              desc="La IA genera multiples angulos persuasivos para diferentes audiencias."
              bullets={[
                "Hasta 30 angulos por producto",
                "Enfoque emocional, racional, urgencia",
                "Ideal para productos premium",
              ]}
            />
            <FeatureCard
              icon={I.edit("#10B981")}
              title="Editor AI de textos"
              desc="Edite y regenere textos de cualquier seccion con el tono que necesite."
              bullets={[
                "Ajuste de tono y longitud",
                "Variaciones por seccion",
                "Copys optimizados para venta",
              ]}
            />
            <FeatureCard
              icon={I.truck("#10B981")}
              title="Integracion Dropi nativa"
              desc="Importe productos Dropi y genere contenido. Stock y precios sincronizados."
              bullets={[
                "Importar con un click",
                "Fotos, precios, descripciones",
                "Ordenes COD integradas",
              ]}
            />
            <FeatureCard
              icon={I.shop("#10B981")}
              title="Compatible con e-commerce"
              desc="Optimizado para Shopify, Dropi, WooCommerce y tiendas propias."
              bullets={[
                "Formato adaptable",
                "SEO basico incluido",
                "Landing publica con enlace unico",
              ]}
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        className="py-14 sm:py-20"
        style={{
          background: "linear-gradient(180deg,#ecfdf5,#f1f5f9 50%,white)",
        }}
      >
        <div className="w-full px-5 sm:px-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B1426] tracking-tight">
              De cero a landing en 60 segundos
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Sin disenador, sin Photoshop.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <StepCard
              number="1"
              title="Ingrese su producto"
              desc="Titulo, descripcion y precio. O importelo directo desde Dropi."
            />
            <StepCard
              number="2"
              title="Elija template y secciones"
              desc="Seleccione entre +280 templates y las secciones que quiere generar."
            />
            <StepCard
              number="3"
              title="La IA genera todo"
              desc="Nuestra IA crea el banner y cada seccion con textos de venta."
            />
            <StepCard
              number="4"
              title="Publique y venda"
              desc="Descargue, comparta la landing o conecte con Shopify y Dropi."
            />
          </div>
        </div>
      </section>

      {/* DROPI */}
      <section
        className="py-14 sm:py-20"
        style={{
          background: "linear-gradient(180deg,white,#fffbeb 50%,#fef3c7)",
        }}
      >
        <div className="w-full px-5 sm:px-8">
          <div className="text-center mb-12">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-3"
              style={{
                color: "#d97706",
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.15)",
              }}
            >
              {I.truck("#d97706")} Integracion nativa
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B1426] tracking-tight">
              Dropi + Insta Landing
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {[
              {
                icon: I.download("#d97706"),
                title: "Importar catalogo Dropi",
                desc: "Sincronice su catalogo. Fotos, precios y stock automaticamente.",
                bullets: [
                  "Sincronizacion en 1 click",
                  "Hasta 20 productos o ilimitado (Pro)",
                  "Stock en tiempo real",
                ],
              },
              {
                icon: I.image("#d97706"),
                title: "Generar contenido por producto",
                desc: "Seleccione un producto Dropi y genere banners y landings con 10 secciones.",
                bullets: [
                  "Banner + landing en 60 segundos",
                  "Textos adaptados al producto",
                  "Multiples angulos de venta",
                ],
              },
              {
                icon: I.globe("#d97706"),
                title: "Ordenes COD integradas",
                desc: "Gestione pedidos contra entrega. Estados, cobranzas y reportes.",
                bullets: [
                  "Panel de ordenes",
                  "Estados de envio",
                  "Reportes de devoluciones",
                ],
              },
              {
                icon: I.link("#d97706"),
                title: "Flujo completo automatizado",
                desc: "Producto Dropi, landing AI, agente WhatsApp, orden COD. Todo conectado.",
                bullets: [
                  "Landing con enlace de compra",
                  "Agente AI cierra la venta",
                  "Orden en Dropi automatica",
                ],
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-amber-200/30 p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div
                  className="w-11 h-11 rounded-xl grid place-items-center mb-4"
                  style={{
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.12)",
                  }}
                >
                  {item.icon}
                </div>
                <h4 className="text-base font-bold text-[#0B1426]">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {item.desc}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {item.bullets.map((b, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2 text-xs text-slate-600"
                    >
                      {I.check("#d97706")}
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-12"
        style={{
          background: "linear-gradient(135deg,#064e3b,#065f46 50%,#047857)",
        }}
      >
        <div className="w-full px-5 sm:px-8 text-center">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Empiece a crear contenido que vende
          </h3>
          <p className="mt-2 text-sm text-emerald-200/70 max-w-md mx-auto">
            10 imagenes gratis para probar. Luego $5 su primer mes.
          </p>
          <div
            className="mt-5 inline-flex items-center gap-6 py-3 px-8 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="text-center">
              <span className="text-3xl font-extrabold text-emerald-300">
                10
              </span>
              <p className="text-[10px] text-emerald-200/60 mt-0.5">
                imagenes gratis
              </p>
            </div>
            <div
              className="w-px h-10"
              style={{ background: "rgba(255,255,255,0.1)" }}
            />
            <div className="text-center">
              <span className="text-3xl font-extrabold text-white">$5</span>
              <p className="text-[10px] text-emerald-200/60 mt-0.5">
                primer mes
              </p>
            </div>
            <div
              className="w-px h-10"
              style={{ background: "rgba(255,255,255,0.1)" }}
            />
            <div className="text-center">
              <span className="text-3xl font-extrabold text-white">$29</span>
              <p className="text-[10px] text-emerald-200/60 mt-0.5">
                luego/mes
              </p>
            </div>
          </div>
          <div className="mt-5">
            <button
              onClick={onLogin}
              className="px-8 py-4 rounded-xl text-sm font-bold text-emerald-800 bg-white hover:bg-emerald-50 transition-all shadow-lg hover:-translate-y-[1px]"
            >
              Activar prueba gratuita — 10 imagenes
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default TabInstaLanding;

import React, { useState, useEffect, useRef } from "react";

const PRODUCT_IMG =
  "https://imp-datas.s3.amazonaws.com/images/2026-03-16T02-07-59-623Z-Screenshot_2026-03-15_210738.png";

const I = {
  chat: (c = "#00BFFF") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  bolt: (c = "#00BFFF") => (
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
  shield: (c = "#00BFFF") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  clock: (c = "#00BFFF") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  globe: (c = "#00BFFF") => (
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
  bar: (c = "#00BFFF") => (
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
  users: (c = "#00BFFF") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  check: (c = "#00BFFF") => (
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
  robot: (c = "#00BFFF") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <line x1="12" y1="7" x2="12" y2="11" />
      <circle cx="8" cy="16" r="1" fill={c} />
      <circle cx="16" cy="16" r="1" fill={c} />
    </svg>
  ),
  target: (c = "#00BFFF") => (
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
  refresh: (c = "#00BFFF") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
  ),
  send: (c = "white") => (
    <svg
      className="w-3 h-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2.5"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  calendar: (c = "#00BFFF") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  upload: (c = "#00BFFF") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  link: (c = "#00BFFF") => (
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
  lock: (c = "#00BFFF") => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  truck: (c = "#00BFFF") => (
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
};

const WA = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
const IG = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="#E4405F">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);
const FB = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

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

/* Chat with product image */
const AnimatedChat = () => {
  const [idx, setIdx] = useState(0);
  const [typing, setTyping] = useState(false);
  const ref = useRef(null);
  const msgs = [
    { s: "l", t: "Hola, quiero saber sobre la pistola de impacto", h: "10:21" },
    {
      s: "r",
      t: "La pistola de impacto tiene un precio especial de $59.99 con envio gratis a todo Ecuador.",
      h: "10:21",
      ai: true,
    },
    { s: "l", t: "Podria enviarme una foto del producto?", h: "10:22" },
    { s: "r", t: null, img: PRODUCT_IMG, h: "10:22", ai: true },
    { s: "l", t: "Se ve genial! Tienen garantia?", h: "10:23" },
    {
      s: "r",
      t: "12 meses de garantia. Pago contra entrega en todo el pais.",
      h: "10:23",
      ai: true,
    },
  ];
  useEffect(() => {
    if (idx >= msgs.length) {
      const t = setTimeout(() => setIdx(0), 2500);
      return () => clearTimeout(t);
    }
    setTyping(true);
    const d = msgs[idx].s === "r" ? 1400 : 900;
    const t = setTimeout(() => {
      setTyping(false);
      setIdx((p) => p + 1);
    }, d);
    return () => clearTimeout(t);
  }, [idx]);
  const vis = msgs.slice(0, idx);
  useEffect(() => {
    ref.current?.scrollTo({
      top: ref.current.scrollHeight,
      behavior: "smooth",
    });
  }, [vis.length, typing]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      <div className="px-3 py-2.5 bg-[#0B1426] flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-full bg-cyan-500/20 grid place-items-center">
          {I.chat("#38bdf8")}
        </div>
        <div>
          <p className="text-[10px] font-bold text-white">
            Agente AI de ventas
          </p>
          <p className="text-[8px] text-cyan-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            En linea 24/7
          </p>
        </div>
      </div>
      <div
        ref={ref}
        className="flex-1 px-3 py-3 space-y-2 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {vis.map((m, i) => (
          <div
            key={i}
            className={`max-w-[84%] ${m.s === "r" ? "ml-auto" : ""}`}
          >
            <div
              className={`rounded-2xl px-3 py-2 ${m.s === "r" ? "bg-[#0B1426] rounded-tr-sm" : "bg-white shadow-sm border border-slate-100 rounded-tl-sm"}`}
            >
              {m.img ? (
                <img
                  src={m.img}
                  alt="Producto"
                  className="w-full rounded-lg"
                  style={{ maxHeight: 120, objectFit: "cover" }}
                />
              ) : (
                <p
                  className={`text-[10px] leading-relaxed ${m.s === "r" ? "text-white" : "text-slate-700"}`}
                >
                  {m.t}
                </p>
              )}
              <div
                className={`flex items-center gap-1 mt-0.5 ${m.s === "r" ? "justify-end" : ""}`}
              >
                {m.ai && (
                  <span className="text-[7px] text-cyan-400 flex items-center gap-0.5">
                    {I.bolt("#38bdf8")}IA
                  </span>
                )}
                <p className="text-[7px] text-slate-400">
                  {m.h}
                  {m.s === "r" && " ✓✓"}
                </p>
              </div>
            </div>
          </div>
        ))}
        {typing && (
          <div
            className={`max-w-[35%] ${msgs[idx]?.s === "r" ? "ml-auto" : ""}`}
          >
            <div
              className={`rounded-2xl px-3 py-2.5 ${msgs[idx]?.s === "r" ? "bg-[#0B1426]" : "bg-white border border-slate-100"}`}
            >
              <div className="flex items-center gap-1">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className={`h-1.5 w-1.5 rounded-full animate-bounce ${msgs[idx]?.s === "r" ? "bg-cyan-400" : "bg-slate-400"}`}
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2">
          <span className="text-[9px] text-slate-400 flex-1">
            Escribe un mensaje...
          </span>
          <div className="w-6 h-6 rounded-lg bg-[#0B1426] grid place-items-center">
            {I.send()}
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, bullets = [] }) => (
  <div className="rounded-2xl bg-white border border-slate-200/60 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
    <div
      className="w-12 h-12 rounded-xl grid place-items-center mb-4 transition-transform group-hover:scale-110"
      style={{
        background: "rgba(0,191,255,0.06)",
        border: "1px solid rgba(0,191,255,0.12)",
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
            {I.check("#00BFFF")}
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
      style={{ background: "linear-gradient(135deg,#00BFFF,#0B1426)" }}
    >
      {number}
    </div>
    <h4 className="text-sm font-bold text-[#0B1426]">{title}</h4>
    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
  </div>
);

const TabImporChat = ({ onLogin }) => (
  <>
    {/* HERO */}
    <section className="relative pt-6 pb-14 sm:pb-20 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,191,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(0,191,255,0.015) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(circle,rgba(0,191,255,0.08),transparent 60%)",
        }}
      />
      <div className="relative w-full px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider mb-5"
              style={{
                color: "#00BFFF",
                background: "rgba(0,191,255,0.06)",
                border: "1px solid rgba(0,191,255,0.15)",
              }}
            >
              {I.robot("#00BFFF")} Agente AI de ventas
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#0B1426] tracking-[-0.03em] leading-[1.08]">
              Su vendedor AI que atiende, convence y{" "}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                cierra ventas
              </span>{" "}
              mientras duerme
            </h2>
            <p className="mt-4 text-sm sm:text-[15px] text-slate-500 leading-relaxed max-w-lg">
              Un agente de inteligencia artificial que responde, maneja
              objeciones, programa mensajes, agenda citas y cierra ventas por
              WhatsApp, Instagram y Messenger.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { icon: <WA />, name: "WhatsApp" },
                { icon: <IG />, name: "Instagram DM" },
                { icon: <FB />, name: "Messenger" },
              ].map((ch, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200/60"
                >
                  {ch.icon} {ch.name}
                </span>
              ))}
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                style={{
                  color: "#1877F2",
                  background: "rgba(24,119,242,0.06)",
                  border: "1px solid rgba(24,119,242,0.15)",
                }}
              >
                {I.shield("#1877F2")} Meta Business Partner
              </span>
            </div>
            <div className="mt-6">
              <button
                onClick={onLogin}
                className="px-7 py-3.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-[1px]"
                style={{
                  background: "linear-gradient(135deg,#0B1426,#1e293b)",
                }}
              >
                Prueba gratuita — 7 dias
              </button>
            </div>
          </div>
          <div className="relative flex justify-center">
            <div className="absolute -left-4 sm:-left-8 top-8 z-20 flex flex-col gap-3">
              {[
                {
                  icon: <WA />,
                  name: "WhatsApp",
                  status: "Conectado",
                  color: "#25D366",
                },
                {
                  icon: <IG />,
                  name: "Instagram",
                  status: "Conectado",
                  color: "#E4405F",
                },
                {
                  icon: <FB />,
                  name: "Messenger",
                  status: "Conectado",
                  color: "#1877F2",
                },
              ].map((ch, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white shadow-lg border border-slate-100 animate-[floatY_3s_ease-in-out_infinite]"
                  style={{ animationDelay: `${i * 500}ms` }}
                >
                  {ch.icon}
                  <div>
                    <p className="text-[10px] font-bold text-slate-700">
                      {ch.name}
                    </p>
                    <p
                      className="text-[8px] flex items-center gap-1"
                      style={{ color: ch.color }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ background: ch.color }}
                      />
                      {ch.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <IPhone>
              <AnimatedChat />
            </IPhone>
            <div
              className="absolute -right-4 sm:-right-8 bottom-28 z-20 px-4 py-3 rounded-xl bg-white shadow-lg border border-slate-100 animate-[floatY_3s_ease-in-out_infinite]"
              style={{ animationDelay: "800ms" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl grid place-items-center"
                  style={{
                    background: "linear-gradient(135deg,#0B1426,#1e293b)",
                  }}
                >
                  {I.bolt("white")}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#0B1426]">
                    Potenciado por IA
                  </p>
                  <p className="text-[9px] text-slate-400">
                    Respuestas inteligentes
                  </p>
                </div>
              </div>
            </div>
            <div
              className="absolute -right-2 top-12 z-20 px-3 py-2 rounded-xl bg-[#0B1426] shadow-lg animate-[floatY_3s_ease-in-out_infinite]"
              style={{ animationDelay: "300ms" }}
            >
              <p className="text-[10px] font-bold text-cyan-400">
                Meta Business Partner
              </p>
              <p className="text-[8px] text-slate-400">Sin riesgo de ban</p>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
    </section>

    {/* STATS */}
    <section
      className="py-10"
      style={{ background: "linear-gradient(180deg,#0B1426,#162033)" }}
    >
      <div className="w-full px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {[
            {
              v: "24/7",
              l: "Disponibilidad",
              d: "Atiende a cualquier hora, cualquier dia.",
            },
            {
              v: "3",
              l: "Canales integrados",
              d: "WhatsApp, Instagram y Messenger.",
            },
            {
              v: "Ilimitadas",
              l: "Conversaciones",
              d: "Sin limite de mensajes ni cobros extra.",
            },
            {
              v: "0%",
              l: "Riesgo de ban",
              d: "Meta Business Partner oficial.",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl p-5 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400 tracking-tight">
                {s.v}
              </p>
              <p className="text-xs font-bold text-white mt-1">{s.l}</p>
              <p className="text-[10px] text-slate-400 mt-1">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* FEATURES */}
    <section
      className="py-14 sm:py-20"
      style={{
        background: "linear-gradient(180deg,#f0f9ff,#f8fafc 50%,white)",
      }}
    >
      <div className="w-full px-5 sm:px-8">
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-3"
            style={{
              color: "#00BFFF",
              background: "rgba(0,191,255,0.06)",
              border: "1px solid rgba(0,191,255,0.12)",
            }}
          >
            {I.bolt("#00BFFF")} Capacidades
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B1426] tracking-tight">
            Todo lo que su agente AI puede hacer
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          <FeatureCard
            icon={I.chat("#00BFFF")}
            title="Conversaciones ilimitadas"
            desc="Sin tope de mensajes. Atienda a todos sus clientes."
            bullets={[
              "Sin cobro por mensaje",
              "Historial completo guardado",
              "Busqueda y filtros avanzados",
            ]}
          />
          <FeatureCard
            icon={I.bolt("#00BFFF")}
            title="Respuestas automaticas 24/7"
            desc="El agente responde al instante. Cada mensaje es una oportunidad."
            bullets={[
              "Respuestas contextuales con IA",
              "Tono de voz personalizable",
              "Multiples idiomas",
            ]}
          />
          <FeatureCard
            icon={I.shield("#00BFFF")}
            title="Manejo de objeciones"
            desc="Entrenado para objeciones comunes en ventas LATAM."
            bullets={[
              "Comparacion de valor",
              "Urgencia estrategica",
              "Prueba social integrada",
            ]}
          />
          <FeatureCard
            icon={I.clock("#00BFFF")}
            title="Mensajes programados"
            desc="Programe envios, campanas y recordatorios automaticos."
            bullets={[
              "Programacion por fecha y hora",
              "Secuencias de seguimiento",
              "Campanas masivas segmentadas",
            ]}
          />
          <FeatureCard
            icon={I.upload("#00BFFF")}
            title="Importar y exportar contactos"
            desc="Importe su base de clientes y exporte contactos con historial."
            bullets={[
              "Importacion masiva CSV/Excel",
              "Exportacion con historial completo",
              "Etiquetas y segmentacion",
            ]}
          />
          <FeatureCard
            icon={I.calendar("#00BFFF")}
            title="Google Calendar integrado"
            desc="Conecte Google Account para agendar citas desde el chat."
            bullets={[
              "Agendamiento automatico por IA",
              "Sincronizacion en tiempo real",
              "Recordatorios al cliente",
            ]}
          />
          <FeatureCard
            icon={I.globe("#00BFFF")}
            title="Multi-canal unificado"
            desc="WhatsApp, Instagram DM y Messenger en una sola bandeja."
            bullets={[
              "Una interfaz para todo",
              "Asignacion a equipos",
              "Notas internas entre agentes",
            ]}
          />
          <FeatureCard
            icon={I.link("#00BFFF")}
            title="Catalogo publico personalizado"
            desc="Enlace unico con su catalogo de productos y servicios."
            bullets={[
              "URL personalizada",
              "Productos con fotos y precios",
              "Boton de contacto directo",
            ]}
          />
          <FeatureCard
            icon={I.lock("#00BFFF")}
            title="Meta Business Partner"
            desc="Conexion oficial. Su numero esta protegido."
            bullets={[
              "API oficial WhatsApp Business",
              "Verificacion Business Manager",
              "Soporte directo de Meta",
            ]}
          />
        </div>
      </div>
    </section>

    {/* HOW IT WORKS */}
    <section
      className="py-14 sm:py-20"
      style={{ background: "linear-gradient(180deg,white,#f1f5f9)" }}
    >
      <div className="w-full px-5 sm:px-8">
        <div className="text-center mb-12">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B1426] tracking-tight">
            Activo en menos de 5 minutos
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Sin codigo, sin configuraciones tecnicas.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <StepCard
            number="1"
            title="Conecte WhatsApp"
            desc="Vincule su numero via Meta Business Manager. Conexion oficial y segura."
          />
          <StepCard
            number="2"
            title="Configure el agente"
            desc="Describa su negocio, productos y tono. Conecte Google Calendar si necesita citas."
          />
          <StepCard
            number="3"
            title="Importe contactos"
            desc="Suba su base de clientes existente. CSV, Excel o sincronizacion."
          />
          <StepCard
            number="4"
            title="Empiece a vender"
            desc="El agente responde, programa mensajes, agenda citas y cierra ventas."
          />
        </div>
      </div>
    </section>

    {/* USE CASES */}
    <section
      className="py-14 sm:py-20"
      style={{
        background: "linear-gradient(180deg,#f1f5f9,#e0f2fe 50%,#f0f9ff)",
      }}
    >
      <div className="w-full px-5 sm:px-8">
        <div className="text-center mb-12">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B1426] tracking-tight">
            Ideal para cualquier negocio
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[
            {
              icon: I.truck("#00BFFF"),
              title: "E-commerce y dropshipping",
              desc: "Atienda consultas, envie enlaces de compra y gestione pedidos COD.",
            },
            {
              icon: I.users("#00BFFF"),
              title: "Servicios profesionales",
              desc: "Agende citas con Google Calendar, responda preguntas y califique leads.",
            },
            {
              icon: I.globe("#00BFFF"),
              title: "Restaurantes y delivery",
              desc: "Tome pedidos por WhatsApp, envie menu y confirme entregas.",
            },
            {
              icon: I.bar("#00BFFF"),
              title: "Educacion y cursos",
              desc: "Resuelva dudas, envie materiales y gestione inscripciones 24/7.",
            },
            {
              icon: I.target("#00BFFF"),
              title: "Inmobiliarias",
              desc: "Clasifique interesados, envie catalogos y agende visitas.",
            },
            {
              icon: I.shield("#00BFFF"),
              title: "Clinicas y salud",
              desc: "Confirme citas via Google Calendar y envie recordatorios.",
            },
          ].map((uc, i) => (
            <div
              key={i}
              className="rounded-2xl p-5 bg-white border border-slate-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div
                className="w-10 h-10 rounded-xl grid place-items-center mb-3"
                style={{
                  background: "rgba(0,191,255,0.06)",
                  border: "1px solid rgba(0,191,255,0.12)",
                }}
              >
                {uc.icon}
              </div>
              <h4 className="text-sm font-bold text-[#0B1426]">{uc.title}</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {uc.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section
      className="py-12"
      style={{ background: "linear-gradient(135deg,#0B1426,#162033)" }}
    >
      <div className="w-full px-5 sm:px-8 text-center">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Comience a vender hoy mismo
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          7 dias gratis. Primer mes a $5. Cancele cuando quiera.
        </p>
        <div
          className="mt-5 inline-flex items-center gap-6 py-3 px-8 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="text-center">
            <span className="text-3xl font-extrabold text-cyan-400">$5</span>
            <p className="text-[10px] text-slate-400 mt-0.5">primer mes</p>
          </div>
          <div
            className="w-px h-10"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div className="text-center">
            <span className="text-3xl font-extrabold text-white">$29</span>
            <p className="text-[10px] text-slate-400 mt-0.5">luego/mes</p>
          </div>
        </div>
        <div className="mt-5">
          <button
            onClick={onLogin}
            className="px-8 py-4 rounded-xl text-sm font-bold text-[#0B1426] bg-white hover:bg-slate-100 transition-all shadow-lg hover:-translate-y-[1px]"
          >
            Activar prueba gratuita — 7 dias
          </button>
        </div>
      </div>
    </section>
  </>
);

export default TabImporChat;

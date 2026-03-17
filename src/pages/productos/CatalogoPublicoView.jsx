// src/components/catalogos/CatalogoPublicoView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { APP_CONFIG } from "../../config";

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const getApiBase = () => APP_CONFIG?.api?.baseURL || "";
const getImageBase = () => APP_CONFIG?.api?.baseURL || window.location.origin;

const normalizeUrl = (base, path) => {
  if (!path) return null;
  const p = String(path);
  if (/^https?:\/\//i.test(p)) return p;
  const b = String(base || "").replace(/\/+$/, "");
  const r = p.replace(/^\/+/, "");
  return `${b}/${r}`;
};

const money = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(n);
};

/* ─────────────────────────────────────────────────────────────
   PasswordModal
───────────────────────────────────────────────────────────── */
const PasswordModal = ({ onConfirm, onCancel, wrongPass }) => {
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);

  const submit = () => {
    if (pass.trim()) onConfirm(pass.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,11,20,.75)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ animation: "popIn .22s cubic-bezier(.34,1.56,.64,1)" }}
      >
        <div className="bg-gradient-to-br from-[#171931] to-indigo-900 px-8 py-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
            <i className="bx bx-lock-alt text-3xl text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">Contenido privado</h3>
          <p className="text-indigo-300 text-sm mt-1.5">
            Ingresa la contraseña para ver estos productos.
          </p>
        </div>

        <div className="px-7 py-6 space-y-4">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={pass}
              autoFocus
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Contraseña de acceso"
              className={`w-full rounded-xl px-4 py-3 text-sm border outline-none transition pr-10
                ${wrongPass ? "border-red-400 bg-red-50" : "border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"}`}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <i className={`bx ${show ? "bx-hide" : "bx-show"} text-lg`} />
            </button>
          </div>

          {wrongPass && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <i className="bx bx-x-circle text-sm" />
              Contraseña incorrecta. Intenta de nuevo.
            </p>
          )}

          <button
            onClick={submit}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all"
            style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}
          >
            Ingresar
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
      <style>{`
        @keyframes popIn {
          from { opacity:0; transform:scale(.9) translateY(10px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ProductCard
───────────────────────────────────────────────────────────── */
const ProductCard = ({ p, fields, imageBase, index }) => {
  const {
    show_nombre,
    show_precio,
    show_precio_proveedor,
    show_imagen,
    show_categoria,
    show_descripcion,
    show_stock,
    show_external_id,
    show_landing_url,
    show_material,
    whatsapp_numero,
  } = fields;
  const [imgError, setImgError] = useState(false);
  const imgUrl = show_imagen ? normalizeUrl(imageBase, p?.imagen_url) : null;
  const precio = money(p?.precio);
  const isPriv = Number(p?.es_privado) === 1;

  return (
    <div
      className="group bg-white rounded-2xl overflow-hidden flex flex-col"
      style={{
        border: "1px solid #e8eaf0",
        animationDelay: `${index * 35}ms`,
        animation: "cardIn .4s ease both",
        transition: "box-shadow .2s, border-color .2s, transform .2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(79,70,229,.10)";
        e.currentTarget.style.borderColor = "#c7d2fe";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.borderColor = "#e8eaf0";
        e.currentTarget.style.transform = "";
      }}
    >
      {show_imagen && (
        <div
          className="w-full overflow-hidden relative bg-slate-50"
          style={{ aspectRatio: "4/3" }}
        >
          {imgUrl && !imgError ? (
            <img
              src={imgUrl}
              alt={p?.nombre || ""}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <i
                className="bx bx-image text-5xl"
                style={{ color: "#cbd5e1" }}
              />
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {show_categoria && p?.categoria?.nombre && (
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(255,255,255,.92)",
                  color: "#4f46e5",
                  backdropFilter: "blur(4px)",
                }}
              >
                {p.categoria.nombre}
              </span>
            )}
          </div>
          {isPriv && (
            <div
              className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
              style={{
                background: "rgba(15,15,30,.65)",
                color: "#fff",
                backdropFilter: "blur(4px)",
              }}
            >
              <i className="bx bx-lock-alt text-xs" />
              Privado
            </div>
          )}
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        {show_nombre && (
          <h3 className="font-bold text-slate-900 leading-snug text-sm sm:text-base">
            {p?.nombre}
          </h3>
        )}

        {show_descripcion && p?.descripcion && (
          <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-3 flex-1">
            {p.descripcion}
          </p>
        )}

        {(show_stock || show_external_id) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {show_stock && p?.stock != null && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
                style={{
                  background: Number(p.stock) > 0 ? "#ecfdf5" : "#f8fafc",
                  color: Number(p.stock) > 0 ? "#059669" : "#94a3b8",
                  border:
                    "1px solid " +
                    (Number(p.stock) > 0 ? "#a7f3d0" : "#e2e8f0"),
                }}
              >
                <i className="bx bx-box" style={{ fontSize: 11 }} />
                {Number(p.stock) > 0 ? p.stock + " en stock" : "Sin stock"}
              </span>
            )}
            {show_external_id && p?.external_id != null && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
                style={{
                  background: "#fff7ed",
                  color: "#ea580c",
                  border: "1px solid #fed7aa",
                }}
              >
                <i className="bx bx-barcode" style={{ fontSize: 11 }} />
                {"Dropi #" + p.external_id}
              </span>
            )}
          </div>
        )}

        {show_precio && precio && (
          <div className="mt-auto pt-4">
            <span
              className="text-xl font-extrabold tracking-tight"
              style={{ color: "#171931" }}
            >
              {precio}
            </span>
          </div>
        )}

        {show_precio_proveedor &&
          p?.precio_proveedor != null &&
          Number(p.precio_proveedor) > 0 && (
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              {"Costo proveedor: "}
              <span style={{ fontWeight: 600, color: "#64748b" }}>
                {"$" + Number(p.precio_proveedor).toFixed(2)}
              </span>
            </div>
          )}

        {(show_landing_url || show_material) &&
          (p?.landing_url || p?.material) && (
            <div
              style={{
                display: "flex",
                gap: 6,
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #f1f5f9",
              }}
            >
              {show_landing_url && p?.landing_url && (
                <a
                  href={p.landing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "8px 10px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#4338ca",
                    background: "#eef2ff",
                    border: "1px solid #e0e7ff",
                    textDecoration: "none",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e0e7ff";
                    e.currentTarget.style.borderColor = "#c7d2fe";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#eef2ff";
                    e.currentTarget.style.borderColor = "#e0e7ff";
                    e.currentTarget.style.transform = "";
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <i className="bx bx-link-external" style={{ fontSize: 14 }} />
                  {"Landing"}
                </a>
              )}
              {show_material && p?.material && (
                <a
                  href={p.material}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "8px 10px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#166534",
                    background: "#f0fdf4",
                    border: "1px solid #dcfce7",
                    textDecoration: "none",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#dcfce7";
                    e.currentTarget.style.borderColor = "#bbf7d0";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f0fdf4";
                    e.currentTarget.style.borderColor = "#dcfce7";
                    e.currentTarget.style.transform = "";
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <i className="bx bx-file" style={{ fontSize: 14 }} />
                  {"Material"}
                </a>
              )}
            </div>
          )}

        {whatsapp_numero && (
          <a
            href={
              "https://wa.me/" +
              whatsapp_numero +
              "?text=" +
              encodeURIComponent(
                "Hola! Me interesa este producto:\n\n" +
                  "*" +
                  (p?.nombre || "Producto") +
                  "*\n" +
                  (precio ? "Precio: " + precio + "\n" : "") +
                  (p?.imagen_url
                    ? p.imagen_url.replace(/ /g, "%20") + "\n"
                    : "") +
                  "\n¿Está disponible?",
              )
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 10,
              padding: "10px 14px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              background: "#25D366",
              border: "none",
              textDecoration: "none",
              transition: "all .2s",
              boxShadow: "0 2px 8px rgba(37,211,102,.25)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#20BD5A";
              e.currentTarget.style.boxShadow =
                "0 4px 14px rgba(37,211,102,.35)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#25D366";
              e.currentTarget.style.boxShadow =
                "0 2px 8px rgba(37,211,102,.25)";
              e.currentTarget.style.transform = "";
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <i className="bx bxl-whatsapp" style={{ fontSize: 18 }} />
            {"Quiero este producto"}
          </a>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────── */
const CatalogoPublicoView = () => {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [catalogo, setCatalogo] = useState(null);
  const [productos, setProductos] = useState([]);
  const [search, setSearch] = useState("");

  // tabs
  const [activeTab, setActiveTab] = useState("publicos");
  const [privadosUnlocked, setPrivadosUnlocked] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [wrongPass, setWrongPass] = useState(false);

  /* Settings */
  const settings = catalogo?.settings || {};
  const fields = settings?.fields || {};
  const show_nombre = fields?.show_nombre ?? true;
  const show_precio = fields?.show_precio ?? true;
  const show_precio_proveedor = fields?.show_precio_proveedor ?? false;
  const show_imagen = fields?.show_imagen ?? true;
  const show_categoria = fields?.show_categoria ?? false;
  const show_descripcion = fields?.show_descripcion ?? false;
  const show_stock = fields?.show_stock ?? false;
  const show_external_id = fields?.show_external_id ?? false;
  const show_landing_url = fields?.show_landing_url ?? true;
  const show_material = fields?.show_material ?? true;
  const whatsapp_numero = settings?.whatsapp_numero || null;
  const passwordSaved = settings?.password_privados || null;
  const fieldsObj = {
    show_nombre,
    show_precio,
    show_precio_proveedor,
    show_imagen,
    show_categoria,
    show_descripcion,
    show_stock,
    show_external_id,
    show_landing_url,
    show_material,
    whatsapp_numero,
  };

  /* Fetch */
  const fetchCatalogo = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const url = `${getApiBase()}/public/catalogo/${encodeURIComponent(slug)}`;
      const res = await axios.get(url);
      const data = res?.data?.data;
      setCatalogo(data?.catalogo || null);
      setProductos(Array.isArray(data?.productos) ? data.productos : []);
    } catch (e) {
      setErrorMsg(
        e?.response?.data?.message || e?.message || "No se pudo cargar.",
      );
      setCatalogo(null);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogo();
  }, [slug]); // eslint-disable-line

  /* Separar: privado = es_privado === 1 */
  const productosPublicos = useMemo(
    () => productos.filter((p) => Number(p.es_privado) !== 1),
    [productos],
  );
  const productosPrivados = useMemo(
    () => productos.filter((p) => Number(p.es_privado) === 1),
    [productos],
  );

  /*
    Mostrar tab privados si:
      - hay productos marcados como privados, O
      - el catálogo tiene password configurada (y el modo no es solo-público)
  */
  const hayPrivados =
    productosPrivados.length > 0 ||
    (!!passwordSaved && catalogo?.modo_visibilidad !== "PUBLIC_ONLY");

  /* Filtro */
  const productosMostrar = useMemo(() => {
    const base =
      activeTab === "privados" ? productosPrivados : productosPublicos;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (p) =>
        (p?.nombre || "").toLowerCase().includes(q) ||
        (p?.descripcion || "").toLowerCase().includes(q) ||
        (p?.categoria?.nombre || "").toLowerCase().includes(q),
    );
  }, [activeTab, productosPublicos, productosPrivados, search]);

  /* Password */
  const handlePasswordConfirm = (entered) => {
    if (!passwordSaved || entered === passwordSaved) {
      setPrivadosUnlocked(true);
      setShowPassModal(false);
      setWrongPass(false);
      setActiveTab("privados");
    } else {
      setWrongPass(true);
    }
  };

  const handleTabPrivados = () => {
    if (privadosUnlocked || !passwordSaved) {
      setActiveTab("privados");
    } else {
      setWrongPass(false);
      setShowPassModal(true);
    }
  };

  const titulo = catalogo?.titulo_publico || "Catálogo";
  const descripcion = catalogo?.descripcion_publica || "";
  const imageBase = getImageBase();
  const totalProductos =
    productosPublicos.length +
    (privadosUnlocked ? productosPrivados.length : 0);

  /* ── RENDER ── */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6fa",
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
      }}
    >
      {showPassModal && (
        <PasswordModal
          onConfirm={handlePasswordConfirm}
          onCancel={() => {
            setShowPassModal(false);
            setWrongPass(false);
          }}
          wrongPass={wrongPass}
        />
      )}

      {/* ── TOPBAR ── */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e8eaf0",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            height: 60,
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#171931",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i
                className="bx bx-store-alt"
                style={{ color: "#fff", fontSize: 18 }}
              />
            </div>
            {loading ? (
              <div
                style={{
                  height: 14,
                  width: 140,
                  borderRadius: 7,
                  background: "#e2e8f0",
                  animation: "pulse 1.5s ease infinite",
                }}
              />
            ) : (
              <div style={{ lineHeight: 1.25 }}>
                <div
                  style={{ fontWeight: 700, fontSize: 15, color: "#0f1117" }}
                >
                  {titulo}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                    fontFamily: "monospace",
                  }}
                >
                  /{slug}
                </div>
              </div>
            )}
          </div>
          {!loading && !errorMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#22c55e",
                  animation: "pulse 2s ease infinite",
                }}
              />
              {productos.length} producto{productos.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </header>

      {/* ── LOADING ── */}
      {loading && (
        <div style={{ padding: "32px 24px" }}>
          <div
            style={{
              borderRadius: 20,
              background: "#fff",
              padding: 32,
              marginBottom: 24,
              border: "1px solid #e8eaf0",
            }}
          >
            {[140, 240, "100%"].map((w, i) => (
              <div
                key={i}
                style={{
                  height: i === 0 ? 28 : i === 1 ? 16 : 44,
                  width: w,
                  borderRadius: 8,
                  background: "#f1f5f9",
                  marginBottom: 16,
                  animation: "pulse 1.5s ease infinite",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "#fff",
                  border: "1px solid #e8eaf0",
                  animation: "pulse 1.5s ease infinite",
                }}
              >
                <div style={{ aspectRatio: "4/3", background: "#f1f5f9" }} />
                <div
                  style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      height: 14,
                      width: "75%",
                      borderRadius: 6,
                      background: "#f1f5f9",
                    }}
                  />
                  <div
                    style={{
                      height: 18,
                      width: "50%",
                      borderRadius: 6,
                      background: "#f1f5f9",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {!loading && errorMsg && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i
              className="bx bx-error"
              style={{ fontSize: 36, color: "#f87171" }}
            />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1e293b" }}>
              Catálogo no disponible
            </div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
              {errorMsg}
            </div>
          </div>
          <button
            onClick={fetchCatalogo}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 12,
              background: "#171931",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              border: "none",
              cursor: "pointer",
            }}
          >
            <i className="bx bx-refresh" />
            Reintentar
          </button>
        </div>
      )}

      {/* ── CONTENT ── */}
      {!loading && !errorMsg && catalogo && (
        <div style={{ padding: "0 0 48px" }}>
          {/* HERO — full width */}
          <div
            style={{
              background:
                "linear-gradient(135deg, #171931 0%, #1e254a 60%, #2d3587 100%)",
              padding: "48px 24px 40px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative */}
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 260,
                height: 260,
                borderRadius: "50%",
                background: "rgba(99,102,241,.15)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -40,
                left: 80,
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: "rgba(99,102,241,.08)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 20,
                left: "50%",
                width: 1,
                height: "80%",
                background: "rgba(255,255,255,.03)",
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 20,
                  background: "rgba(99,102,241,.25)",
                  border: "1px solid rgba(99,102,241,.35)",
                  color: "#a5b4fc",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 16,
                }}
              >
                <i className="bx bx-book-open" />
                Catálogo oficial
              </div>
              <h1
                style={{
                  fontSize: "clamp(24px, 5vw, 38px)",
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1.2,
                  margin: "0 0 12px",
                }}
              >
                {titulo}
              </h1>
              {descripcion && (
                <p
                  style={{
                    fontSize: 15,
                    color: "#94a3b8",
                    lineHeight: 1.65,
                    maxWidth: 600,
                    whiteSpace: "pre-line",
                    margin: "0 0 20px",
                  }}
                >
                  {descripcion}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 20,
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "#94a3b8",
                  }}
                >
                  <i className="bx bx-package" style={{ color: "#818cf8" }} />
                  <strong style={{ color: "#fff" }}>
                    {productosPublicos.length}
                  </strong>
                  &nbsp;productos públicos
                </div>
                {hayPrivados && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      color: "#94a3b8",
                    }}
                  >
                    <i
                      className="bx bx-lock-alt"
                      style={{ color: "#fbbf24" }}
                    />
                    <strong style={{ color: "#fff" }}>
                      {productosPrivados.length}
                    </strong>
                    &nbsp;productos privados
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CONTROLS BAR — full width */}
          <div
            style={{
              background: "#fff",
              borderBottom: "1px solid #e8eaf0",
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 12,
              position: "sticky",
              top: 60,
              zIndex: 19,
            }}
          >
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: 4,
                borderRadius: 12,
                background: "#f1f5f9",
              }}
            >
              <button
                onClick={() => setActiveTab("publicos")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all .15s",
                  background: activeTab === "publicos" ? "#fff" : "transparent",
                  color: activeTab === "publicos" ? "#0f1117" : "#64748b",
                  boxShadow:
                    activeTab === "publicos"
                      ? "0 1px 4px rgba(0,0,0,.08)"
                      : "none",
                }}
              >
                <i className="bx bx-world" style={{ fontSize: 15 }} />
                Productos
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 10,
                    background:
                      activeTab === "publicos" ? "#e0e7ff" : "#e2e8f0",
                    color: activeTab === "publicos" ? "#4338ca" : "#64748b",
                  }}
                >
                  {productosPublicos.length}
                </span>
              </button>

              {hayPrivados && (
                <button
                  onClick={handleTabPrivados}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 9,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    transition: "all .15s",
                    background:
                      activeTab === "privados" ? "#fff" : "transparent",
                    color: activeTab === "privados" ? "#0f1117" : "#64748b",
                    boxShadow:
                      activeTab === "privados"
                        ? "0 1px 4px rgba(0,0,0,.08)"
                        : "none",
                  }}
                >
                  <i
                    className={`bx ${privadosUnlocked || !passwordSaved ? "bx-unlock" : "bx-lock-alt"}`}
                    style={{
                      fontSize: 15,
                      color: activeTab === "privados" ? "#d97706" : "inherit",
                    }}
                  />
                  Privados
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 10,
                      background:
                        activeTab === "privados" ? "#fef3c7" : "#e2e8f0",
                      color: activeTab === "privados" ? "#92400e" : "#64748b",
                    }}
                  >
                    {productosPrivados.length}
                  </span>
                </button>
              )}
            </div>

            {/* Search */}
            <div
              style={{
                position: "relative",
                flex: "1",
                minWidth: 180,
                maxWidth: 320,
              }}
            >
              <i
                className="bx bx-search"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: 16,
                }}
              />
              <input
                type="text"
                placeholder="Buscar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: 12,
                  border: "1.5px solid #e2e8f0",
                  fontSize: 13,
                  outline: "none",
                  transition: "border .15s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>
          </div>

          {/* PRIVATE LOCKED */}
          {activeTab === "privados" && !privadosUnlocked && passwordSaved && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 24px",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 24,
                  background: "#fffbeb",
                  border: "2px solid #fde68a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i
                  className="bx bx-lock"
                  style={{ fontSize: 40, color: "#f59e0b" }}
                />
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontWeight: 700, fontSize: 18, color: "#1e293b" }}
                >
                  Contenido protegido
                </div>
                <div style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>
                  Necesitas la contraseña para acceder a estos productos.
                </div>
              </div>
              <button
                onClick={() => {
                  setWrongPass(false);
                  setShowPassModal(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 22px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  background: "#f59e0b",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  boxShadow: "0 4px 14px rgba(245,158,11,.3)",
                }}
              >
                <i className="bx bx-key" />
                Ingresar contraseña
              </button>
            </div>
          )}

          {/* PRODUCT GRID — full width with padding */}
          {(activeTab === "publicos" || privadosUnlocked || !passwordSaved) && (
            <div style={{ padding: "24px 24px 0" }}>
              {productosMostrar.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "64px 24px",
                    gap: 16,
                    background: "#fff",
                    borderRadius: 20,
                    border: "1px solid #e8eaf0",
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 20,
                      background: "#f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i
                      className="bx bx-search-alt"
                      style={{ fontSize: 32, color: "#cbd5e1" }}
                    />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, color: "#374151" }}>
                      Sin productos
                    </div>
                    <div
                      style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}
                    >
                      {search
                        ? "No hay resultados para tu búsqueda."
                        : "Esta sección no tiene productos."}
                    </div>
                  </div>
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      style={{
                        fontSize: 13,
                        color: "#4f46e5",
                        fontWeight: 600,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Limpiar búsqueda
                    </button>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 16,
                  }}
                >
                  {productosMostrar.map((p, i) => (
                    <ProductCard
                      key={p.id}
                      p={p}
                      fields={fieldsObj}
                      imageBase={imageBase}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid #e8eaf0",
          background: "#fff",
          padding: "18px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            fontSize: 12,
            color: "#94a3b8",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                background: "#171931",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className="bx bx-store-alt"
                style={{ color: "#fff", fontSize: 12 }}
              />
            </div>
            Catálogo generado automáticamente
          </div>
          <span>
            {new Date().getFullYear()} · Todos los derechos reservados
          </span>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
        * { box-sizing: border-box; }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        @keyframes popIn {
          from { opacity:0; transform:scale(.9) translateY(10px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CatalogoPublicoView;

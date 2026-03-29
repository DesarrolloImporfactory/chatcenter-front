import React, { useState, useEffect, useCallback } from "react";
import chatApi from "../../../api/chatcenter";

const ShopifyLogoSmall = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 109.5 124.5"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M95.6 28.2c-.1-.6-.6-1-1.1-1-.5 0-10.3-.8-10.3-.8s-6.8-6.8-7.5-7.5c-.7-.7-2.1-.5-2.6-.3-.1 0-1.4.4-3.6 1.1-2.2-6.2-6-11.9-12.7-11.9h-.6C55.5 5.6 53.3 4 51.5 4c-15.7.1-23.2 19.6-25.5 29.6-6 1.9-10.3 3.2-10.8 3.3-3.4 1-3.5 1.1-3.9 4.4C11 43.7 0 131.5 0 131.5l75.6 13.1 40.9-10.1S95.7 28.8 95.6 28.2zM67.2 21.4l-4.7 1.4c0-2.4-.3-5.8-1.4-8.7 3.5.7 5.3 4.6 6.1 7.3zM57.9 24.3l-10 3.1c1-3.7 2.8-7.4 5.1-9.8 .8-.9 2-1.8 3.4-2.4 1.4 2.8 1.6 6.8 1.5 9.1zM51.6 8.1c1.1 0 2 .3 2.8.9-1.3.7-2.5 1.7-3.7 3-3 3.2-5.3 8.2-6.2 13-3.3 1-6.5 2-9.5 2.9C37.6 19.5 43.6 8.2 51.6 8.1z"
      fill="#95BF47"
    />
    <path
      d="M94.5 27.2c-.5 0-10.3-.8-10.3-.8s-6.8-6.8-7.5-7.5c-.3-.3-.6-.4-1-.4l-5.7 117 40.9-10.1S95.7 28.8 95.6 28.2c-.1-.6-.6-1-1.1-1z"
      fill="#5E8E3E"
    />
    <path
      d="M58.4 45.8l-4.9 14.5s-4.3-2.3-9.5-2.3c-7.7 0-8.1 4.8-8.1 6 0 6.6 17.2 9.1 17.2 24.6 0 12.2-7.7 20-18.1 20-12.5 0-18.9-7.8-18.9-7.8l3.3-11s6.5 5.6 12.1 5.6c3.6 0 5.1-2.8 5.1-4.9 0-8.6-14.1-9-14.1-23.2 0-11.9 8.6-23.5 25.9-23.5 6.7 0 10 1.9 10 1.9z"
      fill="#fff"
    />
  </svg>
);

const EnviarShopifyModal = ({ open, onClose, imageUrl, imageName, Swal }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [uploadType, setUploadType] = useState("product_media");
  const [sending, setSending] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  const fetchProducts = useCallback(
    async (searchTerm = "", cursor = null, append = false) => {
      setLoading(true);
      try {
        const params = { limit: 12 };
        if (searchTerm) params.search = searchTerm;
        if (cursor) params.cursor = cursor;
        const res = await chatApi.get("shopify/products", { params });
        const data = res.data?.data || [];
        const pagination = res.data?.pagination || {};
        if (append) {
          setProducts((prev) => [...prev, ...data]);
        } else {
          setProducts(data);
        }
        setHasNext(pagination.has_next || false);
        setNextCursor(pagination.next_cursor || null);
      } catch (err) {
        if (err?.response?.status === 404) {
          Toast.fire({ icon: "warning", title: "Conecta tu Shopify primero" });
          onClose();
        } else {
          Toast.fire({
            icon: "error",
            title: err?.response?.data?.message || "Error al cargar productos",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (open) {
      setSelectedProduct(null);
      setUploadType("product_media");
      setSearch("");
      fetchProducts();
    }
  }, [open, fetchProducts]);

  const handleSearch = (value) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(
      setTimeout(() => {
        fetchProducts(value);
      }, 500),
    );
  };

  const handleSend = async () => {
    if (!selectedProduct || !imageUrl) return;
    setSending(true);
    try {
      const endpoint =
        uploadType === "product_media"
          ? "shopify/upload-product-image"
          : "shopify/upload-description-image";
      const payload = {
        product_id: selectedProduct.id,
        image_url: imageUrl,
        alt_text: imageName || "Imagen generada con IA",
      };
      if (uploadType === "description") payload.position = "append";
      const res = await chatApi.post(endpoint, payload);
      if (res.data?.isSuccess) {
        Toast.fire({
          icon: "success",
          title:
            uploadType === "product_media"
              ? "Imagen subida al carrusel ✓"
              : "Imagen agregada a la descripción ✓",
        });
        onClose();
      }
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al enviar a Shopify",
      });
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl bg-white"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header verde Shopify ── */}
        <div
          className="px-6 pt-5 pb-4 shrink-0"
          style={{
            background: "linear-gradient(135deg, #95BF47 0%, #5E8E3E 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl grid place-items-center"
                style={{ background: "rgba(255,255,255,0.18)" }}
              >
                <ShopifyLogoSmall />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Enviar a Shopify
                </h3>
                <p
                  className="text-[11px]"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  Selecciona el producto destino
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg grid place-items-center transition-colors"
              style={{ background: "rgba(255,255,255,0.15)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.25)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
              }
            >
              <i className="bx bx-x text-white text-lg" />
            </button>
          </div>

          {/* Preview imagen */}
          {imageUrl && (
            <div
              className="mt-3 flex items-center gap-3 p-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <img
                src={imageUrl}
                alt="Preview"
                className="w-12 h-12 rounded-lg object-cover"
                style={{ border: "1px solid rgba(255,255,255,0.2)" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {imageName || "Imagen generada"}
                </p>
                <p
                  className="text-[10px] truncate"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {imageUrl.split("/").pop()?.substring(0, 40)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Buscador (fondo blanco) ── */}
        <div
          className="px-6 pt-4 pb-2 shrink-0"
          style={{ borderBottom: "1px solid #f1f5f9" }}
        >
          <div className="relative">
            <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar producto en tu Shopify…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs text-gray-800 placeholder-gray-300 outline-none"
              style={{ background: "#f8faf5", border: "1px solid #e2e8d9" }}
              onFocus={(e) => (e.target.style.borderColor = "#95BF47")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8d9")}
            />
          </div>
        </div>

        {/* ── Lista de productos ── */}
        <div
          className="flex-1 overflow-y-auto px-6 py-3"
          style={{ minHeight: "200px" }}
        >
          {loading && products.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <svg
                className="animate-spin w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#95BF47"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="#95BF47"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <i className="bx bx-package text-3xl text-gray-200" />
              <p className="text-xs text-gray-400">
                No se encontraron productos
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {products.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: isSelected ? "#f0f7e6" : "transparent",
                      border: `1px solid ${isSelected ? "#95BF47" : "#f1f5f9"}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = "#fafbf8";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                        style={{ border: "1px solid #e2e8f0" }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg grid place-items-center shrink-0"
                        style={{ background: "#f1f5f9" }}
                      >
                        <i className="bx bx-image text-lg text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">
                        {p.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.price && (
                          <span className="text-[10px] text-gray-400">
                            ${p.price}
                          </span>
                        )}
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md"
                          style={{
                            background:
                              p.status === "ACTIVE" ? "#f0f7e6" : "#fffbeb",
                            color:
                              p.status === "ACTIVE" ? "#5E8E3E" : "#d97706",
                          }}
                        >
                          {p.status === "ACTIVE" ? "Activo" : p.status}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <i
                        className="bx bx-check-circle text-lg shrink-0"
                        style={{ color: "#5E8E3E" }}
                      />
                    )}
                  </button>
                );
              })}
              {hasNext && (
                <button
                  onClick={() =>
                    nextCursor && fetchProducts(search, nextCursor, true)
                  }
                  disabled={loading}
                  className="w-full py-2 rounded-xl text-[11px] font-bold transition-all"
                  style={{
                    background: "#f8faf5",
                    color: "#5E8E3E",
                    border: "1px solid #e2e8d9",
                  }}
                >
                  {loading ? "Cargando…" : "Cargar más productos"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Footer: tipo + botón enviar ── */}
        {selectedProduct && (
          <div
            className="px-6 py-4 shrink-0 space-y-3"
            style={{ borderTop: "1px solid #f1f5f9" }}
          >
            <div>
              <label className="text-[10px] font-bold mb-2 block uppercase tracking-wider text-gray-400">
                ¿Dónde colocar la imagen?
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setUploadType("product_media")}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all"
                  style={{
                    background:
                      uploadType === "product_media" ? "#f0f7e6" : "#f8fafc",
                    border: `1px solid ${uploadType === "product_media" ? "#95BF47" : "#e2e8f0"}`,
                    color:
                      uploadType === "product_media" ? "#5E8E3E" : "#94a3b8",
                  }}
                >
                  <i className="bx bx-images mr-1" />
                  Carrusel
                </button>
                <button
                  onClick={() => setUploadType("description")}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all"
                  style={{
                    background:
                      uploadType === "description" ? "#f0f7e6" : "#f8fafc",
                    border: `1px solid ${uploadType === "description" ? "#95BF47" : "#e2e8f0"}`,
                    color: uploadType === "description" ? "#5E8E3E" : "#94a3b8",
                  }}
                >
                  <i className="bx bx-code-block mr-1" />
                  Descripción
                </button>
              </div>
              <p className="text-[10px] mt-1.5 text-gray-300">
                {uploadType === "product_media"
                  ? "La imagen aparecerá en la galería/carrusel del producto"
                  : "La imagen se insertará dentro de la descripción HTML"}
              </p>
            </div>
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-3 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40"
              style={{
                background: sending
                  ? "rgba(149,191,71,0.4)"
                  : "linear-gradient(135deg, #95BF47 0%, #5E8E3E 100%)",
                boxShadow: sending
                  ? "none"
                  : "0 4px 15px rgba(149,191,71,0.25)",
              }}
            >
              {sending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="white"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="white"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Enviando a Shopify…
                </span>
              ) : (
                <>
                  <i className="bx bx-upload mr-1.5" />
                  Enviar a "{selectedProduct.title}"
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnviarShopifyModal;
